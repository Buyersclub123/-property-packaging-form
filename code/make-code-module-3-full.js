// Check if this is a portal request
const portalData = input.Data || input;
const isPortalRequest = portalData.source === "portal";
console.log("Module 3 - portalData:", JSON.stringify(portalData, null, 2));
console.log("Module 3 - isPortalRequest:", isPortalRequest);
console.log("Module 3 - portalData.source:", portalData.source);

if (isPortalRequest) {
  // PORTAL REQUEST - Handle client emails with BA message at top
  const selectedClients = portalData.selectedClients || [];
  const baEmail = portalData.baEmail || '';
  const baName = portalData.baName || '';
  const propertyAddress = portalData.propertyAddress || '';
  const recordId = portalData.id || portalData.recordId || '';
  const propertyId = portalData.propertyId || '';
  
  // Format BA message preserving line breaks
  function formatBAMessage(message) {
    if (!message) return '';
    return message
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #4c4c4c;">${escapeHtml(line)}</p>`)
      .join('');
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Process each selected client and build email objects
  const clientEmails = selectedClients.map((client) => {
    // Filter out empty emails, trim whitespace, and join with comma (no spaces)
   // Filter and trim emails (NO deduplication for testing)
   const validEmails = (client.emails || [])
     .filter(email => email && email.trim())
     .map(email => email.trim());
    
    if (validEmails.length === 0) {
      return { skip: true, error: "No email addresses for client" };
    }
    
    const toEmail = validEmails.join(','); // Comma-separated, no spaces
    
    const clientMessage = client.message || '';
    const formattedMessage = formatBAMessage(clientMessage);
    
    // Build HTML email body (property details will be added later by other modules)
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Opportunity: ${escapeHtml(propertyAddress)}</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
    color: #4c4c4c;
    background-color: #ffffff;
  }
  .outer-table {
    width: 100%;
    border-collapse: collapse;
  }
  .container-table {
    width: 1040px;
    margin: 0 auto 32px 20px;
    border-collapse: collapse;
  }
  .logo-row td {
    padding: 0;
  }
  .logo-cell {
    width: 180px;
    padding-left: 24px;
  }
  .main-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 24px 20px 24px;
  }
  .col-label {
    width: 180px;
    font-size: 16px;
    font-weight: 600;
    vertical-align: top;
    padding: 8px 16px 8px 0;
    color: #4c4c4c;
  }
  .col-content {
    vertical-align: top;
    padding: 8px 0 8px 0;
  }
  .content-box {
    background-color: #fafafa;
    border-radius: 4px;
    padding: 14px 16px;
    border-left: 7px solid #fbd721;
  }
  .content-box p {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .content-box p:last-child {
    margin-bottom: 0;
  }
  .content-box ul {
    margin: 0 0 0 18px;
    padding: 0;
  }
  .content-box li {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .highlight-region strong {
    text-decoration: underline;
  }
  .highlight-heading {
    margin: 0 0 4px 0;
  }
</style>
</head>
<body>
  <table class="outer-table" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="left">
        <table class="container-table" role="presentation" cellpadding="0" cellspacing="0">
          <!-- BA's Message at the very top -->
          <tr>
            <td style="padding: 20px 24px 24px 24px;">
              ${formattedMessage}
            </td>
          </tr>
          <!-- Logo directly below message -->
          <tr class="logo-row">
            <td class="logo-cell">
              <img src="https://storage.googleapis.com/msgsndr/UJWYn4mrgGodB7KZUcHt/media/6938361650387f705884d8de.jpg"
                   alt="BuyersClub"
                   style="display:block;height:40px;width:180px;object-fit:contain;margin:0;">
            </td>
          </tr>
          <!-- Property Details - NOTE: Need to fetch from GHL using recordId -->
          <tr>
            <td style="padding: 0;">
              <table class="main-table" role="presentation" cellpadding="0" cellspacing="0">
                <!-- Property sections will be inserted here from GHL data -->
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    const textBody = `${clientMessage}\n\n---\n\n[Property details text version]`;
    
    return {
      to: toEmail,
      subject: `Property Opportunity: ${propertyAddress}`,
      htmlBody: htmlBody,
      textBody: textBody,
      baEmail: baEmail,
      baName: baName,
      clientInfo: {
        opportunityId: client.id || '',
        opportunityName: client.name || '',
        clientName: client.clientName || '',
        partnerName: client.partnerName || ''
      }
    };
  }).filter(item => !item.skip); // Remove skipped items
  
  return clientEmails;
}

// NORMAL GHL WEBHOOK REQUEST - Continue with existing code
// Step 2: Preprocess webhook data (like Zapier Step 2)
let webhookData = input.Webhook_Data || (Array.isArray(input) ? input[0] : input);
// If data is nested under "Data" key, extract it
const inputData = webhookData.Data || webhookData.data || webhookData;

console.log("Module 3 inputData keys:", Object.keys(inputData).slice(0, 10));
console.log("Module 3 has Data key:", 'Data' in inputData || 'data' in inputData);

// Get ID from various possible locations
const idValue = inputData.ID || inputData.id || inputData['ID'] || '';

// Build formatted data string (key: value format)
const formattedData = [];

// Add ID first if we have it
if (idValue && !formattedData.some(line => line.startsWith('ID:'))) {
  formattedData.push(`ID: ${idValue}`);
}

// Convert object to key: value string format
Object.keys(inputData).forEach(key => {
  if (key !== 'ID' && key !== 'id' && key !== 'Data' && key.toLowerCase() !== 'data') {
    const value = inputData[key];
    if (value !== undefined && value !== null) {
      // Convert objects/arrays to JSON string, otherwise use as-is
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      formattedData.push(`${key}: ${stringValue}`);
    }
  }
});

// Get data from preprocessing (now done in this module)
const raw = formattedData.join('\n');

console.log("Module 3 raw data length:", raw.length);
console.log("Module 3 raw data first 500 chars:", raw.substring(0, 500));

// STEP 4 – Build final email: subject + HTML + text
// Parse "key: value" lines into an object (like Zapier)
const parsed = {};
raw.split("\n").forEach((line) => {
  if (!line) return;

  // Strip leading "data: " if present on first line
  if (line.startsWith("data: ")) {
    line = line.slice(6);
  }

  const idx = line.indexOf(":");
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  let value = line.slice(idx + 1).trim();
  if (value === "null" || value === "undefined") value = "";
  parsed[key] = value;
});

// 2) Safe getter function
function v(key, fallback = "") {
  const val = parsed[key];
  if (val === undefined || val === null || String(val).trim() === "") {
    return fallback;
  }
  return String(val).trim();
}

// Tiny helpers
function hasAny(...keys) {
  return keys.some((k) => v(k));
}

function htmlLine(label, value) {
  if (!value) return "";
  return `<p><strong>${label}:</strong> ${value}</p>`;
}

function textLine(label, value) {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

// 3) Read core fields
const whyThisProperty = v("why_this_property");
const propertyAddress = v("property_address");
const googleMap = v("google_map");

// Define propertyId for button URLs
const propertyId = propertyAddress || v("property_address") || "";

// Get the record ID from GHL webhook data (check both ID and id)
const recordId = v("id") || v("ID") || idValue || "";

const bedsPrimary = v("beds_primary");
const bedsSecondary = v("beds_secondary");
const bathPrimary = v("bath_primary");
const bathSecondary = v("bath_secondary");
const garagePrimary = v("garage_primary");
const garageSecondary = v("garage_secondary");
const carportPrimary = v("carport_primary");
const carportSecondary = v("carport_secondary");
const carspacePrimary = v("carspace_primary");
const carspaceSecondary = v("carspace_secondary");

const yearBuilt = v("year_built");
const landSize = v("land_size");
const title = v("title");
const bodyCorpQuarter = v("body_corp_per_quarter");

// Overlays
const zoning = v("zoning");
const flood = v("flood");
const floodDialogue = v("flood_dialogue");
const bushfire = v("bushfire");
const bushfireDialogue = v("bushfire_dialogue");
const mining = v("mining");
const miningDialogue = v("mining_dialogue");
const otherOverlay = v("other_overlay");
const otherOverlayDialogue = v("other_overlay_dialogue");
const specialInfra = v("special_infrastructure");
const specialInfraDialogue = v("special_infrastructure_dialogue");
const dueDiligenceAcceptance = v("due_diligence_acceptance");

// Purchase price
const asking = v("asking");
const askingText = v("asking_text");
const comparableSales = v("comparable_sales");
const acceptableFrom = v("acceptable_acquisition_from");
const acceptableTo = v("acceptable_acquisition_to");
const purchasePriceDialogue = v("purchase_price_additional_dialogue");

// Rental assessment
const occupancy = v("occupancy");
const currentRentPrimary = v("current_rent_primary_per_week");
const currentRentSecondary = v("current_rent_secondary_per_week");
const expiryPrimary = v("expiry_primary");
const expirySecondary = v("expiry_secondary");
const yieldPct = v("yield");
const rentAppraisalPrimary = v("rent_appraisal_primary");
const rentAppraisalSecondary = v("rent_appraisal_secondary");
const appraisedYield = v("appraised_yield");
const rentalAssessmentDialogue = v("rental_assessment_additional_dialogue");
const dualFlag = v("does_this_property_have_2_dwellings");

// Proximity
const proximity = v("proximity");

// Market performance
const mp3m = v("median_price_change_3_months");
const mp1y = v("median_price_change_1_year");
const mp3y = v("median_price_change_3_year");
const mp5y = v("median_price_change_5_year");
const medianYield = v("median_yield");
const rentChange1y = v("median_rent_change_1_year");
const rentalPopulation = v("rental_population");
const vacancyRate = v("vacancy_rate");
const mpDialogue = v("market_performance_additional_dialogue");

// Investment highlights
const investmentHighlights = v("investment_highlights");

// Attachments dialogue
const attachmentsDialogue = v("attachments_additional_dialogue");

// Message for BA (packager to BA communication)
const messageForBA = v("message_for_ba") || v("message_for_ba_field") || "";

// Simple dual-income detection
const isDual =
  (dualFlag && dualFlag.toLowerCase().includes("yes")) ||
  !!bedsSecondary ||
  !!currentRentSecondary;

// Utility: numeric safe parse
function toNumber(vStr) {
  const n = parseFloat((vStr || "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Normalise simple values from GHL for display
function neatValue(str) {
  if (!str) return "";
  const s = String(str).trim();
  const lower = s.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "onmarket" || lower === "on market") return "On-market";
  return s;
}

// 4) Subject line
const packagerApproved = v("packager_approved", "").toLowerCase();
const baApproved = v("ba_approved", "").toLowerCase();

let subjectPrefix = "";
if (baApproved === "approved") {
  subjectPrefix = "";
} else if (packagerApproved === "approved") {
  subjectPrefix = "BA AUTO SEND – ";
} else {
  subjectPrefix = "PACKAGER TO CONFIRM – ";
}

const subjectAddress = propertyAddress ? propertyAddress.toUpperCase() : "";
const reviewRule = subjectAddress ? `Property Review: ${subjectAddress}` : "Property Review";
const subject = `${subjectPrefix}${reviewRule}`;

// Webhook URLs
const APPROVAL_WEBHOOK = "https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk";
const PORTAL_URL = "https://buyersclub123.github.io/property-portal";

// 5) Special formatting helpers
function normaliseNewlines(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/&#10;|&#13;/g, "\n");
}

function formatWhyHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const items = lines
    .map((line) => {
      const idx = line.indexOf(" - ");
      if (idx > 0) {
        const head = line.slice(0, idx).trim();
        const rest = line.slice(idx + 3).trim();
        const tail = rest ? ` – ${rest}` : "";
        return `<li><strong>${head}</strong>${tail}</li>`;
      }
      return `<li>${line}</li>`;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function formatProximityHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  const items = lines.map((line) => `<li>${line}</li>`).join("");
  return `<ul>${items}</ul>`;
}

function formatInvestmentHighlightsHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const knownHeadings = new Set(
    [
      "population growth context",
      "residential",
      "industrial",
      "commercial and civic",
      "commercial and civil",
      "health and education",
      "health and community",
      "transport",
      "infrastructure",
      "education",
      "job implications",
    ].map((s) => s.toLowerCase())
  );

  let html = "";
  let inList = false;
  let lineIndex = 0;
  let lastType = null;
  let lastHeadingType = null;

  function openList() {
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
  }

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine;
    const lower = line.toLowerCase();
    const explicitBullet = /^[-•]/.test(line);
    const bulletText = explicitBullet ? line.replace(/^[-•]\s*/, "").trim() : line;

    if (lineIndex === 0) {
      closeList();
      html += `<p class="highlight-region"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "region";
      lineIndex++;
      continue;
    }

    if (lineIndex === 1) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "sub";
      lineIndex++;
      continue;
    }

    if (explicitBullet) {
      openList();
      html += `<li>${bulletText}</li>`;
      lastType = "bullet";
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    if (knownHeadings.has(lower)) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "section";
      lineIndex++;
      continue;
    }

    if (lastType === "heading") {
      if (lastHeadingType === "section") {
        openList();
        html += `<li>${bulletText}</li>`;
        lastType = "bullet";
      } else {
        closeList();
        html += `<p>${bulletText}</p>`;
        lastType = "body";
      }
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    // Default: treat as list item
    openList();
    html += `<li>${bulletText}</li>`;
    lastType = "bullet";
    lineIndex++;
  }

  // IMPORTANT: Close any open list at the end
  closeList();
  return html;
}

function sectionRow(label, innerHtml) {
  if (!innerHtml) return "";
  return `
    <tr>
      <td class="col-label">
        ${label}
      </td>
      <td class="col-content">
        <div class="content-box">
          ${innerHtml}
        </div>
      </td>
    </tr>
  `;
}

// 6) Build section content
let whyHtml = "";
if (whyThisProperty) {
  const formattedWhy = formatWhyHtml(whyThisProperty);
  if (formattedWhy) whyHtml = formattedWhy;
}

let addressHtml = "";
if (propertyAddress) {
  addressHtml += `<p>${propertyAddress.toUpperCase()}</p>`;
}
if (googleMap) {
  const mapLink = googleMap;
  addressHtml += `<p><strong>Google Map:</strong> <a href="${mapLink}" target="_blank">${mapLink}</a></p>`;
}

let propertyDescHtml = "";
let propertyDescText = "";

if (
  hasAny(
    "beds_primary",
    "beds_secondary",
    "bath_primary",
    "bath_secondary",
    "garage_primary",
    "garage_secondary",
    "carport_primary",
    "carport_secondary",
    "carspace_primary",
    "carspace_secondary",
    "year_built",
    "land_size",
    "title",
    "body_corp_per_quarter",
    "property_description_additional_dialogue"
  )
) {
  let bedsDisplay = "";
  if (isDual && bedsPrimary && bedsSecondary) {
    bedsDisplay = `${bedsPrimary} + ${bedsSecondary}`;
  } else if (bedsPrimary) {
    bedsDisplay = bedsPrimary;
  }

  let bathsDisplay = "";
  if (isDual && bathPrimary && bathSecondary) {
    bathsDisplay = `${bathPrimary} + ${bathSecondary}`;
  } else if (bathPrimary) {
    bathsDisplay = bathPrimary;
  }

  const garageDisplay = [garagePrimary, garageSecondary].filter(Boolean).join(" + ");
  const carportDisplay = [carportPrimary, carportSecondary].filter(Boolean).join(" + ");
  const carspaceDisplay = [carspacePrimary, carspaceSecondary].filter(Boolean).join(" + ");

  propertyDescHtml += htmlLine("Beds", bedsDisplay);
  propertyDescHtml += htmlLine("Baths", bathsDisplay);
  propertyDescHtml += htmlLine("Garage", garageDisplay);
  propertyDescHtml += htmlLine("Car-port", carportDisplay);
  propertyDescHtml += htmlLine("Car-space", carspaceDisplay);
  propertyDescHtml += htmlLine("Year Built", yearBuilt);
  propertyDescHtml += htmlLine("Land Size", landSize);
  propertyDescHtml += htmlLine("Title", title);
  propertyDescHtml += htmlLine("Body Corp (per quarter)", bodyCorpQuarter);

  const propDescDialogue = v("property_description_additional_dialogue");
  if (propDescDialogue) {
    propertyDescHtml += `<p>${propDescDialogue}</p>`;
  }

  propertyDescText += "Property Description\n";
  if (bedsDisplay) propertyDescText += textLine("Beds", bedsDisplay);
  if (bathsDisplay) propertyDescText += textLine("Baths", bathsDisplay);
  if (garageDisplay) propertyDescText += textLine("Garage", garageDisplay);
  if (carportDisplay) propertyDescText += textLine("Car-port", carportDisplay);
  if (carspaceDisplay) propertyDescText += textLine("Car-space", carspaceDisplay);
  if (yearBuilt) propertyDescText += textLine("Year Built", yearBuilt);
  if (landSize) propertyDescText += textLine("Land Size", landSize);
  if (title) propertyDescText += textLine("Title", title);
  if (bodyCorpQuarter)
    propertyDescText += textLine("Body Corp (per quarter)", bodyCorpQuarter);
  if (propDescDialogue) propertyDescText += `${propDescDialogue}\n`;
  propertyDescText += "\n";
}

let overlaysHtml = "";
let overlaysText = "";

if (
  hasAny(
    "zoning",
    "flood",
    "bushfire",
    "mining",
    "other_overlay",
    "special_infrastructure",
    "flood_dialogue",
    "bushfire_dialogue",
    "mining_dialogue",
    "other_overlay_dialogue",
    "special_infrastructure_dialogue",
    "due_diligence_acceptance"
  )
) {
  overlaysHtml += htmlLine("Zoning", zoning);
  overlaysText += "Property Overlays\n";
  overlaysText += textLine("Zoning", zoning);

  function overlayBlock(label, status, dialogue) {
    let h = "";
    let t = "";
    if (status) {
      const nice = neatValue(status);
      h += htmlLine(label, nice);
      t += textLine(label, nice);
    }
    if (dialogue) {
      h += `<p>- ${dialogue}</p>`;
      t += `- ${dialogue}\n`;
    }
    return { h, t };
  }

  const f = overlayBlock("Flood", flood, floodDialogue);
  const b = overlayBlock("Bushfire", bushfire, bushfireDialogue);
  const m = overlayBlock("Mining", mining, miningDialogue);
  const o = overlayBlock("Other Overlay", otherOverlay, otherOverlayDialogue);
  const s = overlayBlock("Special Infrastructure", specialInfra, specialInfraDialogue);

  overlaysHtml += f.h + b.h + m.h + o.h + s.h;
  overlaysText += f.t + b.t + m.t + o.t + s.t;

  if (dueDiligenceAcceptance) {
    const niceDD = neatValue(dueDiligenceAcceptance);
    overlaysHtml += htmlLine("Due Diligence Acceptance", niceDD);
    overlaysText += textLine("Due Diligence Acceptance", niceDD);
  }

  overlaysText += "\n";
}

let purchaseHtml = "";
let purchaseText = "";

if (
  hasAny(
    "asking",
    "asking_text",
    "comparable_sales",
    "acceptable_acquisition_from",
    "acceptable_acquisition_to",
    "purchase_price_additional_dialogue"
  )
) {
  const niceAsking = neatValue(asking);

  purchaseHtml += htmlLine("Asking", niceAsking);
  purchaseHtml += htmlLine("Asking (Text)", askingText);
  purchaseHtml += htmlLine("Acceptable From", acceptableFrom);
  purchaseHtml += htmlLine("Acceptable To", acceptableTo);
  if (comparableSales) {
    const csNorm = normaliseNewlines(comparableSales);
    purchaseHtml += `<p><strong>Comparable Sales:</strong><br>${csNorm
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("<br>")}</p>`;
  }
  if (purchasePriceDialogue) {
    purchaseHtml += `<p>${purchasePriceDialogue}</p>`;
  }

  purchaseText += "Purchase Price\n";
  purchaseText += textLine("Asking", niceAsking);
  purchaseText += textLine("Asking (Text)", askingText);
  purchaseText += textLine("Acceptable From", acceptableFrom);
  purchaseText += textLine("Acceptable To", acceptableTo);
  if (comparableSales) {
    purchaseText += `Comparable Sales:\n${comparableSales}\n`;
  }
  if (purchasePriceDialogue) {
    purchaseText += `${purchasePriceDialogue}\n`;
  }
  purchaseText += "\n";
}

let rentalHtml = "";
let rentalText = "";

if (
  hasAny(
    "occupancy",
    "current_rent_primary_per_week",
    "current_rent_secondary_per_week",
    "expiry_primary",
    "expiry_secondary",
    "yield",
    "rent_appraisal_primary",
    "rent_appraisal_secondary",
    "appraised_yield",
    "rental_assessment_additional_dialogue"
  )
) {
  rentalText += "Rental Assessment\n";

  const occLower = occupancy.toLowerCase();
  const isVacant = occLower.includes("vacant");

  if (!isDual) {
    rentalHtml += htmlLine("Occupancy", occupancy);
    rentalHtml += htmlLine("Current Rent (per week)", currentRentPrimary);
    rentalHtml += htmlLine("Lease Expiry", expiryPrimary);
    rentalHtml += htmlLine("Yield", yieldPct);
    rentalHtml += htmlLine("Rent Appraisal", rentAppraisalPrimary);
    rentalHtml += htmlLine("Appraised Yield", appraisedYield);

    rentalText += textLine("Occupancy", occupancy);
    rentalText += textLine("Current Rent (per week)", currentRentPrimary);
    rentalText += textLine("Lease Expiry", expiryPrimary);
    rentalText += textLine("Yield", yieldPct);
    rentalText += textLine("Rent Appraisal", rentAppraisalPrimary);
    rentalText += textLine("Appraised Yield", appraisedYield);
  } else {
    const pRentNum = toNumber(currentRentPrimary) || 0;
    const sRentNum = toNumber(currentRentSecondary) || 0;
    const totalRent = isVacant ? "N/A" : pRentNum + sRentNum || "";

    rentalHtml += htmlLine("Occupancy", occupancy);
    rentalHtml += htmlLine("Total Rent (per week)", totalRent);
    rentalHtml += htmlLine("Unit A – Rent (per week)", currentRentPrimary);
    rentalHtml += htmlLine("Unit B – Rent (per week)", currentRentSecondary);
    rentalHtml += htmlLine("Unit A – Expiry", expiryPrimary);
    rentalHtml += htmlLine("Unit B – Expiry", expirySecondary);
    rentalHtml += htmlLine("Rent Appraisal – Unit A", rentAppraisalPrimary);
    rentalHtml += htmlLine("Rent Appraisal – Unit B", rentAppraisalSecondary);
    rentalHtml += htmlLine("Appraised Yield", appraisedYield);

    rentalText += textLine("Occupancy", occupancy);
    rentalText += textLine("Total Rent (per week)", totalRent);
    rentalText += textLine("Unit A – Rent (per week)", currentRentPrimary);
    rentalText += textLine("Unit B – Rent (per week)", currentRentSecondary);
    rentalText += textLine("Unit A – Expiry", expiryPrimary);
    rentalText += textLine("Unit B – Expiry", expirySecondary);
    rentalText += textLine("Rent Appraisal – Unit A", rentAppraisalPrimary);
    rentalText += textLine("Rent Appraisal – Unit B", rentAppraisalSecondary);
    rentalText += textLine("Appraised Yield", appraisedYield);
  }

  if (rentalAssessmentDialogue) {
    rentalHtml += `<p>${rentalAssessmentDialogue}</p>`;
    rentalText += `${rentalAssessmentDialogue}\n`;
  }

  rentalText += "\n";
}

let proximityHtml = "";
let proximityText = "";

if (proximity) {
  proximityHtml = formatProximityHtml(proximity);
  proximityText += "Proximity\n";
  proximityText += `${proximity}\n\n`;
}

let marketHtml = "";
let marketText = "";

if (
  hasAny(
    "median_price_change_3_months",
    "median_price_change_1_year",
    "median_price_change_3_year",
    "median_price_change_5_year",
    "median_yield",
    "median_rent_change_1_year",
    "rental_population",
    "vacancy_rate",
    "market_performance_additional_dialogue"
  )
) {
  marketHtml += htmlLine("Median Price Change – 3 months", mp3m);
  marketHtml += htmlLine("Median Price Change – 1 year", mp1y);
  marketHtml += htmlLine("Median Price Change – 3 years", mp3y);
  marketHtml += htmlLine("Median Price Change – 5 years", mp5y);
  marketHtml += htmlLine("Median Yield", medianYield);
  marketHtml += htmlLine("Median Rent Change – 1 year", rentChange1y);
  marketHtml += htmlLine("Rental Population", rentalPopulation);
  marketHtml += htmlLine("Vacancy Rate", vacancyRate);

  if (mpDialogue) {
    marketHtml += `<p>${mpDialogue}</p>`;
  }

  marketText += "Market Performance\n";
  marketText += textLine("Median Price Change – 3 months", mp3m);
  marketText += textLine("Median Price Change – 1 year", mp1y);
  marketText += textLine("Median Price Change – 3 years", mp3y);
  marketText += textLine("Median Price Change – 5 years", mp5y);
  marketText += textLine("Median Yield", medianYield);
  marketText += textLine("Median Rent Change – 1 year", rentChange1y);
  marketText += textLine("Rental Population", rentalPopulation);
  marketText += textLine("Vacancy Rate", vacancyRate);
  if (mpDialogue) {
    marketText += `${mpDialogue}\n`;
  }
  marketText += "\n";
}

let highlightsHtml = "";
let highlightsText = "";

if (investmentHighlights) {
  highlightsHtml = formatInvestmentHighlightsHtml(investmentHighlights);
  highlightsText += "Investment Highlights\n";
  highlightsText += `${investmentHighlights}\n\n`;
}

let attachmentsInnerHtml = `<ul>
  <li>Photos</li>
  <li>Cash Flow Sheet</li>
  <li>RP Data Report</li>
  <li>Location Report</li>
</ul>`;
if (attachmentsDialogue) {
  attachmentsInnerHtml += `<p>${attachmentsDialogue}</p>`;
}

let attachmentsText = "Attachments\n";
attachmentsText += "- Photos\n- Cash Flow Sheet\n- RP Data Report\n- Location Report\n";
if (attachmentsDialogue) {
  attachmentsText += `${attachmentsDialogue}\n`;
}

// 7) Assemble final HTML + text bodies
const isPackagerEmail = packagerApproved !== "approved";
const isBAEmail = packagerApproved === "approved" && baApproved !== "approved";

// Build message placeholders/previews
let messagePreviewHtml = "";
if (isPackagerEmail) {
  // Packager email - show placeholder for BA message
  messagePreviewHtml = `
    <tr>
      <td style="padding: 20px 24px 24px 24px;">
        <p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #999; font-style: italic;">[BA's message will appear here]</p>
      </td>
    </tr>
  `;
} else if (isBAEmail) {
  // BA email - show packager's message for BA (if exists) and placeholder/generic message
  let baMessageSection = "";
  
  // Packager's message for BA (if exists)
  if (messageForBA) {
    const formattedMessageForBA = normaliseNewlines(messageForBA)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #666; font-style: italic;">${line}</p>`)
      .join('');
    
    baMessageSection += `
      <tr>
        <td style="padding: 20px 24px 12px 24px; background-color: #f0f0f0; border-radius: 8px;">
          <p style="margin: 0 0 4px 0; line-height: 1.5; font-size: 14px; color: #666; font-weight: bold;">Message from Packager:</p>
          ${formattedMessageForBA}
        </td>
      </tr>
    `;
  }
  
  // BA's message placeholder (or generic message if available)
  // Note: Generic message would need to be fetched from Google Sheet or passed through
  // For now, showing placeholder
  baMessageSection += `
    <tr>
      <td style="padding: ${messageForBA ? '12px' : '20px'} 24px 24px 24px;">
        <p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #999; font-style: italic;">[Your message will appear here]</p>
      </td>
    </tr>
  `;
  
  messagePreviewHtml = baMessageSection;
}

let approvalHtml = "";
if (isPackagerEmail) {
  const approveUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=approve&field=packager_approved&value=Approved";
  const rejectUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=reject";
  
  approvalHtml = `
    <tr>
      <td class="approval-section">
        <div style="text-align:center; font-size:20px; font-weight:bold;">
          <p style="margin:0 0 15px 0;">PACKAGER TO APPROVE EMAIL FOR BA's</p>
          <div style="padding:10px;">
            <a href="${approveUrl}" style="background-color: green; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block; margin-right:10px;">Approve</a>
            <a href="${rejectUrl}" style="background-color: red; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block;">Needs Editing & Resubmitting</a>
          </div>
        </div>
      </td>
    </tr>
  `;
} else if (isBAEmail) {
const reviewUrl = PORTAL_URL + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&propertyAddress=" + encodeURIComponent(propertyAddress);
  const rejectUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=reject";
  approvalHtml = `
    <tr>
      <td class="approval-section">
        <div style="text-align:center; font-size:20px; font-weight:bold;">
          <p style="margin:0 0 15px 0;">BA TO SELECT SUITABLE CLIENTS</p>
          <div style="padding:10px;">
            <a href="${reviewUrl}" style="background-color: green; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block; margin-right:10px;">Review Suitable Clients</a>
            <a href="${rejectUrl}" style="background-color: red; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block;">Needs Editing & Resubmitting</a>
          </div>
        </div>
      </td>
    </tr>
  `;
}

const html_body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${subject}</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
    color: #4c4c4c;
    background-color: #ffffff;
  }
  .outer-table {
    width: 100%;
    border-collapse: collapse;
  }
  .container-table {
    width: 1040px;
    margin: 0 auto 32px 20px;
    border-collapse: collapse;
  }
  .approval-section {
    padding: 20px 24px;
    background-color: #f9f9f9;
    border-bottom: 2px solid #fbd721;
  }
  .logo-row td {
    padding: 0;
  }
  .logo-cell {
    width: 180px;
    padding-left: 24px;
  }
  .main-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 24px 20px 24px;
  }
  .col-label {
    width: 180px;
    font-size: 16px;
    font-weight: 600;
    vertical-align: top;
    padding: 8px 16px 8px 0;
    color: #4c4c4c;
  }
  .col-content {
    vertical-align: top;
    padding: 8px 0 8px 0;
  }
  .content-box {
    background-color: #fafafa;
    border-radius: 4px;
    padding: 14px 16px;
    border-left: 7px solid #fbd721;
  }
  .content-box p {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .content-box p:last-child {
    margin-bottom: 0;
  }
  .content-box ul {
    margin: 0 0 0 18px;
    padding: 0;
  }
  .content-box li {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .highlight-region strong {
    text-decoration: underline;
  }
  .highlight-heading {
    margin: 0 0 4px 0;
  }
</style>
</head>
<body>
  <table class="outer-table" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="left">
        <table class="container-table" role="presentation" cellpadding="0" cellspacing="0">
          ${approvalHtml}
          ${messagePreviewHtml}
          <tr class="logo-row">
            <td class="logo-cell">
              <img src="https://storage.googleapis.com/msgsndr/UJWYn4mrgGodB7KZUcHt/media/6938361650387f705884d8de.jpg"
                   alt="BuyersClub"
                   style="display:block;height:40px;width:180px;object-fit:contain;margin-bottom:12px;">
            </td>
          </tr>
          <tr>
            <td>
              <table class="main-table" role="presentation" cellpadding="0" cellspacing="0">
                ${sectionRow("Why This Property", whyHtml)}
                ${sectionRow("Address", addressHtml)}
                ${sectionRow("Property Description", propertyDescHtml)}
                ${sectionRow("Property Overlays", overlaysHtml)}
                ${sectionRow("Purchase Price", purchaseHtml)}
                ${sectionRow("Rental Assessment", rentalHtml)}
                ${sectionRow("Proximity", proximityHtml)}
                ${sectionRow("Market Performance", marketHtml)}
                ${sectionRow("Investment Highlights", highlightsHtml)}
                ${sectionRow("Attachments", attachmentsInnerHtml)}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

let text_body = "";

if (isPackagerEmail) {
  text_body += "[BA's message will appear here]\n\n";
} else if (isBAEmail) {
  if (messageForBA) {
    text_body += `Message from Packager:\n${messageForBA}\n\n`;
  }
  text_body += "[Your message will appear here]\n\n";
}

if (whyThisProperty) {
  text_body += `Why This Property\n${whyThisProperty}\n\n`;
}
if (propertyAddress) {
  text_body += `Address\n${propertyAddress.toUpperCase()}\n\n`;
}
if (googleMap) {
  text_body += `Google Map\n${googleMap}\n\n`;
}

text_body += propertyDescText;
text_body += overlaysText;
text_body += purchaseText;
text_body += rentalText;
text_body += proximityText;
text_body += marketText;
text_body += highlightsText;
text_body += attachmentsText;

console.log("Module 3 subject:", subject);
console.log("Module 3 html_body length:", html_body ? html_body.length : 0);

 return {
     subject,
     html_body,
     text_body,
     source: portalData.source || input.source || ""
   };// Check if this is a portal request
const portalData = input.Data || input;
const isPortalRequest = portalData.source === "portal";
console.log("Module 3 - portalData:", JSON.stringify(portalData, null, 2));
console.log("Module 3 - isPortalRequest:", isPortalRequest);
console.log("Module 3 - portalData.source:", portalData.source);

if (isPortalRequest) {
  // PORTAL REQUEST - Handle client emails with BA message at top
  const selectedClients = portalData.selectedClients || [];
  const baEmail = portalData.baEmail || '';
  const baName = portalData.baName || '';
  const propertyAddress = portalData.propertyAddress || '';
  const recordId = portalData.id || portalData.recordId || '';
  const propertyId = portalData.propertyId || '';
  
  // Format BA message preserving line breaks
  function formatBAMessage(message) {
    if (!message) return '';
    return message
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #4c4c4c;">${escapeHtml(line)}</p>`)
      .join('');
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Process each selected client and build email objects
  const clientEmails = selectedClients.map((client) => {
    // Filter out empty emails, trim whitespace, and join with comma (no spaces)
   // Filter and trim emails (NO deduplication for testing)
   const validEmails = (client.emails || [])
     .filter(email => email && email.trim())
     .map(email => email.trim());
    
    if (validEmails.length === 0) {
      return { skip: true, error: "No email addresses for client" };
    }
    
    const toEmail = validEmails.join(','); // Comma-separated, no spaces
    
    const clientMessage = client.message || '';
    const formattedMessage = formatBAMessage(clientMessage);
    
    // Build HTML email body (property details will be added later by other modules)
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Opportunity: ${escapeHtml(propertyAddress)}</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
    color: #4c4c4c;
    background-color: #ffffff;
  }
  .outer-table {
    width: 100%;
    border-collapse: collapse;
  }
  .container-table {
    width: 1040px;
    margin: 0 auto 32px 20px;
    border-collapse: collapse;
  }
  .logo-row td {
    padding: 0;
  }
  .logo-cell {
    width: 180px;
    padding-left: 24px;
  }
  .main-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 24px 20px 24px;
  }
  .col-label {
    width: 180px;
    font-size: 16px;
    font-weight: 600;
    vertical-align: top;
    padding: 8px 16px 8px 0;
    color: #4c4c4c;
  }
  .col-content {
    vertical-align: top;
    padding: 8px 0 8px 0;
  }
  .content-box {
    background-color: #fafafa;
    border-radius: 4px;
    padding: 14px 16px;
    border-left: 7px solid #fbd721;
  }
  .content-box p {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .content-box p:last-child {
    margin-bottom: 0;
  }
  .content-box ul {
    margin: 0 0 0 18px;
    padding: 0;
  }
  .content-box li {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .highlight-region strong {
    text-decoration: underline;
  }
  .highlight-heading {
    margin: 0 0 4px 0;
  }
</style>
</head>
<body>
  <table class="outer-table" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="left">
        <table class="container-table" role="presentation" cellpadding="0" cellspacing="0">
          <!-- BA's Message at the very top -->
          <tr>
            <td style="padding: 20px 24px 24px 24px;">
              ${formattedMessage}
            </td>
          </tr>
          <!-- Logo directly below message -->
          <tr class="logo-row">
            <td class="logo-cell">
              <img src="https://storage.googleapis.com/msgsndr/UJWYn4mrgGodB7KZUcHt/media/6938361650387f705884d8de.jpg"
                   alt="BuyersClub"
                   style="display:block;height:40px;width:180px;object-fit:contain;margin:0;">
            </td>
          </tr>
          <!-- Property Details - NOTE: Need to fetch from GHL using recordId -->
          <tr>
            <td style="padding: 0;">
              <table class="main-table" role="presentation" cellpadding="0" cellspacing="0">
                <!-- Property sections will be inserted here from GHL data -->
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    const textBody = `${clientMessage}\n\n---\n\n[Property details text version]`;
    
    return {
      to: toEmail,
      subject: `Property Opportunity: ${propertyAddress}`,
      htmlBody: htmlBody,
      textBody: textBody,
      baEmail: baEmail,
      baName: baName,
      clientInfo: {
        opportunityId: client.id || '',
        opportunityName: client.name || '',
        clientName: client.clientName || '',
        partnerName: client.partnerName || ''
      }
    };
  }).filter(item => !item.skip); // Remove skipped items
  
  return clientEmails;
}

// NORMAL GHL WEBHOOK REQUEST - Continue with existing code
// Step 2: Preprocess webhook data (like Zapier Step 2)
let webhookData = input.Webhook_Data || (Array.isArray(input) ? input[0] : input);
// If data is nested under "Data" key, extract it
const inputData = webhookData.Data || webhookData.data || webhookData;

console.log("Module 3 inputData keys:", Object.keys(inputData).slice(0, 10));
console.log("Module 3 has Data key:", 'Data' in inputData || 'data' in inputData);

// Get ID from various possible locations
const idValue = inputData.ID || inputData.id || inputData['ID'] || '';

// Build formatted data string (key: value format)
const formattedData = [];

// Add ID first if we have it
if (idValue && !formattedData.some(line => line.startsWith('ID:'))) {
  formattedData.push(`ID: ${idValue}`);
}

// Convert object to key: value string format
Object.keys(inputData).forEach(key => {
  if (key !== 'ID' && key !== 'id' && key !== 'Data' && key.toLowerCase() !== 'data') {
    const value = inputData[key];
    if (value !== undefined && value !== null) {
      // Convert objects/arrays to JSON string, otherwise use as-is
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      formattedData.push(`${key}: ${stringValue}`);
    }
  }
});

// Get data from preprocessing (now done in this module)
const raw = formattedData.join('\n');

console.log("Module 3 raw data length:", raw.length);
console.log("Module 3 raw data first 500 chars:", raw.substring(0, 500));

// STEP 4 – Build final email: subject + HTML + text
// Parse "key: value" lines into an object (like Zapier)
const parsed = {};
raw.split("\n").forEach((line) => {
  if (!line) return;

  // Strip leading "data: " if present on first line
  if (line.startsWith("data: ")) {
    line = line.slice(6);
  }

  const idx = line.indexOf(":");
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  let value = line.slice(idx + 1).trim();
  if (value === "null" || value === "undefined") value = "";
  parsed[key] = value;
});

// 2) Safe getter function
function v(key, fallback = "") {
  const val = parsed[key];
  if (val === undefined || val === null || String(val).trim() === "") {
    return fallback;
  }
  return String(val).trim();
}

// Tiny helpers
function hasAny(...keys) {
  return keys.some((k) => v(k));
}

function htmlLine(label, value) {
  if (!value) return "";
  return `<p><strong>${label}:</strong> ${value}</p>`;
}

function textLine(label, value) {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

// 3) Read core fields
const whyThisProperty = v("why_this_property");
const propertyAddress = v("property_address");
const googleMap = v("google_map");

// Define propertyId for button URLs
const propertyId = propertyAddress || v("property_address") || "";

// Get the record ID from GHL webhook data (check both ID and id)
const recordId = v("id") || v("ID") || idValue || "";

const bedsPrimary = v("beds_primary");
const bedsSecondary = v("beds_secondary");
const bathPrimary = v("bath_primary");
const bathSecondary = v("bath_secondary");
const garagePrimary = v("garage_primary");
const garageSecondary = v("garage_secondary");
const carportPrimary = v("carport_primary");
const carportSecondary = v("carport_secondary");
const carspacePrimary = v("carspace_primary");
const carspaceSecondary = v("carspace_secondary");

const yearBuilt = v("year_built");
const landSize = v("land_size");
const title = v("title");
const bodyCorpQuarter = v("body_corp_per_quarter");

// Overlays
const zoning = v("zoning");
const flood = v("flood");
const floodDialogue = v("flood_dialogue");
const bushfire = v("bushfire");
const bushfireDialogue = v("bushfire_dialogue");
const mining = v("mining");
const miningDialogue = v("mining_dialogue");
const otherOverlay = v("other_overlay");
const otherOverlayDialogue = v("other_overlay_dialogue");
const specialInfra = v("special_infrastructure");
const specialInfraDialogue = v("special_infrastructure_dialogue");
const dueDiligenceAcceptance = v("due_diligence_acceptance");

// Purchase price
const asking = v("asking");
const askingText = v("asking_text");
const comparableSales = v("comparable_sales");
const acceptableFrom = v("acceptable_acquisition_from");
const acceptableTo = v("acceptable_acquisition_to");
const purchasePriceDialogue = v("purchase_price_additional_dialogue");

// Rental assessment
const occupancy = v("occupancy");
const currentRentPrimary = v("current_rent_primary_per_week");
const currentRentSecondary = v("current_rent_secondary_per_week");
const expiryPrimary = v("expiry_primary");
const expirySecondary = v("expiry_secondary");
const yieldPct = v("yield");
const rentAppraisalPrimary = v("rent_appraisal_primary");
const rentAppraisalSecondary = v("rent_appraisal_secondary");
const appraisedYield = v("appraised_yield");
const rentalAssessmentDialogue = v("rental_assessment_additional_dialogue");
const dualFlag = v("does_this_property_have_2_dwellings");

// Proximity
const proximity = v("proximity");

// Market performance
const mp3m = v("median_price_change_3_months");
const mp1y = v("median_price_change_1_year");
const mp3y = v("median_price_change_3_year");
const mp5y = v("median_price_change_5_year");
const medianYield = v("median_yield");
const rentChange1y = v("median_rent_change_1_year");
const rentalPopulation = v("rental_population");
const vacancyRate = v("vacancy_rate");
const mpDialogue = v("market_performance_additional_dialogue");

// Investment highlights
const investmentHighlights = v("investment_highlights");

// Attachments dialogue
const attachmentsDialogue = v("attachments_additional_dialogue");

// Message for BA (packager to BA communication)
const messageForBA = v("message_for_ba") || v("message_for_ba_field") || "";

// Simple dual-income detection
const isDual =
  (dualFlag && dualFlag.toLowerCase().includes("yes")) ||
  !!bedsSecondary ||
  !!currentRentSecondary;

// Utility: numeric safe parse
function toNumber(vStr) {
  const n = parseFloat((vStr || "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Normalise simple values from GHL for display
function neatValue(str) {
  if (!str) return "";
  const s = String(str).trim();
  const lower = s.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "onmarket" || lower === "on market") return "On-market";
  return s;
}

// 4) Subject line
const packagerApproved = v("packager_approved", "").toLowerCase();
const baApproved = v("ba_approved", "").toLowerCase();

let subjectPrefix = "";
if (baApproved === "approved") {
  subjectPrefix = "";
} else if (packagerApproved === "approved") {
  subjectPrefix = "BA AUTO SEND – ";
} else {
  subjectPrefix = "PACKAGER TO CONFIRM – ";
}

const subjectAddress = propertyAddress ? propertyAddress.toUpperCase() : "";
const reviewRule = subjectAddress ? `Property Review: ${subjectAddress}` : "Property Review";
const subject = `${subjectPrefix}${reviewRule}`;

// Webhook URLs
const APPROVAL_WEBHOOK = "https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk";
const PORTAL_URL = "https://buyersclub123.github.io/property-portal";

// 5) Special formatting helpers
function normaliseNewlines(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/&#10;|&#13;/g, "\n");
}

function formatWhyHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const items = lines
    .map((line) => {
      const idx = line.indexOf(" - ");
      if (idx > 0) {
        const head = line.slice(0, idx).trim();
        const rest = line.slice(idx + 3).trim();
        const tail = rest ? ` – ${rest}` : "";
        return `<li><strong>${head}</strong>${tail}</li>`;
      }
      return `<li>${line}</li>`;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function formatProximityHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  const items = lines.map((line) => `<li>${line}</li>`).join("");
  return `<ul>${items}</ul>`;
}

function formatInvestmentHighlightsHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const knownHeadings = new Set(
    [
      "population growth context",
      "residential",
      "industrial",
      "commercial and civic",
      "commercial and civil",
      "health and education",
      "health and community",
      "transport",
      "infrastructure",
      "education",
      "job implications",
    ].map((s) => s.toLowerCase())
  );

  let html = "";
  let inList = false;
  let lineIndex = 0;
  let lastType = null;
  let lastHeadingType = null;

  function openList() {
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
  }

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine;
    const lower = line.toLowerCase();
    const explicitBullet = /^[-•]/.test(line);
    const bulletText = explicitBullet ? line.replace(/^[-•]\s*/, "").trim() : line;

    if (lineIndex === 0) {
      closeList();
      html += `<p class="highlight-region"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "region";
      lineIndex++;
      continue;
    }

    if (lineIndex === 1) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "sub";
      lineIndex++;
      continue;
    }

    if (explicitBullet) {
      openList();
      html += `<li>${bulletText}</li>`;
      lastType = "bullet";
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    if (knownHeadings.has(lower)) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "section";
      lineIndex++;
      continue;
    }

    if (lastType === "heading") {
      if (lastHeadingType === "section") {
        openList();
        html += `<li>${bulletText}</li>`;
        lastType = "bullet";
      } else {
        closeList();
        html += `<p>${bulletText}</p>`;
        lastType = "body";
      }
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    // Default: treat as list item
    openList();
    html += `<li>${bulletText}</li>`;
    lastType = "bullet";
    lineIndex++;
  }

  // IMPORTANT: Close any open list at the end
  closeList();
  return html;
}

function sectionRow(label, innerHtml) {
  if (!innerHtml) return "";
  return `
    <tr>
      <td class="col-label">
        ${label}
      </td>
      <td class="col-content">
        <div class="content-box">
          ${innerHtml}
        </div>
      </td>
    </tr>
  `;
}

// 6) Build section content
let whyHtml = "";
if (whyThisProperty) {
  const formattedWhy = formatWhyHtml(whyThisProperty);
  if (formattedWhy) whyHtml = formattedWhy;
}

let addressHtml = "";
if (propertyAddress) {
  addressHtml += `<p>${propertyAddress.toUpperCase()}</p>`;
}
if (googleMap) {
  const mapLink = googleMap;
  addressHtml += `<p><strong>Google Map:</strong> <a href="${mapLink}" target="_blank">${mapLink}</a></p>`;
}

let propertyDescHtml = "";
let propertyDescText = "";

if (
  hasAny(
    "beds_primary",
    "beds_secondary",
    "bath_primary",
    "bath_secondary",
    "garage_primary",
    "garage_secondary",
    "carport_primary",
    "carport_secondary",
    "carspace_primary",
    "carspace_secondary",
    "year_built",
    "land_size",
    "title",
    "body_corp_per_quarter",
    "property_description_additional_dialogue"
  )
) {
  let bedsDisplay = "";
  if (isDual && bedsPrimary && bedsSecondary) {
    bedsDisplay = `${bedsPrimary} + ${bedsSecondary}`;
  } else if (bedsPrimary) {
    bedsDisplay = bedsPrimary;
  }

  let bathsDisplay = "";
  if (isDual && bathPrimary && bathSecondary) {
    bathsDisplay = `${bathPrimary} + ${bathSecondary}`;
  } else if (bathPrimary) {
    bathsDisplay = bathPrimary;
  }

  const garageDisplay = [garagePrimary, garageSecondary].filter(Boolean).join(" + ");
  const carportDisplay = [carportPrimary, carportSecondary].filter(Boolean).join(" + ");
  const carspaceDisplay = [carspacePrimary, carspaceSecondary].filter(Boolean).join(" + ");

  propertyDescHtml += htmlLine("Beds", bedsDisplay);
  propertyDescHtml += htmlLine("Baths", bathsDisplay);
  propertyDescHtml += htmlLine("Garage", garageDisplay);
  propertyDescHtml += htmlLine("Car-port", carportDisplay);
  propertyDescHtml += htmlLine("Car-space", carspaceDisplay);
  propertyDescHtml += htmlLine("Year Built", yearBuilt);
  propertyDescHtml += htmlLine("Land Size", landSize);
  propertyDescHtml += htmlLine("Title", title);
  propertyDescHtml += htmlLine("Body Corp (per quarter)", bodyCorpQuarter);

  const propDescDialogue = v("property_description_additional_dialogue");
  if (propDescDialogue) {
    propertyDescHtml += `<p>${propDescDialogue}</p>`;
  }

  propertyDescText += "Property Description\n";
  if (bedsDisplay) propertyDescText += textLine("Beds", bedsDisplay);
  if (bathsDisplay) propertyDescText += textLine("Baths", bathsDisplay);
  if (garageDisplay) propertyDescText += textLine("Garage", garageDisplay);
  if (carportDisplay) propertyDescText += textLine("Car-port", carportDisplay);
  if (carspaceDisplay) propertyDescText += textLine("Car-space", carspaceDisplay);
  if (yearBuilt) propertyDescText += textLine("Year Built", yearBuilt);
  if (landSize) propertyDescText += textLine("Land Size", landSize);
  if (title) propertyDescText += textLine("Title", title);
  if (bodyCorpQuarter)
    propertyDescText += textLine("Body Corp (per quarter)", bodyCorpQuarter);
  if (propDescDialogue) propertyDescText += `${propDescDialogue}\n`;
  propertyDescText += "\n";
}

let overlaysHtml = "";
let overlaysText = "";

if (
  hasAny(
    "zoning",
    "flood",
    "bushfire",
    "mining",
    "other_overlay",
    "special_infrastructure",
    "flood_dialogue",
    "bushfire_dialogue",
    "mining_dialogue",
    "other_overlay_dialogue",
    "special_infrastructure_dialogue",
    "due_diligence_acceptance"
  )
) {
  overlaysHtml += htmlLine("Zoning", zoning);
  overlaysText += "Property Overlays\n";
  overlaysText += textLine("Zoning", zoning);

  function overlayBlock(label, status, dialogue) {
    let h = "";
    let t = "";
    if (status) {
      const nice = neatValue(status);
      h += htmlLine(label, nice);
      t += textLine(label, nice);
    }
    if (dialogue) {
      h += `<p>- ${dialogue}</p>`;
      t += `- ${dialogue}\n`;
    }
    return { h, t };
  }

  const f = overlayBlock("Flood", flood, floodDialogue);
  const b = overlayBlock("Bushfire", bushfire, bushfireDialogue);
  const m = overlayBlock("Mining", mining, miningDialogue);
  const o = overlayBlock("Other Overlay", otherOverlay, otherOverlayDialogue);
  const s = overlayBlock("Special Infrastructure", specialInfra, specialInfraDialogue);

  overlaysHtml += f.h + b.h + m.h + o.h + s.h;
  overlaysText += f.t + b.t + m.t + o.t + s.t;

  if (dueDiligenceAcceptance) {
    const niceDD = neatValue(dueDiligenceAcceptance);
    overlaysHtml += htmlLine("Due Diligence Acceptance", niceDD);
    overlaysText += textLine("Due Diligence Acceptance", niceDD);
  }

  overlaysText += "\n";
}

let purchaseHtml = "";
let purchaseText = "";

if (
  hasAny(
    "asking",
    "asking_text",
    "comparable_sales",
    "acceptable_acquisition_from",
    "acceptable_acquisition_to",
    "purchase_price_additional_dialogue"
  )
) {
  const niceAsking = neatValue(asking);

  purchaseHtml += htmlLine("Asking", niceAsking);
  purchaseHtml += htmlLine("Asking (Text)", askingText);
  purchaseHtml += htmlLine("Acceptable From", acceptableFrom);
  purchaseHtml += htmlLine("Acceptable To", acceptableTo);
  if (comparableSales) {
    const csNorm = normaliseNewlines(comparableSales);
    purchaseHtml += `<p><strong>Comparable Sales:</strong><br>${csNorm
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join("<br>")}</p>`;
  }
  if (purchasePriceDialogue) {
    purchaseHtml += `<p>${purchasePriceDialogue}</p>`;
  }

  purchaseText += "Purchase Price\n";
  purchaseText += textLine("Asking", niceAsking);
  purchaseText += textLine("Asking (Text)", askingText);
  purchaseText += textLine("Acceptable From", acceptableFrom);
  purchaseText += textLine("Acceptable To", acceptableTo);
  if (comparableSales) {
    purchaseText += `Comparable Sales:\n${comparableSales}\n`;
  }
  if (purchasePriceDialogue) {
    purchaseText += `${purchasePriceDialogue}\n`;
  }
  purchaseText += "\n";
}

let rentalHtml = "";
let rentalText = "";

if (
  hasAny(
    "occupancy",
    "current_rent_primary_per_week",
    "current_rent_secondary_per_week",
    "expiry_primary",
    "expiry_secondary",
    "yield",
    "rent_appraisal_primary",
    "rent_appraisal_secondary",
    "appraised_yield",
    "rental_assessment_additional_dialogue"
  )
) {
  rentalText += "Rental Assessment\n";

  const occLower = occupancy.toLowerCase();
  const isVacant = occLower.includes("vacant");

  if (!isDual) {
    rentalHtml += htmlLine("Occupancy", occupancy);
    rentalHtml += htmlLine("Current Rent (per week)", currentRentPrimary);
    rentalHtml += htmlLine("Lease Expiry", expiryPrimary);
    rentalHtml += htmlLine("Yield", yieldPct);
    rentalHtml += htmlLine("Rent Appraisal", rentAppraisalPrimary);
    rentalHtml += htmlLine("Appraised Yield", appraisedYield);

    rentalText += textLine("Occupancy", occupancy);
    rentalText += textLine("Current Rent (per week)", currentRentPrimary);
    rentalText += textLine("Lease Expiry", expiryPrimary);
    rentalText += textLine("Yield", yieldPct);
    rentalText += textLine("Rent Appraisal", rentAppraisalPrimary);
    rentalText += textLine("Appraised Yield", appraisedYield);
  } else {
    const pRentNum = toNumber(currentRentPrimary) || 0;
    const sRentNum = toNumber(currentRentSecondary) || 0;
    const totalRent = isVacant ? "N/A" : pRentNum + sRentNum || "";

    rentalHtml += htmlLine("Occupancy", occupancy);
    rentalHtml += htmlLine("Total Rent (per week)", totalRent);
    rentalHtml += htmlLine("Unit A – Rent (per week)", currentRentPrimary);
    rentalHtml += htmlLine("Unit B – Rent (per week)", currentRentSecondary);
    rentalHtml += htmlLine("Unit A – Expiry", expiryPrimary);
    rentalHtml += htmlLine("Unit B – Expiry", expirySecondary);
    rentalHtml += htmlLine("Rent Appraisal – Unit A", rentAppraisalPrimary);
    rentalHtml += htmlLine("Rent Appraisal – Unit B", rentAppraisalSecondary);
    rentalHtml += htmlLine("Appraised Yield", appraisedYield);

    rentalText += textLine("Occupancy", occupancy);
    rentalText += textLine("Total Rent (per week)", totalRent);
    rentalText += textLine("Unit A – Rent (per week)", currentRentPrimary);
    rentalText += textLine("Unit B – Rent (per week)", currentRentSecondary);
    rentalText += textLine("Unit A – Expiry", expiryPrimary);
    rentalText += textLine("Unit B – Expiry", expirySecondary);
    rentalText += textLine("Rent Appraisal – Unit A", rentAppraisalPrimary);
    rentalText += textLine("Rent Appraisal – Unit B", rentAppraisalSecondary);
    rentalText += textLine("Appraised Yield", appraisedYield);
  }

  if (rentalAssessmentDialogue) {
    rentalHtml += `<p>${rentalAssessmentDialogue}</p>`;
    rentalText += `${rentalAssessmentDialogue}\n`;
  }

  rentalText += "\n";
}

let proximityHtml = "";
let proximityText = "";

if (proximity) {
  proximityHtml = formatProximityHtml(proximity);
  proximityText += "Proximity\n";
  proximityText += `${proximity}\n\n`;
}

let marketHtml = "";
let marketText = "";

if (
  hasAny(
    "median_price_change_3_months",
    "median_price_change_1_year",
    "median_price_change_3_year",
    "median_price_change_5_year",
    "median_yield",
    "median_rent_change_1_year",
    "rental_population",
    "vacancy_rate",
    "market_performance_additional_dialogue"
  )
) {
  marketHtml += htmlLine("Median Price Change – 3 months", mp3m);
  marketHtml += htmlLine("Median Price Change – 1 year", mp1y);
  marketHtml += htmlLine("Median Price Change – 3 years", mp3y);
  marketHtml += htmlLine("Median Price Change – 5 years", mp5y);
  marketHtml += htmlLine("Median Yield", medianYield);
  marketHtml += htmlLine("Median Rent Change – 1 year", rentChange1y);
  marketHtml += htmlLine("Rental Population", rentalPopulation);
  marketHtml += htmlLine("Vacancy Rate", vacancyRate);

  if (mpDialogue) {
    marketHtml += `<p>${mpDialogue}</p>`;
  }

  marketText += "Market Performance\n";
  marketText += textLine("Median Price Change – 3 months", mp3m);
  marketText += textLine("Median Price Change – 1 year", mp1y);
  marketText += textLine("Median Price Change – 3 years", mp3y);
  marketText += textLine("Median Price Change – 5 years", mp5y);
  marketText += textLine("Median Yield", medianYield);
  marketText += textLine("Median Rent Change – 1 year", rentChange1y);
  marketText += textLine("Rental Population", rentalPopulation);
  marketText += textLine("Vacancy Rate", vacancyRate);
  if (mpDialogue) {
    marketText += `${mpDialogue}\n`;
  }
  marketText += "\n";
}

let highlightsHtml = "";
let highlightsText = "";

if (investmentHighlights) {
  highlightsHtml = formatInvestmentHighlightsHtml(investmentHighlights);
  highlightsText += "Investment Highlights\n";
  highlightsText += `${investmentHighlights}\n\n`;
}

let attachmentsInnerHtml = `<ul>
  <li>Photos</li>
  <li>Cash Flow Sheet</li>
  <li>RP Data Report</li>
  <li>Location Report</li>
</ul>`;
if (attachmentsDialogue) {
  attachmentsInnerHtml += `<p>${attachmentsDialogue}</p>`;
}

let attachmentsText = "Attachments\n";
attachmentsText += "- Photos\n- Cash Flow Sheet\n- RP Data Report\n- Location Report\n";
if (attachmentsDialogue) {
  attachmentsText += `${attachmentsDialogue}\n`;
}

// 7) Assemble final HTML + text bodies
const isPackagerEmail = packagerApproved !== "approved";
const isBAEmail = packagerApproved === "approved" && baApproved !== "approved";

// Build message placeholders/previews
let messagePreviewHtml = "";
if (isPackagerEmail) {
  // Packager email - show placeholder for BA message
  messagePreviewHtml = `
    <tr>
      <td style="padding: 20px 24px 24px 24px;">
        <p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #999; font-style: italic;">[BA's message will appear here]</p>
      </td>
    </tr>
  `;
} else if (isBAEmail) {
  // BA email - show packager's message for BA (if exists) and placeholder/generic message
  let baMessageSection = "";
  
  // Packager's message for BA (if exists)
  if (messageForBA) {
    const formattedMessageForBA = normaliseNewlines(messageForBA)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #666; font-style: italic;">${line}</p>`)
      .join('');
    
    baMessageSection += `
      <tr>
        <td style="padding: 20px 24px 12px 24px; background-color: #f0f0f0; border-radius: 8px;">
          <p style="margin: 0 0 4px 0; line-height: 1.5; font-size: 14px; color: #666; font-weight: bold;">Message from Packager:</p>
          ${formattedMessageForBA}
        </td>
      </tr>
    `;
  }
  
  // BA's message placeholder (or generic message if available)
  // Note: Generic message would need to be fetched from Google Sheet or passed through
  // For now, showing placeholder
  baMessageSection += `
    <tr>
      <td style="padding: ${messageForBA ? '12px' : '20px'} 24px 24px 24px;">
        <p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #999; font-style: italic;">[Your message will appear here]</p>
      </td>
    </tr>
  `;
  
  messagePreviewHtml = baMessageSection;
}

let approvalHtml = "";
if (isPackagerEmail) {
  const approveUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=approve&field=packager_approved&value=Approved";
  const rejectUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=reject";
  
  approvalHtml = `
    <tr>
      <td class="approval-section">
        <div style="text-align:center; font-size:20px; font-weight:bold;">
          <p style="margin:0 0 15px 0;">PACKAGER TO APPROVE EMAIL FOR BA's</p>
          <div style="padding:10px;">
            <a href="${approveUrl}" style="background-color: green; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block; margin-right:10px;">Approve</a>
            <a href="${rejectUrl}" style="background-color: red; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block;">Needs Editing & Resubmitting</a>
          </div>
        </div>
      </td>
    </tr>
  `;
} else if (isBAEmail) {
const reviewUrl = PORTAL_URL + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&propertyAddress=" + encodeURIComponent(propertyAddress);
  const rejectUrl = APPROVAL_WEBHOOK + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&action=reject";
  approvalHtml = `
    <tr>
      <td class="approval-section">
        <div style="text-align:center; font-size:20px; font-weight:bold;">
          <p style="margin:0 0 15px 0;">BA TO SELECT SUITABLE CLIENTS</p>
          <div style="padding:10px;">
            <a href="${reviewUrl}" style="background-color: green; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block; margin-right:10px;">Review Suitable Clients</a>
            <a href="${rejectUrl}" style="background-color: red; color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; text-decoration: none; display: inline-block;">Needs Editing & Resubmitting</a>
          </div>
        </div>
      </td>
    </tr>
  `;
}

const html_body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${subject}</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: "Montserrat", Arial, Helvetica, sans-serif;
    color: #4c4c4c;
    background-color: #ffffff;
  }
  .outer-table {
    width: 100%;
    border-collapse: collapse;
  }
  .container-table {
    width: 1040px;
    margin: 0 auto 32px 20px;
    border-collapse: collapse;
  }
  .approval-section {
    padding: 20px 24px;
    background-color: #f9f9f9;
    border-bottom: 2px solid #fbd721;
  }
  .logo-row td {
    padding: 0;
  }
  .logo-cell {
    width: 180px;
    padding-left: 24px;
  }
  .main-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 24px 20px 24px;
  }
  .col-label {
    width: 180px;
    font-size: 16px;
    font-weight: 600;
    vertical-align: top;
    padding: 8px 16px 8px 0;
    color: #4c4c4c;
  }
  .col-content {
    vertical-align: top;
    padding: 8px 0 8px 0;
  }
  .content-box {
    background-color: #fafafa;
    border-radius: 4px;
    padding: 14px 16px;
    border-left: 7px solid #fbd721;
  }
  .content-box p {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .content-box p:last-child {
    margin-bottom: 0;
  }
  .content-box ul {
    margin: 0 0 0 18px;
    padding: 0;
  }
  .content-box li {
    margin: 0 0 6px 0;
    line-height: 1.5;
    font-size: 16px;
  }
  .highlight-region strong {
    text-decoration: underline;
  }
  .highlight-heading {
    margin: 0 0 4px 0;
  }
</style>
</head>
<body>
  <table class="outer-table" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="left">
        <table class="container-table" role="presentation" cellpadding="0" cellspacing="0">
          ${approvalHtml}
          ${messagePreviewHtml}
          <tr class="logo-row">
            <td class="logo-cell">
              <img src="https://storage.googleapis.com/msgsndr/UJWYn4mrgGodB7KZUcHt/media/6938361650387f705884d8de.jpg"
                   alt="BuyersClub"
                   style="display:block;height:40px;width:180px;object-fit:contain;margin-bottom:12px;">
            </td>
          </tr>
          <tr>
            <td>
              <table class="main-table" role="presentation" cellpadding="0" cellspacing="0">
                ${sectionRow("Why This Property", whyHtml)}
                ${sectionRow("Address", addressHtml)}
                ${sectionRow("Property Description", propertyDescHtml)}
                ${sectionRow("Property Overlays", overlaysHtml)}
                ${sectionRow("Purchase Price", purchaseHtml)}
                ${sectionRow("Rental Assessment", rentalHtml)}
                ${sectionRow("Proximity", proximityHtml)}
                ${sectionRow("Market Performance", marketHtml)}
                ${sectionRow("Investment Highlights", highlightsHtml)}
                ${sectionRow("Attachments", attachmentsInnerHtml)}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

let text_body = "";

if (isPackagerEmail) {
  text_body += "[BA's message will appear here]\n\n";
} else if (isBAEmail) {
  if (messageForBA) {
    text_body += `Message from Packager:\n${messageForBA}\n\n`;
  }
  text_body += "[Your message will appear here]\n\n";
}

if (whyThisProperty) {
  text_body += `Why This Property\n${whyThisProperty}\n\n`;
}
if (propertyAddress) {
  text_body += `Address\n${propertyAddress.toUpperCase()}\n\n`;
}
if (googleMap) {
  text_body += `Google Map\n${googleMap}\n\n`;
}

text_body += propertyDescText;
text_body += overlaysText;
text_body += purchaseText;
text_body += rentalText;
text_body += proximityText;
text_body += marketText;
text_body += highlightsText;
text_body += attachmentsText;

console.log("Module 3 subject:", subject);
console.log("Module 3 html_body length:", html_body ? html_body.length : 0);

 return {
     subject,
     html_body,
     text_body,
     source: portalData.source || input.source || ""
   };








