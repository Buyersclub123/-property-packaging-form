'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Project = { id: number; name: string; estate_suburb: string; state: string; developer: string; aliases: string; active: boolean; updated_by: string | null };
const BLANK: Omit<Project, 'id' | 'updated_by'> = { name: '', estate_suburb: '', state: '', developer: '', aliases: '', active: true };

// Project views on the Google Sheet (1P-EcxoPm4xmKKzDG_Jq6FhcUW_b4igBoeOvromsS6r0); Huntly VIC also matches "Harlowe".
const SHEET_PROJECTS = [
  { name: 'Ocean Rise', estate_suburb: 'Urangan', state: 'QLD', aliases: 'Ocean Rise Estate' },
  { name: 'Huntly VIC', estate_suburb: 'Huntly', state: 'VIC', aliases: 'Harlowe, Harlowe Estate' },
  { name: 'Golden Horizon Bundaberg', estate_suburb: 'Bundaberg', state: 'QLD', aliases: 'Golden Horizon' },
  { name: 'Murray Bridge-Moira', estate_suburb: 'Murray Bridge', state: 'SA', aliases: 'Moira' },
  { name: 'Weir Views', estate_suburb: '', state: '', aliases: '' },
];

// Deal Sheet → Admin → Projects: the list Property Records pick project_name from (Quick Record, CTRT edit).
export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [used, setUsed] = useState<Map<string, number>>(new Map());
  const [draft, setDraft] = useState<Partial<Project>>(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const post = useCallback(async (body: unknown) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/deal-sheet/project-names', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setProjects(data.projects || []);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/deal-sheet/project-names', { cache: 'no-store' }).then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setProjects(d.projects || []))).catch((e) => setError(String(e)));
    fetch('/api/contract-team-reporting?snapshot=1').then((r) => (r.ok ? r.json() : [])).then((rows: Record<string, string>[]) => {
      const m = new Map<string, number>();
      for (const r of Array.isArray(rows) ? rows : []) {
        const n = (r.co_project_name || '').trim();
        if (n) m.set(n, (m.get(n) || 0) + 1);
      }
      setUsed(m);
    }).catch(() => setUsed(new Map()));
  }, []);

  // Record values covered by a project (its name or an alias, case-insensitive contains).
  const covers = (p: { name: string; aliases: string }, value: string) =>
    [p.name, ...p.aliases.split(',')].map((s) => s.trim().toLowerCase()).filter(Boolean).some((t) => value.toLowerCase().includes(t));
  const recordCount = (p: Project) => [...used.entries()].filter(([n]) => covers(p, n)).reduce((s, [, c]) => s + c, 0);
  const uncovered = useMemo(() => [...used.entries()].filter(([n]) => !projects.some((p) => covers(p, n))).sort((a, b) => a[0].localeCompare(b[0])), [used, projects]);

  const seed = () => post({
    action: 'seed',
    projects: [...SHEET_PROJECTS, ...uncovered.filter(([n]) => !SHEET_PROJECTS.some((s) => covers({ ...s }, n))).map(([n]) => ({ name: n }))],
  });

  const input = (k: keyof typeof BLANK, w: string, placeholder: string) => (
    <input className={`${w} rounded border border-gray-300 px-2 py-1 text-sm`} placeholder={placeholder}
      value={String(draft[k] ?? '')} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />
  );

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">Deal Sheet · Admin · Projects</h1>
            <p className="text-sm text-gray-500">Property Records pick their Project Name from this list (Quick Record, CTRT edit). Project views and the CTRT Project quick filter match the name or an alias. Inactive projects stay on existing records but can&apos;t be picked.</p>
          </div>
          <button disabled={busy} onClick={seed} className="rounded border border-gray-300 bg-gray-50 px-3 py-1 text-sm hover:bg-gray-100"
            title="Adds the sheet's project tabs and every project name already on Property Records that no project covers. Existing rows are not changed.">
            Seed from records + sheet tabs
          </button>
        </div>
        {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <div className="rounded border border-gray-200">
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium">{draft.id ? `Edit “${draft.name}”` : 'Add a project'}</div>
          <form className="flex flex-wrap items-center gap-2 p-3" onSubmit={async (e) => {
            e.preventDefault();
            if (await post({ action: 'save', project: draft })) setDraft(BLANK);
          }}>
            {input('name', 'w-56', 'Project name')}
            {input('estate_suburb', 'w-40', 'Estate / suburb')}
            {input('state', 'w-16', 'State')}
            {input('developer', 'w-40', 'Developer')}
            {input('aliases', 'w-56', 'Also matches (comma list)')}
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} /> Active</label>
            <button type="submit" disabled={busy || !String(draft.name || '').trim()} className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50">{draft.id ? 'Save' : 'Add'}</button>
            {draft.id && <button type="button" className="text-sm text-gray-500 underline" onClick={() => setDraft(BLANK)}>Cancel</button>}
          </form>
        </div>

        <table className="w-full rounded border border-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-2">Project</th><th className="p-2">Estate / suburb</th><th className="p-2">State</th><th className="p-2">Developer</th><th className="p-2">Also matches</th><th className="p-2">Active</th><th className="p-2">Records</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {projects.length === 0 && <tr><td className="p-2 italic text-gray-400" colSpan={8}>No projects yet. Use “Seed from records + sheet tabs”.</td></tr>}
            {projects.map((p) => (
              <tr key={p.id} className={`border-t border-gray-100 ${p.active ? '' : 'text-gray-400'}`}>
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{p.estate_suburb || <span className="italic text-gray-400 text-xs">Not set</span>}</td>
                <td className="p-2">{p.state || <span className="italic text-gray-400 text-xs">Not set</span>}</td>
                <td className="p-2">{p.developer || <span className="italic text-gray-400 text-xs">Not set</span>}</td>
                <td className="p-2">{p.aliases}</td>
                <td className="p-2">{p.active ? 'Y' : 'N'}</td>
                <td className="p-2">{recordCount(p)}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button className="text-xs text-blue-600 underline" onClick={() => setDraft(p)}>Edit</button>{' '}
                  <button disabled={busy} className="ml-2 text-xs text-red-600 underline" onClick={() => { if (confirm(`Delete “${p.name}”? Records keep their value.`)) post({ action: 'remove', id: p.id }); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {uncovered.length > 0 && (
          <div className="rounded border border-amber-200">
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium">On Property Records but not covered by any project ({uncovered.length})</div>
            <table className="w-full text-sm"><tbody>
              {uncovered.map(([n, c]) => (
                <tr key={n} className="border-t border-gray-100">
                  <td className="p-2">{n}</td><td className="p-2 text-gray-500">{c} record{c === 1 ? '' : 's'}</td>
                  <td className="p-2 text-right"><button disabled={busy} className="text-xs text-blue-600 underline" onClick={() => post({ action: 'seed', projects: [{ name: n }] })}>Add as project</button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </div>
    </div>
  );
}
