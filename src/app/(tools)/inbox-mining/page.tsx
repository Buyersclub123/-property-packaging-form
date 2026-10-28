'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import TopNavBar from '@/components/portal/TopNavBar';
import { DetailPanel, GRADE_STYLE, clsLabel, sydney, show, type Item } from './shared';

// Workflow view (backlog 16 + 7): plain-language lists, one job each; items leave when done.
// Done / Reopen writes only inbox_items.workflow. Nothing is written to GHL or sent; Apply stays disabled.

interface WorkItem extends Item {
  activity: string;
  responder: { who: string; how: 'reply' | 'forward'; at: string } | null;
  workflow: { status: 'done' | 'open'; by: string; at: string } | null;
}

const LISTS = [
  { key: 'priority', label: 'Your priority list', hint: 'Updates to review' },
  { key: 'replies', label: 'Replies we can help you write', hint: 'Client requests' },
  { key: 'build', label: 'Build updates to pass on', hint: 'Forward to the client' },
  { key: 'unhappy', label: 'Unhappy clients', hint: 'Complaints' },
  { key: 'thanks', label: 'Thank-yous / acknowledgements', hint: 'Clear with one click' },
  { key: 'other', label: 'Everything else', hint: '' },
] as const;
type ListKey = (typeof LISTS)[number]['key'];

const GROUPS = [
  { key: '', label: 'No grouping' },
  { key: 'activity', label: 'Activity type' },
  { key: 'sender', label: 'Sender' },
  { key: 'responder', label: 'Responder (from visible replies / forwards)' },
  { key: 'thread', label: 'Subject line (thread)' },
  { key: 'opportunity', label: 'Opportunity' },
] as const;

const fieldSuggestions = (i: WorkItem) => (i.suggestions || []).filter((s) => s.target !== 'action');

function listOf(i: WorkItem): ListKey {
  if (i.direction === 'outbound') return 'other';
  if (i.activity === 'complaint') return 'unhappy';
  if (fieldSuggestions(i).length && ['A', 'B', 'C'].includes(i.match?.grade)) return 'priority';
  if (i.cls === 'build_update_progress_claim' || i.activity === 'build_update') return 'build';
  if (i.activity === 'client_request') return 'replies';
  if (i.activity === 'thank_you') return 'thanks';
  return 'other';
}

const senderName = (from: string) => (from.match(/^\s*"?([^"<]+?)"?\s*</)?.[1] || from).trim();
const groupKey = (i: WorkItem, g: string) =>
  g === 'activity' ? clsLabel(i.activity)
    : g === 'sender' ? senderName(i.from_addr || '')
    : g === 'responder' ? (i.responder ? `${i.responder.who} (${i.responder.how})` : 'No visible reply or forward')
    : g === 'thread' ? (i.subject || '').replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim() || '(no subject)'
    : g === 'opportunity' ? (i.match?.opportunityName || `No opportunity (${i.match?.grade || 'UNMATCHED'})`)
    : '';

function Card({ i, open, onOpen, onDone, processed }: {
  i: WorkItem; open: boolean; onOpen: () => void; onDone: () => void; processed: boolean;
}) {
  const s = (i.suggestions || [])[0];
  return (
    <div onClick={onOpen}
      className={`cursor-pointer rounded border bg-white p-2 text-xs ${open ? 'border-blue-600 bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-brand-charcoal" title={i.from_addr}>{senderName(i.from_addr || '')}</div>
          <div className="line-clamp-2 text-gray-700" title={i.subject}>{i.subject || '(no subject)'}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDone(); }}
          className={processed
            ? 'shrink-0 rounded border px-2 py-0.5 font-semibold text-gray-600 hover:bg-gray-50'
            : 'shrink-0 rounded bg-blue-600 px-3 py-0.5 font-semibold text-white hover:bg-blue-700'}>
          {processed ? 'Reopen' : 'Done'}
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-gray-500">
        <span className="rounded bg-blue-50 px-1 text-blue-800">{clsLabel(i.activity)}</span>
        <span className={`rounded px-1 ${GRADE_STYLE[i.match?.grade] || ''}`}>{i.match?.grade}</span>
        <span className="truncate">{i.match?.opportunityName || 'No opportunity matched'}</span>
        <span className="ml-auto">{sydney(i.received_at)}</span>
      </div>
      {s && (
        <div className="mt-1 text-gray-700">
          <span className="text-gray-500">We suggest: </span>
          {s.target === 'action' ? s.fieldLabel : `${s.fieldLabel} \u2192 ${show(s.proposed)}`}
          {(i.suggestions || []).length > 1 && <span className="text-gray-400"> (+{i.suggestions.length - 1} more)</span>}
        </div>
      )}
      {processed && i.workflow && <div className="mt-1 text-gray-400">Done by {i.workflow.by}, {sydney(i.workflow.at)}</div>}
    </div>
  );
}

export default function InboxWorkflowPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [list, setList] = useState<ListKey>('priority');
  const [tab, setTab] = useState<'open' | 'processed'>('open');
  const [group, setGroup] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox-mining/items?days=${days}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (ids: number[], status: 'done' | 'open') => {
    try {
      const res = await fetch('/api/inbox-mining/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, workflow: data.entry } : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const isDone = (i: WorkItem) => i.workflow?.status === 'done';
  const counts = useMemo(() => {
    const c: Record<string, { open: number; done: number }> = {};
    for (const l of LISTS) c[l.key] = { open: 0, done: 0 };
    for (const i of items) c[listOf(i)][isDone(i) ? 'done' : 'open']++;
    return c;
  }, [items]);

  const shown = useMemo(
    () => items.filter((i) => listOf(i) === list && (tab === 'processed') === isDone(i)),
    [items, list, tab]
  );
  const groups = useMemo(() => {
    if (!group) return [{ key: '', items: shown }];
    const m = new Map<string, WorkItem[]>();
    for (const i of shown) {
      const k = groupKey(i, group);
      m.set(k, [...(m.get(k) || []), i]);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length).map(([key, its]) => ({ key, items: its }));
  }, [shown, group]);

  const current = LISTS.find((l) => l.key === list)!;

  return (
    <>
      <TopNavBar />
      <main className="min-h-screen bg-white text-brand-charcoal">
        <div className="mx-auto max-w-[1600px] px-4 py-6">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Inbox</h1>
            <div className="flex gap-4 text-xs font-semibold">
              <a href="/inbox-mining/reporting" className="text-blue-700 hover:underline">Reporting</a>
              <a href="/inbox-mining/console" className="text-blue-700 hover:underline">Console</a>
            </div>
          </div>
          <div className="mt-2 rounded border border-blue-200 bg-blue-50/40 px-3 py-2 text-xs">
            Demo, read-only: nothing is written to GHL and no email is sent. Done only moves an item to Processed here.
          </div>
          {error && <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

          <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.1fr)]">
            <nav className="self-start overflow-hidden rounded border bg-white text-sm">
              {LISTS.map((l) => (
                <button key={l.key} onClick={() => { setList(l.key); setTab('open'); setOpenId(null); }}
                  className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 ${list === l.key ? 'bg-blue-100 shadow-[inset_3px_0_0_#2563eb] font-semibold' : 'hover:bg-blue-50'}`}>
                  <span>{l.label}</span>
                  <span className={`rounded px-1.5 text-xs ${counts[l.key].open ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{counts[l.key].open}</span>
                </button>
              ))}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Last
                <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="rounded border bg-white px-1 py-0.5">
                  {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </nav>

            <section className="min-w-0 overflow-hidden rounded border bg-white">
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 px-3 py-2 text-xs">
                <span className="text-sm font-semibold text-brand-charcoal">{current.label}</span>
                {current.hint && <span className="text-gray-500">{current.hint}</span>}
                <div className="ml-auto flex overflow-hidden rounded border">
                  {(['open', 'processed'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-2 py-0.5 ${tab === t ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-50'}`}>
                      {t === 'open' ? `To do (${counts[list].open})` : `Processed (${counts[list].done})`}
                    </button>
                  ))}
                </div>
                <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded border bg-white px-1 py-0.5">
                  {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
                {list === 'thanks' && tab === 'open' && shown.length > 0 && (
                  <button onClick={() => setStatus(shown.map((i) => i.id), 'done')} className="rounded bg-blue-600 px-2 py-0.5 font-semibold text-white hover:bg-blue-700">
                    Clear all ({shown.length})
                  </button>
                )}
              </div>
              <div className="max-h-[calc(100vh-15rem)] space-y-3 overflow-y-auto p-3">
                {loading && <div className="text-sm text-gray-500">Loading…</div>}
                {!loading && shown.length === 0 && <div className="text-sm text-gray-500">{tab === 'open' ? 'Nothing to do here.' : 'Nothing processed yet.'}</div>}
                {groups.map((g) => (
                  <div key={g.key || 'all'}>
                    {group && <div className="mb-1 text-xs font-semibold text-gray-500">{g.key} <span className="font-normal">({g.items.length})</span></div>}
                    <div className="space-y-2">
                      {g.items.map((i) => (
                        <Card key={i.id} i={i} open={openId === i.id} processed={tab === 'processed'}
                          onOpen={() => setOpenId(i.id)} onDone={() => setStatus([i.id], tab === 'processed' ? 'open' : 'done')} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded border bg-white p-4 [overflow-wrap:anywhere] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
              {openId ? <DetailPanel id={openId} onChanged={() => { load(); }} /> : <div className="text-sm text-gray-500">Select a card to see the email, evidence and suggestions.</div>}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
