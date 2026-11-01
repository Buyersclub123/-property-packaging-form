// Turns CTRT API records into the data the Journey Map mock-up renders (read-only).
type Rec = Record<string, string | undefined>;

const CONTRACT = ['Deal Closed', 'Contract Review', 'Exchange WIP', 'Conditional', 'Unconditional', 'Settled'];
const FINANCE = ['Pending finance', 'Valuation ordered', 'Application lodged', 'Formally approved'];
const BUILD = ['Pre-BA', 'BA Issued', 'Slab', 'Frame / Plate Height', 'Enclosed / Roof Cover', 'Tiling / Lock-up', 'Fixing / Plastering', 'Practical Completion', 'Landscaping pending', 'Handover'];
const PROP_PREFIX = ['01', '02', '03', '04', '08'];
const SALES_STAGES: { name: string; phase: string; match: string }[] = [
  { name: 'Onboarding', phase: 'property', match: 'Onboarding' },
  { name: 'Buying Brief', phase: 'property', match: 'Buying Brief' },
  { name: 'Proposals', phase: 'property', match: 'Proposals' },
  { name: 'EOI accepted (deal closed)', phase: 'property', match: 'Deal Closed' },
  { name: 'Contract review', phase: 'contract', match: 'Contract Review' },
  { name: 'Exchange WIP', phase: 'contract', match: 'Exchange WIP' },
  { name: 'Conditional', phase: 'contract', match: 'Conditional' },
  { name: 'Unconditional', phase: 'contract', match: 'Unconditional' },
  { name: 'Settled', phase: 'contract', match: 'Settled' },
  { name: 'On Hold', phase: 'outside', match: 'On Hold' },
];

const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const yes = (v?: string) => !!v && !/^(no|false|0|n)$/i.test(v.trim());
const num = (v?: string) => { const n = parseFloat((v || '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : null; };
const sydney = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);

/** YYYY-MM-DD (Sydney) for a date or timestamp field; '' when blank. */
function day(v?: string): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : sydney(d);
}
function daysSince(today: string, v?: string): number | null {
  const d = day(v);
  if (!d) return null;
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(d)) / 86400000));
}
const intOrNull = (v?: string) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)));

function contractIndex(r: Rec, today: string): number {
  if (norm(r.pipelineName) === 'propertyteam') {
    const s = norm(r.pipelineStage);
    if (s === 'settled') return 6;
    return CONTRACT.findIndex((x) => norm(x) === s); // before Deal Closed (Onboarding, Proposals, On Hold…) = -1
  }
  // Opps still in the old Finance / Construction pipelines: position from the deal facts.
  const settle = day(r.confirmedSettlementDate);
  if ((r.co_status || '').startsWith('04') || (settle && settle <= today)) return 6;
  if (r.unconditionalDate) return 4;
  if (r.exchangeDate || (r.co_status || '').startsWith('03')) return 3;
  return 2;
}

function valuation(r: Rec) {
  const steps = [
    r.valuationAccessEstimate || r.valuationExpectedAccessDate,
    yes(r.valuationAccessAvailable) ? 'y' : '',
    yes(r.valuationRequested) || r.valuationRequestedDate ? 'y' : '',
    r.valuationBookedDate,
    yes(r.valuationAttended) || r.valuationAttendedDate ? 'y' : '',
    r.valuationOutcome,
  ];
  let last = -1;
  steps.forEach((v, i) => { if (v) last = i; });
  return {
    valStep: last < 0 ? -1 : last + 1,
    short: yes(r.valuationShortfall) || /shortfall/i.test(r.valuationOutcome || ''),
    valDate: day(r.valuationRequestedDate || r.valuationBookedDate || r.valuationAttendedDate || r.valuationExpectedAccessDate),
  };
}

function toOpp(r: Rec, today: string) {
  const hasPr = !!r.propertyRecordIds;
  const type = !hasPr ? 'nopr' : r.co_property_type === 'established' ? 'est' : r.co_contract_type === 'split_contract' ? 'split' : 'single';
  const fs = r.financeStatus || '';
  const fin = !fs ? undefined : norm(fs) === 'nottracked' ? null : norm(fs) === 'formallyapproved' ? 4 : FINANCE.findIndex((x) => norm(x) === norm(fs));
  const build = r.co_construction_stage ? BUILD.findIndex((x) => norm(x) === norm(r.co_construction_stage)) : undefined;
  const c = contractIndex(r, today);
  const addr = r.co_property_address || '';
  const missing: string[] = [];
  if (!hasPr) missing.push('Property Record');
  if (hasPr && !addr) missing.push('Address');
  if (fin === undefined) missing.push('Finance status');
  if ((type === 'split' || type === 'single') && c >= 6 && build === undefined) missing.push('Construction stage');
  const prices: [string, number | null][] = type === 'split'
    ? [['Land price', num(r.co_closing_price_land)], ['Build price', num(r.co_closing_price_build)]]
    : [[type === 'single' ? 'Total price' : 'Price', num(r.co_closing_price)]];
  return {
    ref: r.id || '',
    name: r.opportunityName || r.name || '',
    client: r.contactName || '',
    type, c, fin, build,
    prop: PROP_PREFIX.indexOf((r.co_status || '').slice(0, 2)),
    addr,
    consultant: r.owner || r.assignedTo || '',
    ba: r.assignedBA || '',
    ghlLink: r.ghlLink || '',
    reselling: yes(r.co_reselling),
    days: {
      contract: norm(r.pipelineName) === 'propertyteam' ? intOrNull(r.daysSinceStageChange) : null,
      finance: intOrNull(r.daysInFinanceStatus),
      build: intOrNull(r.daysInConstructionStage),
      prop: daysSince(today, r.co_status_change_date),
    },
    ...valuation(r),
    finDue: day(r.financeDueDate),
    settle: day(r.confirmedSettlementDate),
    prices,
    landReg: r.co_land_registration || '',
    bp: r.bpConditionStatus || '',
    pci: r.preSettlementInspectionStatus || '',
    missing,
  };
}

const stageRow = (r: Rec, date?: string, land = false) => ({
  date: day(date), client: r.contactName || '', ref: r.opportunityName || r.name || '',
  lot: r.co_property_address || r.registeredAddress || '', consultant: r.owner || r.assignedTo || '', ba: r.assignedBA || '', land,
});

export function buildJourneyData(records: Rec[]) {
  const today = sydney(new Date());
  const isFallen = (r: Rec) => yes(r.dealFallenOver) || !!r.dealFallenOverDate;
  const inFlight = records.filter((r) => !isFallen(r) && (r.propertyRecordIds || r.financeStatus));
  const fallen = records.filter(isFallen).map((r) => {
    const o = toOpp(r, today);
    const fell = typeof o.fin === 'number' && o.fin < 4 && o.c >= 3
      ? { lane: 'finance', i: Math.max(0, o.fin) }
      : { lane: 'contract', i: Math.min(5, Math.max(0, o.c)) };
    return { ...o, fell, reason: r.dealFallenOverReason || 'Reason not set', date: day(r.dealFallenOverDate) };
  });
  const pt = records.filter((r) => norm(r.pipelineName) === 'propertyteam');
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    today,
    opps: inFlight.map((r) => toOpp(r, today)),
    fallen,
    stages: SALES_STAGES.map((s) => ({
      id: 'pt-' + norm(s.name), phase: s.phase, name: s.name, kind: 'opp',
      rows: pt.filter((r) => norm(r.pipelineStage) === norm(s.match)).map((r) => stageRow(r, r.lastStageChangeAt)),
    })),
    build: BUILD.map((name) => ({
      id: 'b-' + norm(name), phase: 'build', name, kind: 'property',
      rows: inFlight.filter((r) => r.co_property_type !== 'established' && norm(r.co_construction_stage) === norm(name))
        .map((r) => stageRow(r, r.co_construction_stage_change_date)),
    })),
    finance: FINANCE.map((name) => ({
      id: 'f-' + norm(name), phase: 'finance', name, kind: 'fin', hasLand: true,
      rows: inFlight.filter((r) => norm(r.financeStatus) === norm(name))
        .map((r) => stageRow(r, r.financeStatusChangeDate, /^registered$/i.test(r.co_land_registration || ''))),
    })),
    consultants: uniq(records.map((r) => r.owner || r.assignedTo || '')),
    bas: uniq(records.map((r) => r.assignedBA || '')),
  };
}
