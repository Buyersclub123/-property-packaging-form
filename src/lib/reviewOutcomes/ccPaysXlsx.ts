import ExcelJS from 'exceljs';
import type { CcPays } from './ccPays';
import { ccLabel, type CcPeriod } from './ccPaysPeriod';

const dmy = (s: string) => s.split('-').reverse().join('/');
export const inPeriod = (ymd: string, p: CcPeriod | null) => !!p && ymd >= p.from && ymd <= p.to;

/** Excel copy of a CC PAYS preview, laid out like the tab. Rows dated inside `also` are highlighted yellow. */
export async function ccPaysXlsx(d: CcPays & { tab: string }, also: CcPeriod | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(d.tab.slice(0, 31));
  [368, 141, 100, 100, 100, 223, 90].forEach((px, i) => { ws.getColumn(i + 1).width = px / 7; });
  const hl: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
  const grey: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB7B7B7' } };
  const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
  const box = { top: thin, bottom: thin, left: thin, right: thin };
  const at = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
  ws.addRow([`PREVIEW ONLY (not written to the workbook). ${d.tab}: ${dmy(d.from)} - ${dmy(d.to)}, outcomes entered up to ${at}.`]).font = { bold: true };
  if (also) ws.addRow([`Highlighted = meeting on ${dmy(also.from)} - ${dmy(also.to)}, so it is also in the "${ccLabel(also)} AUTOMATED" report.`]).getCell(1).fill = hl;
  ws.addRow(['Column G (DATE) is only in this preview.']).font = { italic: true };
  ws.addRow([]);
  let n = 0, h = 0;
  for (const b of d.blocks.filter((x) => x.rows.length)) {
    ws.addRow([b.header, 'COMMS DUE', 'CRM NOTES', 'TLC', 'CONSULTANT', 'DAY OFF', 'DATE'])
      .eachCell((c) => { c.fill = grey; c.font = { bold: true, size: 10 }; c.border = box; });
    for (const r of b.rows) {
      const on = inPeriod(r.ymd, also);
      ws.addRow([r.client, r.comms, r.crm, r.tlc, r.consultant, '', dmy(r.ymd)])
        .eachCell({ includeEmpty: true }, (c, i) => { if (i <= 7) { c.border = box; if (on) c.fill = hl; } });
      n++; if (on) h++;
    }
    for (let k = 0; k < 3; k++) ws.addRow(['', '', '', '', '', '', '']).eachCell({ includeEmpty: true }, (c, i) => { if (i <= 7) c.border = box; });
  }
  ws.addRow([]);
  ws.addRow([`${n} Showed meetings${also ? `, ${h} highlighted` : ''}.`]);
  if (d.skipped.length) ws.addRow([`Left out: ${d.skipped.map((s) => `${s.client} ${dmy(s.ymd)} (${s.reason})`).join('; ')}`]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
