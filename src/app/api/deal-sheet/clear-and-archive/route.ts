import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Archive key for fallthrough/linked-field strip events. D2 will migrate this
// from Redis to Postgres.
const ARCHIVE_KEY = 'deal_events:fallthrough';

interface ArchiveEntry {
  eventType: 'linked_fields_cleared';
  recordId: string;
  propertyAddress: string;
  timestamp: string;
  fromStatus: string;
  toStatus: string;
  clearedFields: {
    linked_opportunity_id: string;
    client_closed: string;
    closing_ba: string;
    closing_price: string;
    closing_date: string;
  };
  opportunity: {
    id: string;
    name: string;
    opportunityOwnerId: string | null;
  };
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, toStatus } = body;

    if (!recordId || !toStatus) {
      return NextResponse.json(
        { error: 'recordId and toStatus are required' },
        { status: 400 }
      );
    }

    // 1. Fetch the current record to get the field values being stripped.
    const getUrl = `${GHL_API_BASE}/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${LOCATION_ID}`;
    const getRes = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    let fromStatus = '';
    let propertyAddress = '';
    let linkedOppId = '';
    let clientClosed = '';
    let closingBA = '';
    let closingPrice = '';
    let closingDate = '';
    let opportunityOwnerId: string | null = null;

    if (getRes.ok) {
      const current = await getRes.json();
      const p = current.record?.properties || current.properties || {};
      fromStatus = p.status || '';
      propertyAddress = p.property_address || '';
      linkedOppId = p.linked_opportunity_id || '';
      clientClosed = p.client_closed || '';
      closingBA = p.closing_ba || '';
      closingPrice = p.closing_price || '';
      closingDate = p.closing_date || '';
    }

    // 2. Fetch the linked opportunity to get the owner/salesperson id.
    let opportunityName = clientClosed;
    if (linkedOppId) {
      try {
        const oppRes = await fetch(`${GHL_API_BASE}/opportunities/${linkedOppId}?locationId=${LOCATION_ID}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
          },
        });
        if (oppRes.ok) {
          const opp = await oppRes.json();
          const o = opp.opportunity || opp;
          opportunityName = o.name || clientClosed || '';
          opportunityOwnerId = o.assignedTo || null;
        }
      } catch {
        // Best-effort; don't fail the clear if the opportunity fetch fails.
      }
    }

    // 3. Clear the linked/EOI fields and set the new status on the CO.
    const putUrl = `${GHL_API_BASE}/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${LOCATION_ID}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          status: toStatus,
          linked_opportunity_id: '',
          client_closed: '',
          closing_ba: '',
          closing_price: '',
          closing_date: '',
        },
      }),
    });

    if (!putRes.ok) {
      console.error('GHL clear-and-archive failed:', putRes.status, await putRes.text());
      return NextResponse.json(
        { error: `GHL API error: ${putRes.status}` },
        { status: putRes.status }
      );
    }

    // 4. Archive the stripped data to Redis (append-only) only if there was
    // actually something to strip. Skip empty/noise entries.
    const hadLinkedData = linkedOppId || clientClosed || closingBA || closingPrice || closingDate;
    if (hadLinkedData) {
      const archive: ArchiveEntry = {
        eventType: 'linked_fields_cleared',
        recordId,
        propertyAddress,
        timestamp: new Date().toISOString(),
        fromStatus,
        toStatus,
        clearedFields: {
          linked_opportunity_id: linkedOppId,
          client_closed: clientClosed,
          closing_ba: closingBA,
          closing_price: closingPrice,
          closing_date: closingDate,
        },
        opportunity: {
          id: linkedOppId,
          name: opportunityName,
          opportunityOwnerId,
        },
      };

      try {
        const redis = await getRedisClient();
        await redis.rPush(ARCHIVE_KEY, JSON.stringify(archive));
      } catch (redisErr) {
        console.error('Redis archive push failed (non-fatal):', redisErr);
        return NextResponse.json({
          success: true,
          archiveOk: false,
          warning: 'Status changed and fields cleared, but the fallthrough archive could not be saved.',
        });
      }
    }

    return NextResponse.json({ success: true, archiveOk: true });
  } catch (error) {
    console.error('Clear and archive error:', error);
    return NextResponse.json(
      { error: 'Failed to archive and clear linked fields' },
      { status: 500 }
    );
  }
}
