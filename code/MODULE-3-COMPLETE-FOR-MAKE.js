/**
 * ⚠️ IMPORTANT REFERENCE DOCUMENTATION ⚠️
 * 
 * ALL formatting logic for this email template builder is documented in:
 * docs/0000-REQUIREMENTS/EMAIL-TEMPLATE-REQUIREMENTS.md
 * 
 * This file contains the complete email template builder logic for Make.com Module 3.
 * Before making changes, review the documentation which includes:
 * - Subject line formatting (all property types)
 * - Section formatting rules (Property Description, Purchase Price, Rental Assessment, etc.)
 * - Property type-specific logic (Established, H&L, SMSF, Project)
 * - Key decisions and rationale
 * 
 * File: code/MODULE-3-COMPLETE-FOR-MAKE.js
 */

// Check if this is a portal request
const portalData = input.Data || input;
const isPortalRequest = portalData.source === "portal";
console.log("Module 3 - portalData:", JSON.stringify(portalData, null, 2));
console.log("Module 3 - isPortalRequest:", isPortalRequest);
console.log("Module 3 - portalData.source:", portalData.source);

// ============================================================================
// SHARED FORMATTING FUNCTIONS (used by both portal and normal emails)
// ============================================================================

// Tiny helpers
function htmlLine(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<p><strong>${label}:</strong> ${value}</p>`;
}

function textLine(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `${label}: ${value}\n`;
}

// Utility: numeric safe parse
function toNumber(vStr) {
  const n = parseFloat((vStr || "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Format market performance value to 2 decimal places with % symbol
// Converts null to "N/A" (since GHL stores N/A values as null for numeric fields)
function formatMarketPerformanceValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";
  const strVal = String(value).trim();
  // Handle "N/A" and "TBC" strings (shouldn't happen from GHL, but just in case)
  if (strVal.toUpperCase() === "N/A" || strVal.toUpperCase() === "TBC") {
    return strVal.toUpperCase();
  }
  const num = parseFloat(strVal);
  if (isNaN(num)) return "N/A";
  return num.toFixed(2) + "%";
}

// Special htmlLine for market performance - always displays, even if value is N/A
function htmlLineMarket(label, value) {
  const formattedValue = formatMarketPerformanceValue(value);
  return `<p><strong>${label}:</strong> ${formattedValue}</p>`;
}

// Special textLine for market performance - always displays, even if value is N/A
function textLineMarket(label, value) {
  const formattedValue = formatMarketPerformanceValue(value);
  return `${label}: ${formattedValue}\n`;
}

// Normalise simple values from GHL for display
function neatValue(str) {
  if (!str) return "";
  const s = String(str).trim();
  const lower = s.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (lower === "onmarket" || lower === "on market") return "On-market";
  if (lower === "offmarket" || lower === "off-market") return "Off-market";
  return s;
}

// Format number with commas (for currency display)
function formatNumberWithCommas(val) {
  if (!val) return val;
  // Remove any existing commas and $ signs
  const cleaned = String(val).replace(/[,$]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return val; // Return original if not a number
  return num.toLocaleString('en-US');
}

// Format rent appraisal range: "$[from] - $[to] per week"
function formatRentAppraisalRange(from, to) {
  if (!from && !to) return "";
  if (from && to) {
    const fromFormatted = formatNumberWithCommas(from);
    const toFormatted = formatNumberWithCommas(to);
    return `$${fromFormatted} - $${toFormatted} per week`;
  }
  if (from) {
    const fromFormatted = formatNumberWithCommas(from);
    return `$${fromFormatted} per week`;
  }
  if (to) {
    const toFormatted = formatNumberWithCommas(to);
    return `$${toFormatted} per week`;
  }
  return "";
}

// Format current rent: "$[amount] per week" or "N/A"
function formatCurrentRent(val) {
  if (!val || val === "N/A") return "N/A";
  const formatted = formatNumberWithCommas(val);
  return `$${formatted} per week`;
}

// Format occupancy value to friendly display text
function formatOccupancy(val) {
  if (!val) return "N/A";
  const lower = val.toLowerCase();
  if (lower === "owner_occupied") return "Owner Occupied";
  if (lower === "tenanted") return "Tenanted";
  if (lower === "vacant") return "Vacant";
  if (lower === "tbc") return "TBC";
  // If already formatted or unknown, return as-is (capitalize first letter)
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase().replace(/_/g, " ");
}

// Normalise newlines helper
function normaliseNewlines(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/&#10;|&#13;/g, "\n");
}

// Format "Why This Property" as HTML
function formatWhyHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const items = lines
    .map((line) => {
      // Try to find dash separator (could be " - ", " – ", or " — ")
      const dashRegex = /[\s]+[-–—][\s]+/;
      const match = line.match(dashRegex);
      if (match) {
        const idx = line.indexOf(match[0]);
        const head = line.slice(0, idx).trim();
        const rest = line.slice(idx + match[0].length).trim();
        const tail = rest ? ` – ${rest}` : "";
        return `<p><strong>${head}</strong>${tail}</p>`;
      }
      return `<p>${line}</p>`;
    })
    .join("");

  return items;
}

// Format "Proximity" as HTML
function formatProximityHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  const items = lines.map((line) => `<li>${line}</li>`).join("");
  return `<ul>${items}</ul>`;
}

// Format "Investment Highlights" as HTML
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

    // Check if line starts with a known heading (allows for variations like "Job implications (construction + ongoing)")
    const matchesKnownHeading = Array.from(knownHeadings).some(heading => lower.startsWith(heading));
    if (matchesKnownHeading) {
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

// Format a section row (label + content)
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

if (isPortalRequest) {
  // PORTAL REQUEST - Handle client emails with BA message at top
  const selectedClients = portalData.selectedClients || [];
  const baEmail = portalData.baEmail || '';
  const baName = portalData.baName || '';
  const propertyAddress = portalData.propertyAddress || '';
  const recordId = portalData.id || portalData.recordId || '';
  const propertyId = portalData.propertyId || '';
  const sendFromEmail = portalData.sendFromEmail || ''; // Extract sendFromEmail for tracking
  
  console.log("Module 3 Portal - sendFromEmail:", sendFromEmail);
  
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
  
  // Get property data from Module 6's output (for portal requests, Module 6 processes GHL data)
  // Module 6 returns merged object: { ...ghlProperties, ...inputData, source: "portal" }
  // In Make.com, Module 3 receives Module 6's output
  // PRIORITY 1: Check Input Variable "Module6_Data" mapped to Module 6
  // PRIORITY 2: Check input.Data (previous module's output)
  // PRIORITY 3: Check input directly
  
  console.log("Module 3 Portal - Checking for Module 6's output...");
  console.log("Module 3 Portal - Has input.Module6_Data?", !!input.Module6_Data);
  console.log("Module 3 Portal - Has input.Module6_Data.result?", !!input.Module6_Data?.result);
  console.log("Module 3 Portal - Has input.Data?", !!input.Data);
  console.log("Module 3 Portal - input.Module6_Data keys:", input.Module6_Data ? Object.keys(input.Module6_Data).slice(0, 10) : "N/A");
  console.log("Module 3 Portal - input.Module6_Data.result keys:", input.Module6_Data?.result ? Object.keys(input.Module6_Data.result).slice(0, 10) : "N/A");
  console.log("Module 3 Portal - input.Module6_Data.result.why_this_property?", input.Module6_Data?.result?.why_this_property ? "exists" : "missing");
  console.log("Module 3 Portal - input.Module6_Data.result.beds_primary?", input.Module6_Data?.result?.beds_primary ? "exists" : "missing");
  
  let webhookDataForPortal = null;
  
  // PRIORITY 1: Check Input Variable "Module6_Data.result" (Module 6's output structure)
  if (input.Module6_Data && input.Module6_Data.result && (input.Module6_Data.result.why_this_property || input.Module6_Data.result.beds_primary)) {
    // Module 6's output via Input Variable - properties are in .result
    webhookDataForPortal = input.Module6_Data.result;
    console.log("Module 3 Portal - Found Module 6's output via Input Variable Module6_Data.result");
  }
  // PRIORITY 2: Check if Module6_Data has properties directly (fallback)
  else if (input.Module6_Data && (input.Module6_Data.why_this_property || input.Module6_Data.beds_primary)) {
    webhookDataForPortal = input.Module6_Data;
    console.log("Module 3 Portal - Found Module 6's output via Input Variable Module6_Data (direct)");
  }
  // PRIORITY 3: Check input.Data
  else if (input.Data && (input.Data.why_this_property || input.Data.beds_primary)) {
    webhookDataForPortal = input.Data;
    console.log("Module 3 Portal - Found Module 6's output via input.Data");
  }
  // PRIORITY 4: Check input directly
  else if (input.why_this_property || input.beds_primary) {
    webhookDataForPortal = input;
    console.log("Module 3 Portal - Found Module 6's output directly in input");
  }
  // Fallback to input.Data (might be original webhook data)
  else {
    webhookDataForPortal = input.Data || input.data || input;
    console.log("Module 3 Portal - WARNING: No GHL properties found! Using input.Data as fallback.");
    console.log("Module 3 Portal - TIP: Ensure Input Variable 'Module6_Data' is mapped to Module 6's bundle output");
    console.log("Module 3 Portal - ERROR: Property data is missing! Email will be empty. Check Module 6's output.");
    console.log("Module 3 Portal - input.Data keys:", input.Data ? Object.keys(input.Data).slice(0, 20) : "N/A");
  }
  
  const inputDataForPortal = webhookDataForPortal;
  
  // Log what we're receiving for debugging
  console.log("Module 3 Portal - inputDataForPortal keys:", Object.keys(inputDataForPortal).slice(0, 30));
  console.log("Module 3 Portal - inputDataForPortal type:", typeof inputDataForPortal);
  console.log("Module 3 Portal - Sample fields (direct check):", {
    why_this_property: inputDataForPortal.why_this_property ? `exists (${String(inputDataForPortal.why_this_property).substring(0, 50)}...)` : "missing",
    property_address: inputDataForPortal.property_address ? `exists (${inputDataForPortal.property_address})` : "missing",
    beds_primary: inputDataForPortal.beds_primary ? `exists (${inputDataForPortal.beds_primary})` : "missing",
    investment_highlights: inputDataForPortal.investment_highlights ? `exists (${String(inputDataForPortal.investment_highlights).substring(0, 50)}...)` : "missing",
    source: inputDataForPortal.source || "missing",
    selectedClients: inputDataForPortal.selectedClients ? `exists (${Array.isArray(inputDataForPortal.selectedClients) ? inputDataForPortal.selectedClients.length + ' items' : 'not array'})` : "missing"
  });
  
  // Build formatted data string (key: value format) - same as normal requests
  const formattedDataForPortal = [];
  const idValueForPortal = inputDataForPortal.ID || inputDataForPortal.id || inputDataForPortal['ID'] || '';
  
  if (idValueForPortal && !formattedDataForPortal.some(line => line.startsWith('ID:'))) {
    formattedDataForPortal.push(`ID: ${idValueForPortal}`);
  }
  
  // Extract all property fields from Module 6's output
  // Escape newlines in values to preserve them during string conversion
  Object.keys(inputDataForPortal).forEach(key => {
    // Skip portal-specific fields that shouldn't be in property data
    if (key !== 'ID' && key !== 'id' && key !== 'Data' && key.toLowerCase() !== 'data' && 
        key !== 'source' && key !== 'selectedClients' && key !== 'baEmail' && 
        key !== 'baName' && key !== 'sendFromEmail' && key !== 'action' && key !== 'timestamp' &&
        key !== 'propertyId' && key !== 'propertyAddress') {
      const value = inputDataForPortal[key];
      if (value !== undefined && value !== null) {
        // Handle nested objects (like from GHL API)
        let stringValue;
        if (typeof value === 'object') {
          // If it's an object with a 'properties' key (GHL structure), extract properties
          if (value.properties && typeof value.properties === 'object') {
            // Flatten nested properties
            Object.keys(value.properties).forEach(propKey => {
              const propValue = value.properties[propKey];
              if (propValue !== undefined && propValue !== null) {
                // Escape newlines: replace \n with \\n so they survive the join/split
                const escapedValue = String(propValue).replace(/\n/g, '\\n');
                formattedDataForPortal.push(`${propKey}: ${escapedValue}`);
              }
            });
            return; // Skip adding the parent object
          }
          // Skip complex objects (like selectedClients array)
          if (Array.isArray(value)) {
            return; // Skip arrays
          }
          stringValue = JSON.stringify(value);
        } else {
          // Escape newlines: replace \n with \\n so they survive the join/split
          stringValue = String(value).replace(/\n/g, '\\n');
        }
        formattedDataForPortal.push(`${key}: ${stringValue}`);
      }
    }
  });
  
  const rawForPortal = formattedDataForPortal.join('\n');
  
  console.log("Module 3 Portal - rawForPortal length:", rawForPortal.length);
  console.log("Module 3 Portal - rawForPortal first 500 chars:", rawForPortal.substring(0, 500));
  
  // Parse "key: value" lines into an object
  const parsedForPortal = {};
  rawForPortal.split("\n").forEach((line) => {
    if (!line) return;
    if (line.startsWith("data: ")) {
      line = line.slice(6);
    }
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value === "null" || value === "undefined") value = "";
    // Restore newlines: replace \\n back to \n
    value = value.replace(/\\n/g, '\n');
    parsedForPortal[key] = value;
  });
  
  console.log("Module 3 Portal - parsedForPortal sample keys:", Object.keys(parsedForPortal).slice(0, 20));
  
  // Safe getter function for portal
  function vPortal(key, fallback = "") {
    const val = parsedForPortal[key];
    if (val === undefined || val === null || String(val).trim() === "") {
      return fallback;
    }
    return String(val).trim();
  }
  
  function hasAnyPortal(...keys) {
    return keys.some((k) => vPortal(k));
  }
  
  
  // Read property fields from Module 6's parsed data
  const whyThisPropertyPortal = vPortal("why_this_property");
  const propertyAddressPortal = vPortal("property_address") || propertyAddress;
  const googleMapPortal = vPortal("google_map");
  
  const bedsPrimaryPortal = vPortal("beds_primary");
  const bedsSecondaryPortal = vPortal("beds_secondary") || vPortal("beds_additional__secondary__dual_key");
  const bathPrimaryPortal = vPortal("bath_primary");
  const bathSecondaryPortal = vPortal("bath_secondary") || vPortal("baths_additional__secondary__dual_key");
  const garagePrimaryPortal = vPortal("garage_primary");
  const garageSecondaryPortal = vPortal("garage_secondary") || vPortal("garage_additional__secondary__dual_key");
  const carportPrimaryPortal = vPortal("carport_primary");
  const carportSecondaryPortal = vPortal("carport_secondary") || vPortal("carport_additional__secondary__dual_key");
  const carspacePrimaryPortal = vPortal("carspace_primary");
  const carspaceSecondaryPortal = vPortal("carspace_secondary") || vPortal("carspace_additional__secondary__dual_key");
  const yearBuiltPortal = vPortal("year_built");
  const landRegistrationPortal = vPortal("land_registration");
  const buildSizePortal = vPortal("build_size");
  const landSizePortal = vPortal("land_size");
  const titlePortal = vPortal("title");
  const bodyCorpQuarterPortal = vPortal("body_corp__per_quarter");
  const bodyCorpDescriptionPortal = vPortal("body_corp_description");
  
  const zoningPortal = vPortal("zoning");
  const floodPortal = vPortal("flood");
  const floodDialoguePortal = vPortal("flood_dialogue");
  const bushfirePortal = vPortal("bushfire");
  const bushfireDialoguePortal = vPortal("bushfire_dialogue");
  const miningPortal = vPortal("mining");
  const miningDialoguePortal = vPortal("mining_dialogue") || vPortal("mining_dialogie"); // Handle typo in GHL field name
  const otherOverlayPortal = vPortal("other_overlay");
  const otherOverlayDialoguePortal = vPortal("other_overlay_dialogue");
  const specialInfraPortal = vPortal("special_infrastructure");
  const specialInfraDialoguePortal = vPortal("special_infrastructure_dialogue");
  const dueDiligenceAcceptancePortal = vPortal("due_diligence_acceptance");
  
  const askingPortal = vPortal("asking");
  const askingTextPortal = vPortal("asking_text");
  const comparableSalesPortal = vPortal("comparable_sales");
  const acceptableFromPortal = vPortal("acceptable_acquisition__from") || vPortal("acceptable_acquisition_from");
  const acceptableToPortal = vPortal("acceptable_acquisition__to") || vPortal("acceptable_acquisition_to");
  const purchasePriceDialoguePortal = vPortal("purchase_price_additional_dialogue");
  // H&L price fields
  const landPricePortal = vPortal("land_price");
  const buildPricePortal = vPortal("build_price");
  const totalPricePortal = vPortal("total_price");
  // Cashback/Rebate fields
  const cashbackRebateValuePortal = vPortal("cashback_rebate_value");
  const cashbackRebateTypePortal = vPortal("cashback_rebate_type");
  
  const occupancyPortal = vPortal("occupancy");
  const occupancyPrimaryPortal = vPortal("occupancy_primary");
  const occupancySecondaryPortal = vPortal("occupancy_secondary");
  const currentRentPrimaryPortal = vPortal("current_rent_primary__per_week") || vPortal("current_rent_primary_per_week");
  const currentRentSecondaryPortal = vPortal("current_rent_secondary__per_week") || vPortal("current_rent_secondary_per_week");
  const expiryPrimaryPortal = vPortal("expiry_primary");
  const expirySecondaryPortal = vPortal("expiry_secondary");
  const yieldPctPortal = vPortal("yield");
  const rentAppraisalPrimaryFromPortal = vPortal("rent_appraisal_primary_from");
  const rentAppraisalPrimaryToPortal = vPortal("rent_appraisal_primary_to");
  const rentAppraisalSecondaryFromPortal = vPortal("rent_appraisal_secondary_from");
  const rentAppraisalSecondaryToPortal = vPortal("rent_appraisal_secondary_to");
  const appraisedYieldPortal = vPortal("appraised_yield");
  const rentalAssessmentDialoguePortal = vPortal("rental_assessment_additional_dialogue");
  const dualFlagPortal = vPortal("does_this_property_have_2_dwellings");
  
  const proximityPortal = vPortal("proximity");
  
  const mp3mPortal = vPortal("median_price_change__3_months");
  const mp1yPortal = vPortal("median_price_change__1_year");
  const mp3yPortal = vPortal("median_price_change__3_year");
  const mp5yPortal = vPortal("median_price_change__5_year");
  const medianYieldPortal = vPortal("median_yield");
  const rentChange1yPortal = vPortal("median_rent_change__1_year");
  const rentalPopulationPortal = vPortal("rental_population");
  const vacancyRatePortal = vPortal("vacancy_rate");
  const mpDialoguePortal = vPortal("market_performance_additional_dialogue");
  
  const investmentHighlightsPortal = vPortal("investment_highlights");
  const attachmentsDialoguePortal = vPortal("attachments_additional_dialogue");
  const folderLinkPortal = vPortal("folder_link") || vPortal("folderLink");
  
  // Check if secondary values actually exist and are meaningful (not just "0" or empty)
  const hasBedsSecondaryPortal = bedsSecondaryPortal && bedsSecondaryPortal !== "0" && bedsSecondaryPortal.trim() !== "";
  const hasCurrentRentSecondaryPortal = currentRentSecondaryPortal && currentRentSecondaryPortal !== "0" && currentRentSecondaryPortal.trim() !== "";
  const isDualPortal = (dualFlagPortal && dualFlagPortal.toLowerCase().includes("yes")) || hasBedsSecondaryPortal || hasCurrentRentSecondaryPortal;
  
  // Detect property type for portal (to determine if Occupancy should be shown)
  const propertyTypePortal = vPortal("property_type");
  const dealTypePortal = vPortal("deal_type");
  const contractTypeSimplifiedPortal = vPortal("contract_type"); // "Single Contract" or "Split Contract" for H&L properties
  const templateTypePortal = vPortal("template_type");
  const isParentRecordPortal = vPortal("is_parent_record");
  const isEstablishedPortal = (propertyTypePortal && propertyTypePortal.toLowerCase() === "established") || (dealTypePortal && dealTypePortal === "05_established");
  const isProjectPortal = (templateTypePortal && templateTypePortal.toLowerCase() === "project") || (isParentRecordPortal && isParentRecordPortal.toLowerCase() === "yes");
  const isHAndLPortal = (propertyTypePortal && propertyTypePortal.toLowerCase() === "new") && (dealTypePortal && dealTypePortal === "01_hl_comms") && !isProjectPortal;
  const isSMSFPortal = (propertyTypePortal && propertyTypePortal.toLowerCase() === "new") && dealTypePortal && (dealTypePortal === "02_single_comms" || dealTypePortal === "03_internal_with_comms" || dealTypePortal === "04_internal_nocomms");
  const isNewPropertyPortal = isHAndLPortal || isSMSFPortal || isProjectPortal;
  
  // Build property sections HTML
  let whyHtmlPortal = "";
  if (whyThisPropertyPortal) {
    const formattedWhy = formatWhyHtml(whyThisPropertyPortal);
    if (formattedWhy) whyHtmlPortal = formattedWhy;
  }
  
  let addressHtmlPortal = "";
  if (propertyAddressPortal) {
    addressHtmlPortal += `<p>${propertyAddressPortal.toUpperCase()}</p>`;
  }
  
  let googleMapHtmlPortal = "";
  if (googleMapPortal) {
    googleMapHtmlPortal += `<p><a href="${googleMapPortal}" target="_blank">${propertyAddressPortal || googleMapPortal}</a></p>`;
  }
  
  let propertyDescHtmlPortal = "";
  let propertyDescTextPortal = "";
  if (hasAnyPortal("beds_primary", "beds_secondary", "bath_primary", "bath_secondary", "garage_primary", "garage_secondary", "carport_primary", "carport_secondary", "carspace_primary", "carspace_secondary", "year_built", "land_size", "title", "body_corp_per_quarter", "property_description_additional_dialogue")) {
    let bedsDisplayPortal = "";
    if (isDualPortal && bedsPrimaryPortal && bedsSecondaryPortal) {
      bedsDisplayPortal = `${bedsPrimaryPortal} + ${bedsSecondaryPortal}`;
    } else if (bedsPrimaryPortal) {
      bedsDisplayPortal = bedsPrimaryPortal;
    }
    // Convert "point" to "." for bath values (GHL stores as "2point5" but should display as "2.5")
    const formatBathValuePortal = (val) => {
      if (!val) return "";
      return String(val).replace(/point/gi, ".");
    };
    
    let bathsDisplayPortal = "";
    if (isDualPortal && bathPrimaryPortal && bathSecondaryPortal) {
      bathsDisplayPortal = `${formatBathValuePortal(bathPrimaryPortal)} + ${formatBathValuePortal(bathSecondaryPortal)}`;
    } else if (bathPrimaryPortal) {
      bathsDisplayPortal = formatBathValuePortal(bathPrimaryPortal);
    }
    // Helper: Convert value to number, defaulting to 0 if null/undefined/empty (but 0 is valid)
    const toNumPortal = (val) => {
      if (val === null || val === undefined || val === "") return 0;
      const num = parseInt(val);
      return isNaN(num) ? 0 : num;
    };
    
    // Helper: Check if value exists (not null/undefined/empty, but 0 is considered existing)
    const hasValuePortal = (val) => val !== null && val !== undefined && val !== "";
    
    const garagePrimaryNumPortal = toNumPortal(garagePrimaryPortal);
    const garageSecondaryNumPortal = toNumPortal(garageSecondaryPortal);
    const carportPrimaryNumPortal = toNumPortal(carportPrimaryPortal);
    const carportSecondaryNumPortal = toNumPortal(carportSecondaryPortal);
    const carspacePrimaryNumPortal = toNumPortal(carspacePrimaryPortal);
    const carspaceSecondaryNumPortal = toNumPortal(carspaceSecondaryPortal);
    
    // Determine display logic
    let garageDisplayPortal = "";
    let carportDisplayPortal = "";
    let carspaceDisplayPortal = "";
    
    if (isDualPortal) {
      // DUAL OCCUPANCY LOGIC
      // Garage: Show if either side has garage (value > 0), or if neither side has garage AND no carport/carspace exists
      const hasGarageEitherSidePortal = garagePrimaryNumPortal > 0 || garageSecondaryNumPortal > 0;
      const hasCarportEitherSidePortal = hasValuePortal(carportPrimaryPortal) || hasValuePortal(carportSecondaryPortal);
      const hasCarspaceEitherSidePortal = hasValuePortal(carspacePrimaryPortal) || hasValuePortal(carspaceSecondaryPortal);
      
      if (hasGarageEitherSidePortal) {
        // Either side has garage → show both sides (including 0s)
        garageDisplayPortal = `${garagePrimaryNumPortal} + ${garageSecondaryNumPortal}`;
      } else if (!hasCarportEitherSidePortal && !hasCarspaceEitherSidePortal) {
        // Neither side has garage AND no carport/carspace → show "0 + 0"
        garageDisplayPortal = "0 + 0";
      }
      // If neither side has garage BUT carport/carspace exists → don't show garage (handled above)
      
      // Carport: Only show if either side has a value
      if (hasCarportEitherSidePortal) {
        carportDisplayPortal = `${carportPrimaryNumPortal} + ${carportSecondaryNumPortal}`;
      }
      
      // Carspace: Only show if either side has a value
      if (hasCarspaceEitherSidePortal) {
        carspaceDisplayPortal = `${carspacePrimaryNumPortal} + ${carspaceSecondaryNumPortal}`;
      }
    } else {
      // SINGLE OCCUPANCY LOGIC
      const hasCarportPrimaryPortal = hasValuePortal(carportPrimaryPortal);
      const hasCarspacePrimaryPortal = hasValuePortal(carspacePrimaryPortal);
      
      // Garage: Always show (even if 0), UNLESS primary carport/carspace has value
      if (!hasCarportPrimaryPortal && !hasCarspacePrimaryPortal) {
        // No carport/carspace → always show garage (even if 0)
        garageDisplayPortal = String(garagePrimaryNumPortal);
      } else if (garagePrimaryNumPortal > 0) {
        // Garage has value AND carport/carspace exists → show all
        garageDisplayPortal = String(garagePrimaryNumPortal);
      }
      // If garage=0 and carport/carspace exists → don't show garage
      
      // Carport: Only show if primary has a value
      if (hasCarportPrimaryPortal) {
        carportDisplayPortal = String(carportPrimaryNumPortal);
      }
      
      // Carspace: Only show if primary has a value
      if (hasCarspacePrimaryPortal) {
        carspaceDisplayPortal = String(carspacePrimaryNumPortal);
      }
    }
    
    // Format values according to training doc
    // Built: Use build_size for H&L/Projects (format: "122 sqm approx."), year_built for Established (format: "1975 approx.")
    const builtDisplayPortal = buildSizePortal ? `${buildSizePortal} sqm approx.` : (yearBuiltPortal ? `${yearBuiltPortal} approx.` : "");
    const landRegistrationDisplayPortal = landRegistrationPortal || "";
    const landSizeDisplayPortal = landSizePortal ? `${landSizePortal} sqm approx.` : "";
    const bodyCorpDisplayPortal = bodyCorpQuarterPortal ? `Approx. $${bodyCorpQuarterPortal} per quarter` : "";
    // Capitalize title (first letter uppercase, rest lowercase)
    // Format title: Replace underscores with spaces, capitalize first letter of each word
    const titleDisplayPortal = titlePortal ? titlePortal
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') : "";
    
    propertyDescHtmlPortal += htmlLine("Bed", bedsDisplayPortal);
    propertyDescHtmlPortal += htmlLine("Bath", bathsDisplayPortal);
    propertyDescHtmlPortal += htmlLine("Garage", garageDisplayPortal);
    propertyDescHtmlPortal += htmlLine("Car-port", carportDisplayPortal);
    propertyDescHtmlPortal += htmlLine("Car-space", carspaceDisplayPortal);
    // Registration: Only show for New properties (NOT Established)
    if (!isEstablishedPortal && landRegistrationDisplayPortal) {
      propertyDescHtmlPortal += htmlLine("Registration", landRegistrationDisplayPortal);
    }
    if (builtDisplayPortal) {
      propertyDescHtmlPortal += htmlLine("Built", builtDisplayPortal);
    }
    propertyDescHtmlPortal += htmlLine("Land Size", landSizeDisplayPortal);
    propertyDescHtmlPortal += htmlLine("Title", titleDisplayPortal);
    // Body Corp: Only show for specific title types (STRATA, OWNERS CORP (COMMUNITY), SURVEY STRATA, BUILT STRATA)
    // Do NOT show for: INDIVIDUAL, TORRENS, GREEN, TBC
    // Always show Body Corp field for these title types (even if value is empty - indicates data issue)
    if (titlePortal) {
      // Replace underscores with spaces for comparison (handles "owners_corp_community" format)
      const titleUpperPortal = titlePortal.replace(/_/g, ' ').toUpperCase();
      const showBodyCorpPortal = titleUpperPortal.includes("STRATA") || 
                        titleUpperPortal.includes("OWNERS CORP") || 
                        titleUpperPortal.includes("SURVEY STRATA") ||
                        titleUpperPortal.includes("BUILT STRATA");
      if (showBodyCorpPortal) {
        // Use bodyCorpDisplayPortal if it exists, otherwise format from bodyCorpQuarterPortal, otherwise show empty
        const bodyCorpValuePortal = bodyCorpDisplayPortal || (bodyCorpQuarterPortal ? `Approx. $${bodyCorpQuarterPortal} per quarter` : "");
        propertyDescHtmlPortal += `<p style="margin-left: 20px;"><strong>Body corp.:</strong> ${bodyCorpValuePortal}</p>`;
        // Body Corp Description: Show if bodyCorpQuarterPortal has value AND bodyCorpDescriptionPortal has text
        if (bodyCorpQuarterPortal && bodyCorpDescriptionPortal) {
          propertyDescHtmlPortal += `<p style="margin-left: 20px;"><strong>Body corp. Dialogue:</strong></p>`;
          propertyDescHtmlPortal += `<p style="margin-left: 20px;">${normaliseNewlines(bodyCorpDescriptionPortal)}</p>`;
        }
      }
    }
    const propDescDialoguePortal = vPortal("property_description_additional_dialogue");
    if (propDescDialoguePortal) {
      propertyDescHtmlPortal += `<br>`;
      propertyDescHtmlPortal += `<p>*${propDescDialoguePortal}</p>`;
    }
    propertyDescTextPortal += "Property Description\n";
    if (bedsDisplayPortal) propertyDescTextPortal += textLine("Bed", bedsDisplayPortal);
    if (bathsDisplayPortal) propertyDescTextPortal += textLine("Bath", bathsDisplayPortal);
    if (garageDisplayPortal) propertyDescTextPortal += textLine("Garage", garageDisplayPortal);
    if (carportDisplayPortal) propertyDescTextPortal += textLine("Car-port", carportDisplayPortal);
    if (carspaceDisplayPortal) propertyDescTextPortal += textLine("Car-space", carspaceDisplayPortal);
    // Registration: Only show for New properties (NOT Established)
    if (!isEstablishedPortal && landRegistrationDisplayPortal) {
      propertyDescTextPortal += textLine("Registration", landRegistrationDisplayPortal);
    }
    if (builtDisplayPortal) propertyDescTextPortal += textLine("Built", builtDisplayPortal);
    if (landSizeDisplayPortal) propertyDescTextPortal += textLine("Land Size", landSizeDisplayPortal);
    if (titleDisplayPortal) propertyDescTextPortal += textLine("Title", titleDisplayPortal);
    // Body Corp: Only show for specific title types
    // Always show Body Corp field for these title types (even if value is empty - indicates data issue)
    if (titlePortal) {
      // Replace underscores with spaces for comparison (handles "owners_corp_community" format)
      const titleUpperPortal = titlePortal.replace(/_/g, ' ').toUpperCase();
      const showBodyCorpPortal = titleUpperPortal.includes("STRATA") || 
                        titleUpperPortal.includes("OWNERS CORP") || 
                        titleUpperPortal.includes("SURVEY STRATA") ||
                        titleUpperPortal.includes("BUILT STRATA");
      if (showBodyCorpPortal) {
        // Use bodyCorpDisplayPortal if it exists, otherwise format from bodyCorpQuarterPortal, otherwise show empty
        const bodyCorpValuePortal = bodyCorpDisplayPortal || (bodyCorpQuarterPortal ? `Approx. $${bodyCorpQuarterPortal} per quarter` : "");
        propertyDescTextPortal += `    Body corp.: ${bodyCorpValuePortal}\n`;
        // Body Corp Description: Show if bodyCorpQuarterPortal has value AND bodyCorpDescriptionPortal has text
        if (bodyCorpQuarterPortal && bodyCorpDescriptionPortal) {
          propertyDescTextPortal += `    Body corp. Dialogue:\n`;
          propertyDescTextPortal += `    ${normaliseNewlines(bodyCorpDescriptionPortal)}\n`;
        }
      }
    }
    if (propDescDialoguePortal) {
      propertyDescTextPortal += `\n*${propDescDialoguePortal}\n`;
    }
    propertyDescTextPortal += "\n";
  }
  
  let overlaysHtmlPortal = "";
  let overlaysTextPortal = "";
  if (hasAnyPortal("zoning", "flood", "bushfire", "mining", "other_overlay", "special_infrastructure", "flood_dialogue", "bushfire_dialogue", "mining_dialogue", "mining_dialogie", "other_overlay_dialogue", "special_infrastructure_dialogue", "due_diligence_acceptance")) {
    overlaysHtmlPortal += htmlLine("Zoning", zoningPortal);
    overlaysTextPortal += "Property Overlays\n";
    overlaysTextPortal += textLine("Zoning", zoningPortal);
    function overlayBlockPortal(label, status, dialogue) {
      let h = "";
      let t = "";
      if (status) {
        const nice = neatValue(status);
        if (dialogue) {
          // Combine status and dialogue on same line: "Label: Yes - [dialogue]"
          h += `<p><strong>${label}:</strong> ${nice} - ${dialogue}</p>`;
          t += `${label}: ${nice} - ${dialogue}\n`;
        } else {
          // Just status: "Label: Yes"
          h += htmlLine(label, nice);
          t += textLine(label, nice);
        }
      }
      return { h, t };
    }
    const fPortal = overlayBlockPortal("Flood", floodPortal, floodDialoguePortal);
    const bPortal = overlayBlockPortal("Bushfire", bushfirePortal, bushfireDialoguePortal);
    const mPortal = overlayBlockPortal("Mining", miningPortal, miningDialoguePortal);
    const oPortal = overlayBlockPortal("Other Overlay", otherOverlayPortal, otherOverlayDialoguePortal);
    const sPortal = overlayBlockPortal("Special Infrastructure", specialInfraPortal, specialInfraDialoguePortal);
    overlaysHtmlPortal += fPortal.h + bPortal.h + mPortal.h + oPortal.h + sPortal.h;
    overlaysTextPortal += fPortal.t + bPortal.t + mPortal.t + oPortal.t + sPortal.t;
    if (dueDiligenceAcceptancePortal) {
      const niceDDPortal = neatValue(dueDiligenceAcceptancePortal);
      overlaysHtmlPortal += `<br>`;
      overlaysHtmlPortal += htmlLine("Due Diligence Acceptance", niceDDPortal);
      overlaysTextPortal += `\nDue Diligence Acceptance: ${niceDDPortal}\n`;
    }
    overlaysTextPortal += "\n";
  }
  
  let purchaseHtmlPortal = "";
  let purchaseTextPortal = "";

  // Determine if we should show Purchase Price section (Portal version)
  // Note: isNewPropertyPortal is already declared earlier (includes Projects), but for Purchase Price we exclude Projects
  const isNewPropertyForPurchasePricePortal = isHAndLPortal || isSMSFPortal;
  const isSingleContractPortal = contractTypeSimplifiedPortal && contractTypeSimplifiedPortal.toLowerCase() === "single contract";
  const isSplitContractPortal = contractTypeSimplifiedPortal && contractTypeSimplifiedPortal.toLowerCase() === "split contract";
  const hasCashbackPortal = cashbackRebateValuePortal && cashbackRebateValuePortal.trim() !== "";

  if (
    hasAnyPortal(
      "asking",
      "asking_text",
      "comparable_sales",
      "acceptable_acquisition__from",
      "acceptable_acquisition_from",
      "acceptable_acquisition__to",
      "acceptable_acquisition_to",
      "land_price",
      "build_price",
      "total_price",
      "cashback_rebate_value",
      "purchase_price_additional_dialogue"
    )
  ) {
    // Note: "Purchase Price" section heading is handled by left sidebar navigation, not shown in content

    if (isNewPropertyForPurchasePricePortal) {
      // NEW PROPERTIES (H&L, SMSF) - Do NOT show Projects here
      // Show "House & Land package" as hardcoded text
      purchaseHtmlPortal += `<p><strong>House & Land package</strong></p>`;
      purchaseTextPortal += "House & Land package\n";

      // Determine which price structure to show
      if (isSingleContractPortal && totalPricePortal) {
        // Single Contract: Just show "Price" (bold) = Total Price
        const totalPriceFormattedPortal = `$${formatNumberWithCommas(totalPricePortal)}`;
        purchaseHtmlPortal += `<p><strong>Price:</strong> <strong>${totalPriceFormattedPortal}</strong></p>`;
        purchaseTextPortal += `Price: ${totalPriceFormattedPortal}\n`;
      } else if (isSplitContractPortal || (!isSingleContractPortal && (landPricePortal || buildPricePortal))) {
        // Split Contract: Show Total Price (bold), then Land Price (indented 30px), Build Price (indented 30px)
        // Calculate total if not provided
        const landPriceNumPortal = toNumber(landPricePortal) || 0;
        const buildPriceNumPortal = toNumber(buildPricePortal) || 0;
        const calculatedTotalPortal = landPriceNumPortal + buildPriceNumPortal;
        const totalPriceToShowPortal = totalPricePortal || calculatedTotalPortal;
        
        if (totalPriceToShowPortal) {
          const totalPriceFormattedPortal = `$${formatNumberWithCommas(totalPriceToShowPortal)}`;
          purchaseHtmlPortal += `<p><strong>Price:</strong> <strong>${totalPriceFormattedPortal}</strong></p>`;
          purchaseTextPortal += `Price: ${totalPriceFormattedPortal}\n`;
        }
        if (landPricePortal) {
          const landPriceFormattedPortal = `$${formatNumberWithCommas(landPricePortal)}`;
          purchaseHtmlPortal += `<p style="margin-left: 30px;"><strong>Land:</strong> ${landPriceFormattedPortal}</p>`;
          purchaseTextPortal += `    Land: ${landPriceFormattedPortal}\n`;
        }
        if (buildPricePortal) {
          const buildPriceFormattedPortal = `$${formatNumberWithCommas(buildPricePortal)}`;
          purchaseHtmlPortal += `<p style="margin-left: 30px;"><strong>Build:</strong> ${buildPriceFormattedPortal}</p>`;
          purchaseTextPortal += `    Build: ${buildPriceFormattedPortal}\n`;
        }
      }

      // Net Price: Calculate and show ONLY if cashbackRebateType === "cashback" (not for rebates)
      const isCashbackTypePortal = cashbackRebateTypePortal && cashbackRebateTypePortal.toLowerCase() === "cashback";
      if (hasCashbackPortal && isCashbackTypePortal) {
        const totalPriceNumPortal = toNumber(totalPricePortal) || (toNumber(landPricePortal) || 0) + (toNumber(buildPricePortal) || 0);
        const cashbackNumPortal = toNumber(cashbackRebateValuePortal) || 0;
        const netPricePortal = totalPriceNumPortal - cashbackNumPortal;
        if (netPricePortal > 0) {
          const netPriceFormattedPortal = `$${formatNumberWithCommas(netPricePortal)}`;
          const cashbackFormattedPortal = cashbackNumPortal >= 1000 ? `$${(cashbackNumPortal / 1000).toFixed(0)}k` : `$${formatNumberWithCommas(cashbackNumPortal)}`;
          // Use cashbackRebateType field value (not hardcoded) - format for sentence (lowercase)
          const cashbackTypeForSentencePortal = cashbackRebateTypePortal ? cashbackRebateTypePortal.toLowerCase() : "cashback";
          purchaseHtmlPortal += `<p><strong>Net Price:</strong> <strong>${netPriceFormattedPortal}</strong> when considering the <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${cashbackFormattedPortal} ${cashbackTypeForSentencePortal}</span></p>`;
          purchaseTextPortal += `Net Price: ${netPriceFormattedPortal} when considering the ${cashbackFormattedPortal} ${cashbackTypeForSentencePortal}\n`;
        }
      }

      // Rebate: Show as separate line for New properties if it's a rebate (not cashback)
      const isRebateTypePortal = cashbackRebateTypePortal && cashbackRebateTypePortal.toLowerCase().includes("rebate");
      if (hasCashbackPortal && isRebateTypePortal) {
        const rebateFormattedPortal = `$${formatNumberWithCommas(cashbackRebateValuePortal)}`;
        // Use dynamic label based on cashbackRebateType: "Rebate:" (always "Rebate" for rebate types)
        purchaseHtmlPortal += `<p><strong>Rebate:</strong> <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${rebateFormattedPortal}</span></p>`;
        purchaseTextPortal += textLine("Rebate", rebateFormattedPortal);
      }

      // Comparable Sales: Always show (mandatory field)
      if (comparableSalesPortal) {
        const csNormPortal = normaliseNewlines(comparableSalesPortal);
        purchaseHtmlPortal += `<p><strong>Comparable Sales:</strong> ${csNormPortal
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .join("<br>")}</p>`;
        purchaseTextPortal += `Comparable Sales: ${comparableSalesPortal}\n`;
      }

    } else if (isEstablishedPortal) {
      // ESTABLISHED PROPERTIES
      // Format Asking: Combine asking type + asking_text into "Asking: [type] - [price]"
      let askingDisplayPortal = "";
      if (askingPortal && askingTextPortal) {
        const niceAskingPortal = neatValue(askingPortal);
        askingDisplayPortal = `${niceAskingPortal} - ${askingTextPortal}`;
      } else if (askingPortal) {
        askingDisplayPortal = neatValue(askingPortal);
      } else if (askingTextPortal) {
        askingDisplayPortal = askingTextPortal;
      }

      if (askingDisplayPortal) {
        purchaseHtmlPortal += htmlLine("Asking", askingDisplayPortal);
        purchaseTextPortal += textLine("Asking", askingDisplayPortal);
      }

      // Comparable Sales: Always show (mandatory field)
      if (comparableSalesPortal) {
        const csNormPortal = normaliseNewlines(comparableSalesPortal);
        purchaseHtmlPortal += `<p><strong>Comparable Sales:</strong> ${csNormPortal
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .join("<br>")}</p>`;
        purchaseTextPortal += `Comparable Sales: ${comparableSalesPortal}\n`;
      }

      // Accepted Acquisition Target: Show for Established
      let acquisitionTargetDisplayPortal = "";
      if (acceptableFromPortal && acceptableToPortal) {
        acquisitionTargetDisplayPortal = `$${formatNumberWithCommas(acceptableFromPortal)} - $${formatNumberWithCommas(acceptableToPortal)}`;
      } else if (acceptableFromPortal) {
        acquisitionTargetDisplayPortal = `$${formatNumberWithCommas(acceptableFromPortal)}`;
      } else if (acceptableToPortal) {
        acquisitionTargetDisplayPortal = `$${formatNumberWithCommas(acceptableToPortal)}`;
      }

      if (acquisitionTargetDisplayPortal) {
        purchaseHtmlPortal += htmlLine("Accepted Acquisition Target", acquisitionTargetDisplayPortal);
        purchaseTextPortal += textLine("Accepted Acquisition Target", acquisitionTargetDisplayPortal);
      }

      // Cashback/Rebate: Show Value (but NOT Type) for Established with 03_internal_with_comms contract type
      // For Established properties, deal_type can be "03_internal_with_comms", "04_internal_nocomms", or "05_established"
      const isInternalWithCommsPortal = dealTypePortal && dealTypePortal === "03_internal_with_comms";
      if (isInternalWithCommsPortal && hasCashbackPortal) {
        const cashbackFormattedPortal = `$${formatNumberWithCommas(cashbackRebateValuePortal)}`;
        // Use dynamic label based on cashbackRebateType: "Cashback:" or "Rebate:"
        const cashbackLabelPortal = cashbackRebateTypePortal && cashbackRebateTypePortal.toLowerCase().includes("rebate") ? "Rebate" : "Cashback";
        // Make the dollar amount stand out with lighter grey background and white text (softer look)
        purchaseHtmlPortal += `<p><strong>${cashbackLabelPortal}:</strong> <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${cashbackFormattedPortal}</span></p>`;
        purchaseTextPortal += textLine(cashbackLabelPortal, cashbackFormattedPortal);
      }
      // Do NOT show Net Price for Established (even if cashback exists)
    }

    // Purchase Price Dialogue: Show if exists (optional field)
    if (purchasePriceDialoguePortal) {
      purchaseHtmlPortal += `<br>`;
      purchaseHtmlPortal += `<p>*${purchasePriceDialoguePortal}</p>`;
      purchaseTextPortal += `\n*${purchasePriceDialoguePortal}\n`;
    }
    purchaseTextPortal += "\n";
  }
  
  let rentalHtmlPortal = "";
  let rentalTextPortal = "";
  if (hasAnyPortal("occupancy", "occupancy_primary", "occupancy_secondary", "current_rent_primary__per_week", "current_rent_primary_per_week", "current_rent_secondary__per_week", "current_rent_secondary_per_week", "expiry_primary", "expiry_secondary", "yield", "rent_appraisal_primary_from", "rent_appraisal_primary_to", "rent_appraisal_secondary_from", "rent_appraisal_secondary_to", "appraised_yield", "rental_assessment_additional_dialogue")) {
    rentalTextPortal += "Rental Assessment\n";
    
    // For single occupancy, use occupancyPrimaryPortal if occupancyPortal is not available
    const occupancyValuePortal = !isDualPortal ? (occupancyPortal || occupancyPrimaryPortal) : occupancyPortal;
    
    // Use exact match for occupancy (matches form logic)
    const occLowerPortal = occupancyValuePortal ? occupancyValuePortal.toLowerCase() : "";
    const isTenantedPortal = occLowerPortal === "tenanted"; // Exact match: only "tenanted"
    // Note: For "New" properties (H&L, Projects), there would be no tenant, so these fields won't show
    
    if (!isDualPortal) {
      // Single occupancy format
      // Only show Occupancy for Established properties (not for new properties: H&L, SMSF, Projects)
      if (isEstablishedPortal) {
        const occupancyRawPortal = occupancyPortal || occupancyPrimaryPortal || "";
        const displayOccupancyPortal = formatOccupancy(occupancyRawPortal);
        rentalHtmlPortal += htmlLine("Occupancy", displayOccupancyPortal);
      }
      // Always show Current Rent, Expiry, and Current Yield for Established AND tenanted (even if null)
      // These are mandatory fields in the form for tenanted properties
      if (isEstablishedPortal && isTenantedPortal) {
        // Always show Current Rent (even if null/empty - indicates data issue)
        rentalHtmlPortal += htmlLine("Current Rent", currentRentPrimaryPortal ? formatCurrentRent(currentRentPrimaryPortal) : "");
        // Always show Expiry (even if null/empty)
        rentalHtmlPortal += htmlLine("Expiry", expiryPrimaryPortal || "");
        // Always show Current Yield (even if null/empty)
        rentalHtmlPortal += htmlLine("Current Yield", yieldPctPortal || "");
      }
      const appraisalRangePortal = formatRentAppraisalRange(rentAppraisalPrimaryFromPortal, rentAppraisalPrimaryToPortal);
      if (appraisalRangePortal) {
        rentalHtmlPortal += htmlLine("Appraisal", appraisalRangePortal);
      }
      if (appraisedYieldPortal) {
        rentalHtmlPortal += htmlLine("Appraised Yield", appraisedYieldPortal);
      }

      // Text version - only show Occupancy for Established properties
      if (isEstablishedPortal) {
        const occupancyRawPortal = occupancyPortal || occupancyPrimaryPortal || "";
        const displayOccupancyPortal = formatOccupancy(occupancyRawPortal);
        rentalTextPortal += textLine("Occupancy", displayOccupancyPortal);
      }
      // Always show Current Rent, Expiry, and Current Yield for Established AND tenanted (even if null)
      // These are mandatory fields in the form for tenanted properties
      if (isEstablishedPortal && isTenantedPortal) {
        // Always show Current Rent (even if null/empty)
        rentalTextPortal += textLine("Current Rent", currentRentPrimaryPortal ? formatCurrentRent(currentRentPrimaryPortal) : "");
        // Always show Expiry (even if null/empty)
        rentalTextPortal += textLine("Expiry", expiryPrimaryPortal || "");
        // Always show Current Yield (even if null/empty)
        rentalTextPortal += textLine("Current Yield", yieldPctPortal || "");
      }
      if (appraisalRangePortal) {
        rentalTextPortal += textLine("Appraisal", appraisalRangePortal);
      }
      if (appraisedYieldPortal) {
        rentalTextPortal += textLine("Appraised Yield", appraisedYieldPortal);
      }
    } else {
      // Dual occupancy format
      // Use exact match for occupancy (matches form logic)
      const occPrimaryLowerPortal = occupancyPrimaryPortal ? occupancyPrimaryPortal.toLowerCase() : "";
      const occSecondaryLowerPortal = occupancySecondaryPortal ? occupancySecondaryPortal.toLowerCase() : "";
      const isTenantedPrimaryPortal = occPrimaryLowerPortal === "tenanted"; // Exact match: only "tenanted"
      const isTenantedSecondaryPortal = occSecondaryLowerPortal === "tenanted"; // Exact match: only "tenanted"
      
      // Occupancy - only show for Established properties (not for new properties: H&L, SMSF, Projects)
      if (isEstablishedPortal) {
        rentalHtmlPortal += `<p><strong>Occupancy:</strong></p>`;
        if (occupancyPrimaryPortal) {
          rentalHtmlPortal += `<p>Unit A: ${formatOccupancy(occupancyPrimaryPortal)}</p>`;
        }
        if (occupancySecondaryPortal) {
          rentalHtmlPortal += `<p>Unit B: ${formatOccupancy(occupancySecondaryPortal)}</p>`;
        }
      }
      
      // Current Rent - Always show for Established properties if at least one unit is tenanted (even if null)
      if (isEstablishedPortal && (isTenantedPrimaryPortal || isTenantedSecondaryPortal)) {
        const pRentNumPortal = toNumber(currentRentPrimaryPortal) || 0;
        const sRentNumPortal = toNumber(currentRentSecondaryPortal) || 0;
        const totalRentNumPortal = pRentNumPortal + sRentNumPortal;
        
        rentalHtmlPortal += `<p><strong>Current Rent:</strong></p>`;
        // Always show Total (even if 0/null)
        rentalHtmlPortal += `<p>Total: ${formatCurrentRent(totalRentNumPortal > 0 ? totalRentNumPortal : "")}</p>`;
        // Always show Unit A if tenanted (even if null)
        if (isTenantedPrimaryPortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit A: ${currentRentPrimaryPortal ? formatCurrentRent(currentRentPrimaryPortal) : ""}</p>`;
        } else if (occupancyPrimaryPortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit A: N/A</p>`;
        }
        // Always show Unit B if tenanted (even if null)
        if (isTenantedSecondaryPortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit B: ${currentRentSecondaryPortal ? formatCurrentRent(currentRentSecondaryPortal) : ""}</p>`;
        } else if (occupancySecondaryPortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit B: N/A</p>`;
        }
      }
      
      // Expiry - Always show for Established properties if at least one unit is tenanted (even if null)
      if (isEstablishedPortal && (isTenantedPrimaryPortal || isTenantedSecondaryPortal)) {
        rentalHtmlPortal += `<p><strong>Expiry:</strong></p>`;
        // Always show Unit A if tenanted (even if null)
        if (isTenantedPrimaryPortal) {
          rentalHtmlPortal += `<p>Unit A: ${expiryPrimaryPortal || ""}</p>`;
        } else if (occupancyPrimaryPortal) {
          rentalHtmlPortal += `<p>Unit A: N/A</p>`;
        }
        // Always show Unit B if tenanted (even if null)
        if (isTenantedSecondaryPortal) {
          rentalHtmlPortal += `<p>Unit B: ${expirySecondaryPortal || ""}</p>`;
        } else if (occupancySecondaryPortal) {
          rentalHtmlPortal += `<p>Unit B: N/A</p>`;
        }
      }
      
      // Current Yield - Always show if Established AND at least one unit is tenanted (even if null)
      if (isEstablishedPortal && (isTenantedPrimaryPortal || isTenantedSecondaryPortal)) {
        rentalHtmlPortal += htmlLine("Current Yield", yieldPctPortal || "");
      }
      
      // Appraisal
      const appraisalPrimaryRangePortal = formatRentAppraisalRange(rentAppraisalPrimaryFromPortal, rentAppraisalPrimaryToPortal);
      const appraisalSecondaryRangePortal = formatRentAppraisalRange(rentAppraisalSecondaryFromPortal, rentAppraisalSecondaryToPortal);
      const appraisalTotalFromPortal = (toNumber(rentAppraisalPrimaryFromPortal) || 0) + (toNumber(rentAppraisalSecondaryFromPortal) || 0);
      const appraisalTotalToPortal = (toNumber(rentAppraisalPrimaryToPortal) || 0) + (toNumber(rentAppraisalSecondaryToPortal) || 0);
      const appraisalTotalRangePortal = formatRentAppraisalRange(appraisalTotalFromPortal, appraisalTotalToPortal);
      
      if (appraisalPrimaryRangePortal || appraisalSecondaryRangePortal) {
        rentalHtmlPortal += `<p><strong>Appraisal:</strong></p>`;
        if (appraisalTotalRangePortal) {
          rentalHtmlPortal += `<p>Total: ${appraisalTotalRangePortal}</p>`;
        }
        if (appraisalPrimaryRangePortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit A: ${appraisalPrimaryRangePortal}</p>`;
        }
        if (appraisalSecondaryRangePortal) {
          rentalHtmlPortal += `<p style="margin-left: 30px;">Unit B: ${appraisalSecondaryRangePortal}</p>`;
        }
      }
      
      // Appraised Yield
      if (appraisedYieldPortal) {
        rentalHtmlPortal += htmlLine("Appraised Yield", appraisedYieldPortal);
      }

      // Text version - only show Occupancy for Established properties
      if (isEstablishedPortal) {
        rentalTextPortal += "Occupancy:\n";
        if (occupancyPrimaryPortal) {
          rentalTextPortal += `Unit A: ${formatOccupancy(occupancyPrimaryPortal)}\n`;
        }
        if (occupancySecondaryPortal) {
          rentalTextPortal += `Unit B: ${formatOccupancy(occupancySecondaryPortal)}\n`;
        }
      }
      // Current Rent - only show for Established properties (new properties never have tenants)
      if (isEstablishedPortal) {
        const pRentNumPortal = toNumber(currentRentPrimaryPortal) || 0;
        const sRentNumPortal = toNumber(currentRentSecondaryPortal) || 0;
        const totalRentNumPortal = pRentNumPortal + sRentNumPortal;
        
        rentalTextPortal += "Current Rent:\n";
        if (totalRentNumPortal > 0 || (isTenantedPrimaryPortal && currentRentPrimaryPortal) || (isTenantedSecondaryPortal && currentRentSecondaryPortal)) {
          rentalTextPortal += `Total: ${formatCurrentRent(totalRentNumPortal > 0 ? totalRentNumPortal : "")}\n`;
        }
        if (isTenantedPrimaryPortal && currentRentPrimaryPortal) {
          rentalTextPortal += `    Unit A: ${formatCurrentRent(currentRentPrimaryPortal)}\n`;
        } else if (occupancyPrimaryPortal) {
          rentalTextPortal += `    Unit A: N/A\n`;
        }
        if (isTenantedSecondaryPortal && currentRentSecondaryPortal) {
          rentalTextPortal += `    Unit B: ${formatCurrentRent(currentRentSecondaryPortal)}\n`;
        } else if (occupancySecondaryPortal) {
          rentalTextPortal += `    Unit B: N/A\n`;
        }
      }
      // Expiry - only show for Established properties (new properties never have tenants)
      if (isEstablishedPortal) {
        rentalTextPortal += "Expiry:\n";
        if (isTenantedPrimaryPortal && expiryPrimaryPortal) {
          rentalTextPortal += `Unit A: ${expiryPrimaryPortal}\n`;
        } else if (occupancyPrimaryPortal) {
          rentalTextPortal += `Unit A: N/A\n`;
        }
        if (isTenantedSecondaryPortal && expirySecondaryPortal) {
          rentalTextPortal += `Unit B: ${expirySecondaryPortal}\n`;
        } else if (occupancySecondaryPortal) {
          rentalTextPortal += `Unit B: N/A\n`;
        }
      }
      // Current Yield - only show if Established AND at least one unit is tenanted (new properties never have tenants)
      if (isEstablishedPortal && (isTenantedPrimaryPortal || isTenantedSecondaryPortal) && yieldPctPortal) {
        rentalTextPortal += textLine("Current Yield", yieldPctPortal);
      }
      if (appraisalPrimaryRangePortal || appraisalSecondaryRangePortal) {
        rentalTextPortal += "Appraisal:\n";
        if (appraisalTotalRangePortal) {
          rentalTextPortal += `Total: ${appraisalTotalRangePortal}\n`;
        }
        if (appraisalPrimaryRangePortal) {
          rentalTextPortal += `    Unit A: ${appraisalPrimaryRangePortal}\n`;
        }
        if (appraisalSecondaryRangePortal) {
          rentalTextPortal += `    Unit B: ${appraisalSecondaryRangePortal}\n`;
        }
      }
      if (appraisedYieldPortal) {
        rentalTextPortal += textLine("Appraised Yield", appraisedYieldPortal);
      }
    }
    if (rentalAssessmentDialoguePortal) {
      rentalHtmlPortal += `<br>`;
      rentalHtmlPortal += `<p>*${rentalAssessmentDialoguePortal}</p>`;
      rentalTextPortal += `\n*${rentalAssessmentDialoguePortal}\n`;
    }
    rentalTextPortal += "\n";
  }
  
  let proximityHtmlPortal = "";
  let proximityTextPortal = "";
  if (proximityPortal) {
    proximityHtmlPortal = formatProximityHtml(proximityPortal);
    proximityTextPortal += "Proximity\n";
    proximityTextPortal += `${proximityPortal}\n\n`;
  }
  
  let marketHtmlPortal = "";
  let marketTextPortal = "";
  if (hasAnyPortal("median_price_change__3_months", "median_price_change__1_year", "median_price_change__3_year", "median_price_change__5_year", "median_yield", "median_rent_change__1_year", "rental_population", "vacancy_rate", "market_performance_additional_dialogue")) {
    marketHtmlPortal += htmlLineMarket("Median Price Change – 3 months", mp3mPortal);
    marketHtmlPortal += htmlLineMarket("Median Price Change – 1 year", mp1yPortal);
    marketHtmlPortal += htmlLineMarket("Median Price Change – 3 years", mp3yPortal);
    marketHtmlPortal += htmlLineMarket("Median Price Change – 5 years", mp5yPortal);
    marketHtmlPortal += htmlLineMarket("Median Yield", medianYieldPortal);
    marketHtmlPortal += htmlLineMarket("Median Rent Change – 1 year", rentChange1yPortal);
    marketHtmlPortal += htmlLineMarket("Rental Population", rentalPopulationPortal);
    marketHtmlPortal += htmlLineMarket("Vacancy Rate", vacancyRatePortal);
    if (mpDialoguePortal) {
      marketHtmlPortal += `<br>`;
      marketHtmlPortal += `<p>*${mpDialoguePortal}</p>`;
    }
    marketTextPortal += "Market Performance\n";
    marketTextPortal += textLineMarket("Median Price Change – 3 months", mp3mPortal);
    marketTextPortal += textLineMarket("Median Price Change – 1 year", mp1yPortal);
    marketTextPortal += textLineMarket("Median Price Change – 3 years", mp3yPortal);
    marketTextPortal += textLineMarket("Median Price Change – 5 years", mp5yPortal);
    marketTextPortal += textLineMarket("Median Yield", medianYieldPortal);
    marketTextPortal += textLineMarket("Median Rent Change – 1 year", rentChange1yPortal);
    marketTextPortal += textLineMarket("Rental Population", rentalPopulationPortal);
    marketTextPortal += textLineMarket("Vacancy Rate", vacancyRatePortal);
    if (mpDialoguePortal) {
      marketTextPortal += `\n*${mpDialoguePortal}\n`;
    }
    marketTextPortal += "\n";
  }
  
  let highlightsHtmlPortal = "";
  let highlightsTextPortal = "";
  if (investmentHighlightsPortal) {
    highlightsHtmlPortal = formatInvestmentHighlightsHtml(investmentHighlightsPortal);
    highlightsTextPortal += "Investment Highlights\n";
    highlightsTextPortal += `${investmentHighlightsPortal}\n\n`;
  }
  
  let attachmentsInnerHtmlPortal = "";
  if (folderLinkPortal) {
    attachmentsInnerHtmlPortal += `<p><strong>CLICK</strong> this link to view supporting documents for this property:</p>`;
    attachmentsInnerHtmlPortal += `<p><a href="${folderLinkPortal}" target="_blank">${propertyAddressPortal || folderLinkPortal}</a></p>`;
    attachmentsInnerHtmlPortal += `<p style="font-size: 14px; font-style: italic; color: #888;">Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.</p>`;
    attachmentsInnerHtmlPortal += `<p style="font-size: 14px; font-style: italic; color: #888;">With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.</p>`;
  } else {
    attachmentsInnerHtmlPortal += `<p><strong>CLICK</strong> this link to view supporting documents for this property:</p>`;
    attachmentsInnerHtmlPortal += `<p><a href="#" target="_blank">${propertyAddressPortal || "[Link not available]"}</a></p>`;
    attachmentsInnerHtmlPortal += `<p style="font-size: 14px; font-style: italic; color: #888;">Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.</p>`;
    attachmentsInnerHtmlPortal += `<p style="font-size: 14px; font-style: italic; color: #888;">With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.</p>`;
  }
  if (attachmentsDialoguePortal) {
    attachmentsInnerHtmlPortal += `<br>`;
    attachmentsInnerHtmlPortal += `<p>*${attachmentsDialoguePortal}</p>`;
  }
  
  let attachmentsTextPortal = "Supporting Documents\n";
  if (folderLinkPortal) {
    attachmentsTextPortal += `CLICK this link to view supporting documents for this property:\n${propertyAddressPortal || folderLinkPortal} (${folderLinkPortal})\n`;
  } else {
    attachmentsTextPortal += `CLICK this link to view supporting documents for this property:\n${propertyAddressPortal || "[Link not available]"}\n`;
  }
  attachmentsTextPortal += "Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.\n";
  attachmentsTextPortal += "With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.\n";
  if (attachmentsDialoguePortal) {
    attachmentsTextPortal += `\n*${attachmentsDialoguePortal}\n`;
  }
  
  // Validate that we have property data before building email
  const hasPropertyData = whyThisPropertyPortal || propertyAddressPortal || bedsPrimaryPortal || 
                          whyHtmlPortal || addressHtmlPortal || propertyDescHtmlPortal;
  
  if (!hasPropertyData) {
    console.log("Module 3 Portal - ERROR: No property data found! Cannot build email.");
    console.log("Module 3 Portal - Check Module 6's output - it should fetch GHL record data.");
    console.log("Module 3 Portal - This might happen if:");
    console.log("Module 3 Portal - 1. Module 6 failed to fetch GHL record");
    console.log("Module 3 Portal - 2. Input Variable 'Module6_Data' is not mapped correctly");
    console.log("Module 3 Portal - 3. GHL record was deleted or doesn't exist");
    return {
      error: "No property data found. Cannot build email. Check Module 6's output and GHL record.",
      to: "",
      subject: "",
      htmlBody: "",
      textBody: "",
      source: "portal"
    };
  }
  
  // Build property sections HTML string
  const propertySectionsHtml = `
                ${sectionRow("Why This Property", whyHtmlPortal)}
                ${sectionRow("Address", addressHtmlPortal)}
                ${sectionRow("Google Map", googleMapHtmlPortal)}
                ${sectionRow("Property Description", propertyDescHtmlPortal)}
                ${sectionRow("Property Overlays", overlaysHtmlPortal)}
                ${sectionRow("Purchase Price", purchaseHtmlPortal)}
                ${sectionRow("Rental Assessment", rentalHtmlPortal)}
                ${sectionRow("Proximity", proximityHtmlPortal)}
                ${sectionRow("Market Performance", marketHtmlPortal)}
                ${sectionRow("Investment Highlights", highlightsHtmlPortal)}
                ${sectionRow("Supporting Documents", attachmentsInnerHtmlPortal)}
              `;
  
  // Build text body
  let textBodyPortal = "";
  if (whyThisPropertyPortal) {
    textBodyPortal += `Why This Property\n${whyThisPropertyPortal}\n\n`;
  }
  if (propertyAddressPortal) {
    textBodyPortal += `Address\n${propertyAddressPortal.toUpperCase()}\n\n`;
  }
  if (googleMapPortal) {
    textBodyPortal += `Google Map\n${googleMapPortal}\n\n`;
  }
  textBodyPortal += propertyDescTextPortal;
  textBodyPortal += overlaysTextPortal;
  textBodyPortal += purchaseTextPortal;
  textBodyPortal += rentalTextPortal;
  textBodyPortal += proximityTextPortal;
  textBodyPortal += marketTextPortal;
  textBodyPortal += highlightsTextPortal;
  textBodyPortal += attachmentsTextPortal;
  
  // Process each selected client and build email objects
  const clientEmails = selectedClients.map((client) => {
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
    
    // Build HTML email body with property details
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Review: ${escapeHtml(propertyAddressPortal || propertyAddress)}</title>
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
          <!-- Property Details -->
          <tr>
            <td style="padding: 0;">
              <table class="main-table" role="presentation" cellpadding="0" cellspacing="0">
                ${propertySectionsHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    const textBody = `${clientMessage}\n\n${textBodyPortal}`;
    
    return {
      to: toEmail,
      subject: `Property Review: ${propertyAddressPortal || propertyAddress}`,
      htmlBody: htmlBody,
      textBody: textBody,
      baEmail: baEmail,
      baName: baName,
      sendFromEmail: sendFromEmail, // Include sendFromEmail for tracking
      propertyAddress: propertyAddressPortal || propertyAddress, // Include property address for logging
      clientInfo: {
        opportunityId: client.id || '',
        opportunityName: client.name || '',
        clientName: client.clientName || '',
        partnerName: client.partnerName || '',
        messageType: client.type || 'standard' // Include message type for logging
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

// 3) Read core fields
const whyThisProperty = v("why_this_property");
const propertyAddress = v("property_address");
const googleMap = v("google_map");

// Define propertyId for button URLs
const propertyId = propertyAddress || v("property_address") || "";

// Get the record ID from GHL webhook data (check both ID and id)
const recordId = v("id") || v("ID") || idValue || "";

const bedsPrimary = v("beds_primary");
const bedsSecondary = v("beds_secondary") || v("beds_additional__secondary__dual_key");
const bathPrimary = v("bath_primary");
const bathSecondary = v("bath_secondary") || v("baths_additional__secondary__dual_key");
const garagePrimary = v("garage_primary");
const garageSecondary = v("garage_secondary") || v("garage_additional__secondary__dual_key");
const carportPrimary = v("carport_primary");
const carportSecondary = v("carport_secondary") || v("carport_additional__secondary__dual_key");
const carspacePrimary = v("carspace_primary");
const carspaceSecondary = v("carspace_secondary") || v("carspace_additional__secondary__dual_key");

const yearBuilt = v("year_built");
const landRegistration = v("land_registration");
const buildSize = v("build_size");
const landSize = v("land_size");
const title = v("title");
const bodyCorpQuarter = v("body_corp__per_quarter");
const bodyCorpDescription = v("body_corp_description");

// Overlays
const zoning = v("zoning");
const flood = v("flood");
const floodDialogue = v("flood_dialogue");
const bushfire = v("bushfire");
const bushfireDialogue = v("bushfire_dialogue");
const mining = v("mining");
const miningDialogue = v("mining_dialogue") || v("mining_dialogie"); // Handle typo in GHL field name
const otherOverlay = v("other_overlay");
const otherOverlayDialogue = v("other_overlay_dialogue");
const specialInfra = v("special_infrastructure");
const specialInfraDialogue = v("special_infrastructure_dialogue");
const dueDiligenceAcceptance = v("due_diligence_acceptance");

// Purchase price
const asking = v("asking");
const askingText = v("asking_text");
const comparableSales = v("comparable_sales");
const acceptableFrom = v("acceptable_acquisition__from") || v("acceptable_acquisition_from");
const acceptableTo = v("acceptable_acquisition__to") || v("acceptable_acquisition_to");
const purchasePriceDialogue = v("purchase_price_additional_dialogue");
// H&L price fields
const landPrice = v("land_price");
const buildPrice = v("build_price");
const totalPrice = v("total_price");
// Cashback/Rebate fields
const cashbackRebateValue = v("cashback_rebate_value");
const cashbackRebateType = v("cashback_rebate_type");

// Rental assessment
const occupancy = v("occupancy");
const occupancyPrimary = v("occupancy_primary");
const occupancySecondary = v("occupancy_secondary");
const currentRentPrimary = v("current_rent_primary__per_week") || v("current_rent_primary_per_week");
const currentRentSecondary = v("current_rent_secondary__per_week") || v("current_rent_secondary_per_week");
const expiryPrimary = v("expiry_primary");
const expirySecondary = v("expiry_secondary");
const yieldPct = v("yield");
const rentAppraisalPrimaryFrom = v("rent_appraisal_primary_from");
const rentAppraisalPrimaryTo = v("rent_appraisal_primary_to");
const rentAppraisalSecondaryFrom = v("rent_appraisal_secondary_from");
const rentAppraisalSecondaryTo = v("rent_appraisal_secondary_to");
const appraisedYield = v("appraised_yield");
const rentalAssessmentDialogue = v("rental_assessment_additional_dialogue");
const dualFlag = v("does_this_property_have_2_dwellings");

// Proximity
const proximity = v("proximity");

// Market performance
const mp3m = v("median_price_change__3_months");
const mp1y = v("median_price_change__1_year");
const mp3y = v("median_price_change__3_year");
const mp5y = v("median_price_change__5_year");
const medianYield = v("median_yield");
const rentChange1y = v("median_rent_change__1_year");
const rentalPopulation = v("rental_population");
const vacancyRate = v("vacancy_rate");
const mpDialogue = v("market_performance_additional_dialogue");

// Investment highlights
const investmentHighlights = v("investment_highlights");

// Attachments dialogue
const attachmentsDialogue = v("attachments_additional_dialogue");
const folderLink = v("folder_link") || v("folderLink");

// Message for BA (packager to BA communication)
const messageForBA = v("message_for_ba") || v("message_for_ba_field") || "";

// Simple dual-income detection
// Check if secondary values actually exist and are meaningful (not just "0" or empty)
const hasBedsSecondary = bedsSecondary && bedsSecondary !== "0" && bedsSecondary.trim() !== "";
const hasCurrentRentSecondary = currentRentSecondary && currentRentSecondary !== "0" && currentRentSecondary.trim() !== "";
const isDual =
  (dualFlag && dualFlag.toLowerCase().includes("yes")) ||
  hasBedsSecondary ||
  hasCurrentRentSecondary;

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

// Read fields for subject line formatting
const propertyType = v("property_type");
const dealType = v("deal_type");
const contractTypeSimplified = v("contract_type"); // "Single Contract" or "Split Contract" for H&L properties
const templateType = v("template_type");
const singleOrDual = v("single_or_dual_occupancy");
const lotNumber = v("lot_number");
const projectName = v("project_name");
const isParentRecord = v("is_parent_record");
const suburbName = v("suburb_name");
const state = v("state");
const postCode = v("post_code");

// Calculate total beds for dual-key
const bedsPrimaryNum = bedsPrimary ? parseInt(bedsPrimary) : 0;
const bedsSecondaryNum = bedsSecondary ? parseInt(bedsSecondary) : 0;
const totalBeds = bedsPrimaryNum + bedsSecondaryNum;

// Determine occupancy type text
let occupancyType = "";
if (singleOrDual && (singleOrDual.toLowerCase().includes("dual") || singleOrDual.toLowerCase().includes("2"))) {
  occupancyType = "Dual-key";
} else if (singleOrDual && singleOrDual.toLowerCase().includes("single")) {
  occupancyType = "Single Family";
}

// Build subject line based on property type
let reviewRule = "Property Review";
const isProject = (templateType && templateType.toLowerCase() === "project") || (isParentRecord && isParentRecord.toLowerCase() === "yes");
const isEstablished = (propertyType && propertyType.toLowerCase() === "established") || (dealType && dealType === "05_established");
const isHAndL = (propertyType && propertyType.toLowerCase() === "new") && (dealType && dealType === "01_hl_comms") && !isProject;
const isSMSF = (propertyType && propertyType.toLowerCase() === "new") && dealType && (dealType === "02_single_comms" || dealType === "03_internal_with_comms" || dealType === "04_internal_nocomms");

if (isProject) {
  // Project format: "Property Review (H&L Project): PROJECT NAME, SUBURB, STATE POSTCODE"
  // or "Property Review (SMSF Project): PROJECT NAME, SUBURB, STATE POSTCODE"
  const projectType = isHAndL ? "H&L Project" : (isSMSF ? "SMSF Project" : "Project");
  const projectAddress = [projectName, suburbName, state, postCode].filter(Boolean).join(", ");
  reviewRule = projectAddress ? `Property Review (${projectType}): ${projectAddress.toUpperCase()}` : `Property Review (${projectType})`;
} else if (isEstablished) {
  // Established format: "Property Review: ADDRESS"
  const subjectAddress = propertyAddress ? propertyAddress.toUpperCase() : "";
  reviewRule = subjectAddress ? `Property Review: ${subjectAddress}` : "Property Review";
} else if (isHAndL || isSMSF) {
  // H&L or SMSF format: "Property Review (H&L X-bed Dual-key): LOT ADDRESS"
  // or "Property Review (SMSF X-bed Single Family): LOT ADDRESS"
  // Use contract_type to distinguish: "Single Contract" = SMSF, "Split Contract" = H&L
  // If contract_type is not available, fall back to dealType logic
  let typePrefix = "H&L"; // Default
  if (contractTypeSimplified && contractTypeSimplified.toLowerCase() === "single contract") {
    typePrefix = "SMSF";
  } else if (contractTypeSimplified && contractTypeSimplified.toLowerCase() === "split contract") {
    typePrefix = "H&L";
  } else {
    // Fallback to original logic
    typePrefix = isHAndL ? "H&L" : "SMSF";
  }
  const bedText = totalBeds > 0 ? `${totalBeds}-bed` : "";
  const typeText = occupancyType || "";
  const propertyTypeText = [typePrefix, bedText, typeText].filter(Boolean).join(" ");
  
  // Add "LOT" prefix if lot number exists AND address doesn't already contain "LOT"
  let addressPart = propertyAddress ? propertyAddress.toUpperCase() : "";
  if (lotNumber && lotNumber.trim() !== "" && addressPart && !addressPart.toUpperCase().includes("LOT")) {
    addressPart = `LOT ${lotNumber.toUpperCase()} ${addressPart}`;
  }
  reviewRule = addressPart ? `Property Review (${propertyTypeText}): ${addressPart}` : `Property Review (${propertyTypeText})`;
} else {
  // Fallback: simple format
  const subjectAddress = propertyAddress ? propertyAddress.toUpperCase() : "";
  reviewRule = subjectAddress ? `Property Review: ${subjectAddress}` : "Property Review";
}

const subject = `${subjectPrefix}${reviewRule}`;

// Webhook URLs
// NOTE: This is Make.com module code - webhook URL should be configured in Make.com scenario settings
// Keeping hardcoded value here for reference/documentation purposes
const APPROVAL_WEBHOOK = "https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk";
const PORTAL_URL = "https://buyersclub123.github.io/property-portal";
const CONFIRMATION_URL = "https://buyersclub123.github.io/property-portal/Confirmation.html";

// 5) Build HTML body

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

let googleMapHtml = "";
if (googleMap) {
  const mapLink = googleMap;
  googleMapHtml += `<p><a href="${mapLink}" target="_blank">${propertyAddress || mapLink}</a></p>`;
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
    "land_registration",
    "build_size",
    "land_size",
    "title",
    "body_corp__per_quarter",
    "property_description_additional_dialogue"
  )
) {
  let bedsDisplay = "";
  if (isDual && bedsPrimary && bedsSecondary) {
    bedsDisplay = `${bedsPrimary} + ${bedsSecondary}`;
  } else if (bedsPrimary) {
    bedsDisplay = bedsPrimary;
  }

  // Convert "point" to "." for bath values (GHL stores as "2point5" but should display as "2.5")
  const formatBathValue = (val) => {
    if (!val) return "";
    return String(val).replace(/point/gi, ".");
  };
  
  let bathsDisplay = "";
  if (isDual && bathPrimary && bathSecondary) {
    bathsDisplay = `${formatBathValue(bathPrimary)} + ${formatBathValue(bathSecondary)}`;
  } else if (bathPrimary) {
    bathsDisplay = formatBathValue(bathPrimary);
  }

  // Helper: Convert value to number, defaulting to 0 if null/undefined/empty (but 0 is valid)
  const toNum = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const num = parseInt(val);
    return isNaN(num) ? 0 : num;
  };
  
  // Helper: Check if value exists (not null/undefined/empty, but 0 is considered existing)
  const hasValue = (val) => val !== null && val !== undefined && val !== "";
  
  const garagePrimaryNum = toNum(garagePrimary);
  const garageSecondaryNum = toNum(garageSecondary);
  const carportPrimaryNum = toNum(carportPrimary);
  const carportSecondaryNum = toNum(carportSecondary);
  const carspacePrimaryNum = toNum(carspacePrimary);
  const carspaceSecondaryNum = toNum(carspaceSecondary);
  
  // Determine display logic
  let garageDisplay = "";
  let carportDisplay = "";
  let carspaceDisplay = "";
  
  if (isDual) {
    // DUAL OCCUPANCY LOGIC
    // Garage: Show if either side has garage (value > 0), or if neither side has garage AND no carport/carspace exists
    const hasGarageEitherSide = garagePrimaryNum > 0 || garageSecondaryNum > 0;
    const hasCarportEitherSide = hasValue(carportPrimary) || hasValue(carportSecondary);
    const hasCarspaceEitherSide = hasValue(carspacePrimary) || hasValue(carspaceSecondary);
    
    if (hasGarageEitherSide) {
      // Either side has garage → show both sides (including 0s)
      garageDisplay = `${garagePrimaryNum} + ${garageSecondaryNum}`;
    } else if (!hasCarportEitherSide && !hasCarspaceEitherSide) {
      // Neither side has garage AND no carport/carspace → show "0 + 0"
      garageDisplay = "0 + 0";
    }
    // If neither side has garage BUT carport/carspace exists → don't show garage (handled above)
    
    // Carport: Only show if either side has a value
    if (hasCarportEitherSide) {
      carportDisplay = `${carportPrimaryNum} + ${carportSecondaryNum}`;
    }
    
    // Carspace: Only show if either side has a value
    if (hasCarspaceEitherSide) {
      carspaceDisplay = `${carspacePrimaryNum} + ${carspaceSecondaryNum}`;
    }
  } else {
    // SINGLE OCCUPANCY LOGIC
    const hasCarportPrimary = hasValue(carportPrimary);
    const hasCarspacePrimary = hasValue(carspacePrimary);
    const hasGaragePrimary = hasValue(garagePrimary);
    
    // Garage: Always show (even if 0), UNLESS primary carport/carspace has value
    if (!hasCarportPrimary && !hasCarspacePrimary) {
      // No carport/carspace → always show garage (even if 0)
      garageDisplay = String(garagePrimaryNum);
    } else if (garagePrimaryNum > 0) {
      // Garage has value AND carport/carspace exists → show all
      garageDisplay = String(garagePrimaryNum);
    }
    // If garage=0 and carport/carspace exists → don't show garage
    
    // Carport: Only show if primary has a value
    if (hasCarportPrimary) {
      carportDisplay = String(carportPrimaryNum);
    }
    
    // Carspace: Only show if primary has a value
    if (hasCarspacePrimary) {
      carspaceDisplay = String(carspacePrimaryNum);
    }
  }

  // Format values according to training doc
  // Built: Use build_size for H&L/Projects (format: "122 sqm approx."), year_built for Established (format: "1975 approx.")
  const builtDisplay = buildSize ? `${buildSize} sqm approx.` : (yearBuilt ? `${yearBuilt} approx.` : "");
  const landRegistrationDisplay = landRegistration || "";
  const landSizeDisplay = landSize ? `${landSize} sqm approx.` : "";
  const bodyCorpDisplay = bodyCorpQuarter ? `Approx. $${bodyCorpQuarter} per quarter` : "";
  // Format title: Replace underscores with spaces, capitalize first letter of each word
  const titleDisplay = title ? title
    .replace(/_/g, ' ') // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') : "";

  propertyDescHtml += htmlLine("Bed", bedsDisplay);
  propertyDescHtml += htmlLine("Bath", bathsDisplay);
  propertyDescHtml += htmlLine("Garage", garageDisplay);
  propertyDescHtml += htmlLine("Car-port", carportDisplay);
  propertyDescHtml += htmlLine("Car-space", carspaceDisplay);
  // Registration: Only show for New properties (NOT Established)
  if (!isEstablished && landRegistrationDisplay) {
    propertyDescHtml += htmlLine("Registration", landRegistrationDisplay);
  }
  if (builtDisplay) {
    propertyDescHtml += htmlLine("Built", builtDisplay);
  }
  propertyDescHtml += htmlLine("Land Size", landSizeDisplay);
  propertyDescHtml += htmlLine("Title", titleDisplay);
  // Body Corp: Only show for specific title types (STRATA, OWNERS CORP (COMMUNITY), SURVEY STRATA, BUILT STRATA)
  // Do NOT show for: INDIVIDUAL, TORRENS, GREEN, TBC
  // Always show Body Corp field for these title types (even if value is empty - indicates data issue)
  if (title) {
    // Replace underscores with spaces for comparison (handles "owners_corp_community" format)
    const titleUpper = title.replace(/_/g, ' ').toUpperCase();
    const showBodyCorp = titleUpper.includes("STRATA") || 
                        titleUpper.includes("OWNERS CORP") || 
                        titleUpper.includes("SURVEY STRATA") ||
                        titleUpper.includes("BUILT STRATA");
    if (showBodyCorp) {
      // Use bodyCorpDisplay if it exists, otherwise format from bodyCorpQuarter, otherwise show empty
      const bodyCorpValue = bodyCorpDisplay || (bodyCorpQuarter ? `Approx. $${bodyCorpQuarter} per quarter` : "");
      propertyDescHtml += `<p style="margin-left: 20px;"><strong>Body corp.:</strong> ${bodyCorpValue}</p>`;
      // Body Corp Description: Show if bodyCorpQuarter has value AND bodyCorpDescription has text
      if (bodyCorpQuarter && bodyCorpDescription) {
        propertyDescHtml += `<p style="margin-left: 20px;"><strong>Body corp. Dialogue:</strong></p>`;
        propertyDescHtml += `<p style="margin-left: 20px;">${normaliseNewlines(bodyCorpDescription)}</p>`;
      }
    }
  }

  const propDescDialogue = v("property_description_additional_dialogue");
  if (propDescDialogue) {
    propertyDescHtml += `<br>`;
    propertyDescHtml += `<p>*${propDescDialogue}</p>`;
  }

  propertyDescText += "Property Description\n";
  if (bedsDisplay) propertyDescText += textLine("Bed", bedsDisplay);
  if (bathsDisplay) propertyDescText += textLine("Bath", bathsDisplay);
  if (garageDisplay) propertyDescText += textLine("Garage", garageDisplay);
  if (carportDisplay) propertyDescText += textLine("Car-port", carportDisplay);
  if (carspaceDisplay) propertyDescText += textLine("Car-space", carspaceDisplay);
  // Registration: Only show for New properties (NOT Established)
  if (!isEstablished && landRegistrationDisplay) {
    propertyDescText += textLine("Registration", landRegistrationDisplay);
  }
  if (builtDisplay) propertyDescText += textLine("Built", builtDisplay);
  if (landSizeDisplay) propertyDescText += textLine("Land Size", landSizeDisplay);
  if (titleDisplay) propertyDescText += textLine("Title", titleDisplay);
  // Body Corp: Only show for specific title types
  // Always show Body Corp field for these title types (even if value is empty - indicates data issue)
  if (title) {
    // Replace underscores with spaces for comparison (handles "owners_corp_community" format)
    const titleUpper = title.replace(/_/g, ' ').toUpperCase();
    const showBodyCorp = titleUpper.includes("STRATA") || 
                        titleUpper.includes("OWNERS CORP") || 
                        titleUpper.includes("SURVEY STRATA") ||
                        titleUpper.includes("BUILT STRATA");
    if (showBodyCorp) {
      // Use bodyCorpDisplay if it exists, otherwise format from bodyCorpQuarter, otherwise show empty
      const bodyCorpValue = bodyCorpDisplay || (bodyCorpQuarter ? `Approx. $${bodyCorpQuarter} per quarter` : "");
      propertyDescText += `    Body corp.: ${bodyCorpValue}\n`;
      // Body Corp Description: Show if bodyCorpQuarter has value AND bodyCorpDescription has text
      if (bodyCorpQuarter && bodyCorpDescription) {
        propertyDescText += `    Body corp. Dialogue:\n`;
        propertyDescText += `    ${normaliseNewlines(bodyCorpDescription)}\n`;
      }
    }
  }
  if (propDescDialogue) {
    propertyDescText += `\n*${propDescDialogue}\n`;
  }
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
    "mining_dialogie",
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
      if (dialogue) {
        // Combine status and dialogue on same line: "Label: Yes - [dialogue]"
        h += `<p><strong>${label}:</strong> ${nice} - ${dialogue}</p>`;
        t += `${label}: ${nice} - ${dialogue}\n`;
      } else {
        // Just status: "Label: Yes"
        h += htmlLine(label, nice);
        t += textLine(label, nice);
      }
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
    overlaysHtml += `<br>`;
    overlaysHtml += htmlLine("Due Diligence Acceptance", niceDD);
    overlaysText += `\nDue Diligence Acceptance: ${niceDD}\n`;
  }

  overlaysText += "\n";
}

let purchaseHtml = "";
let purchaseText = "";

// Determine if we should show Purchase Price section
const isNewProperty = isHAndL || isSMSF;
const isSingleContract = contractTypeSimplified && contractTypeSimplified.toLowerCase() === "single contract";
const isSplitContract = contractTypeSimplified && contractTypeSimplified.toLowerCase() === "split contract";
const hasCashback = cashbackRebateValue && cashbackRebateValue.trim() !== "";

if (
  hasAny(
    "asking",
    "asking_text",
    "comparable_sales",
    "acceptable_acquisition__from",
    "acceptable_acquisition_from",
    "acceptable_acquisition__to",
    "acceptable_acquisition_to",
    "land_price",
    "build_price",
    "total_price",
    "cashback_rebate_value",
    "purchase_price_additional_dialogue"
  )
) {
  // Note: "Purchase Price" section heading is handled by left sidebar navigation, not shown in content

  if (isNewProperty) {
    // NEW PROPERTIES (H&L, SMSF) - Do NOT show Projects here
    // Show "House & Land package" as hardcoded text
    purchaseHtml += `<p><strong>House & Land package</strong></p>`;
    purchaseText += "House & Land package\n";

    // Determine which price structure to show
    if (isSingleContract && totalPrice) {
      // Single Contract: Just show "Price" (bold) = Total Price
      const totalPriceFormatted = `$${formatNumberWithCommas(totalPrice)}`;
      purchaseHtml += `<p><strong>Price:</strong> <strong>${totalPriceFormatted}</strong></p>`;
      purchaseText += `Price: ${totalPriceFormatted}\n`;
    } else if (isSplitContract || (!isSingleContract && (landPrice || buildPrice))) {
      // Split Contract: Show Total Price (bold), then Land Price (indented 30px), Build Price (indented 30px)
      // Calculate total if not provided
      const landPriceNum = toNumber(landPrice) || 0;
      const buildPriceNum = toNumber(buildPrice) || 0;
      const calculatedTotal = landPriceNum + buildPriceNum;
      const totalPriceToShow = totalPrice || calculatedTotal;
      
      if (totalPriceToShow) {
        const totalPriceFormatted = `$${formatNumberWithCommas(totalPriceToShow)}`;
        purchaseHtml += `<p><strong>Price:</strong> <strong>${totalPriceFormatted}</strong></p>`;
        purchaseText += `Price: ${totalPriceFormatted}\n`;
      }
      if (landPrice) {
        const landPriceFormatted = `$${formatNumberWithCommas(landPrice)}`;
        purchaseHtml += `<p style="margin-left: 30px;"><strong>Land:</strong> ${landPriceFormatted}</p>`;
        purchaseText += `    Land: ${landPriceFormatted}\n`;
      }
      if (buildPrice) {
        const buildPriceFormatted = `$${formatNumberWithCommas(buildPrice)}`;
        purchaseHtml += `<p style="margin-left: 30px;"><strong>Build:</strong> ${buildPriceFormatted}</p>`;
        purchaseText += `    Build: ${buildPriceFormatted}\n`;
      }
    }

    // Net Price: Calculate and show ONLY if cashbackRebateType === "cashback" (not for rebates)
    const isCashbackType = cashbackRebateType && cashbackRebateType.toLowerCase() === "cashback";
    if (hasCashback && isCashbackType) {
      const totalPriceNum = toNumber(totalPrice) || (toNumber(landPrice) || 0) + (toNumber(buildPrice) || 0);
      const cashbackNum = toNumber(cashbackRebateValue) || 0;
      const netPrice = totalPriceNum - cashbackNum;
      if (netPrice > 0) {
        const netPriceFormatted = `$${formatNumberWithCommas(netPrice)}`;
        const cashbackFormatted = cashbackNum >= 1000 ? `$${(cashbackNum / 1000).toFixed(0)}k` : `$${formatNumberWithCommas(cashbackNum)}`;
        // Use cashbackRebateType field value (not hardcoded) - format for sentence (lowercase)
        const cashbackTypeForSentence = cashbackRebateType ? cashbackRebateType.toLowerCase() : "cashback";
        // Make the cashback amount stand out with grey background and white text
        purchaseHtml += `<p><strong>Net Price:</strong> <strong>${netPriceFormatted}</strong> when considering the <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${cashbackFormatted} ${cashbackTypeForSentence}</span></p>`;
        purchaseText += `Net Price: ${netPriceFormatted} when considering the ${cashbackFormatted} ${cashbackTypeForSentence}\n`;
      }
    }

    // Rebate: Show as separate line for New properties if it's a rebate (not cashback)
    const isRebateType = cashbackRebateType && cashbackRebateType.toLowerCase().includes("rebate");
    if (hasCashback && isRebateType) {
      const rebateFormatted = `$${formatNumberWithCommas(cashbackRebateValue)}`;
      // Use dynamic label based on cashbackRebateType: "Rebate:" (always "Rebate" for rebate types)
      purchaseHtml += `<p><strong>Rebate:</strong> <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${rebateFormatted}</span></p>`;
      purchaseText += textLine("Rebate", rebateFormatted);
    }

    // Comparable Sales: Always show (mandatory field)
    if (comparableSales) {
      const csNorm = normaliseNewlines(comparableSales);
      purchaseHtml += `<p><strong>Comparable Sales:</strong> ${csNorm
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("<br>")}</p>`;
      purchaseText += `Comparable Sales: ${comparableSales}\n`;
    }

  } else if (isEstablished) {
    // ESTABLISHED PROPERTIES
    // Format Asking: Combine asking type + asking_text into "Asking: [type] - [price]"
    let askingDisplay = "";
    if (asking && askingText) {
      const niceAsking = neatValue(asking);
      askingDisplay = `${niceAsking} - ${askingText}`;
    } else if (asking) {
      askingDisplay = neatValue(asking);
    } else if (askingText) {
      askingDisplay = askingText;
    }

    if (askingDisplay) {
      purchaseHtml += htmlLine("Asking", askingDisplay);
      purchaseText += textLine("Asking", askingDisplay);
    }

    // Comparable Sales: Always show (mandatory field)
    if (comparableSales) {
      const csNorm = normaliseNewlines(comparableSales);
      purchaseHtml += `<p><strong>Comparable Sales:</strong> ${csNorm
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join("<br>")}</p>`;
      purchaseText += `Comparable Sales: ${comparableSales}\n`;
    }

    // Accepted Acquisition Target: Show for Established
    let acquisitionTargetDisplay = "";
    if (acceptableFrom && acceptableTo) {
      acquisitionTargetDisplay = `$${formatNumberWithCommas(acceptableFrom)} - $${formatNumberWithCommas(acceptableTo)}`;
    } else if (acceptableFrom) {
      acquisitionTargetDisplay = `$${formatNumberWithCommas(acceptableFrom)}`;
    } else if (acceptableTo) {
      acquisitionTargetDisplay = `$${formatNumberWithCommas(acceptableTo)}`;
    }

    if (acquisitionTargetDisplay) {
      purchaseHtml += htmlLine("Accepted Acquisition Target", acquisitionTargetDisplay);
      purchaseText += textLine("Accepted Acquisition Target", acquisitionTargetDisplay);
    }

      // Cashback/Rebate: Show Value (but NOT Type) for Established with 03_internal_with_comms contract type
      // For Established properties, deal_type can be "03_internal_with_comms", "04_internal_nocomms", or "05_established"
      const isInternalWithComms = dealType && dealType === "03_internal_with_comms";
      if (isInternalWithComms && hasCashback) {
        const cashbackFormatted = `$${formatNumberWithCommas(cashbackRebateValue)}`;
        // Use dynamic label based on cashbackRebateType: "Cashback:" or "Rebate:"
        const cashbackLabel = cashbackRebateType && cashbackRebateType.toLowerCase().includes("rebate") ? "Rebate" : "Cashback";
        // Make the dollar amount stand out with lighter grey background and white text (softer look)
        purchaseHtml += `<p><strong>${cashbackLabel}:</strong> <span style="background-color: #808080; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${cashbackFormatted}</span></p>`;
        purchaseText += textLine(cashbackLabel, cashbackFormatted);
      }
    // Do NOT show Net Price for Established (even if cashback exists)
  }

  // Purchase Price Dialogue: Show if exists (optional field)
  if (purchasePriceDialogue) {
    purchaseHtml += `<br>`;
    purchaseHtml += `<p>*${purchasePriceDialogue}</p>`;
    purchaseText += `\n*${purchasePriceDialogue}\n`;
  }
  purchaseText += "\n";
}

let rentalHtml = "";
let rentalText = "";

if (
  hasAny(
    "occupancy",
    "occupancy_primary",
    "occupancy_secondary",
    "current_rent_primary__per_week",
    "current_rent_primary_per_week",
    "current_rent_secondary__per_week",
    "current_rent_secondary_per_week",
    "expiry_primary",
    "expiry_secondary",
    "yield",
    "rent_appraisal_primary_from",
    "rent_appraisal_primary_to",
    "rent_appraisal_secondary_from",
    "rent_appraisal_secondary_to",
    "appraised_yield",
    "rental_assessment_additional_dialogue"
  )
) {
  rentalText += "Rental Assessment\n";

  // For single occupancy, use occupancyPrimary if occupancy is not available
  const occupancyValue = !isDual ? (occupancy || occupancyPrimary) : occupancy;
  
  // Use exact match for occupancy (matches form logic)
  const occLower = occupancyValue ? occupancyValue.toLowerCase() : "";
  const isTenanted = occLower === "tenanted"; // Exact match: only "tenanted"
  // Note: For "New" properties (H&L, Projects), there would be no tenant, so these fields won't show

  if (!isDual) {
    // Single occupancy format
    // Only show Occupancy for Established properties (not for new properties: H&L, SMSF, Projects)
    if (isEstablished) {
      const occupancyRaw = occupancy || occupancyPrimary || "";
      const displayOccupancy = formatOccupancy(occupancyRaw);
      rentalHtml += htmlLine("Occupancy", displayOccupancy);
    }
    // Always show Current Rent, Expiry, and Current Yield for Established AND tenanted (even if null)
    // These are mandatory fields in the form for tenanted properties
    if (isEstablished && isTenanted) {
      // Always show Current Rent (even if null/empty - indicates data issue)
      rentalHtml += htmlLine("Current Rent", currentRentPrimary ? formatCurrentRent(currentRentPrimary) : "");
      // Always show Expiry (even if null/empty)
      rentalHtml += htmlLine("Expiry", expiryPrimary || "");
      // Always show Current Yield (even if null/empty)
      rentalHtml += htmlLine("Current Yield", yieldPct || "");
    }
    const appraisalRange = formatRentAppraisalRange(rentAppraisalPrimaryFrom, rentAppraisalPrimaryTo);
    if (appraisalRange) {
      rentalHtml += htmlLine("Appraisal", appraisalRange);
    }
    if (appraisedYield) {
      rentalHtml += htmlLine("Appraised Yield", appraisedYield);
    }

    // Text version - only show Occupancy for Established properties
    if (isEstablished) {
      const occupancyRaw = occupancy || occupancyPrimary || "";
      const displayOccupancy = formatOccupancy(occupancyRaw);
      rentalText += textLine("Occupancy", displayOccupancy);
    }
    // Always show Current Rent, Expiry, and Current Yield for Established AND tenanted (even if null)
    // These are mandatory fields in the form for tenanted properties
    if (isEstablished && isTenanted) {
      // Always show Current Rent (even if null/empty)
      rentalText += textLine("Current Rent", currentRentPrimary ? formatCurrentRent(currentRentPrimary) : "");
      // Always show Expiry (even if null/empty)
      rentalText += textLine("Expiry", expiryPrimary || "");
      // Always show Current Yield (even if null/empty)
      rentalText += textLine("Current Yield", yieldPct || "");
    }
    if (appraisalRange) {
      rentalText += textLine("Appraisal", appraisalRange);
    }
    if (appraisedYield) {
      rentalText += textLine("Appraised Yield", appraisedYield);
    }
  } else {
    // Dual occupancy format
    // Use exact match for occupancy (matches form logic)
    const occPrimaryLower = occupancyPrimary ? occupancyPrimary.toLowerCase() : "";
    const occSecondaryLower = occupancySecondary ? occupancySecondary.toLowerCase() : "";
    const isTenantedPrimary = occPrimaryLower === "tenanted"; // Exact match: only "tenanted"
    const isTenantedSecondary = occSecondaryLower === "tenanted"; // Exact match: only "tenanted"
    
    // Occupancy - only show for Established properties (not for new properties: H&L, SMSF, Projects)
    if (isEstablished) {
      rentalHtml += `<p><strong>Occupancy:</strong></p>`;
      if (occupancyPrimary) {
        rentalHtml += `<p>Unit A: ${formatOccupancy(occupancyPrimary)}</p>`;
      }
      if (occupancySecondary) {
        rentalHtml += `<p>Unit B: ${formatOccupancy(occupancySecondary)}</p>`;
      }
    }
    
    // Current Rent - Always show for Established properties if at least one unit is tenanted (even if null)
    if (isEstablished && (isTenantedPrimary || isTenantedSecondary)) {
      const pRentNum = toNumber(currentRentPrimary) || 0;
      const sRentNum = toNumber(currentRentSecondary) || 0;
      const totalRentNum = pRentNum + sRentNum;
      
      rentalHtml += `<p><strong>Current Rent:</strong></p>`;
      // Always show Total (even if 0/null)
      rentalHtml += `<p>Total: ${formatCurrentRent(totalRentNum > 0 ? totalRentNum : "")}</p>`;
      // Always show Unit A if tenanted (even if null)
      if (isTenantedPrimary) {
        rentalHtml += `<p style="margin-left: 30px;">Unit A: ${currentRentPrimary ? formatCurrentRent(currentRentPrimary) : ""}</p>`;
      } else if (occupancyPrimary) {
        rentalHtml += `<p style="margin-left: 30px;">Unit A: N/A</p>`;
      }
      // Always show Unit B if tenanted (even if null)
      if (isTenantedSecondary) {
        rentalHtml += `<p style="margin-left: 30px;">Unit B: ${currentRentSecondary ? formatCurrentRent(currentRentSecondary) : ""}</p>`;
      } else if (occupancySecondary) {
        rentalHtml += `<p style="margin-left: 30px;">Unit B: N/A</p>`;
      }
    }
    
    // Expiry - Always show for Established properties if at least one unit is tenanted (even if null)
    if (isEstablished && (isTenantedPrimary || isTenantedSecondary)) {
      rentalHtml += `<p><strong>Expiry:</strong></p>`;
      // Always show Unit A if tenanted (even if null)
      if (isTenantedPrimary) {
        rentalHtml += `<p>Unit A: ${expiryPrimary || ""}</p>`;
      } else if (occupancyPrimary) {
        rentalHtml += `<p>Unit A: N/A</p>`;
      }
      // Always show Unit B if tenanted (even if null)
      if (isTenantedSecondary) {
        rentalHtml += `<p>Unit B: ${expirySecondary || ""}</p>`;
      } else if (occupancySecondary) {
        rentalHtml += `<p>Unit B: N/A</p>`;
      }
    }
    
    // Current Yield - Always show if Established AND at least one unit is tenanted (even if null)
    if (isEstablished && (isTenantedPrimary || isTenantedSecondary)) {
      rentalHtml += htmlLine("Current Yield", yieldPct || "");
    }
    
    // Appraisal
    const appraisalPrimaryRange = formatRentAppraisalRange(rentAppraisalPrimaryFrom, rentAppraisalPrimaryTo);
    const appraisalSecondaryRange = formatRentAppraisalRange(rentAppraisalSecondaryFrom, rentAppraisalSecondaryTo);
    const appraisalTotalFrom = (toNumber(rentAppraisalPrimaryFrom) || 0) + (toNumber(rentAppraisalSecondaryFrom) || 0);
    const appraisalTotalTo = (toNumber(rentAppraisalPrimaryTo) || 0) + (toNumber(rentAppraisalSecondaryTo) || 0);
    const appraisalTotalRange = formatRentAppraisalRange(appraisalTotalFrom, appraisalTotalTo);
    
    if (appraisalPrimaryRange || appraisalSecondaryRange) {
      rentalHtml += `<p><strong>Appraisal:</strong></p>`;
      if (appraisalTotalRange) {
        rentalHtml += `<p>Total: ${appraisalTotalRange}</p>`;
      }
      if (appraisalPrimaryRange) {
        rentalHtml += `<p style="margin-left: 30px;">Unit A: ${appraisalPrimaryRange}</p>`;
      }
      if (appraisalSecondaryRange) {
        rentalHtml += `<p style="margin-left: 30px;">Unit B: ${appraisalSecondaryRange}</p>`;
      }
    }
    
    // Appraised Yield
    if (appraisedYield) {
      rentalHtml += htmlLine("Appraised Yield", appraisedYield);
    }

    // Text version - only show Occupancy for Established properties
    if (isEstablished) {
      rentalText += "Occupancy:\n";
      if (occupancyPrimary) {
        rentalText += `    Unit A: ${formatOccupancy(occupancyPrimary)}\n`;
      }
      if (occupancySecondary) {
        rentalText += `    Unit B: ${formatOccupancy(occupancySecondary)}\n`;
      }
    }
    // Current Rent - only show for Established properties (new properties never have tenants)
    if (isEstablished) {
      const pRentNum = toNumber(currentRentPrimary) || 0;
      const sRentNum = toNumber(currentRentSecondary) || 0;
      const totalRentNum = pRentNum + sRentNum;
      
      rentalText += "Current Rent:\n";
      if (totalRentNum > 0 || (isTenantedPrimary && currentRentPrimary) || (isTenantedSecondary && currentRentSecondary)) {
        rentalText += `    Total: ${formatCurrentRent(totalRentNum > 0 ? totalRentNum : "")}\n`;
      }
      if (isTenantedPrimary && currentRentPrimary) {
        rentalText += `    Unit A: ${formatCurrentRent(currentRentPrimary)}\n`;
      } else if (occupancyPrimary) {
        rentalText += `    Unit A: N/A\n`;
      }
      if (isTenantedSecondary && currentRentSecondary) {
        rentalText += `    Unit B: ${formatCurrentRent(currentRentSecondary)}\n`;
      } else if (occupancySecondary) {
        rentalText += `    Unit B: N/A\n`;
      }
    }
    // Expiry - only show for Established properties (new properties never have tenants)
    if (isEstablished) {
      rentalText += "Expiry:\n";
      if (isTenantedPrimary && expiryPrimary) {
        rentalText += `    Unit A: ${expiryPrimary}\n`;
      } else if (occupancyPrimary) {
        rentalText += `    Unit A: N/A\n`;
      }
      if (isTenantedSecondary && expirySecondary) {
        rentalText += `    Unit B: ${expirySecondary}\n`;
      } else if (occupancySecondary) {
        rentalText += `    Unit B: N/A\n`;
      }
    }
    // Current Yield - only show if Established AND at least one unit is tenanted (new properties never have tenants)
    if (isEstablished && (isTenantedPrimary || isTenantedSecondary) && yieldPct) {
      rentalText += textLine("Current Yield", yieldPct);
    }
    if (appraisalPrimaryRange || appraisalSecondaryRange) {
      rentalText += "Appraisal:\n";
      if (appraisalTotalRange) {
        rentalText += `Total: ${appraisalTotalRange}\n`;
      }
      if (appraisalPrimaryRange) {
        rentalText += `    Unit A: ${appraisalPrimaryRange}\n`;
      }
      if (appraisalSecondaryRange) {
        rentalText += `    Unit B: ${appraisalSecondaryRange}\n`;
      }
    }
    if (appraisedYield) {
      rentalText += textLine("Appraised Yield", appraisedYield);
    }
  }

  if (rentalAssessmentDialogue) {
    rentalHtml += `<br>`;
    rentalHtml += `<p>*${rentalAssessmentDialogue}</p>`;
    rentalText += `\n*${rentalAssessmentDialogue}\n`;
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
    "median_price_change__3_months",
    "median_price_change__1_year",
    "median_price_change__3_year",
    "median_price_change__5_year",
    "median_yield",
    "median_rent_change__1_year",
    "rental_population",
    "vacancy_rate",
    "market_performance_additional_dialogue"
  )
) {
  marketHtml += htmlLineMarket("Median Price Change – 3 months", mp3m);
  marketHtml += htmlLineMarket("Median Price Change – 1 year", mp1y);
  marketHtml += htmlLineMarket("Median Price Change – 3 years", mp3y);
  marketHtml += htmlLineMarket("Median Price Change – 5 years", mp5y);
  marketHtml += htmlLineMarket("Median Yield", medianYield);
  marketHtml += htmlLineMarket("Median Rent Change – 1 year", rentChange1y);
  marketHtml += htmlLineMarket("Rental Population", rentalPopulation);
  marketHtml += htmlLineMarket("Vacancy Rate", vacancyRate);

  if (mpDialogue) {
    marketHtml += `<br>`;
    marketHtml += `<p>*${mpDialogue}</p>`;
  }

  marketText += "Market Performance\n";
  marketText += textLineMarket("Median Price Change – 3 months", mp3m);
  marketText += textLineMarket("Median Price Change – 1 year", mp1y);
  marketText += textLineMarket("Median Price Change – 3 years", mp3y);
  marketText += textLineMarket("Median Price Change – 5 years", mp5y);
  marketText += textLineMarket("Median Yield", medianYield);
  marketText += textLineMarket("Median Rent Change – 1 year", rentChange1y);
  marketText += textLineMarket("Rental Population", rentalPopulation);
  marketText += textLineMarket("Vacancy Rate", vacancyRate);
  if (mpDialogue) {
    marketText += `\n*${mpDialogue}\n`;
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

let attachmentsInnerHtml = "";
if (folderLink) {
  attachmentsInnerHtml += `<p><strong>CLICK</strong> this link to view supporting documents for this property:</p>`;
  attachmentsInnerHtml += `<p><a href="${folderLink}" target="_blank">${propertyAddress || folderLink}</a></p>`;
  attachmentsInnerHtml += `<p style="font-size: 14px; font-style: italic; color: #888;">Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.</p>`;
  attachmentsInnerHtml += `<p style="font-size: 14px; font-style: italic; color: #888;">With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.</p>`;
} else {
  attachmentsInnerHtml += `<p><strong>CLICK</strong> this link to view supporting documents for this property:</p>`;
  attachmentsInnerHtml += `<p><a href="#" target="_blank">${propertyAddress || "[Link not available]"}</a></p>`;
  attachmentsInnerHtml += `<p style="font-size: 14px; font-style: italic; color: #888;">Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.</p>`;
  attachmentsInnerHtml += `<p style="font-size: 14px; font-style: italic; color: #888;">With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.</p>`;
}
if (attachmentsDialogue) {
  attachmentsInnerHtml += `<br>`;
  attachmentsInnerHtml += `<p>*${attachmentsDialogue}</p>`;
}

let attachmentsText = "Supporting Documents\n";
if (folderLink) {
  attachmentsText += `CLICK this link to view supporting documents for this property:\n${propertyAddress || folderLink} (${folderLink})\n`;
} else {
  attachmentsText += `CLICK this link to view supporting documents for this property:\n${propertyAddress || "[Link not available]"}\n`;
}
attachmentsText += "Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report.\n";
attachmentsText += "With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more.\n";
if (attachmentsDialogue) {
  attachmentsText += `\n*${attachmentsDialogue}\n`;
}

// 7) Assemble final HTML + text bodies
const isPackagerEmail = packagerApproved !== "approved";
const isBAEmail = packagerApproved === "approved" && baApproved !== "approved";

// Build message placeholders/previews
let messagePreviewHtml = "";
if (isPackagerEmail) {
  // Packager email - show message_for_ba if exists, otherwise placeholder for BA message
  let packagerMessageHtml = "";
  if (messageForBA) {
    const formattedMessageForBA = normaliseNewlines(messageForBA)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #666;">${line}</p>`)
      .join('');
    packagerMessageHtml = `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #666; font-weight: bold;">BA Notes (this will not be seen by the client)</p>${formattedMessageForBA}`;
  } else {
    packagerMessageHtml = `<p style="margin: 0 0 8px 0; line-height: 1.5; font-size: 16px; color: #999; font-style: italic;">[BA's message will appear here]</p>`;
  }
  messagePreviewHtml = `
    <tr>
      <td style="padding: 20px 24px 24px 24px;">
        ${packagerMessageHtml}
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
  // Use confirmation page for approve/reject actions
  const approveUrl = CONFIRMATION_URL + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&propertyAddress=" + encodeURIComponent(propertyAddress) + "&action=approve&field=packager_approved&value=Approved";
  const rejectUrl = CONFIRMATION_URL + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&propertyAddress=" + encodeURIComponent(propertyAddress) + "&action=reject";
  
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
  // Use confirmation page for reject action
  const rejectUrl = CONFIRMATION_URL + "?recordId=" + encodeURIComponent(recordId) + "&propertyId=" + encodeURIComponent(propertyId) + "&propertyAddress=" + encodeURIComponent(propertyAddress) + "&action=reject";
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
                ${sectionRow("Google Map", googleMapHtml)}
                ${sectionRow("Property Description", propertyDescHtml)}
                ${sectionRow("Property Overlays", overlaysHtml)}
                ${sectionRow("Purchase Price", purchaseHtml)}
                ${sectionRow("Rental Assessment", rentalHtml)}
                ${sectionRow("Proximity", proximityHtml)}
                ${sectionRow("Market Performance", marketHtml)}
                ${sectionRow("Investment Highlights", highlightsHtml)}
                ${sectionRow("Supporting Documents", attachmentsInnerHtml)}
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
  if (messageForBA) {
    text_body += `BA Notes (this will not be seen by the client)\n${messageForBA}\n\n`;
  } else {
    text_body += "[BA's message will appear here]\n\n";
  }
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

// Extract email addresses from GHL data
// TEMPORARY: Hard code packager email for testing (will be replaced with proper user lookup later)
const HARDCODED_PACKAGER_EMAIL = "john.t@buyersclub.com.au";

// Try to get BA email from GHL data (for BA emails)
const baEmailRaw = v("ba_email") || v("baEmail") || v("ba_email_address") || v("ba") || "";

// Helper function to validate and clean email
function cleanEmail(email) {
  if (!email) return "";
  const cleaned = String(email).trim();
  // Basic email validation (contains @ and .)
  if (cleaned.includes("@") && cleaned.includes(".") && cleaned.length > 5) {
    return cleaned;
  }
  return "";
}

let baEmail = cleanEmail(baEmailRaw);

// Determine recipient email based on email type
let recipientEmail = "";
if (isPackagerEmail) {
  // Packager email - use hard coded email for now
  recipientEmail = HARDCODED_PACKAGER_EMAIL;
} else if (isBAEmail) {
  // BA email - try to get from GHL data, fallback to default
  recipientEmail = baEmail || HARDCODED_PACKAGER_EMAIL;
} else {
  // Fallback for any other case
  recipientEmail = HARDCODED_PACKAGER_EMAIL;
}

// Final validation - ensure we always have a valid email
if (!recipientEmail || recipientEmail === "" || !recipientEmail.includes("@")) {
  recipientEmail = HARDCODED_PACKAGER_EMAIL; // Force fallback if invalid
  console.log("Module 3 - WARNING: Invalid email, forcing fallback");
}

console.log("Module 3 subject:", subject);
console.log("Module 3 html_body length:", html_body ? html_body.length : 0);
console.log("Module 3 recipientEmail (final):", recipientEmail);
console.log("Module 3 isPackagerEmail:", isPackagerEmail);
console.log("Module 3 isBAEmail:", isBAEmail);

return {
  subject,
  html_body,
  text_body,
  to: recipientEmail,
  source: portalData.source || input.source || ""
};

