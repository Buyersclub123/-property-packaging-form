'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import TopNavBar from '@/components/portal/TopNavBar';
import { clsLabel, type Item } from './shared';
import { DecisionPanel, niceDate } from './decision';
import './wireframe.css';
import BackLink from '@/components/BackLink';

// Inbox decision screen (JT redesign): lists as tabs, the selected list down the left, the decision on the right.
// Decisions write only inbox_items.feedback / inbox_items.workflow. Nothing is written to GHL and no email is sent.

interface WorkItem extends Item {
  activity: string;
  responder: { who: string; how: 'reply' | 'forward'; at: string } | null;
  workflow: { status: 'done' | 'open'; by: string; at: string } | null;
}

const LISTS = [
  { key: 'priority', label: 'Your priority list' },
  { key: 'replies', label: 'Replies we can help you write' },
  { key: 'build', label: 'Build updates to pass on' },
  { key: 'unhappy', label: 'Unhappy clients' },
  { key: 'thanks', label: 'Thank-yous' },
  { key: 'other', label: 'Everything else' },
] as const;
type ListKey = (typeof LISTS)[number]['key'];

const GROUPS = [
  { key: '', label: 'No grouping' },
  { key: 'activity', label: 'Activity type' },
  { key: 'sender', label: 'Sender' },
  { key: 'responder', label: 'Responder (visible replies / forwards)' },
  { key: 'thread', label: 'Subject line (thread)' },
  { key: 'opportunity', label: 'Opportunity' },
] as const;

const fieldSuggestions = (i: WorkItem) => (i.suggestions || []).filter((s) => s.target !== 'action');

function listOf(i: WorkItem): ListKey {
  if (i.direction === 'outbound') return 'other';
  if (i.activity === 'complaint') return 'unhappy';
  if ((i.cls_rule || '').startsWith('client question')) return 'replies';
  // Only suggestions with text evidence reach the priority list; no-evidence ones sit in the lower group of their own list.
  if (fieldSuggestions(i).some((s) => !s.noEvidence) && ['A', 'B', 'C'].includes(i.match?.grade)) return 'priority';
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

function Card({ i, open, onOpen }: { i: WorkItem; open: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={`li ${open ? 'on' : ''}`}>
      <b className="truncate" title={i.from_addr}>{senderName(i.from_addr || '')}</b>
      <span title={i.subject} style={{ color: 'var(--ink)' }}>{i.subject || '(no subject)'}</span>
      <span>{i.match?.opportunityName || 'No opportunity matched'}</span>
      <span>{niceDate(i.received_at)}{(i.suggestions || []).length > 0 && ` · ${i.suggestions.length} suggestion${i.suggestions.length > 1 ? 's' : ''}`}</span>
    </button>
  );
}

export default function InboxDecisionPage() {
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
      // Deep link: /inbox-mining?item=<id> opens that item in its list.
      const want = new URLSearchParams(window.location.search).get('item');
      const hit = want ? (data.items as WorkItem[]).find((x) => String(x.id) === want) : undefined;
      if (hit) {
        setList(listOf(hit));
        setTab(hit.workflow?.status === 'done' ? 'processed' : 'open');
        setOpenId(hit.id);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!group) {
      // No-evidence suggestions (email date only) in their own group, after the ones with evidence.
      const weak = (i: WorkItem) => (i.suggestions || []).length > 0 && i.suggestions.every((s) => s.noEvidence);
      const strong = shown.filter((i) => !weak(i));
      const low = shown.filter(weak);
      return low.length ? [{ key: '', items: strong }, { key: 'No evidence in the text (email date only)', items: low }] : [{ key: '', items: shown }];
    }
    const m = new Map<string, WorkItem[]>();
    for (const i of shown) {
      const k = groupKey(i, group);
      m.set(k, [...(m.get(k) || []), i]);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length).map(([key, its]) => ({ key, items: its }));
  }, [shown, group]);
  const ordered = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Open the first item of the list when nothing (or something outside the list) is selected.
  useEffect(() => {
    if (!ordered.some((i) => i.id === openId)) setOpenId(ordered[0]?.id ?? null);
  }, [ordered, openId]);

  const nextAfter = (id: number) => {
    const idx = ordered.findIndex((i) => i.id === id);
    const rest = ordered.filter((i) => i.id !== id);
    return rest.length ? rest[Math.min(Math.max(idx, 0), rest.length - 1)].id : null;
  };

  const markLocal = (id: number, status: 'done' | 'open') =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, workflow: { status, by: 'you', at: new Date().toISOString() } } : i)));

  const onDone = (id: number) => {
    const next = nextAfter(id);
    markLocal(id, 'done');
    setOpenId(next);
  };
  const onSkip = (id: number) => {
    const idx = ordered.findIndex((i) => i.id === id);
    setOpenId(ordered[(idx + 1) % ordered.length]?.id ?? null);
  };
  const reopen = async (id: number) => {
    const res = await fetch('/api/inbox-mining/workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], status: 'open' }),
    });
    if (res.ok) {
      const next = nextAfter(id);
      markLocal(id, 'open');
      setOpenId(next);
    } else setError((await res.json()).error || `HTTP ${res.status}`);
  };
  const clearAll = async () => {
    const ids = shown.map((i) => i.id);
    const res = await fetch('/api/inbox-mining/workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: 'done' }),
    });
    if (res.ok) setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, workflow: { status: 'done', by: 'you', at: new Date().toISOString() } } : i)));
  };

  return (
    <>
      <TopNavBar />
      <main className="min-h-screen bg-white text-brand-charcoal">
        <div className="mx-auto max-w-[1600px] px-4 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-4">
              <BackLink fallback="/new-initiatives" />
              <h1 className="text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Inbox</h1>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="font-normal text-gray-500">Read-only demo: nothing is written to GHL and no email is sent.</span>
              <a href="/inbox-mining/reporting" className="text-blue-700 hover:underline">Reporting</a>
              <a href="/inbox-mining/console" className="text-blue-700 hover:underline">Console</a>
            </div>
          </div>
          {error && <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

          <nav className="mt-3 flex flex-wrap border-b text-sm">
            {LISTS.map((l) => (
              <button key={l.key} onClick={() => { setList(l.key); setTab('open'); setOpenId(null); }}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 ${list === l.key ? 'border-blue-600 font-semibold text-brand-charcoal' : 'border-transparent text-gray-600 hover:text-brand-charcoal'}`}>
                {l.label}
                <span className={`rounded px-1.5 text-xs ${counts[l.key].open ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{counts[l.key].open}</span>
              </button>
            ))}
          </nav>

          <div className="imx mt-4"><div className="frame">
            <section className="list">
              <div className="tools">
                <div className="flex gap-1">
                  {(['open', 'processed'] as const).map((t) => (
                    <button key={t} onClick={() => { setTab(t); setOpenId(null); }} className={tab === t ? 'on' : ''}>
                      {t === 'open' ? `To do (${counts[list].open})` : `Processed (${counts[list].done})`}
                    </button>
                  ))}
                </div>
                <select value={group} onChange={(e) => setGroup(e.target.value)}>
                  {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
                <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}>
                  {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>Last {d} day{d > 1 ? 's' : ''}</option>)}
                </select>
                {list === 'thanks' && tab === 'open' && shown.length > 0 && (
                  <button onClick={clearAll} className="on">Clear all ({shown.length})</button>
                )}
              </div>
              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
                {!loading && shown.length === 0 && <div className="p-3 text-sm text-gray-500">{tab === 'open' ? 'Nothing to do here.' : 'Nothing processed yet.'}</div>}
                {groups.map((g) => (
                  <div key={g.key || 'all'}>
                        {g.key && <div className="tag">{g.key} ({g.items.length})</div>}
                    {g.items.map((i) => <Card key={i.id} i={i} open={openId === i.id} onOpen={() => setOpenId(i.id)} />)}
                  </div>
                ))}
              </div>
            </section>

            <section className="pane [overflow-wrap:anywhere] lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              {openId ? (
                <DecisionPanel key={openId} id={openId} processed={tab === 'processed'}
                  onDone={() => onDone(openId)} onSkip={() => onSkip(openId)} onReopen={() => reopen(openId)} onChanged={load} />
              ) : (
                <div className="p-5 text-sm text-gray-500">{loading ? 'Loading…' : 'Nothing selected.'}</div>
              )}
            </section>
          </div></div>
        </div>
      </main>
    </>
  );
}
