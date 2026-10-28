import { NextResponse } from 'next/server';
import { getItem, getThreadMemory } from '@/lib/inboxMining/store';
import { getMessage } from '@/lib/inboxMining/gmail';
import { googleErrorMessage } from '@/lib/inboxMining/google';
import { fetchOpp, fetchRecord, fetchStageNames, recordText, type Opp, type PropRecord } from '@/lib/inboxMining/ghl';
import type { MatchResult, Suggestion } from '@/lib/inboxMining/types';

export const dynamic = 'force-dynamic';

// Detail view: email body and current GHL values are always fetched live here.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const item = await getItem(id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    const errors: string[] = [];
    const match = item.match as MatchResult;
    const suggestions = (item.suggestions || []) as Suggestion[];

    let body: string | null = null;
    try {
      body = (await getMessage(item.mailbox, item.message_id)).text.slice(0, 20000);
    } catch (e) {
      errors.push(googleErrorMessage(e, 'Gmail body'));
    }

    let opp: Opp | null = null;
    let rec: PropRecord | null = null;
    if (match?.opportunityId) {
      try {
        opp = await fetchOpp(match.opportunityId, await fetchStageNames());
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    if (match?.propertyRecordId) {
      try {
        rec = await fetchRecord(match.propertyRecordId);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    const current = suggestions.map((s) => {
      if (s.target === 'action') return { value: null, note: 'expected action, no field write' };
      if (s.notInGhl) return { value: null, note: 'field not in GHL yet' };
      if (s.target === 'opportunity') {
        if (!opp) return { value: null, note: 'opportunity not loaded' };
        const v = opp.fields[s.fieldId || ''];
        return { value: v === undefined ? '' : Array.isArray(v) ? v.join(', ') : v };
      }
      if (!rec) return { value: null, note: 'no linked Property Record' };
      return { value: recordText(rec, s.fieldKey) };
    });

    const memory = await getThreadMemory(item.mailbox, item.thread_id);
    return NextResponse.json({
      item,
      body,
      memory,
      live: opp
        ? {
            opportunityId: opp.id,
            name: opp.name,
            pipelineName: opp.pipelineName,
            stageName: opp.stageName,
            status: opp.status,
            registeredAddress: opp.registeredAddress,
          }
        : null,
      current,
      errors,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
