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
const JT_EMAIL = 'john.t@buyersclub.com.au';

// Feature flag — set DEAL_SHEET_REMINDERS_ENABLED=true in Vercel env to activate emails
const REMINDERS_ENABLED = process.env.DEAL_SHEET_REMINDERS_ENABLED === 'true';

// Thresholds (working-hours milliseconds)
const PACKAGER_FIRST_MS = 1 * 60 * 60 * 1000;  // 1 working hour before first reminder
const PACKAGER_REPEAT_MS = 2 * 60 * 60 * 1000;  // then every 2 working hours

// ---- Business-hours helpers (Mon–Fri 8am–6pm Sydney time, auto-handles AEST/AEDT) ----

function getSydneyParts(utc: Date): { year: number; month: number; day: number; hour: number; dow: number } {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(utc).map(p => [p.type, p.value]));
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year), month: parseInt(parts.month), day: parseInt(parts.day),
    hour: parseInt(parts.hour), dow: dowMap[parts.weekday] ?? 0,
  };
}

function getSydneyOffsetMs(utc: Date): number {
  const syd = getSydneyParts(utc);
  const sydMidnightApprox = Date.UTC(syd.year, syd.month - 1, syd.day);
  const utcMidnight = Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  // offset = how far ahead Sydney is from UTC
  const dayDiffMs = sydMidnightApprox - utcMidnight;
  const hourDiffMs = (syd.hour - utc.getUTCHours()) * 3600000;
  return dayDiffMs + hourDiffMs;
}

function isBusinessHours(now: Date): boolean {
  const syd = getSydneyParts(now);
  if (syd.dow < 1 || syd.dow > 5) return false; // Sat/Sun
  return syd.hour >= 8 && syd.hour < 18;
}

function getOversightType(now: Date): 'morning' | 'afternoon' | null {
  const syd = getSydneyParts(now);
  if (syd.dow < 1 || syd.dow > 5) return null;
  if (syd.hour === 8) return 'morning';
  if (syd.hour === 16) return 'afternoon';
  return null;
}

/**
 * Count working-hours milliseconds between two UTC dates.
 * Working hours = Mon–Fri 8:00–18:00 Sydney time (auto AEST/AEDT).
 */
function getWorkingHoursMs(sinceUTC: Date, untilUTC: Date): number {
  const offsetMs = getSydneyOffsetMs(sinceUTC);
  const since = sinceUTC.getTime() + offsetMs;
  const until = untilUTC.getTime() + offsetMs;
  if (until <= since) return 0;

  let totalMs = 0;
  const sinceD = new Date(since);
  let dayMs = Date.UTC(sinceD.getUTCFullYear(), sinceD.getUTCMonth(), sinceD.getUTCDate());
  const untilD = new Date(until);
  const lastDayMs = Date.UTC(untilD.getUTCFullYear(), untilD.getUTCMonth(), untilD.getUTCDate());

  while (dayMs <= lastDayMs) {
    const dow = new Date(dayMs).getUTCDay();
    if (dow >= 1 && dow <= 5) {
      const bizOpen = dayMs + 8 * 3600000;
      const bizClose = dayMs + 18 * 3600000;
      const overlapStart = Math.max(since, bizOpen);
      const overlapEnd = Math.min(until, bizClose);
      if (overlapEnd > overlapStart) totalMs += overlapEnd - overlapStart;
    }
    dayMs += 86400000;
  }
  return totalMs;
}

function formatWorkingAge(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Build the email subject line (without prefix) from raw GHL properties.
 * Uses subject_line field if available, otherwise reconstructs from property/project fields
 * to match the logic in Make.com Module 3.
 */
function buildSubjectLine(rawProps: Record<string, unknown>): string {
  const subjectLine = rawProps.subject_line as string | undefined;
  if (subjectLine && subjectLine.trim()) return subjectLine;

  const projectId = rawProps.project_identifier as string | undefined;
  const projectAddr = rawProps.project_address as string | undefined;

  if (projectId && projectAddr) {
    const cleaned = projectAddr.trim()
      .replace(/^\s*(lot|unit)\s*[^,]+,\s*/i, '')
      .replace(/^\s*(lot|unit)\s+\S+\s+/i, '');
    return cleaned ? `Property Review (Project): ${cleaned.toUpperCase()}` : 'Property Review (Project)';
  }

  const addr = (rawProps.property_address as string) || '';
  return addr ? `Property Review: ${addr.toUpperCase()}` : 'Property Review';
}

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
  const preview = searchParams.get('preview') === 'true';

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
    const now = new Date();
    const forceBizHours = searchParams.get('forceBusinessHours') === 'true';
    const inBizHours = forceBizHours || isBusinessHours(now);
    const oversightType = forceBizHours ? 'morning' : getOversightType(now);
    const targetStatus = getTargetStatus(testMode);
    const redis = await getRedisClient();

    // Fetch all records
    const rawRecords = await fetchAllRecords();
    const records = rawRecords
      .map((r) => ({ ...transformRecord(r), rawProperties: r.properties }))
      .filter((r) => r.status.startsWith(targetStatus));

    const results: Record<string, unknown> = {
      testMode,
      dryRun,
      targetStatus,
      inBusinessHours: inBizHours,
      oversightType,
      totalRecords: records.length,
      packagerReminders: [] as { email: string; records: string[] }[],
      oversightSent: false,
      emergencyAlerts: [] as string[],
      emailsSent: 0,
      errors: [] as string[],
    };

    const emailQueue: { type: string; to: string; cc?: string; subject: string; html: string }[] = [];
    // Track record IDs per packager email for Redis update after send
    const packagerSentMap = new Map<string, string[]>();

    // ================================================================
    // 1. TRACK approval timestamps (runs every cycle, not just biz hours)
    // ================================================================
    for (const rec of records) {
      if (rec.packagerApproved.toLowerCase() === 'approved') {
        const pkgKey = `packager_approved_at:${rec.id}`;
        if (!(await redis.get(pkgKey))) {
          await redis.set(pkgKey, now.toISOString());
        }
        if (rec.qaApproved.toLowerCase() === 'approved') {
          const qaKey = `qa_approved_at:${rec.id}`;
          if (!(await redis.get(qaKey))) {
            await redis.set(qaKey, now.toISOString());
          }
        }
      }
    }

    // ================================================================
    // 2. EMERGENCY — QA approved but packager NOT (runs always)
    // ================================================================
    const emergencyRecords = records.filter(
      (r) => r.qaApproved.toLowerCase() === 'approved' && r.packagerApproved.toLowerCase() !== 'approved'
    );

    for (const rec of emergencyRecords) {
      (results.emergencyAlerts as string[]).push(`${rec.propertyAddress} (${rec.id})`);
      if (!dryRun && REMINDERS_ENABLED) {
        const cleared = await clearQAApproval(rec.id);
        if (!cleared) (results.errors as string[]).push(`Failed to clear QA for ${rec.id}`);
      }
    }

    if (emergencyRecords.length > 0) {
      const emergencyPackagerEmails = [...new Set(
        emergencyRecords.map((r) => r.rawProperties.packager_email).filter(Boolean)
      )];
      emailQueue.push({
        type: 'emergency',
        to: testMode
          ? (ALERT_EMAIL_USER || PROPERTY_EMAIL)
          : [PROPERTY_EMAIL, ...emergencyPackagerEmails].join(', '),
        cc: testMode ? undefined : JT_EMAIL,
        subject: `Auto-Correction: QA approval removed — packager approval was missing (${emergencyRecords.length} record${emergencyRecords.length > 1 ? 's' : ''})`,
        html: `
          <h2>Data Integrity Alert</h2>
          <p>The following record${emergencyRecords.length > 1 ? 's had' : ' had'} QA approval set without packager approval. The QA approval has been automatically cleared:</p>
          <ul>${emergencyRecords.map((r) => `<li><strong>${r.propertyAddress || 'Unknown'}</strong></li>`).join('')}</ul>
        `,
      });
    }

    // ================================================================
    // 3. BUSINESS-HOURS ONLY — packager reminders + oversight
    // ================================================================
    if (inBizHours) {

      // ---- 3a. PACKAGER REMINDERS (working-hours cadence) ----
      const packagerUnapproved = records.filter((r) => {
        if (r.packagerApproved.toLowerCase() === 'approved') return false;
        if (!r.createdAt) return false;
        return getWorkingHoursMs(new Date(r.createdAt), now) >= PACKAGER_FIRST_MS;
      });

      // Determine which records are due for a reminder this cycle
      const packagerDue: typeof packagerUnapproved = [];
      for (const rec of packagerUnapproved) {
        const lastKey = `ds_reminder_last:${rec.id}`;
        const lastStr = await redis.get(lastKey);
        if (!lastStr) {
          packagerDue.push(rec); // first reminder
        } else {
          const sinceLast = getWorkingHoursMs(new Date(lastStr), now);
          if (sinceLast >= PACKAGER_REPEAT_MS) packagerDue.push(rec);
        }
      }

      // Group by packager email
      const packagerGroups = new Map<string, typeof packagerDue>();
      for (const rec of packagerDue) {
        const email = rec.rawProperties.packager_email || '';
        if (!email) continue;
        if (!packagerGroups.has(email)) packagerGroups.set(email, []);
        packagerGroups.get(email)!.push(rec);
      }

      for (const [email, recs] of packagerGroups) {
        (results.packagerReminders as { email: string; records: string[] }[]).push({
          email,
          records: recs.map((r) => r.propertyAddress || r.id),
        });

        // Group project records by project_identifier so one row per project
        const projectGroups = new Map<string, typeof recs>();
        const standaloneRecs: typeof recs = [];
        for (const r of recs) {
          const projId = r.rawProperties.project_identifier as string | undefined;
          if (projId) {
            if (!projectGroups.has(projId)) projectGroups.set(projId, []);
            projectGroups.get(projId)!.push(r);
          } else {
            standaloneRecs.push(r);
          }
        }

        const recordRows: string[] = [];
        for (const r of standaloneRecs) {
          const age = formatWorkingAge(getWorkingHoursMs(new Date(r.createdAt), now));
          const subj = `PACKAGER TO CONFIRM \u2013 ${buildSubjectLine(r.rawProperties as Record<string, unknown>)}`;
          recordRows.push(`<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">
              <code style="font-size:13px;background:#f5f5f5;padding:4px 8px;border-radius:4px;display:inline-block;user-select:all;">${subj}</code>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;font-size:13px;color:#666;">${age} *</td>
          </tr>`);
        }
        for (const [, projRecs] of projectGroups) {
          const oldest = Math.min(...projRecs.map(r => new Date(r.createdAt).getTime()));
          const age = formatWorkingAge(getWorkingHoursMs(new Date(oldest), now));
          const subj = `PACKAGER TO CONFIRM \u2013 ${buildSubjectLine(projRecs[0].rawProperties as Record<string, unknown>)}`;
          const lotNote = projRecs.length > 1 ? `<div style="font-size:12px;color:#888;margin-top:4px;">${projRecs.length} lots in this project</div>` : '';
          recordRows.push(`<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">
              <code style="font-size:13px;background:#f5f5f5;padding:4px 8px;border-radius:4px;display:inline-block;user-select:all;">${subj}</code>
              ${lotNote}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;font-size:13px;color:#666;">${age} *</td>
          </tr>`);
        }
        const recordRowsHtml = recordRows.join('');

        emailQueue.push({
          type: 'packager_reminder',
          to: testMode ? (ALERT_EMAIL_USER || email) : email,
          subject: `${recs.length} property package${recs.length > 1 ? 's' : ''} awaiting your approval`,
          html: `
            <h2>Packager Approval Reminder</h2>
            <p>The following property package${recs.length > 1 ? 's' : ''} need${recs.length === 1 ? 's' : ''} your approval. Search your inbox for the subject line to find the original email:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="text-align:left;">
                  <th style="padding:8px 12px;border-bottom:2px solid #ccc;font-size:12px;color:#888;">EMAIL SUBJECT LINE</th>
                  <th style="padding:8px 12px;border-bottom:2px solid #ccc;font-size:12px;color:#888;">WAITING</th>
                </tr>
              </thead>
              <tbody>${recordRowsHtml}</tbody>
            </table>
            <p><strong>Please action these records:</strong></p>
            <ul>
              <li>Find the original <em>PACKAGER TO CONFIRM</em> email in your inbox using the subject line above, review the packaging and approve if complete, OR</li>
              <li>Set the status to <em>Remove Lost</em> or <em>Remove No Interest</em> if you are not going to approve, OR</li>
              <li>If you cannot find the original email, contact John Truscott for assistance</li>
            </ul>
            <hr>
            <p style="font-size:11px;color:#999;">* Waiting time is calculated on business hours only (Mon\u2013Fri, 8am\u20136pm AEST).</p>
            <p style="font-size:11px;color:#999;">This is an automated reminder. You will continue to receive reminders every 2 hours during business hours until these records are actioned.</p>
          `,
        });

        // Track for Redis timestamp update after successful send
        packagerSentMap.set(email, recs.map((r) => r.id));
      }

      // ---- 3b. OVERSIGHT EMAIL (8am / 4pm) ----
      if (oversightType) {
        const isAfternoon = oversightType === 'afternoon';
        const stillText = isAfternoon ? ' still' : '';

        // Packager outstanding — grouped by packager name
        const allPackagerOutstanding = records.filter(
          (r) => r.packagerApproved.toLowerCase() !== 'approved' && r.createdAt
        );
        const packagerByName = new Map<string, typeof allPackagerOutstanding>();
        for (const rec of allPackagerOutstanding) {
          const name = rec.packager || 'Unknown';
          if (!packagerByName.has(name)) packagerByName.set(name, []);
          packagerByName.get(name)!.push(rec);
        }

        let packagerHtml = '';
        let packagerCount = 0;
        for (const [name, recs] of [...packagerByName.entries()].sort((a, b) => b[1].length - a[1].length)) {
          packagerCount += recs.length;
          const items = recs
            .sort((a, b) => getWorkingHoursMs(new Date(b.createdAt), now) - getWorkingHoursMs(new Date(a.createdAt), now))
            .map((r) => {
              const age = formatWorkingAge(getWorkingHoursMs(new Date(r.createdAt), now));
              return `<li>${r.propertyAddress || 'Unknown'} \u2014 ${age} *</li>`;
            })
            .join('');
          packagerHtml += `<p><strong>${name}</strong> \u2014 ${recs.length} outstanding</p><ul>${items}</ul>`;
        }
        if (packagerCount === 0) {
          packagerHtml = '<p>None \u2014 all records have been packager-approved. \u2713</p>';
        }

        // QA outstanding — subject lines in a table with ages, projects grouped
        const allQAOutstanding = records.filter(
          (r) => r.packagerApproved.toLowerCase() === 'approved' && r.qaApproved.toLowerCase() !== 'approved'
        );
        let qaHtml = '';
        const qaCount = allQAOutstanding.length;
        if (qaCount > 0) {
          // Group by project_identifier; standalone records get their own row
          const qaProjectGroups = new Map<string, typeof allQAOutstanding>();
          const qaStandalone: typeof allQAOutstanding = [];
          for (const rec of allQAOutstanding) {
            const projId = rec.rawProperties.project_identifier as string | undefined;
            if (projId) {
              if (!qaProjectGroups.has(projId)) qaProjectGroups.set(projId, []);
              qaProjectGroups.get(projId)!.push(rec);
            } else {
              qaStandalone.push(rec);
            }
          }

          const qaRows: string[] = [];
          for (const rec of qaStandalone) {
            const approvedAtStr = await redis.get(`packager_approved_at:${rec.id}`);
            const age = approvedAtStr
              ? formatWorkingAge(getWorkingHoursMs(new Date(approvedAtStr), now))
              : 'unknown';
            const subj = `QA TO VERIFY \u2013 ${buildSubjectLine(rec.rawProperties as Record<string, unknown>)}`;
            qaRows.push(`<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">
                <code style="font-size:13px;background:#f5f5f5;padding:4px 8px;border-radius:4px;display:inline-block;user-select:all;">${subj}</code>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;font-size:13px;color:#666;">${age} *</td>
            </tr>`);
          }
          for (const [, projRecs] of qaProjectGroups) {
            // Use the oldest approval time for the group
            let oldestAge = 'unknown';
            for (const rec of projRecs) {
              const approvedAtStr = await redis.get(`packager_approved_at:${rec.id}`);
              if (approvedAtStr) {
                const age = formatWorkingAge(getWorkingHoursMs(new Date(approvedAtStr), now));
                if (oldestAge === 'unknown' || age > oldestAge) oldestAge = age;
              }
            }
            const subj = `QA TO VERIFY \u2013 ${buildSubjectLine(projRecs[0].rawProperties as Record<string, unknown>)}`;
            const lotNote = projRecs.length > 1 ? `<div style="font-size:12px;color:#888;margin-top:4px;">${projRecs.length} lots in this project</div>` : '';
            qaRows.push(`<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">
                <code style="font-size:13px;background:#f5f5f5;padding:4px 8px;border-radius:4px;display:inline-block;user-select:all;">${subj}</code>
                ${lotNote}
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap;font-size:13px;color:#666;">${oldestAge} *</td>
            </tr>`);
          }
          qaHtml = `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="text-align:left;">
                <th style="padding:8px 12px;border-bottom:2px solid #ccc;font-size:12px;color:#888;">EMAIL SUBJECT LINE</th>
                <th style="padding:8px 12px;border-bottom:2px solid #ccc;font-size:12px;color:#888;">WAITING</th>
              </tr>
            </thead>
            <tbody>${qaRows.join('')}</tbody>
          </table>`;
        } else {
          qaHtml = '<p>None \u2014 all packager-approved records have QA approval. \u2713</p>';
        }

        emailQueue.push({
          type: 'oversight',
          to: testMode ? (ALERT_EMAIL_USER || PROPERTY_EMAIL) : PROPERTY_EMAIL,
          subject: `Approval Overview: ${packagerCount} Packager / ${qaCount} QA${stillText} outstanding`,
          html: `
            <h2>Approval Overview \u2014 ${isAfternoon ? 'Afternoon' : 'Morning'}</h2>
            <h3>Packager Approval Outstanding${packagerCount > 0 ? ` \u2014 ${packagerCount} blocking` : ''}</h3>
            ${packagerHtml}
            <h3>QA Approval Outstanding${qaCount > 0 ? ` \u2014 ${qaCount} waiting` : ''}</h3>
            ${qaHtml}
            ${qaCount > 0 ? `<p><strong>Please action these records:</strong></p>
            <ul>
              <li>Find the original <em>QA TO VERIFY</em> email in your inbox using the subject line above, review and approve if complete, OR</li>
              <li>Set the status to <em>Remove Lost</em> or <em>Remove No Interest</em> if the record should not proceed, OR</li>
              <li>If you cannot find the original email, contact John Truscott for assistance</li>
            </ul>` : ''}
            <hr>
            <p style="font-size:11px;color:#999;">* Waiting time is calculated on business hours only (Mon\u2013Fri, 8am\u20136pm AEST).</p>
            <p style="font-size:11px;color:#999;">This is an automated oversight email sent at 8am and 4pm Mon\u2013Fri.</p>
          `,
        });

        results.oversightSent = true;
      }
    }

    // ================================================================
    // 4. SEND EMAILS
    // ================================================================
    const emailResults: { type: string; to: string; status: string; error?: string }[] = [];

    if (!dryRun && !preview && REMINDERS_ENABLED) {
      const transporter = createTransporter();

      for (const emailItem of emailQueue) {
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
          (results.emailsSent as number)++;

          // Update Redis last-sent timestamps for packager reminders
          if (emailItem.type === 'packager_reminder') {
            const recIds = packagerSentMap.get(emailItem.to);
            if (recIds) {
              for (const rid of recIds) {
                await redis.set(`ds_reminder_last:${rid}`, now.toISOString(), { EX: 30 * 86400 });
              }
            }
          }
        } catch (err) {
          const errMsg = String(err);
          emailResults.push({ type: emailItem.type, to: emailItem.to, status: 'failed', error: errMsg });
          (results.errors as string[]).push(`Failed to email ${emailItem.to} (${emailItem.type}): ${errMsg}`);
        }
      }
    }

    // render=true → show the emails as rendered HTML in the browser
    if (searchParams.get('render') === 'true') {
      const rendered = emailQueue.map((e) => `
        <div style="border:1px solid #ccc;border-radius:8px;margin:24px auto;max-width:700px;padding:0;font-family:Arial,sans-serif;">
          <div style="background:#f0f0f0;padding:12px 16px;border-bottom:1px solid #ccc;border-radius:8px 8px 0 0;">
            <div style="font-size:11px;color:#666;margin-bottom:4px;"><strong>Type:</strong> ${e.type}</div>
            <div style="font-size:11px;color:#666;margin-bottom:4px;"><strong>To:</strong> ${e.to}${e.cc ? ` &nbsp; <strong>CC:</strong> ${e.cc}` : ''}</div>
            <div style="font-size:13px;font-weight:bold;">${e.subject}</div>
          </div>
          <div style="padding:16px;">${e.html}</div>
        </div>
      `).join('');

      const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email Preview</title></head>
        <body style="background:#fafafa;margin:0;padding:20px;font-family:Arial,sans-serif;">
          <h1 style="text-align:center;font-size:16px;color:#333;">Email Preview — ${emailQueue.length} email${emailQueue.length !== 1 ? 's' : ''} would be sent</h1>
          <p style="text-align:center;font-size:12px;color:#888;">inBusinessHours: ${inBizHours} | oversightType: ${oversightType || 'none'} | records: ${records.length}</p>
          ${emailQueue.length === 0 ? '<p style="text-align:center;color:#999;">No emails to send this cycle.</p>' : rendered}
        </body></html>`;

      return new NextResponse(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return NextResponse.json({
      success: true,
      duration: `${Date.now() - startTime}ms`,
      ...results,
      emailResults,
      ...(preview || dryRun ? { emailPreviews: emailQueue } : {}),
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
