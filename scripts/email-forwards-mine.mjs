// Backlog 21: collect sent forwards (metadata only) from the shared mailboxes and every staff mailbox the reader can open.
// Needs `npm run dev` on localhost:3000. Usage (repo root): node scripts/email-forwards-mine.mjs
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const BASE = process.env.INBOX_BASE_URL || 'http://localhost:3000';
const boxes = (await sql`
  SELECT lower(from_email) AS e, COUNT(*)::int AS n FROM email_activity
  WHERE from_email ILIKE '%@buyersclub.com.au' GROUP BY 1 HAVING COUNT(*) >= 10 ORDER BY 2 DESC`).map((r) => r.e);
console.log(`${boxes.length} mailboxes`);
for (const mailbox of boxes) {
  let total = 0;
  for (let round = 0; round < 200; round++) {
    let r;
    try {
      const res = await fetch(`${BASE}/api/inbox-mining/forwards`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mailbox }),
      });
      r = await res.json();
      if (!res.ok) throw new Error(r.error || `HTTP ${res.status}`);
    } catch (e) {
      console.log(`${mailbox}: request failed (${e.message}), retrying`);
      await new Promise((ok) => setTimeout(ok, 5000));
      continue;
    }
    if (!r.readable) { console.log(`${mailbox}: not readable - ${r.error}`); break; }
    total += r.written;
    if (r.errors?.length) console.log(`${mailbox}: ${r.errors.length} message errors, e.g. ${r.errors[0]}`);
    if (r.remaining <= 0 || r.written === 0) { console.log(`${mailbox}: ${r.listed} sent forwards listed, ${total} read this run`); break; }
  }
}
console.log('done');
