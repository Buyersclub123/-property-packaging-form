import type { Sale, SaleCancel, SaleSource, SalesData } from './types';

// Sold / Revenue maths over the Tracking-sheet sales, shared by the Stats and Sales tabs.
// Most cancelled deals are removed from the office tabs and only appear in CANCELLATIONS, so:
//   gross = sales listed + cancellations not found in the office tabs; net = sales listed that aren't cancelled.
// Revenue (paid + balance) is only known for listed sales; a cancellation's fee counts only when its sale is found.

export interface SaleItem {
  id: string;
  signed: string;
  client: string;
  office: string;
  consultant: string;
  cc: string;
  source: SaleSource;
  broker: string;
  smsf: string;
  fee: number;
  paid: number;
  cancelled: boolean;
  /** A CANCELLATIONS row whose sale isn't in the office tabs any more. */
  removed: boolean;
  sale: Sale | null;
  cancel: SaleCancel | null;
}

export function saleItems(d: SalesData): SaleItem[] {
  const cancelBySale = new Map(d.cancels.filter((c) => c.saleId).map((c) => [c.saleId!, c]));
  const items: SaleItem[] = d.sales.map((s) => ({
    id: s.id, signed: s.signed, client: s.client, office: s.office, consultant: s.consultant, cc: s.cc, source: s.source,
    broker: s.broker, smsf: s.smsf, fee: s.fee, paid: s.paid, cancelled: s.cancelled, removed: false, sale: s, cancel: cancelBySale.get(s.id) || null,
  }));
  for (const c of d.cancels) {
    if (c.saleId) continue;
    items.push({
      id: c.id, signed: c.signed, client: c.client, office: c.office, consultant: c.consultant, cc: c.cc, source: c.source,
      broker: '', smsf: '', fee: 0, paid: 0, cancelled: true, removed: true, sale: null, cancel: c,
    });
  }
  return items.sort((a, b) => a.signed.localeCompare(b.signed));
}

export interface SoldRow {
  name: string;
  nl: number;
  ref: number;
  pr: number;
  selfGen: number;
  repeat: number;
  other: number;
  total: number;
  revenue: number;
  cancelled: number;
  cancelledRevenue: number;
}

export const emptySold = (name: string): SoldRow => ({ name, nl: 0, ref: 0, pr: 0, selfGen: 0, repeat: 0, other: 0, total: 0, revenue: 0, cancelled: 0, cancelledRevenue: 0 });

function add(r: SoldRow, it: SaleItem, net: boolean) {
  if (it.cancelled) {
    r.cancelled++;
    r.cancelledRevenue += it.fee;
  }
  if (net && it.cancelled) return;
  r.total++;
  r.revenue += it.removed ? 0 : it.fee;
  if (it.source === 'New Lead') r.nl++;
  else if (it.source === 'Referral') r.ref++;
  else if (it.source === 'PR') r.pr++;
  else if (it.source === 'Self Gen') r.selfGen++;
  else if (it.source === 'Repeat') r.repeat++;
  else r.other++;
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
  for (const r of rows) {
    for (const k of ['nl', 'ref', 'pr', 'selfGen', 'repeat', 'other', 'total', 'revenue', 'cancelled', 'cancelledRevenue'] as const) t[k] += r[k];
  }
  return t;
}

export const itemsIn = (items: SaleItem[], from: string, to: string) => items.filter((it) => it.signed >= from && it.signed <= to);

export const aud = (n: number) => (n ? `$${Math.round(n).toLocaleString('en-AU')}` : '');
