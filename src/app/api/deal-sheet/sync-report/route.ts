import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import nodemailer from 'nodemailer';

// F49: End-of-day discrepancy report.
// Reads the discrepancy log accumulated by sync-refresh throughout the day,
// emails a summary. The log is NOT cleared — it accumulates so historical
// reports can be run against the raw data. Redis TTL handles expiry.
// Runs Mon-Fri at 6pm Sydney time (8am UTC, 0 8 * * 1-5).

const DISCREPANCY_KEY = 'ds:discrepancies';

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;
const JT_EMAIL = 'john.t@buyersclub.com.au';

export const dynamic = 'force-dynamic';

function createTransporter() {
  if (!ALERT_EMAIL_USER || !ALERT_EMAIL_PASSWORD) {
    throw new Error('Email configuration missing');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ALERT_EMAIL_USER,
      pass: ALERT_EMAIL_PASSWORD,
    },
  });
}

interface Discrepancy {
  recordId: string;
  address: string;
  timestamp: string;
  changes: { field: string; cached: string; fresh: string }[];
}

export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = await getRedisClient();

    // Read all discrepancies logged today
    const rawEntries = await redis.lRange(DISCREPANCY_KEY, 0, -1);
    const discrepancies: Discrepancy[] = (rawEntries || []).map((raw) => JSON.parse(raw));

    // Group by record for a cleaner report
    const byRecord = new Map<string, { address: string; events: { timestamp: string; changes: Discrepancy['changes'] }[] }>();
    for (const d of discrepancies) {
      const existing = byRecord.get(d.recordId);
      if (existing) {
        existing.events.push({ timestamp: d.timestamp, changes: d.changes });
      } else {
        byRecord.set(d.recordId, {
          address: d.address,
          events: [{ timestamp: d.timestamp, changes: d.changes }],
        });
      }
    }

    // Build HTML email
    const rows: string[] = [];
    for (const [recordId, data] of byRecord) {
      for (const event of data.events) {
        const time = new Date(event.timestamp).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney' });
        const changesHtml = event.changes
          .map((c) => `<b>${c.field}</b>: "${c.cached}" → "${c.fresh}"`)
          .join('<br/>');
        rows.push(`
          <tr>
            <td style="padding:4px 8px;border:1px solid #ddd;font-size:12px;">${data.address || recordId}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;font-size:12px;">${time}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;font-size:12px;">${changesHtml}</td>
          </tr>
        `);
      }
    }

    const tableHtml = discrepancies.length > 0 ? `
      <p>${discrepancies.length} discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} detected across ${byRecord.size} record${byRecord.size === 1 ? '' : 's'} today.</p>
      <p style="font-size:12px;color:#666;">These are differences found between the cached Deal Sheet data and a fresh GHL fetch during the 30-minute background sync. They indicate changes that the 15-second webhook poll may have missed or been slow to pick up.</p>
      <table style="border-collapse:collapse;width:100%;margin-top:12px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;font-size:12px;">Property</th>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;font-size:12px;">Time</th>
            <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;font-size:12px;">Changes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    ` : `
      <p style="color:#2d7d46;font-weight:bold;">No mismatches today.</p>
      <p style="font-size:12px;color:#666;">The 30-minute background sync found no differences between the cached data and GHL. The webhook sync is working correctly.</p>
    `;

    const html = `
      <h2>Deal Sheet Sync Report</h2>
      ${tableHtml}
      <p style="font-size:11px;color:#999;margin-top:12px;">This report is generated automatically at 6pm Sydney time.</p>
    `;

    // Send email
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: ALERT_EMAIL_USER,
        to: JT_EMAIL,
        subject: discrepancies.length === 0
          ? `Deal Sheet Sync Report — No mismatches (${new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })})`
          : `Deal Sheet Sync Report — ${discrepancies.length} discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} (${new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' })})`,
        html,
      });
    } catch (emailErr) {
      console.error('Sync report email failed:', emailErr);
      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        count: discrepancies.length,
      });
    }

    // Log is NOT cleared — it accumulates for historical reporting.
    // The sync-refresh endpoint sets a 24h TTL on the Redis key, so entries
    // older than 24h expire naturally.

    return NextResponse.json({
      success: true,
      message: `Report sent with ${discrepancies.length} discrepancies across ${byRecord.size} records.`,
      count: discrepancies.length,
    });
  } catch (error) {
    console.error('Sync report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
