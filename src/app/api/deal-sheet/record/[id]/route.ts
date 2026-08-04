import { NextResponse } from 'next/server';
import { GHLRecord, transformRecord } from '@/lib/dealSheetTransform';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration' },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing record ID' },
        { status: 400 }
      );
    }

    // Fetch single record from GHL
    const response = await fetch(
      `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/${id}?locationId=${GHL_LOCATION_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GHL_API_TOKEN}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API error fetching record ${id}:`, response.status, errorText);
      return NextResponse.json(
        { error: `GHL API error: ${response.status}` },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const data = await response.json();

    // GHL returns the record directly (not wrapped in a records array)
    const record: GHLRecord = data.record || data;
    const transformed = transformRecord(record);

    // Override pdf_link from Redis if available
    try {
      const redis = await getRedisClient();
      const pdfLink = await redis.get(`pdf_link:${id}`);
      if (pdfLink) {
        transformed.pdfLink = pdfLink;
      }
    } catch (redisErr) {
      console.error('Redis pdf_link lookup failed (non-fatal):', redisErr);
    }

    return NextResponse.json({ record: transformed });
  } catch (error) {
    console.error('Single record fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    );
  }
}
