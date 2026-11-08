// Lag-sheet demonstration (JT 9/11): reads N days of mail (default 90) in all four mailboxes, runs the Geoscape
// lot + plan pass, then rewrites the sheet on G:. Reads Gmail/GHL only; writes only our DB and the .xlsx.
// Usage: node scripts/lag-sheet-run.mjs [days=90] [--sheet-only]
import ExcelJS from 'exceljs';

const days = parseInt(process.argv[2] || '90', 10);
const sheetOnly = process.argv.includes('--sheet-only');
const OUT = process.env.LAG_SHEET_PATH || 'G:\\My Drive\\Purchase Data Reconstruction\\00 Alignment\\Mining demonstration - lag sheet (mining agent).xlsx';
const API = 'http://localhost:3000/api/inbox-mining/lag-sheet';
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

const { rows } = await call({ action: 'rows' });
const syd = (iso) => (iso ? new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Lag sheet');
ws.columns = [
  ['Opportunity', 34], ['Property Record ID', 26], ['Update type', 30], ['Field', 26], ['Mined value', 26], ['Email received', 20], ['From', 34],
  ['GHL value when the email was received', 30], ["Human's value (in GHL now)", 26], ['Human updated', 20], ['Human updated from', 30],
  ['Match (Y/N)', 8], ['Lag (days) = human updated - email received', 16], ['Subject', 50], ['Evidence (new part of the email)', 80], ['Note', 30],
].map(([header, width]) => ({ header, width }));
for (const r of rows)
  ws.addRow([r.opportunity, r.propertyRecordId, r.type, r.field, r.mined, syd(r.received), r.from, r.valueAtReceipt, r.human, syd(r.humanUpdated),
    r.humanSource, r.match, r.lagDays, r.subject, r.quote, r.note]);
ws.getRow(1).font = { bold: true };
ws.views = [{ state: 'frozen', ySplit: 1 }];
ws.autoFilter = { from: 'A1', to: 'P1' };
const about = wb.addWorksheet('About');
about.addRows([
  ['Mining demonstration - lag sheet (mining agent)'], [`Refreshed ${syd(new Date().toISOString())}; mail read: last ${days} days, four mailboxes, new part of each email only, one row per mined fact.`],
  ['Lag = Human updated - Email received (never the miner run time). Blank where no timestamp exists.'],
  ['Human updated comes from the CTRT edit log (from 31 Oct 2026), the change-date fields (finance status, construction stage, Deal Fallen Over; date only) or GHL last stage change. GHL keeps no per-field history, so most older rows have no timestamp.'],
  ['Read-only: nothing was written to GHL.'],
]);
await wb.xlsx.writeFile(OUT);
const byType = {};
for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1;
console.log('rows', rows.length, JSON.stringify(byType));
console.log('wrote', OUT);
