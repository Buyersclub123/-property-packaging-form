import { headers } from 'next/headers';
import { getDb } from '@/lib/db';
import { teams, newInitiatives, slug, type TeamTile, type SubTile } from '@/lib/portalConfig';

// Tile access (portfolio backlog item 11). Which portal tiles a user sees is
// stored in the database and edited by the Admin group at /admin/tile-access.
// A tile with no rows is visible to everyone; a tool with no rows inherits its
// team tile's rows. Cloudflare Access still decides who can open the portal.

export const ADMIN_GROUP = 'Admin';

const SEED_GROUPS: { name: string; members: string[] }[] = [
  { name: 'Admin', members: ['john.t@buyersclub.com.au'] },
  {
    name: 'Leadership',
    members: ['john.t@buyersclub.com.au', 'samara@buyersclub.com.au', 'ali.h@buyersclub.com.au', 'luca.d@buyersclub.com.au'],
  },
  { name: 'Property Team', members: [] },
  { name: 'Contracts Team', members: [] },
  { name: 'Sales Team', members: [] },
  { name: 'Finance', members: [] },
];

// The allow-list New Initiatives had in code before this table existed.
const SEED_NEW_INITIATIVES = [
  'john.t@buyersclub.com.au',
  'samara@buyersclub.com.au',
  'ali.h@buyersclub.com.au',
  'luca.d@buyersclub.com.au',
  'julie.l@buyersclub.com.au',
  'john.e@buyersclub.com.au',
];

export type PrincipalKind = 'email' | 'group';

export interface AccessRule {
  tileKey: string;
  kind: PrincipalKind;
  value: string;
  addedBy: string;
  addedAt: string;
}

export interface AccessGroup {
  name: string;
  members: { email: string; addedBy: string; addedAt: string }[];
}

export interface AccessData {
  rules: AccessRule[];
  groups: AccessGroup[];
}

export interface CatalogueTile {
  key: string;
  label: string;
  parentKey: string | null;
  comingSoon: boolean;
}

export { slug };

export function teamKey(team: TeamTile): string {
  return `team:${team.id}`;
}

export function toolKey(team: TeamTile, tool: SubTile): string {
  return `tool:${team.id}/${slug(tool.name)}`;
}

/** A tool inside a tile that has its own page (e.g. Property Team > Backend > Duplicate Checker). */
export function childKey(team: TeamTile, tool: SubTile, child: SubTile): string {
  return `${toolKey(team, tool)}/${slug(child.name)}`;
}

/** Every tile the admin page can target, from portalConfig. */
export function tileCatalogue(): CatalogueTile[] {
  const out: CatalogueTile[] = [];
  for (const team of [...teams, newInitiatives]) {
    out.push({ key: teamKey(team), label: team.name, parentKey: null, comingSoon: false });
    for (const tool of team.subTiles) {
      out.push({ key: toolKey(team, tool), label: tool.name, parentKey: teamKey(team), comingSoon: !!tool.comingSoon });
      for (const child of tool.children ?? []) {
        out.push({ key: childKey(team, tool, child), label: child.name, parentKey: toolKey(team, tool), comingSoon: !!child.comingSoon });
      }
    }
  }
  return out;
}

export function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

let ready: Promise<void> | null = null;

async function createAndSeed(): Promise<void> {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS access_groups (
    name TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS access_group_members (
    group_name TEXT NOT NULL REFERENCES access_groups(name) ON DELETE CASCADE,
    email TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_name, email)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tile_access (
    tile_key TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('email', 'group')),
    value TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tile_key, kind, value)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS tile_access_log (
    id SERIAL PRIMARY KEY,
    at TIMESTAMPTZ DEFAULT NOW(),
    by_email TEXT NOT NULL,
    action TEXT NOT NULL,
    detail JSONB NOT NULL
  )`;

  const existing = await sql`SELECT COUNT(*)::int AS n FROM access_groups`;
  if (existing[0].n > 0) return;

  const by = 'seed (JT 28/10)';
  for (const g of SEED_GROUPS) {
    await sql`INSERT INTO access_groups (name, created_by) VALUES (${g.name}, ${by}) ON CONFLICT DO NOTHING`;
    for (const m of g.members) {
      await sql`INSERT INTO access_group_members (group_name, email, added_by) VALUES (${g.name}, ${m}, ${by}) ON CONFLICT DO NOTHING`;
    }
  }
  const niKey = teamKey(newInitiatives);
  // Same people for the New Initiatives tool in Resources (JT 28/10).
  const niTeam = teams.find((t) => t.subTiles.some((s) => s.href === '/new-initiatives'));
  const niTool = niTeam?.subTiles.find((s) => s.href === '/new-initiatives');
  const niKeys = [niKey, ...(niTeam && niTool ? [toolKey(niTeam, niTool)] : [])];
  for (const k of niKeys) {
    for (const e of SEED_NEW_INITIATIVES) {
      await sql`INSERT INTO tile_access (tile_key, kind, value, added_by) VALUES (${k}, 'email', ${e}, ${by}) ON CONFLICT DO NOTHING`;
    }
  }
  await sql`INSERT INTO tile_access_log (by_email, action, detail) VALUES (${by}, 'seed', ${JSON.stringify({
    groups: SEED_GROUPS,
    ...Object.fromEntries(niKeys.map((k) => [k, SEED_NEW_INITIATIVES])),
  })})`;
}

export function ensureTileAccessTables(): Promise<void> {
  if (!ready) {
    ready = createAndSeed().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function loadAccess(): Promise<AccessData> {
  await ensureTileAccessTables();
  const sql = getDb();
  const ruleRows = await sql`SELECT tile_key, kind, value, added_by, added_at FROM tile_access ORDER BY tile_key, kind, value`;
  const groupRows = await sql`SELECT name FROM access_groups ORDER BY name`;
  const memberRows = await sql`SELECT group_name, email, added_by, added_at FROM access_group_members ORDER BY email`;
  return {
    rules: ruleRows.map((r) => ({
      tileKey: r.tile_key,
      kind: r.kind,
      value: r.value,
      addedBy: r.added_by,
      addedAt: new Date(r.added_at).toISOString(),
    })),
    groups: groupRows.map((g) => ({
      name: g.name,
      members: memberRows
        .filter((m) => m.group_name === g.name)
        .map((m) => ({ email: m.email, addedBy: m.added_by, addedAt: new Date(m.added_at).toISOString() })),
    })),
  };
}

export function groupsOf(email: string | null, data: AccessData): Set<string> {
  const e = email ? normEmail(email) : '';
  return new Set(data.groups.filter((g) => g.members.some((m) => m.email === e)).map((g) => g.name));
}

export function isAdmin(email: string | null, data: AccessData): boolean {
  return groupsOf(email, data).has(ADMIN_GROUP);
}

/** Own rows win; otherwise the nearest parent with rows (tile, then team); no rows anywhere = everyone. */
export function canSee(email: string | null, key: string, parentKey: string | string[] | null, data: AccessData): boolean {
  const e = email ? normEmail(email) : '';
  const mine = groupsOf(email, data);
  const match = (k: string): boolean | null => {
    const rows = data.rules.filter((r) => r.tileKey === k);
    if (rows.length === 0) return null;
    return rows.some((r) => (r.kind === 'email' ? r.value === e : mine.has(r.value)));
  };
  const own = match(key);
  if (own !== null) return own;
  for (const k of parentKey === null ? [] : Array.isArray(parentKey) ? parentKey : [parentKey]) {
    const inherited = match(k);
    if (inherited !== null) return inherited;
  }
  return true;
}

/** Same rule as /api/auth/me: Cloudflare Access email, or DEV_USER_EMAIL in local dev. */
export function emailFromHeaders(h: Headers): string | null {
  const cf = h.get('Cf-Access-Authenticated-User-Email');
  if (cf) return normEmail(cf);
  if (process.env.NODE_ENV === 'development' && process.env.DEV_USER_EMAIL) return normEmail(process.env.DEV_USER_EMAIL);
  return null;
}

export type ViewerAccess =
  | { ok: true; email: string | null; admin: boolean; data: AccessData }
  | { ok: false; email: string | null; error: string };

/** For server components. On a database error nothing is shown (fail closed). */
export async function viewerAccess(): Promise<ViewerAccess> {
  const email = emailFromHeaders(headers() as unknown as Headers);
  try {
    const data = await loadAccess();
    return { ok: true, email, admin: isAdmin(email, data), data };
  } catch (e) {
    return { ok: false, email, error: e instanceof Error ? e.message : String(e) };
  }
}

export function visibleTools(team: TeamTile, v: ViewerAccess): SubTile[] {
  if (!v.ok) return [];
  return team.subTiles.filter((t) => canSee(v.email, toolKey(team, t), teamKey(team), v.data));
}

export function toolVisible(team: TeamTile, tool: SubTile, v: ViewerAccess): boolean {
  return v.ok && canSee(v.email, toolKey(team, tool), teamKey(team), v.data);
}

export function visibleChildren(team: TeamTile, tool: SubTile, v: ViewerAccess): SubTile[] {
  if (!v.ok) return [];
  return (tool.children ?? []).filter((c) => canSee(v.email, childKey(team, tool, c), [toolKey(team, tool), teamKey(team)], v.data));
}

export function teamVisible(team: TeamTile, v: ViewerAccess): boolean {
  return v.ok && canSee(v.email, teamKey(team), null, v.data);
}

export async function logChange(by: string, action: string, detail: Record<string, unknown>): Promise<void> {
  await getDb()`INSERT INTO tile_access_log (by_email, action, detail) VALUES (${by}, ${action}, ${JSON.stringify(detail)})`;
}
