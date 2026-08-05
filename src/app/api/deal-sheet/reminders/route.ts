import { NextResponse } from 'next/server';
import { GHLRecord, GHLSearchResponse, transformRecord } from '@/lib/dealSheetTransform';
import { getRedisClient } from '@/lib/redis';
import nodemailer from 'nodemailer';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = '2021-07-28';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com/objects';

const ALERT_EMAIL_USER = process.env.ALERT_EMAIL_USER;
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD;
const PROPERTY_EMAIL = 'property@buyersclub.com.au';
const PACKAGING_EMAIL = 'packaging@buyersclub.com.au';
const JT_EMAIL = 'john.t@buyersclub.com.au';

// Feature flag — set DEAL_SHEET_REMINDERS_ENABLED=true in Vercel env to activate emails
const REMINDERS_ENABLED = process.env.DEAL_SHEET_REMINDERS_ENABLED === 'true';

// Thresholds
const PACKAGER_REMINDER_HOURS = 1;
const QA_REMINDER_HOURS = 3;

// For testing: pass ?testMode=true to check status 07 instead of 01
function getTargetStatus(testMode: boolean): string {
  return testMode ? '07' : '01';
}

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

async function fetchAllRecords(): Promise<GHLRecord[]> {
  const allRecords: GHLRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_TOKEN}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        page,
        pageLimit: 100,
      }),
    });

    if (!response.ok) break;

    const data: GHLSearchResponse = await response.json();
    if (data.records && data.records.length > 0) {
      allRecords.push(...data.records);
      page++;
      if (data.records.length < 100) hasMore = false;
    } else {
      hasMore = false;
    }

    if (page > 20) hasMore = false;
  }

  return allRecords;
}

async function clearQAApproval(recordId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${GHL_API_BASE_URL}/${GHL_OBJECT_ID}/records/${recordId}?locationId=${GHL_LOCATION_ID}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_API_TOKEN}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { qa_approved: null },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get('testMode') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';

  // Auth check — support both query param (manual test) and CRON_SECRET header (Vercel cron)
  const secret = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthed =
    (expectedSecret && secret === expectedSecret) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetStatus = getTargetStatus(testMode);
    const redis = await getRedisClient();

    // Fetch all records
    const rawRecords = await fetchAllRecords();
    const records = rawRecords
      .map((r) => ({ ...transformRecord(r), rawProperties: r.properties }))
      .filter((r) => r.status.startsWith(targetStatus));

    const now = Date.now();
    const results = {
      testMode,
      dryRun,
      targetStatus,
      totalRecords: records.length,
      packagerReminders: [] as { email: string; records: string[] }[],
      qaReminders: [] as string[],
      emergencyAlerts: [] as string[],
      emailsSent: 0,
      errors: [] as string[],
    };

    // === EMERGENCY: QA approved but Packager NOT approved ===
    const emergencyRecords = records.filter(
      (r) => r.qaApproved.toLowerCase() === 'approved' && r.packagerApproved.toLowerCase() !== 'approved'
    );

    for (const rec of emergencyRecords) {
      results.emergencyAlerts.push(`${rec.propertyAddress} (${rec.id})`);
      if (!dryRun && REMINDERS_ENABLED) {
        // Auto-clear QA approval
        const cleared = await clearQAApproval(rec.id);
        if (!cleared) {
          results.errors.push(`Failed to clear QA for ${rec.id}`);
        }
      }
    }

    // === PACKAGER REMINDERS: >1h since creation, packager not approved ===
    const packagerOverdue = records.filter((r) => {
      if (r.packagerApproved.toLowerCase() === 'approved') return false;
      if (!r.createdAt) return false;
      const age = now - new Date(r.createdAt).getTime();
      return age > PACKAGER_REMINDER_HOURS * 60 * 60 * 1000;
    });

    // Group by packager_email
    const packagerGroups = new Map<string, typeof packagerOverdue>();
    for (const rec of packagerOverdue) {
      const email = rec.rawProperties.packager_email || '';
      if (!email) continue;
      if (!packagerGroups.has(email)) packagerGroups.set(email, []);
      packagerGroups.get(email)!.push(rec);
    }

    for (const [email, recs] of packagerGroups) {
      results.packagerReminders.push({
        email,
        records: recs.map((r) => r.propertyAddress || r.id),
      });
    }

    // === QA REMINDERS: Packager approved >3h ago, QA not approved ===
    const qaOverdue: typeof records = [];
    for (const rec of records) {
      if (rec.packagerApproved.toLowerCase() !== 'approved') continue;
      if (rec.qaApproved.toLowerCase() === 'approved') continue;

      // Check when packager was approved (stored in Redis)
      const approvedAtKey = `packager_approved_at:${rec.id}`;
      let approvedAtStr = await redis.get(approvedAtKey);

      if (!approvedAtStr) {
        // First time seeing this approved — store now, skip this cycle
        await redis.set(approvedAtKey, new Date().toISOString());
        continue;
      }

      const approvedAt = new Date(approvedAtStr).getTime();
      const timeSinceApproval = now - approvedAt;

      if (timeSinceApproval > QA_REMINDER_HOURS * 60 * 60 * 1000) {
        qaOverdue.push(rec);
        results.qaReminders.push(`${rec.propertyAddress} (${rec.id})`);
      }
    }

    // === BUILD EMAIL CONTENT ===
    const emailPreviews: { type: string; to: string; cc?: string; subject: string; html: string }[] = [];

    // Packager reminder emails (one per packager)
    for (const [email, recs] of packagerGroups) {
      const recordList = recs
        .map((r) => `<li><strong>${r.propertyAddress || 'Unknown'}</strong> — raised ${r.reviewDate}</li>`)
        .join('');

      emailPreviews.push({
        type: 'packager_reminder',
        to: email,
        cc: testMode ? undefined : `${PACKAGING_EMAIL}, ${JT_EMAIL}`,
        subject: `Packager Approval Reminder: ${recs.length} property record${recs.length > 1 ? 's' : ''} awaiting your approval`,
        html: `
          <h2>Packager Approval Reminder</h2>
          <p>The following property record${recs.length > 1 ? 's are' : ' is'} awaiting your approval for more than ${PACKAGER_REMINDER_HOURS} hour${PACKAGER_REMINDER_HOURS > 1 ? 's' : ''}:</p>
          <ul>${recordList}</ul>
          <p><strong>Please action these records:</strong></p>
          <ul>
            <li>Approve the packaging if complete, OR</li>
            <li>Set the status to <em>Remove Lost</em> or <em>Remove No Interest</em> if you are not going to approve, OR</li>
            <li>If you have not received the email to approve, contact John Truscott for assistance</li>
          </ul>
          <p><a href="https://property-packaging-form.vercel.app/deal-sheet">Open Deal Sheet</a></p>
          <hr>
          <p><small>This is an automated reminder. You will continue to receive reminders until these records are actioned.</small></p>
        `,
      });
    }

    // QA reminder email (one consolidated email)
    if (qaOverdue.length > 0) {
      const recordList = qaOverdue
        .map((r) => `<li><strong>${r.propertyAddress || 'Unknown'}</strong> — packager: ${r.packager}</li>`)
        .join('');

      emailPreviews.push({
        type: 'qa_reminder',
        to: testMode ? (ALERT_EMAIL_USER || PROPERTY_EMAIL) : PROPERTY_EMAIL,
        cc: testMode ? undefined : JT_EMAIL,
        subject: `QA Approval Overdue: ${qaOverdue.length} record${qaOverdue.length > 1 ? 's' : ''} waiting >3 hours`,
        html: `
          <h2>QA Approval Reminder</h2>
          <p>The following record${qaOverdue.length > 1 ? 's have' : ' has'} been packager-approved for more than ${QA_REMINDER_HOURS} hours but ${qaOverdue.length > 1 ? 'are' : 'is'} still awaiting QA approval:</p>
          <ul>${recordList}</ul>
          <p><a href="https://property-packaging-form.vercel.app/deal-sheet">Open Deal Sheet</a></p>
          <hr>
          <p><small>This is an automated reminder sent hourly until resolved.</small></p>
        `,
      });
    }

    // Emergency alert email
    if (emergencyRecords.length > 0) {
      const recordList = emergencyRecords
        .map((r) => `<li><strong>${r.propertyAddress || 'Unknown'}</strong> (${r.id}) — QA approval has been automatically removed</li>`)
        .join('');

      // Collect unique packager emails from emergency records
      const emergencyPackagerEmails = [...new Set(
        emergencyRecords.map((r) => r.rawProperties.packager_email).filter(Boolean)
      )];
      const emergencyTo = testMode
        ? (ALERT_EMAIL_USER || PROPERTY_EMAIL)
        : [PROPERTY_EMAIL, ...emergencyPackagerEmails].join(', ');

      emailPreviews.push({
        type: 'emergency',
        to: emergencyTo,
        cc: testMode ? undefined : JT_EMAIL,
        subject: `Auto-Correction: QA approval removed — packager approval was missing (${emergencyRecords.length} record${emergencyRecords.length > 1 ? 's' : ''})`,
        html: `
          <h2>Data Integrity Alert</h2>
          <p>The following record${emergencyRecords.length > 1 ? 's had' : ' had'} QA approval set without packager approval. The QA approval has been automatically cleared:</p>
          <ul>${recordList}</ul>
          <p><a href="https://property-packaging-form.vercel.app/deal-sheet">Open Deal Sheet</a></p>
        `,
      });
    }

    // === SEND EMAILS (unless dryRun or preview) ===
    const preview = searchParams.get('preview') === 'true';
    const emailResults: { type: string; to: string; status: string; error?: string }[] = [];

    if (!dryRun && !preview && REMINDERS_ENABLED) {
      const transporter = createTransporter();

      for (const emailItem of emailPreviews) {
        try {
          console.log(`[Reminders] Sending ${emailItem.type} email to ${emailItem.to}...`);
          await transporter.sendMail({
            from: ALERT_EMAIL_USER,
            to: emailItem.to,
            cc: emailItem.cc,
            subject: emailItem.subject,
            html: emailItem.html,
          });
          emailResults.push({ type: emailItem.type, to: emailItem.to, status: 'sent' });
          results.emailsSent++;
        } catch (err) {
          const errMsg = String(err);
          emailResults.push({ type: emailItem.type, to: emailItem.to, status: 'failed', error: errMsg });
          results.errors.push(`Failed to email ${emailItem.to} (${emailItem.type}): ${errMsg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      duration: `${Date.now() - startTime}ms`,
      ...results,
      emailResults,
      ...(preview || dryRun ? { emailPreviews } : {}),
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
