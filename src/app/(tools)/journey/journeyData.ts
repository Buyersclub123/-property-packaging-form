// Turns CTRT API records (+ GHL's own stage counts) into the data the Journey Map mock-up renders (read-only).
// Stage rules: GHL Field Run Sheet, tab "Stage definitions" (v2, 1/11).
type Rec = Record<string, string | undefined>;
// Last-7-days snapshot from /api/journey/sales (cached 15 minutes).
export type Sales = {
  asAt: string;
  contacts: { id: string; date: string; name: string; source: string; createdBy: string }[];
  meetings: { id: string; date: string; at: string; client: string; calendar: string; consultant: string; outcome: string; leadSource?: string }[];
  opps: { id: string; created: string; name: string; client: string; consultant: string; leadSource?: string }[];
  duplicates: { id: string; date: string; newContact: string; existing: string; existingCreated: string; createdBy: string; why: string }[];
};
export type Recon = { pipelines: { id: string; name: string; stages: { id: string; name: string; total: number }[] }[] };

const PT_ID = 'zrb34FRmPnbIyAGFDeXJ';
const FIN_ID = 'zgBRaMnACpskyf1wHCEV';
const CON_ID = 'XMKCHlqekS7IU87PNLKB';

const CONTRACT = ['Deal Closed', 'Contract Review', 'Exchange WIP', 'Conditional', 'Unconditional', 'Settled'];
const FINANCE = ['Pending finance', 'Valuation ordered', 'Application lodged', 'Formally approved'];
// Finance Status values (finance_status__residential) and the Finance pipeline stages each one replaces today.
const FINANCE_VALUES: [string, string[]][] = [
  ['Pending finance', ['Unregistered | Pending FInance', 'SMSF /SINGLE CONTRACT', 'No val access', 'Pending Finance']],
  ['Valuation ordered', ['Valuation Ordered']],
  ['Application lodged', ['Application Lodged']],
  ['Formally approved', ['Formal Approval/unregistered', 'Formal Approval']],
  ['Not Tracked', []],
];
// Property Record construction_stage values (key, label) and the Construction pipeline stages each one replaces.
const CONSTRUCTION_VALUES: [string, string, string[]][] = [
  ['preba', 'Pre-BA', ['PRE BA SMSF| IN CONSTRUCTION', 'Pre BA']],
  ['ba_issued', 'BA Issued', ['BA Issued']],
  ['slab', 'Slab', ['Slab']],
  ['frame__plate_height', 'Frame / Plate Height', ['FRAME/PLATE HEIGHT']],
  ['enclosed__roof_cover', 'Enclosed / Roof Cover', ['Enclosed/ ROOF COVER']],
  ['tiling__lockup', 'Tiling / Lock-up', ['TILING/Lock up']],
  ['fixing__plastering', 'Fixing / Plastering', ['Fixing/ PLASTERING']],
  ['practical_completion', 'Practical Completion', ['PRACTICAL COMPLETION']],
  ['landscaping_pending', 'Landscaping pending', ['LANDSCAPING PENDING']],
  ['handover', 'Handover', ['HANDOVER']],
];
const BUILD = CONSTRUCTION_VALUES.map((c) => c[1]);
const PROP_LANE: Record<string, number> = { '01_available': 0, '02_eoi': 1, '03_contr_exchanged': 2, '04_settled': 3, '08_resold': 4 };
// Sales tiles from the mock-up: no data source yet (show 0, "not wired").
const SALES_TILES = [
  { id: 'contacts', name: 'New contacts', short: 'New contacts', kind: 'contact' },
  { id: 'booked', name: 'Sales meetings booked', short: 'Meetings booked', kind: 'meeting', head: 'weekAll', periods: ['today', 'tomorrow', 'weekAll'] },
  { id: 'outcomes', name: 'Sales meeting outcomes', short: 'Outcomes', kind: 'outcome', head: 'lastWeek', periods: ['today', 'lastDay', 'lastWeek', 'lastMonth'] },
  { id: 'newopps', name: 'New opportunities (client sign-up)', short: 'Sales', kind: 'opp' },
];

const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const yes = (v?: string) => !!v && !/^(no|false|0|n)$/i.test(v.trim());
const num = (v?: string) => { const n = parseFloat((v || '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : null; };
const sydney = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Run Sheet rules.
const registered = (r: Rec) => (r.co_land_registration || '') === 'Registered';
const settled = (r: Rec) => yes(r.opp_settlement_confirmed) || r.co_construction_stage === 'handover';
const isFallen = (r: Rec) => yes(r.dealFallenOver) || !!r.dealFallenOverDate;
const isNew = (r: Rec) => r.co_property_type === 'new';
const CHIPS: { id: string; name: string; rule: (r: Rec) => boolean }[] = [
  { id: 'c-unreg-pending', name: 'Unregistered | Pending Finance', rule: (r) => isNew(r) && !registered(r) && r.financeStatus === 'Pending finance' },
  { id: 'c-smsf-single', name: 'SMSF / SINGLE CONTRACT', rule: (r) => /^smsf$/i.test(r.purchasingEntityType || '') && !registered(r) && r.financeStatus === 'Pending finance' },
  { id: 'c-no-val-access', name: 'No val access', rule: (r) => r.financeStatus === 'Pending finance' && !yes(r.valuationAccessAvailable) && !registered(r) },
  { id: 'c-formal-unreg', name: 'Formal Approval/unregistered', rule: (r) => isNew(r) && !registered(r) && r.financeStatus === 'Formally approved' },
];
const CHIP_STAGE: Record<string, string> = {
  'c-unreg-pending': 'Unregistered | Pending FInance', 'c-smsf-single': 'SMSF /SINGLE CONTRACT',
  'c-no-val-access': 'No val access', 'c-formal-unreg': 'Formal Approval/unregistered',
};

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

function contractIndex(r: Rec): number {
  if (r.pipelineId === PT_ID) {
    const s = norm(r.pipelineStage);
    if (s === 'settled') return 6;
    return CONTRACT.findIndex((x) => norm(x) === s); // before Deal Closed (Onboarding, Proposals, On Hold…) = -1
  }
  // Opps still in the old Finance / Construction pipelines: estimated (Run Sheet: Settled = settlement confirmed or Handover).
  if (settled(r) || (r.co_status || '').startsWith('04')) return 6;
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
    valAccess: r.valuationAccessEstimate || r.valuationExpectedAccessDate || '',
    short: yes(r.valuationShortfall) || /shortfall/i.test(r.valuationOutcome || ''),
    valDate: day(r.valuationRequestedDate || r.valuationBookedDate || r.valuationAttendedDate || r.valuationExpectedAccessDate),
  };
}

function toOpp(r: Rec, today: string) {
  // Seller records (08 Resold etc.) link via linked_property_record_id, not the record's own opp association.
  const hasPr = !!r.propertyRecordIds || !!r.co_status;
  const type = !hasPr ? 'nopr' : r.co_property_type === 'established' ? 'est' : r.co_contract_type === 'split_contract' ? 'split' : 'single';
  const fs = r.financeStatus || '';
  const fin = !fs ? undefined : norm(fs) === 'nottracked' ? null : norm(fs) === 'formallyapproved' ? 4 : FINANCE.findIndex((x) => norm(x) === norm(fs));
  const build = r.co_construction_stage ? BUILD.findIndex((x) => norm(x) === norm(r.co_construction_stage)) : undefined;
  const c = contractIndex(r);
  const addr = r.co_property_address || '';
  const missing: string[] = [];
  if (!hasPr) missing.push('Property Record');
  if (hasPr && !addr) missing.push('Address');
  if (fin === undefined) missing.push('Finance status');
  if ((type === 'split' || type === 'single') && c >= 6 && build === undefined) missing.push('Construction stage');
  const land = num(r.co_closing_price_land), buildP = num(r.co_closing_price_build);
  const closing = num(r.co_closing_price) ?? (type === 'split' && (land != null || buildP != null) ? (land || 0) + (buildP || 0) : null);
  const prices: [string, number | null][] = type === 'split'
    ? [['Closing price', closing], ['Land', land], ['Build', buildP]]
    : [['Closing price', closing]];
  const count = (...keys: string[]) => { const v = keys.map((k) => num(r[k])); return v.every((n) => n == null) ? null : v.reduce<number>((a, n) => a + (n || 0), 0); };
  const beds = count('co_beds_primary', 'co_beds_additional__secondary__dual_key');
  const baths = count('co_bath_primary', 'co_baths_additional__secondary__dual_key');
  const cars = count('co_garage_primary', 'co_carport_primary', 'co_carspace_primary', 'co_garage_additional__secondary__dual_key', 'co_carport_additional__secondary__dual_key', 'co_carspace_additional__secondary__dual_key');
  const party = (name?: string, company?: string) => [name, company].filter(Boolean).join(' · ');
  return {
    ref: r.id || '',
    // Opportunity Progress sections: Property Team stage, else the pipeline (until cutover).
    group: r.pipelineId === PT_ID ? (r.pipelineStage || 'Property Team') : r.pipelineId === FIN_ID ? 'Finance pipeline' : 'Construction pipeline',
    smsfDup: r.smsfConstructionDuplicate === 'Yes',
    name: r.opportunityName || r.name || '',
    client: r.contactName || '',
    type, c, fin, build,
    prop: PROP_LANE[r.co_status || ''] ?? -1,
    cEst: r.pipelineId !== PT_ID,
    addr,
    consultant: r.owner || r.assignedTo || '',
    ba: r.assignedBA || '',
    ghlLink: r.ghlLink || '',
    reselling: yes(r.co_reselling),
    days: {
      contract: r.pipelineId === PT_ID ? intOrNull(r.daysSinceStageChange) : null,
      finance: intOrNull(r.daysInFinanceStatus),
      build: intOrNull(r.daysInConstructionStage),
      // No days-since on the Property Record lane (JT 2/11).
      prop: null,
    },
    ...valuation(r),
    finDue: day(r.financeDueDate),
    settle: day(r.confirmedSettlementDate),
    prices,
    format: beds == null && baths == null && cars == null ? '' : `${beds ?? '–'} / ${baths ?? '–'} / ${cars ?? '–'}`,
    landDep: yes(r.landDepositPaid), buildDep: yes(r.buildDepositPaid),
    valAmt: num(r.valuationAmountResidential),
    purchase: day(r.co_land_contract_date_mined), exchange: day(r.exchangeDate), uncond: day(r.unconditionalDate),
    finStatus: fs, buildStage: build != null && build >= 0 ? BUILD[build] : '',
    broker: party(r.brokerName, r.brokerCompany), solicitor: party(r.solicitorName, r.solicitorCompany),
    builder: r.co_builder_mined || r.agentBuilderDetails || '',
    latest: r.latestStatusUpdate || '',
    ctrtLink: `/contract-team-reporting/record?opp=${encodeURIComponent(r.id || '')}`,
    landReg: r.co_land_registration || '',
    bp: r.bpConditionStatus || '',
    pci: r.preSettlementInspectionStatus || '',
    missing,
  };
}

const stageRow = (r: Rec, date?: string, land = false) => ({
  id: r.id || '', date: day(date), client: r.contactName || '', ref: r.opportunityName || r.name || '',
  lot: r.co_property_address || r.registeredAddress || '', consultant: r.owner || r.assignedTo || '', ba: r.assignedBA || '', land,
});

const CONTRACT_STAGES = ['dealclosed', 'contractreview', 'exchangewip', 'conditional', 'unconditional'];
/** Exception tile (JT 2/11): open Property Team opps from Deal Closed to Unconditional with no Property Record linked to them (record-side link). */
function noRecordTile(records: Rec[]) {
  const rows = records.filter((r) => r.pipelineId === PT_ID && r.status === 'open' && CONTRACT_STAGES.includes(norm(r.pipelineStage)) && !r.propertyRecordIds);
  return {
    id: 'pt-no-record', name: 'No Property Record', kind: 'opp', phase: 'contract', detached: true, hold: true, alert: rows.length > 0,
    rows: rows.map((r) => ({ ...stageRow(r, r.lastStageChangeAt), stage: r.pipelineStage || '' })), mismatch: false, recon: '',
  };
}

/** Exception tile (JT): open Property Team opps from Buying Brief to Deal Closed with the Assigned BA field blank. */
function noBaTile(records: Rec[], pt: { id: string; name: string }[]) {
  const from = pt.findIndex((s) => norm(s.name) === 'buyingbrief');
  const to = pt.findIndex((s) => norm(s.name) === 'dealclosed');
  const ids = new Set(from >= 0 && to >= from ? pt.slice(from, to + 1).map((s) => s.id) : []);
  const rows = records.filter((r) => r.pipelineId === PT_ID && r.status === 'open' && ids.has(r.pipelineStageId || '') && !(r.assignedBA || '').trim());
  return {
    id: 'pt-no-ba', name: 'No Assigned BA', kind: 'opp', phase: 'property', detached: true, hold: true, alert: rows.length > 0,
    rows: rows.map((r) => ({ ...stageRow(r, r.lastStageChangeAt), stage: r.pipelineStage || '' })), mismatch: false, recon: '',
  };
}

/** Why a loaded opp is not in the default (in-flight) journey. */
function notInFlight(r: Rec): string {
  if (r.status && r.status !== 'open') return `Opportunity ${r.status}`;
  if (isFallen(r)) return 'Deal fallen over';
  if (r.pipelineId === PT_ID && norm(r.pipelineStage) === 'settled') return 'Property Team Settled (not in flight)';
  if (r.pipelineId === CON_ID && norm(r.pipelineStage).includes('handover')) return 'Construction pipeline Handover (not in flight)';
  if (r.pipelineId === FIN_ID && norm(r.pipelineStage) === 'settled') return 'Finance Settled (not in flight)';
  return 'Not in flight';
}
const where = (r: Rec) => `${r.pipelineName || '?'} / ${r.pipelineStage || '?'}`;

type Compare = { label: string; ghl: number | null; ghlRecs: Rec[]; why: (r: Rec) => string };
/** Reconciliation panel: journey All vs a GHL count, every difference grouped by reason. */
function reconcile(tileRecs: Rec[], cmp: Compare, whyExtra: (r: Rec) => string) {
  const tileIds = new Set(tileRecs.map((r) => r.id));
  const ghlIds = new Set(cmp.ghlRecs.map((r) => r.id));
  const groups = new Map<string, Rec[]>();
  const add = (k: string, r: Rec) => groups.set(k, [...(groups.get(k) || []), r]);
  for (const r of cmp.ghlRecs) if (!tileIds.has(r.id)) add(`− in GHL, not on this tile: ${cmp.why(r)}`, r);
  for (const r of tileRecs) if (!ghlIds.has(r.id)) add(`+ on this tile, not in GHL here: ${whyExtra(r)}`, r);
  const ghl = cmp.ghl ?? cmp.ghlRecs.length;
  const unloaded = cmp.ghl === null ? 0 : cmp.ghl - cmp.ghlRecs.length;
  const diff = tileRecs.length - ghl;
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, rs]) =>
    `<li><b>${rs.length}</b> ${esc(k)}<details><summary>names</summary>${rs.slice(0, 40).map((r) => esc(r.opportunityName || r.name)).join('<br>')}${rs.length > 40 ? `<br>… ${rs.length - 40} more` : ''}</details></li>`);
  if (unloaded) rows.push(`<li><b>${Math.abs(unloaded)}</b> ${unloaded > 0 ? 'in the GHL count but not loaded by the tool (cache or timing; press Refresh in CTRT)' : 'loaded by the tool but no longer in the GHL count (cache or timing)'}</li>`);
  return {
    mismatch: diff !== 0,
    html: `<div class="recon" data-diff="${diff}"><table><tr><td>Journey · All</td><td class="n">${tileRecs.length}</td></tr>
      <tr><td>${esc(cmp.label)}</td><td class="n">${ghl}</td></tr>
      <tr class="${diff ? 'bad' : 'ok'}"><td>Difference</td><td class="n">${diff > 0 ? '+' : ''}${diff}</td></tr></table>
      ${rows.length ? `<ul>${rows.join('')}</ul>` : '<p class="ok">Matches GHL.</p>'}</div>`,
  };
}

function salesTile(id: string, sales: Sales | null) {
  if (!sales) return { notWired: true, rows: [] };
  if (id === 'contacts') return { rows: sales.contacts.map((c) => ({ id: c.id, date: c.date, client: c.name, source: c.source || c.createdBy, consultant: c.createdBy })) };
  if (id === 'booked') return { rows: sales.meetings.map((m) => ({ id: m.id, date: m.date, at: m.at, client: m.client, leadSource: m.leadSource || '', consultant: m.consultant, satBy: m.consultant, calendar: m.calendar })) };
  if (id === 'outcomes') return { rows: sales.meetings.filter((m) => m.outcome).map((m) => ({ id: m.id, date: m.date, client: m.client, leadSource: m.leadSource || '', outcome: m.outcome, consultant: m.consultant, satBy: m.consultant, calendar: m.calendar })) };
  return { rows: sales.opps.map((o) => ({ id: o.id, date: o.created, ref: o.name, client: o.client, leadSource: o.leadSource || '', consultant: o.consultant, ba: '' })) };
}

export function buildJourneyData(records: Rec[], recon: Recon, historical: boolean, sales: Sales | null = null) {
  const today = sydney(new Date());
  const pop = historical ? records : records.filter((r) => r.inFlight === 'Yes' && !isFallen(r));
  const popIds = new Set(pop.map((r) => r.id));
  const inPop = (r: Rec) => popIds.has(r.id);
  const ghlStage = (pipelineId: string, names: string[]) => {
    const p = recon.pipelines.find((x) => x.id === pipelineId);
    const stages = (p?.stages || []).filter((s) => names.some((n) => norm(n) === norm(s.name)));
    return { ids: new Set(stages.map((s) => s.id)), total: stages.reduce((a, s) => a + s.total, 0), names: stages.map((s) => s.name) };
  };
  const scope = historical ? 'all statuses' : 'open';
  // Collapsed to one line (first comparison: Matches GHL / ≠ GHL: diff); detail behind a toggle. Kept for cutover.
  const panel = (title: string, sections: string[]) => {
    const d = Number(/data-diff="(-?\d+)"/.exec(sections[0] || '')?.[1] || 0);
    const line = d === 0 ? '<span class="rok">Matches GHL</span>' : `<span class="rbad">≠ GHL: ${d > 0 ? '+' : ''}${d}</span>`;
    return `<details class="recon-wrap"><summary>${line} <span class="rmore">${esc(title)} detail</span></summary>${sections.join('')}</details>`;
  };

  // Sales & Property: the mock-up's Sales tiles, then every Property Team stage exactly as in GHL.
  const pt = recon.pipelines.find((p) => p.id === PT_ID)?.stages || [];
  const dealClosedAt = pt.findIndex((s) => norm(s.name) === 'dealclosed');
  const stages = [
    // Sales: movement only (last 24 hours / last 7 days), no all-time totals.
    ...SALES_TILES.map((s) => ({ ...s, head: 'd7', periods: ['d1', 'd7'], tileKey: 'd7', phase: 'sales', ...salesTile(s.id, sales) })),
    ...pt.map((s, i) => {
      const all = records.filter((r) => r.pipelineStageId === s.id);
      // Sales & Property tiles: every OPEN opp at the stage, as GHL counts it (no in-flight filter; JT 1/11).
      const tile = historical ? all : all.filter((r) => r.status === 'open');
      const rc = reconcile(tile, { label: `GHL pipeline column: Property Team / ${s.name} (${scope})`, ghl: s.total, ghlRecs: all, why: notInFlight }, where);
      return {
        id: 'pt-' + s.id, name: s.name, kind: 'opp',
        phase: i <= dealClosedAt ? 'property' : 'contract',
        ...(norm(s.name) === 'onhold' ? { detached: true, hold: true } : {}),
        rows: tile.map((r) => stageRow(r, r.lastStageChangeAt)),
        mismatch: rc.mismatch, recon: panel('Reconciliation', [rc.html]),
      };
    }).sort((a, b) => Number(!!b.hold) - Number(!!a.hold)),
    noBaTile(records, pt),
    noRecordTile(records),
  ];

  // Finance: the 5 Finance Status values; today compared with the Finance pipeline stages they replace.
  const finance = [
    ...FINANCE_VALUES.map(([value, stageNames]) => {
      const tile = pop.filter((r) => r.financeStatus === value);
      const g = ghlStage(FIN_ID, stageNames);
      const today_ = reconcile(tile, {
        label: `Today · GHL Finance pipeline: ${g.names.join(' + ') || 'no matching stage'} (${scope})`, ghl: g.total,
        ghlRecs: records.filter((r) => g.ids.has(r.pipelineStageId || '')),
        why: (r) => (inPop(r) ? `Finance Status = ${r.financeStatus || 'blank'}` : notInFlight(r)),
      }, (r) => `pipeline ${where(r)}`);
      const after = reconcile(tile, {
        label: `After cutover · GHL Finance Status = ${value} (loaded opps)`, ghl: null,
        ghlRecs: records.filter((r) => r.financeStatus === value), why: notInFlight,
      }, () => '');
      return {
        id: 'f-' + norm(value), phase: 'finance', name: value, kind: 'fin', hasLand: true,
        rows: tile.map((r) => stageRow(r, r.financeStatusChangeDate, registered(r))),
        mismatch: today_.mismatch, recon: panel('Reconciliation', [today_.html, after.html]),
      };
    }),
    // Derived filter chips (not stages), compared with the old Finance stage of the same name.
    ...CHIPS.map((c) => {
      const tile = pop.filter(c.rule);
      const g = ghlStage(FIN_ID, [CHIP_STAGE[c.id]]);
      const rc = reconcile(tile, {
        label: `Old GHL Finance stage: ${g.names[0] || CHIP_STAGE[c.id]} (${scope})`, ghl: g.total,
        ghlRecs: records.filter((r) => g.ids.has(r.pipelineStageId || '')),
        why: (r) => (inPop(r) ? 'does not meet the chip rule (Finance Status / registration / entity / valuation access)' : notInFlight(r)),
      }, (r) => `pipeline ${where(r)}`);
      return {
        id: c.id, phase: 'finance', name: c.name, kind: 'fin', chip: true, detached: true,
        rows: tile.map((r) => stageRow(r, r.financeStatusChangeDate, registered(r))),
        mismatch: rc.mismatch, recon: panel('Derived filter (not a stage) · Run Sheet rule', [rc.html]),
      };
    }),
  ];

  // Construction: the 10 Property Record construction_stage values; today compared with the Construction pipeline.
  const build = CONSTRUCTION_VALUES.map(([key, label, stageNames]) => {
    const tile = pop.filter((r) => r.co_construction_stage === key);
    const g = ghlStage(CON_ID, stageNames);
    const today_ = reconcile(tile, {
      label: `Today · GHL Construction pipeline: ${g.names.join(' + ') || 'no matching stage'} (${scope})`, ghl: g.total,
      ghlRecs: records.filter((r) => g.ids.has(r.pipelineStageId || '')),
      why: (r) => (!inPop(r) ? notInFlight(r) : !r.propertyRecordIds ? 'no Property Record' : `Property Record Construction stage = ${r.co_construction_stage || 'blank'}`),
    }, (r) => `pipeline ${where(r)}`);
    const after = reconcile(tile, {
      label: `After cutover · Property Record Construction stage = ${label} (loaded opps)`, ghl: null,
      ghlRecs: records.filter((r) => r.co_construction_stage === key), why: notInFlight,
    }, () => '');
    return {
      id: 'b-' + key, phase: 'build', name: label, kind: 'property',
      rows: tile.map((r) => stageRow(r, r.co_construction_stage_change_date)),
      mismatch: today_.mismatch, recon: panel('Reconciliation', [today_.html, after.html]),
    };
  });

  const fallen = records.filter(isFallen).map((r) => {
    const o = toOpp(r, today);
    const fell = typeof o.fin === 'number' && o.fin < 4 && o.c >= 3
      ? { lane: 'finance', i: Math.max(0, o.fin) }
      : { lane: 'contract', i: Math.min(5, Math.max(0, o.c)) };
    return { ...o, fell, reason: r.dealFallenOverReason || 'Reason not set', date: day(r.dealFallenOverDate) };
  });
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  // Duplicate contacts created in the last 7 days (same name + same email or mobile as an older contact). Visibility only.
  const dups = [{
    id: 'dups', phase: 'dups', name: 'Duplicate contacts', kind: 'dup', head: 'd7', periods: ['d1', 'd7'], tileKey: 'd7',
    ...(sales ? {} : { notWired: true }),
    rows: (sales?.duplicates || []).map((d) => ({ id: d.id, date: d.date, client: d.newContact, existing: d.existing, existingCreated: d.existingCreated, why: d.why, createdBy: d.createdBy })),
  }];
  stages.splice(SALES_TILES.length, 0, ...(dups as unknown as typeof stages));
  return {
    today,
    salesAsAt: sales?.asAt || '',
    historical,
    opps: pop.filter((r) => !isFallen(r)).map((r) => toOpp(r, today)),
    fallen,
    stages,
    build,
    finance,
    consultants: uniq(records.map((r) => r.owner || r.assignedTo || '')),
    bas: uniq(records.map((r) => r.assignedBA || '')),
  };
}
