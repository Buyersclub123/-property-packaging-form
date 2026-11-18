// Deal Sheet link writes, both sides in one action (JT 17/11): the Property Record's linked_opportunity_id and
// the opportunity's three mirrors are written together, then both sides are read back. Anything that did not
// land throws LinkIntegrityError so the route fails loudly.
import { ghlFetch } from '@/lib/ghlFetch';
import { MIRRORS, ctrtLink } from '@/lib/linkSweep';
import { HANDBACK_STAGES, PIPELINE_ID, PIPELINE_NAMES } from '@/lib/ghlPipelines';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const LOC = process.env.GHL_LOCATION_ID || '';
const PROPERTY_OBJECT_ID = '692d04e3662599ed0c29edfa';
const headers = () => ({
  Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const MIRROR_ID = Object.fromEntries(MIRRORS.map((m) => [m.field, m.id])) as Record<(typeof MIRRORS)[number]['field'], string>;

export class LinkIntegrityError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Link did not land on both sides: ${problems.join('; ')}`);
    this.problems = problems;
  }
}

type RawField = { id: string; fieldValueString?: unknown; fieldValue?: unknown; fieldValueNumber?: unknown; fieldValueArray?: unknown; fieldValueDate?: unknown; value?: unknown };
const norm = (v: unknown): string => (v == null ? '' : Array.isArray(v) ? v.map(String).join(', ') : String(v)).trim();
const rawVal = (c: RawField) => c.fieldValueString ?? c.fieldValue ?? c.fieldValueNumber ?? c.fieldValueArray ?? c.fieldValueDate ?? c.value;

export type OppSnapshot = { id: string; name: string; contactId: string; pipelineId: string; stageId: string; status: string; fields: Record<string, string> };

export async function readOppSnapshot(oppId: string): Promise<OppSnapshot | null> {
  const res = await ghlFetch(`${BASE}/opportunities/${oppId}?_t=${Date.now()}`, { headers: headers(), cache: 'no-store' }, 'deal-sheet-link-read');
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GHL opportunity ${oppId} HTTP ${res.status}`);
  const o = (await res.json()).opportunity;
  if (!o) return null;
  const fields: Record<string, string> = {};
  for (const c of (o.customFields || []) as RawField[]) fields[c.id] = norm(rawVal(c));
  return { id: o.id, name: o.name || '', contactId: o.contactId || '', pipelineId: o.pipelineId || '', stageId: o.pipelineStageId || '', status: o.status || '', fields };
}

export async function readRecordLink(recordId: string): Promise<{ opp: string; address: string; status: string } | null> {
  const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${recordId}?locationId=${LOC}&_t=${Date.now()}`, { headers: headers(), cache: 'no-store' }, 'deal-sheet-link-read');
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GHL Property Record ${recordId} HTTP ${res.status}`);
  const j = await res.json();
  const p = (j.record?.properties || j.properties || {}) as Record<string, unknown>;
  return { opp: norm(p.linked_opportunity_id), address: norm(p.property_address), status: norm(p.status) };
}

export async function putOpp(oppId: string, body: Record<string, unknown>, tag: string): Promise<void> {
  const res = await ghlFetch(`${BASE}/opportunities/${oppId}?locationId=${LOC}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }, tag);
  if (!res.ok) throw new Error(`GHL opportunity ${oppId} write HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export const mirrorValues = (oppId: string, recordId: string, address: string): Record<string, string> => ({
  [MIRROR_ID.linked_property_record_id]: recordId,
  [MIRROR_ID.linked_property_address]: address,
  [MIRROR_ID.property_record_ctrt_link]: ctrtLink(oppId),
});
export const blankMirrors = (): Record<string, string> => Object.fromEntries(MIRRORS.map((m) => [m.id, '']));
export const toCustomFields = (want: Record<string, string>) => Object.entries(want).map(([id, field_value]) => ({ id, field_value }));

export async function writeOppMirrors(oppId: string, recordId: string, address: string): Promise<void> {
  await putOpp(oppId, { customFields: toCustomFields(mirrorValues(oppId, recordId, address)) }, 'deal-sheet-link-mirrors');
}

export async function clearOppMirrors(oppId: string): Promise<void> {
  await putOpp(oppId, { customFields: toCustomFields(blankMirrors()) }, 'deal-sheet-link-mirrors');
}

const FIELD_LABEL: Record<string, string> = Object.fromEntries(MIRRORS.map((m) => [m.id, m.field]));
export type OppCheck = { oppId: string; label: string; want: Record<string, string>; pipelineId?: string; stageId?: string; fieldLabels?: Record<string, string> };

// Reads both sides back (GHL can lag a moment after a write, so up to 3 reads) and throws on any difference.
export async function verifyBothSides(e: { recordId: string; recordOpp: string; opps: OppCheck[] }): Promise<void> {
  let problems: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(800);
    problems = [];
    const rec = await readRecordLink(e.recordId);
    if (!rec) problems.push(`Property Record ${e.recordId} not found on read-back`);
    else if (rec.opp !== e.recordOpp) problems.push(`Property Record linked_opportunity_id is "${rec.opp || '(blank)'}", expected "${e.recordOpp || '(blank)'}"`);
    for (const c of e.opps) {
      const o = await readOppSnapshot(c.oppId);
      if (!o) { problems.push(`${c.label} opportunity ${c.oppId} not found on read-back`); continue; }
      for (const [id, v] of Object.entries(c.want)) {
        const got = o.fields[id] || '';
        if (got !== v) problems.push(`${c.label} opportunity "${o.name}" ${c.fieldLabels?.[id] || FIELD_LABEL[id] || id} is "${got || '(blank)'}", expected "${v || '(blank)'}"`);
      }
      if (c.pipelineId && o.pipelineId !== c.pipelineId) problems.push(`${c.label} opportunity "${o.name}" is in pipeline ${o.pipelineId}, expected ${c.pipelineId}`);
      if (c.stageId && o.stageId !== c.stageId) problems.push(`${c.label} opportunity "${o.name}" is at stage ${o.stageId}, expected ${c.stageId}`);
    }
    if (!problems.length) return;
  }
  throw new LinkIntegrityError(problems);
}

// Unlink handback (JT 17/11): fields always cleared on the opportunity when it is unlinked.
export const HANDBACK_CLEAR_FIELDS: { id: string; label: string }[] = [
  { id: 'zTgTXnbDCLlXs3Ehx9sl', label: 'Finance Status' },
  { id: 'fXXr8HchG3ZmSYvsIYHo', label: 'Finance Status change date' },
  { id: 'PlNx1851lV5PSAotT4FT', label: 'Registered Address' },
  { id: 'eJLct739hxbwrkrdtfca', label: 'Total Purchase Price' },
  { id: '5rgUZN6RJ0jC90eiH7ie', label: 'Agent/Builder Details' },
  { id: 'lWfSyDNYwWalhkMcHyAQ', label: 'Settlement date' },
  { id: 'WYmP8plPbH1E8NvUaGcP', label: 'Confirmed Settlement Date' },
  { id: 'dEhAogLlok9x7GpxhOPB', label: 'Settlement date (commercial)' },
  ...MIRRORS.map((m) => ({ id: m.id, label: m.field })),
];
const HANDBACK_LABEL = Object.fromEntries(HANDBACK_CLEAR_FIELDS.map((f) => [f.id, f.label]));

export type Handback = {
  oppId: string; oppName: string; contactId: string; stageId: string; stageName: string; fromPipeline: string;
  previous: { field: string; value: string }[]; noteId: string; noteText: string;
};

const sydDate = () => new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric' });

// Step 1, before anything is cleared: read the opp and write the contact note with its previous values.
export async function prepareHandback(o: { oppId: string; address: string; stageId: string; reason: string; by: string }): Promise<Handback> {
  const stage = HANDBACK_STAGES.find((s) => s.id === o.stageId);
  if (!stage) throw new Error('choose where the opportunity goes back to (a Proposals band or On Hold)');
  if (!o.reason) throw new Error('a reason is required to unlink');
  const snap = await readOppSnapshot(o.oppId);
  if (!snap) throw new Error(`opportunity ${o.oppId} not found in GHL; nothing was changed`);
  if (!snap.contactId) throw new Error(`opportunity "${snap.name}" has no contact for the note; nothing was changed`);
  const previous = HANDBACK_CLEAR_FIELDS.filter((f) => snap.fields[f.id]).map((f) => ({ field: f.label, value: snap.fields[f.id] }));
  const noteText = `Unlinked from ${o.address || '(no address)'} on ${sydDate()} by ${o.by}. Reason: ${o.reason}. Moved back to ${stage.name}. Previous values: ${previous.map((p) => `${p.field}: ${p.value}`).join(', ') || 'none'}`;
  const res = await ghlFetch(`${BASE}/contacts/${snap.contactId}/notes`, { method: 'POST', headers: headers(), body: JSON.stringify({ body: noteText }), cache: 'no-store' }, 'deal-sheet-unlink-note');
  const j = (await res.json().catch(() => ({}))) as { note?: { id?: string }; message?: string };
  if (!res.ok) throw new Error(`contact note not written (GHL ${res.status}: ${j.message || ''}); nothing was changed`);
  return { oppId: snap.id, oppName: snap.name, contactId: snap.contactId, stageId: stage.id, stageName: stage.name, fromPipeline: PIPELINE_NAMES[snap.pipelineId] || snap.pipelineId, previous, noteId: j.note?.id || '', noteText };
}

const handbackWant = () => Object.fromEntries(HANDBACK_CLEAR_FIELDS.map((f) => [f.id, '']));

// Step 2, after the record is unlinked: move the opp to the chosen Property Team stage and clear the fields.
export async function applyHandback(h: Handback): Promise<void> {
  await putOpp(h.oppId, { pipelineId: PIPELINE_ID.PROPERTY_TEAM, pipelineStageId: h.stageId, customFields: toCustomFields(handbackWant()) }, 'deal-sheet-unlink-handback');
}

export const handbackCheck = (h: Handback): OppCheck => ({
  oppId: h.oppId, label: 'Unlinked', want: handbackWant(), pipelineId: PIPELINE_ID.PROPERTY_TEAM, stageId: h.stageId, fieldLabels: HANDBACK_LABEL,
});

export const integrityResponse = (e: unknown) =>
  e instanceof LinkIntegrityError
    ? { error: `LINK INTEGRITY FAILURE - ${e.message}`, problems: e.problems }
    : { error: `LINK INTEGRITY FAILURE - ${e instanceof Error ? e.message : String(e)}`, problems: [] as string[] };
