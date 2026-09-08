import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ghl-stats?secret=...&hours=48
 * Shows GHL request volume per hour (Sydney time) as recorded by ghlFetch.
 * Add &format=json for raw data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!process.env.DEAL_SHEET_WEBHOOK_SECRET || secret !== process.env.DEAL_SHEET_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hours = Math.min(parseInt(searchParams.get('hours') || '48', 10) || 48, 14 * 24);
  const redis = await getRedisClient();

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  });
  const bucketFor = (d: Date) => {
    const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}`;
  };

  const now = Date.now();
  const rows: { hour: string; data: Record<string, number> }[] = [];
  for (let i = 0; i < hours; i++) {
    const bucket = bucketFor(new Date(now - i * 3600000));
    const raw = await redis.hGetAll(`ghl_stats:${bucket}`);
    if (Object.keys(raw).length === 0) continue;
    const data: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) data[k] = parseInt(v, 10);
    rows.push({ hour: bucket, data });
  }

  if (searchParams.get('format') === 'json') {
    return NextResponse.json({ hours, rows });
  }

  // Collect all sources for column headers
  const sources = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r.data)) if (k.startsWith('src:')) sources.add(k.slice(4));
  const srcList = [...sources].sort();

  const td = 'padding:4px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;white-space:nowrap;';
  const th = 'padding:6px 10px;border-bottom:2px solid #ccc;font-size:11px;color:#666;text-align:right;white-space:nowrap;';

  const totalAll = rows.reduce((s, r) => s + (r.data.total || 0), 0);
  const total429 = rows.reduce((s, r) => s + (r.data['status:429'] || 0), 0);
  const totalRetries = rows.reduce((s, r) => s + (r.data.retries || 0), 0);
  const peak = rows.reduce((m, r) => Math.max(m, r.data.total || 0), 0);

  const body = rows.map((r) => {
    const d = r.data;
    const s429 = d['status:429'] || 0;
    const s5xx = Object.entries(d).filter(([k]) => /^status:5\d\d$/.test(k)).reduce((s, [, v]) => s + v, 0);
    const net = d['status:network'] || 0;
    const warn = s429 > 0 ? 'background:#fff3cd;' : '';
    return `<tr style="${warn}">
      <td style="${td}text-align:left;font-family:monospace;">${r.hour}</td>
      <td style="${td}font-weight:bold;">${d.total || 0}</td>
      <td style="${td}${s429 ? 'color:#b45309;font-weight:bold;' : 'color:#999;'}">${s429}</td>
      <td style="${td}${s5xx ? 'color:#b91c1c;font-weight:bold;' : 'color:#999;'}">${s5xx}</td>
      <td style="${td}${net ? 'color:#b91c1c;' : 'color:#999;'}">${net}</td>
      <td style="${td}${d.retries ? 'color:#b45309;' : 'color:#999;'}">${d.retries || 0}</td>
      ${srcList.map((s) => `<td style="${td}">${d[`src:${s}`] || 0}</td>`).join('')}
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GHL Request Stats</title></head>
<body style="font-family:Arial,sans-serif;padding:20px;background:#fafafa;">
  <h1 style="font-size:18px;">GHL Request Stats — last ${hours}h (Sydney time)</h1>
  <p style="font-size:13px;color:#555;">
    <strong>Total requests:</strong> ${totalAll} &nbsp;|&nbsp;
    <strong>429s:</strong> ${total429} &nbsp;|&nbsp;
    <strong>Retries:</strong> ${totalRetries} &nbsp;|&nbsp;
    <strong>Peak hour:</strong> ${peak} req
  </p>
  <p style="font-size:11px;color:#888;">Each row = one request attempt (retries counted separately). Highlighted rows had 429 rate-limit responses. GHL burst limit ≈ 100 req / 10s.</p>
  <table style="border-collapse:collapse;background:#fff;border:1px solid #ddd;">
    <thead><tr>
      <th style="${th}text-align:left;">Hour</th>
      <th style="${th}">Total</th>
      <th style="${th}">429</th>
      <th style="${th}">5xx</th>
      <th style="${th}">Net err</th>
      <th style="${th}">Retries</th>
      ${srcList.map((s) => `<th style="${th}">${s}</th>`).join('')}
    </tr></thead>
    <tbody>${body || '<tr><td colspan="99" style="padding:20px;color:#999;">No data yet.</td></tr>'}</tbody>
  </table>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
