import { NextResponse } from 'next/server';
import { GHLRecord, GHLSearchResponse, transformRecord, resolveLinkedOpportunityNames } from '@/lib/dealSheetTransform';
import { getRedisClient } from '@/lib/redis';
import { ghlFetch } from '@/lib/ghlFetch';

// F49: Background sync-refresh — runs every 30 minutes via cron.
// 1. Fetches all records fresh from GHL
// 2. Compares against the current cache
// 3. Updates the cache
// 4. Logs any discrepancies to Redis for the end-of-day report
// 5. Pushes changed record IDs into recent_changes so the 15s poll picks them up

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

const SHARED_KEY = 'ds:records';
const DISCREPANCY_KEY = 'ds:discrepancies';

export const dynamic = 'force-dynamic';

interface DealSheetRow {
  id: string;
  status: string;
  linkedOpportunityId?: string;
  propertyAddress?: string;
  offerPrice?: string;
  clientClosed?: string;
  closingPrice?: string;
  [key: string]: unknown;
}

async function fetchAllFromGHL(): Promise<DealSheetRow[]> {
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
    }, 'deal-sheet-sync');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GHL API error: ${response.status} — ${errorText.slice(0, 200)}`);
    }

    const data: GHLSearchResponse = await response.json();

    if (data.records && data.records.length > 0) {
      allRecords.push(...data.records);
      page++;
      if (data.records.length < 100) hasMore = false;
    } else {
      hasMore = false;
    }

    if (page > 20) hasMore = false;
  }

  const rows = allRecords.map((record) => transformRecord(record)) as DealSheetRow[];

  try {
    await resolveLinkedOpportunityNames(rows as Parameters<typeof resolveLinkedOpportunityNames>[0], GHL_API_TOKEN, GHL_LOCATION_ID);
  } catch {
    // non-fatal
  }

  return rows;
}

// Fields to compare for discrepancy detection
const COMPARE_FIELDS = ['status', 'linkedOpportunityId', 'offerPrice', 'clientClosed', 'closingPrice', 'propertyAddress'] as const;

export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json({ error: 'Missing GHL configuration' }, { status: 500 });
    }

    // Verify cron secret in production
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;
    // Allow without secret in dev or if CRON_SECRET is not set
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = await getRedisClient();

    // 1. Read the current cache
    const cachedRaw = await redis.get(SHARED_KEY);
    const cachedMap = new Map<string, DealSheetRow>();
    if (cachedRaw) {
      const { records } = JSON.parse(cachedRaw) as { fetchedAt: string; records: DealSheetRow[] };
      for (const row of records) {
        cachedMap.set(row.id, row);
      }
    }

    // 2. Fetch fresh from GHL
    const freshRows = await fetchAllFromGHL();
    const freshMap = new Map<string, DealSheetRow>();
    for (const row of freshRows) {
      freshMap.set(row.id, row);
    }

    // 3. Compare and find discrepancies
    const discrepancies: {
      recordId: string;
      address: string;
      timestamp: string;
      changes: { field: string; cached: string; fresh: string }[];
    }[] = [];
    const changedRecordIds: string[] = [];

    for (const [id, freshRow] of freshMap) {
      const cachedRow = cachedMap.get(id);
      if (!cachedRow) {
        // New record not in cache — not a discrepancy, just new
        changedRecordIds.push(id);
        continue;
      }

      const changes: { field: string; cached: string; fresh: string }[] = [];
      for (const field of COMPARE_FIELDS) {
        const cachedVal = String(cachedRow[field] || '');
        const freshVal = String(freshRow[field] || '');
        if (cachedVal !== freshVal) {
          changes.push({ field, cached: cachedVal, fresh: freshVal });
        }
      }

      if (changes.length > 0) {
        changedRecordIds.push(id);
        discrepancies.push({
          recordId: id,
          address: (freshRow.propertyAddress as string) || '',
          timestamp: new Date().toISOString(),
          changes,
        });
      }
    }

    // Check for records in cache but not in fresh (deleted in GHL)
    for (const id of cachedMap.keys()) {
      if (!freshMap.has(id)) {
        changedRecordIds.push(id);
      }
    }

    // 4. Update the cache with fresh data
    const now = new Date().toISOString();
    await redis.set(SHARED_KEY, JSON.stringify({ fetchedAt: now, records: freshRows }));

    // 5. Push changed record IDs into recent_changes so the 15s poll picks them up
    if (changedRecordIds.length > 0) {
      const nowMs = Date.now();
      const entries = changedRecordIds.map((id) => ({ score: nowMs, value: id }));
      await redis.zAdd('recent_changes', entries);
    }

    // 6. Log discrepancies to Redis (append to a list, kept for 24h)
    if (discrepancies.length > 0) {
      for (const d of discrepancies) {
        await redis.rPush(DISCREPANCY_KEY, JSON.stringify(d));
      }
    }

    return NextResponse.json({
      success: true,
      totalRecords: freshRows.length,
      cachedRecords: cachedMap.size,
      discrepancies: discrepancies.length,
      changedRecordIds: changedRecordIds.length,
      details: discrepancies.length > 0 ? discrepancies : undefined,
    });
  } catch (error) {
    console.error('Sync-refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
