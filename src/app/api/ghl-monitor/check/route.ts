import { NextResponse } from 'next/server';
import { fetchSnapshot, diffSnapshots, checkConfiguredPipelines, snapshotCounts } from '@/lib/ghlConfigMonitor';
import { getLatestSnapshot, saveSnapshot, insertChanges, listUnacknowledged, isCronAuthorised } from '@/lib/ghlMonitorStore';
import { sendChangeAlert, sendBaselineEmail, sendFailureAlert } from '@/lib/ghlMonitorEmail';
import { getRedisClient } from '@/lib/redis';

// Hourly cron (vercel.json). Fetches GHL config, diffs against the last
// snapshot, records changes, emails immediately if anything changed.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LAST_CHECK_KEY = 'ghl-monitor:last-check';

export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let current;
  try {
    current = await fetchSnapshot();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('GHL monitor fetch failed:', message);
    await sendFailureAlert(message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  try {
    const previous = await getLatestSnapshot();
    const counts = snapshotCounts(current);

    if (!previous) {
      await saveSnapshot(current);
      const missing = checkConfiguredPipelines(current);
      if (missing.length > 0) { await insertChanges(missing); await sendChangeAlert(missing); }
      await sendBaselineEmail(counts);
      await markChecked();
      return NextResponse.json({ ok: true, baseline: true, counts, missingConfigured: missing.length });
    }

    const changes = [...diffSnapshots(previous.payload, current), ...checkConfiguredPipelines(current)];
    // Only report a configured-pipeline-missing once per pipeline until acknowledged
    const dedupedChanges = await dropAlreadyOpenMissing(changes);

    if (dedupedChanges.length > 0) {
      await insertChanges(dedupedChanges);
      await sendChangeAlert(dedupedChanges);
    }
    await saveSnapshot(current);
    await markChecked();

    return NextResponse.json({ ok: true, baseline: false, counts, changes: dedupedChanges.length, previousTakenAt: previous.takenAt, detail: dedupedChanges });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('GHL monitor store/diff failed:', message);
    await sendFailureAlert(`Snapshot fetched OK but storing/diffing failed: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function markChecked() {
  try {
    const redis = await getRedisClient();
    await redis.set(LAST_CHECK_KEY, new Date().toISOString());
  } catch { /* heartbeat is best-effort */ }
}

async function dropAlreadyOpenMissing(changes: Awaited<ReturnType<typeof diffSnapshots>>) {
  const missing = changes.filter((c) => c.changeType === 'missing_configured');
  if (missing.length === 0) return changes;
  const open = new Set((await listUnacknowledged()).filter((c) => c.changeType === 'missing_configured').map((c) => c.entityId));
  return changes.filter((c) => c.changeType !== 'missing_configured' || !open.has(c.entityId));
}
