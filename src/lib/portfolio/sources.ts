import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { ghlFetch } from '@/lib/ghlFetch';
import type { SourceKind, SourceTab } from './types';

// Demo mode reads the unloaded files from JT's Google Drive for desktop folder (dev server only).
// Live GHL / Drive API is backlog item 8.
export const SOURCE_DIR = process.env.PORTFOLIO_SOURCE_DIR || 'G:\\My Drive\\Purchase Data Reconstruction';
export const SNAPSHOT_DATE = '2026-10-27';

// JT 28/10: the Master Deal List has no valuation date; treat its valuations as dated at the file enrichment date.
export const MDL_VALUATION_DATE = '28/09/2026';
export const MDL_VALUATION_DATE_NOTE = 'date assumed – file date';

const HEADER_ROW = 2; // header is on row 3 of every data tab

const WORKBOOKS: Record<SourceKind, { folder: string; pattern: RegExp; tabs: (n: number) => boolean }> = {
  inflight: {
    folder: '04 GHL load files',
    pattern: /^In-flight Property Records - Load file v(\d+) \(Claude\)\.xlsx$/,
    tabs: (n) => n >= 1 && n <= 10, // 11 Monday is not loaded until answered
  },
  historical: {
    folder: '05 Historical',
    pattern: /^Historical Property Records - Candidate file v(\d+) \(Claude\)\.xlsx$/,
    tabs: (n) => n >= 1 && n <= 12, // 13-17 are not loads
  },
};

const REQUIRED_COLUMNS = ['opportunity_id', 'total_price', 'contract_date (new field)'];

export type SheetRow = Record<string, unknown>;

export interface LoadedRow { tab: string; rowNumber: number; values: SheetRow }

export interface LoadedWorkbook {
  kind: SourceKind;
  name: string;
  modifiedAt: string;
  tabs: SourceTab[];
  rows: LoadedRow[];
}

export interface GhlOpportunity {
  id: string;
  name: string;
  pipelineStageId: string;
  assignedTo?: string | null;
  status: string;
  contactId: string;
  contact?: { id: string; name: string | null; email: string | null } | null;
  customFields: { id: string; fieldValueString?: string; fieldValueDate?: number; fieldValueNumber?: number }[] | null;
}

export interface LoadedOpportunities {
  name: string;
  modifiedAt: string;
  takenAt: string;
  stages: Record<string, [string, string]>;
  opportunities: GhlOpportunity[];
}

export interface GhlPropertyRecord { id: string; properties: Record<string, unknown> | null }

export interface LoadedPropertyRecords { name: string; modifiedAt: string; records: GhlPropertyRecord[] }

export interface LoadedSources {
  sourceDir: string;
  inflight: LoadedWorkbook;
  historical: LoadedWorkbook;
  opportunities: LoadedOpportunities;
  propertyRecords: LoadedPropertyRecords;
  masterDealList: LoadedMasterDealList;
  unconditionals: LoadedUnconditionals;
  pipedrive: LoadedPipedrive;
  ghlAll: LoadedGhlAll;
}

export interface MdlRow { row: number; valuation: number | null; valuationRaw: string; address: string; stage: string; consultant: string; name: string; email: string }

export interface LoadedMasterDealList { name: string; modifiedAt: string; rows: Map<number, MdlRow>; valued: number }

export interface LoadedUnconditionals { name: string; modifiedAt: string; tabs: number; valuationColumns: string[] }

function statOrThrow(file: string): fs.Stats {
  try {
    return fs.statSync(file);
  } catch (e) {
    throw new Error(`Cannot read ${file}: ${(e as Error).message}`);
  }
}

function latestVersion(folder: string, pattern: RegExp): string {
  let names: string[];
  try {
    names = fs.readdirSync(folder);
  } catch (e) {
    throw new Error(`Cannot list ${folder}: ${(e as Error).message}`);
  }
  const versions = names
    .map((n) => ({ n, m: n.match(pattern) }))
    .filter((x): x is { n: string; m: RegExpMatchArray } => !!x.m)
    .sort((a, b) => Number(b.m[1]) - Number(a.m[1]));
  if (!versions.length) throw new Error(`No file matching ${pattern} in ${folder}`);
  return versions[0].n;
}

function loadWorkbook(kind: SourceKind): LoadedWorkbook {
  const cfg = WORKBOOKS[kind];
  const folder = path.join(SOURCE_DIR, cfg.folder);
  const name = latestVersion(folder, cfg.pattern);
  const file = path.join(folder, name);
  const stat = statOrThrow(file);
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  } catch (e) {
    throw new Error(`Cannot open ${name}: ${(e as Error).message}`);
  }

  const tabs: SourceTab[] = [];
  const rows: LoadedRow[] = [];
  for (const tab of wb.SheetNames) {
    const num = tab.match(/^(\d+) /);
    const sheet = wb.Sheets[tab];
    if (!num) continue;
    if (!cfg.tabs(Number(num[1]))) {
      const count = Math.max(0, XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }).length - HEADER_ROW - 1);
      tabs.push({ tab, rows: count, included: false });
      continue;
    }
    const header = (XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })[HEADER_ROW] || []).map(String);
    if (!header.includes('opportunity_id')) {
      tabs.push({ tab, rows: 0, included: true, note: 'no data table on this tab (row 3 has no opportunity_id column)' });
      continue;
    }
    const isUpdates = /updates/i.test(tab);
    const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missing.length) throw new Error(`${name} / ${tab}: column(s) missing on row 3: ${missing.join(', ')}`);
    if (!isUpdates && !header.includes('property_address')) {
      throw new Error(`${name} / ${tab}: column property_address missing on row 3`);
    }
    const data = XLSX.utils.sheet_to_json<SheetRow>(sheet, { range: HEADER_ROW, defval: '', blankrows: true });
    let count = 0;
    data.forEach((values, i) => {
      const hasContent = ['opportunity_id', 'Opportunity name', 'client_closed', 'property_address', 'total_price'].some(
        (k) => String(values[k] ?? '').trim() !== '',
      );
      if (!hasContent) return;
      rows.push({ tab, rowNumber: HEADER_ROW + 2 + i, values });
      count++;
    });
    tabs.push({ tab, rows: count, included: true });
  }
  return { kind, name, modifiedAt: stat.mtime.toISOString(), tabs, rows };
}

function readJson(file: string): unknown {
  statOrThrow(file);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot parse ${path.basename(file)}: ${(e as Error).message}`);
  }
}

function loadOpportunities(): LoadedOpportunities {
  const name = `ghl-opportunities-snapshot-${SNAPSHOT_DATE}.json`;
  const file = path.join(SOURCE_DIR, '01 Source extracts', name);
  const d = readJson(file) as Partial<LoadedOpportunities>;
  if (!d || !Array.isArray(d.opportunities) || !d.stages || typeof d.stages !== 'object') {
    throw new Error(`${name}: expected { takenAt, stages, opportunities[] }`);
  }
  return {
    name,
    modifiedAt: statOrThrow(file).mtime.toISOString(),
    takenAt: String(d.takenAt ?? ''),
    stages: d.stages as Record<string, [string, string]>,
    opportunities: d.opportunities,
  };
}

function loadPropertyRecords(): LoadedPropertyRecords {
  const name = `ghl-property-reviews-snapshot-${SNAPSHOT_DATE}.json`;
  const file = path.join(SOURCE_DIR, '01 Source extracts', name);
  const d = readJson(file);
  if (!Array.isArray(d)) throw new Error(`${name}: expected an array of Property Records`);
  return { name, modifiedAt: statOrThrow(file).mtime.toISOString(), records: d as GhlPropertyRecord[] };
}

function singleFile(folder: string, pattern: RegExp): string {
  let names: string[];
  try {
    names = fs.readdirSync(folder);
  } catch (e) {
    throw new Error(`Cannot list ${folder}: ${(e as Error).message}`);
  }
  const hits = names.filter((n) => pattern.test(n));
  if (!hits.length) throw new Error(`No file matching ${pattern} in ${folder}`);
  if (hits.length > 1) throw new Error(`More than one file matches ${pattern} in ${folder}: ${hits.join('; ')}`);
  return hits[0];
}

function openWorkbook(file: string, name: string): XLSX.WorkBook {
  try {
    return XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  } catch (e) {
    throw new Error(`Cannot open ${name}: ${(e as Error).message}`);
  }
}

function loadMasterDealList(): LoadedMasterDealList {
  const folder = path.join(SOURCE_DIR, '01 Source extracts');
  const name = singleFile(folder, /^Buyers Club Master Deal List.*\.xlsx$/);
  const file = path.join(folder, name);
  const stat = statOrThrow(file);
  const sheet = openWorkbook(file, name).Sheets['All Deals'];
  if (!sheet) throw new Error(`${name}: tab "All Deals" not found`);
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const header = (aoa[0] || []).map((c) => String(c).trim());
  const col = (h: string) => {
    const i = header.indexOf(h);
    if (i < 0) throw new Error(`${name} / All Deals: column "${h}" missing on row 1`);
    return i;
  };
  const vi = col('Valuation');
  const ai = col('Address');
  const si = col('Stage');
  const ci = col('Consultant');
  const ni = col('Name of client/s');
  const ei = col('Email');
  const rows = new Map<number, MdlRow>();
  let valued = 0;
  aoa.slice(1).forEach((r, i) => {
    const raw = r[vi];
    const valuation = typeof raw === 'number' ? raw : null;
    if (valuation !== null) valued++;
    rows.set(i + 2, {
      row: i + 2,
      valuation,
      valuationRaw: valuation === null ? String(raw ?? '').trim() : '',
      address: String(r[ai] ?? '').trim(),
      stage: String(r[si] ?? '').trim(),
      consultant: String(r[ci] ?? '').trim(),
      name: String(r[ni] ?? '').trim(),
      email: String(r[ei] ?? '').trim(),
    });
  });
  return { name, modifiedAt: stat.mtime.toISOString(), rows, valued };
}

// The tracker has no valuation column today; it is still read so a new one is noticed rather than ignored.
function loadUnconditionals(): LoadedUnconditionals {
  const folder = path.join(SOURCE_DIR, '01 Source extracts');
  const name = singleFile(folder, /^PROPERTY TEAM UNCONDITIONALS.*\.xlsx$/);
  const file = path.join(folder, name);
  const stat = statOrThrow(file);
  const wb = openWorkbook(file, name);
  const valuationColumns: string[] = [];
  for (const tab of wb.SheetNames) {
    const top = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[tab], { header: 1, defval: '' }).slice(0, 3);
    top.forEach((r, i) => r.forEach((c) => {
      const s = String(c).trim();
      if (s.length <= 40 && /^(latest )?valuation\b(?! ordered)/i.test(s)) valuationColumns.push(`${tab} row ${i + 1}: "${s}"`);
    }));
  }
  return { name, modifiedAt: stat.mtime.toISOString(), tabs: wb.SheetNames.length, valuationColumns };
}

export interface PipedriveRow {
  fileClient: string; clientFilled: string; clientSource: string; dealId: string; owner: string; stage: string; basis: string; nameAgrees: string; email: string;
}

export interface LoadedPipedrive {
  name: string; modifiedAt: string; rows: Map<string, PipedriveRow>; total: number; matched: number; filled: number; duplicateKeys: number;
}

// Rows of the Pipedrive match file are the historical no-opportunity rows; joined on tab + Master row + contract id + address.
export function pipedriveKey(tab: string, masterRow: unknown, contractIds: unknown, address: unknown): string {
  const mdl = String(masterRow ?? '').match(/All Deals row (\d+)/);
  return [tab.trim(), mdl ? mdl[1] : '', String(contractIds ?? '').trim(), String(address ?? '').trim().toUpperCase()].join('|');
}

function loadPipedriveMatch(): LoadedPipedrive {
  const folder = path.join(SOURCE_DIR, '05 Historical');
  const name = latestVersion(folder, /^No GHL contact - Pipedrive match v(\d+) \(Claude\)\.xlsx$/);
  const file = path.join(folder, name);
  const stat = statOrThrow(file);
  const wb = openWorkbook(file, name);
  const tab = wb.SheetNames.find((s) => /^All rows/i.test(s));
  if (!tab) throw new Error(`${name}: no "All rows" tab`);
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[tab], { header: 1, defval: '' });
  const header = (aoa[0] || []).map((c) => String(c).trim());
  const col = (h: string) => {
    const i = header.indexOf(h);
    if (i < 0) throw new Error(`${name} / ${tab}: column "${h}" missing on row 1`);
    return i;
  };
  const ix = {
    tab: col('Tab'), master: col('Master row'), contract: col('Contract ids'), address: col('Property address'),
    fileClient: col('Client (file)'), filled: col('Client name (filled)'), source: col('Client name - source'),
    deal: col('Pipedrive deal ID'), owner: col('Pipedrive deal owner (handled the file)'), stage: col('Pipedrive pipeline / stage'),
    basis: col('Match basis (address / lot)'), agrees: col('Name agrees'), email: col('Pipedrive person email'),
  };
  const s = (r: unknown[], i: number) => String(r[i] ?? '').trim();
  const rows = new Map<string, PipedriveRow>();
  const dupes = new Set<string>();
  let total = 0;
  let matched = 0;
  let filled = 0;
  for (const r of aoa.slice(1)) {
    if (!r.some((c) => String(c).trim())) continue;
    total++;
    const row: PipedriveRow = {
      fileClient: s(r, ix.fileClient), clientFilled: s(r, ix.filled), clientSource: s(r, ix.source), dealId: s(r, ix.deal),
      owner: s(r, ix.owner), stage: s(r, ix.stage), basis: s(r, ix.basis), nameAgrees: s(r, ix.agrees), email: s(r, ix.email),
    };
    if (row.dealId) matched++;
    if (row.clientFilled) filled++;
    const key = pipedriveKey(s(r, ix.tab), r[ix.master], r[ix.contract], r[ix.address]);
    if (rows.has(key)) dupes.add(key);
    else rows.set(key, row);
  }
  for (const k of dupes) rows.delete(k);
  return { name, modifiedAt: stat.mtime.toISOString(), rows, total, matched, filled, duplicateKeys: dupes.size };
}

// JT 28/10: read-only pull of ALL contacts and ALL opportunities (every pipeline), saved as snapshots in 01 Source extracts.
export const CONTACTS_SNAPSHOT_DATE = '2026-10-28';

export interface SnapContact { id: string; name: string; firstName: string; lastName: string; email: string; additionalEmails: string[] }

export interface SnapOpp { id: string; name: string; pipeline: string; status: string; contactId: string }

export interface LoadedGhlAll {
  contactsName: string; oppsName: string; takenAt: string; modifiedAt: string;
  contacts: SnapContact[]; opportunities: SnapOpp[]; pipelines: { name: string; opportunities: number }[];
}

function loadGhlAll(): LoadedGhlAll {
  const dir = path.join(SOURCE_DIR, '01 Source extracts');
  const contactsName = `ghl-contacts-snapshot-${CONTACTS_SNAPSHOT_DATE}.json`;
  const oppsName = `ghl-opportunities-all-snapshot-${CONTACTS_SNAPSHOT_DATE}.json`;
  const c = readJson(path.join(dir, contactsName)) as { takenAt?: string; contacts?: SnapContact[] } | null;
  const o = readJson(path.join(dir, oppsName)) as { pipelines?: { name: string; opportunities: number }[]; opportunities?: SnapOpp[] } | null;
  if (!c || !Array.isArray(c.contacts)) throw new Error(`${contactsName}: expected { takenAt, contacts[] }`);
  if (!o || !Array.isArray(o.opportunities) || !Array.isArray(o.pipelines)) throw new Error(`${oppsName}: expected { takenAt, pipelines[], opportunities[] }`);
  return {
    contactsName, oppsName, takenAt: String(c.takenAt ?? ''), modifiedAt: statOrThrow(path.join(dir, contactsName)).mtime.toISOString(),
    contacts: c.contacts, opportunities: o.opportunities, pipelines: o.pipelines,
  };
}

export interface GhlUsers { names: Map<string, string>; error?: string }

// Read-only GET of the GHL users list: names for opportunity owner ids (= sales consultant). Live on each request.
export async function loadGhlUsers(): Promise<GhlUsers> {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return { names: new Map(), error: 'GHL_BEARER_TOKEN / GHL_LOCATION_ID not set' };
  const base = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
  try {
    const res = await ghlFetch(
      `${base}/users/?locationId=${locationId}`,
      {
        headers: { Authorization: `Bearer ${token}`, Version: process.env.GHL_API_VERSION || '2021-07-28', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      },
      'portfolio',
    );
    if (!res.ok) return { names: new Map(), error: `GHL users request returned HTTP ${res.status}` };
    const body = (await res.json()) as { users?: { id: string; name?: string; firstName?: string; lastName?: string }[] };
    const names = new Map((body.users || []).map((u) => [u.id, u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()]));
    return { names };
  } catch (e) {
    return { names: new Map(), error: `GHL users request failed: ${(e as Error).message}` };
  }
}

export function loadSources(): LoadedSources {
  return {
    sourceDir: SOURCE_DIR,
    inflight: loadWorkbook('inflight'),
    historical: loadWorkbook('historical'),
    opportunities: loadOpportunities(),
    propertyRecords: loadPropertyRecords(),
    masterDealList: loadMasterDealList(),
    unconditionals: loadUnconditionals(),
    pipedrive: loadPipedriveMatch(),
    ghlAll: loadGhlAll(),
  };
}
