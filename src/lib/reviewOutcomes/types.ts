// Portfolio Review outcomes tool (portfolio backlog item 14) - shared types. Phase 1 stores outcomes in the app DB only.
import type { MeetingSourceLevel } from './meetingSource';

export const MIN_YMD = '2024-07-01';
export const TOOL_HREF = '/team/resources/new-initiatives/review-outcomes';
export const RECORDERS_GROUP = 'Review recorders';
export const DISCREPANCY_MINUTES = 15;

export type WriteTarget = 'db' | 'db+ghl';

export type MeetingMode = 'Google' | 'F2F' | 'Unknown';

/** PR = Portfolio Review Meeting; NL = Presentation Meeting One (New Lead / Referral). */
export type MeetingKind = 'PR' | 'NL';
export type LeadType = 'New Lead' | 'Referral' | 'PR' | 'Unknown';
export const NEW_LEAD_CALENDAR_ID = 'OfHMBFJUzIEMAx7UGZrR';
/** The calendar schedule sheet's LEAD column (New Lead / Referral) is filled from this date; earlier NL meetings are Unknown. */
export const LEAD_SPLIT_FROM = '2026-03-01';

/** The matching row of the team's CALENDAR SCHEDULE sheet (NL meetings only). */
export interface ScheduleInfo {
  tab: string;
  lead: string;
  sat: string;
  outcome: string;
  agent: string;
  location: string;
}

export type StatsKind = 'day' | 'week' | 'month' | 'quarter' | 'ytd' | 'year' | 'all';

/** Scheduled stats email (Settings). Sydney time; nothing is sent while disabled or with no recipients. */
export interface StatsEmailSettings {
  enabled: boolean;
  recipients: string[];
  /** 0 = Sunday ... 5 = Friday. */
  day: number;
  /** Sydney hour, 0-23. */
  hour: number;
  periods: StatsKind[];
  /** Workspace mailbox the email is sent from. */
  sender: string;
  lastSent: string | null;
}

export const DEFAULT_STATS_EMAIL: StatsEmailSettings = {
  enabled: false,
  recipients: [],
  day: 5,
  hour: 8,
  periods: ['week', 'month'],
  sender: 'john.t@buyersclub.com.au',
  lastSent: null,
};

export interface StatTarget {
  booked: number;
  sat: number;
}

export interface ReviewSettings {
  outcomes: string[];
  invalidReasons: string[];
  /** Call Centre staff emails: an invite attendee on this list (not the meeting's consultant) is the booker. */
  callCentre: string[];
  /** Monthly Booked / Sat targets by consultant or booker name (Stats tab). */
  targets: Record<string, StatTarget>;
  /** Tracking-sheet name -> name shown in Stats / Sales (consultants and CC members), e.g. "Adi" -> "Aaditya M". */
  salesAliases: Record<string, string>;
  writeTarget: WriteTarget;
  /** Phase 2 (write-back to GHL) is not approved; the switch stays greyed out while false. */
  phase2Approved: boolean;
  /** Meetings on or after this day use GHL only (no calendar schedule sheet, no imported sheet outcomes). Null = not yet. */
  ghlOnlyFrom: string | null;
  /** The tool's copy of the calendar schedule sheet. Once frozen it is never re-read, so later sheet edits don't change Stats. */
  scheduleCopy: { at: string; rows: number; frozen: boolean } | null;
}

/** Lead source of a sale in the Buyers Club Tracking sheet, grouped as the STATS sheet columns. */
export type SaleSource = 'New Lead' | 'Referral' | 'PR' | 'Self Gen' | 'Repeat' | 'Other' | 'Unknown';
export const SALE_SOURCES: SaleSource[] = ['New Lead', 'Referral', 'PR', 'Self Gen', 'Repeat', 'Other', 'Unknown'];

export interface Sale {
  id: string;
  office: string;
  client: string;
  signed: string;
  /** Revenue = amount paid + balance. */
  fee: number;
  paid: number;
  consultant: string;
  consultantRaw: string;
  cc: string;
  ccRaw: string;
  source: SaleSource;
  sourceRaw: string;
  broker: string;
  smsf: string;
  comments: string;
  phone: string;
  adType: string;
  leadDate: string;
  cancelled: boolean;
  /** Source of the client's last Presentation Meeting One on or before signing (GHL contact matched by phone, else name). */
  meetingSource: string;
  meetingSourceTip: string;
}

export interface SaleCancel {
  id: string;
  client: string;
  signed: string;
  deposit: number;
  refund: number;
  consultant: string;
  office: string;
  processed: string;
  reason: string;
  saleId: string | null;
  /** Fee of the matched sale (0 when the sale isn't found). */
  fee: number;
  source: SaleSource;
  cc: string;
  meetingSource: string;
  meetingSourceTip: string;
}

export interface SalesData {
  sales: Sale[];
  cancels: SaleCancel[];
  offices: string[];
  syncedAt: string | null;
  warnings: string[];
}

export const NOTE_REASONS = ["Can't afford", 'Timing', 'Went elsewhere', 'Rescheduling', 'Other'];
export const NOTE_NEXT_ACTIONS = ['Call to rebook', 'Nurture', 'No action'];

export const DEFAULT_SETTINGS: ReviewSettings = {
  outcomes: ['Showed', 'No show', 'Invalid (DNQ)', 'Cancelled', 'Rescheduled', 'Not sat'],
  invalidReasons: ["Can't afford to buy again", 'Not ready', 'Waiting on a sale', 'Restructure', 'Divorce'],
  // Seeded from staff seen on Portfolio Review invites (JT 31/10: Carmen is a referrer, not Call Centre).
  callCentre: [
    'adrian.p@buyersclub.com.au', 'cooper.r@buyersclub.com.au', 'ethan.l@buyersclub.com.au', 'ethan.w@buyersclub.com.au',
    'mahdi.s@buyersclub.com.au', 'ninos.e@buyersclub.com.au', 'haydar.a@buyersclub.com.au', 'dion.k@buyersclub.com.au',
    'joel.r@buyersclub.com.au', 'aaditya.m@buyersclub.com.au', 'jessica.k@buyersclub.com.au', 'jackson.p@buyersclub.com.au',
    'rupert.e@buyersclub.com.au', 'isabella.k@buyersclub.com.au', 'jerry.h@buyersclub.com.au', 'joshua.o@buyersclub.com.au',
    'omar.n@buyersclub.com.au', 'jonathan.g@buyersclub.com.au', 'amy.y@buyersclub.com.au', 'petra.h@buyersclub.com.au',
  ],
  targets: {},
  // Tracking-sheet nicknames that don't match a GHL / Call Centre name on their own.
  salesAliases: { Aadi: 'Adi Manek', Josh: 'Joshua.O', Jess: 'Jessica.K', 'Caro Surace': 'Carlo Surace' },
  writeTarget: 'db',
  phase2Approved: false,
  ghlOnlyFrom: null,
  scheduleCopy: null,
};

const dmyOf = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

/** "Source of data" text for Settings and Stats. */
export function dataSourceText(s: Pick<ReviewSettings, 'ghlOnlyFrom' | 'scheduleCopy'>): string {
  const copy = s.scheduleCopy?.frozen
    ? `a copy of the CALENDAR SCHEDULE sheet taken on ${dmyOf(s.scheduleCopy.at)} (later edits to the sheet are not reflected)`
    : 'the CALENDAR SCHEDULE sheet (live copy, re-read hourly)';
  return s.ghlOnlyFrom
    ? `Source of data: before ${dmyOf(s.ghlOnlyFrom)}, GHL calendar enhanced with ${copy}. From ${dmyOf(s.ghlOnlyFrom)}, GHL calendar only.`
    : `Source of data: GHL calendar, enhanced with ${copy}.`;
}

/** Where each figure on Stats comes from (Settings and the Stats banner). */
export function dataSourceLines(s: Pick<ReviewSettings, 'ghlOnlyFrom' | 'scheduleCopy'>): string[] {
  const copy = s.scheduleCopy?.frozen ? 'the sheet copy' : 'the CALENDAR SCHEDULE sheet';
  const until = s.ghlOnlyFrom ? ` (before ${dmyOf(s.ghlOnlyFrom)} only)` : '';
  return [
    dataSourceText(s),
    'Meetings, date, consultant and GHL status: GHL Portfolio Review Meeting and Presentation Meeting One calendars (follow-up meetings excluded).',
    `Booker: the Call Centre user who created the GHL appointment, else a Call Centre person on the Google invite, else the Agent on ${copy}${until}. Self-booked = the consultant created it in GHL.`,
    `Sat / DNQ: the outcome recorded in this tool, else ${copy}'s Sat? column for Presentation Meeting One${until}, else the GHL status. Some Portfolio Review outcomes${until} come from a one-off import of the sheet.`,
    `New Lead vs Referral and Google Meet vs face-to-face: ${copy}${until}, from March 2026; GHL has no appointment field for them yet, so otherwise Unknown.`,
    'Meeting Source Stats (Presentation Meeting One): the GHL contact\'s latest attribution (session source · campaign), else its first attribution, else its Lead Source field; the tooltip shows which. Captured on the meeting at the first sync after it is booked; meetings already cached when this was added use the attribution as read then. "Not recorded in GHL" = none of these. Its Sold columns come from GHL, not the Tracking sheet: a sign-up = an opportunity in a post-sale pipeline (Sale Administration onwards) with "Date signed up" set. "Sold" = sign-ups dated in the period, by the Meeting source of the client\'s last Presentation Meeting One on or before signing; "Sold from these meetings" = clients met in the period who have signed up since.',
    'Sold, Cancelled and Revenue: Buyers Club Tracking sheet (read-only, by date signed). Targets: Settings. Sheet check: the team\'s STATS sheet, for comparison only.',
  ];
}

export type OutcomeSource = 'tool' | 'sheet' | 'ghl' | 'schedule';

export interface GcalEvent {
  id: string;
  start: string;
  allDay: boolean;
  ymd: string;
  title: string;
  /** Buyers Club people on the event (organiser / attendees), as names where known. */
  staff: string;
  staffEmails: string[];
  calendars: string[];
  location: string;
  mode: MeetingMode;
  /** Invite cancelled in Google; still counts as the meeting's calendar event (booker / attendees). */
  cancelled?: boolean;
}

export interface GcalMatch {
  event: GcalEvent;
  basis: string;
  /** Minutes between the GHL start and the Google start; null for all-day Google events. */
  minutesApart: number | null;
}

export interface ReviewMeeting {
  id: string;
  calendar: string;
  kind: MeetingKind;
  leadType: LeadType;
  schedule: ScheduleInfo | null;
  /** Created in GHL by the assigned consultant: no outcome needed (still counted in Stats). */
  selfBooked: boolean;
  start: string;
  ymd: string;
  past: boolean;
  contactId: string;
  contactName: string;
  contactEmail: string;
  /** GHL contact's Lead Source field; null = blank. */
  leadSource: string | null;
  /** GHL contact's Referrer field (free text); null = blank. */
  referrer: string | null;
  /** Captured at sync from the contact's attribution (see meetingSource.ts); null = nothing recorded. */
  meetingSource: string | null;
  meetingSourceLevel: MeetingSourceLevel | null;
  meetingSourceDetail: string | null;
  contactLink: string;
  consultantId: string;
  consultant: string;
  ghlStatus: string;
  title: string;
  outcome: string | null;
  outcomeSource: OutcomeSource | null;
  invalidReason: string | null;
  note: string | null;
  noteReason: string | null;
  noteNextAction: string | null;
  noteBy: string | null;
  noteAt: string | null;
  /** GHL contact note the row note was posted as; error if the last post failed. */
  noteGhlId: string | null;
  noteGhlError: string | null;
  /** Confirm toggle on the row (tool DB only). */
  confirmed: boolean;
  confirmedBy: string | null;
  /** TLC tick on the row (tool DB only). */
  tlc: boolean;
  tlcBy: string | null;
  sourceRef: string | null;
  recordedBy: string | null;
  recordedAt: string | null;
  gcal: GcalMatch | null;
  /** Call Centre booker: GHL appointment creator if Call Centre staff, else a Call Centre attendee on the Google invite,
   *  else (NL) the schedule sheet's Agent; null when none is found. */
  booker: string | null;
  bookerEmail: string | null;
  /** 'self' = created in GHL by the consultant, with no Call Centre person on the invite. */
  bookerFrom: 'ghl' | 'invite' | 'self' | 'sheet' | null;
  /** Who created the appointment in GHL (email), whether or not they are Call Centre. */
  createdByEmail: string | null;
  /** From the matched Google event's location: Meet link = Google, street address = F2F. */
  mode: MeetingMode;
}

export interface ReviewViewer {
  email: string;
  recorder: boolean;
  /** GHL users whose email is the viewer's (their own meetings). */
  consultantIds: string[];
}

export interface ReviewData {
  viewer: ReviewViewer;
  settings: ReviewSettings;
  from: string;
  to: string;
  consultants: string[];
  meetings: ReviewMeeting[];
  /** Google 'Portfolio Review' events in the range with no GHL appointment (from MIN_YMD on). */
  gcalUnmatched: GcalEvent[];
  lastSync: { at: string; from: string; to: string } | null;
  warnings: string[];
  /** Google calendars the sync tried, with readable / 403 / 404 status. */
  gcalCalendars: GcalCalendarCheck[];
}

export interface GcalCalendarCheck {
  id: string;
  name: string;
  via: string;
  status: string;
  error: string | null;
  events: number;
  checkedAt: string;
}

export interface ClientProperty {
  key: string;
  address: string;
  purchasePrice: number | null;
  purchaseDate: string;
  valuation: number | null;
  valuationDate: string;
  inFlight: boolean;
  fellOver: boolean;
  /** currentValue / currentValueTo are the From / To ends of the current value range. */
  check: { stillOwned: boolean | null; currentValue: number | null; currentValueTo: number | null; currentRentPw: number | null } | null;
}

export interface ClientPanel {
  appointmentId: string;
  contactName: string;
  available: boolean;
  unavailableReason: string | null;
  properties: ClientProperty[];
  note: string | null;
}

export const sydYmd = (t: string | number | Date): string =>
  new Date(t).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });

export const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** UTC instants that safely cover Sydney days from..to (AEST or AEDT); callers filter by sydYmd. */
// Sydney wall-clock time as a UTC-based ms value (so getUTC* give Sydney's date / hour).
function sydWall(ms: number): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(ms).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}

/** Working minutes (Mon-Fri 9-5 Sydney) from now until the meeting start; stops counting at `cap`. */
export function workingMinutesUntil(startIso: string, now = Date.now(), cap = Infinity): number {
  let a = sydWall(now);
  const b = sydWall(Date.parse(startIso));
  let mins = 0;
  while (a < b && mins < cap) {
    const d = new Date(a);
    const day0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) {
      const s = Math.max(a, day0 + 9 * 3600e3);
      const e = Math.min(b, day0 + 17 * 3600e3);
      if (e > s) mins += (e - s) / 60e3;
    }
    a = day0 + 864e5;
  }
  return mins;
}

export const TLC_LOCK_HOURS = 8;
/** TLC is locked from 8 working hours (Mon-Fri 9-5) before the meeting start (JT 11/11). */
export const tlcLocked = (startIso: string, now = Date.now()) => workingMinutesUntil(startIso, now, TLC_LOCK_HOURS * 60) < TLC_LOCK_HOURS * 60;

export function utcCover(from: string, to: string): { start: Date; end: Date } {
  return {
    start: new Date(Date.parse(`${from}T00:00:00Z`) - 11 * 3600e3),
    end: new Date(Date.parse(`${to}T00:00:00Z`) + 14 * 3600e3),
  };
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
