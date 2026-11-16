import { NextRequest, NextResponse } from 'next/server';
import { sendCtrAlert } from '../../contract-team-reporting/alerts';

export const dynamic = 'force-dynamic';

// Pipeline Journey: a tile whose count still differs from GHL's own stage count AFTER a live re-read.
// Timing gaps never reach here (the page re-reads first); what arrives is a real data problem, so email it.
// sendCtrAlert applies a 1h cooldown per type, so a persistent gap is one email an hour at most.
export async function POST(request: NextRequest) {
  const { tiles } = (await request.json()) as { tiles: { name: string; tool: number; ghl: number }[] };
  if (!Array.isArray(tiles) || !tiles.length) return NextResponse.json({ ok: false, error: 'tiles required' }, { status: 400 });
  await sendCtrAlert({
    type: 'journey-ghl-mismatch',
    subject: `Pipeline Journey: ${tiles.length} tile${tiles.length > 1 ? 's' : ''} still differ from GHL after re-read`,
    reason: 'The Pipeline Journey compared each tile with the GHL stage count, re-read live from GHL, and the counts still differ.',
    impact: 'The list behind the tile is missing or over-counting records. This is not a timing gap - a record is not loading or GHL is inconsistent.',
    detailsHtml: `<table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>Tile</th><th>Tool</th><th>GHL</th><th>Diff</th></tr>${tiles
      .map((t) => `<tr><td>${t.name}</td><td>${t.tool}</td><td>${t.ghl}</td><td>${t.tool - t.ghl > 0 ? '+' : ''}${t.tool - t.ghl}</td></tr>`)
      .join('')}</table>`,
    action: 'Open the tile in Pipeline Journey and expand Reconciliation detail to see which records differ.',
  });
  return NextResponse.json({ ok: true });
}
