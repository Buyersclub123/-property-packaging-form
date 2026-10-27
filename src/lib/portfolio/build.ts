import * as XLSX from 'xlsx';
import type { LoadedRow, LoadedSources, LoadedWorkbook, GhlOpportunity, SheetRow } from './sources';
import type {
  DataIssue, PortfolioClient, PortfolioData, PortfolioOpportunity, PortfolioProperty, PortfolioRollup, SourceKind,
} from './types';

const SETTLEMENT_FIELD = 'lWfSyDNYwWalhkMcHyAQ';
const CONFIRMED_SETTLEMENT_FIELD = 'WYmP8plPbH1E8NvUaGcP';

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const pad = (n: number) => String(n).padStart(2, '0');

function parsePrice(v: unknown): { value: number | null; bad: boolean } {
  if (typeof v === 'number') return { value: v, bad: false };
  const s = str(v);
  if (!s) return { value: null, bad: false };
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? { value: n, bad: false } : { value: null, bad: true };
}

function parseDate(v: unknown): { text: string; time: number | null; bad: boolean } {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return { text: String(v), time: null, bad: true };
    return { text: `${pad(d.d)}/${pad(d.m)}/${d.y}`, time: Date.UTC(d.y, d.m - 1, d.d), bad: false };
  }
  const s = str(v);
  if (!s) return { text: '', time: null, bad: false };
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return { text: s, time: null, bad: true };
  return { text: `${pad(+m[1])}/${pad(+m[2])}/${m[3]}`, time: Date.UTC(+m[3], +m[2] - 1, +m[1]), bad: false };
}

const dateTime = (s: string) => parseDate(s).time;

function entityFromName(name: string): string {
  const m = name.match(/\b(SMSF|PERS|TRUST)\b/i);
  return m ? m[1].toUpperCase() : '';
}

function opportunitySettlement(opp: GhlOpportunity | undefined): { text: string; source: string } {
  if (!opp?.customFields) return { text: '', source: '' };
  const read = (id: string) => {
    const f = opp.customFields!.find((c) => c.id === id);
    if (!f) return '';
    if (typeof f.fieldValueDate === 'number') {
      const d = new Date(f.fieldValueDate);
      return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    }
    return str(f.fieldValueString);
  };
  const confirmed = read(CONFIRMED_SETTLEMENT_FIELD);
  if (confirmed) return { text: confirmed, source: 'GHL confirmed settlement date' };
  const settlement = read(SETTLEMENT_FIELD);
  return settlement ? { text: settlement, source: 'GHL settlement date' } : { text: '', source: '' };
}

function composeAddress(v: SheetRow): string {
  const lot = str(v.lot_number);
  const street = [str(v.street_number), str(v.street_name)].filter(Boolean).join(' ');
  const place = [str(v.suburb_name), str(v.state), str(v.post_code)].filter(Boolean).join(' ');
  return [lot ? `Lot ${lot}` : '', street, place].filter(Boolean).join(', ');
}

function gradeFacts(kind: SourceKind, v: SheetRow, grade: string): string[] {
  if (grade === 'HOLD') return [str(v['Hold - fact A']), str(v['Hold - fact B'])].filter(Boolean);
  if (kind === 'historical') return [str(v['match (six rules)']), str(v.confidence)].filter(Boolean);
  if (str(v['Update reason'])) return [str(v['Update reason'])];
  return [str(v.confidence), str(v.notes)].filter(Boolean);
}

interface Built { property: PortfolioProperty; opp: GhlOpportunity | undefined; clientName: string }

export function buildPortfolio(src: LoadedSources): PortfolioData {
  const oppById = new Map(src.opportunities.opportunities.map((o) => [o.id, o]));
  const recordByOpp = new Map<string, { id: string; address: string }>();
  for (const r of src.propertyRecords.records) {
    const linked = str(r.properties?.linked_opportunity_id);
    if (linked) recordByOpp.set(linked, { id: r.id, address: str(r.properties?.property_address) });
  }

  const issues: DataIssue[] = [];
  const built: Built[] = [];

  const toProperty = (wb: LoadedWorkbook, row: LoadedRow): Built => {
    const v = row.values;
    const kind = wb.kind;
    const oppId = str(v.opportunity_id) || null;
    const opp = oppId ? oppById.get(oppId) : undefined;
    const clientName = str(v.client_closed) || str(v['Opportunity name']) || '(no client name)';
    const address = str(v.property_address) || composeAddress(v);
    const at = { client: opp?.contact?.name || clientName, opportunityId: oppId, address, file: wb.name, tab: row.tab, rowNumber: row.rowNumber };

    const prices = { land: parsePrice(v.land_price), build: parsePrice(v.build_price), total: parsePrice(v.total_price) };
    for (const [k, p] of Object.entries(prices)) {
      if (p.bad) issues.push({ ...at, kind: 'unparsed_price', message: `${k}_price "${str(v[`${k}_price`])}" is not a number` });
    }

    const contract = parseDate(v['contract_date (new field)']);
    if (contract.bad) issues.push({ ...at, kind: 'unparsed_date', message: `contract date "${contract.text}" is not DD/MM/YYYY` });

    let settlementText = '';
    let settlementSource = '';
    let settlementTime: number | null = null;
    if (kind === 'historical') {
      const s = parseDate(v.settlement_date);
      if (s.bad) issues.push({ ...at, kind: 'unparsed_date', message: `settlement date "${s.text}" is not DD/MM/YYYY` });
      settlementText = s.text;
      settlementTime = s.time;
      settlementSource = s.text ? `candidate file${str(v.source_settlement_date) ? ` (${str(v.source_settlement_date)})` : ''}` : '';
    } else {
      const s = opportunitySettlement(opp);
      settlementText = s.text;
      settlementSource = s.source;
      settlementTime = dateTime(s.text);
    }
    const settlementBeforeContract = settlementTime !== null && contract.time !== null && settlementTime < contract.time;
    if (settlementBeforeContract) {
      issues.push({ ...at, kind: 'settlement_before_contract', message: `settlement ${settlementText} is before contract date ${contract.text}` });
    }

    let entity = str(v.purchasing_entity_type);
    let entityName = str(v.purchasing_entity_name);
    let entitySource = entity ? 'candidate file' : '';
    if (!entity && opp) {
      entity = entityFromName(opp.name);
      entityName = '';
      entitySource = entity ? 'from opportunity name' : '';
    }

    const grade = str(v.grade);
    const flag = str(v.Flag);
    const status = str(v.status);
    const action = str(v.Action) || (/updates/i.test(row.tab) ? 'Update existing record' : '');
    const fileRecordRef = str(v['existing record(s)']) || str(v['Existing Property Record ID']) || str(v['Existing record ID (JT linked)'])
      || (action.match(/Link existing record (\S+)/)?.[1] ?? '');
    const linked = oppId ? recordByOpp.get(oppId) : undefined;

    if (oppId && !opp) {
      issues.push({ ...at, kind: 'opportunity_not_in_snapshot', message: `opportunity ${oppId} is not in ${src.opportunities.name}` });
    }

    return {
      opp,
      clientName,
      property: {
        key: `${kind}:${row.tab}:${row.rowNumber}`,
        source: kind,
        file: wb.name,
        tab: row.tab,
        rowNumber: row.rowNumber,
        opportunityId: oppId,
        address,
        dealType: str(v.deal_type),
        contractType: str(v.contract_type),
        landPrice: prices.land.value,
        buildPrice: prices.build.value,
        totalPrice: prices.total.value,
        priceSource: str(v.source_total_price),
        contractDate: contract.text,
        settlementDate: settlementText,
        settlementSource,
        settlementBeforeContract,
        entity,
        entityName,
        entitySource,
        builder: str(v['builder (new field)']),
        grade,
        gradeFacts: gradeFacts(kind, v, grade),
        flag,
        action,
        status,
        notes: str(v.notes),
        fellOver: /fell over/i.test(flag) || status === '06_remove_lost',
        fileRecordRef,
        linkedRecordId: linked?.id ?? null,
        linkedRecordAddress: linked?.address ?? '',
      },
    };
  };

  for (const wb of [src.inflight, src.historical]) for (const row of wb.rows) built.push(toProperty(wb, row));

  const oppCount = new Map<string, Built[]>();
  for (const b of built) {
    if (!b.property.opportunityId) continue;
    const list = oppCount.get(b.property.opportunityId) || [];
    list.push(b);
    oppCount.set(b.property.opportunityId, list);
  }
  for (const [id, list] of oppCount) {
    if (list.length < 2) continue;
    const where = list.map((b) => `${b.property.file} / ${b.property.tab} row ${b.property.rowNumber}`).join('; ');
    for (const b of list) {
      issues.push({
        kind: 'duplicate_opportunity', message: `opportunity ${id} is on ${list.length} rows: ${where}`,
        client: b.opp?.contact?.name || b.clientName, opportunityId: id, address: b.property.address,
        file: b.property.file, tab: b.property.tab, rowNumber: b.property.rowNumber,
      });
    }
  }

  const clients = new Map<string, PortfolioClient>();
  const opps = new Map<string, PortfolioOpportunity>();
  for (const b of built) {
    const contactId = b.opp?.contactId || null;
    const clientKey = contactId ? `c:${contactId}` : `n:${b.clientName.replace(/\s+/g, ' ').toLowerCase()}`;
    let client = clients.get(clientKey);
    if (!client) {
      client = {
        key: clientKey,
        contactId,
        name: b.opp?.contact?.name || b.clientName,
        email: b.opp?.contact?.email || '',
        hasGhlContact: !!contactId,
        opportunities: [],
        rollup: emptyRollup(),
      };
      clients.set(clientKey, client);
    }
    const oppKey = b.property.opportunityId || `none:${clientKey}`;
    let opp = opps.get(oppKey);
    if (!opp) {
      const stage = b.opp ? src.opportunities.stages[b.opp.pipelineStageId] : undefined;
      opp = {
        key: oppKey,
        id: b.property.opportunityId,
        name: b.opp?.name || (b.property.opportunityId ? '(opportunity not in snapshot)' : '(no opportunity yet)'),
        pipeline: stage?.[0] ?? '',
        stage: stage?.[1] ?? '',
        status: b.opp?.status ?? '',
        properties: [],
      };
      opps.set(oppKey, opp);
      client.opportunities.push(opp);
    }
    opp.properties.push(b.property);
  }

  const list = [...clients.values()];
  for (const c of list) c.rollup = rollup(c);
  list.sort((a, b) => b.rollup.properties - a.rollup.properties || a.name.localeCompare(b.name));

  const all = built.map((b) => b.property);
  const counted = all.filter((p) => !p.fellOver);
  return {
    builtAt: new Date().toISOString(),
    sourceDir: src.sourceDir,
    sources: [
      { kind: 'inflight', name: src.inflight.name, modifiedAt: src.inflight.modifiedAt, tabs: src.inflight.tabs },
      { kind: 'historical', name: src.historical.name, modifiedAt: src.historical.modifiedAt, tabs: src.historical.tabs },
      { kind: 'opportunities', name: src.opportunities.name, modifiedAt: src.opportunities.modifiedAt, takenAt: src.opportunities.takenAt, count: src.opportunities.opportunities.length },
      { kind: 'propertyRecords', name: src.propertyRecords.name, modifiedAt: src.propertyRecords.modifiedAt, count: src.propertyRecords.records.length },
    ],
    clients: list,
    issues,
    totals: {
      clients: list.length,
      properties: counted.length,
      priced: counted.filter((p) => p.totalPrice !== null).length,
      totalCost: counted.reduce((s, p) => s + (p.totalPrice ?? 0), 0),
      fellOver: all.length - counted.length,
    },
  };
}

function emptyRollup(): PortfolioRollup {
  return { properties: 0, priced: 0, totalCost: 0, firstPurchase: '', lastPurchase: '', undated: 0, inFlight: 0, historical: 0, fellOver: 0 };
}

function rollup(c: PortfolioClient): PortfolioRollup {
  const r = emptyRollup();
  let first: number | null = null;
  let last: number | null = null;
  for (const o of c.opportunities) {
    for (const p of o.properties) {
      if (p.fellOver) { r.fellOver++; continue; }
      r.properties++;
      if (p.source === 'inflight') r.inFlight++; else r.historical++;
      if (p.totalPrice !== null) { r.priced++; r.totalCost += p.totalPrice; }
      const t = dateTime(p.contractDate);
      if (t === null) { r.undated++; continue; }
      if (first === null || t < first) { first = t; r.firstPurchase = p.contractDate; }
      if (last === null || t > last) { last = t; r.lastPurchase = p.contractDate; }
    }
  }
  return r;
}
