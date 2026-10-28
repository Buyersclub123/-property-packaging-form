import * as XLSX from 'xlsx';
import type { LoadedRow, LoadedSources, LoadedWorkbook, GhlOpportunity, GhlUsers, SheetRow, SnapOpp } from './sources';
import type { ContactLinks } from './contactLinks';
import { MDL_VALUATION_DATE, MDL_VALUATION_DATE_NOTE, pipedriveKey } from './sources';
import type {
  DataIssue, GhlContactMatch, PortfolioClient, PortfolioData, PortfolioOpportunity, PortfolioProperty, PortfolioRollup, SourceKind,
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

function monthsBetween(from: string, to: string): number | null {
  const a = from.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const b = to.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!a || !b) return null;
  return (+b[3] - +a[3]) * 12 + (+b[2] - +a[2]) - (+b[1] < +a[1] ? 1 : 0);
}

const aud = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

const nameTokens = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t && t !== 'and').sort().join(' ');

// Contact matching for clients with no purchase opportunity (JT 28/10): email first, then exact person name.
const NAME_STOP = new Set(['and', 'mr', 'mrs', 'ms', 'miss', 'dr', 'the']);
const nameToks = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t && !NAME_STOP.has(t));
const personKey = (s: string) => nameToks(s).sort().join(' ');
const ENTITY_NAME = /\b(pty|ltd|limited|atf|trust|super|superannuation|fund|holdings|investments|acn|custodian|nominees)\b/i;

function personKeys(name: string): string[] {
  if (!name || ENTITY_NAME.test(name)) return [];
  const parts = name.split(/\s*(?:&|;|,|\/|\band\b)\s*/i).map((p) => p.trim()).filter(Boolean);
  const last = nameToks(parts[parts.length - 1] || '').slice(-1)[0];
  return parts
    .map((p) => { const t = nameToks(p); return t.length === 1 && last ? `${t[0]} ${last}` : t.join(' '); })
    .filter((p) => p.split(' ').length >= 2)
    .map(personKey);
}

const emailsOf = (s: string | undefined) => (s?.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).map((e) => e.toLowerCase());

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

interface Built {
  property: PortfolioProperty; opp: GhlOpportunity | undefined; clientName: string; mdlRow: number | null;
  matchEmails: string[]; matchNames: string[];
}

export function buildPortfolio(
  src: LoadedSources,
  users: GhlUsers,
  links: ContactLinks = { byContact: new Map(), count: 0, error: null }
): PortfolioData {
  const oppById = new Map(src.opportunities.opportunities.map((o) => [o.id, o]));
  const recordByOpp = new Map<string, { id: string; address: string }>();
  for (const r of src.propertyRecords.records) {
    const linked = str(r.properties?.linked_opportunity_id);
    if (linked) recordByOpp.set(linked, { id: r.id, address: str(r.properties?.property_address) });
  }

  const asAt = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric' });
  const issues: DataIssue[] = [];
  const built: Built[] = [];
  const ownerName = (o: GhlOpportunity | undefined) => {
    if (!o?.assignedTo || users.error) return '';
    return users.names.get(o.assignedTo) ?? `GHL user not found (${o.assignedTo})`;
  };

  const toProperty = (wb: LoadedWorkbook, row: LoadedRow): Built => {
    const v = row.values;
    const kind = wb.kind;
    const oppId = str(v.opportunity_id) || null;
    const opp = oppId ? oppById.get(oppId) : undefined;
    const mdlRef = str(v.master_deal_list).match(/All Deals row (\d+)/);
    const pd = kind === 'historical'
      ? src.pipedrive.rows.get(pipedriveKey(row.tab, v.master_deal_list, v.contract_id, v.property_address))
      : undefined;
    const fileClient = str(v.client_closed) || str(v['Opportunity name']);
    const pdClient = !fileClient && pd?.clientFilled ? pd.clientFilled : '';
    const clientNameSource = pdClient ? 'from Pipedrive' : '';
    const clientName = fileClient || pdClient
      || (mdlRef ? `(no client name on Master row ${mdlRef[1]})` : `(no client name - ${row.tab} row ${row.rowNumber})`);
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

    let mdlConsultant = '';
    let mdlRow: number | null = null;
    let valuation: number | null = null;
    let valuationSource = '';
    let valuationDate = '';
    let valuationDateNote = '';
    if (mdlRef) {
      const m = src.masterDealList.rows.get(Number(mdlRef[1]));
      if (!m) {
        issues.push({ ...at, kind: 'mdl_row_missing', message: `master_deal_list points at All Deals row ${mdlRef[1]}, which is not in ${src.masterDealList.name}` });
      } else {
        mdlConsultant = m.consultant;
        if (m.valuationRaw) issues.push({ ...at, kind: 'unparsed_price', message: `Master Deal List row ${m.row} valuation "${m.valuationRaw}" is not a number` });
        if (m.valuation !== null) {
          mdlRow = m.row;
          valuation = m.valuation;
          valuationSource = `Master Deal List, All Deals row ${m.row}`;
          valuationDate = MDL_VALUATION_DATE;
          valuationDateNote = MDL_VALUATION_DATE_NOTE;
        }
      }
    }
    const cost = prices.total.value;
    const growth = valuation !== null && cost !== null ? valuation - cost : null;
    const growthPct = growth !== null && cost ? growth / cost : null;
    const valuationTime = dateTime(valuationDate);
    const heldYears = valuationTime !== null && contract.time !== null ? (valuationTime - contract.time) / (365.25 * 86_400_000) : null;
    const growthPa = valuation !== null && cost && heldYears !== null && heldYears >= 1 ? Math.pow(valuation / cost, 1 / heldYears) - 1 : null;
    const ratio = valuation !== null && cost ? valuation / cost : null;
    const valuationOutlier = ratio !== null && (ratio < 0.5 || ratio > 3);
    if (valuationOutlier && valuation !== null && cost !== null && ratio !== null) {
      issues.push({ ...at, kind: 'valuation_outlier', message: `valuation ${aud(valuation)} is ${Math.round(ratio * 100)}% of the purchase price ${aud(cost)} (${valuationSource})` });
    }

    const mdlLinked = mdlRef ? src.masterDealList.rows.get(Number(mdlRef[1])) : undefined;
    const matchEmails = [...emailsOf(mdlLinked?.email), ...emailsOf(pd?.email)];
    const matchNames = [fileClient, mdlLinked?.name ?? '', pd?.clientFilled ?? ''].filter(Boolean);

    if (oppId && !opp) {
      issues.push({ ...at, kind: 'opportunity_not_in_snapshot', message: `opportunity ${oppId} is not in ${src.opportunities.name}` });
    }

    return {
      opp,
      clientName,
      mdlRow,
      matchEmails,
      matchNames,
      property: {
        key: `${kind}:${row.tab}:${row.rowNumber}`,
        source: kind,
        file: wb.name,
        tab: row.tab,
        rowNumber: row.rowNumber,
        opportunityId: oppId,
        address,
        addressParts: {
          lot: str(v.lot_number),
          unit: str(v.unit__lot),
          streetNumber: str(v.street_number),
          streetName: str(v.street_name),
          suburb: str(v.suburb_name),
          state: str(v.state),
          postcode: str(v.post_code),
          lga: str(v.lga),
        },
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
        valuation,
        valuationDate,
        valuationDateNote,
        valuationSource,
        valuationAgeMonths: valuationDate ? monthsBetween(valuationDate, asAt) : null,
        valuationOutlier,
        growth,
        growthPct,
        growthPa,
        heldYears,
        heldMonths: contract.time !== null ? monthsBetween(contract.text, asAt) : null,
        mdlConsultant,
        clientNameSource,
        pipedrive: pd && pd.dealId
          ? { dealId: pd.dealId, owner: pd.owner, stage: pd.stage, basis: pd.basis, name: pd.clientFilled, nameSource: pd.clientSource, nameAgrees: pd.nameAgrees }
          : null,
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

  const mdlUse = new Map<number, Built[]>();
  for (const b of built) if (b.mdlRow !== null) mdlUse.set(b.mdlRow, [...(mdlUse.get(b.mdlRow) || []), b]);
  for (const [row, shared] of mdlUse) {
    if (shared.length < 2) continue;
    for (const b of shared) {
      issues.push({
        kind: 'mdl_row_shared', message: `Master Deal List All Deals row ${row} is linked from ${shared.length} rows - its valuation is shown on each`,
        client: b.opp?.contact?.name || b.clientName, opportunityId: b.property.opportunityId, address: b.property.address,
        file: b.property.file, tab: b.property.tab, rowNumber: b.property.rowNumber,
      });
    }
  }

  const contactById = new Map(src.ghlAll.contacts.map((c) => [c.id, c]));
  const oppsByContact = new Map<string, SnapOpp[]>();
  for (const o of src.ghlAll.opportunities) {
    if (o.contactId) oppsByContact.set(o.contactId, [...(oppsByContact.get(o.contactId) || []), o]);
  }
  const byEmail = new Map<string, Set<string>>();
  const byName = new Map<string, Set<string>>();
  const addIdx = (m: Map<string, Set<string>>, k: string, id: string) => {
    if (!k) return;
    const s = m.get(k) || new Set<string>();
    s.add(id);
    m.set(k, s);
  };
  for (const c of src.ghlAll.contacts) {
    for (const e of [c.email, ...(c.additionalEmails || [])]) addIdx(byEmail, String(e || '').trim().toLowerCase(), c.id);
    const k = personKey(c.name || '');
    if (k.split(' ').length >= 2) addIdx(byName, k, c.id);
  }
  const toContact = (id: string) => {
    const c = contactById.get(id);
    return {
      id, name: c?.name ?? '', email: c?.email ?? '',
      opportunities: (oppsByContact.get(id) || []).map((o) => ({ name: o.name, pipeline: o.pipeline, status: o.status })),
    };
  };
  const matchContact = (emails: Set<string>, names: Set<string>): GhlContactMatch => {
    const ids = new Set<string>();
    emails.forEach((e) => byEmail.get(e)?.forEach((id) => ids.add(id)));
    if (ids.size) return { status: 'contact_exists', basis: 'email', contacts: [...ids].map(toContact) };
    const hits = [...names].flatMap(personKeys).map((k) => byName.get(k)).filter((s): s is Set<string> => !!s);
    hits.forEach((s) => s.forEach((id) => ids.add(id)));
    if (hits.some((s) => s.size > 1)) return { status: 'ambiguous', basis: 'name', contacts: [...ids].map(toContact) };
    if (ids.size) return { status: 'contact_exists', basis: 'name', contacts: [...ids].map(toContact) };
    return { status: 'none', basis: '', contacts: [] };
  };
  const matchInputs = new Map<string, { emails: Set<string>; names: Set<string>; first: Built }>();

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
        personKey: null,
        mergedFrom: [],
        name: b.opp?.contact?.name || b.clientName,
        email: b.opp?.contact?.email || '',
        hasGhlContact: !!contactId,
        nameSource: contactId ? '' : b.property.clientNameSource,
        alsoKnownAs: [],
        ghlMatch: null,
        opportunities: [],
        consultants: [],
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
        owner: ownerName(b.opp),
        properties: [],
      };
      opps.set(oppKey, opp);
      client.opportunities.push(opp);
    }
    opp.properties.push(b.property);
    const inp = matchInputs.get(clientKey) || { emails: new Set<string>(), names: new Set<string>(), first: b };
    b.matchEmails.forEach((e) => inp.emails.add(e));
    b.matchNames.forEach((n) => inp.names.add(n));
    matchInputs.set(clientKey, inp);
  }

  const list = [...clients.values()];
  for (const c of list) {
    c.rollup = rollup(c, asAt);
    const names = new Map<string, string>();
    for (const o of c.opportunities) {
      if (o.id) {
        if (o.owner) names.set(o.owner, 'GHL opportunity owner');
      } else {
        for (const p of o.properties) if (p.mdlConsultant && !names.has(p.mdlConsultant)) names.set(p.mdlConsultant, 'Master Deal List');
      }
    }
    c.consultants = [...names].map(([name, source]) => ({ name, source }));
    const aka = new Set<string>();
    for (const o of c.opportunities) {
      for (const p of o.properties) {
        if (p.pipedrive?.name && nameTokens(p.pipedrive.name) !== nameTokens(c.name)) aka.add(p.pipedrive.name);
      }
    }
    c.alsoKnownAs = [...aka];
    if (!c.hasGhlContact) {
      const inp = matchInputs.get(c.key);
      c.ghlMatch = matchContact(inp?.emails ?? new Set(), inp?.names ?? new Set());
      if (c.ghlMatch.status === 'ambiguous' && inp) {
        issues.push({
          kind: 'contact_name_ambiguous',
          message: `name matches ${c.ghlMatch.contacts.length} GHL contacts (${c.ghlMatch.contacts.map((k) => k.name).join(' / ')}) - left as "No GHL contact"`,
          client: c.name, opportunityId: null, address: inp.first.property.address,
          file: inp.first.property.file, tab: inp.first.property.tab, rowNumber: inp.first.property.rowNumber,
        });
      }
    }
  }
  const merged = mergeByPerson(list, links.byContact, asAt);
  const mergedCount = merged.filter((c) => c.mergedFrom.length > 1).length;
  const bySize = (a: PortfolioClient, b: PortfolioClient) => b.rollup.properties - a.rollup.properties || a.name.localeCompare(b.name);
  list.sort(bySize);
  merged.sort(bySize);

  const all = built.map((b) => b.property);
  const counted = all.filter((p) => !p.fellOver);
  return {
    builtAt: new Date().toISOString(),
    asAt,
    consultantError: users.error ?? null,
    sourceDir: src.sourceDir,
    sources: [
      { kind: 'inflight', name: src.inflight.name, modifiedAt: src.inflight.modifiedAt, tabs: src.inflight.tabs },
      { kind: 'historical', name: src.historical.name, modifiedAt: src.historical.modifiedAt, tabs: src.historical.tabs },
      { kind: 'opportunities', name: src.opportunities.name, modifiedAt: src.opportunities.modifiedAt, takenAt: src.opportunities.takenAt, count: src.opportunities.opportunities.length },
      { kind: 'propertyRecords', name: src.propertyRecords.name, modifiedAt: src.propertyRecords.modifiedAt, count: src.propertyRecords.records.length },
      {
        kind: 'ghlContacts', name: `${src.ghlAll.contactsName} + ${src.ghlAll.oppsName}`, modifiedAt: src.ghlAll.modifiedAt,
        takenAt: src.ghlAll.takenAt, count: src.ghlAll.contacts.length,
        note: `${src.ghlAll.contacts.length.toLocaleString()} contacts, ${src.ghlAll.opportunities.length.toLocaleString()} opportunities in ${src.ghlAll.pipelines.length} pipelines. Used to match clients with no purchase opportunity: email first, then exact person name.`,
      },
      {
        kind: 'pipedrive', name: src.pipedrive.name, modifiedAt: src.pipedrive.modifiedAt, count: src.pipedrive.total,
        note: `${src.pipedrive.matched} rows matched to a Pipedrive deal, ${src.pipedrive.filled} with a client name. The name is used (labelled "from Pipedrive") only where the file has no client name; deal owner shown in the Source panel.${src.pipedrive.duplicateKeys ? ` ${src.pipedrive.duplicateKeys} duplicate row keys not used.` : ''}`,
      },
      {
        kind: 'masterDealList', name: src.masterDealList.name, modifiedAt: src.masterDealList.modifiedAt, count: src.masterDealList.rows.size,
        note: `Valuation on ${src.masterDealList.valued.toLocaleString()} rows; no valuation date in the file - dated ${MDL_VALUATION_DATE} (${MDL_VALUATION_DATE_NOTE}). Linked via the historical master_deal_list "All Deals row N"; in-flight rows have no link.`,
      },
      {
        kind: 'unconditionals', name: src.unconditionals.name, modifiedAt: src.unconditionals.modifiedAt,
        note: src.unconditionals.valuationColumns.length
          ? `Valuation column found but not read yet: ${src.unconditionals.valuationColumns.join('; ')}`
          : `Checked ${src.unconditionals.tabs} tabs: no valuation column - 0 valuations taken.`,
      },
      {
        kind: 'contactLinks', name: 'contact_links (app database)', modifiedAt: new Date().toISOString(), count: links.count,
        note: links.error
          ? `Not loaded, so no clients were merged: ${links.error}`
          : `${links.count.toLocaleString()} GHL contacts linked as the same person (seeded from the High groups of Duplicate contacts v1). ${mergedCount.toLocaleString()} clients here are rolled up from 2+ contacts.`,
      },
      {
        kind: 'ghlUsers', name: 'GHL users (live, read-only)', modifiedAt: new Date().toISOString(), count: users.names.size,
        note: users.error
          ? `Consultant names not loaded: ${users.error}`
          : 'Sales consultant = opportunity owner. Rows with no opportunity: Master Deal List Consultant via "All Deals row N" (the Unconditionals tracker has no row link, so it is not used).',
      },
    ],
    clients: list,
    people: merged,
    issues,
    totals: {
      clients: list.length,
      people: merged.length,
      properties: counted.length,
      priced: counted.filter((p) => p.totalPrice !== null).length,
      totalCost: counted.reduce((s, p) => s + (p.totalPrice ?? 0), 0),
      fellOver: all.length - counted.length,
      valued: counted.filter((p) => p.valuation !== null).length,
      totalValuation: counted.reduce((s, p) => s + (p.valuation ?? 0), 0),
      growthCost: counted.reduce((s, p) => s + (p.growth !== null ? p.totalPrice ?? 0 : 0), 0),
      growth: counted.reduce((s, p) => s + (p.growth ?? 0), 0),
    },
  };
}

// The contact a client stands for: its opportunity contact, or a single matched contact for no-opportunity clients.
function effectiveContact(c: PortfolioClient): string | null {
  if (c.contactId) return c.contactId;
  if (c.ghlMatch?.status === 'contact_exists' && c.ghlMatch.contacts.length === 1) return c.ghlMatch.contacts[0].id;
  return null;
}

// Item 13: clients whose contacts share a contact_links person key become one client.
function mergeByPerson(list: PortfolioClient[], byContact: Map<string, string>, asAt: string): PortfolioClient[] {
  const out: PortfolioClient[] = [];
  const groups = new Map<string, PortfolioClient[]>();
  for (const c of list) {
    const id = effectiveContact(c);
    const pk = id ? byContact.get(id) : undefined;
    if (!pk) {
      out.push(c);
      continue;
    }
    c.personKey = pk;
    groups.set(pk, [...(groups.get(pk) || []), c]);
  }
  for (const members of groups.values()) {
    if (members.length === 1) {
      out.push(members[0]);
      continue;
    }
    members.sort((a, b) => Number(b.hasGhlContact) - Number(a.hasGhlContact) || b.rollup.properties - a.rollup.properties);
    const [main, ...rest] = members;
    const c: PortfolioClient = {
      ...main,
      opportunities: [...main.opportunities],
      consultants: [...main.consultants],
      alsoKnownAs: [...main.alsoKnownAs],
      mergedFrom: members.map((m) => ({ contactId: effectiveContact(m), name: m.name })),
    };
    for (const r of rest) {
      c.opportunities.push(...r.opportunities);
      for (const k of r.consultants) if (!c.consultants.some((x) => x.name === k.name)) c.consultants.push(k);
      for (const n of r.alsoKnownAs) {
        if (n && nameTokens(n) !== nameTokens(c.name) && !c.alsoKnownAs.includes(n)) c.alsoKnownAs.push(n);
      }
      if (!c.email && r.email) c.email = r.email;
    }
    c.rollup = rollup(c, asAt);
    out.push(c);
  }
  return out;
}

function emptyRollup(): PortfolioRollup {
  return {
    properties: 0, priced: 0, totalCost: 0, firstPurchase: '', lastPurchase: '', undated: 0, inFlight: 0, historical: 0, fellOver: 0,
    valued: 0, totalValuation: 0, growthCost: 0, growth: null, growthPct: null, growthPa: null, newestValuationDate: '', valuationAgeMonths: null,
  };
}

function rollup(c: PortfolioClient, asAt: string): PortfolioRollup {
  const r = emptyRollup();
  let first: number | null = null;
  let last: number | null = null;
  let newest: number | null = null;
  let growthSum = 0;
  let paCost = 0;
  let paValue = 0;
  let paYearsWeighted = 0;
  for (const o of c.opportunities) {
    for (const p of o.properties) {
      if (p.fellOver) { r.fellOver++; continue; }
      r.properties++;
      if (p.source === 'inflight') r.inFlight++; else r.historical++;
      if (p.totalPrice !== null) { r.priced++; r.totalCost += p.totalPrice; }
      if (p.valuation !== null) {
        r.valued++;
        r.totalValuation += p.valuation;
        const vt = dateTime(p.valuationDate);
        if (vt !== null && (newest === null || vt > newest)) { newest = vt; r.newestValuationDate = p.valuationDate; }
        if (p.growth !== null && p.totalPrice !== null) {
          r.growthCost += p.totalPrice;
          growthSum += p.growth;
          if (p.heldYears !== null && p.heldYears >= 1) {
            paCost += p.totalPrice;
            paValue += p.valuation;
            paYearsWeighted += p.heldYears * p.totalPrice;
          }
        }
      }
      const t = dateTime(p.contractDate);
      if (t === null) { r.undated++; continue; }
      if (first === null || t < first) { first = t; r.firstPurchase = p.contractDate; }
      if (last === null || t > last) { last = t; r.lastPurchase = p.contractDate; }
    }
  }
  if (r.growthCost) {
    r.growth = growthSum;
    r.growthPct = growthSum / r.growthCost;
  }
  if (paCost) r.growthPa = Math.pow(paValue / paCost, 1 / (paYearsWeighted / paCost)) - 1;
  if (r.newestValuationDate) r.valuationAgeMonths = monthsBetween(r.newestValuationDate, asAt);
  return r;
}
