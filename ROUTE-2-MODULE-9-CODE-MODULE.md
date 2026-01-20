# Route 2 - Module 9 Code Module (Before HTTP Create Parent)

**Date:** January 10, 2026  
**Purpose:** Transform Route 2 parent record data before sending to GHL (similar to Module 21 for Route 1)

---

## Add New Code Module Before Module 9

**Location:** After Module 6 (Set Variable), before Module 9 (HTTP - Create Parent Record)  
**Module Type:** Make Code - Run code  
**Input Variable:** `fd` mapped to `{{6.incoming_data.formData}}`

---

## Complete Code for Route 2 Parent Record

**Paste this entire code into the new Code module (Module 8 or Module 9A):**

```javascript
// Access Module 6's output
const formData = input.fd;

// Safety check
if (!formData) {
    throw new Error("No data received from Module 6.");
}

// Get folderLink
const folderLink = formData.folderLink || null;

// Helper: Ensure property_address is NEVER null (Required by GHL)
const requiredString = (val) => {
    if (!val || val === "" || val === null) return "No Address Provided";
    return String(val);
};

const nullIfEmpty = (val) => (!val || val === "" ? null : val);

const toFloat = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

// Mapping function for asking field values (Form → GHL)
const mapAskingValue = (val) => {
    if (!val) return null;
    const mapping = {
        "On-market": "on-market",
        "Off-market": "off-market",
        "Pre-launch": "pre-launch opportunity",
        "Coming Soon": "coming soon",
        "TBC": null,
        "N/A": null
    };
    return mapping[val] || null;
};

// Get first lot number for parent record address
const firstLotNumber = formData.lots && formData.lots.length > 0 ? formData.lots[0].lotNumber : null;
const baseAddress = formData.address?.projectAddress || formData.address?.propertyAddress;
const parentAddress = firstLotNumber 
  ? `Lot ${firstLotNumber}, ${baseAddress || "No Address Provided"}`
  : requiredString(baseAddress);

// Build the parent record payload (shared project data only)
const payload = {
  locationId: "UJWYn4mrgGodB7KZUcHt",
  properties: {
    property_address: parentAddress,
    street_number: nullIfEmpty(formData.address?.streetNumber),
    street_name: nullIfEmpty(formData.address?.streetName),
    suburb_name: nullIfEmpty(formData.address?.suburbName),
    state: nullIfEmpty(formData.address?.state),
    post_code: nullIfEmpty(formData.address?.postCode),
    lga: nullIfEmpty(formData.address?.lga),
    unit__lot: nullIfEmpty(formData.address?.unitNumber),
    unit__lot_secondary: nullIfEmpty(formData.address?.unitNumberSecondary),
    google_map: nullIfEmpty(formData.address?.googleMap),
    sourcer: nullIfEmpty(formData.sourcer?.replace("@buyersclub.com.au", "")),
    packager: nullIfEmpty(formData.packager?.replace("@buyersclub.com.au", "")),
    deal_type: nullIfEmpty(formData.decisionTree?.contractType),
    status: nullIfEmpty(formData.decisionTree?.status),
    folder_link: folderLink,
    zoning: nullIfEmpty(formData.riskOverlays?.zoning),
    flood: nullIfEmpty(formData.riskOverlays?.flood),
    flood_dialogue: nullIfEmpty(formData.riskOverlays?.floodDialogue),
    bushfire: nullIfEmpty(formData.riskOverlays?.bushfire),
    bushfire_dialogue: nullIfEmpty(formData.riskOverlays?.bushfireDialogue),
    mining: nullIfEmpty(formData.riskOverlays?.mining),
    mining_dialogie: nullIfEmpty(formData.riskOverlays?.miningDialogue),
    other_overlay: nullIfEmpty(formData.riskOverlays?.otherOverlay),
    other_overlay_dialogue: nullIfEmpty(formData.riskOverlays?.otherOverlayDialogue),
    special_infrastructure: nullIfEmpty(formData.riskOverlays?.specialInfrastructure),
    special_infrastructure_dialogue: nullIfEmpty(formData.riskOverlays?.specialInfrastructureDialogue),
    due_diligence_acceptance: nullIfEmpty(formData.riskOverlays?.dueDiligenceAcceptance),
    title: nullIfEmpty(formData.propertyDescription?.title),
    body_corp__per_quarter: nullIfEmpty(formData.propertyDescription?.bodyCorpPerQuarter),
    body_corp_description: nullIfEmpty(formData.propertyDescription?.bodyCorpDescription),
    property_description_additional_dialogue: nullIfEmpty(formData.propertyDescription?.additionalDialogue),
    asking: mapAskingValue(formData.purchasePrice?.asking),
    asking_text: nullIfEmpty(formData.purchasePrice?.askingText),
    accepted_acquisition_target: nullIfEmpty(formData.purchasePrice?.acceptedAcquisitionTarget),
    acceptable_acquisition__from: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionFrom),
    acceptable_acquisition__to: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionTo),
    cashback_rebate_type: nullIfEmpty(formData.purchasePrice?.cashbackRebateType),
    comparable_sales: nullIfEmpty(formData.purchasePrice?.comparableSales),
    purchase_price_additional_dialogue: nullIfEmpty(formData.purchasePrice?.purchasePriceAdditionalDialogue),
    price_group: nullIfEmpty(formData.purchasePrice?.priceGroup),
    occupancy: nullIfEmpty(formData.rentalAssessment?.occupancy),
    median_price_change__3_months: toFloat(formData.marketPerformance?.medianPriceChange3Months),
    median_price_change__1_year: toFloat(formData.marketPerformance?.medianPriceChange1Year),
    median_price_change__3_year: toFloat(formData.marketPerformance?.medianPriceChange3Year),
    median_price_change__5_year: toFloat(formData.marketPerformance?.medianPriceChange5Year),
    median_yield: toFloat(formData.marketPerformance?.medianYield),
    median_rent_change__1_year: toFloat(formData.marketPerformance?.medianRentChange1Year),
    rental_population: toFloat(formData.marketPerformance?.rentalPopulation),
    vacancy_rate: toFloat(formData.marketPerformance?.vacancyRate),
    market_perfornance_additional_dialogue: nullIfEmpty(formData.marketPerformance?.marketPerformanceAdditionalDialogue),
    why_this_property: nullIfEmpty(formData.contentSections?.whyThisProperty),
    proximity: nullIfEmpty(formData.contentSections?.proximity),
    investment_highlights: nullIfEmpty(formData.contentSections?.investmentHighlights),
    agent_name: nullIfEmpty(formData.agentInfo?.name),
    agent_mobile: nullIfEmpty(formData.agentInfo?.mobile),
    agent_email: nullIfEmpty(formData.agentInfo?.email),
    message_for_ba: nullIfEmpty(formData.messageForBA),
    attachments_additional_dialogue: nullIfEmpty(formData.attachmentsAdditionalDialogue),
    push_record_to_deal_sheet: nullIfEmpty(formData.pushRecordToDealSheet),
    is_parent_record: "Yes",
    project_identifier: `PROJ-${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`,
    project_brief: null,
    project_overview: null
  }
};

return payload;
```

---

## Update Module 9 Configuration

After adding the Code module, update Module 9 (HTTP - Create Parent Record):

**Body content type:** `json`  
**Body input method:** `jsonString`  
**Body content:** `{{[NEW_CODE_MODULE].result}}`

---

## Updated Route 2 Flow

```
Module 1: Webhook
  ↓
Module 2: Router (Route 2: Project)
  ↓
Module 6: Set Variable (incoming_data)
  ↓
NEW: Code Module (transform parent data) ← ADD THIS
  ↓
Module 9: HTTP - Create Parent Record (use {{NEW_CODE_MODULE.result}})
  ↓
Module 10: Set Variable (parent_record_id)
  ↓
Module 13: Set Variable (project_identifier)
  ↓
Module 11: Iterator (lots)
  ↓
Module 12: HTTP - Create Child Records (uses Iterator output)
```

---

**Add this Code module before Module 9, then update Module 9 to use its output instead of building JSON directly.**
