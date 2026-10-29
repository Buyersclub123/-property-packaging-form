import { phoneKey } from './sync';

// GHL appointment <-> Google Calendar event matching, same rules as Portfolio reviews v2 (Devin).xlsx:
// client email (attendee vs GHL contact email), else mobile, else name, within +-3 days; best pairs first, one-to-one.

const WINDOW_DAYS = 3;
const DAY = 864e5;

const STOP = new Set(['pr', 'smsf', 'pers', 'personal', 'trust', 'pty', 'ltd', 'and', 'the', 'mr', 'mrs', 'ms', 'dr', 'super', 'fund', 'family', 'ip', 'repeat']);
const nameTokens = (s: string) =>
  String(s || '').toLowerCase().replace(/\bip\s*\d+\b/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

export function nameScore(a: string, b: string): number {
  const A = nameTokens(a);
  const B = nameTokens(b);
  if (!A.length || !B.length) return 0;
  const sa = new Set(A);
  const sb = new Set(B);
  const common = [...sa].filter((w) => sb.has(w)).length;
  const [small, big] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  if ([...small].every((w) => big.has(w))) return small.size >= 2 ? 3 : 2;
  if (common >= 2) return 2;
  if (common === 1 && A[0] === B[0] && A[0].length > 2) return 1;
  return 0;
}

const MOBILE = /(?:\+?61\s?|0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
const STAFF = /@buyersclub\.com\.au$/i;
const NOT_PERSON = /calendar\.google\.com$|^info@buyersclub/i;
const GWORDS = /\b(confirmed|buyers|club|annual|portfolio|reviews?|property|meeting|google|meet|online|complimentary|catch|up|follow|with|zoom|call|phone|office|in|person|pty|ltd|booked|by)\b/gi;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface MatchMeeting { id: string; t: number; ymd: string; name: string; email: string; phones: string[] }

export interface RawGcal {
  id: string;
  t: number;
  allDay: boolean;
  ymd: string;
  summary: string;
  description: string;
  organizer: string;
  attendees: { email: string; name: string }[];
}

export interface PreparedGcal extends RawGcal { clientEmails: string[]; phones: string[]; name: string; staffEmails: string[] }

export function prepareGcal(events: RawGcal[], staffNames: string[]): PreparedGcal[] {
  const names = [...new Set(staffNames.filter((n) => n && n.includes(' ')))].sort((a, b) => b.length - a.length);
  const phonesIn = (s: string) => (s.match(MOBILE) || []).map(phoneKey).filter(Boolean);
  const freq: Record<string, number> = {};
  for (const e of events) new Set(phonesIn(`${e.summary} ${e.description}`)).forEach((p) => (freq[p] = (freq[p] || 0) + 1));
  const cleanTitle = (s: string) => {
    let x = s.replace(/booked by.*$/i, ' ').replace(MOBILE, ' ').replace(/\bw\/\s*\w+/gi, ' ');
    for (const n of names) x = x.split(new RegExp(`\\bwith\\s+${esc(n)}\\b`, 'i')).join(' ');
    return x.replace(GWORDS, ' ').replace(/\s+/g, ' ').trim();
  };
  return events.map((e) => {
    const people = e.attendees.map((a) => a.email);
    return {
      ...e,
      clientEmails: people.filter((m) => m && !STAFF.test(m) && !NOT_PERSON.test(m)),
      staffEmails: [...new Set([...people, e.organizer].filter((m) => m && STAFF.test(m) && !NOT_PERSON.test(m)))],
      phones: [...new Set(phonesIn(`${e.summary} ${e.description}`).filter((p) => freq[p] <= 15))],
      name: cleanTitle(e.summary),
    };
  });
}

export interface MatchResult { eventId: string; basis: string; minutesApart: number | null }

export function matchMeetings(meetings: MatchMeeting[], events: PreparedGcal[]): Map<string, MatchResult> {
  const byDay = new Map<string, PreparedGcal[]>();
  for (const e of events) byDay.set(e.ymd, [...(byDay.get(e.ymd) || []), e]);
  const pairs: { m: MatchMeeting; e: PreparedGcal; basis: string; score: number; minutes: number | null }[] = [];
  for (const m of meetings) {
    const mt = Date.parse(m.ymd);
    for (let d = -WINDOW_DAYS; d <= WINDOW_DAYS; d++) {
      const ymd = new Date(mt + d * DAY).toISOString().slice(0, 10);
      for (const e of byDay.get(ymd) || []) {
        const em = !!m.email && e.clientEmails.includes(m.email.toLowerCase());
        const ph = e.phones.some((p) => m.phones.includes(p));
        const ns = nameScore(e.name, m.name);
        if (!em && !ph && ns < 2) continue;
        const minutes = e.allDay ? null : Math.round(Math.abs(e.t - m.t) / 60e3);
        pairs.push({
          m, e, minutes,
          basis: [em && 'Email', ph && 'Phone', ns && 'Name'].filter(Boolean).join(' + '),
          score: (em ? 20 : 0) + (ph ? 10 : 0) + ns * 2 - Math.abs(d) - (minutes === null ? 0.5 : Math.min(minutes, 1440) / 2880),
        });
      }
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const usedM = new Set<string>();
  const usedE = new Set<string>();
  const out = new Map<string, MatchResult>();
  for (const p of pairs) {
    if (usedM.has(p.m.id) || usedE.has(p.e.id)) continue;
    usedM.add(p.m.id);
    usedE.add(p.e.id);
    out.set(p.m.id, { eventId: p.e.id, basis: p.basis, minutesApart: p.minutes });
  }
  return out;
}
