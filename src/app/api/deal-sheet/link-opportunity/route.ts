import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const VALID_STATUSES = ['02_eoi', '03_contr_exchanged'];

// Opportunity "Assigned BA" custom field — written back when the user edits
// the BA in the EOI link modal (the one deliberate opportunity write in D1;
// general data push is D3). See docs/deal-sheet-eoi-d1-brief.md F6/F9.
const ASSIGNED_BA_FIELD_ID = 'NXqFwEzo28k6lOkbyT5N';

function getTodayAEST(): string {
  const now = new Date();
  const offsetMs = 10 * 60 * 60 * 1000;
  const ausTime = new Date(now.getTime() + offsetMs);
  const day = String(ausTime.getUTCDate()).padStart(2, '0');
  const month = String(ausTime.getUTCMonth() + 1).padStart(2, '0');
  const year = ausTime.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recordId,
      opportunityId,
      opportunityName,
      assignedBA,
      totalPurchasePrice,
      closingDate,
      status,
      writeBaToOpportunity,
    } = body;

    if (!recordId || !opportunityId || !opportunityName || !status) {
      return NextResponse.json(
        { error: 'recordId, opportunityId, opportunityName, and status are required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid values: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const url = `https://services.leadconnectorhq.com/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${LOCATION_ID}`;
    const payload = JSON.stringify({
      properties: {
        status,
        linked_opportunity_id: opportunityId,
        client_closed: opportunityName,
        closing_ba: assignedBA || '',
        closing_price: totalPurchasePrice
          ? String(totalPurchasePrice).replace(/[^0-9.]/g, '')
          : '',
        closing_date: closingDate || '',
      },
    });

    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: payload,
      });
      if (response.ok || response.status < 500) break;
      console.warn(`GHL 500 on attempt ${attempt + 1}, retrying...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!response || !response.ok) {
      const errorText = await response?.text();
      console.error('GHL link opportunity failed:', response?.status, errorText);
      return NextResponse.json(
        { error: `GHL API error: ${response?.status}` },
        { status: response?.status || 500 }
      );
    }

    const data = await response.json();

    // Write the edited BA back to the opportunity's Assigned BA field (F6/F9).
    // The CO write above already succeeded — a failure here is reported to the
    // client as a warning, not a failed link.
    let baWriteBackOk = true;
    if (writeBaToOpportunity === true && assignedBA) {
      try {
        const oppUrl = `https://services.leadconnectorhq.com/opportunities/${opportunityId}?locationId=${LOCATION_ID}`;
        const oppRes = await fetch(oppUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customFields: [{ id: ASSIGNED_BA_FIELD_ID, field_value: assignedBA }],
          }),
        });
        if (!oppRes.ok) {
          const errorText = await oppRes.text();
          console.error('Opportunity BA write-back failed:', oppRes.status, errorText);
          baWriteBackOk = false;
        }
      } catch (oppErr) {
        console.error('Opportunity BA write-back error:', oppErr);
        baWriteBackOk = false;
      }
    }

    try {
      const redis = await getRedisClient();
      await redis.zAdd('recent_changes', { score: Date.now(), value: recordId });
    } catch (redisErr) {
      console.error('Redis recent_changes push failed (non-fatal):', redisErr);
    }

    return NextResponse.json({ success: true, baWriteBackOk, record: data });
  } catch (error) {
    console.error('Link opportunity error:', error);
    return NextResponse.json(
      { error: 'Failed to link opportunity' },
      { status: 500 }
    );
  }
}
