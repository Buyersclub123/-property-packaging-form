// Server-side EOI email HTML renderer.
// Uses the shared EoiEmailTemplate component via renderToStaticMarkup
// to produce inline-styled HTML-table email compatible with all major email clients.
// Dynamic imports used to avoid Next.js RSC boundary conflicts.

export interface EoiPurchaser {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface EoiEmailData {
  propertyAddress: string;
  offerPrice: string;
  state: string;
  propertyType: string;         // established | new_single | hl_split
  propertyTypeLabel: string;    // ESTABLISHED | NEW (SINGLE CONTRACT) | H&L (SPLIT CONTRACT)
  purchasers: EoiPurchaser[];
  contractEntity: string;

  // Deposit fields — type-dependent
  depositAmount: string;        // established + new_single
  depositPayable: string;       // established + new_single
  landDeposit: string;          // house_and_land only
  buildDeposit: string;         // house_and_land only

  finance: string;
  buildingPest: string;         // established only
  pci: string;                  // new_single + house_and_land
  commission: string;           // house_and_land (split contract) only
  settlement: string;
  specialConditions: string[];

  // H&L price split
  landPrice: string;
  buildPrice: string;
  totalPrice: string;

  // Contacts
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agencyName: string;
  solicitorName: string;
  solicitorEmail: string;
  solicitorPhone: string;
  solicitorCompany: string;
  brokerName: string;
  brokerEmail: string;
  brokerPhone: string;
  brokerCompany: string;
  consultantName: string;
  consultantEmail: string;
  notes: string;
  lvr: string;
  speculativeMessage?: string;
}

const FONT = "Calibri,'Segoe UI',Arial,sans-serif";
const TEXT = '#111111';

export async function renderEoiEmailHtml(data: EoiEmailData): Promise<string> {
  // Dynamic imports to avoid Next.js RSC boundary conflicts —
  // react-dom/server cannot be statically imported in modules that share
  // components with 'use client' pages.
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { EoiEmailTemplate } = await import('@/components/EoiEmailTemplate');

  // Render the shared template component (editable=false → plain text, no inputs)
  const bodyMarkup = renderToStaticMarkup(
    createElement(EoiEmailTemplate, { data, editable: false })
  );

  // Wrap in a full HTML document envelope for email clients
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f0f0f0;font-family:${FONT};font-size:14px;color:${TEXT}">
${bodyMarkup}
</body>
</html>`;
}

export function renderEoiSubject(data: EoiEmailData, sendType: string): string {
  const prefix = sendType === 'increase' ? 'UPDATED EOI' : sendType === 'revision' ? 'REVISED EOI' : 'Expression of Interest';
  return `${prefix} — ${data.propertyAddress || 'Property'}`;
}
