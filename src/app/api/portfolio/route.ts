import { NextRequest, NextResponse } from 'next/server';
import { getCfEmail } from '@/lib/cloudflareAuth';
import { loadSources } from '@/lib/portfolio/sources';
import { buildPortfolio } from '@/lib/portfolio/build';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read-only demo: reads the unloaded files fresh on every request. No GHL, DB or Drive writes.
export async function GET(request: NextRequest) {
  if (!getCfEmail(request) && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const data = buildPortfolio(loadSources());
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[portfolio] load failed:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
