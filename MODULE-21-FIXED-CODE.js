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

// Format to 2 decimal places for market performance fields
// Converts "N/A" and "TBC" to null for GHL (GHL doesn't accept string values for numeric fields)
const toFloat2Decimals = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const strVal = String(val).trim();
    // Convert "N/A" and "TBC" to null (GHL expects numeric or null)
    if (strVal.toUpperCase() === "N/A" || strVal.toUpperCase() === "TBC") {
        return null;
    }
    const num = parseFloat(strVal);
    if (isNaN(num)) return null;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
};

// Mapping function for asking field values (Form → GHL)
const mapAskingValue = (val) => {
    if (!val) return null;
    const mapping = {
        "onmarket": "on-market",
        "offmarket": "off-market",
        "prelaunch_opportunity": "pre-launch opportunity",
        "coming_soon": "coming soon",
        "tbc": null,
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

// Mapping function for bath values (Form → GHL)
// Converts "2.5" to "2point5" as required by GHL
const mapBathValue = (val) => {
    if (!val) return null;
    const strVal = String(val).trim();
    // Convert decimal to "point" format (e.g., "2.5" -> "2point5")
    if (strVal.includes('.')) {
        return strVal.replace('.', 'point');
    }
    // Return as-is for whole numbers or other formats
    return strVal;
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
    google_map: nullIfEmpty(formData.address?.googleMap),
    sourcer: nullIfEmpty(formData.sourcer?.replace("@buyersclub.com.au", "")),
    packager: nullIfEmpty(formData.packager?.replace("@buyersclub.com.au", "")),
    property_type: nullIfEmpty(formData.decisionTree?.propertyType),
    deal_type: nullIfEmpty(formData.decisionTree?.contractType),
    contract_type: nullIfEmpty(formData.decisionTree?.contractTypeSimplified),
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
    bath_primary: mapBathValue(formData.propertyDescription?.bathPrimary),
    baths_additional__secondary__dual_key: mapBathValue(formData.propertyDescription?.bathSecondary),
    garage_primary: nullIfEmpty(formData.propertyDescription?.garagePrimary),
    garage_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.garageSecondary),
    carport_primary: nullIfEmpty(formData.propertyDescription?.carportPrimary),
    carport_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.carportSecondary),
    carspace_primary: nullIfEmpty(formData.propertyDescription?.carspacePrimary),
    carspace_additional__secondary__dual_key: nullIfEmpty(formData.propertyDescription?.carspaceSecondary),
    year_built: nullIfEmpty(formData.propertyDescription?.yearBuilt),
    land_size: nullIfEmpty(formData.propertyDescription?.landSize),
    build_size: nullIfEmpty(formData.propertyDescription?.buildSize),
    land_registration: nullIfEmpty(formData.propertyDescription?.landRegistration),
    title: nullIfEmpty(formData.propertyDescription?.title),
    body_corp__per_quarter: nullIfEmpty(formData.propertyDescription?.bodyCorpPerQuarter),
    body_corp_description: nullIfEmpty(formData.propertyDescription?.bodyCorpDescription),
    single_or_dual_occupancy: mapSingleDualOccupancy(formData.decisionTree?.dualOccupancy),
    property_description_additional_dialogue: nullIfEmpty(formData.propertyDescription?.propertyDescriptionAdditionalDialogue),
    asking: mapAskingValue(formData.purchasePrice?.asking),
    asking_text: nullIfEmpty(formData.purchasePrice?.askingText),
    accepted_acquisition_target: nullIfEmpty(formData.purchasePrice?.acceptedAcquisitionTarget),
    acceptable_acquisition__from: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionFrom),
    acceptable_acquisition__to: nullIfEmpty(formData.purchasePrice?.acceptableAcquisitionTo),
    land_price: nullIfEmpty(formData.purchasePrice?.landPrice),
    build_price: nullIfEmpty(formData.purchasePrice?.buildPrice),
    total_price: nullIfEmpty(formData.purchasePrice?.totalPrice),
    net_price: (() => {
        // Only calculate Net Price if type is "cashback"
        if (formData.purchasePrice?.cashbackRebateType !== 'cashback') return null;
        const total = formData.purchasePrice?.totalPrice ? parseFloat(String(formData.purchasePrice.totalPrice).replace(/[$,]/g, '')) : null;
        const cashback = formData.purchasePrice?.cashbackRebateValue ? parseFloat(String(formData.purchasePrice.cashbackRebateValue).replace(/[$,]/g, '')) : null;
        if (total !== null && cashback !== null && !isNaN(total) && !isNaN(cashback)) {
            return total - cashback; // Return as number, not string
        }
        return null;
    })(),
    cashback_rebate_value: nullIfEmpty(formData.purchasePrice?.cashbackRebateValue),
    cashback_rebate_type: nullIfEmpty(formData.purchasePrice?.cashbackRebateType),
    comparable_sales: nullIfEmpty(formData.purchasePrice?.comparableSales),
    purchase_price_additional_dialogue: nullIfEmpty(formData.purchasePrice?.purchasePriceAdditionalDialogue),
    price_group: nullIfEmpty(formData.purchasePrice?.priceGroup),
    occupancy_primary: nullIfEmpty(formData.rentalAssessment?.occupancyPrimary),
    occupancy_secondary: nullIfEmpty(formData.rentalAssessment?.occupancySecondary),
    current_rent_primary__per_week: nullIfEmpty(formData.rentalAssessment?.currentRentPrimary),
    current_rent_secondary__per_week: nullIfEmpty(formData.rentalAssessment?.currentRentSecondary),
    expiry_primary: nullIfEmpty(formData.rentalAssessment?.expiryPrimary),
    expiry_secondary: nullIfEmpty(formData.rentalAssessment?.expirySecondary),
    rent_appraisal_primary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryFrom),
    rent_appraisal_primary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryTo),
    rent_appraisal_secondary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryFrom),
    rent_appraisal_secondary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryTo),
    yield: nullIfEmpty(formData.rentalAssessment?.yield),
    appraised_yield: nullIfEmpty(formData.rentalAssessment?.appraisedYield),
    rental_assessment_additional_dialogue: nullIfEmpty(formData.rentalAssessment?.rentalAssessmentAdditionalDialogue),
    median_price_change__3_months: toFloat2Decimals(formData.marketPerformance?.medianPriceChange3Months),
    median_price_change__1_year: toFloat2Decimals(formData.marketPerformance?.medianPriceChange1Year),
    median_price_change__3_year: toFloat2Decimals(formData.marketPerformance?.medianPriceChange3Year),
    median_price_change__5_year: toFloat2Decimals(formData.marketPerformance?.medianPriceChange5Year),
    median_yield: toFloat2Decimals(formData.marketPerformance?.medianYield),
    median_rent_change__1_year: toFloat2Decimals(formData.marketPerformance?.medianRentChange1Year),
    rental_population: toFloat2Decimals(formData.marketPerformance?.rentalPopulation),
    vacancy_rate: toFloat2Decimals(formData.marketPerformance?.vacancyRate),
    market_performance_additional_dialogue: nullIfEmpty(formData.marketPerformance?.marketPerformanceAdditionalDialogue),
    why_this_property: nullIfEmpty(formData.contentSections?.whyThisProperty),
    proximity: nullIfEmpty(formData.contentSections?.proximity),
    investment_highlights: nullIfEmpty(formData.contentSections?.investmentHighlights),
    agent_name: nullIfEmpty(formData.sellingAgentName),
    agent_mobile: nullIfEmpty(formData.sellingAgentMobile),
    agent_email: nullIfEmpty(formData.sellingAgentEmail),
    message_for_ba: nullIfEmpty(formData.messageForBA),
    attachments_additional_dialogue: nullIfEmpty(formData.attachmentsAdditionalDialogue),
    push_record_to_deal_sheet: nullIfEmpty(formData.pushRecordToDealSheet),
    lot_number: nullIfEmpty(formData.address?.lotNumber),
    project_parent_id: null,
    project_identifier: null,
    is_parent_record: null,
    project_brief: nullIfEmpty(formData.propertyDescription?.projectOverview)
  }
};

return payload;
