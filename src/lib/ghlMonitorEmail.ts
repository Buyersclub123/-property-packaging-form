import nodemailer from 'nodemailer';
import { getRedisClient } from './redis';
import type { ChangeEvent } from './ghlConfigMonitor';
import { isMinor } from './ghlConfigMonitor';

/**
 * Email for the GHL configuration monitor.
 * Change emails are NEVER rate-limited — every change must be reported.
 * Failure emails use a 1h cooldown so a GHL outage doesn't spam.
 */

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;
export const MONITOR_RECIPIENTS = process.env.GHL_MONITOR_EMAILS || 'john.t@buyersclub.com.au';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
export const ACK_PAGE_URL = `${SITE_URL}/admin/ghl-changes`;

export interface StoredChange extends ChangeEvent {
  id: number;
  detectedAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

function sydney(d: Date | string): string {
  return new Date(d).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number') return esc(v);
  if (Array.isArray(v)) return esc(v.join(', '));
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('name' in o && 'stages' in o) return `${esc(o.name)} (${(o.stages as string[]).length} stages)`;
    if ('name' in o && 'dataType' in o) return `${esc(o.name)} [${esc(o.dataType)}]${o.options ? ` options: ${esc((o.options as string[]).join(', '))}` : ''}`;
  }
  return esc(JSON.stringify(v));
}

const CHANGE_LABEL: Record<string, string> = {
  added: 'Added',
  removed: 'REMOVED',
  renamed: 'Renamed',
  type_changed: 'Type changed',
  options_changed: 'Options changed',
  reordered: 'Reordered (minor)',
  missing_configured: 'MISSING — tools depend on this',
};

function scopeLabel(c: ChangeEvent): string {
  if (c.entityType === 'stage') return `Stage in "${esc(c.scope)}"`;
  if (c.entityType === 'field') return `${esc(c.scope)} field`;
  if (c.entityType === 'object') return 'Custom object';
  return 'Pipeline';
}

export function changesTable(changes: (ChangeEvent & { detectedAt?: string })[], showDetected = false): string {
  const rows = changes.map((c) => {
    const bad = c.changeType === 'removed' || c.changeType === 'missing_configured';
    const style = isMinor(c) ? 'color:#888' : bad ? 'color:#b00020;font-weight:bold' : '';
    return `<tr style="${style}">
      ${showDetected ? `<td>${c.detectedAt ? sydney(c.detectedAt) : ''}</td>` : ''}
      <td>${CHANGE_LABEL[c.changeType] || esc(c.changeType)}</td>
      <td>${scopeLabel(c)}</td>
      <td>${esc(c.entityName)}<br><span style="color:#888;font-size:11px">${esc(c.entityId)}</span></td>
      <td>${fmtValue(c.before)}</td>
      <td>${fmtValue(c.after)}</td>
    </tr>`;
  }).join('');
  return `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-size:13px">
    <tr style="background:#f0f0f0">${showDetected ? '<th>Detected</th>' : ''}<th>Change</th><th>What</th><th>Name / ID</th><th>Before</th><th>After</th></tr>
    ${rows}
  </table>`;
}

async function send(subject: string, html: string): Promise<boolean> {
  if (!ALERT_EMAIL_USER || !ALERT_EMAIL_PASSWORD) {
    console.warn(`GHL monitor email not sent — ALERT_EMAIL_USER/PASSWORD not configured: ${subject}`);
    return false;
  }
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: ALERT_EMAIL_USER, pass: ALERT_EMAIL_PASSWORD } });
  await transporter.sendMail({
    from: ALERT_EMAIL_USER,
    to: MONITOR_RECIPIENTS,
    subject: `[GHL Config Monitor] ${subject}`,
    html: `${html}<p style="color:#888;font-size:12px;margin-top:16px">Sent ${sydney(new Date())} (Sydney). Environment: ${process.env.VERCEL_ENV || 'local development'}.</p>`,
  });
  console.log(`GHL monitor email sent: ${subject}`);
  return true;
}

export async function sendChangeAlert(changes: ChangeEvent[]): Promise<boolean> {
  const major = changes.filter((c) => !isMinor(c)).length;
  const subject = `${changes.length} GHL configuration change${changes.length === 1 ? '' : 's'} detected${major !== changes.length ? ` (${major} significant)` : ''}`;
  return send(subject, `
    <h2>GHL configuration changed</h2>
    <p><strong>Why you are receiving this:</strong> the hourly check found differences between GHL's current pipelines/stages/fields and the previous snapshot.</p>
    <p><strong>What to do:</strong> review the changes below, work out which tools are affected, and <a href="${ACK_PAGE_URL}">acknowledge them here</a>. Unacknowledged changes are repeated in every daily roll-up.</p>
    ${changesTable(changes)}
  `);
}

export async function sendBaselineEmail(counts: Record<string, number>): Promise<boolean> {
  return send('Monitoring started — baseline snapshot stored', `
    <h2>GHL configuration monitor is live</h2>
    <p>A baseline snapshot of GHL's configuration has been stored. From now on the check runs hourly and emails you when anything changes.</p>
    <ul>${Object.entries(counts).map(([k, v]) => `<li>${esc(k)}: ${v}</li>`).join('')}</ul>
    <p><a href="${ACK_PAGE_URL}">Change log / acknowledgement page</a></p>
  `);
}

export async function sendDigest(unacked: StoredChange[], lastCheckAt: string | null): Promise<boolean> {
  const lastCheck = lastCheckAt ? sydney(lastCheckAt) : 'never (check the hourly cron)';
  if (unacked.length === 0) {
    return send('Daily roll-up — no unacknowledged changes', `
      <h2>No unacknowledged GHL configuration changes</h2>
      <p>Last successful check: <strong>${lastCheck}</strong>.</p>
    `);
  }
  const oldest = unacked.reduce((a, c) => (c.detectedAt < a ? c.detectedAt : a), unacked[0].detectedAt);
  const days = Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000);
  return send(`Daily roll-up — ${unacked.length} unacknowledged change${unacked.length === 1 ? '' : 's'}${days > 0 ? ` (oldest ${days} day${days === 1 ? '' : 's'})` : ''}`, `
    <h2>${unacked.length} GHL configuration change${unacked.length === 1 ? '' : 's'} awaiting acknowledgement</h2>
    <p>These repeat daily until <a href="${ACK_PAGE_URL}">acknowledged</a>. Last successful check: <strong>${lastCheck}</strong>.</p>
    ${changesTable(unacked, true)}
  `);
}

const FAIL_COOLDOWN_SEC = 3600;
export async function sendFailureAlert(message: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (await redis.get('ghl-monitor:fail-cooldown')) return false;
    await redis.set('ghl-monitor:fail-cooldown', '1', { EX: FAIL_COOLDOWN_SEC });
  } catch { /* no redis — send anyway */ }
  return send('Hourly GHL configuration check FAILED', `
    <h2>The GHL configuration check could not complete</h2>
    <p><strong>Impact:</strong> changes made in GHL since the last successful check will not be reported until this recovers. No snapshot was stored for this run.</p>
    <p><strong>What to check:</strong> GHL API status, the GHL_BEARER_TOKEN, and Vercel logs for /api/ghl-monitor/check.</p>
    <pre style="background:#f5f5f5;padding:8px">${esc(message)}</pre>
  `);
}
