/**
 * Build Drawdown Calculator settings — shared between the settings API route
 * and the packaging tool (which writes them into each new Split Contract
 * cashflow sheet's "Build Stage Lookup" tab).
 *
 * Stored in Redis under DRAWDOWN_SETTINGS_KEY as { settings, updatedAt, updatedBy }.
 * The settings JSON schema and the lookup-tab layout are defined by the
 * calculator (public/calc-embed/drawdown/index.html — DEFAULT_SETTINGS / settingsToCSV).
 */

import { getRedisClient } from '@/lib/redis';

export const DRAWDOWN_SETTINGS_KEY = 'drawdown:settings';

export type DrawdownGap = { value: number; unit: 'days' | 'weeks' | 'months' };
export type DrawdownStage = { d: string; p: number; s?: Record<string, number> };
export type DrawdownStateSettings = {
  windows: number[];
  baseWindow: number;
  baseUnit: 'days' | 'weeks' | 'months';
  rentGap: DrawdownGap;
  settlementGap: DrawdownGap;
  stages: DrawdownStage[];
};
export type DrawdownSettings = {
  meta: {
    version: number | string;
    updated: string;
    updatedBy: string;
    history?: { version: number | string; updated: string; by: string }[];
  };
  states: Record<string, DrawdownStateSettings>;
};
export type DrawdownSettingsRecord = {
  settings: DrawdownSettings | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const DRAWDOWN_STATE_ORDER = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

function stdState(stages: DrawdownStage[]): DrawdownStateSettings {
  return {
    windows: [9, 12, 15, 18],
    baseWindow: 12,
    baseUnit: 'months',
    rentGap: { value: 1, unit: 'months' },
    settlementGap: { value: 0, unit: 'months' },
    stages,
  };
}

/** Mirror of DEFAULT_SETTINGS in the calculator HTML. Used only while nothing has been saved. */
export const DRAWDOWN_DEFAULT_SETTINGS: DrawdownSettings = {
  meta: {
    version: 1,
    updated: '2026-10-12',
    updatedBy: 'Built-in defaults (Google Sheet v2.9)',
    history: [{ version: 1, updated: '2026-10-12', by: 'Built-in defaults (Google Sheet v2.9)' }],
  },
  states: {
    NSW: stdState([
      { d: 'Deposit', p: 5 },
      { d: 'Base', p: 15, s: { 9: 1.5, 12: 2, 15: 2.5, 18: 3 } },
      { d: 'Frame', p: 20, s: { 9: 3.75, 12: 5, 15: 6.25, 18: 7.5 } },
      { d: 'Enclosed', p: 35, s: { 9: 6, 12: 8, 15: 10, 18: 12 } },
      { d: 'Fixing', p: 20, s: { 9: 7.5, 12: 10, 15: 12.5, 18: 15 } },
      { d: 'Balance', p: 5, s: { 9: 9, 12: 12, 15: 15, 18: 18 } },
    ]),
    VIC: stdState([
      { d: 'Deposit', p: 5 },
      { d: 'Base Stage', p: 10, s: { 9: 1.5, 12: 2, 15: 2.5, 18: 3 } },
      { d: 'Frame Stage', p: 15, s: { 9: 3.75, 12: 5, 15: 6.25, 18: 7.5 } },
      { d: 'Lockup Stage', p: 35, s: { 9: 6, 12: 8, 15: 10, 18: 12 } },
      { d: 'Fixing Stage', p: 25, s: { 9: 7.5, 12: 10, 15: 12.5, 18: 15 } },
      { d: 'Completion', p: 10, s: { 9: 9, 12: 12, 15: 15, 18: 18 } },
    ]),
    QLD: stdState([
      { d: 'Deposit', p: 5 },
      { d: 'Base', p: 15, s: { 9: 1.5, 12: 2, 15: 2.5, 18: 3 } },
      { d: 'Frame', p: 20, s: { 9: 3.75, 12: 5, 15: 6.25, 18: 7.5 } },
      { d: 'Enclosed', p: 25, s: { 9: 6, 12: 8, 15: 10, 18: 12 } },
      { d: 'Fixing', p: 20, s: { 9: 7.5, 12: 10, 15: 12.5, 18: 15 } },
      { d: 'Practical Completion', p: 15, s: { 9: 9, 12: 12, 15: 15, 18: 18 } },
    ]),
    SA: stdState([
      { d: 'Deposit', p: 5 },
      { d: 'Footings Poured', p: 15, s: { 9: 1.5, 12: 2, 15: 2.5, 18: 3 } },
      { d: 'Substantial completion of wall and frame', p: 20, s: { 9: 3, 12: 4, 15: 5, 18: 6 } },
      { d: 'Substantial completion of external walls and roof covering', p: 20, s: { 9: 4.5, 12: 6, 15: 7.5, 18: 9 } },
      { d: 'Substantial completion of internal linings', p: 20, s: { 9: 6, 12: 8, 15: 10, 18: 12 } },
      { d: 'Substantial completion of second fix carpentry (including built in cupboards)', p: 10, s: { 9: 7.5, 12: 10, 15: 12.5, 18: 15 } },
      { d: 'Practical Completion', p: 10, s: { 9: 9, 12: 12, 15: 15, 18: 18 } },
    ]),
    WA: stdState([
      { d: 'Initial Deposit (not to exceed 6.5%)', p: 6.5 },
      { d: 'Concrete Slab', p: 13.5, s: { 9: 1.5, 12: 2, 15: 2.5, 18: 3 } },
      { d: 'Plate Height', p: 30, s: { 9: 3.75, 12: 5, 15: 6.25, 18: 7.5 } },
      { d: 'Roof Cover', p: 25, s: { 9: 5.625, 12: 7.5, 15: 9.375, 18: 11.25 } },
      { d: 'Lock Up', p: 15, s: { 9: 7.5, 12: 10, 15: 12.5, 18: 15 } },
      { d: 'Practical Completion', p: 10, s: { 9: 9, 12: 12, 15: 15, 18: 18 } },
    ]),
  },
};

/** Read the saved settings record from Redis. Returns nulls when nothing has been saved. */
export async function readDrawdownSettingsRecord(): Promise<DrawdownSettingsRecord> {
  const redis = await getRedisClient();
  const raw = await redis.get(DRAWDOWN_SETTINGS_KEY);
  if (!raw) return { settings: null, updatedAt: null, updatedBy: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      settings: parsed?.settings ?? null,
      updatedAt: parsed?.updatedAt ?? null,
      updatedBy: parsed?.updatedBy ?? null,
    };
  } catch {
    return { settings: null, updatedAt: null, updatedBy: null };
  }
}

export async function writeDrawdownSettingsRecord(record: DrawdownSettingsRecord): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(DRAWDOWN_SETTINGS_KEY, JSON.stringify(record));
}

/** Settings for the packaging tool: saved settings, or the built-in defaults. Never throws. */
export async function loadDrawdownSettings(): Promise<DrawdownSettings> {
  try {
    const { settings } = await readDrawdownSettingsRecord();
    if (settings && settings.states && Object.keys(settings.states).length > 0) return settings;
  } catch (error) {
    console.error('[drawdown] Could not read settings from Redis, using defaults:', error);
  }
  return DRAWDOWN_DEFAULT_SETTINGS;
}

// Window column labels match the Google Sheet and the packaging tool: "09 mo", "12 mo", "06 mo", "6.5 mo".
export function winLabel(w: number): string {
  return (Number.isInteger(w) && w < 10 ? '0' + w : String(w)) + ' mo';
}

const SET_COLS = ['Base window', 'Base unit', 'Rent gap', 'Rent gap unit', 'Settlement gap', 'Settlement gap unit'];
const MAX_COLS = 26; // the sheet reads A:Z

export type LookupCell = string | number;

/**
 * Convert settings to the "Build Stage Lookup" rows (header first), ready to write at A2.
 * Port of settingsToCSV() in the calculator, except Percent is a number (0.05) not "5.00%".
 */
export function toBuildStageRows(s: DrawdownSettings): LookupCell[][] {
  const codes = DRAWDOWN_STATE_ORDER.filter((k) => s.states?.[k]);
  const allW = Array.from(new Set(codes.flatMap((k) => s.states[k].windows || []))).sort((a, b) => a - b);
  const head: LookupCell[] = ['State', 'Stage #', 'Stage Description', 'Percent', ...allW.map(winLabel), ...SET_COLS, '', 'Setting', 'Value'];
  const rows: LookupCell[][] = [head];

  codes.forEach((code) => {
    const st = s.states[code];
    (st.stages || []).forEach((x, i) => {
      const r: LookupCell[] = [code, i, x.d ?? '', Math.round((Number(x.p) || 0) * 100) / 10000];
      allW.forEach((w) => {
        const v = x.s?.[String(w)];
        r.push(i === 0 || !(st.windows || []).includes(w) || v === undefined || v === null || Number.isNaN(Number(v)) ? '' : Number(v));
      });
      if (i === 0) r.push(st.baseWindow, st.baseUnit, st.rentGap?.value ?? '', st.rentGap?.unit ?? '', st.settlementGap?.value ?? '', st.settlementGap?.unit ?? '');
      else SET_COLS.forEach(() => r.push(''));
      r.push('', '', '');
      rows.push(r);
    });
  });

  const meta: [string, LookupCell][] = [
    ['Settings version', s.meta?.version ?? ''],
    ['Last updated', s.meta?.updated ?? ''],
    ['Updated by', s.meta?.updatedBy ?? ''],
  ];
  meta.forEach(([k, v], i) => {
    const r = rows[i + 1] || (rows[i + 1] = head.map(() => ''));
    r[head.length - 2] = k;
    r[head.length - 1] = v;
  });

  if (head.length > MAX_COLS) {
    console.warn(`[drawdown] Build Stage Lookup has ${head.length} columns; the sheet only reads A:Z. Truncating.`);
    return rows.map((r) => r.slice(0, MAX_COLS));
  }
  return rows;
}
