'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { driveFilePath, driveFolder } from '@/lib/inboxMining/driveTarget';
import { precedentFor, type PrecedentSummary } from '@/lib/inboxMining/precedentShared';
import {
  BodyMarks, GRADE_STYLE, PdfPages, clsLabel, factLabel, findLoose, loadPrecedent, needleFor, outcomeLabel, show, suggestionKey,
  type Detail, type Fact, type FactPos, type Suggestion,
} from './shared';

// Item pane, JT wireframe v2 ("Inbox Mining Item Layout"): From · Regarding · Suggestion · Accept/Reject/Skip · Why,
// then Full email / Attachments / Details collapsed. Decisions write only inbox_items.feedback / workflow, thread
// confirmation only inbox_thread_memory, mute only inbox_muted_opps. Nothing is written to GHL and no email is sent.

const REJECT_REASONS = [
  { key: 'wrong_field', label: 'Wrong field' },
  { key: 'wrong_value', label: 'Wrong value' },
  { key: 'wrong_opportunity', label: 'Wrong opportunity' },
  { key: 'not_needed', label: 'Not needed' },
];

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "27 Oct 2026" for a YYYY-MM-DD value; other values unchanged. */
export const niceValue = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${parseInt(m[3], 10)} ${MON[parseInt(m[2], 10) - 1]} ${m[1]}` : v;
};
/** "27 Oct 2026, 9:46 pm" in Sydney time. */
export const niceDate = (iso: string, time = true) => {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
      .formatToParts(d).map((x) => [x.type, x.value])
  );
  return `${p.day} ${p.month} ${p.year}${time ? `, ${p.hour}:${p.minute} ${String(p.dayPeriod || '').toLowerCase()}` : ''}`;
};

export const normField = (k: string) =>
  k.toLowerCase().replace(/^(opportunity|property_record|custom_objects\.[a-z_]+)\./, '').replace(/[^a-z0-9]/g, '');
const suggestionMatches = (s: Suggestion, field: string) =>
  [s.fieldKey, s.fieldId || '', s.fieldLabel].some((k) => k && normField(k) === normField(field));
const senderName = (from: string) => (from.match(/^\s*"?([^"<]+?)"?\s*</)?.[1] || from).trim();

function factFor(s: Suggestion, facts: [string, Fact][]): [string, Fact] | null {
  return facts.find(([, f]) => s.source === `${f.source}: "${f.quote}"`) || null;
}

/** Evidence suggestions first; suggestions with no evidence in the text in their own group after them. */
const rank = (s: Suggestion) => (s.noEvidence ? 2 : s.target === 'action' ? 1 : 0);
export const orderSuggestions = (list: Suggestion[]) => [...list].sort((a, b) => rank(a) - rank(b));

function Excerpt({ body, hit, idKey }: { body: string; hit: { start: number; end: number }; idKey: string }) {
  const from = Math.max(0, body.lastIndexOf('\n', Math.max(0, hit.start - 240)) + 1);
  const nl = body.indexOf('\n', Math.min(body.length, hit.end + 240));
  const to = nl === -1 ? body.length : nl;
  return (
    <pre className="excerpt">
      {from > 0 && '… '}
      <BodyMarks body={body.slice(from, to)} hits={{ [idKey]: { start: hit.start - from, end: hit.end - from } }} active={idKey} idPrefix="ex-" />
      {to < body.length && ' …'}
    </pre>
  );
}

function Why({ s, d, facts, onLocated, itemId }: { s: Suggestion; d: Detail; facts: [string, Fact][]; onLocated: (k: string, p: FactPos) => void; itemId: number }) {
  const fact = factFor(s, facts);
  if (s.noEvidence || !fact) {
    return (
      <div className="noev">
        <span className="ic">!</span>
        {s.noEvidence ? 'No evidence in the text — based on the email date only' : `No evidence in the text — ${s.source.replace(/\d{4}-\d{2}-\d{2}/g, niceValue)}`}
      </div>
    );
  }
  const body = d.body || '';
  const hit = fact[1].source === 'email' && body ? findLoose(body, needleFor(fact[0], fact[1])) : null;
  if (hit) return <Excerpt body={body} hit={hit} idKey={fact[0]} />;
  const doc = fact[1].source !== 'email' ? d.item.docs.find((x) => (x.zipEntry || x.name) === fact[1].source) : undefined;
  if (doc && doc.status === 'read') {
    return (
      <div className="excerpt-doc">
        <PdfPages itemId={itemId} doc={doc} facts={[fact]} active={fact[0]} autoRender onLocated={onLocated} />
      </div>
    );
  }
  return <div className="excerpt">{fact[1].source}: “{fact[1].quote}”</div>;
}

export function DecisionPanel({ id, onDone, onSkip, onChanged, focusField, evidenceOnly = false, processed = false, onReopen }: {
  id: number; onDone?: () => void; onSkip?: () => void; onChanged?: () => void; focusField?: string; evidenceOnly?: boolean;
  processed?: boolean; onReopen?: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [located, setLocated] = useState<Record<string, FactPos>>({});
  const [precedent, setPrecedent] = useState<PrecedentSummary | null>(null);
  const [step, setStep] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [oppId, setOppId] = useState('');
  const [recId, setRecId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState<string[]>([]);

  useEffect(() => {
    loadPrecedent().then(setPrecedent);
    fetch('/api/inbox-mining/mute', { cache: 'no-store' }).then((r) => r.json()).then((x) => setMuted(x.muted || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/inbox-mining/items/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setD(data);
      return data as Detail;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [id]);

  useEffect(() => {
    setD(null);
    setLocated({});
    setStep(0);
    setRejecting(false);
    setChanging(false);
    setMsg(null);
    load();
  }, [load]);

  const onLocated = useCallback((key: string, pos: FactPos) => {
    setLocated((prev) => ({ ...prev, [key]: pos }));
    fetch('/api/inbox-mining/fact-position', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: id, key, pos }),
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

  const ordered = useMemo(() => {
    const all = orderSuggestions(d?.item.suggestions || []);
    if (!focusField) return all;
    const hit = all.filter((s) => suggestionMatches(s, focusField));
    return evidenceOnly && hit.length ? hit : [...hit, ...all.filter((s) => !hit.includes(s))];
  }, [d, focusField, evidenceOnly]);

  const m = d?.item.match;
  const isMuted = !!m?.opportunityId && muted.includes(m.opportunityId);
  const current = ordered[Math.min(step, Math.max(0, ordered.length - 1))];

  const markDone = useCallback(async () => {
    const res = await fetch('/api/inbox-mining/workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], status: 'done' }),
    });
    if (!res.ok) setError((await res.json()).error || `HTTP ${res.status}`);
    else onDone?.();
  }, [id, onDone]);

  const decide = useCallback(async (outcome: string) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/inbox-mining/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, key: suggestionKey(current), outcome, note: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRejecting(false);
      const fresh = await load();
      if (!fresh) return;
      const rest = ordered.findIndex((s, i) => i > step && !fresh.item.feedback?.[suggestionKey(s)]);
      const anyLeft = ordered.findIndex((s) => !fresh.item.feedback?.[suggestionKey(s)]);
      if (rest !== -1) setStep(rest);
      else if (anyLeft !== -1) setStep(anyLeft);
      else await markDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [current, busy, id, load, ordered, step, markDone]);

  const skip = useCallback(() => {
    setRejecting(false);
    onSkip?.();
  }, [onSkip]);

  // Keyboard: A accept, R reject (then 1-4 for the reason), S skip, Esc closes the reasons.
  useEffect(() => {
    if (evidenceOnly || processed) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (rejecting && /^[1-4]$/.test(k)) decide(REJECT_REASONS[parseInt(k, 10) - 1].key);
      else if (k === 'escape') setRejecting(false);
      else if (k === 'a' && current && !isMuted) decide('accept');
      else if (k === 'r' && current && !isMuted) setRejecting((r) => !r);
      else if (k === 's') skip();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evidenceOnly, processed, rejecting, current, isMuted, decide, skip]);

  const saveMemory = async (opportunityId: string, propertyRecordId: string | null) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/thread-memory', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: id, opportunityId, propertyRecordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setChanging(false);
      if (opportunityId !== d?.item.match.opportunityId) setMsg('Saved for the thread. This email keeps its suggestions until it is re-read.');
      await load();
      onChanged?.();
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleMute = async () => {
    if (!m?.opportunityId) return;
    const res = await fetch('/api/inbox-mining/mute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: m.opportunityId, muted: !isMuted }),
    });
    if (res.ok) setMuted((prev) => (isMuted ? prev.filter((x) => x !== m.opportunityId) : [...prev, m.opportunityId!]));
  };

  if (error) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!d || !m) return <div className="text-sm text-gray-500">Loading…</div>;

  const { item, live, memory } = d;
  const oppName = live?.name || m.opportunityName || null;
  const matched = ['A', 'B', 'C'].includes(m.grade);
  const confirmed = !!memory && memory.confirmed_by !== 'auto' && memory.opportunity_id === m.opportunityId;
  const idx = current ? (item.suggestions || []).indexOf(current) : -1;
  const now = idx >= 0 ? d.current[idx] : undefined;
  const decided = current ? item.feedback?.[suggestionKey(current)] : undefined;
  const btn = 'flex w-36 items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold disabled:opacity-40';
  const kbd = 'rounded border border-current/30 px-1 text-[11px] font-normal opacity-80';
  const detailRows: [string, ReactNode][] = [
    ['Class', <>{clsLabel(item.cls)} <span className="text-gray-500">— {item.cls_rule}</span></>],
    ['Match', <><span className={`rounded px-1.5 font-semibold ${GRADE_STYLE[m.grade] || ''}`}>{m.grade}</span> <span className="text-gray-500">via {m.source === 'thread_memory' ? 'thread memory' : m.source}</span>{m.reason && <div className="text-gray-600">{m.reason}</div>}</>],
    ['Rules', <>{m.fact1 && <div>1. {m.fact1}</div>}{m.fact2 && <div>2. {m.fact2}</div>}{m.flags.map((f, i) => <div key={i} className="text-amber-800">⚑ {f}</div>)}</>],
    ['Precedent', <>{(item.suggestions || []).map((s, i) => { const p = precedentFor(precedent, item.cls, s); return p ? <div key={i}><span className="text-gray-500">{s.fieldLabel}:</span> {p.line}</div> : null; })}</>],
    ['Geoscape', <>{m.geoscape.status}{m.geoscape.parcelId && ` (${m.geoscape.parcelId})`}{m.geoscape.address && ` — ${m.geoscape.address}`}{m.geoscape.reason && ` — ${m.geoscape.reason}`}</>],
    ['Drive target', matched && oppName ? <><div className="break-all font-mono">{driveFolder(oppName)}\</div>{item.docs.filter((x) => x.status === 'read').map((x, i) => <div key={i} className="break-all font-mono text-gray-500">→ {driveFilePath(oppName, item.cls, item.received_at, x.zipEntry || x.name)}</div>)}<div className="text-gray-500">Display only, not copied</div></> : 'None until the match is graded A, B or C'],
    ['Thread memory', memory ? `→ ${memory.opportunity_id} (${memory.confirmed_by === 'auto' ? 'auto' : memory.confirmed_by})` : 'None for this thread'],
    ['Live GHL', live ? `${live.pipelineName} — ${live.stageName} (${live.status})` : '—'],
    ...m.trackerEvidence.map((t, i): [string, ReactNode] => [i === 0 ? 'Trackers' : '', t]),
    ['Extracted facts', facts.length ? <>{facts.map(([k, f]) => <div key={k}><span className="font-mono">{factLabel(k)}</span> = <span className="font-medium">{f.value}</span> <span className="text-gray-500">({f.source})</span></div>)}</> : 'None'],
    ['Fetched', niceDate(d.fetchedAt)],
  ];

  return (
    <div className="imx">
      {d.errors.length > 0 && <div className="border-b bg-red-50 px-5 py-2 text-sm text-red-800">{d.errors.map((e, i) => <div key={i}>{e}</div>)}</div>}

      <div className="band">
        <div>
          <div className="lbl">From</div>
          <div><span className="from-name" title={item.from_addr}>{senderName(item.from_addr || '')}</span><span className="date">{niceDate(item.received_at)}</span></div>
          <div className="subj">{item.subject || '(no subject)'}</div>
        </div>
        <div className="reg">
          <div className="lbl">Regarding</div>
          {m.opportunityId ? (
            <>
              <div className="reg-row"><span className="opp">{oppName}</span><span className="chip c-opp">Opp</span></div>
              {(live?.registeredAddress || m.propertyRecordId) && (
                <div className="reg-row"><span className="addr">{live?.registeredAddress || m.propertyRecordId}</span><span className="chip c-prop">PR</span></div>
              )}
              {!evidenceOnly && (
                <div className="reg-row">
                  {confirmed ? <span className="link-ok">✓ Link confirmed</span> : (
                    <button disabled={busy} onClick={() => saveMemory(m.opportunityId!, m.propertyRecordId || null)} className="btn-sm">Confirm link</button>
                  )}
                  <button onClick={() => setChanging((c) => !c)} className="txtbtn">Change opportunity</button>
                  <button onClick={toggleMute} className="txtbtn">{isMuted ? 'Unmute suggestions for this opportunity' : 'Mute suggestions for this opportunity'}</button>
                </div>
              )}
            </>
          ) : (
            <div className="reg-row">
              <span className="muted-note">No opportunity matched{m.reason ? ` — ${m.reason}` : ''}.</span>
              {!evidenceOnly && <button onClick={() => setChanging((c) => !c)} className="txtbtn">Set opportunity</button>}
            </div>
          )}
          {changing && (
            <div className="reg-row">
              <input value={oppId} onChange={(e) => setOppId(e.target.value)} placeholder="Opportunity ID" className="input" />
              <input value={recId} onChange={(e) => setRecId(e.target.value)} placeholder="Property Record ID (optional)" className="input" />
              <button disabled={busy || !oppId.trim()} onClick={() => saveMemory(oppId.trim(), recId.trim() || null)} className="btn-sm">Save for the thread</button>
            </div>
          )}
          {msg && <div className={`text-xs ${msg.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}>{msg}</div>}
        </div>
      </div>

      <div className="core" style={evidenceOnly ? { gridTemplateColumns: '1fr' } : undefined}>
        <div className="sugg">
          <div className="flex items-center justify-between">
            <div className="lbl">Suggestion{current?.noEvidence ? ' · no evidence in the text' : ''}</div>
            {ordered.length > 1 && (
              <div className="stepper">
                <button onClick={() => setStep((s) => (s - 1 + ordered.length) % ordered.length)}>‹</button>
                {step + 1} of {ordered.length}
                <button onClick={() => setStep((s) => (s + 1) % ordered.length)}>›</button>
              </div>
            )}
          </div>
          {isMuted ? (
            <p className="instr weak">Suggestions are muted for this opportunity.</p>
          ) : !current ? (
            <p className="instr weak">No suggested change {matched ? 'for this email' : `(match ${m.grade})`}.</p>
          ) : (
            <>
              <p className={`instr ${current.noEvidence ? 'weak' : ''}`}>
                {current.target === 'action' ? current.fieldLabel
                  : <>Set <span className="pill f">{current.fieldLabel}</span> to <span className="pill">{niceValue(show(current.proposed))}</span></>}
              </p>
              <div className="on-what">
                {current.target === 'action' ? 'Expected action on the opportunity above (no field write)'
                  : current.target === 'property_record' ? 'On the Property Record above' : 'On the opportunity above'}
                {current.target !== 'action' && ` · now: ${now?.note || (now?.value ? niceValue(now.value) : '(blank)')}`}
              </div>
              {decided && (
                <div className={decided.outcome === 'accept' ? 'decided-ok' : 'decided-no'}>
                  {decided.outcome === 'accept' ? '✓ Accepted' : `✗ Rejected: ${outcomeLabel(decided.outcome).toLowerCase()}`} · {decided.by} · {niceDate(decided.at)}
                </div>
              )}
            </>
          )}
        </div>

        {!evidenceOnly && (
          <div className="decide">
            {processed ? (
              <button onClick={onReopen} className="dbtn skip">Reopen</button>
            ) : (
              <>
                {current && !isMuted ? (
                  <button disabled={busy} onClick={() => decide('accept')} className="dbtn accept">Accept <kbd>A</kbd></button>
                ) : (
                  <button onClick={markDone} className="dbtn accept">Done</button>
                )}
                <button disabled={busy || !current || isMuted} onClick={() => setRejecting((r) => !r)} className={`dbtn reject ${rejecting ? 'open' : ''}`}>Reject <kbd>R</kbd></button>
                <button onClick={skip} className="dbtn skip">Skip <kbd>S</kbd></button>
                {rejecting && (
                  <div className="reasons">
                    {REJECT_REASONS.map((r, i) => (
                      <button key={r.key} disabled={busy} onClick={() => decide(r.key)}>{r.label} <kbd>{i + 1}</kbd></button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {current && !isMuted && (
        <div className="why">
          <div className="lbl">Why</div>
          <Why s={current} d={d} facts={facts} onLocated={onLocated} itemId={item.id} />
        </div>
      )}

      <div className="more">
        <details>
          <summary>Full email</summary>
          <div className="body">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
              {d.body == null ? '(not loaded)' : <BodyMarks body={d.body} hits={bodyHits} active={null} idPrefix={`fb-${item.id}-`} />}
            </pre>
          </div>
        </details>
        <details>
          <summary>Attachments <span className="count">{item.docs.length}</span></summary>
          <div className="body space-y-2">
            {item.docs.length === 0 && <div className="muted-note">No PDF / zip attachments or document links.</div>}
            {item.docs.map((doc, i) => (
              <div key={i} className="rounded border p-2">
                <div className="text-xs">
                  <span className="font-medium">{doc.zipEntry ? `${doc.name} › ${doc.zipEntry}` : doc.name}</span>{' '}
                  <span className="text-gray-500">[{doc.source}] {doc.status}{doc.pages ? ` · ${doc.pages} pages` : ''}{doc.isDocuSign ? ' · DocuSign' : ''}</span>
                  {doc.reason && <div className="text-red-700">{doc.reason}</div>}
                </div>
                {doc.status === 'read' && <PdfPages itemId={item.id} doc={doc} facts={facts.filter(([, f]) => f.source === (doc.zipEntry || doc.name))} active={null} autoRender={false} onLocated={onLocated} />}
              </div>
            ))}
            {item.links.map((l, i) => (
              <div key={i} className="break-all text-xs">
                <span className={l.status === 'read' ? 'text-green-700' : 'text-red-700'}>{l.status === 'read' ? 'read' : 'link not read'}</span>{' '}
                <a href={l.url} target="_blank" rel="noreferrer" className="underline">{l.url}</a>{l.reason && <span className="text-gray-500"> — {l.reason}</span>}
              </div>
            ))}
          </div>
        </details>
        <details>
          <summary>Details</summary>
          <div className="body">
            <table className="kv">
              <tbody>
                {detailRows.map(([k, v], i) => (
                  <tr key={i}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
