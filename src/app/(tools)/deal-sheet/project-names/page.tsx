'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Project = { name: string; added_by: string | null; added_at: string };

// Deal Sheet admin: the project names Property Records pick from (Quick Record dropdown, CTRT project views).
export default function ProjectNamesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [used, setUsed] = useState<Map<string, number>>(new Map());
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/deal-sheet/project-names', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Load failed (${res.status})`);
    setProjects(data.projects || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // Names already on Property Records (from the CTRT last saved copy), so existing ones can be added in one click.
    fetch('/api/contract-team-reporting?snapshot=1')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Record<string, string>[]) => {
        const m = new Map<string, number>();
        for (const r of Array.isArray(rows) ? rows : []) {
          const n = (r.co_project_name || '').trim();
          if (n) m.set(n, (m.get(n) || 0) + 1);
        }
        setUsed(m);
      })
      .catch(() => setUsed(new Map()));
  }, [load]);

  const save = async (action: 'add' | 'remove', name: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/deal-sheet/project-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setProjects(data.projects || []);
      if (action === 'add') setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const listed = useMemo(() => new Set(projects.map((p) => p.name.toLowerCase())), [projects]);
  const unlisted = useMemo(
    () => [...used.entries()].filter(([n]) => !listed.has(n.toLowerCase())).sort((a, b) => a[0].localeCompare(b[0])),
    [used, listed]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Project names</h1>
          <p className="text-sm text-gray-500">
            Property Records pick their project name from this list (Quick Record). The CTRT project views (Ocean Rise, Huntly,
            Golden Horizon) filter on it. Removing a name here does not change any record.
          </p>
        </div>
        {error && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) save('add', newName); }}
        >
          <input className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm" placeholder="New project name"
            value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" disabled={busy || !newName.trim()} className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50">Add</button>
        </form>
        <table className="w-full rounded bg-white text-sm shadow">
          <thead><tr className="border-b text-left text-gray-500"><th className="p-2">Project</th><th className="p-2">Records</th><th className="p-2">Added by</th><th className="p-2"></th></tr></thead>
          <tbody>
            {projects.length === 0 && <tr><td className="p-2 italic text-gray-400" colSpan={4}>No project names yet</td></tr>}
            {projects.map((p) => (
              <tr key={p.name} className="border-b last:border-0">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{used.get(p.name) || 0}</td>
                <td className="p-2 text-gray-500">{p.added_by || ''}</td>
                <td className="p-2 text-right">
                  <button disabled={busy} className="text-xs text-red-600 underline"
                    onClick={() => { if (confirm(`Remove "${p.name}" from the list?`)) save('remove', p.name); }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {unlisted.length > 0 && (
          <div>
            <h2 className="mb-1 text-sm font-semibold">Already on Property Records, not in the list</h2>
            <table className="w-full rounded bg-white text-sm shadow">
              <tbody>
                {unlisted.map(([n, c]) => (
                  <tr key={n} className="border-b last:border-0">
                    <td className="p-2">{n}</td>
                    <td className="p-2 text-gray-500">{c} record{c === 1 ? '' : 's'}</td>
                    <td className="p-2 text-right"><button disabled={busy} className="text-xs text-blue-600 underline" onClick={() => save('add', n)}>Add to list</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
