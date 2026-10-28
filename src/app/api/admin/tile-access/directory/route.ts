import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_GROUP, emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';
import { listDirectoryUsers } from '@/lib/workspaceDirectory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = emailFromHeaders(request.headers);
    if (!email) return NextResponse.json({ error: 'Not signed in (no Cloudflare Access email).' }, { status: 401 });
    const data = await loadAccess();
    if (!isAdmin(email, data)) return NextResponse.json({ error: `Admins only (${ADMIN_GROUP} group).` }, { status: 403 });
    const users = await listDirectoryUsers();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
