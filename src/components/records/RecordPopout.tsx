'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RecordBundle, RecordPage } from '@/lib/records/types';

// Shared read-only pop-out: Contact / Opportunity / Property pages with a left menu, like GHL's opportunity modal.
// Open it with a GHL opportunity ID; callers can add their own pages (e.g. Portfolio's purchase-file rows).
export interface RecordPopoutProps {
  title: string;
  opportunityId?: string | null;
  recordIds?: string[];
  extraPages?: RecordPage[];
  initialPage?: string;
  onClose: () => void;
}

const anchor = (page: string, group: string) => `rp-${page}-${group}`.replace(/[^A-Za-z0-9_-]+/g, '-');

export default function RecordPopout({ title, opportunityId, recordIds = [], extraPages = [], initialPage, onClose }: RecordPopoutProps) {
  const [bundle, setBundle] = useState<RecordBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | undefined>(initialPage);
  const [hideEmpty, setHideEmpty] = useState(true);
  const recordKey = recordIds.join(',');

  useEffect(() => {
    if (!opportunityId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = recordKey ? `?records=${encodeURIComponent(recordKey)}` : '';
    fetch(`/api/records/opportunity/${opportunityId}${q}`, { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status} (response was not JSON)` }));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (!cancelled) setBundle(body as RecordBundle);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [opportunityId, recordKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pages = useMemo(() => {
    const list: RecordPage[] = [...(bundle?.pages || [])];
    if (!opportunityId) {
      list.push({ key: 'opportunity', kind: 'opportunity', menuLabel: 'Opportunity', title: 'No GHL opportunity', source: '', note: 'This purchase has no GHL opportunity yet.', groups: [] });
    }
    const n = list.filter((p) => p.kind === 'property').length;
    extraPages.forEach((p, i) => list.push(p.kind === 'property' ? { ...p, menuLabel: `Property ${n + i + 1}` } : p));
    return list;
  }, [bundle, extraPages, opportunityId]);

  const page = pages.find((p) => p.key === active) || pages.find((p) => p.kind === 'opportunity') || pages[0];
  const groups = (page?.groups || [])
    .map((g) => ({ ...g, fields: hideEmpty ? g.fields.filter((f) => f.value) : g.fields }))
    .filter((g) => g.fields.length);
  const hiddenCount = hideEmpty ? (page?.groups || []).reduce((n, g) => n + g.fields.filter((f) => !f.value).length, 0) : 0;
  const hasProperty = pages.some((p) => p.kind === 'property');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-[1040px] flex-col rounded-lg border border-gray-200 bg-white text-brand-charcoal shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{bundle?.title || title}</h2>
            <p className="text-sm text-gray-500">Contact, opportunity and property details. Read-only.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-[230px] shrink-0 overflow-y-auto border-r border-gray-200 py-3 text-sm">
            {pages.map((p) => {
              const selected = p.key === page?.key;
              return (
                <div key={p.key} className="mb-1 px-2">
                  <button
                    onClick={() => setActive(p.key)}
                    className={`w-full rounded px-2 py-1.5 text-left ${selected ? 'bg-blue-600 font-semibold text-white' : 'hover:bg-gray-50'}`}
                  >
                    <div>{p.menuLabel}</div>
                    {p.kind === 'property' && <div className={`truncate text-xs ${selected ? 'text-blue-100' : 'text-gray-500'}`}>{p.title}</div>}
                  </button>
                  {selected && groups.length > 1 && (
                    <div className="mt-1 border-l border-gray-200 pl-2">
                      {groups.map((g) => (
                        <button
                          key={g.name}
                          onClick={() => document.getElementById(anchor(p.key, g.name))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                          className="block w-full truncate rounded px-2 py-1 text-left text-xs text-gray-600 hover:bg-blue-50"
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {opportunityId && !loading && bundle && !hasProperty && (
              <div className="px-4 py-1 text-xs text-gray-500">No linked Property Record in GHL</div>
            )}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-semibold">{page?.title || title}</div>
                {page?.source && <div className="text-xs text-gray-500">{page.source}{page.note ? ` · ${page.note}` : ''}</div>}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                Hide empty fields{hiddenCount > 0 && <span className="text-xs text-gray-400">({hiddenCount})</span>}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">Reading GHL…</div>}
              {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">GHL could not be read: {error}</div>}
              {bundle?.warnings.map((w) => (
                <div key={w} className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{w}</div>
              ))}
              {page && !page.groups.length && page.note && <div className="text-sm text-gray-500">{page.note}</div>}
              {page && page.groups.length > 0 && groups.length === 0 && <div className="text-sm text-gray-500">All fields on this page are empty.</div>}
              {page && groups.map((g) => (
                <section key={g.name} id={anchor(page.key, g.name)} className="mb-5 scroll-mt-2">
                  <h3 className="mb-2 border-b border-gray-200 pb-1 text-sm font-semibold">{g.name}</h3>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                    {g.fields.map((f, i) => (
                      <div key={`${f.label}-${i}`} className={f.long ? 'md:col-span-2' : ''}>
                        <div className="mb-1 text-xs font-semibold text-gray-600">{f.label}</div>
                        <div className={`min-h-[38px] rounded border border-gray-200 px-3 py-2 text-sm ${f.long ? 'whitespace-pre-wrap' : 'break-words'}`}>
                          {f.value ? (/^https?:\/\//.test(f.value) ? <a href={f.value} target="_blank" rel="noreferrer" className="text-blue-700 underline">{f.value}</a> : f.value) : <span className="text-gray-400">–</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 text-xs text-gray-500">
          <div>
            {bundle?.createdAt && <div>Opportunity created {bundle.createdAt}</div>}
            {page?.ids && <div>{page.ids}</div>}
          </div>
          <div className="flex items-center gap-2">
            {page?.ghlUrl && (
              <a href={page.ghlUrl} target="_blank" rel="noreferrer" className="rounded border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                Open in GHL
              </a>
            )}
            <button onClick={onClose} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
