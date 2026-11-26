import ExcelJS from 'exceljs';
import { buildLagRows, type LagRow } from './lagSheet';

// JT 9/11: the lag sheet is the last 14 days (older mail predates recent process changes); the full read is the "Tool vs GHL" tab.
const LAG_DAYS = 14;
export const LAG_READ_DAYS = 90;

const syd = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const sydDay = (iso: string) => new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
const weekOf = (iso: string) => {
  const d = sydDay(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The lag sheet workbook (Lag sheet, Tool vs GHL, Summary, About) built from what the nightly run has stored. */
export async function buildLagWorkbook(): Promise<Buffer> {
  const rows = await buildLagRows();
  const days = LAG_READ_DAYS;
  const wb = new ExcelJS.Workbook();
  const recent = (r: LagRow) => !r.received || Date.now() - new Date(r.received).getTime() < LAG_DAYS * 86400000;
  const factSheet = (name: string, list: LagRow[]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = ([
      ['Opportunity', 34], ['Property Record ID', 26], ['Email type', 26], ['Confidence', 30], ['Update type', 30], ['Field', 26], ['Mined value', 26], ['Email received', 20], ['From', 34],
      ['GHL value when the email was received', 30], ["Human's value (in GHL now)", 26], ['Human updated', 20], ['Human updated from', 30],
      ['Match (Y/N)', 8], ['Lag (days) = human updated - email received', 16], ['Subject', 50], ['Evidence (new part of the email)', 80], ['Note', 30], ['How the email type was decided', 50],
    ] as [string, number][]).map(([header, width]) => ({ header, width }));
    for (const r of list)
      ws.addRow([r.opportunity, r.propertyRecordId, r.emailType, r.confidence, r.type, r.field, r.mined, syd(r.received), r.from, r.valueAtReceipt, r.human, syd(r.humanUpdated),
        r.humanSource, r.match, r.lagDays, r.subject, r.quote, r.note, r.typeSource]);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'S1' };
  };
  factSheet(`Lag sheet (last ${LAG_DAYS} days)`, rows.filter(recent));
  factSheet(`Tool vs GHL (${days} days)`, rows.filter((r) => r.received));

  // Work done by the tool, per week (by email received) and for the last 7 days.
  const mail = rows.filter((r) => r.received);
  const line = (label: string, list: LagRow[]) => {
    const after = list.filter((r) => r.match === 'Y' && r.lagDays !== null && r.lagDays > 0);
    const avg = after.length ? Math.round((after.reduce((s, r) => s + (r.lagDays as number), 0) / after.length) * 10) / 10 : null;
    return [label, list.length, new Set(list.map((r) => r.opportunity)).size, list.filter((r) => r.match === 'Y').length, after.length, avg, list.filter((r) => r.match === 'N').length];
  };
  const summary = wb.addWorksheet('Summary');
  summary.columns = ([['Week starting (Mon)', 20], ['Facts found in mail', 14], ['Opportunities', 14], ['Already the same in GHL now', 16],
    ['Entered by a person after the email', 18], ['Average days the person took', 16], ['Not in GHL yet (tool would fill or correct)', 22]] as [string, number][])
    .map(([header, width]) => ({ header, width }));
  for (const w of Array.from(new Set(mail.map((r) => weekOf(r.received))))) summary.addRow(line(w, mail.filter((r) => weekOf(r.received) === w)));
  summary.addRow([]);
  summary.addRow(line('Last 7 days', mail.filter((r) => Date.now() - new Date(r.received).getTime() < 7 * 86400000)));
  summary.addRow(line(`All ${days} days`, mail));
  const geo = rows.filter((r) => !r.received);
  summary.addRow([]);
  summary.addRow(['Street addresses found by Geoscape (lot + plan)', geo.length, '', geo.filter((r) => r.human).length]);
  summary.getRow(1).font = { bold: true };

  const about = wb.addWorksheet('About');
  about.addRows([
    ['Mining demonstration - lag sheet (mining agent)'],
    [`Refreshed ${syd(new Date().toISOString())}; mail read: last ${days} days, four mailboxes, new part of each email only, one row per mined fact. New mail is read every night on the live site.`],
    [`"Lag sheet" holds the last ${LAG_DAYS} days of mail plus Geoscape addresses; "Tool vs GHL" holds all ${days} days to compare what the tool captured with what GHL shows.`],
    ['Construction stage counts as a match if either the Property Record dropdown or the opportunity pipeline stage holds it.'],
    ['Lag = Human updated - Email received (never the miner run time). Blank where no timestamp exists.'],
    ['Human updated comes from the CTRT edit log (from 31 Oct 2026), the change-date fields (finance status, construction stage, Deal Fallen Over; date only) or GHL last stage change. GHL keeps no per-field history, so most older rows have no timestamp.'],
    ['Read-only: nothing was written to GHL.'],
  ]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
