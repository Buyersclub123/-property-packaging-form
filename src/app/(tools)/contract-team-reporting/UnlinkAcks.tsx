'use client';

import { useCallback, useEffect, useState } from 'react';

// Unlink acknowledgement list (JT 17/11): header warning + count; click opens the list.
const TILES = [
  { key: 'finance', label: 'Contracts - Finance' },
  { key: 'construction', label: 'Contracts - Construction' },
  { key: 'bppci', label: 'Contracts - B&P-PCI' },
] as const;

type Item = {
  id: number; at: string; address: string; oppId: string; oppName: string; byName: string; reason: string; stageName: string;
  doneAt: string | null; ticks: Partial<Record<string, { by: string; at: string }>>;
};

const syd = (iso: string) => new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function UnlinkAcks() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [openCount, setOpenCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/deal-sheet/unlink-acks${history ? '?history=1' : ''}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setItems(j.items || []);
      if (!history) setOpenCount((j.items || []).length);
      setError('');
    } catch (e) {
      setError(`Could not load the unlink list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [history]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    const on = () => load();
    window.addEventListener('unlink-acks-changed', on);
    return () => { clearInterval(t); window.removeEventListener('unlink-acks-changed', on); };
  }, [load]);

  const tick = async (id: number, tile: string) => {
    setBusy(`${id}:${tile}`);
    try {
      const res = await fetch('/api/deal-sheet/unlink-acks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tile }) });
      if (!res.ok) alert(`Tick not saved: ${(await res.json().catch(() => ({}))).error || res.status}`);
    } finally {
      setBusy('');
      load();
    }
  };

  const count = openCount;
  return (
    <>
      <button
        onClick={() => { setHistory(false); setOpen(true); }}
        title="Unlinked opportunities waiting for Contracts to acknowledge"
        className={`px-2 py-1 text-xs font-semibold rounded whitespace-nowrap ${count > 0 ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'}`}
      >
        {'\u26A0'} {error ? '!' : count}
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center p-6" onClick={() => setOpen(false)}>
          <div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 rounded shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
              <div className="font-semibold">{'\u26A0'} Unlinked opportunities - {history ? 'history (all three ticked)' : `${items.length} to acknowledge`}</div>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => setHistory((h) => !h)} className="underline">{history ? 'Show open' : 'Show history'}</button>
                <button onClick={() => setOpen(false)} className="text-lg leading-none" aria-label="Close">{'\u2715'}</button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {error && <div className="text-red-500 text-xs">{error}</div>}
              {!error && items.length === 0 && <div className="text-xs opacity-70">{history ? 'No completed items yet.' : 'Nothing to acknowledge.'}</div>}
              {items.map((it) => (
                <div key={it.id} className="border border-gray-300 dark:border-gray-700 rounded p-3">
                  <div className="font-semibold text-sm" title={`Opportunity ${it.oppId}`}>{it.oppName} unlinked from {it.address || '(no address)'}</div>
                  <div className="text-xs mt-1 space-y-0.5 opacity-90">
                    <div>{syd(it.at)} by {it.byName}</div>
                    <div>Reason: {it.reason || '-'}</div>
                    <div>Moved back to {it.stageName || '-'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {TILES.map((t) => {
                      const done = it.ticks[t.key];
                      return (
                        <button
                          key={t.key}
                          disabled={!!done || busy === `${it.id}:${t.key}`}
                          onClick={() => tick(it.id, t.key)}
                          className={`text-left rounded border px-2 py-1.5 text-xs ${done ? 'bg-green-100 border-green-500 text-green-900 dark:bg-green-900/40 dark:text-green-200' : 'border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'}`}
                        >
                          <div className="font-semibold">{done ? '\u2611' : '\u2610'} {t.label}</div>
                          <div className="text-[10px] opacity-80">{done ? `${done.by} - ${syd(done.at)}` : 'Click to tick'}</div>
                        </button>
                      );
                    })}
                  </div>
                  {it.doneAt && <div className="text-[10px] mt-1 opacity-70">Completed {syd(it.doneAt)}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
