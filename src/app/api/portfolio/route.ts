import { NextRequest, NextResponse } from 'next/server';
import { getCfEmail } from '@/lib/cloudflareAuth';
import { loadGhlUsers, loadSources } from '@/lib/portfolio/sources';
import { buildPortfolio } from '@/lib/portfolio/build';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read-only demo: reads the unloaded files fresh on every request (plus a read-only GHL users GET). No writes anywhere.
export async function GET(request: NextRequest) {
  if (!getCfEmail(request) && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const users = await loadGhlUsers();
    if (users.error) console.error('[portfolio] GHL users:', users.error);
    const data = buildPortfolio(loadSources(), users);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[portfolio] load failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
