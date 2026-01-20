// Access input variables - try multiple patterns
const lot_data = input.lot_data || input.lotData;
let shared_data = input.shared_data || input.shared_Data || input.sharedData || input.fd;

// Try multiple paths to find shared data
if (!shared_data) {
    if (input.incoming_data && input.incoming_data.formData) {
        shared_data = input.incoming_data.formData;
    } else if (input.Data && input.Data.formData) {
        shared_data = input.Data.formData;
    } else if (input.data && input.data.formData) {
        shared_data = input.data.formData;
    }
}

const project_identifier = input.project_identifier || input.projectIdentifier;

// Helper functions
const requiredString = (val) => {
    return (!val || val === "" || val === null) ? "No Address Provided" : String(val);
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

// Safety checks
if (!lot_data) {
    throw "No lot data received. Check input variable lot_data is mapped correctly";
}

if (!shared_data) {
    throw "No shared data received. Check module mapping";
}

// Extract lot-specific data
const lot = lot_data;
const lotNumber = lot.lotNumber || "";
const propertyDesc = lot.propertyDescription || {};
const purchasePrice = lot.purchasePrice || {};
const rentalAssessment = lot.rentalAssessment || {};

// Extract shared data
const projectAddress = shared_data.address?.projectAddress || "";

// Build property address from address components (not project address)
// Construct from street number, street name, suburb, state, postcode with lot number prefix
const buildPropertyAddress = () => {
    const streetNumber = shared_data.address?.streetNumber || "";
    const streetName = shared_data.address?.streetName || "";
    const suburbName = shared_data.address?.suburbName || "";
    const state = shared_data.address?.state || "";
    const postCode = shared_data.address?.postCode || "";
    
    const addressParts = [streetNumber, streetName, suburbName, state, postCode].filter(part => part && part.trim());
    const baseAddress = addressParts.join(" ");
    
    if (lotNumber && lotNumber.trim()) {
        return `Lot ${lotNumber}, ${baseAddress}`;
    }
    return baseAddress || shared_data.address?.propertyAddress || "No Address Provided";
};

const propertyAddress = buildPropertyAddress();

// Build payload
const payload = {
    locationId: "UJWYn4mrgGodB7KZUcHt",
    properties: {
        // Address fields
        property_address: requiredString(propertyAddress),
        lot_number: nullIfEmpty(lotNumber),
        street_number: nullIfEmpty(shared_data.address?.streetNumber),
        street_name: nullIfEmpty(shared_data.address?.streetName),
        suburb_name: nullIfEmpty(shared_data.address?.suburbName),
        state: nullIfEmpty(shared_data.address?.state),
        post_code: nullIfEmpty(shared_data.address?.postCode),
        lga: nullIfEmpty(shared_data.address?.lga),
        unit__lot: nullIfEmpty(shared_data.address?.unitNumber),
        google_map: nullIfEmpty(shared_data.address?.googleMap),
        project_address: nullIfEmpty(shared_data.address?.projectAddress),
        
        // Project linking fields (no parent, all are children)
        project_identifier: nullIfEmpty(project_identifier),
        is_parent_record: "No",
        
        // Shared fields
        property_type: nullIfEmpty(shared_data.decisionTree?.propertyType),
        sourcer: nullIfEmpty(shared_data.sourcer?.replace("@buyersclub.com.au", "")),
        packager: nullIfEmpty(shared_data.packager?.replace("@buyersclub.com.au", "")),
        deal_type: nullIfEmpty(shared_data.decisionTree?.contractType),
        contract_type: nullIfEmpty(shared_data.decisionTree?.contractTypeSimplified),
        status: nullIfEmpty(shared_data.decisionTree?.status),
        folder_link: nullIfEmpty(shared_data.folderLink),
        project_name: nullIfEmpty(shared_data.address?.projectName),
        project_brief: nullIfEmpty(shared_data.propertyDescription?.projectOverview),
        
        // Risk Overlays
        zoning: nullIfEmpty(shared_data.riskOverlays?.zoning),
        flood: nullIfEmpty(shared_data.riskOverlays?.flood),
        flood_dialogue: nullIfEmpty(shared_data.riskOverlays?.floodDialogue),
        bushfire: nullIfEmpty(shared_data.riskOverlays?.bushfire),
        bushfire_dialogue: nullIfEmpty(shared_data.riskOverlays?.bushfireDialogue),
        mining: nullIfEmpty(shared_data.riskOverlays?.mining),
        mining_dialogie: nullIfEmpty(shared_data.riskOverlays?.miningDialogue),
        other_overlay: nullIfEmpty(shared_data.riskOverlays?.otherOverlay),
        other_overlay_dialogue: nullIfEmpty(shared_data.riskOverlays?.otherOverlayDialogue),
        special_infrastructure: nullIfEmpty(shared_data.riskOverlays?.specialInfrastructure),
        special_infrastructure_dialogue: nullIfEmpty(shared_data.riskOverlays?.specialInfrastructureDialogue),
        due_diligence_acceptance: nullIfEmpty(shared_data.riskOverlays?.dueDiligenceAcceptance),
        
        // Market Performance
        median_price_change__3_months: toFloat2Decimals(shared_data.marketPerformance?.medianPriceChange3Months),
        median_price_change__1_year: toFloat2Decimals(shared_data.marketPerformance?.medianPriceChange1Year),
        median_price_change__3_year: toFloat2Decimals(shared_data.marketPerformance?.medianPriceChange3Year),
        median_price_change__5_year: toFloat2Decimals(shared_data.marketPerformance?.medianPriceChange5Year),
        median_yield: toFloat2Decimals(shared_data.marketPerformance?.medianYield),
        median_rent_change__1_year: toFloat2Decimals(shared_data.marketPerformance?.medianRentChange1Year),
        rental_population: toFloat2Decimals(shared_data.marketPerformance?.rentalPopulation),
        vacancy_rate: toFloat2Decimals(shared_data.marketPerformance?.vacancyRate),
        market_performance_additional_dialogue: nullIfEmpty(shared_data.marketPerformance?.marketPerformanceAdditionalDialogue),
        
        // Content Sections
        why_this_property: nullIfEmpty(shared_data.contentSections?.whyThisProperty),
        proximity: nullIfEmpty(shared_data.contentSections?.proximity),
        investment_highlights: nullIfEmpty(shared_data.contentSections?.investmentHighlights),
        
        // Property Description
        beds_primary: nullIfEmpty(propertyDesc.bedsPrimary),
        beds_additional__secondary__dual_key: nullIfEmpty(propertyDesc.bedsSecondary),
        bath_primary: mapBathValue(propertyDesc.bathPrimary),
        baths_additional__secondary__dual_key: mapBathValue(propertyDesc.bathSecondary),
        garage_primary: nullIfEmpty(propertyDesc.garagePrimary),
        garage_additional__secondary__dual_key: nullIfEmpty(propertyDesc.garageSecondary),
        carport_primary: nullIfEmpty(propertyDesc.carportPrimary),
        carport_additional__secondary__dual_key: nullIfEmpty(propertyDesc.carportSecondary),
        carspace_primary: nullIfEmpty(propertyDesc.carspacePrimary),
        carspace_additional__secondary__dual_key: nullIfEmpty(propertyDesc.carspaceSecondary),
        year_built: nullIfEmpty(propertyDesc.yearBuilt),
        land_size: nullIfEmpty(propertyDesc.landSize),
        build_size: nullIfEmpty(propertyDesc.buildSize),
        land_registration: nullIfEmpty(propertyDesc.landRegistration),
        title: nullIfEmpty(propertyDesc.title),
        body_corp__per_quarter: nullIfEmpty(propertyDesc.bodyCorpPerQuarter),
        body_corp_description: nullIfEmpty(propertyDesc.bodyCorpDescription),
        single_or_dual_occupancy: mapSingleDualOccupancy(lot.singleOrDual),
        property_description_additional_dialogue: nullIfEmpty(shared_data.propertyDescription?.propertyDescriptionAdditionalDialogue),
        
        // Purchase Price
        asking: mapAskingValue(shared_data.purchasePrice?.asking),
        acceptable_acquisition__from: nullIfEmpty(purchasePrice.acceptableAcquisitionFrom),
        acceptable_acquisition__to: nullIfEmpty(purchasePrice.acceptableAcquisitionTo),
        land_price: nullIfEmpty(purchasePrice.landPrice),
        build_price: nullIfEmpty(purchasePrice.buildPrice),
        total_price: nullIfEmpty(purchasePrice.totalPrice),
        net_price: (() => {
            // Only calculate Net Price if type is "cashback"
            if (purchasePrice.cashbackRebateType !== 'cashback') return null;
            const total = purchasePrice.totalPrice ? parseFloat(String(purchasePrice.totalPrice).replace(/[$,]/g, '')) : null;
            const cashback = purchasePrice.cashbackRebateValue ? parseFloat(String(purchasePrice.cashbackRebateValue).replace(/[$,]/g, '')) : null;
            if (total !== null && cashback !== null && !isNaN(total) && !isNaN(cashback)) {
                return (total - cashback).toString();
            }
            return null;
        })(),
        cashback_rebate_value: nullIfEmpty(purchasePrice.cashbackRebateValue),
        cashback_rebate_type: nullIfEmpty(purchasePrice.cashbackRebateType),
        comparable_sales: nullIfEmpty(shared_data.purchasePrice?.comparableSales),
        purchase_price_additional_dialogue: nullIfEmpty(shared_data.purchasePrice?.purchasePriceAdditionalDialogue),
        price_group: nullIfEmpty(shared_data.purchasePrice?.priceGroup),
        
        // Rental Assessment
        occupancy_primary: nullIfEmpty(rentalAssessment.occupancyPrimary),
        occupancy_secondary: nullIfEmpty(rentalAssessment.occupancySecondary),
        current_rent_primary__per_week: nullIfEmpty(rentalAssessment.currentRentPrimary),
        current_rent_secondary__per_week: nullIfEmpty(rentalAssessment.currentRentSecondary),
        expiry_primary: nullIfEmpty(rentalAssessment.expiryPrimary),
        expiry_secondary: nullIfEmpty(rentalAssessment.expirySecondary),
        rent_appraisal_primary_from: nullIfEmpty(rentalAssessment.rentAppraisalPrimaryFrom),
        rent_appraisal_primary_to: nullIfEmpty(rentalAssessment.rentAppraisalPrimaryTo),
        rent_appraisal_secondary_from: nullIfEmpty(rentalAssessment.rentAppraisalSecondaryFrom),
        rent_appraisal_secondary_to: nullIfEmpty(rentalAssessment.rentAppraisalSecondaryTo),
        yield: nullIfEmpty(rentalAssessment.yield),
        appraised_yield: nullIfEmpty(rentalAssessment.appraisedYield),
        rental_assessment_additional_dialogue: nullIfEmpty(shared_data.rentalAssessment?.rentalAssessmentAdditionalDialogue),
        
        // Agent Info
        agent_name: nullIfEmpty(shared_data.sellingAgentName),
        agent_email: nullIfEmpty(shared_data.sellingAgentEmail),
        agent_mobile: nullIfEmpty(shared_data.sellingAgentMobile),
        
        // Additional fields
        message_for_ba: nullIfEmpty(shared_data.messageForBA),
        attachments_additional_dialogue: nullIfEmpty(shared_data.attachmentsAdditionalDialogue)
    }
};

return payload;
