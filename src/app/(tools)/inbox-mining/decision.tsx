'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { driveFilePath, driveFolder } from '@/lib/inboxMining/driveTarget';
import { precedentFor, type PrecedentSummary } from '@/lib/inboxMining/precedentShared';
import {
  BodyMarks, GRADE_STYLE, PdfPages, clsLabel, factLabel, findLoose, loadPrecedent, needleFor, outcomeLabel, show, suggestionKey, sydney,
  type Detail, type Fact, type FactPos, type Suggestion,
} from './shared';

// Decision screen (JT redesign): the suggested change first, the evidence under it, everything else collapsed.
// Accept / Reject write only inbox_items.feedback; a fully decided item is marked done in inbox_items.workflow.
// Nothing is written to GHL and no email is sent.

const REJECT_REASONS = [
  { key: 'wrong_field', label: 'Wrong field' },
  { key: 'wrong_value', label: 'Wrong value' },
  { key: 'wrong_opportunity', label: 'Wrong opportunity' },
  { key: 'not_needed', label: 'Not needed' },
];

export const normField = (k: string) =>
  k.toLowerCase().replace(/^(opportunity|property_record|custom_objects\.[a-z_]+)\./, '').replace(/[^a-z0-9]/g, '');

const suggestionMatches = (s: Suggestion, field: string) =>
  [s.fieldKey, s.fieldId || '', s.fieldLabel].some((k) => k && normField(k) === normField(field));

/** The extracted fact a suggestion was built from (suggest.ts writes source as `<source>: "<quote>"`). */
function factFor(s: Suggestion, facts: [string, Fact][]): [string, Fact] | null {
  return facts.find(([, f]) => s.source === `${f.source}: "${f.quote}"`) || null;
}

function Excerpt({ body, hit, idKey }: { body: string; hit: { start: number; end: number }; idKey: string }) {
  const from = Math.max(0, body.lastIndexOf('\n', Math.max(0, hit.start - 240)) + 1);
  const toNl = body.indexOf('\n', Math.min(body.length, hit.end + 240));
  const to = toNl === -1 ? body.length : toNl;
  const slice = body.slice(from, to);
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-2 text-xs">
      {from > 0 && '… '}
      <BodyMarks body={slice} hits={{ [idKey]: { start: hit.start - from, end: hit.end - from } }} active={idKey} idPrefix="ex-" />
      {to < body.length && ' …'}
    </pre>
  );
}

function SuggestionRow({ itemId, s, current, oppName, d, facts, onLocated, decided, evidenceOnly, focused, onDecided }: {
  itemId: number; s: Suggestion; current?: { value: string | null; note?: string }; oppName: string | null; d: Detail;
  facts: [string, Fact][]; onLocated: (k: string, p: FactPos) => void; decided?: { outcome: string; by: string; at: string };
  evidenceOnly: boolean; focused: boolean; onDecided: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fact = factFor(s, facts);
  const body = d.body || '';
  const hit = fact && fact[1].source === 'email' && body ? findLoose(body, needleFor(fact[0], fact[1])) : null;
  const doc = fact && fact[1].source !== 'email' ? d.item.docs.find((x) => (x.zipEntry || x.name) === fact[1].source) : undefined;

  const save = async (outcome: string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/inbox-mining/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, key: suggestionKey(s), outcome, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRejecting(false);
      onDecided();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const where = s.target === 'action'
    ? `Expected action on ${oppName || 'the opportunity'} (no field write)`
    : s.target === 'property_record'
      ? `Entered in ${s.fieldLabel} of the Property Record for ${oppName || 'the matched opportunity'}`
      : `Entered in ${s.fieldLabel} of ${oppName || 'the matched opportunity'}`;

  return (
    <div className={`rounded border p-3 ${focused ? 'border-blue-600 shadow-[inset_3px_0_0_#2563eb]' : ''}`}>
      <div className="text-xl font-semibold leading-snug text-brand-charcoal">
        {s.target === 'action' ? s.fieldLabel : <>{s.fieldLabel} <span className="text-gray-400">→</span> {show(s.proposed)}</>}
      </div>
      <div className="mt-1 text-sm text-gray-600">{where}</div>
      {s.target !== 'action' && (
        <div className="mt-0.5 text-xs text-gray-500">
          Now in GHL: {current?.note ? <span className="italic">{current.note}</span> : current?.value || <span className="italic">(blank)</span>}
          {s.note && <> · {s.note}</>}
        </div>
      )}

      {!evidenceOnly && (
        <div className="mt-3">
          {decided ? (
            <div className={`text-sm ${decided.outcome === 'accept' ? 'text-green-700' : 'text-red-700'}`}>
              {decided.outcome === 'accept' ? '✓ Accepted' : `✗ Rejected: ${outcomeLabel(decided.outcome).toLowerCase()}`} · {decided.by} · {sydney(decided.at)}
              <button onClick={() => setRejecting((r) => !r)} className="ml-2 text-xs text-blue-700 underline">change</button>
            </div>
          ) : null}
          {(!decided || rejecting) && (
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={busy} onClick={() => save('accept')}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Accept</button>
              <button disabled={busy} onClick={() => setRejecting((r) => !r)}
                className={`rounded border px-4 py-1.5 text-sm font-semibold disabled:opacity-50 ${rejecting ? 'border-red-500 bg-red-50 text-red-800' : 'bg-white hover:bg-gray-50'}`}>Reject…</button>
            </div>
          )}
          {rejecting && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-red-200 bg-red-50/40 p-2 text-xs">
              <span className="text-gray-600">Why?</span>
              {REJECT_REASONS.map((r) => (
                <button key={r.key} disabled={busy} onClick={() => save(r.key)}
                  className="rounded border border-red-300 bg-white px-2 py-1 font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50">{r.label}</button>
              ))}
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="min-w-[12rem] flex-1 rounded border bg-white px-2 py-1" />
            </div>
          )}
          {err && <div className="mt-1 text-xs text-red-700">{err}</div>}
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Why</div>
        {hit ? (
          <Excerpt body={body} hit={hit} idKey={fact![0]} />
        ) : doc && doc.status === 'read' ? (
          <div className="max-h-[28rem] overflow-auto rounded border">
            <PdfPages itemId={itemId} doc={doc} facts={[fact!]} active={fact![0]} autoRender onLocated={onLocated} />
          </div>
        ) : (
          <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
            {fact ? `${fact[1].source}: “${fact[1].quote}”` : s.source}
            {fact && fact[1].source === 'email' && !hit && <span className="text-gray-400"> (subject line, or not found in the body)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function DecisionPanel({ id, onDone, onSkip, focusField, evidenceOnly = false, processed = false, onReopen }: {
  id: number; onDone?: () => void; onSkip?: () => void; focusField?: string; evidenceOnly?: boolean;
  processed?: boolean; onReopen?: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [located, setLocated] = useState<Record<string, FactPos>>({});
  const [precedent, setPrecedent] = useState<PrecedentSummary | null>(null);
  const [changing, setChanging] = useState(false);
  const [oppId, setOppId] = useState('');
  const [recId, setRecId] = useState('');
  const [memBusy, setMemBusy] = useState(false);
  const [memMsg, setMemMsg] = useState<string | null>(null);

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
      return data as Detail;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [id]);

  useEffect(() => {
    setD(null);
    setLocated({});
    setChanging(false);
    setMemMsg(null);
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

  const markDone = async () => {
    const res = await fetch('/api/inbox-mining/workflow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], status: 'done' }),
    });
    if (!res.ok) {
      setError((await res.json()).error || `HTTP ${res.status}`);
      return;
    }
    onDone?.();
  };

  const afterDecision = async () => {
    const fresh = await load();
    if (!fresh) return;
    const all = fresh.item.suggestions || [];
    if (all.length && all.every((s) => fresh.item.feedback?.[suggestionKey(s)])) await markDone();
  };

  const saveMemory = async (opportunityId: string, propertyRecordId: string | null) => {
    setMemBusy(true);
    setMemMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/thread-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, opportunityId, propertyRecordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setChanging(false);
      if (opportunityId !== d?.item.match.opportunityId) setMemMsg('Saved. Later emails in this thread match to the new opportunity; this email keeps its suggestions until it is re-read.');
      await load();
    } catch (e) {
      setMemMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setMemBusy(false);
    }
  };

  if (error) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!d) return <div className="text-sm text-gray-500">Loading…</div>;

  const { item, live, current, memory } = d;
  const m = item.match;
  const oppName = live?.name || m.opportunityName || null;
  const matched = ['A', 'B', 'C'].includes(m.grade);
  const confirmed = !!memory && memory.confirmed_by !== 'auto' && memory.opportunity_id === m.opportunityId;
  const indexed = (item.suggestions || []).map((s, i) => ({ s, i }));
  const focusedRows = focusField ? indexed.filter(({ s }) => suggestionMatches(s, focusField)) : [];
  const rows = evidenceOnly && focusedRows.length ? focusedRows : focusField ? [...focusedRows, ...indexed.filter((r) => !focusedRows.includes(r))] : indexed;
  const focusFact = focusField && !focusedRows.length ? facts.find(([k]) => normField(k) === normField(focusField)) : undefined;
  const targetOpp = matched ? oppName : null;

  return (
    <div className="space-y-5 text-sm">
      <div>
        <div className="text-xs text-gray-500">{item.mailbox} · {item.direction === 'outbound' ? 'outbound' : 'inbound'} · {sydney(item.received_at)}</div>
        <div className="text-base font-semibold">{item.subject || '(no subject)'}</div>
        <div className="text-gray-600">{item.from_addr}</div>
      </div>
      {d.errors.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-red-800">{d.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
      )}

      {/* Suggested changes */}
      <section className="space-y-3">
        {evidenceOnly && focusField && !focusedRows.length && !focusFact && (
          <div className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">No suggestion or fact for “{focusField}” on this email.</div>
        )}
        {focusFact && (
          <div className="rounded border border-blue-600 p-3 shadow-[inset_3px_0_0_#2563eb]">
            <div className="text-xl font-semibold">{factLabel(focusFact[0])} <span className="text-gray-400">=</span> {focusFact[1].value}</div>
            <div className="mt-3">
              {bodyHits[focusFact[0]] && d.body ? (
                <Excerpt body={d.body} hit={bodyHits[focusFact[0]]!} idKey={focusFact[0]} />
              ) : (() => {
                const doc = item.docs.find((x) => (x.zipEntry || x.name) === focusFact[1].source);
                return doc && doc.status === 'read' ? (
                  <div className="max-h-[28rem] overflow-auto rounded border">
                    <PdfPages itemId={item.id} doc={doc} facts={[focusFact]} active={focusFact[0]} autoRender onLocated={onLocated} />
                  </div>
                ) : <div className="rounded border bg-gray-50 p-2 text-xs">{focusFact[1].source}: “{focusFact[1].quote}”</div>;
              })()}
            </div>
          </div>
        )}
        {rows.length === 0 && !focusFact && (
          <div className="rounded border bg-gray-50 p-3 text-gray-600">
            No suggested change {matched ? 'for this email' : `(match ${m.grade})`}.
          </div>
        )}
        {rows.map(({ s, i }) => (
          <SuggestionRow key={`${item.id}-${suggestionKey(s)}`} itemId={item.id} s={s} current={current[i]} oppName={oppName} d={d} facts={facts}
            onLocated={onLocated} decided={item.feedback?.[suggestionKey(s)]} evidenceOnly={evidenceOnly}
            focused={!!focusField && focusedRows.some((r) => r.i === i)} onDecided={afterDecision} />
        ))}
        {!evidenceOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {processed ? (
              <button onClick={onReopen} className="rounded border px-4 py-1.5 text-sm font-semibold hover:bg-gray-50">Reopen</button>
            ) : (
              <>
                {(item.suggestions || []).length === 0 && (
                  <button onClick={markDone} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Done</button>
                )}
                <button onClick={onSkip} className="rounded border px-4 py-1.5 text-sm font-semibold hover:bg-gray-50">Skip</button>
              </>
            )}
            <span className="text-xs text-gray-400">Read-only demo: nothing is written to GHL and no email is sent.</span>
          </div>
        )}
      </section>

      {/* Opportunity confirmation */}
      {!evidenceOnly && (
        <section className="rounded border p-3">
          {m.opportunityId ? (
            <div className="flex flex-wrap items-center gap-2">
              {confirmed ? (
                <span className="font-semibold text-green-700">✓ This thread belongs to {oppName}</span>
              ) : (
                <button disabled={memBusy} onClick={() => saveMemory(m.opportunityId!, m.propertyRecordId || null)}
                  className="rounded border border-blue-300 bg-white px-3 py-1 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                  Confirm this thread belongs to {oppName}
                </button>
              )}
              <span className={`rounded px-1.5 text-xs font-semibold ${GRADE_STYLE[m.grade] || ''}`}>{m.grade}</span>
              <button onClick={() => setChanging((c) => !c)} className="text-xs text-blue-700 underline">Change opportunity</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-600">No opportunity matched ({m.grade}).</span>
              <button onClick={() => setChanging((c) => !c)} className="text-xs text-blue-700 underline">Set opportunity</button>
            </div>
          )}
          {changing && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <input value={oppId} onChange={(e) => setOppId(e.target.value)} placeholder="Opportunity ID" className="rounded border bg-white px-2 py-1" />
              <input value={recId} onChange={(e) => setRecId(e.target.value)} placeholder="Property Record ID (optional)" className="rounded border bg-white px-2 py-1" />
              <button disabled={memBusy || !oppId.trim()} onClick={() => saveMemory(oppId.trim(), recId.trim() || null)}
                className="rounded bg-blue-600 px-3 py-1 font-semibold text-white disabled:opacity-40">Save</button>
            </div>
          )}
          {memMsg && <div className={`mt-1 text-xs ${memMsg.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}>{memMsg}</div>}
        </section>
      )}

      {/* Full email and attachments */}
      <details className="rounded border">
        <summary className="cursor-pointer bg-gray-50 px-3 py-2 font-semibold">Full email and attachments</summary>
        <div className="space-y-3 p-3">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-2 text-xs">
            {d.body == null ? '(not loaded)' : <BodyMarks body={d.body} hits={bodyHits} active={null} idPrefix={`fb-${item.id}-`} />}
          </pre>
          {item.docs.length === 0 && <div className="text-xs text-gray-500">No PDF / zip attachments or document links</div>}
          {item.docs.map((doc, i) => (
            <div key={i} className="rounded border p-2">
              <div className="text-xs">
                <span className="font-medium">{doc.zipEntry ? `${doc.name} › ${doc.zipEntry}` : doc.name}</span>{' '}
                <span className="text-gray-500">[{doc.source}] {doc.status}{doc.pages ? ` · ${doc.pages} pages` : ''}{doc.isDocuSign ? ' · DocuSign' : ''}</span>
                {doc.reason && <div className="text-red-700">{doc.reason}</div>}
              </div>
              {doc.status === 'read' && (
                <PdfPages itemId={item.id} doc={doc} facts={facts.filter(([, f]) => f.source === (doc.zipEntry || doc.name))} active={null} autoRender={false} onLocated={onLocated} />
              )}
            </div>
          ))}
          {item.links.map((l, i) => (
            <div key={i} className="break-all text-xs">
              <span className={l.status === 'read' ? 'text-green-700' : 'text-red-700'}>{l.status === 'read' ? 'read' : 'link not read'}</span>{' '}
              <a href={l.url} target="_blank" rel="noreferrer" className="underline">{l.url}</a>
              {l.reason && <span className="text-gray-500"> — {l.reason}</span>}
            </div>
          ))}
        </div>
      </details>

      {/* Details */}
      <details className="rounded border">
        <summary className="cursor-pointer bg-gray-50 px-3 py-2 font-semibold">Details</summary>
        <div className="space-y-3 p-3 text-xs">
          <div><span className="font-semibold">Class:</span> {clsLabel(item.cls)} <span className="text-gray-500">({item.cls_rule})</span></div>
          <div>
            <div className="font-semibold">Match</div>
            <div><span className={`rounded px-1.5 font-semibold ${GRADE_STYLE[m.grade] || ''}`}>{m.grade}</span> {m.opportunityName || m.reason} <span className="text-gray-500">via {m.source === 'thread_memory' ? 'thread memory' : m.source}</span></div>
            {m.fact1 && <div>1. {m.fact1}</div>}
            {m.fact2 && <div>2. {m.fact2}</div>}
            {m.flags.map((f, i) => <div key={i} className="text-amber-800">⚑ {f}</div>)}
            {m.trackerEvidence.map((t, i) => <div key={i} className="text-gray-600">{t}</div>)}
            {live && <div className="text-gray-600">Live GHL: {live.pipelineName} / {live.stageName} ({live.status}) · {live.registeredAddress || 'no Registered Address'}</div>}
            {m.propertyRecordId && <div className="text-gray-600">Property Record: {m.propertyRecordId}</div>}
          </div>
          <div>
            <span className="font-semibold">Geoscape:</span> {m.geoscape.status}
            {m.geoscape.parcelId && ` (${m.geoscape.parcelId})`}{m.geoscape.address && ` — ${m.geoscape.address}`}{m.geoscape.reason && ` — ${m.geoscape.reason}`}
          </div>
          <div>
            <span className="font-semibold">Thread memory:</span>{' '}
            {memory ? `→ ${memory.opportunity_id} (${memory.confirmed_by === 'auto' ? 'auto' : memory.confirmed_by})` : 'none for this thread'}
          </div>
          <div>
            <div className="font-semibold">Drive target (display only, not copied)</div>
            {targetOpp ? (
              <>
                <div className="break-all font-mono">{driveFolder(targetOpp)}\</div>
                {item.docs.filter((x) => x.status === 'read').map((x, i) => (
                  <div key={i} className="break-all font-mono text-gray-500">→ {driveFilePath(targetOpp, item.cls, item.received_at, x.zipEntry || x.name)}</div>
                ))}
              </>
            ) : <div className="text-gray-500">none until the match is graded A, B or C</div>}
          </div>
          {(item.suggestions || []).length > 0 && (
            <div>
              <div className="font-semibold">Precedent</div>
              {item.suggestions.map((s, i) => {
                const p = precedentFor(precedent, item.cls, s);
                return p ? <div key={i}><span className="text-gray-500">{s.fieldLabel}:</span> <span className={p.ok === false ? 'text-amber-800' : ''}>{p.line}</span></div> : null;
              })}
            </div>
          )}
          {facts.length > 0 && (
            <div>
              <div className="font-semibold">Extracted facts</div>
              <table className="w-full">
                <tbody>
                  {facts.map(([k, f]) => (
                    <tr key={k} className="border-t align-top">
                      <td className="p-1 font-mono">{k}</td><td className="p-1 font-medium">{f.value}</td><td className="p-1 text-gray-500">{f.source}: “{f.quote}”</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-gray-400">Live data fetched {sydney(d.fetchedAt)}</div>
        </div>
      </details>
    </div>
  );
}
