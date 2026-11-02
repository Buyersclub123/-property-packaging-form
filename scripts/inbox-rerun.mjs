// Re-reads the stored inbox items (last N days, all four mailboxes) so their suggestions follow the current rules.
// Same loop as the console's Run with "Re-read" ticked. Reads Gmail/GHL only; writes only our inbox DB.
// Usage: node scripts/inbox-rerun.mjs [days=7] [mailbox ...]
const days = parseInt(process.argv[2] || '7', 10);
const ALL = ['property@buyersclub.com.au', 'contracts@buyersclub.com.au', 'construction@buyersclub.com.au', 'sydney.m@buyersclub.com.au'];
const MAILBOXES = process.argv.length > 3 ? process.argv.slice(3) : ALL;
// Mailboxes run in parallel.
const results = await Promise.all(MAILBOXES.map(async (mailbox) => {
  let runId;
  const skip = [];
  let fails = 0;
  for (let chunk = 0; chunk < 500; chunk++) {
    let data;
    try {
      const res = await fetch('http://localhost:3000/api/inbox-mining/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailbox, days, rerun: true, runId, skip }),
      });
      data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    } catch (e) {
      // A hung or dropped request (dev server busy/recompiling): log and retry the chunk.
      console.log(new Date().toISOString(), mailbox, 'retry after', String(e.cause?.code || e.name || e));
      await new Promise((r) => setTimeout(r, 10_000));
      continue;
    }
    if (data.error) {
      // A dev-server restart answers 500 for a while: retry, and give up only after repeated errors.
      console.log(new Date().toISOString(), mailbox, 'error', data.error);
      if (++fails > 6) return `${mailbox} FAILED: ${data.error}`;
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }
    fails = 0;
    runId = data.runId;
    // Failed messages are skipped in later chunks so one bad message can't stall a mailbox.
    for (const id of data.failedIds || []) if (!skip.includes(id)) skip.push(id);
    console.log(new Date().toISOString(), mailbox, 'chunk', chunk, 'written', data.written, 'remaining', data.remaining, 'errors', (data.errors || []).length);
    if (!data.remaining) return `${mailbox} complete`;
  }
  return `${mailbox} FAILED: chunk limit`;
}));
console.log(results.join('\n'));
console.log(results.every((r) => r.endsWith('complete')) ? 'done' : 'NOT done');
