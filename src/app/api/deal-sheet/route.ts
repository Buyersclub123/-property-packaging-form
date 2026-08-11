import { NextResponse } from 'next/server';
import { GHLRecord, GHLSearchResponse, transformRecord, resolveLinkedOpportunityNames } from '@/lib/dealSheetTransform';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration' },
        { status: 500 }
      );
    }

    // Fetch all records from GHL (paginated)
    const allRecords: GHLRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/search`, {
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GHL API error (page ${page}):`, response.status, errorText);
        return NextResponse.json(
          { error: `GHL API error: ${response.status}` },
          { status: 502 }
        );
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

    // Check query params for status filtering
    const { searchParams } = new URL(request.url);
    const statusesParam = searchParams.get('statuses') || '01,02';

    // Transform records into deal sheet format
    const dealSheetRows = allRecords
      .map((record) => transformRecord(record))
      .filter((row) => {
        if (statusesParam === 'all') return true;
        const prefixes = statusesParam.split(',').map((s) => s.trim());
        return prefixes.some((prefix) => row.status.startsWith(prefix));
      });

    // Merge pdf_links from Redis (overrides GHL field if present)
    try {
      const redis = await getRedisClient();
      const recordIds = dealSheetRows.map((r) => r.id);
      if (recordIds.length > 0) {
        const keys = recordIds.map((id) => `pdf_link:${id}`);
        const values = await redis.mGet(keys);
        for (let i = 0; i < dealSheetRows.length; i++) {
          const val = values[i];
          if (val) {
            dealSheetRows[i].pdfLink = val;
          }
        }
      }
    } catch (redisErr) {
      console.error('Redis pdf_link lookup failed (non-fatal):', redisErr);
    }

    // Resolve linked opportunity names (live from GHL)
    try {
      await resolveLinkedOpportunityNames(dealSheetRows, GHL_API_TOKEN, GHL_LOCATION_ID);
    } catch (resolveErr) {
      console.error('Resolve linked opportunity names failed (non-fatal):', resolveErr);
    }

    return NextResponse.json({
      records: dealSheetRows,
      total: dealSheetRows.length,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Deal sheet fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal sheet data' },
      { status: 500 }
    );
  }
}

// Field transformation logic now lives in @/lib/dealSheetTransform
