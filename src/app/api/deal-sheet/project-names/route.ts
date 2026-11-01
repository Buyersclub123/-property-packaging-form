import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';

export const dynamic = 'force-dynamic';

// Deal Sheet → Admin → Projects. The only source of Property Record project_name values (Quick Record and
// CTRT pick from it, never free text). `aliases` are other spellings a project view also matches (e.g. Huntly VIC ↔ Harlowe).
// Stored in the tool's database only; nothing here writes to GHL.
export interface Project {
  id: number;
  name: string;
  estate_suburb: string;
  state: string;
  developer: string;
  aliases: string;
  active: boolean;
  updated_by: string | null;
  updated_at: string;
}

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    estate_suburb TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    developer TEXT NOT NULL DEFAULT '',
    aliases TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

const clean = (v: unknown, max = 120) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

async function list() {
  const projects = (await getDb()`SELECT id, name, estate_suburb, state, developer, aliases, active, updated_by, updated_at
    FROM projects ORDER BY lower(name)`) as Project[];
  return { projects, names: projects.filter((p) => p.active).map((p) => p.name) };
}

export async function GET() {
  try {
    await ensureTable();
    return NextResponse.json(await list());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// { action: 'save', project } (insert or update by id) | { action: 'remove', id } | { action: 'seed', projects: [...] } (insert missing names only). Admins only.
export async function POST(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    if (!isAdmin(email, await loadAccess())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    const body = await request.json();
    await ensureTable();
    const sql = getDb();
    if (body.action === 'remove') {
      await sql`DELETE FROM projects WHERE id = ${Number(body.id)}`;
    } else if (body.action === 'seed') {
      for (const p of (Array.isArray(body.projects) ? body.projects : []) as Partial<Project>[]) {
        const name = clean(p.name);
        if (!name) continue;
        await sql`INSERT INTO projects (name, estate_suburb, state, developer, aliases, active, updated_by)
          VALUES (${name}, ${clean(p.estate_suburb)}, ${clean(p.state, 3).toUpperCase()}, ${clean(p.developer)}, ${clean(p.aliases, 400)}, true, ${email})
          ON CONFLICT (name) DO NOTHING`;
      }
    } else {
      const p = (body.project || {}) as Partial<Project>;
      const name = clean(p.name);
      if (!name) return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
      const values = [name, clean(p.estate_suburb), clean(p.state, 3).toUpperCase(), clean(p.developer), clean(p.aliases, 400), p.active !== false, email] as const;
      if (p.id) {
        await sql`UPDATE projects SET name = ${values[0]}, estate_suburb = ${values[1]}, state = ${values[2]}, developer = ${values[3]},
          aliases = ${values[4]}, active = ${values[5]}, updated_by = ${values[6]}, updated_at = now() WHERE id = ${Number(p.id)}`;
      } else {
        await sql`INSERT INTO projects (name, estate_suburb, state, developer, aliases, active, updated_by)
          VALUES (${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]})
          ON CONFLICT (name) DO NOTHING`;
      }
    }
    return NextResponse.json(await list());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
