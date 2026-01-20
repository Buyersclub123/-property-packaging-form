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

const parent_record_id = input.parent_record_id || input.parentRecordId;
const project_identifier = input.project_identifier || input.projectIdentifier;

// Helper functions
const requiredString = (val) => {
    return (!val || val === "" || val === null) ? "No Address Provided" : String(val);
};

const nullIfEmpty = (val) => (!val || val === "" ? null : val);

// Mapping function for single/dual occupancy (Form → GHL)
const mapSingleDualOccupancy = (val) => {
    if (!val) return null;
    if (val === "Yes") return "dual_occupancy";
    if (val === "No") return "single_occupancy";
    return null;
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

// Build property address with lot number prefix
const propertyAddress = `Lot ${lotNumber}, ${projectAddress}`;

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
        unit__lot_secondary: nullIfEmpty(shared_data.address?.unitNumberSecondary),
        google_map: nullIfEmpty(shared_data.address?.googleMap),
        
        // Project linking fields
        project_parent_id: nullIfEmpty(parent_record_id),
        project_identifier: nullIfEmpty(project_identifier),
        is_parent_record: "No",
        
        // Shared fields
        sourcer: nullIfEmpty(shared_data.sourcer?.replace("@buyersclub.com.au", "")),
        packager: nullIfEmpty(shared_data.packager?.replace("@buyersclub.com.au", "")),
        deal_type: nullIfEmpty(shared_data.decisionTree?.contractType),
        contract_type: nullIfEmpty(shared_data.decisionTree?.contractTypeSimplified),
        status: nullIfEmpty(shared_data.decisionTree?.status),
        folder_link: nullIfEmpty(shared_data.folderLink),
        
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
        
        // Content Sections
        why_this_property: nullIfEmpty(shared_data.contentSections?.whyThisProperty),
        proximity: nullIfEmpty(shared_data.contentSections?.proximity),
        investment_highlights: nullIfEmpty(shared_data.contentSections?.investmentHighlights),
        
        // Property Description
        beds_primary: nullIfEmpty(propertyDesc.bedsPrimary),
        beds_additional__secondary__dual_key: nullIfEmpty(propertyDesc.bedsSecondary),
        bath_primary: nullIfEmpty(propertyDesc.bathPrimary),
        baths_additional__secondary__dual_key: nullIfEmpty(propertyDesc.bathSecondary),
        garage_primary: nullIfEmpty(propertyDesc.garagePrimary),
        garage_additional__secondary__dual_key: nullIfEmpty(propertyDesc.garageSecondary),
        carport_primary: nullIfEmpty(propertyDesc.carportPrimary),
        carport_additional__secondary__dual_key: nullIfEmpty(propertyDesc.carportSecondary),
        carspace_primary: nullIfEmpty(propertyDesc.carspacePrimary),
        carspace_additional__secondary__dual_key: nullIfEmpty(propertyDesc.carspaceSecondary),
        year_built: nullIfEmpty(propertyDesc.yearBuilt),
        land_size: nullIfEmpty(propertyDesc.landSize),
        build_size: nullIfEmpty(propertyDesc.buildSize),
        build_size_primary: nullIfEmpty(propertyDesc.buildSizePrimary),
        build_size_secondary: nullIfEmpty(propertyDesc.buildSizeSecondary),
        land_registration: nullIfEmpty(propertyDesc.landRegistration),
        title: nullIfEmpty(propertyDesc.title),
        body_corp__per_quarter: nullIfEmpty(propertyDesc.bodyCorpPerQuarter),
        body_corp_description: nullIfEmpty(propertyDesc.bodyCorpDescription),
        single_or_dual_occupancy: mapSingleDualOccupancy(lot.singleOrDual),
        property_description_additional_dialogue: nullIfEmpty(propertyDesc.additionalDialogue),
        
        // Purchase Price
        acceptable_acquisition__from: nullIfEmpty(purchasePrice.acceptableAcquisitionFrom),
        acceptable_acquisition__to: nullIfEmpty(purchasePrice.acceptableAcquisitionTo),
        land_price: nullIfEmpty(purchasePrice.landPrice),
        build_price: nullIfEmpty(purchasePrice.buildPrice),
        total_price: nullIfEmpty(purchasePrice.totalPrice),
        cashback_rebate_value: nullIfEmpty(purchasePrice.cashbackRebateValue),
        cashback_rebate_type: nullIfEmpty(purchasePrice.cashbackRebateType),
        comparable_sales: nullIfEmpty(purchasePrice.comparableSales),
        
        // Rental Assessment
        occupancy_primary: nullIfEmpty(rentalAssessment.occupancyPrimary),
        occupancy_secondary: nullIfEmpty(rentalAssessment.occupancySecondary),
        current_rent_primary__per_week: nullIfEmpty(rentalAssessment.currentRentPrimary),
        current_rent_secondary__per_week: nullIfEmpty(rentalAssessment.currentRentSecondary),
        expiry_primary: nullIfEmpty(rentalAssessment.expiryPrimary),
        expiry_secondary: nullIfEmpty(rentalAssessment.expirySecondary),
        rent_appraisal_primary: nullIfEmpty(rentalAssessment.rentAppraisalPrimary),
        rent_appraisal_primary_from: nullIfEmpty(rentalAssessment.rentAppraisalPrimaryFrom),
        rent_appraisal_primary_to: nullIfEmpty(rentalAssessment.rentAppraisalPrimaryTo),
        rent_appraisal_secondary: nullIfEmpty(rentalAssessment.rentAppraisalSecondary),
        rent_appraisal_secondary_from: nullIfEmpty(rentalAssessment.rentAppraisalSecondaryFrom),
        rent_appraisal_secondary_to: nullIfEmpty(rentalAssessment.rentAppraisalSecondaryTo),
        yield: nullIfEmpty(rentalAssessment.yield),
        appraised_yield: nullIfEmpty(rentalAssessment.appraisedYield),
        rent_dialogue_primary: nullIfEmpty(rentalAssessment.rentDialoguePrimary),
        rent_dialogue_secondary: nullIfEmpty(rentalAssessment.rentDialogueSecondary),
        rental_assessment_additional_dialogue: nullIfEmpty(rentalAssessment.rentalAssessmentAdditionalDialogue)
    }
};

return payload;
