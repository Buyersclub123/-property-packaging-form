import { NextRequest, NextResponse } from 'next/server';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

interface GHLRecord {
  id: string;
  properties: Record<string, string>;
}

interface GHLSearchResponse {
  records: GHLRecord[];
  meta?: { total?: number };
}

// "Touch" a record by re-writing its status — triggers GHL workflow → Make.com → PDF regen
async function touchRecord(recordId: string, currentStatus: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/${recordId}?locationId=${LOCATION_ID}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          status: currentStatus,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `GHL ${response.status}: ${errorText}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Auth
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = searchParams.get('dryRun') === 'true';
  const limit = parseInt(searchParams.get('limit') || '0', 10); // 0 = all
  const delayMs = parseInt(searchParams.get('delay') || '2000', 10); // ms between records

  // Fetch all records from GHL
  const allRecords: GHLRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: LOCATION_ID,
        page,
        pageLimit: 100,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `GHL fetch error: ${response.status}` }, { status: 502 });
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

  // Filter to 01 Available records only
  const targetRecords = allRecords.filter((r) => {
    const status = r.properties?.status || '';
    return status.startsWith('01');
  });

  // Apply limit
  const recordsToProcess = limit > 0 ? targetRecords.slice(0, limit) : targetRecords;

  const results: { id: string; address: string; status: string; result: string; error?: string }[] = [];

  for (let i = 0; i < recordsToProcess.length; i++) {
    const rec = recordsToProcess[i];
    const address = rec.properties?.property_address || 'Unknown';
    const status = rec.properties?.status || '';

    if (dryRun) {
      results.push({ id: rec.id, address, status, result: 'dry_run' });
    } else {
      const res = await touchRecord(rec.id, status);
      results.push({
        id: rec.id,
        address,
        status,
        result: res.success ? 'touched' : 'failed',
        error: res.error,
      });

      // Delay between records to avoid rate limits and give Make.com time to process
      if (i < recordsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  const succeeded = results.filter((r) => r.result === 'touched').length;
  const failed = results.filter((r) => r.result === 'failed').length;

  return NextResponse.json({
    success: true,
    duration: `${Date.now() - startTime}ms`,
    dryRun,
    totalGHLRecords: allRecords.length,
    target01_02Records: targetRecords.length,
    processed: recordsToProcess.length,
    succeeded,
    failed,
    results,
  });
}
