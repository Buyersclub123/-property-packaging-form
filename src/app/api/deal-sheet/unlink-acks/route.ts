import { NextRequest, NextResponse } from 'next/server';
import { ACK_TILES, listUnlinkAcks, tickUnlinkAck, type AckTile } from '@/lib/unlinkAcks';
import { emailFromHeaders } from '@/lib/tileAccess';
import { whoName } from '@/lib/reviewOutcomes/contactNote';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const history = request.nextUrl.searchParams.get('history') === '1';
    return NextResponse.json({ items: await listUnlinkAcks(history) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// Anyone can tick any tile.
export async function POST(request: NextRequest) {
  try {
    const { id, tile } = (await request.json()) as { id?: number; tile?: string };
    if (!id || !ACK_TILES.some((t) => t.key === tile)) return NextResponse.json({ error: 'id and a valid tile are required' }, { status: 400 });
    const email = emailFromHeaders(request.headers) || '';
    await tickUnlinkAck(Number(id), tile as AckTile, email, email ? whoName(email) : 'Unknown user');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
