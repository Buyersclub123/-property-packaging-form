// Lag-sheet demonstration (JT 9/11): mine 90 days of mail into inbox_lag_facts, then build one row per mined
// fact with the GHL value and when a person entered it. Gmail and GHL are only read; nothing is written to GHL.
import { getDb } from '@/lib/db';
import { FRIENDLY_TO_FIELD_ID } from '@/app/api/contract-team-reporting/fields';
import { findByParcel, parcelIdFor } from '@/lib/geoscapeParcel';
import { classify, builderFor } from './classify';
import { getMessage, listMessageIds, newPart } from './gmail';
import { fetchOpps, fetchRecords, fetchStageNames, recordText, type Opp, type PropRecord } from './ghl';
import { matchMessage } from './match';
import { loadTrackers, type Trackers } from './trackers';
import { extractFacts } from './extract';
import { isReplySubject, mineFacts, signatureContacts, type MinedFact } from './lagRules';
import { norm } from './lag';

export async function ensureLagSheetTables(): Promise<void> {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS inbox_lag_seen (mailbox text NOT NULL, message_id text NOT NULL, rfc_id text, seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (mailbox, message_id))`;
  await sql`CREATE TABLE IF NOT EXISTS inbox_lag_facts (id serial PRIMARY KEY, rfc_id text NOT NULL, mailbox text NOT NULL, message_id text NOT NULL,
    received_at timestamptz NOT NULL, from_addr text, subject text, grade text, opportunity_id text, opportunity_name text, property_record_id text,
    type text NOT NULL, target text NOT NULL, field text NOT NULL, field_id text, value text NOT NULL, quote text, note text, mined_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (rfc_id, type, field, value))`;
  await sql`CREATE TABLE IF NOT EXISTS inbox_lag_geoscape (record_id text PRIMARY KEY, parcel_id text, status text NOT NULL, address text, reason text, checked_at timestamptz NOT NULL DEFAULT now())`;
}

type Pool = { opps: Opp[]; records: PropRecord[]; trackers: Trackers };
let pool: { at: number; p: Pool } | null = null;
async function getPool(): Promise<Pool> {
  if (pool && Date.now() - pool.at < 30 * 60_000) return pool.p;
  const names = await fetchStageNames();
  const [opps, records, trackers] = await Promise.all([fetchOpps(names), fetchRecords(), loadTrackers()]);
  pool = { at: Date.now(), p: { opps, records, trackers } };
  return pool.p;
}

const CONTRACT_CLASSES = new Set(['contract_executed_exchanged', 'registration_titles_issued', 'contract_received_unsigned']);

async function mineOne(mailbox: string, id: string, p: Pool): Promise<number> {
  const sql = getDb();
  const msg = await getMessage(mailbox, id);
  const rfc = msg.rfcId || `${mailbox}:${msg.id}`;
  // One email, once, across all four mailboxes.
  const dup = await sql`SELECT 1 FROM inbox_lag_seen WHERE rfc_id = ${rfc} AND NOT (mailbox = ${mailbox} AND message_id = ${id}) LIMIT 1`;
  await sql`INSERT INTO inbox_lag_seen (mailbox, message_id, rfc_id) VALUES (${mailbox}, ${id}, ${rfc}) ON CONFLICT DO NOTHING`;
  if (dup.length || msg.direction === 'outbound') return 0;

  const fresh = newPart(msg.text);
  const { cls, question } = classify({ subject: msg.subject, body: fresh, filenames: msg.attachments.map((a) => a.filename), docText: '',
    fromEmail: msg.fromEmail, builderSenders: p.trackers.builderSenders });
  if (question) return 0;
  const fromBuilder = !!builderFor(msg.fromEmail, p.trackers.builderSenders);
  const facts: (MinedFact & { contacts?: string })[] = mineFacts(msg.subject, fresh, msg.date, fromBuilder, CONTRACT_CLASSES.has(cls));
  const sig = signatureContacts(fresh);
  if (sig.phones.length)
    facts.push({ type: 'Contact detail change', target: 'opportunity', field: 'signature', value: JSON.stringify({ from: msg.from, email: msg.fromEmail, phones: sig.phones }), quote: sig.phones.join(', ') });
  if (!facts.length) return 0;

  const haystack = [msg.subject, msg.text.slice(0, 20000)].join('\n');
  const match = await matchMessage({ facts: extractFacts(`${msg.subject}\n${fresh}`, 'email'), haystack, memory: null, opps: p.opps, records: p.records, trackers: p.trackers });
  if (!['A', 'B', 'C'].includes(match.grade) || !match.opportunityId) return 0;
  for (const f of facts) {
    await sql`INSERT INTO inbox_lag_facts (rfc_id, mailbox, message_id, received_at, from_addr, subject, grade, opportunity_id, opportunity_name, property_record_id,
        type, target, field, field_id, value, quote, note)
      VALUES (${rfc}, ${mailbox}, ${id}, ${msg.date.toISOString()}, ${msg.from}, ${msg.subject}, ${match.grade}, ${match.opportunityId}, ${match.opportunityName || ''},
        ${match.propertyRecordId || null}, ${f.type}, ${f.target}, ${f.field}, ${f.fieldId || null}, ${f.value}, ${f.quote}, ${f.note || null})
      ON CONFLICT (rfc_id, type, field, value) DO NOTHING`;
  }
  return facts.length;
}

/** One chunk (~60 s) of the 90-day read for one mailbox; call again until remaining is 0. */
export async function mineChunk(mailbox: string, days: number, skip: string[] = []) {
  await ensureLagSheetTables();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const ids = await listMessageIds(mailbox, start, end);
  const done = new Set((await getDb()`SELECT message_id FROM inbox_lag_seen WHERE mailbox = ${mailbox}`).map((r) => r.message_id as string));
  const todo = ids.filter((i) => !done.has(i) && !skip.includes(i));
  const p = await getPool();
  const stopAt = Date.now() + 60_000;
  let written = 0, processed = 0;
  const failedIds: string[] = [];
  const queue = [...todo];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length && Date.now() < stopAt) {
      const id = queue.shift()!;
      try {
        written += await Promise.race([mineOne(mailbox, id, p), new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 90_000))]);
      } catch {
        failedIds.push(id);
      }
      processed++;
    }
  }));
  return { mailbox, listed: ids.length, processed, written, failedIds, remaining: Math.max(0, todo.length - processed) };
}

// ---- Geoscape pass ------------------------------------------------------------

/** Property Records with a lot number and no street number: lot + plan (mined from mail) -> Geoscape street address. */
export async function geoscapePass(limit = 200) {
  await ensureLagSheetTables();
  const sql = getDb();
  const { records } = await getPool();
  const plans = new Map<string, string>();
  for (const r of await sql`SELECT property_record_id, value FROM inbox_lag_facts WHERE field = 'plan_number' AND property_record_id IS NOT NULL ORDER BY received_at`)
    plans.set(r.property_record_id as string, r.value as string);
  for (const r of await sql`SELECT match->>'propertyRecordId' AS rid, facts->'planType'->>'value' AS pt, facts->'planNumber'->>'value' AS pn FROM inbox_items
      WHERE facts ? 'planNumber' AND match->>'propertyRecordId' IS NOT NULL`)
    if (!plans.has(r.rid as string)) plans.set(r.rid as string, `${r.pt || ''}${r.pn}`);
  let checked = 0, found = 0, noPlan = 0;
  for (const rec of records) {
    const lot = recordText(rec, 'lot_number').trim();
    if (!lot || recordText(rec, 'street_number').trim()) continue;
    const plan = plans.get(rec.id);
    if (!plan) { noPlan++; continue; }
    if (checked >= limit) break;
    const pm = plan.toUpperCase().match(/^([A-Z]*)\s*(\d+[A-Z]?)$/);
    const parcel = pm ? parcelIdFor(recordText(rec, 'state'), lot, pm[1], pm[2]) : null;
    const res = parcel ? await findByParcel(parcel) : { status: 'error' as const, parcelId: '', reason: 'no parcel format for this state/plan' };
    checked++;
    if (res.status === 'found') found++;
    await sql`INSERT INTO inbox_lag_geoscape (record_id, parcel_id, status, address, reason) VALUES (${rec.id}, ${res.parcelId || null}, ${res.status},
      ${res.address || null}, ${res.reason || null}) ON CONFLICT (record_id) DO UPDATE SET parcel_id = EXCLUDED.parcel_id, status = EXCLUDED.status,
      address = EXCLUDED.address, reason = EXCLUDED.reason, checked_at = now()`;
  }
  return { checked, found, noPlan };
}

// ---- Sheet rows ------------------------------------------------------------------

export interface LagRow {
  opportunity: string; propertyRecordId: string; type: string; field: string; mined: string; received: string; from: string;
  valueAtReceipt: string; human: string; humanUpdated: string; humanSource: string; match: 'Y' | 'N'; lagDays: number | null;
  subject: string; quote: string; note: string;
}

const CHANGE_DATE: Record<string, { target: 'opportunity' | 'property_record'; key: string }> = {
  financeStatus: { target: 'opportunity', key: 'fXXr8HchG3ZmSYvsIYHo' },
  dealFallenOver: { target: 'opportunity', key: FRIENDLY_TO_FIELD_ID.dealFallenOverDate },
  dealFallenOverReason: { target: 'opportunity', key: FRIENDLY_TO_FIELD_ID.dealFallenOverDate },
  construction_stage: { target: 'property_record', key: 'construction_stage_change_date' },
};

const show = (v: unknown) => (v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v));
function same(mined: string, human: string): boolean {
  const a = norm(mined), b = norm(human);
  if (!b) return false;
  if (a === b) return true;
  if (a === 'yes') return /^(yes|true|1|checked)$/i.test(b);
  const letters = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return letters(b).includes(letters(a)) || letters(a).includes(letters(b));
}

export async function buildLagRows(): Promise<LagRow[]> {
  await ensureLagSheetTables();
  const sql = getDb();
  const facts = await sql`SELECT * FROM inbox_lag_facts ORDER BY received_at`;
  const names = await fetchStageNames();
  const [opps, records] = await Promise.all([fetchOpps(names), fetchRecords()]);
  const oppById = new Map(opps.map((o) => [o.id, o]));
  const recById = new Map(records.map((r) => [r.id, r]));
  const edits = await sql`SELECT at, opportunity_id, record_id, field, old_value, new_value FROM ctr_edit_log ORDER BY at`.catch(() => []);
  const rows: LagRow[] = [];
  // JT 9/11: only the first email that told us a fact; later emails that repeat it are not the notification.
  const firstSeen = new Set<string>();

  for (const f of facts) {
    const factKey = f.type === 'Contact detail change'
      ? `${f.opportunity_id}|contact|${(JSON.parse(f.value as string) as { email: string; phones: string[] }).email}|${(JSON.parse(f.value as string) as { phones: string[] }).phones.join(',')}`
      : `${f.opportunity_id}|${f.field}|${norm(f.value as string)}`;
    // JT 9/11: a reply/forward subject repeats the original; facts taken only from it are not a notification.
    const subj = String(f.subject || '');
    const q = String(f.quote || '').trim();
    if (isReplySubject(subj) && q && (subj.includes(q) || q.includes(subj.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '').trim()))) continue;
    if (firstSeen.has(factKey)) continue;
    firstSeen.add(factKey);
    const received = new Date(f.received_at as string);
    const o = oppById.get(f.opportunity_id as string);
    const r = f.property_record_id ? recById.get(f.property_record_id as string) : undefined;
    let field = f.field as string;
    let mined = f.value as string;
    let human = '';
    if (f.type === 'Contact detail change') {
      // Signature phone vs the contact on the opportunity whose email is the sender's.
      const sig = JSON.parse(mined) as { email: string; phones: string[] };
      const roles = ['broker', 'solicitor', 'partner', 'accountant'];
      const role = o && roles.find((x) => norm(show(o.fields[FRIENDLY_TO_FIELD_ID[`${x}Email`]])) === sig.email);
      if (!o || !role) continue;
      field = `${role}Phone`;
      human = show(o.fields[FRIENDLY_TO_FIELD_ID[field]]);
      const phone = (s: string) => s.replace(/[^\d]/g, '').replace(/^61/, '0');
      if (sig.phones.some((p) => phone(p) === phone(human))) continue;
      mined = sig.phones[0];
    } else if (f.target === 'opportunity') {
      if (field === 'pipeline stage') human = o ? o.stageName : '';
      else human = o ? show(o.fields[(f.field_id as string) || FRIENDLY_TO_FIELD_ID[field] || '']) : '';
    } else if (f.target === 'property_record') {
      human = r ? recordText(r, field) : '';
    }
    // JT 9/11: a person may record the build stage as the opportunity's pipeline stage instead of the PR dropdown.
    const viaPipeline = field === 'construction_stage' && !!o && !same(mined, human) && same(mined, o.stageName);
    if (viaPipeline) human = o!.stageName;

    // When a person entered it: CTRT edit log first, then the change-date field, then the stage-change time.
    let updated: Date | null = null, src = '', atReceipt = '';
    const recId = (f.property_record_id as string) || '';
    const log = edits.filter((e) => e.field === field && (e.record_id === recId || e.opportunity_id === f.opportunity_id));
    const after = log.find((e) => new Date(e.at as string) >= received && same(mined, show(e.new_value)));
    const lastBefore = [...log].reverse().find((e) => new Date(e.at as string) < received);
    if (after) {
      updated = new Date(after.at as string); src = 'CTRT edit log'; atReceipt = show(after.old_value);
    } else if (viaPipeline && o?.lastStageChangeAt) {
      updated = new Date(o.lastStageChangeAt); src = 'GHL last stage change (opportunity pipeline stage)';
    } else if (CHANGE_DATE[field]) {
      const c = CHANGE_DATE[field];
      const d = c.target === 'opportunity' ? (o ? show(o.fields[c.key]) : '') : r ? recordText(r, c.key) : '';
      if (d) { updated = new Date(`${d.slice(0, 10)}T00:00:00+10:00`); src = `change-date field (${c.key === 'fXXr8HchG3ZmSYvsIYHo' ? 'finance_status_change_date' : c.key}), date only`; }
    } else if (field === 'pipeline stage' && o?.lastStageChangeAt) {
      updated = new Date(o.lastStageChangeAt); src = 'GHL last stage change';
    }
    if (!after) {
      if (lastBefore) atReceipt = show(lastBefore.new_value);
      else if (updated && updated < received) atReceipt = human;
      else if (!human) atReceipt = '(blank)';
      else if (updated) atReceipt = '(set later; earlier value not recorded)';
      else atReceipt = '(not recorded; GHL keeps no field history)';
    }
    const isMatch = same(mined, human);
    rows.push({
      opportunity: o?.name || (f.opportunity_name as string), propertyRecordId: recId, type: f.type as string, field, mined,
      received: received.toISOString(), from: f.from_addr as string, valueAtReceipt: atReceipt, human,
      humanUpdated: updated ? updated.toISOString() : '', humanSource: src, match: isMatch ? 'Y' : 'N',
      lagDays: updated && isMatch ? Math.round(((updated.getTime() - received.getTime()) / 86400000) * 10) / 10 : null,
      subject: f.subject as string, quote: (f.quote as string) || '', note: (f.note as string) || '',
    });
  }

  for (const g of await sql`SELECT * FROM inbox_lag_geoscape WHERE status = 'found'`) {
    const r = recById.get(g.record_id as string);
    if (!r) continue;
    const oppId = recordText(r, 'linked_opportunity_id');
    rows.push({
      opportunity: oppById.get(oppId)?.name || '', propertyRecordId: r.id, type: 'Street address (Geoscape lot + plan)', field: 'street_number / street_name',
      mined: g.address as string, received: '', from: `Geoscape parcel ${g.parcel_id}`, valueAtReceipt: '', human: `${recordText(r, 'street_number')} ${recordText(r, 'street_name')}`.trim(),
      humanUpdated: '', humanSource: '', match: 'N', lagDays: null, subject: '', quote: `checked ${new Date(g.checked_at as string).toISOString()}`, note: '',
    });
  }
  return rows;
}

