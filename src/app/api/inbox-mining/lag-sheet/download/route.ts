import { NextResponse } from 'next/server';
import { buildLagWorkbook } from '@/lib/inboxMining/lagWorkbook';

// GET: the lag sheet as an Excel download, built from what the nightly run stored. GHL and Gmail are only read.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  try {
    const buf = await buildLagWorkbook();
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Mining demonstration - lag sheet ${day}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
