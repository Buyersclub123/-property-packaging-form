import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const VALID_STATUSES = ['02_eoi', '03_contr_exchanged'];

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

    try {
      const redis = await getRedisClient();
      await redis.zAdd('recent_changes', { score: Date.now(), value: recordId });
    } catch (redisErr) {
      console.error('Redis recent_changes push failed (non-fatal):', redisErr);
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('Link opportunity error:', error);
    return NextResponse.json(
      { error: 'Failed to link opportunity' },
      { status: 500 }
    );
  }
}
