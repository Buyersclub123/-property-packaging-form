// Re-reads the stored inbox items (last N days, all four mailboxes) so their suggestions follow the current rules.
// Same loop as the console's Run with "Re-read" ticked. Reads Gmail/GHL only; writes only our inbox DB.
// Usage: node scripts/inbox-rerun.mjs [days=7]
const days = parseInt(process.argv[2] || '7', 10);
const MAILBOXES = ['property@buyersclub.com.au', 'contracts@buyersclub.com.au', 'construction@buyersclub.com.au', 'sydney.m@buyersclub.com.au'];
// Mailboxes run in parallel.
await Promise.all(MAILBOXES.map(async (mailbox) => {
  let runId;
  const skip = [];
  for (let chunk = 0; chunk < 500; chunk++) {
    const res = await fetch('http://localhost:3000/api/inbox-mining/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailbox, days, rerun: true, runId, skip }),
    });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (data.error) {
      console.log(new Date().toISOString(), mailbox, 'error', data.error);
      break;
    }
    runId = data.runId;
    for (const e of data.errors || []) {
      const id = String(e).match(/^([0-9a-f]{10,})/)?.[1];
      if (id && !skip.includes(id)) skip.push(id);
    }
    console.log(new Date().toISOString(), mailbox, 'chunk', chunk, 'written', data.written, 'remaining', data.remaining, 'errors', (data.errors || []).length);
    if (!data.remaining) break;
  }
}));
console.log('done');
