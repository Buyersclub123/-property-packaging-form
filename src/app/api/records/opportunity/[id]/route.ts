import { NextRequest, NextResponse } from 'next/server';
import { loadOpportunityBundle } from '@/lib/records/ghlRecord';

// Read-only: contact, opportunity and linked Property Records for the record pop-out.
export const dynamic = 'force-dynamic';

const GHL_ID = /^[A-Za-z0-9]{10,40}$/;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!GHL_ID.test(params.id)) return NextResponse.json({ error: 'Not a GHL opportunity ID.' }, { status: 400 });
  const records = (request.nextUrl.searchParams.get('records') || '')
    .split(',')
    .filter((x) => GHL_ID.test(x))
    .slice(0, 20);
  try {
    return NextResponse.json(await loadOpportunityBundle(params.id, records));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
