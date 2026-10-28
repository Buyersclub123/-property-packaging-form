// Phase (a): display only. Phase (b) copies accepted documents to these paths.
export const DRIVE_DOCS_ROOT = 'G:\\My Drive\\Purchase Data Reconstruction\\06 Documents';

const TYPE_LABEL: Record<string, string> = {
  registration_titles_issued: 'Titles issued',
  contract_received_unsigned: 'Contract received',
  contract_executed_exchanged: 'Executed contract',
  deposit_receipt: 'Deposit receipt',
  bp_report: 'B&P report',
  build_update_progress_claim: 'Progress claim',
  finance_update: 'Finance update',
  other: 'Document',
};

const safeName = (s: string) =>
  s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');

const sydneyDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });

export const driveFolder = (opportunityName: string | null | undefined) =>
  opportunityName && safeName(opportunityName) ? `${DRIVE_DOCS_ROOT}\\${safeName(opportunityName)}` : null;

export function driveFilePath(opportunityName: string | null | undefined, cls: string, receivedAt: Date | string, filename: string) {
  const folder = driveFolder(opportunityName);
  if (!folder) return null;
  const base = filename.split(/[\\/]/).pop() || filename;
  return `${folder}\\${TYPE_LABEL[cls] || 'Document'} - ${sydneyDate(receivedAt)} - ${safeName(base)}`;
}
