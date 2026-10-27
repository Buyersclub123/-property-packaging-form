import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { SourceKind, SourceTab } from './types';

// Demo mode reads the unloaded files from JT's Google Drive for desktop folder (dev server only).
// Live GHL / Drive API is backlog item 8.
export const SOURCE_DIR = process.env.PORTFOLIO_SOURCE_DIR || 'G:\\My Drive\\Purchase Data Reconstruction';
export const SNAPSHOT_DATE = '2026-10-27';

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
}

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

export function loadSources(): LoadedSources {
  return {
    sourceDir: SOURCE_DIR,
    inflight: loadWorkbook('inflight'),
    historical: loadWorkbook('historical'),
    opportunities: loadOpportunities(),
    propertyRecords: loadPropertyRecords(),
  };
}
