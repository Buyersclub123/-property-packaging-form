import type { Sale, SaleSource, SalesData } from './types';

// Sold / Revenue maths over the GHL sales, shared by the Stats and Sales tabs.
// gross = every sale signed in the period; net = those not cancelled. Revenue = GHL Total Fee.

export interface SaleItem {
  id: string;
  signed: string;
  client: string;
  consultant: string;
  cc: string;
  source: SaleSource;
  meetingSource: string;
  meetingSourceTip: string;
  pipeline: string;
  stage: string;
  fee: number;
  cancelled: boolean;
  lostReason: string;
  sale: Sale;
}

export function saleItems(d: SalesData): SaleItem[] {
  return d.sales
    .map((s) => ({
      id: s.id, signed: s.signed, client: s.client, consultant: s.consultant, cc: s.cc, source: s.source,
      meetingSource: s.meetingSource, meetingSourceTip: s.meetingSourceTip, pipeline: s.pipeline, stage: s.stage,
      fee: s.fee, cancelled: s.cancelled, lostReason: s.lostReason, sale: s,
    }))
    .sort((a, b) => a.signed.localeCompare(b.signed));
}

export interface SoldRow {
  name: string;
  /** By the type of the meeting the sale is credited to. */
  nl: number;
  pr: number;
  cf: number;
  none: number;
  total: number;
  revenue: number;
  cancelled: number;
  cancelledRevenue: number;
}

const SOLD_KEYS = ['nl', 'pr', 'cf', 'none', 'total', 'revenue', 'cancelled', 'cancelledRevenue'] as const;

export const emptySold = (name: string): SoldRow => ({ name, nl: 0, pr: 0, cf: 0, none: 0, total: 0, revenue: 0, cancelled: 0, cancelledRevenue: 0 });

function add(r: SoldRow, it: SaleItem, net: boolean) {
  if (it.cancelled) {
    r.cancelled++;
    r.cancelledRevenue += it.fee;
  }
  if (net && it.cancelled) return;
  r.total++;
  r.revenue += it.fee;
  if (it.source === 'Presentation 1') r.nl++;
  else if (it.source === 'PR') r.pr++;
  else if (it.source === 'Cashflow Club') r.cf++;
  else r.none++;
}

export function soldBy(items: SaleItem[], key: (it: SaleItem) => string, net: boolean): { by: Map<string, SoldRow>; total: SoldRow } {
  const by = new Map<string, SoldRow>();
  const total = emptySold('TOTAL');
  for (const it of items) {
    const k = key(it);
    const r = by.get(k) || emptySold(k);
    add(r, it, net);
    add(total, it, net);
    by.set(k, r);
  }
  return { by, total };
}

export function sumSold(rows: SoldRow[]): SoldRow {
  const t = emptySold('TOTAL');
  for (const r of rows) for (const k of SOLD_KEYS) t[k] += r[k];
  return t;
}

export const itemsIn = (items: SaleItem[], from: string, to: string) => items.filter((it) => it.signed >= from && it.signed <= to);

export const aud = (n: number) => (n ? `$${Math.round(n).toLocaleString('en-AU')}` : '');
