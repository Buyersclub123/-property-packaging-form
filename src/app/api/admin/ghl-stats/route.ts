import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { sydneyBuckets, statsKeys, STATS_ENV } from '@/lib/ghlFetch';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ghl-stats?secret=...&hours=48&errors=200
 * Shows GHL request volume per hour (Sydney time) as recorded by ghlFetch,
 * plus the most recent error events with what else was in flight that minute.
 * Add &format=json for raw data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!process.env.DEAL_SHEET_WEBHOOK_SECRET || secret !== process.env.DEAL_SHEET_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hours = Math.min(parseInt(searchParams.get('hours') || '48', 10) || 48, 14 * 24);
  const errorLimit = Math.min(parseInt(searchParams.get('errors') || '200', 10) || 200, 5000);
  const redis = await getRedisClient();

  const now = Date.now();
  const rows: { hour: string; data: Record<string, number> }[] = [];
  for (let i = 0; i < hours; i++) {
    const bucket = sydneyBuckets(new Date(now - i * 3600000)).hour;
    const raw = await redis.hGetAll(statsKeys.hour(bucket));
    if (Object.keys(raw).length === 0) continue;
    const data: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) data[k] = parseInt(v, 10);
    rows.push({ hour: bucket, data });
  }

  // Recent error events (newest first) + what else was in flight that minute
  const rawErrors = await redis.zRange(statsKeys.errors, 0, errorLimit - 1, { REV: true });
  const minuteCache = new Map<string, Record<string, string>>();
  const errors: {
    time: string; minute: string; source: string; endpoint: string; status: string;
    attempt: number; ms: number; minuteTotal: number; minuteBySource: Record<string, number>;
  }[] = [];
  for (const entry of rawErrors) {
    const [tsStr, source, endpoint, status, attemptStr, msStr] = entry.split('|');
    const ts = parseInt(tsStr, 10);
    const d = new Date(ts);
    const { minute } = sydneyBuckets(d);
    let min = minuteCache.get(minute);
    if (!min) {
      min = await redis.hGetAll(statsKeys.minute(minute));
      minuteCache.set(minute, min);
    }
    const bySource: Record<string, number> = {};
    for (const [k, v] of Object.entries(min)) if (k.startsWith('src:')) bySource[k.slice(4)] = parseInt(v, 10);
    const secs = String(d.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', second: '2-digit' })).padStart(2, '0');
    errors.push({
      time: `${minute}:${secs}`,
      minute,
      source,
      endpoint,
      status,
      attempt: parseInt(attemptStr, 10),
      ms: parseInt(msStr, 10),
      minuteTotal: parseInt(min.total || '0', 10),
      minuteBySource: bySource,
    });
  }

  if (searchParams.get('format') === 'json') {
    return NextResponse.json({ env: STATS_ENV, hours, rows, errors });
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

  const errorRows = errors.map((e) => {
    const is429 = e.status === '429';
    const color = is429 ? '#b45309' : '#b91c1c';
    const inFlight = Object.entries(e.minuteBySource)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s} <span style="color:#999;">×${n}</span>`)
      .join(', ');
    return `<tr>
      <td style="${td}text-align:left;font-family:monospace;">${e.time}</td>
      <td style="${td}text-align:left;">${e.source}</td>
      <td style="${td}text-align:left;font-family:monospace;font-size:11px;">${e.endpoint}</td>
      <td style="${td}color:${color};font-weight:bold;">${e.status}</td>
      <td style="${td}">${e.attempt}</td>
      <td style="${td}">${e.ms}</td>
      <td style="${td}font-weight:bold;">${e.minuteTotal}</td>
      <td style="${td}text-align:left;font-size:12px;">${inFlight || '<span style="color:#999;">—</span>'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GHL Request Stats</title></head>
<body style="font-family:Arial,sans-serif;padding:20px;background:#fafafa;">
  <h1 style="font-size:18px;">GHL Request Stats — <span style="color:${STATS_ENV === 'production' ? '#b91c1c' : '#2563eb'};">${STATS_ENV.toUpperCase()}</span> — last ${hours}h (Sydney time)</h1>
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

  <h2 style="font-size:16px;margin-top:36px;">Error events — last ${errors.length} (newest first)</h2>
  <p style="font-size:11px;color:#888;">"In flight that minute" = all GHL requests from every source in the same Sydney minute, so you can see what collided. Attempt 0 = first try; 1-3 = retries.</p>
  <table style="border-collapse:collapse;background:#fff;border:1px solid #ddd;">
    <thead><tr>
      <th style="${th}text-align:left;">Time</th>
      <th style="${th}text-align:left;">Source</th>
      <th style="${th}text-align:left;">Endpoint</th>
      <th style="${th}">Status</th>
      <th style="${th}">Attempt</th>
      <th style="${th}">ms</th>
      <th style="${th}">Req/min</th>
      <th style="${th}text-align:left;">In flight that minute</th>
    </tr></thead>
    <tbody>${errorRows || '<tr><td colspan="8" style="padding:20px;color:#999;">No errors recorded.</td></tr>'}</tbody>
  </table>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
