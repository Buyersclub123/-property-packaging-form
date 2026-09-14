// Server-side EOI email HTML renderer.
// Produces inline-styled HTML-table email compatible with all major email clients.
// Mirrors the visual layout of the legacy GHL EOI form and the demo EoiPreview component.

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
}

// Colours matching the EOI compose form exactly
const CHARCOAL = '#4D4D4D';
const CHARCOAL_DARK = '#2A2A2A';
const YELLOW = '#FBD721';
const ROW_GREY = '#E0E0E0';
const ROW_DARK = ROW_GREY;
const ROW_LIGHT = ROW_GREY;
const TEXT = '#111111';
const FONT = "Calibri,'Segoe UI',Arial,sans-serif";
const LOGO_URL = 'https://property-packaging-form.vercel.app/logo.jpg';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FONT_SIZE = '13px';

// Section header — matches .section-head: charcoal bg, yellow text, centered
function sectionHead(title: string): string {
  return `<tr>
    <td colspan="4" style="background:${CHARCOAL};color:${YELLOW};text-align:center;font-weight:600;letter-spacing:1px;padding:8px 10px;font-size:${FONT_SIZE};font-family:${FONT};">
      ${title}
    </td>
  </tr>`;
}

// Standard row — label on left (dark/light alternating), value spanning right
function fieldRow(label: string, content: string, dark = true): string {
  if (!content || content === '\u2014') return '';
  const bg = dark ? ROW_DARK : ROW_LIGHT;
  return `<tr>
    <td style="background:${bg};text-align:right;width:140px;font-weight:700;padding:6px 10px;vertical-align:top;border-bottom:1px solid #bbb;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${esc(label)}</td>
    <td colspan="3" style="background:#fff;padding:6px 10px;vertical-align:top;border-bottom:1px solid #ddd;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${content}</td>
  </tr>`;
}

export function renderEoiEmailHtml(data: EoiEmailData): string {
  const isHL = data.propertyType === 'house_and_land' || data.propertyType === 'hl_split';
  const isEstablished = data.propertyType === 'established';

  let rows = '';

  // ---- PROPERTY ----
  rows += sectionHead('PROPERTY');
  rows += fieldRow('Property Address', `<strong>${esc(data.propertyAddress || '\u2014')}</strong>`, true);

  const rawNotes = data.notes || 'Exchanged contract is to be sent to: CONTRACTS@BUYERSCLUB.COM.AU\n\nPlease do not send the contract directly to the purchaser';
  const notesHtml = esc(rawNotes)
    .replace(/CONTRACTS@BUYERSCLUB\.COM\.AU/g, '<a href="mailto:contracts@buyersclub.com.au" style="color:#188bf6">CONTRACTS@BUYERSCLUB.COM.AU</a>')
    .replace(/\n/g, '<br/>');
  rows += fieldRow('Notes', notesHtml, false);

  // Warning — below Notes
  rows += `<tr>
    <td colspan="4" style="padding:6px 10px;font-size:${FONT_SIZE};color:#b91c1c;font-weight:600;text-align:center;border-bottom:1px solid #ddd;font-family:${FONT};">
      Please do not send the contract directly to the purchaser
    </td>
  </tr>`;

  // ---- TERMS ----
  rows += sectionHead('TERMS');

  if (isHL && (data.landPrice || data.buildPrice)) {
    let priceContent = '';
    if (data.landPrice) priceContent += `Land: <strong>${esc(data.landPrice)}</strong><br/>`;
    if (data.buildPrice) priceContent += `Build: <strong>${esc(data.buildPrice)}</strong><br/>`;
    if (data.totalPrice) priceContent += `Total: <strong>${esc(data.totalPrice)}</strong>`;
    rows += fieldRow('Price', priceContent, true);
  } else {
    rows += fieldRow('Price', `<strong>${esc(data.offerPrice || '\u2014')}</strong>`, true);
  }

  // Deposit — sub-table with grey sub-labels matching the form exactly
  if (isHL) {
    // H&L: Land Amount + Build Amount sub-rows
    rows += `<tr>
      <td rowspan="2" style="background:${ROW_DARK};text-align:right;width:140px;font-weight:700;padding:6px 10px;vertical-align:middle;border-bottom:1px solid #bbb;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Deposit</td>
      <td colspan="3" style="padding:0;border-bottom:1px solid #ddd;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="background:${ROW_DARK};text-align:right;width:100px;font-weight:700;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Land Amount:</td>
          <td style="background:#fff;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${esc(data.landDeposit || '\u2014')}</td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:0;border-bottom:1px solid #ddd;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="background:${ROW_LIGHT};text-align:right;width:100px;font-weight:700;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Build Amount:</td>
          <td style="background:#fff;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${esc(data.buildDeposit || '\u2014')}</td>
        </tr></table>
      </td>
    </tr>`;
  } else {
    // Established / New: Amount + Payable sub-rows with grey sub-labels
    rows += `<tr>
      <td rowspan="2" style="background:${ROW_DARK};text-align:right;width:140px;font-weight:700;padding:6px 10px;vertical-align:middle;border-bottom:1px solid #bbb;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Deposit</td>
      <td colspan="3" style="padding:0;border-bottom:1px solid #ddd;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="background:${ROW_DARK};text-align:right;width:100px;font-weight:700;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Amount:</td>
          <td style="background:#fff;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${esc(data.depositAmount || '\u2014')}</td>
        </tr></table>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:0;border-bottom:1px solid #ddd;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="background:${ROW_LIGHT};text-align:right;width:100px;font-weight:700;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">Payable:</td>
          <td style="background:#fff;padding:6px 10px;font-size:${FONT_SIZE};font-family:${FONT};color:${TEXT};">${esc(data.depositPayable || '\u2014')}</td>
        </tr></table>
      </td>
    </tr>`;
  }

  rows += fieldRow('Finance', esc(data.finance || '\u2014'), true);

  if (isEstablished) {
    rows += fieldRow('Building & Pest', esc(data.buildingPest || '\u2014'), false);
  } else {
    rows += fieldRow('PCI', esc(data.pci || '\u2014'), false);
  }

  if (isHL) {
    rows += fieldRow('Commission', esc(data.commission || '\u2014'), true);
  }

  // Special conditions — strip leading hyphens/dashes, use bullet character only
  const conditionsHtml = data.specialConditions
    .filter(Boolean)
    .map((c) => c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, ''))
    .filter(Boolean)
    .map((c) => `\u2022 ${esc(c)}`)
    .join('<br/>');
  if (conditionsHtml) {
    rows += fieldRow('Special Conditions', `<span style="line-height:1.6">${conditionsHtml}</span>`, false);
  }

  rows += fieldRow('Settlement', esc(data.settlement || '\u2014'), true);

  // ---- PURCHASER/S ----
  rows += sectionHead('PURCHASER/S');

  if (data.contractEntity) {
    rows += fieldRow('Contract Entity', esc(data.contractEntity), true);
  }

  // Purchaser table — pairs of 2 per row, matching the form layout exactly
  const validPurchasers = data.purchasers.filter((p) => p.name?.trim());
  if (validPurchasers.length > 0) {
    const pairCount = Math.ceil(validPurchasers.length / 2);

    for (let rowIdx = 0; rowIdx < pairCount; rowIdx++) {
      const pair = validPurchasers.slice(rowIdx * 2, rowIdx * 2 + 2);

      // Column headers for this pair
      rows += '<tr>';
      rows += `<td style="background:${CHARCOAL};width:140px;padding:4px 10px;border-bottom:1px solid #fff;font-family:${FONT};">&nbsp;</td>`;
      rows += `<td colspan="3" style="padding:0;border-bottom:1px solid #fff;">`;
      rows += `<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>`;
      for (let i = 0; i < pair.length; i++) {
        const pi = rowIdx * 2 + i;
        const w = pair.length === 1 ? '100%' : '50%';
        rows += `<td style="background:${CHARCOAL};color:${YELLOW};text-align:center;font-weight:600;font-size:${FONT_SIZE};padding:4px 10px;font-family:${FONT};width:${w};${i > 0 ? 'border-left:1px solid #666;' : ''}">Purchaser ${pi + 1}</td>`;
      }
      rows += `</tr></table></td></tr>`;

      // Data rows for this pair (Name, Email, Phone, Address)
      const pFields: { label: string; field: keyof EoiPurchaser; dark: boolean }[] = [
        { label: 'Name', field: 'name', dark: true },
        { label: 'Email', field: 'email', dark: false },
        { label: 'Phone', field: 'phone', dark: true },
        { label: 'Address', field: 'address', dark: false },
      ];

      for (const { label, field, dark } of pFields) {
        const bg = dark ? ROW_DARK : ROW_LIGHT;
        const fw = field === 'name' ? 'font-weight:600;' : '';
        rows += '<tr>';
        rows += `<td style="background:${bg};text-align:right;width:140px;font-weight:700;padding:5px 10px;border-bottom:1px solid #bbb;font-size:${FONT_SIZE};font-family:${FONT};">${label}</td>`;
        rows += `<td colspan="3" style="padding:0;border-bottom:1px solid #ddd;">`;
        rows += `<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>`;
        for (let i = 0; i < pair.length; i++) {
          const val = pair[i][field] || '\u2014';
          const w = pair.length === 1 ? '100%' : '50%';
          rows += `<td style="background:#fff;padding:5px 10px;font-size:${FONT_SIZE};font-family:${FONT};${fw}width:${w};${i > 0 ? 'border-left:1px solid #ddd;' : ''}">${esc(val)}</td>`;
        }
        rows += `</tr></table></td></tr>`;
      }
    }
  }

  // ---- LEGALS ----
  rows += sectionHead('LEGALS');
  if (data.solicitorName || data.solicitorCompany) {
    rows += fieldRow('Company', esc(data.solicitorCompany || '\u2014'), true);
    rows += fieldRow('Contact', esc(data.solicitorName || '\u2014'), false);
    rows += fieldRow('Phone', esc(data.solicitorPhone || '\u2014'), true);
    rows += fieldRow('Email', esc(data.solicitorEmail || '\u2014'), false);
  } else {
    rows += fieldRow('Solicitor', 'TBC', true);
  }

  // ---- FINANCE ----
  rows += sectionHead('FINANCE');
  if (data.brokerName || data.brokerCompany) {
    rows += fieldRow('Company', esc(data.brokerCompany || '\u2014'), true);
    rows += fieldRow('Contact', esc(data.brokerName || '\u2014'), false);
    rows += fieldRow('Phone', esc(data.brokerPhone || '\u2014'), true);
    rows += fieldRow('Email', esc(data.brokerEmail || '\u2014'), false);
  } else {
    rows += fieldRow('Broker', 'TBC', true);
  }

  if (data.lvr) {
    const lvrDisplay = data.lvr.includes('%') ? data.lvr : `${data.lvr}%`;
    rows += fieldRow('LVR', esc(lvrDisplay), true);
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:20px;background:#f0f0f0;font-family:${FONT};font-size:14px;color:${TEXT}">
<div style="max-width:720px;margin:0 auto;background:#fff;overflow:hidden;border:1px solid #ccc;">

  <!-- Header — logo left, title + badges right -->
  <table style="width:100%;border-collapse:collapse;border-bottom:3px solid ${YELLOW};">
    <tr>
      <td style="padding:14px 16px;vertical-align:middle;width:120px;">
        <img src="${LOGO_URL}" alt="Buyers Club" style="height:50px;width:auto;" />
      </td>
      <td style="padding:14px 16px;vertical-align:middle;">
        <span style="font-size:24px;font-weight:700;color:${CHARCOAL_DARK};letter-spacing:-0.5px;font-family:${FONT};">Expression of Interest</span>
      </td>
      <td style="padding:14px 16px;text-align:right;vertical-align:middle;white-space:nowrap;">
        <span style="background:${CHARCOAL_DARK};color:${YELLOW};padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:2px;border-radius:2px;font-family:${FONT};">${esc(data.state.toUpperCase())}</span>
        &nbsp;
        <span style="background:${YELLOW};color:${CHARCOAL_DARK};padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:2px;border-radius:2px;font-family:${FONT};">${esc(data.propertyTypeLabel)}</span>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <table style="width:100%;border-collapse:collapse;">
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Footer -->
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="font-size:10px;color:#666;padding:10px 12px;background:#f5f5f5;font-family:${FONT};border-top:1px solid #ddd;">
        Submitted by ${esc(data.consultantName || 'Buyers Club')} &middot; Buyers Club &middot; property@buyersclub.com.au
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

export function renderEoiSubject(data: EoiEmailData, sendType: string): string {
  const prefix = sendType === 'increase' ? 'UPDATED EOI' : sendType === 'revision' ? 'REVISED EOI' : 'Expression of Interest';
  return `${prefix} — ${data.propertyAddress || 'Property'}`;
}
