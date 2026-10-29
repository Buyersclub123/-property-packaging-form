// Portfolio Review outcomes tool (portfolio backlog item 14) - shared types. Phase 1 stores outcomes in the app DB only.

export const MIN_YMD = '2024-07-01';
export const TOOL_HREF = '/review-outcomes';
export const RECORDERS_GROUP = 'Review recorders';
export const DISCREPANCY_MINUTES = 15;

export type WriteTarget = 'db' | 'db+ghl';

export interface ReviewSettings {
  outcomes: string[];
  invalidReasons: string[];
  writeTarget: WriteTarget;
  /** Phase 2 (write-back to GHL) is not approved; the switch stays greyed out while false. */
  phase2Approved: boolean;
}

export const DEFAULT_SETTINGS: ReviewSettings = {
  outcomes: ['Showed', 'No show', 'Invalid (DNQ)', 'Cancelled', 'Rescheduled', 'Not sat'],
  invalidReasons: ["Can't afford to buy again", 'Not ready', 'Waiting on a sale', 'Restructure', 'Divorce'],
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
  check: { stillOwned: boolean | null; currentValue: number | null; currentRentPw: number | null } | null;
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
