'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import TopNavBar from '@/components/portal/TopNavBar';
import { FactPos, Fact, DocRead, LinkRead, Match, Suggestion, precedentCache, loadPrecedent, Item, ItemProfile, SenderProfile, TemplateProfile, ProfileData, PRIORITY_STYLE, clsLabel, PAGE_SIZE, dist, FeedbackEntry, OUTCOMES, outcomeLabel, suggestionKey, Detail, RunSummary, GRADE_STYLE, sydney, show, TextItem, factLabel, HL_STYLE, HL_ACTIVE, needleFor, locateOnPages, findLoose, BodyMarks, PdfPages, FeedbackCell, DetailPanel } from '../shared';

export default function InboxMiningPage() {
  const [config, setConfig] = useState<{ mailboxes: string[]; maxDays: number; credentialsSet: boolean } | null>(null);
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<string[]>([]);
  const [rerun, setRerun] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterCls, setFilterCls] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterBox, setFilterBox] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'newest'>('priority');
  const [filterSender, setFilterSender] = useState('');
  const [page, setPage] = useState(0);
  const queueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = parseInt(new URLSearchParams(window.location.search).get('item') || '', 10);
    if (Number.isInteger(id)) setOpenId(id);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox-mining/profile', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProfile(data);
      setProfileError(null);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/inbox-mining/items?days=${days}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [days]);

  useEffect(() => {
    fetch('/api/inbox-mining/run', { cache: 'no-store' })
      .then((r) => r.json())
      .then((c) => {
        setConfig(c);
        setSelected(c.mailboxes);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Each POST processes about a minute of messages; keep calling with the same runId until nothing is left.
  const run = async () => {
    setRuns([]);
    for (const mailbox of selected) {
      const total: RunSummary = { mailbox, seen: 0, skipped: 0, written: 0, remaining: 0, errors: [] };
      let runId: number | undefined;
      const skip: string[] = [];
      setRunning(`Reading ${mailbox}…`);
      for (let chunk = 0; ; chunk++) {
        try {
          const res = await fetch('/api/inbox-mining/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mailbox, days, rerun, runId, skip }),
          });
          const data = await res.json().catch(() => ({ error: `HTTP ${res.status} (response was not JSON)` }));
          if (!res.ok) {
            total.errors.push(data.error || `HTTP ${res.status}`);
            break;
          }
          runId = data.runId;
          total.seen = data.seen;
          if (chunk === 0) total.skipped = data.skipped;
          total.written += data.written;
          total.remaining = data.remaining;
          total.errors.push(...data.errors);
          skip.push(...data.failedIds);
          setRunning(`Reading ${mailbox}: ${total.written} done, ${data.remaining} left…`);
          await loadItems();
          if (data.remaining === 0) break;
          if (data.written === 0 && data.failedIds.length === 0) {
            total.errors.push('Server made no progress on this chunk; stopped.');
            break;
          }
        } catch (e) {
          total.errors.push(
            `${e instanceof Error ? e.message : String(e)} — no response from the server. Check the npm run dev log: the last "[inbox-mining]" line shows the message it was on.`
          );
          break;
        }
      }
      setRuns((r) => [...r, total]);
    }
    setRunning(null);
    await loadProfile();
  };

  const shown = useMemo(() => {
    const list = items.filter(
      (i) =>
        (!filterCls || i.cls === filterCls || i.profile?.preClass === filterCls) &&
        (!filterGrade || i.match?.grade === filterGrade) &&
        (!filterBox || i.mailbox === filterBox) &&
        (!filterSender || i.profile?.sender === filterSender)
    );
    if (sortBy === 'newest') return list;
    return [...list].sort((a, b) => (a.profile?.priority ?? 9) - (b.profile?.priority ?? 9) || b.received_at.localeCompare(a.received_at));
  }, [items, filterCls, filterGrade, filterBox, filterSender, sortBy]);
  useEffect(() => {
    setPage(0);
  }, [filterCls, filterGrade, filterBox, filterSender, sortBy]);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount - 1);
  const pageRows = shown.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  useEffect(() => {
    if (queueRef.current) queueRef.current.scrollTop = 0;
  }, [curPage]);
  const pager = (
    <span className="flex items-center gap-1 text-xs">
      <button disabled={curPage === 0} onClick={() => setPage(curPage - 1)} className="rounded border bg-white px-2 py-0.5 hover:bg-gray-50 disabled:opacity-40">Prev</button>
      <span>
        {shown.length ? `${curPage * PAGE_SIZE + 1}–${curPage * PAGE_SIZE + pageRows.length}` : '0'} of {shown.length}
      </span>
      <button disabled={curPage >= pageCount - 1} onClick={() => setPage(curPage + 1)} className="rounded border bg-white px-2 py-0.5 hover:bg-gray-50 disabled:opacity-40">Next</button>
    </span>
  );
  const classes = useMemo(() => Array.from(new Set(items.map((i) => i.cls))).sort(), [items]);

  return (
    <>
    <TopNavBar />
    <main className="min-h-screen bg-white text-brand-charcoal">
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Inbox Mining — demo (phase a)</h1>
        <div className="flex gap-4 text-xs font-semibold">
          <a href="/inbox-mining" className="text-blue-700 hover:underline">Inbox</a>
          <a href="/inbox-mining/reporting" className="text-blue-700 hover:underline">Reporting</a>
        </div>
      </div>
      <div className="mt-2 rounded border border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-brand-charcoal">
        Read-only: no GHL writes, no email sent, no labels changed, no Drive copy. Suggestions only; Apply is disabled until phase (b).
      </div>
      {config && !config.credentialsSet && (
        <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          GMAIL_READER_CREDENTIALS is not set in .env.local — the mailbox-reader key is needed before any mailbox can be read.
        </div>
      )}
      {error && <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded border bg-white px-3 py-2 text-sm">
        {config?.mailboxes.map((mb) => (
          <label key={mb} className="flex items-center gap-1">
            <input type="checkbox" checked={selected.includes(mb)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, mb] : s.filter((x) => x !== mb)))} />
            {mb}
          </label>
        ))}
        <label className="flex items-center gap-1">
          Window
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="rounded border bg-white px-1 py-0.5">
            {Array.from({ length: config?.maxDays || 7 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'Today' : `Last ${n} days`}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={rerun} onChange={(e) => setRerun(e.target.checked)} />Re-read already-processed messages</label>
        <button onClick={run} disabled={!!running || !selected.length} className="rounded bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {running || 'Run'}
        </button>
      </div>

      {runs.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {runs.map((r) => (
            <div key={r.mailbox} className={r.errors.length ? 'text-red-800' : 'text-gray-700'}>
              {r.mailbox}: {r.seen} messages in window, {r.skipped} already read, {r.written} processed{r.remaining > 0 && `, ${r.remaining} not reached`}
              {r.errors.length > 0 && <ul className="ml-5 list-disc">{r.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}{r.errors.length > 10 && <li>…and {r.errors.length - 10} more</li>}</ul>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2 text-sm">
        {profileError && <div className="text-red-800">Profile: {profileError}</div>}
        {profile && (
          <>
            <details open className="overflow-hidden rounded border bg-white">
              <summary className="cursor-pointer bg-gray-50 px-3 py-2 font-semibold text-brand-charcoal">
                Unknown senders ({profile.totals.unknownSenders}) — external, no classified or matched item yet
              </summary>
              <div className="max-h-72 overflow-auto border-t">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                    <tr><th className="p-1">Sender</th><th className="p-1">Items</th><th className="p-1">Mailboxes</th><th className="p-1">Last subject</th><th className="p-1">Last</th></tr>
                  </thead>
                  <tbody>
                    {profile.unknownSenders.map((s) => (
                      <tr key={s.email} onClick={() => setFilterSender(s.email)} className="cursor-pointer border-t hover:bg-blue-50" title="Show this sender's items in the queue">
                        <td className="p-1">{s.name && s.name !== s.email ? `${s.name} ` : ''}<span className="text-gray-500">{s.email}</span></td>
                        <td className="p-1">{s.count}</td>
                        <td className="p-1">{s.mailboxes.map((m) => m.split('@')[0]).join(', ')}</td>
                        <td className="p-1">{s.lastSubject}</td>
                        <td className="whitespace-nowrap p-1">{sydney(s.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <details className="overflow-hidden rounded border bg-white">
              <summary className="cursor-pointer bg-gray-50 px-3 py-2 font-semibold text-brand-charcoal">
                Sender profile ({profile.totals.senders} senders, {profile.itemCount} items, built {sydney(profile.builtAt)})
              </summary>
              <div className="max-h-96 overflow-auto border-t">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                    <tr><th className="p-1">Sender</th><th className="p-1">Items</th><th className="p-1">Class distribution</th><th className="p-1">Top (of classified)</th><th className="p-1">Internal-only</th><th className="p-1">Matched</th></tr>
                  </thead>
                  <tbody>
                    {profile.senders.map((s) => (
                      <tr key={s.email} onClick={() => setFilterSender(s.email)} className="cursor-pointer border-t hover:bg-blue-50">
                        <td className="p-1">{s.email}{s.internal && <span className="ml-1 rounded bg-gray-200 px-1 text-gray-700">INT</span>}</td>
                        <td className="p-1">{s.count}</td>
                        <td className="p-1">{dist(s.classes)}</td>
                        <td className="p-1">{s.topClass ? `${s.topClass} ${Math.round(s.topShare * 100)}% of ${s.classified}` : '—'}</td>
                        <td className="p-1">{s.internalOnly || ''}</td>
                        <td className="p-1">{s.matched || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <details className="overflow-hidden rounded border bg-white">
              <summary className="cursor-pointer bg-gray-50 px-3 py-2 font-semibold text-brand-charcoal">Subject templates ({profile.totals.templates})</summary>
              <div className="max-h-96 overflow-auto border-t">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                    <tr><th className="p-1">Template</th><th className="p-1">Items</th><th className="p-1">Class distribution</th><th className="p-1">Top (of classified)</th></tr>
                  </thead>
                  <tbody>
                    {profile.templates.map((t) => (
                      <tr key={t.template} className="border-t">
                        <td className="p-1 font-mono">{t.template}</td>
                        <td className="p-1">{t.count}</td>
                        <td className="p-1">{dist(t.classes)}</td>
                        <td className="p-1">{t.topClass ? `${t.topClass} ${Math.round(t.topShare * 100)}% of ${t.classified}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <select value={filterBox} onChange={(e) => setFilterBox(e.target.value)} className="rounded border bg-white px-1 py-0.5">
          <option value="">All mailboxes</option>
          {config?.mailboxes.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={filterCls} onChange={(e) => setFilterCls(e.target.value)} className="rounded border bg-white px-1 py-0.5">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="rounded border bg-white px-1 py-0.5">
          <option value="">All grades</option>
          {['A', 'B', 'C', 'HOLD', 'UNMATCHED'].map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'priority' | 'newest')} className="rounded border bg-white px-1 py-0.5">
          <option value="priority">Sort: priority</option>
          <option value="newest">Sort: newest</option>
        </select>
        {filterSender && (
          <button onClick={() => setFilterSender('')} className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-blue-800">Sender: {filterSender} ✕</button>
        )}
        <span className="text-gray-500">{shown.length} of {items.length} items</span>
        {pageCount > 1 && pager}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 overflow-hidden rounded border bg-white">
          <div ref={queueRef} className="max-h-[75vh] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup><col className="w-16" /><col className="w-32" /><col /><col className="w-[32%]" /></colgroup>
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
              <tr><th className="p-2">P / grade</th><th className="p-2">Received</th><th className="p-2">From / subject</th><th className="p-2">Class / client</th></tr>
            </thead>
            <tbody>
              {pageRows.map((i) => (
                <tr key={i.id} onClick={() => setOpenId(i.id)} className={`cursor-pointer border-t align-top ${openId === i.id ? 'bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-blue-50'}`}>
                  <td className="space-y-1 p-2">
                    {i.profile && <div title={i.profile.priorityReason}><span className={`rounded px-1.5 py-0.5 font-semibold ${PRIORITY_STYLE[i.profile.priority]}`}>P{i.profile.priority}</span></div>}
                    {i.match?.grade && <div><span className={`rounded px-1.5 py-0.5 font-semibold ${GRADE_STYLE[i.match.grade] || ''}`}>{i.match.grade === 'UNMATCHED' ? 'UNM' : i.match.grade}</span></div>}
                  </td>
                  <td className="p-2">
                    <div className="whitespace-nowrap">{sydney(i.received_at)}</div>
                    <div className="text-gray-500">{i.mailbox.split('@')[0]}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {i.direction === 'outbound' && <span className="rounded bg-blue-50 px-1 text-blue-800">OUT</span>}
                      {i.profile?.internalOnly && <span className="rounded bg-gray-200 px-1 text-gray-700" title="Sender and all recipients are internal">INT</span>}
                      {i.profile?.unknownSender && <span className="rounded bg-blue-100 px-1 font-semibold text-blue-900" title="External sender with no classified or matched item">NEW</span>}
                    </div>
                    {i.profile && i.profile.threadLen > 1 && <div className="text-gray-500" title="Position in thread (processed messages)">msg {i.profile.threadPos}/{i.profile.threadLen}</div>}
                  </td>
                  <td className="p-2">
                    <div className="truncate text-gray-500" title={i.from_addr}>{i.from_addr}</div>
                    <div className="line-clamp-2 break-words" title={i.subject}>{i.subject}</div>
                  </td>
                  <td className="p-2 break-words">
                    <div title={i.cls_rule}>
                      {clsLabel(i.cls)}
                      {i.suggestions?.length > 0 && <span className="ml-1 rounded bg-blue-50 px-1 text-blue-800" title="Suggestions">{i.suggestions.length} sugg.</span>}
                      {i.docs?.some((d) => d.needsVisualRead) && <span className="ml-1 text-amber-700" title="Values not in text layer — read visually">👁</span>}
                    </div>
                    {i.profile?.preClass && <div className="italic text-blue-700" title={i.profile.preReason}>→ {clsLabel(i.profile.preClass)} (pre-class)</div>}
                    <div className="line-clamp-2" title={i.match?.fact1 ? `${i.match.fact1}${i.match.fact2 ? ` · ${i.match.fact2}` : ''}` : i.match?.reason}>
                      {i.match?.opportunityName || <span className="text-gray-400">{i.match?.reason}</span>}
                    </div>
                    {i.memory_confirmed_by && <div className="text-gray-500">memory: {i.memory_confirmed_by === 'auto' ? 'auto' : 'JT'}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {pageCount > 1 && <div className="flex justify-end border-t bg-gray-50 p-2">{pager}</div>}
        </div>
        <div className="min-w-0 rounded border bg-white p-4 [overflow-wrap:anywhere] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
          {openId ? <DetailPanel id={openId} onChanged={() => { loadItems(); }} /> : <div className="text-sm text-gray-500">Select an item to see live detail.</div>}
        </div>
      </div>
    </div>
    </main>
    </>
  );
}
