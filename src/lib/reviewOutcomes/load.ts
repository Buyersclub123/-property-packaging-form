import { getDb } from '@/lib/db';
import { ensureReviewTables } from './store';
import { ghlLocationId, ghlUsers, SECOND_MEETING_CALENDAR_ID } from './sync';
import { matchMeetings, prepareGcal, type RawGcal } from './match';
import { addDays, LEAD_SPLIT_FROM, MIN_YMD, NEW_LEAD_CALENDAR_ID, sydYmd, utcCover, type GcalEvent, type LeadType, type MeetingMode, type OutcomeSource, type ReviewMeeting, type ReviewViewer } from './types';
import { ensureSchedule, loadScheduleRows, matchSchedule, scheduleMode, scheduleOutcome, type ScheduleRow } from './schedule';
import { nameMatcher } from './sales';

// Reads meetings for Sydney days from..to from the cache, with recorded outcomes and the matching Google event.

const GHL_OUTCOME: Record<string, string> = { showed: 'Showed', noshow: 'No show', cancelled: 'Cancelled', invalid: 'Invalid (DNQ)' };
const GHL_STATUS: Record<string, string> = { confirmed: 'Confirmed', cancelled: 'Cancelled', showed: 'Showed', noshow: 'No show', invalid: 'Invalid', new: 'New' };

export interface LoadedMeetings {
  meetings: ReviewMeeting[];
  gcalUnmatched: GcalEvent[];
  consultants: string[];
  warnings: string[];
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : '');

export function meetingMode(location: string): MeetingMode {
  const l = location.trim();
  if (/meet\.google\.com/i.test(l)) return 'Google';
  if (!l || /^https?:\/\//i.test(l) || /^[+\d\s()-]+$/.test(l)) return 'Unknown';
  return 'F2F';
}

/** 'ethan.l@buyersclub.com.au' -> 'Ethan.L' (the sheet's style) when GHL has no name for the email. */
const emailName = (e: string) => e.split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('.');

export async function loadMeetings(viewer: ReviewViewer, from: string, to: string, callCentre: string[], aliases: Record<string, string> = {}): Promise<LoadedMeetings> {
  await ensureReviewTables();
  const sql = getDb();
  const warnings: string[] = [];
  const users = await ghlUsers().catch((e: Error) => {
    warnings.push(`GHL users not loaded (consultant names missing): ${e.message}`);
    return [];
  });
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const staffByEmail = new Map(users.map((u) => [u.email, u.name]));
  const userEmail = new Map(users.map((u) => [u.id, u.email]));
  const cc = new Set(callCentre.map((e) => e.toLowerCase()));
  const loc = ghlLocationId();

  const { start, end } = utcCover(addDays(from, -3), addDays(to, 3));
  const rows = await sql`SELECT m.appointment_id, m.calendar_id, m.calendar_name, m.contact_id, m.assigned_user_id, m.start_at, m.ghl_status, m.title,
      m.created_by, c.name AS contact_name, c.email AS contact_email, c.phones,
      o.outcome, o.invalid_reason, o.note, o.source, o.source_ref, o.recorded_by, o.recorded_at
    FROM review_meetings m
    LEFT JOIN review_contacts c ON c.contact_id = m.contact_id
    LEFT JOIN review_outcomes o ON o.appointment_id = m.appointment_id
    WHERE NOT m.deleted AND m.calendar_id IS DISTINCT FROM ${SECOND_MEETING_CALENDAR_ID} AND m.start_at >= ${start.toISOString()}::timestamptz AND m.start_at < ${end.toISOString()}::timestamptz
    ORDER BY m.start_at`;
  const gRows = await sql`SELECT event_id, start_at, all_day, start_raw, summary, description, location, organizer, attendees, calendars
    FROM review_gcal_events WHERE start_at >= ${start.toISOString()}::timestamptz AND start_at < ${end.toISOString()}::timestamptz
      AND COALESCE(summary, '') !~* '(follow[ -]?up|2nd meeting|second meeting)'`;

  const raw: RawGcal[] = gRows.map((g) => ({
    id: String(g.event_id),
    t: Date.parse(iso(g.start_at)),
    allDay: !!g.all_day,
    ymd: g.all_day ? String(g.start_raw).slice(0, 10) : sydYmd(iso(g.start_at)),
    summary: String(g.summary || ''),
    description: String(g.description || ''),
    organizer: String(g.organizer || ''),
    attendees: (g.attendees as { email: string; name: string }[]) || [],
  }));
  const calendarsOf = new Map(gRows.map((g) => [String(g.event_id), (g.calendars as string[]) || []]));
  const locationOf = new Map(gRows.map((g) => [String(g.event_id), String(g.location || '')]));
  const prepared = prepareGcal(raw, users.map((u) => u.name));
  const toEvent = (e: (typeof prepared)[number]): GcalEvent => ({
    id: e.id,
    start: new Date(e.t).toISOString(),
    allDay: e.allDay,
    ymd: e.ymd,
    title: e.summary,
    staff: e.staffEmails.map((m) => staffByEmail.get(m) || m).join(', '),
    staffEmails: e.staffEmails,
    calendars: calendarsOf.get(e.id) || [],
    location: locationOf.get(e.id) || '',
    mode: meetingMode(locationOf.get(e.id) || ''),
  });
  const eventById = new Map(prepared.map((e) => [e.id, e]));

  const base = rows.map((r) => {
    const startIso = iso(r.start_at);
    return { r, startIso, t: Date.parse(startIso), ymd: sydYmd(startIso), name: String(r.contact_name || r.title || '') };
  });
  const isNl = (r: Record<string, unknown>) => String(r.calendar_id) === NEW_LEAD_CALENDAR_ID;
  const matches = matchMeetings(
    base.filter((b) => !isNl(b.r)).map((b) => ({ id: String(b.r.appointment_id), t: b.t, ymd: b.ymd, name: b.name, email: String(b.r.contact_email || ''), phones: (b.r.phones as string[]) || [] })),
    prepared,
  );

  // New Lead / Referral meetings: Lead type, Sat? / Outcome, Agent and Location from the calendar schedule sheet.
  const nlBase = base.filter((b) => isNl(b.r) && b.ymd >= from && b.ymd <= to);
  let schedByAppt = new Map<string, ScheduleRow>();
  if (nlBase.length) {
    const w = await ensureSchedule(false);
    if (w) warnings.push(w);
    const sched = await loadScheduleRows(addDays(from, -4), addDays(to, 4));
    schedByAppt = matchSchedule(nlBase.map((b) => ({ id: String(b.r.appointment_id), ymd: b.ymd, name: b.name, phones: (b.r.phones as string[]) || [] })), sched);
  }
  const agentOf = nameMatcher(callCentre.map((e) => staffByEmail.get(e.toLowerCase()) || emailName(e)), aliases);

  const now = Date.now();
  const mine = (assigned: unknown) => viewer.recorder || viewer.consultantIds.includes(String(assigned || ''));
  const meetings: ReviewMeeting[] = base
    .filter((b) => b.ymd >= from && b.ymd <= to && mine(b.r.assigned_user_id))
    .map(({ r, startIso, t, ymd, name }) => {
      const status = String(r.ghl_status || '');
      const dbOutcome = r.outcome ? String(r.outcome) : null;
      const ghlOutcome = GHL_OUTCOME[status] || null;
      const nl = isNl(r);
      const sr = nl ? schedByAppt.get(String(r.appointment_id)) : undefined;
      const schedOutcome = sr ? scheduleOutcome(sr, t <= Date.now()) : null;
      const outcomeSource: OutcomeSource | null = dbOutcome ? (r.source === 'sheet' ? 'sheet' : 'tool') : schedOutcome ? 'schedule' : ghlOutcome ? 'ghl' : null;
      const m = nl ? undefined : matches.get(String(r.appointment_id));
      const ev = m ? eventById.get(m.eventId) : undefined;
      const consEmail = userEmail.get(String(r.assigned_user_id || ''));
      const bookerEmail = ev?.attendees.map((a) => a.email).find((e) => cc.has(e) && e !== consEmail) || null;
      const leadType: LeadType = !nl ? 'PR'
        : ymd < LEAD_SPLIT_FROM || !sr ? 'Unknown'
        : /^referr?al/i.test(sr.lead) ? 'Referral'
        : /^new lead/i.test(sr.lead) ? 'New Lead'
        : 'Unknown';
      return {
        id: String(r.appointment_id),
        calendar: String(r.calendar_name),
        kind: nl ? ('NL' as const) : ('PR' as const),
        leadType,
        schedule: sr ? { tab: sr.tab, lead: sr.lead, sat: sr.sat, outcome: sr.outcome, agent: sr.agent, location: sr.location } : null,
        start: startIso,
        ymd,
        past: t <= now,
        contactId: String(r.contact_id || ''),
        // * = GHL wouldn't return the contact, so the name is the appointment title (explained in Settings).
        contactName: r.contact_name ? name : `${name || '(no name)'}*`,
        contactEmail: String(r.contact_email || ''),
        selfBooked: !!r.created_by && r.created_by === r.assigned_user_id,
        contactLink: r.contact_id && loc ? `https://app.gohighlevel.com/v2/location/${loc}/contacts/detail/${r.contact_id}` : '',
        consultantId: String(r.assigned_user_id || ''),
        consultant: userName.get(String(r.assigned_user_id || '')) || '(unassigned)',
        ghlStatus: GHL_STATUS[status] || status,
        title: String(r.title || ''),
        outcome: dbOutcome || schedOutcome || ghlOutcome,
        outcomeSource,
        invalidReason: dbOutcome ? (r.invalid_reason as string | null) : null,
        note: (r.note as string | null) || null,
        sourceRef: dbOutcome ? (r.source_ref as string | null) || null : schedOutcome && sr ? `Calendar schedule sheet, tab "${sr.tab}": ${[sr.sat, sr.outcome].filter(Boolean).join(' / ')}` : null,
        recordedBy: dbOutcome ? String(r.recorded_by) : null,
        recordedAt: dbOutcome ? iso(r.recorded_at) : null,
        gcal: m && ev ? { event: toEvent(ev), basis: m.basis, minutesApart: m.minutesApart } : null,
        booker: nl ? (sr?.agent ? agentOf(sr.agent) : null) : bookerEmail ? staffByEmail.get(bookerEmail) || emailName(bookerEmail) : null,
        bookerEmail,
        mode: nl ? scheduleMode(sr?.location || '') : ev ? meetingMode(locationOf.get(ev.id) || '') : 'Unknown',
      };
    });

  const matchedIds = new Set([...matches.values()].map((m) => m.eventId));
  const lo = from < MIN_YMD ? MIN_YMD : from;
  const gcalUnmatched = prepared
    .filter((e) => e.ymd >= lo && e.ymd <= to && !matchedIds.has(e.id) && (viewer.recorder || e.staffEmails.includes(viewer.email)))
    .sort((a, b) => a.t - b.t)
    .map(toEvent);

  return { meetings, gcalUnmatched, consultants: [...new Set(meetings.map((m) => m.consultant))].sort(), warnings };
}
