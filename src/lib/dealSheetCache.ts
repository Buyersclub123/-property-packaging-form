import { getRedisClient } from '@/lib/redis';
import { GHLRecord, transformRecord, resolveLinkedOpportunityNames } from '@/lib/dealSheetTransform';

// Shared cache key — must match route.ts and sync-refresh
const SHARED_KEY = 'ds:records';

const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

/**
 * Re-fetch a single record from GHL and update it inside the cached dataset.
 * Best-effort — failures are logged but do not throw.
 */
export async function updateCachedRecord(recordId: string): Promise<void> {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) return;

    const redis = await getRedisClient();
    const cachedRaw = await redis.get(SHARED_KEY);
    if (!cachedRaw) return;

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

    if (!response.ok) return;

    const data = await response.json();
    const record: GHLRecord = data.record || data;
    const transformed = transformRecord(record);

    try {
      await resolveLinkedOpportunityNames([transformed], GHL_API_TOKEN, GHL_LOCATION_ID);
    } catch {
      // non-fatal
    }

    try {
      const pdfLink = await redis.get(`pdf_link:${recordId}`);
      if (pdfLink) {
        transformed.pdfLink = pdfLink;
      }
    } catch {
      // non-fatal
    }

    const cached = JSON.parse(cachedRaw) as { fetchedAt: string; records: Record<string, unknown>[] };
    const idx = cached.records.findIndex((r) => r.id === recordId);
    if (idx >= 0) {
      cached.records[idx] = transformed;
    } else {
      cached.records.push(transformed);
    }
    cached.fetchedAt = new Date().toISOString();
    await redis.set(SHARED_KEY, JSON.stringify(cached));
  } catch (err) {
    console.error('Cache update failed (non-fatal):', err);
  }
}
