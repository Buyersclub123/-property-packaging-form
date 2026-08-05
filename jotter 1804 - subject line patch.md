## REPLACE lines 2099-2193 in Module 3 with the following:

```javascript
  subjectPrefix = "PACKAGER TO CONFIRM – ";
}

// Check for pre-computed subject line from the form
const formSubjectLine = v("subject_line");
let reviewRule;

if (formSubjectLine && formSubjectLine.trim() !== "") {
  // New path: use pre-computed subject line from form
  reviewRule = formSubjectLine;
} else {
  // Legacy fallback for old records without subject_line

  // Read fields for subject line formatting
  const propertyType = v("property_type");
  const dealType = v("deal_type");
  const contractTypeSimplified = v("contract_type"); // "Single Contract" or "Split Contract" for H&L properties
  const templateType = v("template_type");
  const action = v("action");
  const projectIdentifier = v("project_identifier");
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
  reviewRule = "Property Review";
  const isProject =
    (templateType && templateType.toLowerCase() === "project") ||
    (isParentRecord && isParentRecord.toLowerCase() === "yes") ||
    (action && action.toLowerCase() === "project_created") ||
    !!projectIdentifier;
  const isEstablished = (propertyType && propertyType.toLowerCase() === "established") || (dealType && dealType === "05_established");
  const isHAndL = (propertyType && propertyType.toLowerCase() === "new") && (dealType && dealType === "01_hl_comms") && !isProject;
  const isSMSF = (propertyType && propertyType.toLowerCase() === "new") && dealType && (dealType === "02_single_comms" || dealType === "03_internal_with_comms" || dealType === "04_internal_nocomms");

  let displayAddress = propertyAddress;
  if (isProject) {
    const projectAddrRaw = v("project_address") || propertyAddress || "";
    displayAddress = String(projectAddrRaw)
      .trim()
      .replace(/^\s*(lot|unit)\s*[^,]+,\s*/i, "")
      .replace(/^\s*(lot|unit)\s+\S+\s+/i, "");
  }

  if (isProject) {
    // Project format: "Property Review (H&L Project): PROJECT ADDRESS"
    const projectType = isHAndL ? "H&L Project" : (isSMSF ? "SMSF Project" : "Project");
    const projectAddressRaw = v("project_address") || propertyAddress || "";
    const projectAddress = String(projectAddressRaw)
      .trim()
      .replace(/^\s*(lot|unit)\s*[^,]+,\s*/i, "")
      .replace(/^\s*(lot|unit)\s+\S+\s+/i, "");
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
} // end legacy fallback

const subject = `${subjectPrefix}${reviewRule}`;
```
