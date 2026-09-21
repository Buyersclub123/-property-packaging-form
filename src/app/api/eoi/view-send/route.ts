import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { renderEoiEmailHtml } from '@/lib/eoi-email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eoi/view-send?sendId=xxx
 *
 * Re-renders a previously sent EOI from its stored payload.
 * Returns the full HTML document suitable for viewing in a browser tab.
 */
export async function GET(request: NextRequest) {
  const sendId = request.nextUrl.searchParams.get('sendId');
  if (!sendId) {
    return new NextResponse('<html><body><p>Missing sendId parameter.</p></body></html>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    const sql = getDb();
    const rows = await sql`SELECT payload, record_id, sent_at FROM eoi_sends WHERE id = ${sendId} LIMIT 1`;

    if (!rows.length || !rows[0].payload) {
      return new NextResponse('<html><body><p>No payload found for this send. The EOI may have been recorded without storing the full document.</p></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const { payload, record_id, sent_at } = rows[0];

    // Fetch all sent EOIs for this record to build prev/next navigation
    const allSends = await sql`
      SELECT id, sent_at, event_type, offer_price
      FROM eoi_sends
      WHERE record_id = ${record_id} AND delivery_status = 'sent' AND payload IS NOT NULL
      ORDER BY sent_at ASC`;

    const currentIdx = allSends.findIndex((s: { id: number }) => String(s.id) === String(sendId));
    const prev = currentIdx > 0 ? allSends[currentIdx - 1] : null;
    const next = currentIdx < allSends.length - 1 ? allSends[currentIdx + 1] : null;
    const position = `${currentIdx + 1} of ${allSends.length}`;
    const sentDate = sent_at ? new Date(sent_at).toLocaleString('en-AU') : '';

    const rawEmailHtml = await renderEoiEmailHtml(payload);

    // Strip the email's HTML/body envelope — extract just the inner content
    const bodyContent = rawEmailHtml
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<html[^>]*>/i, '')
      .replace(/<\/html>/i, '')
      .replace(/<head[^>]*>.*?<\/head>/is, '')
      .replace(/<body[^>]*>/i, '')
      .replace(/<\/body>/i, '')
      .trim();

    // Build arrow navigation (photo-gallery style, flanking the EOI)
    const prevArrow = prev
      ? `<a href="/api/eoi/view-send?sendId=${prev.id}" class="nav-arrow" title="Previous: ${new Date(prev.sent_at).toLocaleString('en-AU')}">&lsaquo;</a>`
      : '';
    const nextArrow = next
      ? `<a href="/api/eoi/view-send?sendId=${next.id}" class="nav-arrow" title="Next: ${new Date(next.sent_at).toLocaleString('en-AU')}">&rsaquo;</a>`
      : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>EOI Document — ${sentDate}</title>
<style>
  @media print { .print-bar, .nav-arrow, .sent-label { display: none !important; } body { padding-top: 0; } }
  .print-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #333; color: #fff; padding: 6px 16px; display: flex; gap: 12px; align-items: center; font-family: sans-serif; font-size: 13px; }
  .print-bar button { background: #f5c518; color: #000; border: none; border-radius: 4px; padding: 6px 16px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .print-bar button:hover { background: #e0b000; }
  body { margin: 0; padding: 0; background: #f0f0f0; }
  .sent-label { text-align: center; padding: 52px 0 6px; font-family: sans-serif; font-size: 15px; color: #333; font-weight: 600; }
  .eoi-wrapper { display: flex; align-items: flex-start; justify-content: center; gap: 0; }
  .eoi-content { padding: 0 20px 20px; flex: 0 1 auto; max-width: 860px; }
  .nav-arrow { display: flex; align-items: center; justify-content: center; align-self: stretch;
    font-size: 48px; color: #555; text-decoration: none; padding: 0 18px;
    background: rgba(0,0,0,0.06); user-select: none; line-height: 1; min-height: 200px; }
  .nav-arrow:hover { color: #000; background: rgba(0,0,0,0.14); }
  .nav-spacer { width: 84px; flex-shrink: 0; }
</style></head><body>
<div class="print-bar">
  <button onclick="window.print()">Print / Save as PDF</button>
  <span style="color:#999;">EOI ${position}</span>
</div>
<div class="sent-label">Sent: ${sentDate}</div>
<div class="eoi-wrapper">
  ${prev ? prevArrow : '<div class="nav-spacer"></div>'}
  <div class="eoi-content">${bodyContent}</div>
  ${next ? nextArrow : '<div class="nav-spacer"></div>'}
</div>
</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error('Failed to render EOI view:', err);
    return new NextResponse('<html><body><p>Failed to render EOI document.</p></body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
