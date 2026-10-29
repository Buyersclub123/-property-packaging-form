import { addDays, DEFAULT_SETTINGS, sydYmd, type ClientPanel, type GcalEvent, type ReviewData, type ReviewMeeting } from './types';

// Demo mode: 20 made-up meetings around today. Edits stay in the browser; nothing touches the DB, GHL or Google.

const CLIENTS = [
  'Alex Demo', 'Bella Sample', 'Chris Example', 'Dana Testcase', 'Eli Placeholder', 'Fiona Mockup', 'George Dummy', 'Hana Trial',
  'Ivan Prototype', 'Jade Sandbox', 'Kai Specimen', 'Lena Fictional', 'Milo Pretend', 'Nina Madeup', 'Omar Practice', 'Pia Rehearsal',
  'Quinn Instance', 'Rosa Template', 'Sam Exercise', 'Tara Drill',
];
const CONSULTANTS = ['Demo Consultant A', 'Demo Consultant B', 'Demo Consultant C'];
const SUBURBS = ['Ipswich QLD', 'Geelong VIC', 'Elizabeth SA', 'Logan QLD', 'Penrith NSW', 'Armadale WA'];
const PAST_OUTCOMES: (string | null)[] = ['Showed', null, 'No show', 'Showed', 'Invalid (DNQ)', null, 'Cancelled', 'Showed', 'Not sat', null, 'Rescheduled'];

function at(ymd: string, hour: number, min = 0): string {
  return new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+10:00`).toISOString();
}

export function demoData(): ReviewData {
  const today = sydYmd(Date.now());
  const now = Date.now();
  const meetings: ReviewMeeting[] = CLIENTS.map((name, i) => {
    const ymd = addDays(today, (i % 9) - 5);
    const start = at(ymd, 9 + (i % 7), i % 2 ? 30 : 0);
    const past = Date.parse(start) <= now;
    const cons = CONSULTANTS[i % 3];
    const outcome = past ? PAST_OUTCOMES[i % PAST_OUTCOMES.length] : null;
    const src = !outcome ? null : i % 4 === 0 ? 'sheet' : i % 4 === 1 ? 'ghl' : 'tool';
    const hasG = i % 6 !== 3;
    const gStart = i % 7 === 2 ? new Date(Date.parse(start) + 45 * 60e3).toISOString() : start;
    const gcal: GcalEvent = {
      id: `demo-g${i}`, start: gStart, allDay: false, ymd, title: `Portfolio Review with Buyers Club with ${name}`,
      staff: cons, staffEmails: [], calendars: [cons],
    };
    return {
      id: `demo-${i}`, calendar: i % 5 === 4 ? 'Portfolio Review 2nd Meeting' : 'Portfolio Review Meeting', start, ymd, past,
      contactId: `demo-c${i}`, contactName: name, contactEmail: `${name.split(' ')[0].toLowerCase()}@example.com`, contactLink: '',
      consultantId: `demo-u${i % 3}`, consultant: cons, ghlStatus: src === 'ghl' && outcome ? outcome.replace(' (DNQ)', '') : 'Confirmed', title: '',
      outcome, outcomeSource: src as ReviewMeeting['outcomeSource'],
      invalidReason: outcome === 'Invalid (DNQ)' ? 'Not ready' : null, note: null, sourceRef: src === 'sheet' ? 'Demo sheet row' : null,
      recordedBy: outcome && src !== 'ghl' ? 'demo' : null, recordedAt: null,
      gcal: hasG ? { event: gcal, basis: 'Email + Name', minutesApart: Math.round(Math.abs(Date.parse(gStart) - Date.parse(start)) / 60e3) } : null,
    };
  }).sort((a, b) => a.start.localeCompare(b.start));
  const gcalUnmatched: GcalEvent[] = [
    { id: 'demo-gx1', start: at(addDays(today, -2), 14), allDay: false, ymd: addDays(today, -2), title: 'Portfolio Review - Walk-in Client', staff: CONSULTANTS[0], staffEmails: [], calendars: [CONSULTANTS[0]] },
    { id: 'demo-gx2', start: at(addDays(today, -4), 11), allDay: false, ymd: addDays(today, -4), title: 'Portfolio Review catch up - Unknown', staff: CONSULTANTS[2], staffEmails: [], calendars: [CONSULTANTS[2]] },
  ];
  return {
    viewer: { email: 'demo@example.com', recorder: true, consultantIds: [] },
    settings: { ...DEFAULT_SETTINGS },
    from: addDays(today, -5),
    to: addDays(today, 3),
    consultants: CONSULTANTS,
    meetings,
    gcalUnmatched,
    lastSync: null,
    warnings: [],
  };
}

const demoSaved = new Map<string, ClientPanel>();

export function demoPanel(m: ReviewMeeting): ClientPanel {
  const saved = demoSaved.get(m.id);
  if (saved) return saved;
  const n = Number(m.id.replace(/\D/g, '')) || 0;
  const count = (n % 3) + 1;
  return {
    appointmentId: m.id,
    contactName: m.contactName,
    available: true,
    unavailableReason: null,
    note: null,
    properties: Array.from({ length: count }, (_, k) => {
      const price = 450000 + ((n * 37 + k * 91) % 30) * 10000;
      return {
        key: `demo-p${n}-${k}`,
        address: `${10 + n + k} Demo Street, ${SUBURBS[(n + k) % SUBURBS.length]}`,
        purchasePrice: price,
        purchaseDate: `15/0${(k % 9) + 1}/20${19 + k}`,
        valuation: Math.round(price * 1.25 / 1000) * 1000,
        valuationDate: '28/09/2026',
        inFlight: false,
        fellOver: false,
        check: null,
      };
    }),
  };
}

export function saveDemoPanel(p: ClientPanel): void {
  demoSaved.set(p.appointmentId, p);
}
