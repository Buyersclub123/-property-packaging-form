# Route 2 - Module 12 Code Module Implementation

**Date:** January 11, 2026  
**Purpose:** Add Code module before Module 12 to handle empty fields correctly (like Route 1's Module 21)

---

## Problem

Module 12 uses JSON templates which don't support conditional functions like `if()`, `equals()`, or `empty()`. Empty secondary fields are being sent as empty strings `""`, which GHL rejects.

**Solution:** Add a Code module (like Route 1's Module 21) that uses JavaScript `nullIfEmpty()` to send `null` for empty fields.

---

## Step 1: Add Code Module

**Location:** After Module 11 (Iterator), before Module 12 (HTTP - Create Child Record)  
**Module Type:** Make Code - Run code  
**Module Name:** "Transform Child Record Data" (or similar)

---

## Step 2: Configure Code Module Inputs

The Code module needs data from multiple sources:

**Input Mapping:**
- `lot_data` → `{{11}}` (Iterator output - current lot's data)
- `shared_data` → `{{6.incoming_data.formData}}` (from Module 6 - shared project data)
- `parent_record_id` → `{{10.parent_record_id}}` (from Module 10)
- `project_identifier` → `{{13.project_identifier}}` (from Module 13)

**Note:** Variable names must use underscores (snake_case), not camelCase, to match Make.com's pattern requirement.

---

## Step 3: Code Module JavaScript

**Paste this code into the Code module:**

```javascript
// Extract inputs
const lotData = input.lotData;
const sharedData = input.sharedData;
const parentRecordId = input.parentRecordId;
const projectIdentifier = input.projectIdentifier;

// Safety checks
if (!lotData) {
    throw new Error("No lot data received from Iterator.");
}
if (!sharedData) {
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
const lot = lotData;
const lotNumber = lot.lotNumber || "";
const propertyDesc = lot.propertyDescription || {};
const purchasePrice = lot.purchasePrice || {};
const rentalAssessment = lot.rentalAssessment || {};

// Extract shared data
const projectAddress = sharedData.address?.projectAddress || "";

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
        project_parent_id: nullIfEmpty(parentRecordId),
        project_identifier: nullIfEmpty(projectIdentifier),
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
```

---

## Step 4: Update Module 12 Configuration

**After adding the Code module, update Module 12:**

1. **Body content type:** `application/json` (dropdown shows: `json`)
2. **Body input method:** `JSON string` (dropdown shows: `jsonString`)
3. **Body content:** `{{[CODE_MODULE_NUMBER].result}}`

   Replace `[CODE_MODULE_NUMBER]` with the actual module number of the Code module you just added (e.g., if it's Module 12A, use `{{12a.result}}`).

---

## Step 5: Remove Old JSON from Module 12

**Delete the old JSON template from Module 12's body field** - it's no longer needed since the Code module generates the JSON.

---

## Summary

1. ✅ Add Code module after Iterator (Module 11), before Module 12
2. ✅ Map inputs: lotData ({{11}}), sharedData ({{6.incoming_data.formData}}), parentRecordId ({{10.parent_record_id}}), projectIdentifier ({{13.project_identifier}})
3. ✅ Paste the JavaScript code (uses nullIfEmpty() like Route 1)
4. ✅ Update Module 12 body to use `{{[CODE_MODULE].result}}`
5. ✅ Delete old JSON template from Module 12

---

**This matches Route 1's pattern:** Code module handles empty fields with `nullIfEmpty()`, HTTP module uses Code module output.
