'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataIssue, PortfolioClient, PortfolioData, PortfolioOpportunity, PortfolioProperty } from '@/lib/portfolio/types';
import RecordPopout from '@/components/records/RecordPopout';
import { propertyPageKey, type RecordPage } from '@/lib/records/types';

const PAGE_SIZE = 100;

// One fixed column grid for every property row under every client, so columns line up across the page.
const GRID = 'grid grid-cols-[minmax(0,1fr)_120px_96px_96px_72px_140px_140px_156px] gap-x-3';

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-blue-600 text-white',
  B: 'bg-blue-100 text-blue-800',
  'B (established, address match)': 'bg-blue-100 text-blue-800',
  'B-addr': 'bg-blue-100 text-blue-800',
  C: 'bg-blue-50 text-blue-800',
  D: 'bg-gray-100 text-gray-700',
  'D-spine (strong)': 'bg-gray-100 text-gray-700',
  'D-spine': 'bg-gray-50 text-gray-500',
  HOLD: 'bg-red-100 text-red-800',
};

const ISSUE_LABEL: Record<DataIssue['kind'], string> = {
  settlement_before_contract: 'Settlement before contract date',
  duplicate_opportunity: 'Opportunity on more than one row',
  opportunity_not_in_snapshot: 'Opportunity not in GHL snapshot',
  unparsed_date: 'Date not DD/MM/YYYY',
  unparsed_price: 'Price not a number',
  valuation_outlier: 'Valuation under 50% / over 300% of price',
  mdl_row_missing: 'Master Deal List row not found',
  mdl_row_shared: 'Master Deal List row linked twice',
  contact_name_ambiguous: 'Name matches 2+ GHL contacts',
};

const PURCHASE_DATE_HELP = 'Purchase date: land contract date for new builds; exchange (contract) date for established';

const money = (n: number | null) =>
  n === null ? '' : n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const fmtPct = (n: number | null) => (n === null ? '' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`);

const signedMoney = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;

const fmtHeld = (m: number | null) => {
  if (m === null) return '';
  if (m < 0) return 'not yet';
  const y = Math.floor(m / 12);
  return y ? `${y}y ${m % 12}m` : `${m}m`;
};

const Dash = () => <span className="text-gray-400">–</span>;

function Growth({ g, pct, pa }: { g: number | null; pct: number | null; pa: number | null }) {
  if (g === null) return <Dash />;
  return (
    <div className={g >= 0 ? 'text-green-700' : 'text-red-700'}>
      <div className="font-semibold">{signedMoney(g)}</div>
      <div className="text-xs">{fmtPct(pct)}{pa !== null && ` · ${fmtPct(pa)} p.a.`}</div>
    </div>
  );
}

const shortGrade = (g: string) => g.replace(' (established, address match)', ' est.').replace(' (strong)', ' strong');

const sydney = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const dmyTime = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : null;
};

type SortKey = 'properties' | 'totalCost' | 'valuation' | 'growth' | 'lastPurchase' | 'firstPurchase' | 'name';
type GroupFilter = 'all' | 'inflight' | 'historical' | 'contactNoOpp' | 'noContact' | 'createOpp';

const contactExists = (c: PortfolioClient) => c.ghlMatch?.status === 'contact_exists';

const NO_CONSULTANT = 'No consultant';
const isCreateOpp = (p: PortfolioProperty) => /^create opportunity/i.test(p.action);
const consultantKey = (c: PortfolioClient) => c.consultants.map((x) => x.name).join(' / ') || NO_CONSULTANT;

interface ConsultantSummaryRow { key: string; count: number; properties: number; cost: number; priced: number; valuation: number; valued: number }

function summarise(items: { key: string; properties: number; cost: number; priced: number; valuation: number; valued: number }[]): ConsultantSummaryRow[] {
  const m = new Map<string, ConsultantSummaryRow>();
  for (const i of items) {
    const r = m.get(i.key) || { key: i.key, count: 0, properties: 0, cost: 0, priced: 0, valuation: 0, valued: 0 };
    r.count++;
    r.properties += i.properties;
    r.cost += i.cost;
    r.priced += i.priced;
    r.valuation += i.valuation;
    r.valued += i.valued;
    m.set(i.key, r);
  }
  return [...m.values()].sort((a, b) => (a.key === NO_CONSULTANT ? 1 : b.key === NO_CONSULTANT ? -1 : b.count - a.count || a.key.localeCompare(b.key)));
}

function GradePill({ p }: { p: PortfolioProperty }) {
  if (!p.grade) return <span className="text-gray-400" title={p.gradeFacts.join(' · ')}>-</span>;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${GRADE_STYLE[p.grade] || 'bg-gray-100 text-gray-600'}`}
      title={[p.grade, ...p.gradeFacts].join(' · ')}
    >
      {shortGrade(p.grade)}
    </span>
  );
}

function SourcePanel({ p }: { p: PortfolioProperty }) {
  const item = (label: string, value: React.ReactNode) => (
    <div className="flex gap-2"><span className="w-[110px] shrink-0 text-gray-500">{label}</span><span className="min-w-0 break-words">{value}</span></div>
  );
  const none = <span className="text-gray-400">-</span>;
  return (
    <div className="grid gap-1 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-brand-charcoal md:grid-cols-2">
      <div className="space-y-1">
        {item('Grade', p.grade ? <GradePill p={p} /> : <span className="text-gray-400">none</span>)}
        {item('Fact 1', p.gradeFacts[0] || none)}
        {item('Fact 2', p.gradeFacts[1] || none)}
        {item('Entity', p.entity ? `${p.entity}${p.entityName ? ` – ${p.entityName}` : ''}${p.entitySource ? ` (${p.entitySource})` : ''}` : none)}
        {item('Builder', p.builder || none)}
        {p.mdlConsultant && item('Consultant', `${p.mdlConsultant} (Master Deal List)`)}
        {p.pipedrive && item('Pipedrive', `deal ${p.pipedrive.dealId} · owner ${p.pipedrive.owner || '-'} · ${p.pipedrive.stage} · matched by ${p.pipedrive.basis}${p.pipedrive.name ? ` · name ${p.pipedrive.name}${p.clientNameSource ? ' (used as client name)' : ''}` : ''}`)}
        {p.action && item('Action', p.action)}
        {p.status && item('Status', p.status)}
        {p.valuationSource && item('Valuation', `${p.valuationSource} · dated ${p.valuationDate} (${p.valuationDateNote})`)}
      </div>
      <div className="space-y-1">
        {item('File', `${p.source === 'inflight' ? 'In flight' : 'Historical'} · ${p.file}`)}
        {item('Tab', p.tab)}
        {item('Row', p.rowNumber)}
        {p.linkedRecordId && item('GHL record', `${p.linkedRecordId}${p.linkedRecordAddress ? ` (${p.linkedRecordAddress})` : ''}`)}
        {p.fileRecordRef && p.fileRecordRef !== p.linkedRecordId && item('File record ref', p.fileRecordRef)}
        {item('Notes', p.notes ? <span className="whitespace-pre-wrap">{p.notes}</span> : none)}
      </div>
    </div>
  );
}

// Property page for the record pop-out, built from the purchase-file row (used when there is no GHL Property Record).
function filePropertyPage(p: PortfolioProperty): RecordPage {
  const f = (label: string, value: string | number | null | undefined, long = false) => ({ label, value: value === null || value === undefined ? '' : String(value), long });
  return {
    key: `file:${p.key}`,
    kind: 'property',
    menuLabel: 'Property',
    title: p.address || '(no address)',
    source: `From purchase file (${p.source === 'inflight' ? 'in flight' : 'historical'})`,
    note: `${p.file} · ${p.tab} row ${p.rowNumber}`,
    groups: [
      {
        name: 'Address',
        fields: [
          f('Property address', p.address),
          f('Lot', p.addressParts.lot),
          f('Unit', p.addressParts.unit),
          f('Street number', p.addressParts.streetNumber),
          f('Street name', p.addressParts.streetName),
          f('Suburb', p.addressParts.suburb),
          f('State', p.addressParts.state),
          f('Postcode', p.addressParts.postcode),
          f('LGA', p.addressParts.lga),
        ],
      },
      { name: 'Deal & builder', fields: [f('Deal type', p.dealType), f('Contract type', p.contractType), f('Builder', p.builder), f('Entity', [p.entity, p.entityName].filter(Boolean).join(' – ')), f('Grade', [p.grade, ...p.gradeFacts].filter(Boolean).join(' · '))] },
      { name: 'Price & contract', fields: [f('Purchase price', money(p.totalPrice)), f('Land price', money(p.landPrice)), f('Build price', money(p.buildPrice)), f('Price source', p.priceSource), f('Purchase date', p.contractDate)] },
      { name: 'Settlement', fields: [f('Settlement', p.settlementDate), f('Settlement source', p.settlementSource), f('Time held', fmtHeld(p.heldMonths))] },
      { name: 'Valuation & rent', fields: [f('Value now', money(p.valuation)), f('Valuation date', p.valuationDate ? `${p.valuationDate} (${p.valuationDateNote})` : ''), f('Valuation source', p.valuationSource), f('Growth', p.growth === null ? '' : `${signedMoney(p.growth)} · ${fmtPct(p.growthPct)}${p.growthPa !== null ? ` · ${fmtPct(p.growthPa)} p.a.` : ''}`)] },
      { name: 'Other', fields: [f('Action', p.action), f('Status', p.status), f('Fell over', p.fellOver ? 'Yes' : ''), f('Consultant (Master Deal List)', p.mdlConsultant), f('Pipedrive', p.pipedrive ? `deal ${p.pipedrive.dealId} · owner ${p.pipedrive.owner || '-'} · ${p.pipedrive.stage}` : ''), f('Notes', p.notes, true)] },
    ],
  };
}

interface PopoutState { title: string; opportunityId: string | null; recordIds: string[]; extraPages: RecordPage[]; initialPage?: string }

function popoutFor(c: PortfolioClient, o: PortfolioOpportunity, p?: PortfolioProperty): PopoutState {
  return {
    title: o.name || c.name,
    opportunityId: o.id,
    recordIds: o.properties.map((x) => x.linkedRecordId).filter((x): x is string => !!x),
    extraPages: o.properties.filter((x) => !o.id || !x.linkedRecordId).map(filePropertyPage),
    initialPage: p ? (o.id && p.linkedRecordId ? propertyPageKey(p.linkedRecordId) : `file:${p.key}`) : undefined,
  };
}

function PropertyGridHeader() {
  return (
    <div className={`${GRID} border-b bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500`}>
      <div>Property</div>
      <div className="text-right">Purchase price</div>
      <div title={PURCHASE_DATE_HELP}>Purchase date</div>
      <div>Settlement</div>
      <div title="Purchase date to today">Time held</div>
      <div className="text-right">Value now</div>
      <div className="text-right">Growth</div>
      <div />
    </div>
  );
}

function PropertyRow({ p, onOpen }: { p: PortfolioProperty; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-t text-xs ${p.fellOver ? 'bg-gray-50 text-gray-400' : ''}`}>
      <div className={`${GRID} items-start px-3 py-2`}>
        <div className="min-w-0">
          <div className={`break-words ${p.fellOver ? 'line-through' : ''}`}>{p.address || <span className="text-gray-400">(no address)</span>}</div>
          <div className="text-gray-500">{[p.dealType, p.contractType].filter(Boolean).join(' · ')}</div>
          {p.fellOver && <span className="rounded bg-gray-200 px-1 text-gray-700">Fell over</span>}
          {p.flag && !p.fellOver && <span className="rounded bg-blue-50 px-1 text-blue-800">{p.flag}</span>}
        </div>
        <div className="text-right" title={p.priceSource ? `Source: ${p.priceSource}` : undefined}>
          <div className="font-semibold">{money(p.totalPrice) || <span className="text-gray-400">no price</span>}</div>
          {(p.landPrice !== null || p.buildPrice !== null) && (
            <div className="text-gray-500">L {money(p.landPrice) || '-'}<br />B {money(p.buildPrice) || '-'}</div>
          )}
          {/provisional/i.test(p.priceSource) && <div className="text-blue-700">provisional</div>}
        </div>
        <div title={PURCHASE_DATE_HELP}>{p.contractDate}</div>
        <div title={p.settlementSource || undefined}>
          {p.settlementDate || <Dash />}
          {p.settlementBeforeContract && (
            <span className="ml-1 rounded bg-red-100 px-1 font-semibold text-red-800" title="Settlement is before the contract date - listed in Data issues">⚠</span>
          )}
          {p.settlementSource.startsWith('GHL') && <div className="text-gray-500">GHL</div>}
        </div>
        <div title="Purchase date to today">{p.heldMonths === null ? <Dash /> : fmtHeld(p.heldMonths)}</div>
        <div className="text-right" title={p.valuationSource ? `${p.valuationSource} · dated ${p.valuationDate} (${p.valuationDateNote})` : undefined}>
          {p.valuation !== null ? (
            <>
              <div className="font-semibold">
                {money(p.valuation)}
                {p.valuationOutlier && (
                  <span className="ml-1 rounded bg-red-100 px-1 text-red-800" title="Valuation is under 50% or over 300% of the purchase price - listed in Data issues">⚠</span>
                )}
              </div>
              <div className="text-gray-500">{p.valuationDate}{p.valuationAgeMonths !== null && ` · ${p.valuationAgeMonths} mo old`}</div>
              <div className="text-gray-400">{p.valuationDateNote}</div>
            </>
          ) : <Dash />}
        </div>
        <div className="text-right" title={p.growth !== null && p.growthPa === null ? 'p.a. shown only when held 1 year or more (purchase date to valuation date)' : undefined}>
          <Growth g={p.growth} pct={p.growthPct} pa={p.growthPa} />
        </div>
        <div className="flex justify-end gap-1">
          <button
            onClick={onOpen}
            title="Contact, opportunity and property details (read-only pop-out)"
            className="whitespace-nowrap rounded border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Details
          </button>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            title="Grade, facts, entity, builder, file, tab, row and notes"
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 text-xs font-semibold ${open ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-300 bg-white text-blue-700 hover:bg-blue-50'}`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Source
          </button>
        </div>
      </div>
      {open && <div className="px-3 pb-2"><SourcePanel p={p} /></div>}
    </div>
  );
}

function ClientDetail({ c }: { c: PortfolioClient }) {
  const [pop, setPop] = useState<PopoutState | null>(null);
  return (
    <div className="bg-white px-4 py-3">
      {pop && <RecordPopout {...pop} onClose={() => setPop(null)} />}
      {c.ghlMatch && c.ghlMatch.contacts.length > 0 && (
        <div className={`mb-2 rounded border px-3 py-2 text-xs ${c.ghlMatch.status === 'contact_exists' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="mb-1 font-semibold">
            {c.ghlMatch.status === 'contact_exists' ? `GHL contact (matched by ${c.ghlMatch.basis}, 28/10 snapshot)` : 'Possible GHL contacts – same name, not matched'}
          </div>
          {c.ghlMatch.contacts.map((k) => (
            <div key={k.id} className="mb-1">
              <span className="font-semibold">{k.name || '(no name)'}</span>
              {k.email && <span className="text-gray-500"> · {k.email}</span>}
              <span className="text-gray-400"> · {k.id}</span>
              <div className="text-gray-600">
                {k.opportunities.length ? k.opportunities.map((o) => `${o.pipeline}: ${o.name} (${o.status})`).join('; ') : 'No opportunities in any pipeline'}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded border">
        <PropertyGridHeader />
        {c.opportunities.map((o) => (
          <div key={o.key}>
            <div className="flex flex-wrap items-baseline gap-x-3 border-t bg-gray-50 px-3 py-1.5 text-[13px]">
              <span className="font-semibold">{o.name}</span>
              {o.pipeline && <span className="text-gray-500">{o.pipeline} · {o.stage}</span>}
              {o.status && <span className="rounded bg-gray-200 px-1 text-xs">{o.status}</span>}
              {o.owner && <span className="text-xs text-gray-500">Owner: {o.owner}</span>}
              {o.id && <span className="text-xs text-gray-400">{o.id}</span>}
              <button
                onClick={() => setPop(popoutFor(c, o))}
                className="ml-auto rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Open
              </button>
            </div>
            {o.properties.map((p) => <PropertyRow key={p.key} p={p} onOpen={() => setPop(popoutFor(c, o, p))} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesPanel({ issues }: { issues: DataIssue[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DataIssue['kind'] | ''>('');
  const [copied, setCopied] = useState('');
  const counts = useMemo(() => {
    const m = new Map<DataIssue['kind'], number>();
    issues.forEach((i) => m.set(i.kind, (m.get(i.kind) || 0) + 1));
    return [...m];
  }, [issues]);
  const shown = kind ? issues.filter((i) => i.kind === kind) : issues;
  const copy = async () => {
    const lines = [['Issue', 'Client', 'Opportunity ID', 'Address', 'File', 'Tab', 'Row', 'Detail'].join('\t')].concat(
      shown.map((i) => [ISSUE_LABEL[i.kind], i.client, i.opportunityId || '', i.address, i.file, i.tab, i.rowNumber, i.message].join('\t')),
    );
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(`Copied ${shown.length} rows`);
    } catch (e) {
      setCopied(`Copy failed: ${(e as Error).message}`);
    }
  };
  if (!issues.length) return <div className="mb-4 rounded border bg-white p-3 text-sm text-gray-600">No data issues found.</div>;
  return (
    <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setOpen(!open)} className="font-semibold text-brand-charcoal">
          {open ? '▾' : '▸'} Data issues ({issues.length})
        </button>
        {counts.map(([k, n]) => (
          <button key={k} onClick={() => { setKind(kind === k ? '' : k); setOpen(true); }}
            className={`rounded border px-2 py-0.5 text-xs ${kind === k ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-200 bg-white text-blue-800'}`}>
            {ISSUE_LABEL[k]}: {n}
          </button>
        ))}
        {open && <button onClick={copy} className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-700">Copy {shown.length} as table (for Claude)</button>}
        {copied && <span className="text-xs text-gray-600">{copied}</span>}
      </div>
      {open && (
        <div className="mt-2 max-h-[400px] overflow-auto rounded border bg-white">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
              <tr><th className="p-2">Issue</th><th className="p-2">Client</th><th className="p-2">Address</th><th className="p-2">Where</th><th className="p-2">Detail</th></tr>
            </thead>
            <tbody>
              {shown.map((i, n) => (
                <tr key={n} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{ISSUE_LABEL[i.kind]}</td>
                  <td className="p-2">{i.client}</td>
                  <td className="p-2">{i.address}</td>
                  <td className="p-2 text-gray-500">{i.file} · {i.tab} · row {i.rowNumber}</td>
                  <td className="p-2">{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourcesBar({ data, onReload }: { data: PortfolioData; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded border bg-white px-3 py-2 text-xs">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="font-semibold text-brand-charcoal hover:underline">
          Sources {open ? '▾' : '▸'}
        </button>
        <span className="min-w-0 flex-1 truncate text-gray-500">
          {data.sources.map((s) => s.name).join(' · ')}
        </span>
        <span className="whitespace-nowrap text-gray-500">Read {sydney(data.builtAt)}</span>
        <button onClick={onReload} className="rounded bg-blue-600 px-2 py-0.5 font-medium text-white hover:bg-blue-700">Reload</button>
      </div>
      {open && (
        <div className="mt-2 border-t pt-2">
          <div className="mb-2 text-gray-500">{data.sourceDir}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.sources.map((s) => (
              <div key={s.name}>
                <div className="font-semibold">{s.name}</div>
                <div className="text-gray-500">
                  modified {sydney(s.modifiedAt)}
                  {s.takenAt && ` · taken ${s.takenAt}`}
                  {s.count !== undefined && ` · ${s.count.toLocaleString()} items`}
                </div>
                {s.note && <div className="text-gray-600">{s.note}</div>}
                {s.tabs && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.tabs.map((t) => (
                      <span key={t.tab} title={t.note || (t.included ? 'Loaded' : 'Not loaded (excluded tab)')}
                        className={`rounded px-1.5 py-0.5 ${t.included ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'}`}>
                        {t.tab}: {t.rows}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultantTable({ title, countLabel, note, rows, selected, onSelect }: {
  title: string; countLabel: string; note: string; rows: ConsultantSummaryRow[]; selected: string; onSelect: (key: string) => void;
}) {
  const total = rows.reduce(
    (t, r) => ({ count: t.count + r.count, properties: t.properties + r.properties, cost: t.cost + r.cost, priced: t.priced + r.priced, valuation: t.valuation + r.valuation, valued: t.valued + r.valued }),
    { count: 0, properties: 0, cost: 0, priced: 0, valuation: 0, valued: 0 },
  );
  const cell = (r: { properties: number; cost: number; priced: number; valuation: number; valued: number }) => (
    <>
      <td className="p-1.5 text-right">{r.priced ? money(r.cost) : <Dash />}{r.priced < r.properties && <span className="text-gray-400"> ({r.priced} of {r.properties} priced)</span>}</td>
      <td className="p-1.5 text-right">{r.valued ? money(r.valuation) : <Dash />}{r.valued > 0 && r.valued < r.properties && <span className="text-gray-400"> ({r.valued} of {r.properties} valued)</span>}</td>
    </>
  );
  return (
    <div className="mb-4 max-w-[900px] rounded border bg-white p-3 text-xs">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-brand-charcoal">{title}</span>
        <span className="text-gray-500">{note}</span>
        {selected && <button onClick={() => onSelect('')} className="ml-auto rounded border px-2 py-0.5 hover:bg-gray-50">Clear consultant filter</button>}
      </div>
      <table className="w-full">
        <thead className="text-left text-gray-500">
          <tr><th className="p-1.5">Consultant</th><th className="p-1.5 text-right">{countLabel}</th><th className="p-1.5 text-right">Total cost</th><th className="p-1.5 text-right">Total valuation</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} onClick={() => onSelect(selected === r.key ? '' : r.key)} title="Click to filter the client list"
              className={`cursor-pointer border-t hover:bg-blue-50 ${selected === r.key ? 'bg-blue-50 shadow-[inset_4px_0_0_#2563eb]' : ''} ${r.key === NO_CONSULTANT ? 'italic text-gray-600' : ''}`}>
              <td className="p-1.5">{r.key}</td>
              <td className="p-1.5 text-right">{r.count.toLocaleString()}</td>
              {cell(r)}
            </tr>
          ))}
          <tr className="border-t-2 font-semibold">
            <td className="p-1.5">Total</td>
            <td className="p-1.5 text-right">{total.count.toLocaleString()}</td>
            {cell(total)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('properties');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [consultant, setConsultant] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status} (response was not JSON)` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body as PortfolioData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setLimit(PAGE_SIZE); }, [search, group, sortBy, consultant]);
  useEffect(() => { setConsultant(''); }, [group]);

  const clients = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.clients.filter((c) => {
      if (group === 'inflight' && !c.opportunities.some((o) => o.properties.some((p) => p.source === 'inflight'))) return false;
      if (group === 'historical' && c.opportunities.some((o) => o.properties.some((p) => p.source === 'inflight'))) return false;
      if (group === 'noContact' && (c.hasGhlContact || contactExists(c))) return false;
      if (group === 'contactNoOpp' && !contactExists(c)) return false;
      if (group === 'createOpp' && !c.opportunities.some((o) => o.properties.some(isCreateOpp))) return false;
      if (consultant) {
        if (group === 'createOpp') {
          if (!c.opportunities.some((o) => o.properties.some((p) => isCreateOpp(p) && (p.mdlConsultant || NO_CONSULTANT) === consultant))) return false;
        } else if (consultantKey(c) !== consultant) return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.alsoKnownAs.some((n) => n.toLowerCase().includes(q)) ||
        c.consultants.some((x) => x.name.toLowerCase().includes(q)) ||
        c.opportunities.some((o) => o.name.toLowerCase().includes(q) || o.properties.some((p) => p.address.toLowerCase().includes(q)))
      );
    });
    const date = (s: string) => dmyTime(s) ?? -Infinity;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'totalCost': return b.rollup.totalCost - a.rollup.totalCost;
        case 'valuation': return b.rollup.totalValuation - a.rollup.totalValuation;
        case 'growth': return (b.rollup.growth ?? -1e15) - (a.rollup.growth ?? -1e15);
        case 'lastPurchase': {
          const la = date(a.rollup.lastPurchase);
          const lb = date(b.rollup.lastPurchase);
          return la === lb ? 0 : la > lb ? -1 : 1;
        }
        case 'firstPurchase': {
          const fa = dmyTime(a.rollup.firstPurchase) ?? Infinity;
          const fb = dmyTime(b.rollup.firstPurchase) ?? Infinity;
          return fa === fb ? 0 : fa < fb ? -1 : 1;
        }
        default: return b.rollup.properties - a.rollup.properties || a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [data, search, group, sortBy, consultant]);

  const byClientConsultant = (list: PortfolioClient[]) => summarise(list.map((c) => ({
    key: consultantKey(c), properties: c.rollup.properties, cost: c.rollup.totalCost, priced: c.rollup.priced, valuation: c.rollup.totalValuation, valued: c.rollup.valued,
  })));
  const noContactByConsultant = useMemo(
    () => byClientConsultant((data?.clients || []).filter((c) => !c.hasGhlContact && !contactExists(c))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const contactNoOppByConsultant = useMemo(
    () => byClientConsultant((data?.clients || []).filter((c) => !c.hasGhlContact && contactExists(c))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const createOppByConsultant = useMemo(() => summarise(
    (data?.clients || []).flatMap((c) => c.opportunities.flatMap((o) => o.properties))
      .filter((p) => isCreateOpp(p) && !p.fellOver)
      .map((p) => ({
        key: p.mdlConsultant || NO_CONSULTANT, properties: 1,
        cost: p.totalPrice ?? 0, priced: p.totalPrice !== null ? 1 : 0, valuation: p.valuation ?? 0, valued: p.valuation !== null ? 1 : 0,
      })),
  ), [data]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Portfolio View</h1>
        <p className="mb-4 text-[13px] text-[#7A7575]">
          Demo from UNLOADED data (in-flight load file + historical candidate file + 27/10 GHL snapshots + Master Deal List valuations). Read-only; files are read fresh on every load.
        </p>

        {loading && <div className="rounded border bg-white p-4 text-sm text-gray-600">Reading source files…</div>}
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <div className="font-semibold">Could not load the portfolio data</div>
            <div className="mt-1 whitespace-pre-wrap">{error}</div>
            <button onClick={load} className="mt-2 rounded border border-red-300 bg-white px-2 py-1 text-xs">Retry</button>
          </div>
        )}

        {data && (
          <>
            <SourcesBar data={data} onReload={load} />

            {data.consultantError && (
              <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                Sales consultant names not loaded (GHL owners shown blank): {data.consultantError}
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Clients</div><div className="font-semibold">{data.totals.clients.toLocaleString()}</div></div>
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Properties (excl. fell over)</div><div className="font-semibold">{data.totals.properties.toLocaleString()}</div></div>
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Total purchase cost</div><div className="font-semibold">{money(data.totals.totalCost)}</div><div className="text-xs text-gray-500">{data.totals.priced.toLocaleString()} of {data.totals.properties.toLocaleString()} priced</div></div>
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Latest valuation</div><div className="font-semibold">{money(data.totals.totalValuation)}</div><div className="text-xs text-gray-500">{data.totals.valued.toLocaleString()} of {data.totals.properties.toLocaleString()} valued</div></div>
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Growth (properties with price and valuation)</div><Growth g={data.totals.growthCost ? data.totals.growth : null} pct={data.totals.growthCost ? data.totals.growth / data.totals.growthCost : null} pa={null} /></div>
              <div className="rounded border bg-white px-3 py-2"><div className="text-xs text-gray-500">Fell over (not counted)</div><div className="font-semibold">{data.totals.fellOver}</div></div>
            </div>

            <IssuesPanel issues={data.issues} />

            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, consultant, opportunity or address"
                className="w-[340px] rounded border px-2 py-1" />
              <select value={group} onChange={(e) => setGroup(e.target.value as GroupFilter)} className="rounded border px-1 py-1">
                <option value="all">All clients</option>
                <option value="inflight">Has an in-flight purchase</option>
                <option value="historical">Historical only</option>
                <option value="contactNoOpp">Contact exists – no purchase opportunity</option>
                <option value="noContact">No GHL contact</option>
                <option value="createOpp">Has &apos;Create opportunity&apos; rows</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded border px-1 py-1">
                <option value="properties">Sort: most properties</option>
                <option value="totalCost">Sort: total purchase cost</option>
                <option value="valuation">Sort: total valuation</option>
                <option value="growth">Sort: growth ($)</option>
                <option value="lastPurchase">Sort: latest purchase</option>
                <option value="firstPurchase">Sort: earliest first purchase</option>
                <option value="name">Sort: name</option>
              </select>
              <span className="text-gray-500">{clients.length.toLocaleString()} clients</span>
            </div>

            {group === 'contactNoOpp' && (
              <ConsultantTable title="Contact exists – no purchase opportunity, by consultant" countLabel="Clients"
                note="Matched to a GHL contact by email, else exact person name (28/10 snapshot). Consultant from the Master Deal List. Fell-over rows not counted."
                rows={contactNoOppByConsultant} selected={consultant} onSelect={setConsultant} />
            )}
            {group === 'noContact' && (
              <ConsultantTable title="No GHL contact, by consultant" countLabel="Clients"
                note="Consultant from the Master Deal List (All Deals row link). Fell-over rows not counted."
                rows={noContactByConsultant} selected={consultant} onSelect={setConsultant} />
            )}
            {group === 'createOpp' && (
              <ConsultantTable title="'Create opportunity' rows, by consultant" countLabel="Rows"
                note="Historical rows with Action 'Create opportunity + record'. Consultant from the Master Deal List. Fell-over rows not counted."
                rows={createOppByConsultant} selected={consultant} onSelect={setConsultant} />
            )}

            <div className="overflow-hidden rounded border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="p-2">Client</th><th className="p-2">Sales consultant</th><th className="p-2 text-right">Properties</th>
                    <th className="p-2 text-right">Total purchase cost</th><th className="p-2 text-right">Latest valuation</th><th className="p-2 text-right">Growth</th>
                    <th className="p-2">First purchase</th><th className="p-2">Last purchase</th><th className="p-2">In flight / historical</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.slice(0, limit).map((c) => (
                    <ClientRows key={c.key} c={c} open={openKey === c.key} onToggle={() => setOpenKey(openKey === c.key ? null : c.key)} />
                  ))}
                </tbody>
              </table>
              {clients.length > limit && (
                <div className="border-t p-2 text-center">
                  <button onClick={() => setLimit(limit + PAGE_SIZE)} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700">
                    Show more ({(clients.length - limit).toLocaleString()} left)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ClientRows({ c, open, onToggle }: { c: PortfolioClient; open: boolean; onToggle: () => void }) {
  const r = c.rollup;
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer border-t align-top hover:bg-blue-50 ${open ? 'bg-blue-50 shadow-[inset_4px_0_0_#2563eb]' : ''}`}>
        <td className="p-2">
          <div className="font-semibold">
            {open ? '▾' : '▸'} {c.name}
            {c.nameSource && <span className="ml-1 text-xs font-normal text-gray-500">(from Pipedrive)</span>}
          </div>
          {c.alsoKnownAs.length > 0 && (
            <div className="text-xs text-gray-500" title="Pipedrive person name for the same property - kept for contact matching">
              also known as {c.alsoKnownAs.join('; ')} <span className="text-gray-400">· Pipedrive</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {c.email}
            {!c.hasGhlContact && (contactExists(c) ? (
              <span className="ml-1 rounded bg-blue-100 px-1 text-blue-800" title={c.ghlMatch?.contacts.map((k) => `${k.name} · ${k.opportunities.length} opportunities`).join('; ')}>
                Contact exists – no purchase opportunity (matched by {c.ghlMatch?.basis})
              </span>
            ) : (
              <span className="ml-1 rounded bg-red-50 px-1 text-red-700">
                No GHL contact{c.ghlMatch?.status === 'ambiguous' ? ' (name matches 2+ contacts)' : ''}
              </span>
            ))}
            {' '}· {c.opportunities.length} opportunit{c.opportunities.length === 1 ? 'y' : 'ies'}
          </div>
        </td>
        <td className="p-2 text-xs">
          {c.consultants.map((x) => (
            <div key={x.name} title={x.source} className={x.source === 'Master Deal List' ? 'text-gray-500' : ''}>
              {x.name}{x.source === 'Master Deal List' && <span className="text-gray-400"> (MDL)</span>}
            </div>
          ))}
        </td>
        <td className="p-2 text-right">{r.properties}{r.fellOver > 0 && <div className="text-xs text-gray-400">+{r.fellOver} fell over</div>}</td>
        <td className="p-2 text-right">
          {money(r.totalCost)}
          {r.priced < r.properties && <div className="text-xs text-blue-700">{r.priced} of {r.properties} priced</div>}
        </td>
        <td className="p-2 text-right">
          {r.valued > 0 ? money(r.totalValuation) : <Dash />}
          <div className="text-xs text-gray-500">{r.valued} of {r.properties} valued</div>
          {r.newestValuationDate && (
            <div className="text-xs text-gray-400" title="Months since the newest valuation date. Master Deal List valuations: date assumed – file date">
              {r.valuationAgeMonths} mo since {r.newestValuationDate}
            </div>
          )}
        </td>
        <td className="p-2 text-right"><Growth g={r.growth} pct={r.growthPct} pa={r.growthPa} /></td>
        <td className="p-2">{r.firstPurchase}</td>
        <td className="p-2">{r.lastPurchase}{r.undated > 0 && <div className="text-xs text-gray-400">{r.undated} undated</div>}</td>
        <td className="p-2">{r.inFlight} / {r.historical}</td>
      </tr>
      {open && (
        <tr><td colSpan={9} className="border-t p-0"><ClientDetail c={c} /></td></tr>
      )}
    </>
  );
}
