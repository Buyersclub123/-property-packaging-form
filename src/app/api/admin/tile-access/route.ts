import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  ADMIN_GROUP,
  emailFromHeaders,
  isAdmin,
  loadAccess,
  logChange,
  normEmail,
  tileCatalogue,
} from '@/lib/tileAccess';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function adminOrError(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return { error: NextResponse.json({ error: 'Not signed in (no Cloudflare Access email).' }, { status: 401 }) };
  const data = await loadAccess();
  if (!isAdmin(email, data)) {
    return { error: NextResponse.json({ error: `Admins only. ${email} is not in the ${ADMIN_GROUP} group.`, email }, { status: 403 }) };
  }
  return { email, data };
}

export async function GET(request: NextRequest) {
  try {
    const a = await adminOrError(request);
    if (a.error) return a.error;
    const log = await getDb()`SELECT id, at, by_email, action, detail FROM tile_access_log ORDER BY id DESC LIMIT 100`;
    return NextResponse.json({
      me: a.email,
      catalogue: tileCatalogue(),
      rules: a.data.rules,
      groups: a.data.groups,
      log: log.map((l) => ({ id: l.id, at: new Date(l.at).toISOString(), by: l.by_email, action: l.action, detail: l.detail })),
    });
  } catch (e) {
    return NextResponse.json({ error: `Tile access could not be read: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const a = await adminOrError(request);
    if (a.error) return a.error;
    const by = a.email;
    const data = a.data;
    const body = (await request.json()) as Record<string, string>;
    const sql = getDb();
    const groupNames = new Set(data.groups.map((g) => g.name));
    const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

    switch (body.action) {
      case 'addRule':
      case 'removeRule': {
        const tileKey = body.tileKey;
        const kind = body.kind;
        if (body.action === 'addRule' && !tileCatalogue().some((t) => t.key === tileKey)) return bad(`Unknown tile: ${tileKey}`);
        if (kind !== 'email' && kind !== 'group') return bad('kind must be email or group');
        const value = kind === 'email' ? normEmail(body.value || '') : (body.value || '').trim();
        if (kind === 'email' && !EMAIL_RE.test(value)) return bad(`Not an email address: ${body.value}`);
        if (body.action === 'addRule' && kind === 'group' && !groupNames.has(value)) return bad(`Unknown group: ${value}`);
        if (body.action === 'addRule') {
          await sql`INSERT INTO tile_access (tile_key, kind, value, added_by) VALUES (${tileKey}, ${kind}, ${value}, ${by}) ON CONFLICT DO NOTHING`;
        } else {
          await sql`DELETE FROM tile_access WHERE tile_key = ${tileKey} AND kind = ${kind} AND value = ${value}`;
        }
        await logChange(by, body.action, { tileKey, kind, value });
        break;
      }
      case 'addMember':
      case 'removeMember': {
        const group = (body.group || '').trim();
        const email = normEmail(body.email || '');
        if (!groupNames.has(group)) return bad(`Unknown group: ${group}`);
        if (!EMAIL_RE.test(email)) return bad(`Not an email address: ${body.email}`);
        if (body.action === 'addMember') {
          await sql`INSERT INTO access_group_members (group_name, email, added_by) VALUES (${group}, ${email}, ${by}) ON CONFLICT DO NOTHING`;
        } else {
          const members = data.groups.find((g) => g.name === group)?.members ?? [];
          if (group === ADMIN_GROUP && members.length <= 1) return bad('Cannot remove the last member of the Admin group.');
          await sql`DELETE FROM access_group_members WHERE group_name = ${group} AND email = ${email}`;
        }
        await logChange(by, body.action, { group, email });
        break;
      }
      case 'addGroup': {
        const name = (body.name || '').trim();
        if (!name) return bad('Group name is required.');
        if (groupNames.has(name)) return bad(`Group already exists: ${name}`);
        await sql`INSERT INTO access_groups (name, created_by) VALUES (${name}, ${by})`;
        await logChange(by, 'addGroup', { name });
        break;
      }
      case 'removeGroup': {
        const name = (body.name || '').trim();
        if (!groupNames.has(name)) return bad(`Unknown group: ${name}`);
        if (name === ADMIN_GROUP) return bad('The Admin group cannot be removed.');
        const used = data.rules.filter((r) => r.kind === 'group' && r.value === name);
        await sql`DELETE FROM tile_access WHERE kind = 'group' AND value = ${name}`;
        await sql`DELETE FROM access_groups WHERE name = ${name}`;
        await logChange(by, 'removeGroup', { name, removedTileRows: used.map((r) => r.tileKey) });
        break;
      }
      default:
        return bad(`Unknown action: ${body.action}`);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Tile access change failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
