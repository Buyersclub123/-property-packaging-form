// Lag-sheet demonstration (JT 9/11): reads N days of mail (default 90) in all four mailboxes, runs the Geoscape
// lot + plan pass, then saves the sheet on G:. Reads Gmail/GHL only; writes only our DB and the .xlsx.
// The live site reads new mail nightly (/api/inbox-mining/lag-sheet/cron); this script is for a full re-read or a local copy.
// Usage: node scripts/lag-sheet-run.mjs [days=90] [--sheet-only] [--reset]   (--reset re-reads all mail after a rule change)
// LAG_API_BASE defaults to http://localhost:3000.
import fs from 'fs';

const days = parseInt(process.argv[2] || '90', 10);
const sheetOnly = process.argv.includes('--sheet-only');
const OUT = process.env.LAG_SHEET_PATH || 'G:\\My Drive\\Purchase Data Reconstruction\\00 Alignment\\Mining demonstration - lag sheet (mining agent).xlsx';
const BASE = process.env.LAG_API_BASE || 'http://localhost:3000';
const API = `${BASE}/api/inbox-mining/lag-sheet`;
const MAILBOXES = ['property@buyersclub.com.au', 'contracts@buyersclub.com.au', 'construction@buyersclub.com.au', 'sydney.m@buyersclub.com.au'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(body) {
  for (let fails = 0; ; ) {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!data.error) return data;
      console.log(new Date().toISOString(), body.action, body.mailbox || '', 'error', data.error);
      if (++fails > 6) throw new Error(data.error);
      await sleep(30_000);
    } catch (e) {
      if (++fails > 6) throw e;
      console.log(new Date().toISOString(), body.action, body.mailbox || '', 'retry after', String(e.cause?.code || e.message || e));
      await sleep(10_000);
    }
  }
}

if (!sheetOnly && process.argv.includes('--reset')) console.log('reset', JSON.stringify(await call({ action: 'reset' })));
if (!sheetOnly) {
  const results = await Promise.all(MAILBOXES.map(async (mailbox) => {
    const skip = [];
    try {
      for (let chunk = 0; chunk < 2000; chunk++) {
        const d = await call({ action: 'mine', mailbox, days, skip });
        for (const id of d.failedIds || []) if (!skip.includes(id)) skip.push(id);
        console.log(new Date().toISOString(), mailbox, 'chunk', chunk, 'processed', d.processed, 'facts', d.written, 'remaining', d.remaining, 'failed', skip.length);
        if (!d.remaining) return `${mailbox} complete (${skip.length} failed messages)`;
      }
      return `${mailbox} FAILED: chunk limit`;
    } catch (e) {
      return `${mailbox} FAILED: ${e.message}`;
    }
  }));
  console.log(results.join('\n'));
  if (!results.every((r) => r.includes('complete'))) { console.log('NOT done; sheet not rewritten'); process.exit(1); }
  console.log('geoscape', JSON.stringify(await call({ action: 'geoscape' })));
}

const res = await fetch(`${API}/download`);
if (!res.ok) { console.log('download failed', res.status, await res.text()); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
let written = OUT;
try {
  fs.writeFileSync(OUT, buf);
} catch (e) {
  // Open in Excel: save the next free version (v2, v3...) beside it rather than lose the run.
  if (e.code !== 'EBUSY') throw e;
  let v = 2;
  while (fs.existsSync(OUT.replace(/\.xlsx$/, ` v${v}.xlsx`))) v++;
  written = OUT.replace(/\.xlsx$/, ` v${v}.xlsx`);
  fs.writeFileSync(written, buf);
  console.log(`sheet is open in Excel; saved as v${v}`);
}
console.log('wrote', written);
