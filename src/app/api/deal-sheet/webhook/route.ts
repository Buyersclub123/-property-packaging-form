import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { GHLRecord, transformRecord, resolveLinkedOpportunityNames } from '@/lib/dealSheetTransform';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

const SHARED_KEY = 'ds:records';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId, timestamp, secret } = body;

    // Validate webhook secret
    const expectedSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!recordId || !timestamp) {
      return NextResponse.json(
        { error: 'Missing recordId or timestamp' },
        { status: 400 }
      );
    }

    const score = typeof timestamp === 'number' ? timestamp : Date.now();

    const redis = await getRedisClient();

    // Add/update the recordId in the sorted set with timestamp as score
    // If the same recordId is added again, the score (timestamp) is updated
    await redis.zAdd('recent_changes', [{ score, value: recordId }]);

    // Prune entries older than 5 minutes
    const cutoff = Date.now() - FIVE_MINUTES_MS;
    await redis.zRemRangeByScore('recent_changes', '-inf', cutoff);

    // Update the changed record inside the cached dataset so the cache
    // stays current without needing a full rebuild from GHL.
    try {
      const cachedRaw = await redis.get(SHARED_KEY);
      if (cachedRaw && GHL_API_TOKEN && GHL_LOCATION_ID) {
        // Fetch the changed record from GHL
        const response = await fetch(
          `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/${recordId}?locationId=${GHL_LOCATION_ID}&_t=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${GHL_API_TOKEN}`,
              'Version': GHL_API_VERSION,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const record: GHLRecord = data.record || data;
          const transformed = transformRecord(record);

          // Resolve linked opportunity name
          try {
            await resolveLinkedOpportunityNames([transformed], GHL_API_TOKEN, GHL_LOCATION_ID);
          } catch {
            // non-fatal
          }

          // Override pdf_link from Redis if available
          try {
            const pdfLink = await redis.get(`pdf_link:${recordId}`);
            if (pdfLink) {
              transformed.pdfLink = pdfLink;
            }
          } catch {
            // non-fatal
          }

          // Update the record in the cached dataset
          const cached = JSON.parse(cachedRaw) as { fetchedAt: string; records: Record<string, unknown>[] };
          const idx = cached.records.findIndex((r) => r.id === recordId);
          if (idx >= 0) {
            cached.records[idx] = transformed;
          } else {
            // New record not previously in cache — add it
            cached.records.push(transformed);
          }
          cached.fetchedAt = new Date().toISOString();
          await redis.set(SHARED_KEY, JSON.stringify(cached));
        }
      }
    } catch (cacheErr) {
      // Cache update is best-effort — the 15s client poll and 30-min sync
      // will catch anything missed here.
      console.error('Webhook cache update failed (non-fatal):', cacheErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
