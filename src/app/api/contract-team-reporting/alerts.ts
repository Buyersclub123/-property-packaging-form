import nodemailer from 'nodemailer';
import { getRedisClient } from '@/lib/redis';

/**
 * Email alerting for the Contract Team Reporting Tool.
 *
 * Because the tool's GHL API calls do NOT go through Make.com, failures are
 * invisible unless we surface them. Every alert email explains WHY it was
 * sent, WHAT the impact is, and WHAT to check.
 *
 * Recipients: CTR_ALERT_EMAILS env var (comma-separated) overrides the
 * built-in default list.
 */

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;

const DEFAULT_RECIPIENTS = 'john.t@buyersclub.com.au, julie.l@buyersclub.com.au';
export const CTR_ALERT_RECIPIENTS =
  process.env.CTR_ALERT_EMAILS || process.env.CTR_SCHEMA_ALERT_EMAILS || DEFAULT_RECIPIENTS;

// Don't send the same alert type more than once per hour
const COOLDOWN_MS = 60 * 60 * 1000;
const memoryCooldown = new Map<string, number>();

async function inCooldown(type: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    const key = `ctr:alert-cooldown:${type}`;
    const exists = await redis.get(key);
    if (exists) return true;
    await redis.set(key, '1', { EX: Math.floor(COOLDOWN_MS / 1000) });
    return false;
  } catch {
    // Redis unavailable — fall back to per-instance memory
    const last = memoryCooldown.get(type);
    if (last && Date.now() - last < COOLDOWN_MS) return true;
    memoryCooldown.set(type, Date.now());
    return false;
  }
}

/**
 * Send a descriptive alert email. `type` scopes the 1-hour cooldown.
 */
export async function sendCtrAlert(options: {
  type: string;
  subject: string;
  reason: string;      // WHY this email was sent
  impact: string;      // WHAT it means for users of the tool
  detailsHtml?: string; // technical details (error text, endpoint, etc.)
  action?: string;     // WHAT to check / do
}): Promise<void> {
  const { type, subject, reason, impact, detailsHtml, action } = options;
  try {
    if (await inCooldown(type)) {
      console.log(`CTR alert "${type}" suppressed (1h cooldown)`);
      return;
    }
    if (!ALERT_EMAIL_USER || !ALERT_EMAIL_PASSWORD) {
      console.warn(`CTR alert "${type}" not sent — ALERT_EMAIL_USER/PASSWORD not configured`);
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: ALERT_EMAIL_USER, pass: ALERT_EMAIL_PASSWORD },
    });
    await transporter.sendMail({
      from: ALERT_EMAIL_USER,
      to: CTR_ALERT_RECIPIENTS,
      subject: `[Contract Team Reporting Tool] ${subject}`,
      html: `
        <h2>${subject}</h2>
        <p><strong>Why you are receiving this email:</strong> ${reason}</p>
        <p><strong>Impact:</strong> ${impact}</p>
        ${action ? `<p><strong>What to check:</strong> ${action}</p>` : ''}
        ${detailsHtml ? `<h3>Technical details</h3>${detailsHtml}` : ''}
        <p style="color:#888;font-size:12px">
          Sent ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} (Sydney time).
          At most one email per issue type per hour.
          Environment: ${process.env.VERCEL_ENV || 'local development'}.
        </p>
      `,
    });
    console.log(`CTR alert "${type}" sent to ${CTR_ALERT_RECIPIENTS}`);
  } catch (e) {
    console.error(`CTR alert "${type}" failed to send:`, e);
  }
}
