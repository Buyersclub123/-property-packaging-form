// PORTAL REQUEST SECTION - REPLACE LINES 8-186 IN YOUR MODULE 3 CODE WITH THIS
// This section processes property data from Module 6 and builds complete email bodies with property details

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
  
  // Get property data from Module 6's output (for portal requests, Module 6 processes GHL data)
  // Module 6 outputs parsed data in the same format as normal requests
  let webhookDataForPortal = input.Webhook_Data || (Array.isArray(input) ? input[0] : input);
  const inputDataForPortal = webhookDataForPortal.Data || webhookDataForPortal.data || webhookDataForPortal;
  
  // Build formatted data string (key: value format) - same as normal requests
  const formattedDataForPortal = [];
  const idValueForPortal = inputDataForPortal.ID || inputDataForPortal.id || inputDataForPortal['ID'] || '';
  
  if (idValueForPortal && !formattedDataForPortal.some(line => line.startsWith('ID:'))) {
    formattedDataForPortal.push(`ID: ${idValueForPortal}`);
  }
  
  Object.keys(inputDataForPortal).forEach(key => {
    if (key !== 'ID' && key !== 'id' && key !== 'Data' && key.toLowerCase() !== 'data') {
      const value = inputDataForPortal[key];
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        formattedDataForPortal.push(`${key}: ${stringValue}`);
      }
    }
  });
  
  const rawForPortal = formattedDataForPortal.join('\n');
  
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
    parsedForPortal[key] = value;
  });
  
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
  
  function htmlLinePortal(label, value) {
    if (!value) return "";
    return `<p><strong>${label}:</strong> ${value}</p>`;
  }
  
  function textLinePortal(label, value) {
    if (!value) return "";
    return `${label}: ${value}\n`;
  }
  
  // Normalise newlines helper
  function normaliseNewlinesPortal(str) {
    if (!str) return "";
    return String(str)
      .replace(/\\n/g, "\n")
      .replace(/\\\\n/g, "\n")
      .replace(/&#10;|&#13;/g, "\n");
  }
  
  // Format helpers
  function formatWhyHtmlPortal(rawText) {
    const t = normaliseNewlinesPortal(rawText);
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
  
  function formatProximityHtmlPortal(rawText) {
    const t = normaliseNewlinesPortal(rawText);
    const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    const items = lines.map((line) => `<li>${line}</li>`).join("");
    return `<ul>${items}</ul>`;
  }
  
  function formatInvestmentHighlightsHtmlPortal(rawText) {
    const t = normaliseNewlinesPortal(rawText);
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
      openList();
      html += `<li>${bulletText}</li>`;
      lastType = "bullet";
      lineIndex++;
    }
    closeList();
    return html;
  }
  
  function sectionRowPortal(label, innerHtml) {
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
  
  function neatValuePortal(str) {
    if (!str) return "";
    const s = String(str).trim();
    const lower = s.toLowerCase();
    if (lower === "yes") return "Yes";
    if (lower === "no") return "No";
    if (lower === "onmarket" || lower === "on market") return "On-market";
    return s;
  }
  
  function toNumberPortal(vStr) {
    const n = parseFloat((vStr || "").replace(/[^\d.-]/g, ""));
    return isNaN(n) ? null : n;
  }
  
  // Read property fields from Module 6's parsed data
  const whyThisPropertyPortal = vPortal("why_this_property");
  const propertyAddressPortal = vPortal("property_address") || propertyAddress;
  const googleMapPortal = vPortal("google_map");
  
  const bedsPrimaryPortal = vPortal("beds_primary");
  const bedsSecondaryPortal = vPortal("beds_secondary");
  const bathPrimaryPortal = vPortal("bath_primary");
  const bathSecondaryPortal = vPortal("bath_secondary");
  const garagePrimaryPortal = vPortal("garage_primary");
  const garageSecondaryPortal = vPortal("garage_secondary");
  const carportPrimaryPortal = vPortal("carport_primary");
  const carportSecondaryPortal = vPortal("carport_secondary");
  const carspacePrimaryPortal = vPortal("carspace_primary");
  const carspaceSecondaryPortal = vPortal("carspace_secondary");
  const yearBuiltPortal = vPortal("year_built");
  const landSizePortal = vPortal("land_size");
  const titlePortal = vPortal("title");
  const bodyCorpQuarterPortal = vPortal("body_corp_per_quarter");
  
  const zoningPortal = vPortal("zoning");
  const floodPortal = vPortal("flood");
  const floodDialoguePortal = vPortal("flood_dialogue");
  const bushfirePortal = vPortal("bushfire");
  const bushfireDialoguePortal = vPortal("bushfire_dialogue");
  const miningPortal = vPortal("mining");
  const miningDialoguePortal = vPortal("mining_dialogue");
  const otherOverlayPortal = vPortal("other_overlay");
  const otherOverlayDialoguePortal = vPortal("other_overlay_dialogue");
  const specialInfraPortal = vPortal("special_infrastructure");
  const specialInfraDialoguePortal = vPortal("special_infrastructure_dialogue");
  const dueDiligenceAcceptancePortal = vPortal("due_diligence_acceptance");
  
  const askingPortal = vPortal("asking");
  const askingTextPortal = vPortal("asking_text");
  const comparableSalesPortal = vPortal("comparable_sales");
  const acceptableFromPortal = vPortal("acceptable_acquisition_from");
  const acceptableToPortal = vPortal("acceptable_acquisition_to");
  const purchasePriceDialoguePortal = vPortal("purchase_price_additional_dialogue");
  
  const occupancyPortal = vPortal("occupancy");
  const currentRentPrimaryPortal = vPortal("current_rent_primary_per_week");
  const currentRentSecondaryPortal = vPortal("current_rent_secondary_per_week");
  const expiryPrimaryPortal = vPortal("expiry_primary");
  const expirySecondaryPortal = vPortal("expiry_secondary");
  const yieldPctPortal = vPortal("yield");
  const rentAppraisalPrimaryPortal = vPortal("rent_appraisal_primary");
  const rentAppraisalSecondaryPortal = vPortal("rent_appraisal_secondary");
  const appraisedYieldPortal = vPortal("appraised_yield");
  const rentalAssessmentDialoguePortal = vPortal("rental_assessment_additional_dialogue");
  const dualFlagPortal = vPortal("does_this_property_have_2_dwellings");
  
  const proximityPortal = vPortal("proximity");
  
  const mp3mPortal = vPortal("median_price_change_3_months");
  const mp1yPortal = vPortal("median_price_change_1_year");
  const mp3yPortal = vPortal("median_price_change_3_year");
  const mp5yPortal = vPortal("median_price_change_5_year");
  const medianYieldPortal = vPortal("median_yield");
  const rentChange1yPortal = vPortal("median_rent_change_1_year");
  const rentalPopulationPortal = vPortal("rental_population");
  const vacancyRatePortal = vPortal("vacancy_rate");
  const mpDialoguePortal = vPortal("market_performance_additional_dialogue");
  
  const investmentHighlightsPortal = vPortal("investment_highlights");
  const attachmentsDialoguePortal = vPortal("attachments_additional_dialogue");
  
  const isDualPortal = (dualFlagPortal && dualFlagPortal.toLowerCase().includes("yes")) || !!bedsSecondaryPortal || !!currentRentSecondaryPortal;
  
  // Build property sections HTML
  let whyHtmlPortal = "";
  if (whyThisPropertyPortal) {
    const formattedWhy = formatWhyHtmlPortal(whyThisPropertyPortal);
    if (formattedWhy) whyHtmlPortal = formattedWhy;
  }
  
  let addressHtmlPortal = "";
  if (propertyAddressPortal) {
    addressHtmlPortal += `<p>${propertyAddressPortal.toUpperCase()}</p>`;
  }
  if (googleMapPortal) {
    addressHtmlPortal += `<p><strong>Google Map:</strong> <a href="${googleMapPortal}" target="_blank">${googleMapPortal}</a></p>`;
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
    let bathsDisplayPortal = "";
    if (isDualPortal && bathPrimaryPortal && bathSecondaryPortal) {
      bathsDisplayPortal = `${bathPrimaryPortal} + ${bathSecondaryPortal}`;
    } else if (bathPrimaryPortal) {
      bathsDisplayPortal = bathPrimaryPortal;
    }
    const garageDisplayPortal = [garagePrimaryPortal, garageSecondaryPortal].filter(Boolean).join(" + ");
    const carportDisplayPortal = [carportPrimaryPortal, carportSecondaryPortal].filter(Boolean).join(" + ");
    const carspaceDisplayPortal = [carspacePrimaryPortal, carspaceSecondaryPortal].filter(Boolean).join(" + ");
    propertyDescHtmlPortal += htmlLinePortal("Beds", bedsDisplayPortal);
    propertyDescHtmlPortal += htmlLinePortal("Baths", bathsDisplayPortal);
    propertyDescHtmlPortal += htmlLinePortal("Garage", garageDisplayPortal);
    propertyDescHtmlPortal += htmlLinePortal("Car-port", carportDisplayPortal);
    propertyDescHtmlPortal += htmlLinePortal("Car-space", carspaceDisplayPortal);
    propertyDescHtmlPortal += htmlLinePortal("Year Built", yearBuiltPortal);
    propertyDescHtmlPortal += htmlLinePortal("Land Size", landSizePortal);
    propertyDescHtmlPortal += htmlLinePortal("Title", titlePortal);
    propertyDescHtmlPortal += htmlLinePortal("Body Corp (per quarter)", bodyCorpQuarterPortal);
    const propDescDialoguePortal = vPortal("property_description_additional_dialogue");
    if (propDescDialoguePortal) {
      propertyDescHtmlPortal += `<p>${propDescDialoguePortal}</p>`;
    }
    propertyDescTextPortal += "Property Description\n";
    if (bedsDisplayPortal) propertyDescTextPortal += textLinePortal("Beds", bedsDisplayPortal);
    if (bathsDisplayPortal) propertyDescTextPortal += textLinePortal("Baths", bathsDisplayPortal);
    if (garageDisplayPortal) propertyDescTextPortal += textLinePortal("Garage", garageDisplayPortal);
    if (carportDisplayPortal) propertyDescTextPortal += textLinePortal("Car-port", carportDisplayPortal);
    if (carspaceDisplayPortal) propertyDescTextPortal += textLinePortal("Car-space", carspaceDisplayPortal);
    if (yearBuiltPortal) propertyDescTextPortal += textLinePortal("Year Built", yearBuiltPortal);
    if (landSizePortal) propertyDescTextPortal += textLinePortal("Land Size", landSizePortal);
    if (titlePortal) propertyDescTextPortal += textLinePortal("Title", titlePortal);
    if (bodyCorpQuarterPortal) propertyDescTextPortal += textLinePortal("Body Corp (per quarter)", bodyCorpQuarterPortal);
    if (propDescDialoguePortal) propertyDescTextPortal += `${propDescDialoguePortal}\n`;
    propertyDescTextPortal += "\n";
  }
  
  let overlaysHtmlPortal = "";
  let overlaysTextPortal = "";
  if (hasAnyPortal("zoning", "flood", "bushfire", "mining", "other_overlay", "special_infrastructure", "flood_dialogue", "bushfire_dialogue", "mining_dialogue", "other_overlay_dialogue", "special_infrastructure_dialogue", "due_diligence_acceptance")) {
    overlaysHtmlPortal += htmlLinePortal("Zoning", zoningPortal);
    overlaysTextPortal += "Property Overlays\n";
    overlaysTextPortal += textLinePortal("Zoning", zoningPortal);
    function overlayBlockPortal(label, status, dialogue) {
      let h = "";
      let t = "";
      if (status) {
        const nice = neatValuePortal(status);
        h += htmlLinePortal(label, nice);
        t += textLinePortal(label, nice);
      }
      if (dialogue) {
        h += `<p>- ${dialogue}</p>`;
        t += `- ${dialogue}\n`;
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
      const niceDDPortal = neatValuePortal(dueDiligenceAcceptancePortal);
      overlaysHtmlPortal += htmlLinePortal("Due Diligence Acceptance", niceDDPortal);
      overlaysTextPortal += textLinePortal("Due Diligence Acceptance", niceDDPortal);
    }
    overlaysTextPortal += "\n";
  }
  
  let purchaseHtmlPortal = "";
  let purchaseTextPortal = "";
  if (hasAnyPortal("asking", "asking_text", "comparable_sales", "acceptable_acquisition_from", "acceptable_acquisition_to", "purchase_price_additional_dialogue")) {
    const niceAskingPortal = neatValuePortal(askingPortal);
    purchaseHtmlPortal += htmlLinePortal("Asking", niceAskingPortal);
    purchaseHtmlPortal += htmlLinePortal("Asking (Text)", askingTextPortal);
    purchaseHtmlPortal += htmlLinePortal("Acceptable From", acceptableFromPortal);
    purchaseHtmlPortal += htmlLinePortal("Acceptable To", acceptableToPortal);
    if (comparableSalesPortal) {
      const csNormPortal = normaliseNewlinesPortal(comparableSalesPortal);
      purchaseHtmlPortal += `<p><strong>Comparable Sales:</strong><br>${csNormPortal.split(/\n+/).map((l) => l.trim()).filter(Boolean).join("<br>")}</p>`;
    }
    if (purchasePriceDialoguePortal) {
      purchaseHtmlPortal += `<p>${purchasePriceDialoguePortal}</p>`;
    }
    purchaseTextPortal += "Purchase Price\n";
    purchaseTextPortal += textLinePortal("Asking", niceAskingPortal);
    purchaseTextPortal += textLinePortal("Asking (Text)", askingTextPortal);
    purchaseTextPortal += textLinePortal("Acceptable From", acceptableFromPortal);
    purchaseTextPortal += textLinePortal("Acceptable To", acceptableToPortal);
    if (comparableSalesPortal) {
      purchaseTextPortal += `Comparable Sales:\n${comparableSalesPortal}\n`;
    }
    if (purchasePriceDialoguePortal) {
      purchaseTextPortal += `${purchasePriceDialoguePortal}\n`;
    }
    purchaseTextPortal += "\n";
  }
  
  let rentalHtmlPortal = "";
  let rentalTextPortal = "";
  if (hasAnyPortal("occupancy", "current_rent_primary_per_week", "current_rent_secondary_per_week", "expiry_primary", "expiry_secondary", "yield", "rent_appraisal_primary", "rent_appraisal_secondary", "appraised_yield", "rental_assessment_additional_dialogue")) {
    rentalTextPortal += "Rental Assessment\n";
    const occLowerPortal = occupancyPortal.toLowerCase();
    const isVacantPortal = occLowerPortal.includes("vacant");
    if (!isDualPortal) {
      rentalHtmlPortal += htmlLinePortal("Occupancy", occupancyPortal);
      rentalHtmlPortal += htmlLinePortal("Current Rent (per week)", currentRentPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Lease Expiry", expiryPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Yield", yieldPctPortal);
      rentalHtmlPortal += htmlLinePortal("Rent Appraisal", rentAppraisalPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Appraised Yield", appraisedYieldPortal);
      rentalTextPortal += textLinePortal("Occupancy", occupancyPortal);
      rentalTextPortal += textLinePortal("Current Rent (per week)", currentRentPrimaryPortal);
      rentalTextPortal += textLinePortal("Lease Expiry", expiryPrimaryPortal);
      rentalTextPortal += textLinePortal("Yield", yieldPctPortal);
      rentalTextPortal += textLinePortal("Rent Appraisal", rentAppraisalPrimaryPortal);
      rentalTextPortal += textLinePortal("Appraised Yield", appraisedYieldPortal);
    } else {
      const pRentNumPortal = toNumberPortal(currentRentPrimaryPortal) || 0;
      const sRentNumPortal = toNumberPortal(currentRentSecondaryPortal) || 0;
      const totalRentPortal = isVacantPortal ? "N/A" : pRentNumPortal + sRentNumPortal || "";
      rentalHtmlPortal += htmlLinePortal("Occupancy", occupancyPortal);
      rentalHtmlPortal += htmlLinePortal("Total Rent (per week)", totalRentPortal);
      rentalHtmlPortal += htmlLinePortal("Unit A – Rent (per week)", currentRentPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Unit B – Rent (per week)", currentRentSecondaryPortal);
      rentalHtmlPortal += htmlLinePortal("Unit A – Expiry", expiryPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Unit B – Expiry", expirySecondaryPortal);
      rentalHtmlPortal += htmlLinePortal("Rent Appraisal – Unit A", rentAppraisalPrimaryPortal);
      rentalHtmlPortal += htmlLinePortal("Rent Appraisal – Unit B", rentAppraisalSecondaryPortal);
      rentalHtmlPortal += htmlLinePortal("Appraised Yield", appraisedYieldPortal);
      rentalTextPortal += textLinePortal("Occupancy", occupancyPortal);
      rentalTextPortal += textLinePortal("Total Rent (per week)", totalRentPortal);
      rentalTextPortal += textLinePortal("Unit A – Rent (per week)", currentRentPrimaryPortal);
      rentalTextPortal += textLinePortal("Unit B – Rent (per week)", currentRentSecondaryPortal);
      rentalTextPortal += textLinePortal("Unit A – Expiry", expiryPrimaryPortal);
      rentalTextPortal += textLinePortal("Unit B – Expiry", expirySecondaryPortal);
      rentalTextPortal += textLinePortal("Rent Appraisal – Unit A", rentAppraisalPrimaryPortal);
      rentalTextPortal += textLinePortal("Rent Appraisal – Unit B", rentAppraisalSecondaryPortal);
      rentalTextPortal += textLinePortal("Appraised Yield", appraisedYieldPortal);
    }
    if (rentalAssessmentDialoguePortal) {
      rentalHtmlPortal += `<p>${rentalAssessmentDialoguePortal}</p>`;
      rentalTextPortal += `${rentalAssessmentDialoguePortal}\n`;
    }
    rentalTextPortal += "\n";
  }
  
  let proximityHtmlPortal = "";
  let proximityTextPortal = "";
  if (proximityPortal) {
    proximityHtmlPortal = formatProximityHtmlPortal(proximityPortal);
    proximityTextPortal += "Proximity\n";
    proximityTextPortal += `${proximityPortal}\n\n`;
  }
  
  let marketHtmlPortal = "";
  let marketTextPortal = "";
  if (hasAnyPortal("median_price_change_3_months", "median_price_change_1_year", "median_price_change_3_year", "median_price_change_5_year", "median_yield", "median_rent_change_1_year", "rental_population", "vacancy_rate", "market_performance_additional_dialogue")) {
    marketHtmlPortal += htmlLinePortal("Median Price Change – 3 months", mp3mPortal);
    marketHtmlPortal += htmlLinePortal("Median Price Change – 1 year", mp1yPortal);
    marketHtmlPortal += htmlLinePortal("Median Price Change – 3 years", mp3yPortal);
    marketHtmlPortal += htmlLinePortal("Median Price Change – 5 years", mp5yPortal);
    marketHtmlPortal += htmlLinePortal("Median Yield", medianYieldPortal);
    marketHtmlPortal += htmlLinePortal("Median Rent Change – 1 year", rentChange1yPortal);
    marketHtmlPortal += htmlLinePortal("Rental Population", rentalPopulationPortal);
    marketHtmlPortal += htmlLinePortal("Vacancy Rate", vacancyRatePortal);
    if (mpDialoguePortal) {
      marketHtmlPortal += `<p>${mpDialoguePortal}</p>`;
    }
    marketTextPortal += "Market Performance\n";
    marketTextPortal += textLinePortal("Median Price Change – 3 months", mp3mPortal);
    marketTextPortal += textLinePortal("Median Price Change – 1 year", mp1yPortal);
    marketTextPortal += textLinePortal("Median Price Change – 3 years", mp3yPortal);
    marketTextPortal += textLinePortal("Median Price Change – 5 years", mp5yPortal);
    marketTextPortal += textLinePortal("Median Yield", medianYieldPortal);
    marketTextPortal += textLinePortal("Median Rent Change – 1 year", rentChange1yPortal);
    marketTextPortal += textLinePortal("Rental Population", rentalPopulationPortal);
    marketTextPortal += textLinePortal("Vacancy Rate", vacancyRatePortal);
    if (mpDialoguePortal) {
      marketTextPortal += `${mpDialoguePortal}\n`;
    }
    marketTextPortal += "\n";
  }
  
  let highlightsHtmlPortal = "";
  let highlightsTextPortal = "";
  if (investmentHighlightsPortal) {
    highlightsHtmlPortal = formatInvestmentHighlightsHtmlPortal(investmentHighlightsPortal);
    highlightsTextPortal += "Investment Highlights\n";
    highlightsTextPortal += `${investmentHighlightsPortal}\n\n`;
  }
  
  let attachmentsInnerHtmlPortal = `<ul>
  <li>Photos</li>
  <li>Cash Flow Sheet</li>
  <li>RP Data Report</li>
  <li>Location Report</li>
</ul>`;
  if (attachmentsDialoguePortal) {
    attachmentsInnerHtmlPortal += `<p>${attachmentsDialoguePortal}</p>`;
  }
  
  let attachmentsTextPortal = "Attachments\n";
  attachmentsTextPortal += "- Photos\n- Cash Flow Sheet\n- RP Data Report\n- Location Report\n";
  if (attachmentsDialoguePortal) {
    attachmentsTextPortal += `${attachmentsDialoguePortal}\n`;
  }
  
  // Build property sections HTML string
  const propertySectionsHtml = `
                ${sectionRowPortal("Why This Property", whyHtmlPortal)}
                ${sectionRowPortal("Address", addressHtmlPortal)}
                ${sectionRowPortal("Property Description", propertyDescHtmlPortal)}
                ${sectionRowPortal("Property Overlays", overlaysHtmlPortal)}
                ${sectionRowPortal("Purchase Price", purchaseHtmlPortal)}
                ${sectionRowPortal("Rental Assessment", rentalHtmlPortal)}
                ${sectionRowPortal("Proximity", proximityHtmlPortal)}
                ${sectionRowPortal("Market Performance", marketHtmlPortal)}
                ${sectionRowPortal("Investment Highlights", highlightsHtmlPortal)}
                ${sectionRowPortal("Attachments", attachmentsInnerHtmlPortal)}
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
    
    // Build HTML email body with property details
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Property Opportunity: ${escapeHtml(propertyAddressPortal || propertyAddress)}</title>
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
      subject: `Property Opportunity: ${propertyAddressPortal || propertyAddress}`,
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










