# Module 21 Complete Code - All Fields Restored

**Date:** January 10, 2026  
**Status:** Test version - Integer fields changed to `nullIfEmpty()` (send as strings)  
**Configuration:** Module 21 returns `payload` (object), Module 14 uses "JSON" body type with "JSON string" input method

---

## Complete Module 21 Code

**Paste this entire code into Module 21 in Make.com:**

```javascript
// Access Module 1's output directly (no Input mapping needed)
const formData = input.fd;

// Safety check
if (!formData) {
    throw new Error("No data received from Module 1.");
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

// Mapping function for single/dual occupancy (Form → GHL)
const mapSingleDualOccupancy = (val) => {
    if (!val) return null;
    if (val === "Yes") return "dual_occupancy";
    if (val === "No") return "single_occupancy";
    return null;
};

// Build the complete payload
const payload = {
  locationId: "UJWYn4mrgGodB7KZUcHt",
  properties: {
    property_address: requiredString(formData.address?.propertyAddress),
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
    beds_primary: nullIfEmpty(formData.propertyDescription?.bedsPrimary),
    beds_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.bedsSecondary),
    bath_primary: nullIfEmpty(formData.propertyDescription?.bathPrimary),
    baths_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.bathSecondary),
    garage_primary: nullIfEmpty(formData.propertyDescription?.garagePrimary),
    garage_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.garageSecondary),
    carport_primary: nullIfEmpty(formData.propertyDescription?.carportPrimary),
    carport_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.carportSecondary),
    carspace_primary: nullIfEmpty(formData.propertyDescription?.carspacePrimary),
    carspace_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.carspaceSecondary),
    year_built: nullIfEmpty(formData.propertyDescription?.yearBuilt),
    land_size: nullIfEmpty(formData.propertyDescription?.landSize),
    build_size: nullIfEmpty(formData.propertyDescription?.buildSize),
    build_size_primary: nullIfEmpty(formData.propertyDescription?.buildSizePrimary),
    build_size_secondary: nullIfEmpty(formData.propertyDescription?.buildSizeSecondary),
    land_registration: nullIfEmpty(formData.propertyDescription?.landRegistration),
    title: nullIfEmpty(formData.propertyDescription?.title),
    body_corp__per_quarter: nullIfEmpty(formData.propertyDescription?.bodyCorpPerQuarter),
    body_corp_description: nullIfEmpty(formData.propertyDescription?.bodyCorpDescription),
    single_or_dual_occupancy: mapSingleDualOccupancy(formData.decisionTree?.dualOccupancy),
    property_description_additional_dialogue: nullIfEmpty(formData.propertyDescription?.additionalDialogue),
    asking: mapAskingValue(formData.purchasePrice?.asking),
    asking_text: nullIfEmpty(formData.purchasePrice?.askingText),
    accepted_acquisition_target: nullIfEmpty(formData.purchasePrice?.acceptedAcquisitionTarget),
    acceptable_acquisition__from: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionFrom),
    acceptable_acquisition__to: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionTo),
    land_price: nullIfEmpty(formData.purchasePrice?.landPrice),
    build_price: nullIfEmpty(formData.purchasePrice?.buildPrice),
    total_price: nullIfEmpty(formData.purchasePrice?.totalPrice),
    cashback_rebate_value: nullIfEmpty(formData.purchasePrice?.cashbackRebateValue),
    cashback_rebate_type: nullIfEmpty(formData.purchasePrice?.cashbackRebateType),
    comparable_sales: nullIfEmpty(formData.purchasePrice?.comparableSales),
    purchase_price_additional_dialogue: nullIfEmpty(formData.purchasePrice?.purchasePriceAdditionalDialogue),
    price_group: nullIfEmpty(formData.purchasePrice?.priceGroup),
    occupancy: nullIfEmpty(formData.rentalAssessment?.occupancy),
    occupancy_primary: nullIfEmpty(formData.rentalAssessment?.occupancyPrimary),
    occupancy_secondary: nullIfEmpty(formData.rentalAssessment?.occupancySecondary),
    current_rent_primary__per_week: nullIfEmpty(formData.rentalAssessment?.currentRentPrimary),
    current_rent_secondary__per_week: nullIfEmpty(formData.rentalAssessment?.currentRentSecondary),
    expiry_primary: nullIfEmpty(formData.rentalAssessment?.expiryPrimary),
    expiry_secondary: nullIfEmpty(formData.rentalAssessment?.expirySecondary),
    rent_appraisal_primary: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimary),
    rent_appraisal_primary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryFrom),
    rent_appraisal_primary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryTo),
    rent_appraisal_secondary: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondary),
    rent_appraisal_secondary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryFrom),
    rent_appraisal_secondary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryTo),
    yield: nullIfEmpty(formData.rentalAssessment?.yield),
    appraised_yield: nullIfEmpty(formData.rentalAssessment?.appraisedYield),
    rent_dialogue_primary: nullIfEmpty(formData.rentalAssessment?.rentDialoguePrimary),
    rent_dialogue_secondary: nullIfEmpty(formData.rentalAssessment?.rentDialogueSecondary),
    rental_assessment_additional_dialogue: nullIfEmpty(formData.rentalAssessment?.rentalAssessmentAdditionalDialogue),
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
    lot_number: null,
    project_parent_id: null,
    project_identifier: null,
    is_parent_record: null,
    project_brief: null,
    project_overview: null
  }
};

return payload;
```

---

## Changes Made

### Fields Changed from `toInteger()` to `nullIfEmpty()` (Send as Strings)
1. `acceptable_acquisition__from` - Changed to `nullIfEmpty()`
2. `acceptable_acquisition__to` - Changed to `nullIfEmpty()`
3. `land_price` - Changed to `nullIfEmpty()`
4. `build_price` - Changed to `nullIfEmpty()`
5. `total_price` - Changed to `nullIfEmpty()`
6. `cashback_rebate_value` - Changed to `nullIfEmpty()`
7. `current_rent_primary__per_week` - Changed to `nullIfEmpty()`
8. `current_rent_secondary__per_week` - Changed to `nullIfEmpty()`
9. `rent_appraisal_primary_from` - Changed to `nullIfEmpty()`
10. `rent_appraisal_primary_to` - Changed to `nullIfEmpty()`
11. `rent_appraisal_secondary_from` - Changed to `nullIfEmpty()`
12. `rent_appraisal_secondary_to` - Changed to `nullIfEmpty()`

### Fields Kept as `toFloat()` (Working as Numbers)
- `median_price_change__3_months`
- `median_price_change__1_year`
- `median_price_change__3_year`
- `median_price_change__5_year`
- `median_yield`
- `median_rent_change__1_year`
- `rental_population`
- `vacancy_rate`

### Fields Added Back
- `asking` - Added back with `mapAskingValue()` function to map form values to GHL values

---

## Helper Functions

**`mapAskingValue()`** - Maps form asking values to GHL accepted values:
- "On-market" → "on-market"
- "Off-market" → "off-market"
- "Pre-launch" → "pre-launch opportunity"
- "Coming Soon" → "coming soon"
- "TBC" → null
- "N/A" → null

---

## Module 14 Configuration (Keep As Is)

**Body content type:** `json`
**Body input method:** `jsonString`
**Body content:** `{{21.result}}`

---

## Quick Copy-Paste (Code Only)

If you just need the code without documentation, here's the clean version:
