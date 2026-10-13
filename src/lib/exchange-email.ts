// Server/client-shared helpers for the Exchange Email POC.
// Maps a Contract Team Reporting row (opportunity + linked Property Review
// co_ fields) and the last sent EOI into the data the template renders,
// and records where each value came from for the composer's source panel.

export const PLACEHOLDER = '[need to confirm source of this data]';
export const NA = 'N/A';

export type ExchangeSource = 'Opportunity' | 'Property Review' | 'Last EOI' | 'Static' | 'TBD';

export interface ExchangeFieldSource {
  key: keyof ExchangeEmailData;
  label: string;
  section: string;
  source: ExchangeSource;
  /** GHL / tool field key the value came from (for the review panel) */
  from: string;
  value: string;
}

export interface ExchangeEmailData {
  propertyAddress: string;
  clientName: string;

  // Deposit details
  depositPayable: string;
  depositDueDate: string;

  // Finance
  brokerName: string;
  brokerPhone: string;
  brokerEmail: string;
  financeDueDate: string;

  // Pest and build
  inspectorName: string;
  bpDueDate: string;

  // Settlement / legal
  solicitorName: string;
  solicitorCompany: string;
  solicitorEmail: string;

  // Property management
  propertyManager: string;

  // Rental assessment
  occupancy: string;
  currentRent: string;
  expiry: string;
  currentYield: string;
  appraisedRent: string;
  appraisedYield: string;

  // Key contacts
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  clientNames: string;
  clientPhones: string;
  clientEmails: string;
  accountantName: string;
  accountantPhone: string;
  accountantEmail: string;
}

type Row = Record<string, string>;

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function money(v: string): string {
  if (!v) return '';
  const n = parseFloat(v.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return v;
  return `$${n.toLocaleString('en-AU')}`;
}

function joinNonEmpty(parts: string[], sep: string): string {
  return parts.map((p) => (p || '').trim()).filter(Boolean).join(sep);
}

export interface LastEoiPayload {
  depositAmount?: string;
  depositPayable?: string;
  landDeposit?: string;
  buildDeposit?: string;
}

/**
 * Build the template data + a parallel list of sources from a CTRT row.
 * Empty values are left empty here; the template decides between N/A and
 * the placeholder depending on whether a source is known.
 */
export function buildExchangeEmailData(
  row: Row,
  lastEoi: LastEoiPayload | null
): { data: ExchangeEmailData; sources: ExchangeFieldSource[] } {
  const sources: ExchangeFieldSource[] = [];
  const data = {} as ExchangeEmailData;

  const set = (
    key: keyof ExchangeEmailData,
    label: string,
    section: string,
    source: ExchangeSource,
    from: string,
    value: string
  ) => {
    data[key] = value;
    sources.push({ key, label, section, source, from, value });
  };

  const hasProperty = Boolean(row.co_record_id);
  const coSource: ExchangeSource = hasProperty ? 'Property Review' : 'TBD';
  const coFrom = (k: string) => (hasProperty ? k : `${k} (no linked Property Review)`);

  set('propertyAddress', 'Property address', 'Header', 'Property Review', coFrom('co_property_address'),
    row.co_property_address || row.registeredAddress || '');
  set('clientName', 'Client (opportunity name)', 'Header', 'Opportunity', 'name', row.name || '');

  // Deposit
  const eoiDeposit = lastEoi
    ? joinNonEmpty([
        lastEoi.depositAmount || '',
        lastEoi.landDeposit ? `Land: ${lastEoi.landDeposit}` : '',
        lastEoi.buildDeposit ? `Build: ${lastEoi.buildDeposit}` : '',
      ], ' | ')
    : '';
  set('depositPayable', 'Deposit payable', 'Deposit Details', lastEoi ? 'Last EOI' : 'TBD',
    lastEoi ? 'eoi_sends.payload.depositAmount' : 'No sent EOI found for the linked property', eoiDeposit);
  set('depositDueDate', 'Deposit due date', 'Deposit Details', 'TBD', 'source to be identified', '');

  // Finance
  set('brokerName', 'Broker name', 'Finance', 'Opportunity', 'brokerName', row.brokerName || '');
  set('brokerPhone', 'Broker phone', 'Key Contacts', 'Opportunity', 'brokerPhone', row.brokerPhone || '');
  set('brokerEmail', 'Broker email', 'Finance', 'Opportunity', 'brokerEmail', row.brokerEmail || '');
  set('financeDueDate', 'Finance due date', 'Finance', 'Opportunity', 'financeDueDate', fmtDate(row.financeDueDate || ''));

  // Pest & build
  set('inspectorName', 'Pest & build inspector', 'Pest and build inspection', 'TBD', 'source to be identified', '');
  set('bpDueDate', 'B&P due date', 'Pest and build inspection', 'Opportunity', 'bpDueDate', fmtDate(row.bpDueDate || ''));

  // Settlement / legal
  set('solicitorName', 'Solicitor contact', 'Settlement', 'Opportunity', 'solicitorName', row.solicitorName || '');
  set('solicitorCompany', 'Solicitor firm', 'Key Contacts', 'Opportunity', 'solicitorCompany', row.solicitorCompany || '');
  set('solicitorEmail', 'Solicitor email', 'Key Contacts', 'Opportunity', 'solicitorEmail', row.solicitorEmail || '');

  // Property management
  set('propertyManager', 'Property manager', 'Property Management', 'Opportunity', 'propertyManager (opportunity.property_manager)',
    row.propertyManager || '');

  // Rental assessment (primary dwelling only for the POC)
  set('occupancy', 'Occupancy', 'Rental Assessment', coSource, coFrom('co_occupancy_primary'), row.co_occupancy_primary || '');
  set('currentRent', 'Current rent', 'Rental Assessment', coSource, coFrom('co_current_rent_primary__per_week'),
    row.co_current_rent_primary__per_week ? `${money(row.co_current_rent_primary__per_week)} per week` : '');
  set('expiry', 'Expiry', 'Rental Assessment', coSource, coFrom('co_expiry_primary'), row.co_expiry_primary || '');
  set('currentYield', 'Current yield', 'Rental Assessment', coSource, coFrom('co_yield'), row.co_yield || '');
  const apprFrom = row.co_rent_appraisal_primary_from || '';
  const apprTo = row.co_rent_appraisal_primary_to || '';
  const appraisal = apprFrom && apprTo ? `${money(apprFrom)} - ${money(apprTo)} per week` : apprFrom || apprTo ? `${money(apprFrom || apprTo)} per week` : '';
  set('appraisedRent', 'Appraised rent', 'Rental Assessment', coSource,
    coFrom('co_rent_appraisal_primary_from / co_rent_appraisal_primary_to'), appraisal);
  set('appraisedYield', 'Appraised yield', 'Rental Assessment', coSource, coFrom('co_appraised_yield'), row.co_appraised_yield || '');

  // Key contacts
  set('agentName', 'Agent name', 'Key Contacts', coSource, coFrom('co_agent_name'), row.co_agent_name || '');
  set('agentPhone', 'Agent phone', 'Key Contacts', coSource, coFrom('co_agent_mobile'), row.co_agent_mobile || '');
  set('agentEmail', 'Agent email', 'Key Contacts', coSource, coFrom('co_agent_email'), row.co_agent_email || '');
  set('clientNames', 'Client name(s)', 'Key Contacts', 'Opportunity', 'contactName + partnerName',
    joinNonEmpty([row.contactName || '', row.partnerName || ''], ' & '));
  set('clientPhones', 'Client phone(s)', 'Key Contacts', 'Opportunity', 'contactPhone + partnerPhone',
    joinNonEmpty([row.contactPhone || '', row.partnerPhone || ''], ' & '));
  set('clientEmails', 'Client email(s)', 'Key Contacts', 'Opportunity', 'contactEmail + partnerEmail',
    joinNonEmpty([row.contactEmail || '', row.partnerEmail || ''], ' & '));
  set('accountantName', 'Accountant name', 'Key Contacts', 'Opportunity', 'accountantName (opportunity.accountant)', row.accountantName || '');
  set('accountantPhone', 'Accountant mobile', 'Key Contacts', 'Opportunity', 'accountantPhone (opportunity.accountant_mobile)', row.accountantPhone || '');
  set('accountantEmail', 'Accountant email', 'Key Contacts', 'Opportunity', 'accountantEmail (opportunity.accountant_email)', row.accountantEmail || '');

  return { data, sources };
}

const FONT = "Calibri,'Segoe UI',Arial,sans-serif";

export async function renderExchangeEmailHtml(data: ExchangeEmailData): Promise<string> {
  // Dynamic imports to avoid Next.js RSC boundary conflicts (same as eoi-email.ts)
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { ExchangeEmailTemplate } = await import('@/components/ExchangeEmailTemplate');

  const bodyMarkup = renderToStaticMarkup(createElement(ExchangeEmailTemplate, { data }));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f0f0f0;font-family:${FONT};font-size:14px;color:#111111">
${bodyMarkup}
</body>
</html>`;
}

export function renderExchangeSubject(data: ExchangeEmailData): string {
  return `Contract Exchanged — ${data.propertyAddress || 'Property'} [subject line TBC]`;
}
