'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Tile {
  key: string;
  label: string;
  parentKey: string | null;
  comingSoon: boolean;
}
interface Rule {
  tileKey: string;
  kind: 'email' | 'group';
  value: string;
  addedBy: string;
  addedAt: string;
}
interface Group {
  name: string;
  members: { email: string; addedBy: string; addedAt: string }[];
}
interface LogRow {
  id: number;
  at: string;
  by: string;
  action: string;
  detail: Record<string, unknown>;
}
interface Data {
  me: string;
  catalogue: Tile[];
  rules: Rule[];
  groups: Group[];
  log: LogRow[];
}
interface DirUser {
  email: string;
  name: string;
  suspended: boolean;
}

function sydney(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });
}

function Chip({ label, title, group, onRemove }: { label: string; title: string; group?: boolean; onRemove: () => void }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${group ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
    >
      {label}
      <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-700" aria-label={`Remove ${label}`}>
        ×
      </button>
    </span>
  );
}

function AddPrincipal({ groups, onAdd }: { groups: string[]; onAdd: (kind: 'email' | 'group', value: string) => void }) {
  const [v, setV] = useState('');
  const submit = () => {
    const t = v.trim();
    if (!t) return;
    onAdd(groups.includes(t) ? 'group' : 'email', t);
    setV('');
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input
        list={groups.length ? 'principals' : 'people'}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={groups.length ? 'group or email' : 'email'}
        className="w-48 rounded border border-gray-200 px-1.5 py-0.5 text-xs"
      />
      <button type="button" onClick={submit} className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-700">
        Add
      </button>
    </span>
  );
}

export default function TileAccessPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dir, setDir] = useState<DirUser[] | null>(null);
  const [dirError, setDirError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/tile-access', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || `HTTP ${res.status}`);
      setData(null);
      return;
    }
    setError(null);
    setData(json);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(String(e)));
    fetch('/api/admin/tile-access/directory', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        setDir(j.users);
      })
      .catch((e) => setDirError(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const act = async (body: Record<string, string>) => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/tile-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) setActionError(json.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const groupNames = useMemo(() => (data ? data.groups.map((g) => g.name) : []), [data]);
  const people = useMemo(() => (dir ?? []).filter((u) => !u.suspended), [dir]);
  const rulesFor = (key: string) => (data ? data.rules.filter((r) => r.tileKey === key) : []);
  const labelOf = (key: string) => data?.catalogue.find((t) => t.key === key)?.label ?? key;
  const orphanRules = data ? data.rules.filter((r) => !data.catalogue.some((t) => t.key === r.tileKey)) : [];

  const whoCell = (t: Tile) => {
    const rows = rulesFor(t.key);
    if (rows.length > 0) {
      return rows.map((r) => (
        <Chip
          key={`${r.kind}:${r.value}`}
          label={r.value}
          group={r.kind === 'group'}
          title={`Added by ${r.addedBy}, ${sydney(r.addedAt)}`}
          onRemove={() => act({ action: 'removeRule', tileKey: t.key, kind: r.kind, value: r.value })}
        />
      ));
    }
    let from = t.parentKey;
    while (from && rulesFor(from).length === 0) from = data?.catalogue.find((x) => x.key === from)?.parentKey ?? null;
    if (from) {
      return <span className="text-xs text-gray-500">Same as {labelOf(from)}</span>;
    }
    return <span className="text-xs text-gray-400">Everyone</span>;
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1080px] px-4 py-6 text-gray-800">
        <h1 className="mb-1 text-xl font-bold">Tile access</h1>
        <p className="mb-4 text-sm text-gray-600">
          Who sees each portal tile. A tile with no rows is visible to everyone; a tool with no rows follows its team tile. This controls tiles only:
          Cloudflare Access still decides who can open the portal, and a direct URL is not blocked here.
        </p>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {actionError && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}

        {data && (
          <>
            <div className="mb-4 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Signed in as {data.me}. {dir ? `Email picker: ${people.length} Workspace users.` : dirError ? '' : 'Loading Workspace users…'}
            </div>
            {dirError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Email picker unavailable: {dirError} Emails can still be typed in full.
              </div>
            )}

            <datalist id="principals">
              {groupNames.map((g) => (
                <option key={`g:${g}`} value={g}>
                  group
                </option>
              ))}
              {people.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name}
                </option>
              ))}
            </datalist>
            <datalist id="people">
              {people.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name}
                </option>
              ))}
            </datalist>

            <section className="mb-6 rounded border border-gray-200">
              <div className="grid grid-cols-[260px_minmax(0,1fr)_260px] gap-x-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <div>Tile</div>
                <div>Who can see it</div>
                <div>Add</div>
              </div>
              {data.catalogue.map((t) => (
                <div
                  key={t.key}
                  className={`grid grid-cols-[260px_minmax(0,1fr)_260px] items-center gap-x-3 border-b border-gray-100 px-3 py-1.5 ${t.parentKey ? '' : 'bg-gray-50'}`}
                >
                  <div className={`text-sm ${t.parentKey ? (t.parentKey.startsWith('tool:') ? 'pl-8 text-gray-700' : 'pl-4 text-gray-700') : 'font-semibold'}`} title={t.key}>
                    {t.label}
                    {t.comingSoon && <span className="ml-1 text-[11px] text-gray-400">(coming soon)</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">{whoCell(t)}</div>
                  <div>
                    <AddPrincipal groups={groupNames} onAdd={(kind, value) => act({ action: 'addRule', tileKey: t.key, kind, value })} />
                  </div>
                </div>
              ))}
            </section>

            {orphanRules.length > 0 && (
              <section className="mb-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <div className="mb-1 font-semibold">Rows for tiles that no longer exist in portalConfig (renamed or removed):</div>
                <div className="flex flex-wrap gap-1">
                  {orphanRules.map((r) => (
                    <Chip
                      key={`${r.tileKey}:${r.kind}:${r.value}`}
                      label={`${r.tileKey} → ${r.value}`}
                      group={r.kind === 'group'}
                      title={`Added by ${r.addedBy}`}
                      onRemove={() => act({ action: 'removeRule', tileKey: r.tileKey, kind: r.kind, value: r.value })}
                    />
                  ))}
                </div>
              </section>
            )}

            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Groups</h2>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.groups.map((g) => (
                <div key={g.name} className="rounded border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                    <span className="text-sm font-semibold">
                      {g.name} <span className="font-normal text-gray-500">· {g.members.length}</span>
                    </span>
                    {g.name !== 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove group ${g.name}? Its tile rows are removed too.`)) act({ action: 'removeGroup', name: g.name });
                        }}
                        className="text-xs text-gray-400 hover:text-red-700"
                      >
                        Remove group
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 px-3 py-2">
                    {g.members.length === 0 && <span className="text-xs text-gray-400">No members yet</span>}
                    {g.members.map((m) => (
                      <Chip
                        key={m.email}
                        label={m.email}
                        title={`Added by ${m.addedBy}, ${sydney(m.addedAt)}`}
                        onRemove={() => act({ action: 'removeMember', group: g.name, email: m.email })}
                      />
                    ))}
                  </div>
                  <div className="px-3 pb-2">
                    <AddPrincipal groups={[]} onAdd={(_k, value) => act({ action: 'addMember', group: g.name, email: value })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-6 flex items-center gap-1">
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="New group name"
                className="w-48 rounded border border-gray-200 px-1.5 py-0.5 text-xs"
              />
              <button
                type="button"
                disabled={busy || !newGroup.trim()}
                onClick={() => {
                  act({ action: 'addGroup', name: newGroup });
                  setNewGroup('');
                }}
                className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add group
              </button>
            </div>

            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Change log</h2>
            <div className="rounded border border-gray-200 text-xs">
              {data.log.map((l) => (
                <div key={l.id} className="grid grid-cols-[150px_200px_110px_minmax(0,1fr)] gap-x-3 border-b border-gray-100 px-3 py-1">
                  <span className="text-gray-500">{sydney(l.at)}</span>
                  <span>{l.by}</span>
                  <span className="font-semibold">{l.action}</span>
                  <span className="truncate text-gray-600" title={JSON.stringify(l.detail)}>
                    {JSON.stringify(l.detail)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
