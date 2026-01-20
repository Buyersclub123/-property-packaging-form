// Extract inputs
const lot_data = input.lot_data;
const shared_data = input.shared_data;
const parent_record_id = input.parent_record_id;
const project_identifier = input.project_identifier;

// Safety checks
if (!lot_data) {
    throw new Error("No lot data received from Iterator.");
}
if (!shared_data) {
    throw new Error("No shared data received from Module 6.");
}

// Helper functions (same as Route 1 Module 21)
const requiredString = (val) => {
    if (!val || val === "" || val === null) return "No Address Provided";
    return String(val);
};

const nullIfEmpty = (val) => (!val || val === "" ? null : val);

// Mapping function for single/dual occupancy (Form → GHL)
const mapSingleDualOccupancy = (val) => {
    if (!val) return null;
    if (val === "Yes") return "dual_occupancy";
    if (val === "No") return "single_occupancy";
    return null;
};

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
        
        // Project linking fields
        project_parent_id: nullIfEmpty(parent_record_id),
        project_identifier: nullIfEmpty(project_identifier),
        is_parent_record: "No",
        
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
