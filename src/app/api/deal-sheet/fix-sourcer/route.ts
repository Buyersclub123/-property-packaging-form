import { NextRequest, NextResponse } from 'next/server';

const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';
const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';

const NAME_MAPPING: Record<string, string> = {
  'James Middleton': 'james.m',
  'Joshua O\'Hanlon': 'joshua.o',
  'Joshua O\u2019Hanlon': 'joshua.o',
  'Aaditya Manek': 'aaditya.m',
  'Ali Hallak': 'ali.h',
  'Brandon Lee': 'brandon.l',
  'John Truscott': 'john.t',
  'Sachin Patel': 'sachin.p',
  'ali': 'ali.h',
};

export async function GET(request: NextRequest) {
  const dryRun = request.nextUrl.searchParams.get('dryRun') !== 'false';
  const token = process.env.GHL_BEARER_TOKEN || process.env.GHL_API_TOKEN || '';
  const locationId = process.env.GHL_LOCATION_ID || '';

  if (!token || !locationId) {
    return NextResponse.json({ error: 'Missing GHL credentials' }, { status: 500 });
  }

  // Fetch all records
  let allRecords: any[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const url = `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        locationId,
        page: Math.floor(offset / 100) + 1,
        pageLimit: 100,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GHL API error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const records = data.records || [];
    allRecords = allRecords.concat(records);

    if (records.length < 100) {
      hasMore = false;
    } else {
      offset += 100;
    }
  }

  // Find records needing fixes (check both sourcer and packager fields)
  const wrongNames = Object.keys(NAME_MAPPING);
  const recordsToFix: { id: string; field: string; oldValue: string; newValue: string }[] = [];

  allRecords.forEach((record) => {
    const props = record.properties || record;
    const recordId = record.recordId || record.id;

    const sourcer = (props.sourcer || '').trim();
    if (wrongNames.includes(sourcer)) {
      recordsToFix.push({ id: recordId, field: 'sourcer', oldValue: sourcer, newValue: NAME_MAPPING[sourcer] });
    }

    const packager = (props.packager || '').trim();
    if (wrongNames.includes(packager)) {
      recordsToFix.push({ id: recordId, field: 'packager', oldValue: packager, newValue: NAME_MAPPING[packager] });
    }
  });

  if (dryRun) {
    return NextResponse.json({
      mode: 'DRY RUN — no changes made',
      totalRecords: allRecords.length,
      recordsToFix: recordsToFix.length,
      nameMapping: NAME_MAPPING,
      records: recordsToFix,
    });
  }

  // Apply fixes
  const results: { id: string; field: string; oldValue: string; newValue: string; success: boolean; error?: string }[] = [];

  for (const fix of recordsToFix) {
    try {
      const url = `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/${fix.id}?locationId=${locationId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          properties: { [fix.field]: fix.newValue },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        results.push({ ...fix, success: false, error: `${res.status}: ${errText}` });
      } else {
        results.push({ ...fix, success: true });
      }

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err: any) {
      results.push({ ...fix, success: false, error: err.message });
    }
  }

  return NextResponse.json({
    mode: 'LIVE — changes applied',
    totalRecords: allRecords.length,
    recordsFixed: results.filter((r) => r.success).length,
    recordsFailed: results.filter((r) => !r.success).length,
    results,
  });
}
