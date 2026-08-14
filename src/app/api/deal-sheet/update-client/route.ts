import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const ASSIGNED_BA_FIELD_ID = 'NXqFwEzo28k6lOkbyT5N';
const ARCHIVE_KEY = 'deal_events:fallthrough';

interface ArchiveEntry {
  eventType: 'client_change';
  recordId: string;
  propertyAddress: string;
  timestamp: string;
  transitionType: 'client_edited' | 'reassigned' | 'reverted_to_speculative' | 'client_removed';
  fromStatus: string;
  toStatus: string;
  incoming: {
    linked_opportunity_id: string;
    client_closed: string;
    closing_ba: string;
    closing_price: string;
    closing_date: string;
  };
  outgoing: {
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
      transitionType,
      writeBaToOpportunity,
    } = body as {
      recordId?: string;
      opportunityId?: string;
      opportunityName?: string;
      assignedBA?: string;
      totalPurchasePrice?: string;
      closingDate?: string;
      transitionType?: ArchiveEntry['transitionType'];
      writeBaToOpportunity?: boolean;
    };

    if (!recordId || !transitionType) {
      return NextResponse.json(
        { error: 'recordId and transitionType are required' },
        { status: 400 }
      );
    }

    // 1. Fetch the existing record (outgoing values for archive) and keep status.
    const getUrl = `${GHL_API_BASE}/objects/${GHL_OBJECT_ID}/records/${recordId}?_t=${Date.now()}&locationId=${LOCATION_ID}`;
    const getRes = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    let currentStatus = '';
    let propertyAddress = '';
    let outgoingOppId = '';
    let outgoingClient = '';
    let outgoingBA = '';
    let outgoingPrice = '';
    let outgoingDate = '';

    if (getRes.ok) {
      const data = await getRes.json();
      const p = data.record?.properties || data.properties || {};
      currentStatus = p.status || '';
      propertyAddress = p.property_address || '';
      outgoingOppId = p.linked_opportunity_id || '';
      outgoingClient = p.client_closed || '';
      outgoingBA = p.closing_ba || '';
      outgoingPrice = p.closing_price || '';
      outgoingDate = p.closing_date || '';
    }

    const isRemove = transitionType === 'reverted_to_speculative' || transitionType === 'client_removed';

    // 2. Prepare the new values.
    const newClient = transitionType === 'reverted_to_speculative'
      ? 'SPECULATIVE EOI'
      : transitionType === 'client_removed'
      ? ''
      : opportunityName || outgoingClient;
    const newOppId = isRemove ? '' : opportunityId || outgoingOppId;
    const newBA = isRemove ? '' : assignedBA || '';
    const newPrice = isRemove ? '' : totalPurchasePrice || '';
    const newDate = isRemove ? '' : closingDate || '';

    // 3. Archive the outgoing client first if there is one, or on any explicit client change.
    const hadOutgoing = outgoingOppId || outgoingClient || outgoingBA || outgoingPrice || outgoingDate;
    const shouldArchive = hadOutgoing || transitionType === 'reverted_to_speculative' || transitionType === 'client_removed';
    let archiveOk = true;
    if (shouldArchive) {
      let opportunityOwnerId: string | null = null;
      let opportunityNameFromOpp = '';
      if (outgoingOppId) {
        try {
          const oppRes = await fetch(`${GHL_API_BASE}/opportunities/${outgoingOppId}?locationId=${LOCATION_ID}`, {
            headers: { Authorization: `Bearer ${BEARER_TOKEN}`, Version: '2021-07-28' },
          });
          if (oppRes.ok) {
            const o = await oppRes.json();
            const opp = o.opportunity || o;
            opportunityNameFromOpp = opp.name || '';
            opportunityOwnerId = opp.assignedTo || null;
          }
        } catch { /* best effort */ }
      }

      const archive: ArchiveEntry = {
        eventType: 'client_change',
        recordId,
        propertyAddress,
        timestamp: new Date().toISOString(),
        transitionType,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        outgoing: {
          linked_opportunity_id: outgoingOppId,
          client_closed: outgoingClient,
          closing_ba: outgoingBA,
          closing_price: outgoingPrice,
          closing_date: outgoingDate,
        },
        incoming: {
          linked_opportunity_id: newOppId,
          client_closed: newClient,
          closing_ba: newBA,
          closing_price: newPrice,
          closing_date: newDate,
        },
        opportunity: {
          id: outgoingOppId,
          name: outgoingClient || opportunityNameFromOpp,
          opportunityOwnerId,
        },
      };

      try {
        const redis = await getRedisClient();
        await redis.rPush(ARCHIVE_KEY, JSON.stringify(archive));
      } catch (redisErr) {
        console.error('Redis archive push failed (non-fatal):', redisErr);
        archiveOk = false;
      }
    }

    // 4. Write the updated CO record (status unchanged).
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
          status: currentStatus,
          linked_opportunity_id: newOppId,
          client_closed: newClient,
          closing_ba: newBA,
          closing_price: newPrice,
          closing_date: newDate,
        },
      }),
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      console.error('GHL update-client failed:', putRes.status, errorText);
      return NextResponse.json(
        { error: `GHL API error: ${putRes.status}` },
        { status: putRes.status }
      );
    }

    // 5. Write back the BA to the opportunity if it changed (reassign / client_edited).
    let baWriteBackOk = true;
    // The client compares the chosen BA against the OPPORTUNITY's current value,
    // which is the only correct baseline — the record's own closing_ba is the copy
    // that drifts, so comparing to it silently skips exactly the repairs we need.
    const changedBA = !isRemove && assignedBA && writeBaToOpportunity !== false;
    if (changedBA && opportunityId) {
      try {
        const oppRes = await fetch(`${GHL_API_BASE}/opportunities/${opportunityId}?locationId=${LOCATION_ID}`, {
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
          console.error('Opportunity BA write-back failed:', oppRes.status, await oppRes.text());
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

    return NextResponse.json({
      success: true,
      archiveOk,
      baWriteBackOk,
      record: await putRes.json(),
    });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { error: 'Failed to update client link' },
      { status: 500 }
    );
  }
}
