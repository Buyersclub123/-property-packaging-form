'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import TopNavBar from '@/components/portal/TopNavBar';
import { driveFilePath, driveFolder } from '@/lib/inboxMining/driveTarget';
import { matchInQuote } from '@/lib/inboxMining/factRules';
import { precedentFor, type PrecedentSummary } from '@/lib/inboxMining/precedentShared';

export interface FactPos { page?: number; x?: number; y?: number; w?: number; h?: number; notFound?: boolean }
export interface Fact { value: string; source: string; quote: string; match?: string; pos?: FactPos }
export interface DocRead {
  name: string; source: string; zipEntry?: string; url?: string; status: string; reason?: string;
  pages?: number; isDocuSign?: boolean; needsVisualRead?: boolean;
}
export interface LinkRead { url: string; status: string; reason?: string }
export interface Match {
  grade: string; source: string; opportunityId?: string; opportunityName?: string; pipelineName?: string; stageName?: string;
  propertyRecordId?: string; fact1?: string; fact2?: string; reason?: string;
  geoscape: { status: string; parcelId?: string; address?: string; reason?: string }; flags: string[]; trackerEvidence: string[];
}
export interface Suggestion { target: string; fieldKey: string; fieldLabel: string; fieldId?: string; proposed: string | string[]; source: string; notInGhl?: boolean; note?: string }

export let precedentCache: Promise<PrecedentSummary | null> | null = null;
export const loadPrecedent = () => {
  if (!precedentCache) {
    precedentCache = fetch('/api/inbox-mining/precedent', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.summary ?? null)
      .catch(() => null);
  }
  return precedentCache;
};
export interface Item {
  id: number; mailbox: string; message_id: string; thread_id: string; received_at: string; direction: string;
  from_addr: string; to_addr: string; subject: string; cls: string; cls_rule: string; facts: Record<string, Fact>;
  docs: DocRead[]; links: LinkRead[]; match: Match; suggestions: Suggestion[]; drive_target: string | null;
  memory_confirmed_by: string | null;
  feedback: Record<string, FeedbackEntry> | null;
  profile: ItemProfile | null;
}
export interface ItemProfile {
  sender: string; template: string; threadPos: number; threadLen: number; internalOnly: boolean; unknownSender: boolean;
  preClass?: string; preReason?: string; priority: number; priorityReason: string;
}
export interface SenderProfile {
  email: string; name: string; count: number; classes: Record<string, number>; classified: number; topClass: string | null;
  topShare: number; internal: boolean; internalOnly: number; matched: number; mailboxes: string[]; lastSubject: string; lastAt: string;
}
export interface TemplateProfile { template: string; count: number; classes: Record<string, number>; classified: number; topClass: string | null; topShare: number }
export interface ProfileData {
  builtAt: string; itemCount: number; senders: SenderProfile[]; templates: TemplateProfile[]; unknownSenders: SenderProfile[];
  totals: { senders: number; templates: number; unknownSenders: number };
}
export const PRIORITY_STYLE: Record<number, string> = { 1: 'bg-blue-600 text-white', 2: 'bg-blue-50 text-blue-800', 3: 'bg-gray-100 text-gray-500' };
export const clsLabel = (c: string) => c.replace(/_/g, ' ');
export const PAGE_SIZE = 100;
export const dist = (c: Record<string, number>) => Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
export interface FeedbackEntry { outcome: string; note: string; by: string; at: string }

export const OUTCOMES = [
  { key: 'accept', label: 'Accept' },
  { key: 'wrong_field', label: 'Wrong field' },
  { key: 'wrong_value', label: 'Wrong value' },
  { key: 'wrong_opportunity', label: 'Wrong opportunity' },
  { key: 'not_needed', label: 'Not needed' },
];
export const outcomeLabel = (k: string) => OUTCOMES.find((o) => o.key === k)?.label || k;
export const suggestionKey = (s: Suggestion) => `${s.target}:${s.fieldKey}`;
export interface Detail {
  item: Item; body: string | null; memory: { opportunity_id: string; property_record_id: string | null; confirmed_by: string } | null;
  live: { opportunityId: string; name: string; pipelineName: string; stageName: string; status: string; registeredAddress: string } | null;
  current: { value: string | null; note?: string }[]; errors: string[]; fetchedAt: string;
}
export interface RunSummary { mailbox: string; seen: number; skipped: number; written: number; remaining: number; errors: string[] }

export const GRADE_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-800', B: 'bg-amber-100 text-amber-800', C: 'bg-amber-100 text-amber-800',
  HOLD: 'bg-red-100 text-red-800', UNMATCHED: 'bg-gray-100 text-gray-600',
};

export const sydney = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const show = (v: string | string[]) => (Array.isArray(v) ? v.join(', ') : v);

// Evidence highlighting (backlog 15): text items per page with boxes as fractions of the page.
export type TextItem = { str: string; r: [number, number, number, number] };
export const factLabel = (k: string) => k.replace(/([A-Z])/g, ' $1').toLowerCase();
// Brand yellow #FFD60A at ~45% with an amber border; the selected fact in orange.
export const HL_STYLE = { backgroundColor: 'rgba(255, 214, 10, 0.45)', border: '2px solid #F59E0B' };
export const HL_ACTIVE = { backgroundColor: 'rgba(249, 115, 22, 0.45)', border: '2px solid #EA580C' };
export const needleFor = (k: string, f: Fact) => f.match || matchInQuote(k, f.value, f.quote) || f.value;

/** Finds the needle in the page text, ignoring whitespace (PDF text is split into runs), and boxes it. */
export function locateOnPages(needle: string, pages: TextItem[][]): FactPos | null {
  const n = needle.replace(/\s+/g, '').toLowerCase();
  if (n.length < 2) return null;
  for (let p = 0; p < pages.length; p++) {
    const chars: { item: number; ci: number }[] = [];
    let hay = '';
    pages[p].forEach((it, item) => {
      for (let ci = 0; ci < it.str.length; ci++) {
        if (/\s/.test(it.str[ci])) continue;
        hay += it.str[ci].toLowerCase();
        chars.push({ item, ci });
      }
    });
    const i = hay.indexOf(n);
    if (i === -1) continue;
    const span = new Map<number, [number, number]>();
    for (const { item, ci } of chars.slice(i, i + n.length)) {
      const s = span.get(item);
      span.set(item, s ? [Math.min(s[0], ci), Math.max(s[1], ci)] : [ci, ci]);
    }
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    span.forEach(([a, b], item) => {
      const { str, r } = pages[p][item];
      const len = Math.max(1, str.length);
      x0 = Math.min(x0, r[0] + ((r[2] - r[0]) * a) / len);
      x1 = Math.max(x1, r[0] + ((r[2] - r[0]) * (b + 1)) / len);
      y0 = Math.min(y0, r[1]);
      y1 = Math.max(y1, r[3]);
    });
    const pad = 0.004;
    return { page: p + 1, x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  }
  return null;
}

export function findLoose(hay: string, needle: string): { start: number; end: number } | null {
  const parts = needle.trim().split(/\s+/).filter(Boolean).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!parts.length) return null;
  const m = new RegExp(parts.join('\\s+'), 'i').exec(hay);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

export function BodyMarks({ body, hits, active, idPrefix }: {
  body: string; hits: Record<string, { start: number; end: number } | null>; active: string | null; idPrefix: string;
}) {
  const spans = Object.entries(hits)
    .filter((e): e is [string, { start: number; end: number }] => !!e[1])
    .sort((a, b) => a[1].start - b[1].start);
  const out: ReactNode[] = [];
  let at = 0;
  for (const [k, h] of spans) {
    if (h.start < at) continue;
    out.push(body.slice(at, h.start));
    out.push(
      <mark key={k} id={idPrefix + k} title={factLabel(k)} className="rounded-sm text-inherit"
        style={k === active ? HL_ACTIVE : HL_STYLE}>
        {body.slice(h.start, h.end)}
      </mark>
    );
    at = h.end;
  }
  out.push(body.slice(at));
  return <>{out}</>;
}

export function PdfPages({ itemId, doc, facts, active, autoRender, onLocated }: {
  itemId: number; doc: DocRead; facts: [string, Fact][]; active: string | null; autoRender: boolean;
  onLocated: (key: string, pos: FactPos) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const wraps = useRef<HTMLDivElement[]>([]);
  const tried = useRef(false);
  const scrolled = useRef<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [textPages, setTextPages] = useState<TextItem[][] | null>(null);

  const render = useCallback(async () => {
    tried.current = true;
    setState('loading');
    setError(null);
    try {
      const qs = new URLSearchParams({ item: String(itemId), name: doc.name, zipEntry: doc.zipEntry || '' });
      const res = await fetch(`/api/inbox-mining/attachment?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      const { getDocumentProxy } = await import('unpdf');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf: any = await getDocumentProxy(buf);
      const max = Math.min(pdf.numPages, 25);
      if (pdf.numPages > max) setNote(`Showing first ${max} of ${pdf.numPages} pages`);
      const el = holder.current!;
      el.innerHTML = '';
      wraps.current = [];
      const pages: TextItem[][] = [];
      for (let i = 1; i <= max; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.4 });
        const wrap = document.createElement('div');
        wrap.className = 'relative mb-3 inline-block max-w-full align-top';
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'block max-w-full border shadow-sm';
        wrap.appendChild(canvas);
        el.appendChild(wrap);
        wraps.current.push(wrap);
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
        const tc = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pages.push(tc.items.filter((it: any) => typeof it.str === 'string' && it.transform).map((it: any) => {
          const t = it.transform;
          const h = it.height || Math.hypot(t[2], t[3]);
          const [ax, ay, bx, by] = viewport.convertToViewportRectangle([t[4], t[5], t[4] + it.width, t[5] + h]);
          return {
            str: it.str,
            r: [Math.min(ax, bx) / viewport.width, Math.min(ay, by) / viewport.height,
              Math.max(ax, bx) / viewport.width, Math.max(ay, by) / viewport.height],
          } as TextItem;
        }));
      }
      setTextPages(pages);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  }, [itemId, doc]);

  useEffect(() => {
    if ((doc.needsVisualRead || autoRender) && !tried.current) render();
  }, [doc, autoRender, render]);

  useEffect(() => {
    if (!textPages) return;
    for (const [k, f] of facts) {
      if (f.pos?.page) continue;
      const pos = locateOnPages(needleFor(k, f), textPages);
      if (pos || !f.pos?.notFound) onLocated(k, pos || { notFound: true });
    }
  }, [textPages, facts, onLocated]);

  useEffect(() => {
    if (state !== 'done') return;
    wraps.current.forEach((w) => w.querySelectorAll('.ev-hl').forEach((n) => n.remove()));
    let activeEl: HTMLElement | null = null;
    for (const [k, f] of facts) {
      const p = f.pos;
      const wrap = p?.page ? wraps.current[p.page - 1] : undefined;
      if (!p || !wrap) continue;
      const box = document.createElement('div');
      box.className = 'ev-hl pointer-events-none absolute rounded-sm';
      Object.assign(box.style, k === active ? HL_ACTIVE : HL_STYLE, { left: `${(p.x || 0) * 100}%`, top: `${(p.y || 0) * 100}%`, width: `${(p.w || 0) * 100}%`, height: `${(p.h || 0) * 100}%` });
      box.title = `${factLabel(k)}: ${f.value}`;
      wrap.appendChild(box);
      if (k === active) activeEl = box;
    }
    if (active !== scrolled.current) {
      if (activeEl) {
        (activeEl as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
        scrolled.current = active;
      } else if (!facts.some(([k]) => k === active)) {
        scrolled.current = active;
      }
    }
  }, [state, facts, active]);

  return (
    <div className="mt-2">
      {doc.needsVisualRead && (
        <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Values not in text layer — read visually (DocuSign overlay). Pages rendered below; image extraction is deferred.
        </div>
      )}
      {state === 'idle' && (
        <button onClick={render} className="rounded border px-2 py-1 text-xs bg-white hover:bg-gray-50">Render pages</button>
      )}
      {state === 'loading' && <div className="text-xs text-gray-500">Rendering…</div>}
      {error && <div className="text-xs text-red-700">Render failed: {error}</div>}
      {note && <div className="text-xs text-gray-500">{note}</div>}
      <div ref={holder} className="max-h-[900px] overflow-auto" />
    </div>
  );
}

export function FeedbackCell({ itemId, s, entry, onSaved }: { itemId: number; s: Suggestion; entry?: FeedbackEntry; onSaved: () => void }) {
  const [outcome, setOutcome] = useState(entry?.outcome || '');
  const [note, setNote] = useState(entry?.note || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async (o: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, key: suggestionKey(s), outcome: o, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOutcome(o);
      onSaved();
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            disabled={busy}
            onClick={() => save(o.key)}
            className={`rounded border px-1.5 py-0.5 disabled:opacity-50 ${
              outcome === o.key ? (o.key === 'accept' ? 'border-green-600 bg-green-100 text-green-800' : 'border-red-500 bg-red-50 text-red-800') : 'bg-white hover:bg-gray-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded border bg-white px-1 py-0.5" />
        {outcome && note !== (entry?.note || '') && (
          <button disabled={busy} onClick={() => save(outcome)} className="whitespace-nowrap rounded border px-1.5 py-0.5">Save note</button>
        )}
      </div>
      {entry && (
        <div className="text-gray-500">
          Saved: {outcomeLabel(entry.outcome)} · {entry.by} · {sydney(entry.at)}{entry.note ? ` · "${entry.note}"` : ''}
        </div>
      )}
      {msg && <div className="text-red-700">{msg}</div>}
    </div>
  );
}

export function DetailPanel({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oppId, setOppId] = useState('');
  const [recId, setRecId] = useState('');
  const [busy, setBusy] = useState(false);
  const [memMsg, setMemMsg] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [located, setLocated] = useState<Record<string, FactPos>>({});
  const [precedent, setPrecedent] = useState<PrecedentSummary | null>(null);

  useEffect(() => {
    loadPrecedent().then(setPrecedent);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/inbox-mining/items/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setD(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  useEffect(() => {
    setD(null);
    setMemMsg(null);
    setActive(null);
    setLocated({});
    setOppId('');
    setRecId('');
    load();
  }, [load]);

  const onLocated = useCallback((key: string, pos: FactPos) => {
    setLocated((prev) => ({ ...prev, [key]: pos }));
    fetch('/api/inbox-mining/fact-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, key, pos }),
    }).catch(() => {});
  }, [id]);

  const facts = useMemo<[string, Fact][]>(
    () => Object.entries(d?.item.facts || {}).map(([k, f]) => [k, located[k] ? { ...f, pos: located[k] } : f]),
    [d, located]
  );
  const bodyHits = useMemo(() => {
    const out: Record<string, { start: number; end: number } | null> = {};
    for (const [k, f] of facts) if (f.source === 'email') out[k] = d?.body ? findLoose(d.body, needleFor(k, f)) : null;
    return out;
  }, [facts, d]);

  useEffect(() => {
    if (active && d?.item.facts[active]?.source === 'email') {
      document.getElementById(`ev-${id}-${active}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [active, id, d]);

  const activeIdx = active ? facts.findIndex(([k]) => k === active) : -1;
  const step = (dir: number) => {
    if (!facts.length) return;
    const n = activeIdx === -1 ? (dir > 0 ? 0 : facts.length - 1) : (activeIdx + dir + facts.length) % facts.length;
    setActive(facts[n][0]);
  };
  const where = (k: string, f: Fact) => {
    if (f.source === 'email') return bodyHits[k] ? 'email body' : d?.body ? 'subject line, or not found in the body' : 'body not loaded';
    if (f.pos?.page) return `${f.source}, page ${f.pos.page}`;
    const doc = d?.item.docs.find((x) => (x.zipEntry || x.name) === f.source);
    if (f.pos?.notFound) return doc?.needsVisualRead ? `${f.source}: position not available (DocuSign overlay; visual read deferred)` : `${f.source}: not found in the text layer`;
    return `${f.source}: locating…`;
  };

  const saveMemory = async (opportunityId: string, propertyRecordId: string | null) => {
    setBusy(true);
    setMemMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/thread-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, opportunityId, propertyRecordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMemMsg(`Saved: thread → ${opportunityId} (${data.memory?.confirmed_by})`);
      await load();
      onChanged();
    } catch (e) {
      setMemMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!d) return <div className="text-sm text-gray-500">Loading live detail…</div>;
  const { item, live, current } = d;
  const m = item.match;
  const targetOpp = ['A', 'B', 'C'].includes(m.grade) ? live?.name || m.opportunityName || null : null;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-base font-semibold">{item.subject || '(no subject)'}</div>
        <div className="text-gray-600">
          {item.mailbox} · {item.direction === 'outbound' ? 'OUTBOUND' : 'inbound'} · {sydney(item.received_at)} · from {item.from_addr}
        </div>
        <div className="text-xs text-gray-500">Live data fetched {sydney(d.fetchedAt)}</div>
      </div>
      {d.errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-red-800">{d.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
      )}

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Class</h3>
        <div><span className="font-mono">{item.cls}</span> — <span className="text-gray-600">{item.cls_rule}</span></div>
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Match</h3>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${GRADE_STYLE[m.grade]}`}>{m.grade}</span>
          <span>{m.opportunityName || m.reason}</span>
          <span className="text-xs text-gray-500">via {m.source === 'thread_memory' ? 'thread memory' : m.source}</span>
        </div>
        {m.fact1 && <div>1. {m.fact1}</div>}
        {m.fact2 && <div>2. {m.fact2}</div>}
        <div className="text-gray-600">
          Geoscape: {m.geoscape.status}
          {m.geoscape.parcelId && ` (${m.geoscape.parcelId})`}
          {m.geoscape.address && ` — ${m.geoscape.address}`}
          {m.geoscape.reason && ` — ${m.geoscape.reason}`}
        </div>
        {live && (
          <div className="text-gray-600">
            Live GHL: {live.pipelineName} / {live.stageName} ({live.status}) · {live.registeredAddress || 'no Registered Address'}
          </div>
        )}
        {m.propertyRecordId && <div className="text-gray-600">Property Record: {m.propertyRecordId}</div>}
        {m.flags.map((f, i) => <div key={i} className="text-amber-800">⚑ {f}</div>)}
        {m.trackerEvidence.length > 0 && (
          <div className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-700">
            {m.trackerEvidence.map((t, i) => <div key={i}>{t}</div>)}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Thread memory</h3>
        <div className="text-gray-600">
          {d.memory ? `→ ${d.memory.opportunity_id} (${d.memory.confirmed_by === 'auto' ? 'auto' : d.memory.confirmed_by})` : 'None for this thread'}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button
            disabled={busy || !m.opportunityId}
            onClick={() => m.opportunityId && saveMemory(m.opportunityId, m.propertyRecordId || null)}
            className="rounded border border-blue-300 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
          >
            Confirm
          </button>
          <input value={oppId} onChange={(e) => setOppId(e.target.value)} placeholder="Correct: opportunity ID" className="rounded border bg-white px-2 py-1" />
          <input value={recId} onChange={(e) => setRecId(e.target.value)} placeholder="Property Record ID (optional)" className="rounded border bg-white px-2 py-1" />
          <button disabled={busy || !oppId.trim()} onClick={() => saveMemory(oppId, recId || null)} className="rounded border px-3 py-1 disabled:opacity-40">
            Correct
          </button>
        </div>
        {memMsg && <div className={memMsg.startsWith('Error') ? 'text-red-700' : 'text-green-700'}>{memMsg}</div>}
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Suggested updates</h3>
        {item.suggestions.length === 0 ? (
          <div className="text-gray-500">{['HOLD', 'UNMATCHED'].includes(m.grade) ? `None (${m.grade})` : 'None for this class'}</div>
        ) : (
          <div className="space-y-2 text-xs">
            {item.suggestions.map((s, i) => (
              <div key={i} className="rounded border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{s.fieldLabel}</span>{' '}
                    <span className="text-gray-400">{s.target === 'opportunity' ? 'Opportunity' : s.target === 'action' ? 'Expected action (no field write)' : 'Property Record'}</span>
                  </div>
                  <button disabled title="Phase (b)" className="shrink-0 rounded border px-2 py-0.5 opacity-40">Apply</button>
                </div>
                <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {s.target === 'action' ? (
                    <>
                      <span className="text-gray-500">Action</span>
                      <span className="font-medium">{s.fieldLabel}{s.note && <div className="font-normal text-gray-500">{s.note}</div>}</span>
                    </>
                  ) : (
                  <>
                  <span className="text-gray-500">Current (live)</span>
                  <span>{current[i]?.note ? <span className="italic text-gray-500">{current[i].note}</span> : current[i]?.value || <span className="text-gray-400">(blank)</span>}</span>
                  <span className="text-gray-500">Proposed</span>
                  <span className="font-medium">{show(s.proposed)}{s.note && <div className="font-normal text-gray-500">{s.note}</div>}</span>
                  </>
                  )}
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-600">{s.source}</span>
                  {(() => {
                    const p = precedentFor(precedent, item.cls, s);
                    if (!p) return null;
                    return (
                      <>
                        <span className="text-gray-500">Precedent</span>
                        <span className={p.ok === false ? 'text-amber-800' : 'text-gray-600'}>
                          {p.ok === false && !p.line.startsWith('No precedent') && <span className="mr-1 rounded bg-amber-100 px-1 font-semibold">no precedent</span>}
                          {p.line}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-2 border-t pt-2">
                  <FeedbackCell
                    key={`${item.id}-${suggestionKey(s)}`}
                    itemId={item.id}
                    s={s}
                    entry={item.feedback?.[suggestionKey(s)]}
                    onSaved={() => { load(); onChanged(); }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Extracted facts</h3>
        {facts.length === 0 ? <div className="text-gray-500">None</div> : (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50/40 px-2 py-1 text-xs">
              <button onClick={() => step(-1)} className="rounded border bg-white px-2 py-0.5 hover:bg-blue-50">‹ Prev</button>
              <button onClick={() => step(1)} className="rounded border bg-white px-2 py-0.5 hover:bg-blue-50">Next ›</button>
              {activeIdx === -1 ? (
                <span className="text-gray-500">Step through {facts.length} facts; each is highlighted in yellow where it was found.</span>
              ) : (
                <span>
                  <span className="font-semibold">{activeIdx + 1}/{facts.length} {factLabel(facts[activeIdx][0])}</span>{' = '}
                  <span className="font-mono">{facts[activeIdx][1].value}</span>{' '}
                  <span className="text-gray-500">({where(facts[activeIdx][0], facts[activeIdx][1])})</span>
                </span>
              )}
            </div>
            <table className="w-full text-xs">
              <tbody>
                {facts.map(([k, f]) => (
                  <tr key={k} onClick={() => setActive(k)}
                    className={`cursor-pointer border-t align-top ${active === k ? 'bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-blue-50'}`}>
                    <td className="p-1 font-mono">{k}</td><td className="p-1 font-medium">{f.value}</td><td className="p-1 text-gray-500">{f.source}: “{f.quote}”</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Documents</h3>
        {item.docs.some((doc) => doc.status === 'read') && (
          <div className="rounded border border-blue-200 bg-blue-50/40 px-2 py-1 text-xs">
            <span className="font-semibold">Drive target (display only, not copied):</span>{' '}
            {targetOpp ? (
              <span className="break-all font-mono">{driveFolder(targetOpp)}\</span>
            ) : (
              <span className="text-gray-500">none until the match is graded A, B or C (now {item.match.grade})</span>
            )}
          </div>
        )}
        {item.docs.length === 0 && <div className="text-gray-500">No PDF / zip attachments or document links</div>}
        {item.docs.map((doc, i) => {
          const target = doc.status === 'read' && targetOpp ? driveFilePath(targetOpp, item.cls, item.received_at, doc.zipEntry || doc.name) : null;
          return (
          <div key={i} className="mt-2 rounded border p-2">
            <div>
              <span className="font-medium">{doc.zipEntry ? `${doc.name} › ${doc.zipEntry}` : doc.name}</span>{' '}
              <span className="text-xs text-gray-500">[{doc.source}] {doc.status}{doc.pages ? ` · ${doc.pages} pages` : ''}{doc.isDocuSign ? ' · DocuSign' : ''}</span>
              {doc.reason && <div className="text-xs text-red-700">{doc.reason}</div>}
              {target && <div className="break-all text-xs text-gray-500">→ <span className="font-mono">{target}</span></div>}
            </div>
            {doc.status === 'read' && (() => {
              const docFacts = facts.filter(([, f]) => f.source === (doc.zipEntry || doc.name));
              return (
                <PdfPages itemId={item.id} doc={doc} facts={docFacts} active={active} onLocated={onLocated}
                  autoRender={!!active && docFacts.some(([k]) => k === active)} />
              );
            })()}
          </div>
          );
        })}
        {item.links.length > 0 && (
          <div className="mt-2">
            <div className="font-medium">Body links</div>
            {item.links.map((l, i) => (
              <div key={i} className="break-all text-xs">
                <span className={l.status === 'read' ? 'text-green-700' : 'text-red-700'}>{l.status === 'read' ? 'read' : 'link not read'}</span>{' '}
                <a href={l.url} target="_blank" rel="noreferrer" className="text-brand-charcoal underline">{l.url}</a>
                {l.reason && <span className="text-gray-500"> — {l.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 border-b pb-1 text-sm font-semibold text-brand-charcoal">Email body (live)</h3>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-2 text-xs">{d.body == null ? '(not loaded)' : <BodyMarks body={d.body} hits={bodyHits} active={active} idPrefix={`ev-${item.id}-`} />}</pre>
      </section>
    </div>
  );
}
