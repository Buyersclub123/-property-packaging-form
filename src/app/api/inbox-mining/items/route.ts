import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureTables, listItems } from '@/lib/inboxMining/store';
import { sydneyWindow, MAX_WINDOW_DAYS, emailOf } from '@/lib/inboxMining/gmail';
import { buildProfile } from '@/lib/inboxMining/profile';
import { classifyActivity } from '@/lib/inboxMining/activity';
import { ensureForwardsTable, normSubject } from '@/lib/inboxMining/forwards';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

export async function GET(request: Request) {
  const days = parseInt(new URL(request.url).searchParams.get('days') || String(MAX_WINDOW_DAYS), 10);
  try {
    await ensureTables();
    await ensureForwardsTable();
    const { start } = sydneyWindow(days);
    const [rows, profile] = await Promise.all([listItems(start), buildProfile()]);

    // Responder (backlog 16): only from replies and forwards we can see (shared mailboxes + staff forwards).
    const sql = getDb();
    const replies = (await sql`
      SELECT mailbox, thread_id, from_email, sent_at FROM email_activity
      WHERE direction = 'out' AND sent_at >= ${start.toISOString()}`) as { mailbox: string; thread_id: string; from_email: string; sent_at: string }[];
    const fwds = (await sql`
      SELECT mailbox, norm_subject, sent_at FROM email_forwards
      WHERE norm_subject IS NOT NULL AND sent_at >= ${start.toISOString()}`) as { mailbox: string; norm_subject: string; sent_at: string }[];
    const byThread = new Map<string, { who: string; at: number }[]>();
    for (const r of replies) {
      const k = `${r.mailbox}|${r.thread_id}`;
      const list = byThread.get(k) || [];
      list.push({ who: r.from_email, at: new Date(r.sent_at).getTime() });
      byThread.set(k, list);
    }
    const bySubject = new Map<string, { who: string; at: number }[]>();
    for (const f of fwds) {
      const list = bySubject.get(f.norm_subject) || [];
      list.push({ who: f.mailbox, at: new Date(f.sent_at).getTime() });
      bySubject.set(f.norm_subject, list);
    }

    const items = rows.map((r) => {
      const docs = (r.docs || []) as { name?: string }[];
      const act = classifyActivity({
        subject: (r.subject as string) || '',
        snippet: '',
        fromEmail: emailOf((r.from_addr as string) || ''),
        direction: r.direction === 'outbound' ? 'out' : 'in',
        listUnsubscribe: false,
        autoSubmitted: false,
        attTypes: docs.map((d) => (d.name || '').split('.').pop()?.toLowerCase() || '').filter(Boolean).join(','),
      });
      const t = new Date(r.received_at as string).getTime();
      const after = (list?: { who: string; at: number }[]) =>
        (list || []).filter((x) => x.at > t && x.at <= t + 14 * DAY).sort((a, b) => a.at - b.at)[0];
      const reply = after(byThread.get(`${r.mailbox}|${r.thread_id}`));
      const ns = normSubject((r.subject as string) || '');
      const fwd = ns.length >= 12 ? after(bySubject.get(ns)) : undefined;
      const responder = reply ? { who: reply.who, how: 'reply', at: new Date(reply.at).toISOString() }
        : fwd ? { who: fwd.who, how: 'forward', at: new Date(fwd.at).toISOString() } : null;
      return { ...r, profile: profile.items.get(r.id as number) || null, activity: act.activity, responder };
    });
    return NextResponse.json({ items, since: start.toISOString(), profileBuiltAt: profile.builtAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
