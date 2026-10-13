import { NextRequest, NextResponse } from 'next/server';
import { sendGmailAsUser } from '@/lib/gmailSendAsUser';

export const dynamic = 'force-dynamic';

// Review feedback for the Exchange Email POC goes to JT (POC only).
const REVIEW_TO = 'john.t@buyersclub.com.au';

interface ReviewItem {
  section: string;
  label: string;
  value: string;
  source: string;
  from: string;
  writeBack: boolean;
  comment: string;
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

/**
 * POST /api/exchange-email/review  (POC)
 *
 * Emails the per-field write-back decisions + comments and general notes to JT,
 * CC the reviewer. Sent from the reviewer's account.
 *
 * Body: { sentBy, oppId, oppName, address, notes, items: ReviewItem[] }
 */
export async function POST(request: NextRequest) {
  const { sentBy, oppId, oppName, address, notes, items } = (await request.json()) as {
    sentBy: string;
    oppId: string;
    oppName: string;
    address: string;
    notes: string;
    items: ReviewItem[];
  };

  if (!sentBy || !Array.isArray(items)) {
    return NextResponse.json({ error: 'sentBy and items are required' }, { status: 400 });
  }

  const cell = 'padding:4px 8px;border:1px solid #ddd;font-size:12px;vertical-align:top';
  const rows = items.map((it) => `
    <tr>
      <td style="${cell}">${esc(it.section)}</td>
      <td style="${cell}"><strong>${esc(it.label)}</strong></td>
      <td style="${cell}">${esc(it.value) || '<span style="color:#888">—</span>'}</td>
      <td style="${cell}">${esc(it.source)}<br/><span style="color:#666;font-size:11px">${esc(it.from)}</span></td>
      <td style="${cell};text-align:center">${it.writeBack ? 'YES' : 'no'}</td>
      <td style="${cell}${it.comment ? ';background:#fffbe6' : ''}">${esc(it.comment)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Calibri,'Segoe UI',Arial,sans-serif;color:#111;font-size:13px">
  <h2 style="margin:0 0 4px 0">Exchange Email POC — field review</h2>
  <p style="margin:0 0 12px 0;color:#444">
    Reviewer: <strong>${esc(sentBy)}</strong><br/>
    Opportunity: <strong>${esc(oppName)}</strong> (${esc(oppId)})<br/>
    Property: ${esc(address) || '—'}<br/>
    Submitted: ${new Date().toLocaleString('en-AU')}
  </p>
  ${notes ? `<div style="padding:10px;background:#f3f4f6;border:1px solid #e5e7eb;margin-bottom:12px"><strong>General notes</strong><br/>${esc(notes)}</div>` : ''}
  <table style="border-collapse:collapse;width:100%">
    <thead><tr style="background:#4D4D4D;color:#FBD721">
      <th style="${cell}">Section</th><th style="${cell}">Field</th><th style="${cell}">Value shown</th>
      <th style="${cell}">Source</th><th style="${cell}">Write back?</th><th style="${cell}">Comment</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

  const cc = sentBy.toLowerCase() !== REVIEW_TO ? [sentBy] : [];
  const result = await sendGmailAsUser({
    sentBy,
    to: [REVIEW_TO],
    cc,
    subject: `Exchange Email POC review — ${oppName || oppId}`,
    html,
  });

  if (result.status === 'sent') return NextResponse.json({ status: 'sent', to: REVIEW_TO, cc });
  return NextResponse.json(result, { status: 500 });
}
