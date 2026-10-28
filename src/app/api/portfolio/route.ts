import { NextRequest, NextResponse } from 'next/server';
import { getCfEmail } from '@/lib/cloudflareAuth';
import { loadGhlUsers, loadSources } from '@/lib/portfolio/sources';
import { buildPortfolio } from '@/lib/portfolio/build';
import { loadContactLinks } from '@/lib/portfolio/contactLinks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read-only demo: reads the unloaded files fresh on every request, a read-only GHL users GET and the contact_links
// table (app DB, created if missing). Nothing is written to GHL or Drive.
export async function GET(request: NextRequest) {
  if (!getCfEmail(request) && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const [users, links] = await Promise.all([loadGhlUsers(), loadContactLinks()]);
    if (users.error) console.error('[portfolio] GHL users:', users.error);
    if (links.error) console.error('[portfolio] contact_links:', links.error);
    const data = buildPortfolio(loadSources(), users, links);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[portfolio] load failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
