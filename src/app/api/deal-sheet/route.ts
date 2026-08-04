import { NextResponse } from 'next/server';
import { GHLRecord, GHLSearchResponse, transformRecord } from '@/lib/dealSheetTransform';

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

    // Check query params for inclusion of removed/test records
    const { searchParams } = new URL(request.url);
    const includeRemoved = searchParams.get('includeRemoved') === 'true';
    const includeTest = searchParams.get('includeTest') === 'true';

    // Transform records into deal sheet format
    const dealSheetRows = allRecords
      .map((record) => transformRecord(record))
      .filter((row) => {
        if (!includeTest && row.status.startsWith('07')) return false;
        if (!includeRemoved && (row.status.startsWith('05') || row.status.startsWith('06'))) return false;
        return true;
      });

    return NextResponse.json({
      records: dealSheetRows,
      total: dealSheetRows.length,
      fetchedAt: new Date().toISOString(),
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
