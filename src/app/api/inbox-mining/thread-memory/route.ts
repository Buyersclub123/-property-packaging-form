import { NextResponse } from 'next/server';
import { getItem, getThreadMemory, setThreadMemory } from '@/lib/inboxMining/store';
import { fetchOpp, fetchRecord, fetchStageNames } from '@/lib/inboxMining/ghl';
import { getCfEmail } from '@/lib/cloudflareAuth';

export const dynamic = 'force-dynamic';

// JT Confirm / Correct. Writes only to the local thread-memory table, never to GHL.
export async function POST(request: Request) {
  let body: { itemId?: number; opportunityId?: string; propertyRecordId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const opportunityId = (body.opportunityId || '').trim();
  const propertyRecordId = (body.propertyRecordId || '').trim() || null;
  if (!body.itemId || !opportunityId) return NextResponse.json({ error: 'itemId and opportunityId are required' }, { status: 400 });
  try {
    const item = await getItem(body.itemId);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    try {
      await fetchOpp(opportunityId, await fetchStageNames());
      if (propertyRecordId) await fetchRecord(propertyRecordId);
    } catch (e) {
      return NextResponse.json({ error: `Not found in GHL: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 });
    }
    const existing = await getThreadMemory(item.mailbox, item.thread_id);
    await setThreadMemory(
      item.mailbox,
      item.thread_id,
      existing?.first_subject ?? item.subject,
      existing?.first_message_at ?? new Date(item.received_at).toISOString(),
      existing?.first_sender ?? item.from_addr,
      opportunityId,
      propertyRecordId,
      getCfEmail(request) || 'JT (local dev)'
    );
    return NextResponse.json({ ok: true, memory: await getThreadMemory(item.mailbox, item.thread_id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
