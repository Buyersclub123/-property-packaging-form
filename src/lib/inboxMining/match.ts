import type { Facts, MatchResult, ThreadMemoryRow } from './types';
import { INBOX_PIPELINES, recordText, type Opp, type PropRecord } from './ghl';
import { trackerRowsFor, type Trackers } from './trackers';
import { findByParcel, parcelIdFor } from '@/lib/geoscapeParcel';

const STOP = new Set([
  'pers', 'smsf', 'ip1', 'ip2', 'ip3', 'pty', 'ltd', 'trust', 'the', 'super', 'fund', 'atf', 'and',
  'duplicate', 'land', 'build', 'house', 'dual', 'key', 'new', 'lot', 'mr', 'mrs', 'ms', 'dr',
]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wordIn(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRe(word)}\\b`, 'i').test(text);
}

export function clientNames(oppName: string): { surnames: string[]; firstNames: string[] } {
  const base = oppName.split(/\s+[-–|]\s+|\(/)[0];
  const persons = base
    .split(/\s*(?:&|\band\b|,|\/)\s*/i)
    .map((p) => p.trim().split(/\s+/).filter((w) => /^[A-Za-z'’-]{2,}$/.test(w) && !STOP.has(w.toLowerCase())))
    .filter((p) => p.length);
  const surnames = new Set<string>();
  const firstNames = new Set<string>();
  for (const p of persons) {
    if (p.length >= 2) {
      surnames.add(p[p.length - 1]);
      firstNames.add(p[0]);
    } else if (persons.length > 1) {
      firstNames.add(p[0]);
    } else {
      surnames.add(p[0]);
    }
  }
  return { surnames: Array.from(surnames).filter((s) => s.length >= 3), firstNames: Array.from(firstNames) };
}

export function oppLot(o: Opp): string {
  const m = o.registeredAddress.match(/\bLot\s*(\d{1,5}[A-Z]?)\b/i);
  return m ? m[1].toUpperCase() : '';
}

function oppState(o: Opp): string {
  const m = o.registeredAddress.match(/\b(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\b/);
  return m ? m[1] : '';
}

const normName = (o: Opp) => o.name.split(/\s+[-–|]\s+|\(/)[0].trim().toLowerCase();

/** Duplicate Finance + Construction resolve to Finance unless Finance is settled. */
function preferred(group: Opp[]): Opp {
  const fin = group.find((o) => o.pipelineId === INBOX_PIPELINES.finance);
  const con = group.find((o) => o.pipelineId === INBOX_PIPELINES.construction);
  if (fin && con) return /settled/i.test(fin.stageName) || fin.status === 'won' ? con : fin;
  return fin || group.find((o) => o.pipelineId === INBOX_PIPELINES.propertyTeam) || group[0];
}

function linkedRecord(o: Opp, records: PropRecord[], lot: string): { record?: PropRecord; flag?: string } {
  const linked = records.filter((r) => recordText(r, 'linked_opportunity_id') === o.id);
  if (linked.length === 1) return { record: linked[0] };
  if (linked.length > 1) {
    const byLot = lot ? linked.filter((r) => recordText(r, 'lot_number').trim().toUpperCase() === lot) : [];
    if (byLot.length === 1) return { record: byLot[0] };
    return { flag: `${linked.length} Property Records linked to this opportunity` };
  }
  return {};
}

interface Candidate {
  opp: Opp;
  surnames: string[];
  first: boolean;
  lotMatch: boolean;
}

export interface MatchInput {
  facts: Facts;
  haystack: string;
  memory: ThreadMemoryRow | null;
  opps: Opp[];
  records: PropRecord[];
  trackers: Trackers;
}

export async function matchMessage(inp: MatchInput): Promise<MatchResult> {
  const { facts, haystack, memory, opps, records, trackers } = inp;
  const result: MatchResult = { grade: 'UNMATCHED', source: 'none', geoscape: { status: 'not_checked' }, flags: [], trackerEvidence: [] };
  const lot = facts.lot?.value || '';

  let chosen: Candidate | null = null;
  if (memory?.opportunity_id) {
    const opp = opps.find((o) => o.id === memory.opportunity_id);
    if (opp) {
      chosen = { opp, surnames: clientNames(opp.name).surnames, first: true, lotMatch: !!lot && oppLot(opp) === lot };
      result.source = 'thread_memory';
      result.fact1 = `Thread memory (${memory.confirmed_by === 'auto' ? 'auto' : `confirmed by ${memory.confirmed_by}`})`;
    } else {
      result.flags.push(`Thread memory points to opportunity ${memory.opportunity_id}, which is not in the live pipelines`);
    }
  }

  if (!chosen) {
    const cands: Candidate[] = [];
    for (const opp of opps) {
      const n = clientNames(opp.name);
      const sur = n.surnames.filter((s) => wordIn(haystack, s));
      if (!sur.length) continue;
      cands.push({
        opp,
        surnames: sur,
        first: n.firstNames.some((f) => wordIn(haystack, f)),
        lotMatch: !!lot && oppLot(opp) === lot,
      });
    }
    const groups = new Map<string, Candidate[]>();
    for (const c of cands) groups.set(normName(c.opp), [...(groups.get(normName(c.opp)) || []), c]);
    const deduped: Candidate[] = [];
    groups.forEach((g) => {
      const lotHit = g.filter((c) => c.lotMatch);
      const pool = lotHit.length ? lotHit : g;
      const pick = preferred(pool.map((c) => c.opp));
      deduped.push(pool.find((c) => c.opp.id === pick.id)!);
    });
    const strong = deduped.filter((c) => c.first || c.lotMatch);
    let pool = strong.length ? strong : deduped;
    if (pool.length > 1) {
      const byLot = pool.filter((c) => c.lotMatch);
      const byFirst = pool.filter((c) => c.first);
      if (byLot.length === 1) pool = byLot;
      else if (byFirst.length === 1) pool = byFirst;
    }
    if (pool.length === 0) {
      result.reason = 'No GHL client name found in the email or its documents';
      return result;
    }
    if (pool.length > 1) {
      result.reason = `${pool.length} possible clients: ${pool.slice(0, 5).map((c) => c.opp.name).join('; ')}`;
      return result;
    }
    chosen = pool[0];
    result.source = 'rules';
    result.fact1 = `Name ${chosen.surnames.join('/')}${chosen.first ? ' + first name' : ' (surname only)'} found in email/documents`;
  }

  const opp = chosen.opp;
  result.opportunityId = opp.id;
  result.opportunityName = opp.name;
  result.pipelineName = opp.pipelineName;
  result.stageName = opp.stageName;

  const link = linkedRecord(opp, records, lot);
  if (link.flag) result.flags.push(link.flag);
  result.propertyRecordId = link.record?.id;
  const ghlLot = oppLot(opp) || (link.record ? recordText(link.record, 'lot_number').trim().toUpperCase() : '');
  const ghlLotSource = oppLot(opp) ? `Registered Address "${opp.registeredAddress}"` : 'Property Record lot_number';

  if (!link.record && lot) {
    const sameLot = records.filter(
      (r) =>
        recordText(r, 'lot_number').trim().toUpperCase() === lot &&
        recordText(r, 'suburb_name') &&
        wordIn(`${opp.registeredAddress} ${haystack.slice(0, 5000)}`, recordText(r, 'suburb_name'))
    );
    if (sameLot.length) result.flags.push(`Existing Property Record ${sameLot[0].id} at Lot ${lot} - suggest link, never create`);
  }
  if (/on hold/i.test(opp.stageName)) result.flags.push('On Hold opportunity: should not have an address or linked record');

  const contractState = facts.state?.value || '';
  if (lot && ghlLot && lot !== ghlLot) {
    result.grade = 'HOLD';
    result.fact1 = `Email/contract: Lot ${lot} (${facts.lot!.source})`;
    result.fact2 = `GHL: Lot ${ghlLot} (${ghlLotSource})`;
  } else if (contractState && oppState(opp) && contractState !== oppState(opp)) {
    result.grade = 'HOLD';
    result.fact1 = `Email/contract state: ${contractState} (${facts.state!.source})`;
    result.fact2 = `GHL Registered Address state: ${oppState(opp)}`;
  } else if (/smsf/i.test(opp.name) && facts.landPrice && facts.buildPrice) {
    result.grade = 'HOLD';
    result.fact1 = `SMSF opportunity "${opp.name}" (single contract only)`;
    result.fact2 = `Separate land price ${facts.landPrice.value} and build price ${facts.buildPrice.value}`;
  } else if (lot && ghlLot === lot) {
    result.fact2 = `Lot ${lot} matches GHL (${ghlLotSource})`;
    const state = contractState || oppState(opp);
    const pid = facts.planNumber && facts.planType && state ? parcelIdFor(state, lot, facts.planType.value, facts.planNumber.value) : null;
    if (pid) {
      result.geoscape = await findByParcel(pid);
      result.grade = result.geoscape.status === 'found' ? 'A' : 'B';
    } else {
      result.geoscape = { status: 'not_checked', reason: 'No plan number / state to build a parcel id' };
      result.grade = 'B';
    }
  } else {
    result.grade = 'C';
    result.fact2 = ghlLot ? 'No lot in the email/documents to compare' : 'No GHL lot to compare';
  }

  const surnames = clientNames(opp.name).surnames;
  for (const r of trackerRowsFor(trackers.uncon, surnames)) {
    result.trackerEvidence.push(`Deal status [${r.tab}]: ${r.text.slice(0, 300)}`);
    if (/terminated/i.test(r.tab) && !result.flags.includes('Terminated in tracker')) result.flags.push('Terminated in tracker');
  }
  for (const r of trackerRowsFor(trackers.construction, surnames)) {
    result.trackerEvidence.push(`Construction [${r.tab}]: ${r.text.slice(0, 300)}`);
  }
  return result;
}
