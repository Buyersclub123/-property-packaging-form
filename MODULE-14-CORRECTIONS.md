# Module 14 Corrections Required

**Date:** January 9, 2026  
**Issue:** Module 14 JSON body needs corrections to match handover document and prevent multi-line field parsing errors

---

## ⚠️ Issues Found in Current Module 14 Blueprint

### 0. **CRITICAL: Missing GHL Fields (CAUSES 400 ERROR)**

**Current Error:**
```
Bad Request - {"message":"Invalid key in properties occupancy_primary","error":"Bad Request","statusCode":400}
```

**Problem:** 
- Module 14 is trying to set `occupancy_primary` and `occupancy_secondary` fields
- These fields **DO NOT EXIST** in the GHL custom object
- GHL only has a single `occupancy` field (not separate primary/secondary)

**Solution:** 
1. **Option A (Recommended):** Create the missing fields in GHL:
   - Create `occupancy_primary` (Dropdown: "Owner Occupied", "Tenanted", "Vacant")
   - Create `occupancy_secondary` (Dropdown: "Owner Occupied", "Tenanted", "Vacant")

2. **Option B (Temporary Workaround):** Remove `occupancy_primary` and `occupancy_secondary` from Module 14 JSON body (single occupancy only)

**Action Required:** Create these 2 fields in GHL before Module 14 will work.

---

### 1. **Multi-Line Fields Included (CAUSES ERRORS)**

**Current Blueprint Includes:**
```json
"why_this_property": "{{5.incoming_data.formData.contentSections.whyThisProperty}}",
"proximity": "{{5.incoming_data.formData.contentSections.proximity}}",
"investment_highlights": "{{5.incoming_data.formData.contentSections.investmentHighlights}}",
```

**Problem:** These fields contain newlines and special characters that break JSON parsing in Make.com's "JSON string" mode. They cause HTTP request failures.

**Solution:** Remove these 3 fields from Module 14's JSON body (as per handover document). Add them back after implementing the "Create JSON" module solution.

---

### 2. **Folder Link Path Incorrect**

**Current Blueprint:**
```json
"folder_link": "{{5.incoming_data.formData.address.folderLink}}"
```

**Problem:** `folderLink` is at the root level of `incoming_data`, not under `address`.

**Correct Path:**
```json
"folder_link": "{{5.incoming_data.folderLink}}"
```

---

### 3. **Module 15 Version Header Has Typo**

**Current Blueprint:**
```json
{
  "name": "Version",
  "value": " 2021-07-28"  // ⚠️ Has leading space
}
```

**Correct:**
```json
{
  "name": "Version",
  "value": "2021-07-28"  // ✅ No leading space
}
```

---

## ✅ Corrected Module 14 JSON Body - READY TO PASTE

**📋 Copy the JSON below into Module 14's "Body content" field (in JSON string mode):**

### Complete JSON String (Copy Everything Below):

**⚠️ NOTE:** This version removes conditionals for carport/carspace fields to fix "Invalid IML" error. If these fields are empty, GHL will reject them with a 400 error. Use the "Create JSON" module solution to properly handle empty values (see below).

```
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    "sourcer": "{{replace(5.incoming_data.formData.sourcer; '@buyersclub.com.au'; '')}}",
    "packager": "{{replace(5.incoming_data.formData.packager; '@buyersclub.com.au'; '')}}",
    "deal_type": "{{5.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{5.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{5.incoming_data.folderLink}}",
    
    "street_number": "{{5.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{5.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{5.incoming_data.formData.address.suburbName}}",
    "state": "{{5.incoming_data.formData.address.state}}",
    "post_code": "{{5.incoming_data.formData.address.postCode}}",
    "lga": "{{5.incoming_data.formData.address.lga}}",
    "unit__lot": "{{5.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "",
    "google_map": "{{5.incoming_data.formData.address.googleMap}}",
    
    "zoning": "{{5.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{5.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{5.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{5.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{5.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{5.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{5.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{5.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{5.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{5.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{5.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{5.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    
    "beds_primary": "{{5.incoming_data.formData.propertyDescription.bedsPrimary}}",
    "beds_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.bedsSecondary}}",
    "bath_primary": "{{5.incoming_data.formData.propertyDescription.bathPrimary}}",
    "baths_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.bathSecondary}}",
    "garage_primary": "{{5.incoming_data.formData.propertyDescription.garagePrimary}}",
    "garage_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.garageSecondary}}",
    "carport_primary": "{{5.incoming_data.formData.propertyDescription.carportPrimary}}",
    "carport_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.carportSecondary}}",
    "carspace_primary": "{{5.incoming_data.formData.propertyDescription.carspacePrimary}}",
    "carspace_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.carspaceSecondary}}",
    "year_built": "{{5.incoming_data.formData.propertyDescription.yearBuilt}}",
    "land_registration": "{{5.incoming_data.formData.propertyDescription.landRegistration}}",
    "land_size": "{{5.incoming_data.formData.propertyDescription.landSize}}",
    "build_size": "{{5.incoming_data.formData.propertyDescription.buildSize}}",
    "title": "{{5.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{5.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{5.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "does_this_property_have_2_dwellings": "{{5.incoming_data.formData.propertyDescription.doesThisPropertyHave2Dwellings}}",
    "property_description_additional_dialogue": "{{5.incoming_data.formData.propertyDescription.propertyDescriptionAdditionalDialogue}}",
    
    "asking": "{{5.incoming_data.formData.purchasePrice.asking}}",
    "asking_text": "{{5.incoming_data.formData.purchasePrice.askingText}}",
    "acceptable_acquisition__from": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "comparable_sales": "{{5.incoming_data.formData.purchasePrice.comparableSales}}",
    "land_price": "{{5.incoming_data.formData.purchasePrice.landPrice}}",
    "build_price": "{{5.incoming_data.formData.purchasePrice.buildPrice}}",
    "total_price": "{{5.incoming_data.formData.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{5.incoming_data.formData.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{5.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "purchase_price_additional_dialogue": "{{5.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    
    "occupancy_primary": "{{5.incoming_data.formData.rentalAssessment.occupancyPrimary}}",
    "occupancy_secondary": "{{5.incoming_data.formData.rentalAssessment.occupancySecondary}}",
    "current_rent_primary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentPrimary}}",
    "current_rent_secondary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentSecondary}}",
    "expiry_primary": "{{5.incoming_data.formData.rentalAssessment.expiryPrimary}}",
    "expiry_secondary": "{{5.incoming_data.formData.rentalAssessment.expirySecondary}}",
    "rent_appraisal_primary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryTo}}",
    "yield": "{{5.incoming_data.formData.rentalAssessment.yield}}",
    "appraised_yield": "{{5.incoming_data.formData.rentalAssessment.appraisedYield}}",
    "rental_assessment_additional_dialogue": "{{5.incoming_data.formData.rentalAssessment.rentalAssessmentAdditionalDialogue}}",
    
    "median_price_change__3_months": "{{5.incoming_data.formData.marketPerformance.medianPriceChange3Months}}",
    "median_price_change__1_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange1Year}}",
    "median_price_change__3_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange3Year}}",
    "median_price_change__5_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange5Year}}",
    "median_yield": "{{5.incoming_data.formData.marketPerformance.medianYield}}",
    "median_rent_change__1_year": "{{5.incoming_data.formData.marketPerformance.medianRentChange1Year}}",
    "rental_population": "{{5.incoming_data.formData.marketPerformance.rentalPopulation}}",
    "vacancy_rate": "{{5.incoming_data.formData.marketPerformance.vacancyRate}}",
    "market_perfornance_additional_dialogue": "{{5.incoming_data.formData.marketPerformance.marketPerformanceAdditionalDialogue}}",
    
    "agent_name": "{{5.incoming_data.formData.sellingAgentName}}",
    "agent_mobile": "{{5.incoming_data.formData.sellingAgentMobile}}",
    "agent_email": "{{5.incoming_data.formData.sellingAgentEmail}}",
    
    "message_for_ba": "{{5.incoming_data.formData.messageForBA}}",
    "attachments_additional_dialogue": "{{5.incoming_data.formData.attachmentsAdditionalDialogue}}"
  }
}
```

---

### Formatted Version (For Reference):

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    "sourcer": "{{replace(5.incoming_data.formData.sourcer; '@buyersclub.com.au'; '')}}",
    "packager": "{{replace(5.incoming_data.formData.packager; '@buyersclub.com.au'; '')}}",
    "deal_type": "{{5.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{5.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{5.incoming_data.folderLink}}",
    
    "street_number": "{{5.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{5.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{5.incoming_data.formData.address.suburbName}}",
    "state": "{{5.incoming_data.formData.address.state}}",
    "post_code": "{{5.incoming_data.formData.address.postCode}}",
    "lga": "{{5.incoming_data.formData.address.lga}}",
    "unit__lot": "{{5.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "",
    "google_map": "{{5.incoming_data.formData.address.googleMap}}",
    
    "zoning": "{{5.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{5.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{5.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{5.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{5.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{5.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{5.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{5.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{5.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{5.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{5.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{5.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    
    "beds_primary": "{{5.incoming_data.formData.propertyDescription.bedsPrimary}}",
    "beds_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.bedsSecondary}}",
    "bath_primary": "{{5.incoming_data.formData.propertyDescription.bathPrimary}}",
    "baths_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.bathSecondary}}",
    "garage_primary": "{{5.incoming_data.formData.propertyDescription.garagePrimary}}",
    "garage_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.garageSecondary}}",
    "carport_primary": "{{5.incoming_data.formData.propertyDescription.carportPrimary}}",
    "carport_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.carportSecondary}}",
    "carspace_primary": "{{5.incoming_data.formData.propertyDescription.carspacePrimary}}",
    "carspace_additional__secondary__dual_key": "{{5.incoming_data.formData.propertyDescription.carspaceSecondary}}",
    "year_built": "{{5.incoming_data.formData.propertyDescription.yearBuilt}}",
    "land_registration": "{{5.incoming_data.formData.propertyDescription.landRegistration}}",
    "land_size": "{{5.incoming_data.formData.propertyDescription.landSize}}",
    "build_size": "{{5.incoming_data.formData.propertyDescription.buildSize}}",
    "title": "{{5.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{5.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{5.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "does_this_property_have_2_dwellings": "{{5.incoming_data.formData.propertyDescription.doesThisPropertyHave2Dwellings}}",
    "property_description_additional_dialogue": "{{5.incoming_data.formData.propertyDescription.propertyDescriptionAdditionalDialogue}}",
    
    "asking": "{{5.incoming_data.formData.purchasePrice.asking}}",
    "asking_text": "{{5.incoming_data.formData.purchasePrice.askingText}}",
    "acceptable_acquisition__from": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "comparable_sales": "{{5.incoming_data.formData.purchasePrice.comparableSales}}",
    "land_price": "{{5.incoming_data.formData.purchasePrice.landPrice}}",
    "build_price": "{{5.incoming_data.formData.purchasePrice.buildPrice}}",
    "total_price": "{{5.incoming_data.formData.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{5.incoming_data.formData.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{5.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "purchase_price_additional_dialogue": "{{5.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    
    "occupancy_primary": "{{5.incoming_data.formData.rentalAssessment.occupancyPrimary}}",
    "occupancy_secondary": "{{5.incoming_data.formData.rentalAssessment.occupancySecondary}}",
    "current_rent_primary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentPrimary}}",
    "current_rent_secondary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentSecondary}}",
    "expiry_primary": "{{5.incoming_data.formData.rentalAssessment.expiryPrimary}}",
    "expiry_secondary": "{{5.incoming_data.formData.rentalAssessment.expirySecondary}}",
    "rent_appraisal_primary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryTo}}",
    "yield": "{{5.incoming_data.formData.rentalAssessment.yield}}",
    "appraised_yield": "{{5.incoming_data.formData.rentalAssessment.appraisedYield}}",
    "rental_assessment_additional_dialogue": "{{5.incoming_data.formData.rentalAssessment.rentalAssessmentAdditionalDialogue}}",
    
    "median_price_change__3_months": "{{5.incoming_data.formData.marketPerformance.medianPriceChange3Months}}",
    "median_price_change__1_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange1Year}}",
    "median_price_change__3_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange3Year}}",
    "median_price_change__5_year": "{{5.incoming_data.formData.marketPerformance.medianPriceChange5Year}}",
    "median_yield": "{{5.incoming_data.formData.marketPerformance.medianYield}}",
    "median_rent_change__1_year": "{{5.incoming_data.formData.marketPerformance.medianRentChange1Year}}",
    "rental_population": "{{5.incoming_data.formData.marketPerformance.rentalPopulation}}",
    "vacancy_rate": "{{5.incoming_data.formData.marketPerformance.vacancyRate}}",
    "market_perfornance_additional_dialogue": "{{5.incoming_data.formData.marketPerformance.marketPerformanceAdditionalDialogue}}",
    
    "agent_name": "{{5.incoming_data.formData.sellingAgentName}}",
    "agent_mobile": "{{5.incoming_data.formData.sellingAgentMobile}}",
    "agent_email": "{{5.incoming_data.formData.sellingAgentEmail}}",
    
    "message_for_ba": "{{5.incoming_data.formData.messageForBA}}",
    "attachments_additional_dialogue": "{{5.incoming_data.formData.attachmentsAdditionalDialogue}}"
  }
}
```

**⚠️ ISSUE:** This JSON has a problem with empty numeric dropdown fields. See "Fix for Empty Numeric Dropdown Fields" section below.

**Note:** This JSON intentionally excludes:
- `why_this_property`
- `proximity`
- `investment_highlights`

These will be added back after implementing the "Create JSON" module solution (see `MAKE-COM-CREATE-JSON-MODULE-GUIDE.md`).

---

## 🔧 Fix for Empty Numeric Dropdown Fields

**Problem:** GHL numeric dropdown fields (beds, baths, garage, carport, carspace) reject empty strings `""`. They expect either:
- A number (0-9)
- `null` (not an empty string)
- The field omitted entirely

**Solution:** Use Make.com IF function to convert empty strings to `null`:

### Current (Problematic):
```json
"carport_primary": "{{5.incoming_data.formData.propertyDescription.carportPrimary}}"
```

### Fixed (Use This):
```json
"carport_primary": {{if(empty(5.incoming_data.formData.propertyDescription.carportPrimary); "null"; "\"{{5.incoming_data.formData.propertyDescription.carportPrimary}}\"")}}
```

**However, in JSON string mode, this is complex. Better approach:**

Use Make.com's `ifEmpty()` function or conditional logic:

```json
"carport_primary": {{if(not(empty(5.incoming_data.formData.propertyDescription.carportPrimary)); "\"{{5.incoming_data.formData.propertyDescription.carportPrimary}}\""; "null")}}
```

**Fields that need this fix (all numeric dropdowns):**
- `carport_primary` ⚠️ (currently causing error)
- `carport_additional__secondary__dual_key`
- `carspace_primary`
- `carspace_additional__secondary__dual_key`
- `beds_primary` (if can be empty)
- `beds_additional__secondary__dual_key`
- `bath_primary` (if can be empty)
- `baths_additional__secondary__dual_key`
- `garage_primary` (if can be empty)
- `garage_additional__secondary__dual_key`

**Alternative Solution:** Use "Create JSON" module instead of "JSON string" mode - it handles empty values better.

---

## 📋 Action Items

### Critical (BLOCKING - Must Fix First):
0. [ ] **Create missing GHL fields (REQUIRED before Module 14 will work):**
   - [ ] Create `occupancy_primary` field in GHL (Dropdown: "Owner Occupied", "Tenanted", "Vacant")
   - [ ] Create `occupancy_secondary` field in GHL (Dropdown: "Owner Occupied", "Tenanted", "Vacant")
   - [ ] See `CREATE-GHL-FIELDS-GUIDE.md` for instructions

### Immediate (Fix Module 14):
1. ✅ **Create missing GHL fields - COMPLETED:**
   - ✅ `occupancy_primary` - Created
   - ✅ `occupancy_secondary` - Created

2. [ ] **Fix empty string values for numeric dropdown fields:**
   - [ ] Fix `carport_primary` - Use `null` or conditional instead of empty string
   - [ ] Fix `carport_secondary` - Same fix
   - [ ] Fix `carspace_primary` - Same fix
   - [ ] Fix `carspace_secondary` - Same fix
   - [ ] Check other numeric dropdowns (beds, baths, garage) - May need same fix

3. [ ] Remove the 3 multi-line fields from Module 14's JSON body
4. [ ] Fix `folder_link` path from `{{5.incoming_data.formData.address.folderLink}}` to `{{5.incoming_data.folderLink}}`
5. [ ] Test Module 14 with corrected JSON (should no longer fail on JSON parsing or 400 errors)

### Also Fix Module 15:
4. [ ] Remove leading space from Version header: `"2021-07-28"` (not `" 2021-07-28"`)

### Next Steps (Future):
5. [ ] Implement "Create JSON" module solution for multi-line fields
6. [ ] Add back the 3 excluded fields after "Create JSON" module is working

---

## 🔗 Reference Documents

- `HANDOVER-2025-01-09-SESSION-END.md` - Starting point JSON (excludes multi-line fields)
- `MAKE-COM-CREATE-JSON-MODULE-GUIDE.md` - Guide for handling multi-line fields
- `SINGLE-PROPERTY-ROUTE-IMPLEMENTATION.md` - Complete implementation guide
- `CREATE-GHL-FIELDS-GUIDE.md` - Guide for creating missing GHL fields
- `GHL-FIELDS-TO-CREATE.md` - Complete list of all fields to create (missing `occupancy_primary` and `occupancy_secondary`)

## ⚠️ Missing GHL Fields - Critical

**Fields that MUST be created in GHL before Module 14 will work:**

1. `occupancy_primary` (Dropdown)
   - Type: Dropdown
   - Options: "Owner Occupied", "Tenanted", "Vacant"
   - Required: No
   - Used for: Single occupancy Unit A, or dual occupancy Unit A

2. `occupancy_secondary` (Dropdown)
   - Type: Dropdown  
   - Options: "Owner Occupied", "Tenanted", "Vacant"
   - Required: No
   - Used for: Dual occupancy Unit B only

**Note:** These fields are NOT in the existing creation guides. They need to be added to GHL immediately to fix the 400 error.

---

**Status:** **BLOCKED** - Missing GHL fields must be created first  
**Priority:** **CRITICAL** - Module 14 fails with 400 error due to missing `occupancy_primary` and `occupancy_secondary` fields
