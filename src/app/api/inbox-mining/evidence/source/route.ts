import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureTables } from '@/lib/inboxMining/store';

// GET ?record=<opportunity or Property Record id>&field=<field key>: the Gmail message a mined value came from,
// for the CTRT MINED views. Reads our inbox DB only. Keep this API stable; the CTRT calls it.
// Field keys are matched loosely: 'exchangeDate', 'exchange_date', 'opportunity.exchange_date', the GHL field id or the label.
export const dynamic = 'force-dynamic';

const norm = (k: string) => k.toLowerCase().replace(/^(opportunity|property_record|custom_objects\.[a-z_]+)\./, '').replace(/[^a-z0-9]/g, '');

interface Row {
  id: number; mailbox: string; message_id: string; received_at: string; subject: string | null;
  suggestions: { target: string; fieldKey: string; fieldId?: string; fieldLabel: string; proposed: string | string[] }[] | null;
  feedback: Record<string, { outcome: string }> | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const record = (url.searchParams.get('record') || '').trim();
  const field = (url.searchParams.get('field') || '').trim();
  if (!record || !field) return NextResponse.json({ error: 'record and field are required' }, { status: 400 });
  try {
    await ensureTables();
    const rows = (await getDb()`
      SELECT id, mailbox, message_id, received_at, subject, suggestions, feedback FROM inbox_items
      WHERE match->>'opportunityId' = ${record} OR match->>'propertyRecordId' = ${record}
      ORDER BY received_at DESC`) as Row[];
    const want = norm(field);
    const hits = rows.flatMap((r) =>
      (r.suggestions || [])
        .filter((s) => s.target !== 'action' && [s.fieldKey, s.fieldId || '', s.fieldLabel].some((k) => k && norm(k) === want))
        .map((s) => ({
          itemId: r.id,
          messageId: r.message_id,
          mailbox: r.mailbox,
          receivedAt: r.received_at,
          subject: r.subject,
          fieldKey: s.fieldKey,
          proposed: s.proposed,
          decision: r.feedback?.[`${s.target}:${s.fieldKey}`]?.outcome || null,
          evidenceUrl: `/inbox-mining/evidence?message=${encodeURIComponent(r.message_id)}&field=${encodeURIComponent(s.fieldKey)}`,
        }))
    );
    // Prefer the latest accepted suggestion, then the latest one not rejected.
    const source = hits.find((h) => h.decision === 'accept') || hits.find((h) => !h.decision || h.decision === 'accept') || null;
    return NextResponse.json({ record, field, source, all: hits.slice(0, 20) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
