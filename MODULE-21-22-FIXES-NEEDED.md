# Module 21 & 22 Fixes Needed

**Date:** January 11, 2026

---

## Route 2: Property Address Issue

**Problem:** `project_address` is overwriting `property_address` in Module 22

**Current Code (Module 22, line 73):**
```javascript
const propertyAddress = `Lot ${lotNumber}, ${projectAddress}`;
```

**Issue:** This constructs property_address from projectAddress, making them the same.

**Fix Needed:** 
- For Route 2, each lot should have its own property address
- Check form code: Does each lot have its own `propertyAddress` field?
- Or should property_address be constructed differently?
- `project_address` should remain as `shared_data.address?.projectAddress` (separate field)

**Action:** Check form data structure for Route 2 lots - what address field does each lot have?

---

## Route 1: Field Mapping Issues

### 1. `property_type` - Empty
**Code:** Maps from `formData.decisionTree?.propertyType` ✅
**Form sends:** `decisionTree.propertyType` ('New' | 'Established') ✅
**Status:** Code looks correct - may be form not sending or Make.com input mapping issue

### 2. `single_or_dual_occupancy` - Empty  
**Code:** Maps from `formData.decisionTree?.dualOccupancy` ✅
**Form sends:** `decisionTree.dualOccupancy` ('Yes' | 'No' | 'Mixed' | 'TBC' | '') ✅
**Status:** Code looks correct - may be form not sending or Make.com input mapping issue

### 3. `asking` - Not showing
**Code:** Uses `mapAskingValue(formData.purchasePrice?.asking)`
**Form sends:** `purchasePrice.asking` as type `'onmarket' | 'offmarket' | 'prelaunch_opportunity' | 'coming_soon' | 'tbc'`
**Problem:** Form sends lowercase with underscores, but `mapAskingValue()` expects:
- "On-market" (with dash, capital O)
- "Off-market" 
- "Pre-launch"
- "Coming Soon"
- "TBC"

**Fix:** Update `mapAskingValue()` to handle form values:
```javascript
const mapAskingValue = (val) => {
    if (!val) return null;
    const mapping = {
        "onmarket": "on-market",
        "offmarket": "off-market", 
        "prelaunch_opportunity": "pre-launch opportunity",
        "coming_soon": "coming soon",
        "tbc": null,
        "On-market": "on-market",
        "Off-market": "off-market",
        "Pre-launch": "pre-launch opportunity",
        "Coming Soon": "coming soon",
        "TBC": null,
        "N/A": null
    };
    return mapping[val] || null;
};
```

### 4. `rent_appraisal_primary` / `rent_appraisal_secondary` - Not showing
**Code:** Maps to `rent_appraisal_primary` and `rent_appraisal_secondary` (lines 128, 131)
**Form sends:** `rentAppraisalPrimaryFrom`, `rentAppraisalPrimaryTo`, `rentAppraisalSecondaryFrom`, `rentAppraisalSecondaryTo`
**Problem:** GHL has separate fields for `_from` and `_to`, but Module 21 is trying to map to single `rent_appraisal_primary` field

**Fix:** Module 21 should map to:
- `rent_appraisal_primary_from`: `formData.rentalAssessment?.rentAppraisalPrimaryFrom`
- `rent_appraisal_primary_to`: `formData.rentalAssessment?.rentAppraisalPrimaryTo`
- `rent_appraisal_secondary_from`: `formData.rentalAssessment?.rentAppraisalSecondaryFrom`
- `rent_appraisal_secondary_to`: `formData.rentalAssessment?.rentAppraisalSecondaryTo`

**Current Code (WRONG):**
```javascript
rent_appraisal_primary: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimary),
rent_appraisal_secondary: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondary),
```

**Should be:**
```javascript
rent_appraisal_primary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryFrom),
rent_appraisal_primary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalPrimaryTo),
rent_appraisal_secondary_from: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryFrom),
rent_appraisal_secondary_to: nullIfEmpty(formData.rentalAssessment?.rentAppraisalSecondaryTo),
```

### 5. `property_description_additional_dialogue` - Not showing
**Code:** Maps from `formData.propertyDescription?.additionalDialogue` (line 98)
**Form sends:** `propertyDescription.propertyDescriptionAdditionalDialogue` ✅
**Problem:** Wrong field path! Should be `propertyDescriptionAdditionalDialogue`, not `additionalDialogue`

**Fix:** Change to:
```javascript
property_description_additional_dialogue: nullIfEmpty(formData.propertyDescription?.propertyDescriptionAdditionalDialogue),
```

---

## Price Group Calculation

**Requirement:** Auto-calculate `price_group` based on Total Price or Target Acquisition Price (NOT net price)

**Price Ranges:**
- $300k - $500k
- $500k - $700k  
- $700k+

**Calculation Logic:**
- Use `totalPrice` OR `acceptableAcquisitionTo` (whichever is available)
- Do NOT use `net_price` (excludes cashback)
- Calculate which range the price falls into

**Form Field:** Add read-only field below "Appraised Rent" showing calculated price_group

**Code to add to Module 21:**
```javascript
price_group: (() => {
    // Use totalPrice if available, otherwise use acceptableAcquisitionTo
    const priceValue = formData.purchasePrice?.totalPrice || formData.purchasePrice?.acceptableAcquisitionTo;
    if (!priceValue) return null;
    
    // Parse price (remove $, commas, convert to number)
    const price = parseFloat(String(priceValue).replace(/[$,]/g, ''));
    if (isNaN(price)) return null;
    
    // Determine price group
    if (price >= 300000 && price < 500000) return "$300 - 500k";
    if (price >= 500000 && price < 700000) return "$500 - 700k";
    if (price >= 700000) return "$700k+";
    
    return null; // Below $300k or invalid
})(),
```

**Form Code:** Add read-only field in Step2PropertyDetails.tsx below Appraised Rent section

---

## Summary of Fixes

1. ✅ Fix `asking` mapping - handle form's lowercase/underscore values
2. ✅ Fix `rent_appraisal_primary/secondary` - use `_from` and `_to` fields
3. ✅ Fix `property_description_additional_dialogue` - use correct field path
4. ✅ Add `price_group` calculation logic
5. ⏳ Fix Route 2 `property_address` - determine correct source
6. ⏳ Verify `property_type` and `single_or_dual_occupancy` - check Make.com input mapping

---

**Last Updated:** January 11, 2026
