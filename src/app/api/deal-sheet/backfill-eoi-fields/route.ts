import { NextRequest, NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghlFetch';

/**
 * One-off backfill route for EOI records with blank closing fields.
 * GET /api/deal-sheet/backfill-eoi-fields          → dry-run summary
 * GET /api/deal-sheet/backfill-eoi-fields?execute=true → actually PUT updates
 *
 * Delete this file after running once.
 */

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlank(val: string | undefined | null): boolean {
  return val === undefined || val === null || val.trim() === '';
}

interface GHLRecord {
  id: string;
  properties: Record<string, string>;
}

interface GHLSearchResponse {
  records?: GHLRecord[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute') === 'true';

    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json({ error: 'Missing GHL configuration' }, { status: 500 });
    }

    // 1. Fetch ALL records (paginated)
    const allRecords: GHLRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await ghlFetch(
        `${GHL_API_BASE}/objects/${GHL_OBJECT_ID}/records/search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GHL_API_TOKEN}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: GHL_LOCATION_ID,
            page,
            pageLimit: 100,
          }),
        },
        'backfill-eoi',
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `GHL search failed on page ${page}: ${res.status}`, detail: err },
          { status: 502 },
        );
      }

      const data: GHLSearchResponse = await res.json();
      if (data.records && data.records.length > 0) {
        allRecords.push(...data.records);
        page++;
        if (data.records.length < 100) hasMore = false;
      } else {
        hasMore = false;
      }
      if (page > 20) hasMore = false;
    }

    // 2. Filter to 02_eoi status
    const eoiRecords = allRecords.filter((r) => r.properties.status === '02_eoi');

    // 3. Build updates
    const updates: {
      recordId: string;
      address: string;
      type: string;
      fields: Record<string, string>;
    }[] = [];

    const fieldCounts: Record<string, number> = {
      closing_ba: 0,
      closing_date: 0,
      closing_price: 0,
    };
    const typeCounts: Record<string, number> = {};

    for (const record of eoiRecords) {
      const p = record.properties;
      const recordType = p.deal_type || '';
      const patch: Record<string, string> = {};

      // closing_ba
      if (isBlank(p.closing_ba)) {
        patch.closing_ba = 'TBC';
        fieldCounts.closing_ba++;
      }

      // closing_date
      if (isBlank(p.closing_date)) {
        patch.closing_date = '01/01/2001';
        fieldCounts.closing_date++;
      }

      // closing_price
      if (isBlank(p.closing_price)) {
        if (recordType === '01_hl_comms' || recordType === '02_single_comms') {
          // Use the raw numeric total; fall back to land + build
          let total = p.total_price || '';
          if (isBlank(total)) {
            const land = parseFloat(p.land_price || '0') || 0;
            const build = parseFloat(p.build_price || '0') || 0;
            const sum = land + build;
            total = sum > 0 ? String(sum) : '0';
          }
          patch.closing_price = total;
        } else {
          patch.closing_price = '0';
        }
        fieldCounts.closing_price++;
      }

      if (Object.keys(patch).length > 0) {
        updates.push({
          recordId: record.id,
          address: p.property_address || '(no address)',
          type: recordType,
          fields: patch,
        });
        typeCounts[recordType || '(empty)'] = (typeCounts[recordType || '(empty)'] || 0) + 1;
      }
    }

    // 4. Execute PUTs if requested
    const errors: { recordId: string; address: string; status: number; detail: string }[] = [];
    let recordsUpdated = 0;

    if (execute) {
      for (const update of updates) {
        const putUrl = `${GHL_API_BASE}/objects/${GHL_OBJECT_ID}/records/${update.recordId}?locationId=${GHL_LOCATION_ID}`;
        try {
          const putRes = await ghlFetch(
            putUrl,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${GHL_API_TOKEN}`,
                Version: '2021-07-28',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: update.fields }),
            },
            'backfill-eoi',
          );

          if (putRes.ok) {
            recordsUpdated++;
          } else {
            const detail = await putRes.text();
            errors.push({
              recordId: update.recordId,
              address: update.address,
              status: putRes.status,
              detail: detail.slice(0, 200),
            });
          }
        } catch (err) {
          errors.push({
            recordId: update.recordId,
            address: update.address,
            status: 0,
            detail: String(err).slice(0, 200),
          });
        }

        await sleep(200);
      }
    }

    // 5. Return summary
    return NextResponse.json({
      dryRun: !execute,
      totalRecordsFetched: allRecords.length,
      eoiRecords: eoiRecords.length,
      recordsNeedingUpdate: updates.length,
      recordsUpdated,
      breakdown: {
        byField: fieldCounts,
        byType: typeCounts,
      },
      errors,
      updates: updates.map((u) => ({
        recordId: u.recordId,
        address: u.address,
        type: u.type,
        fields: u.fields,
      })),
    });
  } catch (error) {
    console.error('Backfill EOI fields error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', detail: String(error) },
      { status: 500 },
    );
  }
}
