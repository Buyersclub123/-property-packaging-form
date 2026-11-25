import { google } from 'googleapis';
import { ghlFetch } from './ghlFetch';
import { getDb } from './db';
import { PIPELINE_ID } from './ghlPipelines';
import { searchGhlOpportunities } from './ghlOpportunitySearch';
import { calendarAuth, REVIEW_CALENDARS, type GhlUser } from './reviewOutcomes/sync';
import { matchMeetings, prepareGcal, type RawGcal } from './reviewOutcomes/match';
import { meetingSourceOf, meetingSourceTitle, type Attribution } from './reviewOutcomes/meetingSource';
import { sydYmd } from './reviewOutcomes/types';

type Contact = { id: string; firstName?: string; lastName?: string; name?: string; email?: string; phone?: string; source?: string; attributionSource?: Attribution; lastAttributionSource?: Attribution };
type Appointment = { id: string; calendarId?: string; contactId?: string; assignedUserId?: string; startTime: string; appointmentStatus?: string; appoinmentStatus?: string; deleted?: boolean };
type Opportunity = { id: string; name?: string; contactId?: string; assignedTo?: string; customFields?: { id: string; fieldValue?: unknown; fieldValueDate?: unknown; value?: unknown }[] };
export type JourneyMeeting = { id: string; at: string; date: string; client: string; calendar: string; consultant: string; outcome: string; meetingSource: string; meetingSourceTip: string };

async function ghl<T>(path: string, version = '2021-07-28'): Promise<T> {
  const response = await ghlFetch(`${process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'}${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`, Version: version },
  }, 'journey-live-sales');
  if (!response.ok) throw new Error(`Journey live source ${path.split('?')[0]}: HTTP ${response.status}`);
  return response.json();
}

async function each<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i]); }
  }));
  return results;
}
const contactName = (c?: Contact) => c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || '' : '';
const outcome = (value: string) => {
  const key = value.toLowerCase().replace(/[^a-z]/g, '');
  return /^(showed|show|sat)$/.test(key) ? 'Showed' : /^(noshow|notsat)$/.test(key) ? 'No-show'
    : key.startsWith('cancel') ? 'Cancelled' : key.startsWith('invalid') ? 'Invalid' : '';
};

/** This database table contains recorded staff decisions, not a copy of GHL.
 * Only staff-entered outcomes may override the appointment's current GHL status. */
async function staffOutcomes(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await getDb()`SELECT appointment_id, outcome FROM review_outcomes WHERE source = 'tool'
    AND appointment_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
  return new Map(rows.map(r => [String(r.appointment_id), String(r.outcome || '')]));
}

/** Independent live reads for Journey. No review_meetings/review_contacts mirrors,
 * saved sign-up payloads, weekly contact refreshes, or last-good fallbacks. */
export async function loadJourneySalesLive(start: Date, end: Date, users: GhlUser[]) {
  const location = process.env.GHL_LOCATION_ID || '';
  const userNames = new Map(users.map(u => [u.id, u.name]));
  const userEmails = new Map(users.map(u => [u.id, u.email]));
  // Shared only within this request, so each contact is read once for this report.
  const contacts = new Map<string, Promise<Contact>>();
  const contact = (id: string) => {
    if (!contacts.has(id)) contacts.set(id, ghl<{ contact: Contact }>(`/contacts/${encodeURIComponent(id)}`).then(r => {
      if (!r.contact) throw new Error(`GHL returned no contact for ${id}`);
      return r.contact;
    }));
    return contacts.get(id)!;
  };
  const [calendars, opportunities, fields] = await Promise.all([
    each(REVIEW_CALENDARS, async cal => {
      const query = new URLSearchParams({ locationId: location, calendarId: cal.id, startTime: String(start.getTime()), endTime: String(end.getTime()) });
      const data = await ghl<{ events: Appointment[] }>(`/calendars/events?${query}`, '2021-04-15');
      if (!Array.isArray(data.events)) throw new Error(`GHL returned no event list for ${cal.name}`);
      return data.events.filter(e => !e.deleted).map(e => ({ ...e, calendarId: cal.id, calendarName: cal.name }));
    }),
    searchGhlOpportunities<Opportunity>([{ field: 'pipeline_id', operator: 'eq', value: PIPELINE_ID.PROPERTY_TEAM }], 'journey-signups'),
    ghl<{ customFields: { id: string; fieldKey?: string }[] }>(`/locations/${location}/customFields?model=opportunity`),
  ]);
  const events = calendars.flat();
  const entered = await staffOutcomes(events.map(e => e.id));
  const meetings = await each(events, async e => {
    const c = e.contactId ? await contact(e.contactId) : undefined;
    const source = c ? meetingSourceOf(c.lastAttributionSource, c.attributionSource, c.source || null) : null;
    return {
      id: e.id, at: e.startTime, date: sydYmd(e.startTime), client: contactName(c), calendar: e.calendarName,
      consultant: userNames.get(e.assignedUserId || '') || '',
      outcome: outcome(entered.get(e.id) || e.appointmentStatus || e.appoinmentStatus || ''),
      meetingSource: source?.label || '', meetingSourceTip: source ? meetingSourceTitle(source.level, source.detail) : '',
      contact: c,
    };
  });

  const cal = google.calendar({ version: 'v3', auth: calendarAuth() });
  const targets = new Set<string>();
  let pageToken: string | undefined;
  do {
    const result = await cal.calendarList.list({ maxResults: 250, pageToken }).catch(() => {
      throw new Error('Google Calendar list could not be read live');
    });
    for (const c of result.data.items || []) if (c.id) targets.add(c.id);
    pageToken = result.data.nextPageToken || undefined;
  } while (pageToken);
  for (const e of events) { const email = userEmails.get(e.assignedUserId || ''); if (email) targets.add(email); }
  const googleEvents = new Map<string, RawGcal>();
  await each([...targets], async calendarId => {
    let token: string | undefined;
    do {
      const result = await cal.events.list({ calendarId, q: 'Portfolio Review', singleEvents: true, showDeleted: true,
        maxResults: 2500, timeMin: start.toISOString(), timeMax: end.toISOString(), pageToken: token }).catch(() => {
        throw new Error(`Google Calendar could not be read live: ${calendarId}`);
      });
      for (const e of result.data.items || []) {
        if (!e.id || !e.start?.dateTime) continue;
        googleEvents.set(e.id, {
          id: e.id, t: Date.parse(e.start.dateTime), ymd: sydYmd(e.start.dateTime), allDay: false,
          summary: e.summary || '', description: e.description || '', organizer: e.organizer?.email || '',
          attendees: (e.attendees || []).map(a => ({ email: a.email || '', name: a.displayName || '' })),
          cancelled: e.status === 'cancelled',
        });
      }
      token = result.data.nextPageToken || undefined;
    } while (token);
  });
  const prepared = prepareGcal([...googleEvents.values()], users.map(u => u.name));
  const matches = matchMeetings(meetings.filter(m => m.calendar === 'Portfolio Review Meeting').map(m => ({
    id: m.id, t: Date.parse(m.at), ymd: m.date, name: m.client, email: m.contact?.email || '', phones: m.contact?.phone ? [m.contact.phone] : [],
  })), prepared);
  const matched = new Set([...matches.values()].map(m => m.eventId));
  const emails = new Map(users.map(u => [u.email.toLowerCase(), u.name]));
  const meetingRows: JourneyMeeting[] = [
    ...meetings.map(({ contact: _contact, ...m }) => m),
    ...prepared.filter(e => !matched.has(e.id)).map(e => ({
      id: `gcal:${e.id}`, at: new Date(e.t).toISOString(), date: e.ymd, client: e.name,
      calendar: 'Google Calendar · Portfolio Review', consultant: e.staffEmails.map(email => emails.get(email) || '').filter(Boolean).join(', '),
      outcome: e.cancelled ? 'Cancelled' : '', meetingSource: '', meetingSourceTip: '',
    })),
  ];

  const signedId = fields.customFields?.find(f => f.fieldKey === 'opportunity.date_signed_up')?.id;
  if (!signedId) throw new Error('GHL Date signed up field is missing');
  const signups = new Map<string, { opp: Opportunity; signed: string }>();
  for (const opp of opportunities) {
    const f = opp.customFields?.find(f => f.id === signedId);
    const raw = String(f?.fieldValueDate ?? f?.fieldValue ?? f?.value ?? '');
    const signed = /^\d+$/.test(raw) ? new Date(Number(raw)).toISOString().slice(0, 10) : raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(signed) || signed < sydYmd(start) || signed > sydYmd(end)) continue;
    const key = `${opp.contactId || opp.id}|${signed}`;
    if (!signups.has(key)) signups.set(key, { opp, signed });
  }
  const opps = await each([...signups.values()], async ({ opp, signed }) => {
    const c = opp.contactId ? await contact(opp.contactId) : undefined;
    const data = opp.contactId ? await ghl<{ events: Appointment[] }>(`/contacts/${encodeURIComponent(opp.contactId)}/appointments`) : { events: [] };
    if (!Array.isArray(data.events)) throw new Error('GHL returned no contact appointment list');
    const entered = await staffOutcomes(data.events.map(e => e.id));
    const sat = data.events.filter(e => !e.deleted && e.calendarId === 'OfHMBFJUzIEMAx7UGZrR' && sydYmd(e.startTime) <= signed
      && !['No-show', 'Cancelled', 'Invalid'].includes(outcome(entered.get(e.id) || e.appointmentStatus || e.appoinmentStatus || '')))
      .map(e => sydYmd(e.startTime)).sort().pop() || '';
    const source = c ? meetingSourceOf(c.lastAttributionSource, c.attributionSource, c.source || null) : null;
    return { id: opp.id, created: signed, name: opp.name || '', client: contactName(c), contactId: opp.contactId || '',
      consultant: userNames.get(opp.assignedTo || '') || '', sat, meetingSource: source?.label || '' };
  });
  return { meetings: meetingRows, opps };
}
