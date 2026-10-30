// Portfolio Review outcomes tool (portfolio backlog item 14) - shared types. Phase 1 stores outcomes in the app DB only.

export const MIN_YMD = '2024-07-01';
export const TOOL_HREF = '/review-outcomes';
export const RECORDERS_GROUP = 'Review recorders';
export const DISCREPANCY_MINUTES = 15;

export type WriteTarget = 'db' | 'db+ghl';

export type MeetingMode = 'Google' | 'F2F' | 'Unknown';

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
  writeTarget: WriteTarget;
  /** Phase 2 (write-back to GHL) is not approved; the switch stays greyed out while false. */
  phase2Approved: boolean;
}

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
  writeTarget: 'db',
  phase2Approved: false,
};

export type OutcomeSource = 'tool' | 'sheet' | 'ghl';

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
  start: string;
  ymd: string;
  past: boolean;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactLink: string;
  consultantId: string;
  consultant: string;
  ghlStatus: string;
  title: string;
  outcome: string | null;
  outcomeSource: OutcomeSource | null;
  invalidReason: string | null;
  note: string | null;
  sourceRef: string | null;
  recordedBy: string | null;
  recordedAt: string | null;
  gcal: GcalMatch | null;
  /** Call Centre person on the matched Google invite; null when none is on it. */
  booker: string | null;
  bookerEmail: string | null;
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
