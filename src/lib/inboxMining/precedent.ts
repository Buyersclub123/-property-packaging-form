import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ensureActivityTable } from './activity';
import { fetchStageNames, fetchOpps } from './ghl';
import { ensureForwardsTable, normSubject } from './forwards';
import {
  WINDOW_DAYS, MIN_EMAILS, MIN_RATE, DATE_LEAD_DAYS, CURRENT_FIELDS, isScheduleField,
  type PrecedentSummary, type TypeStats,
} from './precedentShared';

// Precedent check (backlog 21). What the team did after each June-Oct inbound email, per activity type:
// a GHL date field set / stage moved, a reply in the same mailbox thread, a note or task on the contact, or nothing.
// Read-only on GHL (GET requests and search only); results go to email_precedent.

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const DAY = 86_400_000;
const headers = () => ({
  Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN}`,
  Version: process.env.GHL_API_VERSION || '2021-07-28',
  Accept: 'application/json',
});

async function dateFields(): Promise<{ id: string; name: string }[]> {
  const res = await ghlFetch(`${BASE}/locations/${process.env.GHL_LOCATION_ID}/customFields?model=opportunity`, { headers: headers() }, 'precedent-fields');
  if (!res.ok) throw new Error(`GHL custom fields HTTP ${res.status}`);
  const data = await res.json();
  return ((data.customFields || []) as { id: string; name: string; dataType: string }[])
    .filter((f) => f.dataType === 'DATE')
    .map((f) => ({ id: f.id, name: f.name }));
}

/** Times (ms) of the contact's notes and tasks. */
async function contactActivity(contactId: string): Promise<number[]> {
  const out: number[] = [];
  for (const path of ['notes', 'tasks'] as const) {
    const res = await ghlFetch(`${BASE}/contacts/${contactId}/${path}`, { headers: headers() }, `precedent-${path}`);
    if (!res.ok) throw new Error(`GHL ${path} HTTP ${res.status}`);
    const data = await res.json();
    for (const x of (data[path] || []) as { dateAdded?: string; dueDate?: string }[]) {
      const t = Date.parse(x.dateAdded || x.dueDate || '');
      if (Number.isFinite(t)) out.push(t);
    }
  }
  return out;
}

async function pool<T>(xs: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => {
    while (i < xs.length) await fn(xs[i++]);
  }));
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function ensurePrecedentTable(): Promise<void> {
  await getDb()`CREATE TABLE IF NOT EXISTS email_precedent (id SERIAL PRIMARY KEY, built_at TIMESTAMPTZ DEFAULT NOW(), summary JSONB NOT NULL)`;
}

export async function latestPrecedent(): Promise<PrecedentSummary | null> {
  await ensurePrecedentTable();
  const rows = await getDb()`SELECT summary FROM email_precedent ORDER BY built_at DESC LIMIT 1`;
  return (rows[0]?.summary as PrecedentSummary) || null;
}

let building: Promise<PrecedentSummary> | null = null;
export const isBuilding = () => building !== null;

/** Starts a build unless one is running; the browser polls latestPrecedent (multi-minute requests time out in the browser). */
export function startPrecedentBuild(): boolean {
  if (building) return false;
  building = buildPrecedent()
    .catch((e) => {
      console.error('[inbox-mining] precedent build failed:', e instanceof Error ? e.message : e);
      throw e;
    })
    .finally(() => { building = null; });
  building.catch(() => {});
  return true;
}

export async function buildPrecedent(): Promise<PrecedentSummary> {
  await ensureActivityTable();
  await ensurePrecedentTable();
  const sql = getDb();
  const emails = (await sql`
    SELECT activity, opp_id, sent_at, reply_hours, subject FROM email_activity
    WHERE direction = 'in' AND opp_id IS NOT NULL`) as { activity: string; opp_id: string; sent_at: string; reply_hours: string | null; subject: string | null }[];

  const [fields, names] = await Promise.all([dateFields(), fetchStageNames()]);
  const opps = new Map((await fetchOpps(names)).map((o) => [o.id, o]));
  const contactIds = Array.from(new Set(emails.map((e) => opps.get(e.opp_id)?.contactId).filter((c): c is string => !!c)));
  const errors: string[] = [];
  const contactTimes = new Map<string, number[] | null>();
  await pool(contactIds, 4, async (cid) => {
    try {
      contactTimes.set(cid, await contactActivity(cid));
    } catch (e) {
      contactTimes.set(cid, null);
      if (errors.length < 20) errors.push(`${cid}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  await ensureForwardsTable();
  const fwdTimes = new Map<string, number[]>();
  const fwdRows = (await sql`SELECT norm_subject, sent_at FROM email_forwards WHERE norm_subject IS NOT NULL`) as { norm_subject: string; sent_at: string }[];
  for (const f of fwdRows) {
    const list = fwdTimes.get(f.norm_subject) || [];
    list.push(new Date(f.sent_at).getTime());
    fwdTimes.set(f.norm_subject, list);
  }
  console.log(`[inbox-mining] precedent: ${emails.length} emails, ${opps.size} opps, ${contactIds.length} contacts read`);

  type Acc = Omit<TypeStats, 'opps' | 'medianReplyHrs' | 'dateFields' | 'current'> & {
    oppIds: Set<string>; replyHrs: number[]; fieldDays: Map<string, number[]>;
  };
  const byType = new Map<string, Acc>();
  let missingOpp = 0;
  const W = WINDOW_DAYS * DAY;

  for (const e of emails) {
    const o = opps.get(e.opp_id);
    if (!o) { missingOpp++; continue; }
    const t = new Date(e.sent_at).getTime();
    const day0 = Date.parse(new Date(t).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }));
    const a = byType.get(e.activity) || {
      type: e.activity, emails: 0, fieldChanged: 0, replied: 0, forwarded: 0, noteTask: 0, nothing: 0, stageMoved: 0,
      oppIds: new Set<string>(), replyHrs: [], fieldDays: new Map<string, number[]>(),
    };
    byType.set(e.activity, a);
    a.emails++;
    a.oppIds.add(o.id);

    let dateHit = false;
    for (const f of fields) {
      const v = o.fields[f.id];
      const s = Array.isArray(v) ? v[0] : v;
      const d = s ? Date.parse(String(s).slice(0, 10)) : NaN;
      if (!Number.isFinite(d)) continue;
      const days = Math.round((d - day0) / DAY);
      if (days < -DATE_LEAD_DAYS || days > WINDOW_DAYS) continue;
      if (!isScheduleField(f.name)) dateHit = true;
      const list = a.fieldDays.get(f.id) || [];
      list.push(Math.max(0, days));
      a.fieldDays.set(f.id, list);
    }
    const stage = o.lastStageChangeAt ? Date.parse(o.lastStageChangeAt) : NaN;
    const stageMoved = Number.isFinite(stage) && stage >= t && stage <= t + W;
    const replied = e.reply_hours !== null && Number(e.reply_hours) <= WINDOW_DAYS * 24;
    const times = contactTimes.get(o.contactId);
    const noteTask = !!times && times.some((x) => x >= t && x <= t + W);
    const fieldChanged = dateHit || stageMoved;
    if (fieldChanged) a.fieldChanged++;
    if (stageMoved) a.stageMoved++;
    if (replied) { a.replied++; a.replyHrs.push(Number(e.reply_hours)); }
    if (noteTask) a.noteTask++;
    // Short generic subjects ("Invoice") would match unrelated forwards.
    const ns = normSubject(e.subject || '');
    const forwarded = ns.length >= 12 && (fwdTimes.get(ns) || []).some((x) => x > t && x <= t + W);
    if (forwarded) a.forwarded++;
    if (!fieldChanged && !replied && !forwarded && !noteTask) a.nothing++;
  }

  const fieldName = new Map(fields.map((f) => [f.id, f.name]));
  const types: TypeStats[] = Array.from(byType.values()).map((a) => {
    const current = Object.entries(CURRENT_FIELDS).map(([fieldId, name]) => {
      const counts = new Map<string, number>();
      let set = 0;
      a.oppIds.forEach((id) => {
        const v = opps.get(id)?.fields[fieldId];
        const s = Array.isArray(v) ? v.join(', ') : v;
        if (!s) return;
        set++;
        counts.set(s, (counts.get(s) || 0) + 1);
      });
      const top = Array.from(counts.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
      return { fieldId, name, opps: a.oppIds.size, set, rate: a.oppIds.size ? set / a.oppIds.size : 0, top };
    });
    const dateFieldStats = Array.from(a.fieldDays.entries())
      .map(([fieldId, days]) => {
        const name = fieldName.get(fieldId) || fieldId;
        return { fieldId, name, hits: days.length, rate: days.length / a.emails, medianDays: median(days), schedule: isScheduleField(name) };
      })
      .sort((x, y) => y.hits - x.hits);
    return {
      type: a.type, emails: a.emails, opps: a.oppIds.size, fieldChanged: a.fieldChanged, replied: a.replied, noteTask: a.noteTask,
      nothing: a.nothing, stageMoved: a.stageMoved, forwarded: a.forwarded, medianReplyHrs: median(a.replyHrs), dateFields: dateFieldStats, current,
    };
  }).sort((x, y) => y.emails - x.emails);

  const summary: PrecedentSummary = {
    builtAt: new Date().toISOString(), windowDays: WINDOW_DAYS, minEmails: MIN_EMAILS, minRate: MIN_RATE,
    emails: emails.length, oppsLoaded: opps.size, contacts: contactIds.length, forwards: fwdRows.length,
    contactErrors: Array.from(contactTimes.values()).filter((v) => v === null).length, missingOpp, errors, types,
  };
  await sql`INSERT INTO email_precedent (summary) VALUES (${JSON.stringify(summary)}::jsonb)`;
  return summary;
}
