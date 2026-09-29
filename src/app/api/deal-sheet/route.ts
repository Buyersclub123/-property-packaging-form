import { NextResponse } from 'next/server';
import { GHLRecord, GHLSearchResponse, transformRecord, resolveLinkedOpportunityNames } from '@/lib/dealSheetTransform';
import { getRedisClient } from '@/lib/redis';
import { ghlFetch } from '@/lib/ghlFetch';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

// Shared cache: built once, kept current by the webhook updating individual
// records. The 30-minute sync-refresh is a safety net, not the primary mechanism.
const SHARED_KEY = 'ds:records';
const SHARED_LOCK = 'ds:records:lock';
const LOCK_TTL_SEC = 30;
const WAIT_FOR_LOCK_MS = 15000;
const WAIT_POLL_MS = 400;

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Build the full dataset from GHL
// ---------------------------------------------------------------------------
interface DealSheetRow {
  id: string;
  status: string;
  linkedOpportunityId?: string;
  propertyAddress?: string;
  pdfLink?: string;
  [key: string]: unknown;
}

async function buildDealSheet(): Promise<DealSheetRow[]> {
  // Fetch all records from GHL (paginated)
  const allRecords: GHLRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await ghlFetch(`${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_TOKEN}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        page,
        pageLimit: 100,
      }),
    }, 'deal-sheet');

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API error (page ${page}):`, response.status, errorText);
      throw new Error(`GHL API error: ${response.status} — ${errorText.slice(0, 200)}`);
    }

    const data: GHLSearchResponse = await response.json();

    if (data.records && data.records.length > 0) {
      allRecords.push(...data.records);
      page++;
      if (data.records.length < 100) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }

    // Safety limit
    if (page > 20) {
      hasMore = false;
    }
  }

  // Transform all records (no status filter — cache holds everything)
  const rows = allRecords.map((record) => transformRecord(record)) as DealSheetRow[];

  // Resolve linked opportunity names (live from GHL)
  try {
    await resolveLinkedOpportunityNames(rows as Parameters<typeof resolveLinkedOpportunityNames>[0], GHL_API_TOKEN, GHL_LOCATION_ID);
  } catch (resolveErr) {
    console.error('Resolve linked opportunity names failed (non-fatal):', resolveErr);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Build allLinks map from the full dataset (F49)
// ---------------------------------------------------------------------------
function buildAllLinks(rows: DealSheetRow[]): Record<string, { id: string; address: string; status: string }[]> {
  const map: Record<string, { id: string; address: string; status: string }[]> = {};
  for (const row of rows) {
    const oppId = row.linkedOpportunityId;
    if (!oppId) continue;
    if (!map[oppId]) map[oppId] = [];
    map[oppId].push({ id: row.id, address: (row.propertyAddress as string) || '', status: (row.status as string) || '' });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Merge pdf_links from Redis
// ---------------------------------------------------------------------------
async function mergePdfLinks(rows: DealSheetRow[]): Promise<void> {
  try {
    const redis = await getRedisClient();
    const recordIds = rows.map((r) => r.id);
    if (recordIds.length > 0) {
      const keys = recordIds.map((id) => `pdf_link:${id}`);
      const values = await redis.mGet(keys);
      for (let i = 0; i < rows.length; i++) {
        const val = values[i];
        if (val) {
          rows[i].pdfLink = val;
        }
      }
    }
  } catch (redisErr) {
    console.error('Redis pdf_link lookup failed (non-fatal):', redisErr);
  }
}

// ---------------------------------------------------------------------------
// Response helper
// ---------------------------------------------------------------------------
function respond(
  rows: DealSheetRow[],
  allLinks: Record<string, { id: string; address: string; status: string }[]>,
  fetchedAt: string,
  served: 'shared' | 'live',
  statusesParam: string
) {
  // Apply status filter
  const filtered = rows.filter((row) => {
    if (statusesParam === 'all') return true;
    const prefixes = statusesParam.split(',').map((s) => s.trim());
    return prefixes.some((prefix) => row.status.startsWith(prefix));
  });

  return NextResponse.json({
    records: filtered,
    total: filtered.length,
    fetchedAt,
    allLinks,
  }, {
    headers: {
      'X-Fetched-At': fetchedAt,
      'X-Served-From': served,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get('statuses') || '01,02';
    const fresh = searchParams.get('fresh') === '1';

    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    try {
      redis = await getRedisClient();
    } catch (e) {
      console.warn('Deal Sheet: Redis unavailable, falling back to live fetch:', e);
    }

    // Manual refresh or no Redis → straight to GHL
    if (fresh || !redis) {
      const rows = await buildDealSheet();
      await mergePdfLinks(rows);
      const allLinks = buildAllLinks(rows);
      const now = new Date().toISOString();
      if (redis) {
        await redis.set(SHARED_KEY, JSON.stringify({ fetchedAt: now, records: rows }), {});
      }
      return respond(rows, allLinks, now, 'live', statusesParam);
    }

    // 1. Shared result still fresh? Serve it.
    const cached = await redis.get(SHARED_KEY);
    if (cached) {
      const { fetchedAt, records } = JSON.parse(cached) as { fetchedAt: string; records: DealSheetRow[] };
      // pdf_links are not in the cache — merge them live (fast Redis lookup)
      await mergePdfLinks(records);
      const allLinks = buildAllLinks(records);
      return respond(records, allLinks, fetchedAt, 'shared', statusesParam);
    }

    // 2. Expired. Try to be the one caller that refreshes it.
    const gotLock = await redis.set(SHARED_LOCK, '1', { NX: true, EX: LOCK_TTL_SEC });
    if (gotLock) {
      try {
        const rows = await buildDealSheet();
        await mergePdfLinks(rows);
        const allLinks = buildAllLinks(rows);
        const now = new Date().toISOString();
        await redis.set(SHARED_KEY, JSON.stringify({ fetchedAt: now, records: rows }), {});
        return respond(rows, allLinks, now, 'live', statusesParam);
      } finally {
        await redis.del(SHARED_LOCK).catch(() => {});
      }
    }

    // 3. Someone else is fetching — wait for their result rather than hitting GHL too.
    const deadline = Date.now() + WAIT_FOR_LOCK_MS;
    while (Date.now() < deadline) {
      await sleep(WAIT_POLL_MS);
      const ready = await redis.get(SHARED_KEY);
      if (ready) {
        const { fetchedAt, records } = JSON.parse(ready) as { fetchedAt: string; records: DealSheetRow[] };
        await mergePdfLinks(records);
        const allLinks = buildAllLinks(records);
        return respond(records, allLinks, fetchedAt, 'shared', statusesParam);
      }
    }

    // 4. Waited too long (the fetcher probably failed) — fetch ourselves.
    const rows = await buildDealSheet();
    await mergePdfLinks(rows);
    const allLinks = buildAllLinks(rows);
    const now = new Date().toISOString();
    await redis.set(SHARED_KEY, JSON.stringify({ fetchedAt: now, records: rows }), {});
    return respond(rows, allLinks, now, 'live', statusesParam);
  } catch (error) {
    console.error('Deal sheet fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal sheet data' },
      { status: 500 }
    );
  }
}

// Field transformation logic now lives in @/lib/dealSheetTransform
