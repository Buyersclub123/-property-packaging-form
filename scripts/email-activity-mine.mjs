// Backlog 17 driver: loops mailbox x month chunks against the local dev server, then finalizes and exports.
// Usage (repo root, with `npm run dev` running): node scripts/email-activity-mine.mjs [YYYY-MM ...]
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MAILBOXES = ['property@buyersclub.com.au', 'contracts@buyersclub.com.au', 'construction@buyersclub.com.au', 'sydney.m@buyersclub.com.au'];
const MONTHS = process.argv.slice(2).length ? process.argv.slice(2) : ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${BASE}/api/inbox-mining/activity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(280_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (e) {
      log(`  request failed (attempt ${attempt}): ${e.message}`);
      if (attempt >= 5) throw e;
      await sleep(30_000 * attempt);
    }
  }
}

const unresolved = [];
for (const mailbox of MAILBOXES) {
  for (const month of MONTHS) {
    let skip = [];
    let retried = false;
    for (;;) {
      let r;
      try {
        r = await post({ mailbox, month, skip });
      } catch (e) {
        unresolved.push(`${mailbox} ${month}: ${e.message}`);
        break;
      }
      skip.push(...r.failed.map((f) => f.id));
      log(`${mailbox} ${month}: listed ${r.listed}, mined ${r.mined}, failed ${r.failed.length}, remaining ${r.remaining}`);
      r.failed.slice(0, 3).forEach((f) => log(`  failed ${f.id}: ${f.error}`));
      if (r.remaining > 0) continue;
      if (skip.length && !retried) {
        log(`  retrying ${skip.length} failed once`);
        skip = [];
        retried = true;
        continue;
      }
      if (skip.length) unresolved.push(`${mailbox} ${month}: ${skip.length} messages failed twice (${skip.slice(0, 5).join(', ')})`);
      break;
    }
  }
}

log('finalizing (thread position, reply hours, opportunity match)...');
log(JSON.stringify(await post({ action: 'finalize' })));
log('exporting xlsx...');
execFileSync(process.execPath, ['scripts/email-activity-export.mjs'], { stdio: 'inherit' });
log(unresolved.length ? `UNRESOLVED:\n${unresolved.join('\n')}` : 'DONE, no unresolved failures');
