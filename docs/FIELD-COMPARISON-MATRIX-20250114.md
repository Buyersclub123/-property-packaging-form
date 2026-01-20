# Field Comparison Matrix - Form vs GHL vs Make.com

**Date:** 2025-01-14  
**Purpose:** Compare form fields, GHL fields, and what Make.com modules are actually sending

---

## Legend

- ✅ = Field exists/is being sent
- ❌ = Field missing/not being sent
- ⚠️ = Field exists but has mapping issue
- 🔴 = **CRITICAL** - Missing and needed for Deal Sheet

---

## Address Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `address.propertyAddress` | `property_address` | ✅ | ✅ | ✅ | OK |
| `address.streetNumber` | `street_number` | ✅ | ✅ | ✅ | OK |
| `address.streetName` | `street_name` | ✅ | ✅ | ✅ | OK |
| `address.suburbName` | `suburb_name` | ✅ | ✅ | ✅ | OK |
| `address.state` | `state` | ✅ | ✅ | ✅ | OK |
| `address.postCode` | `post_code` | ✅ | ✅ | ✅ | OK |
| `address.lga` | `lga` | ✅ | ✅ | ✅ | OK |
| `address.unitNumber` | `unit__lot` | ✅ | ✅ | ✅ | OK |
| `address.googleMap` | `google_map` | ✅ | ✅ | ✅ | OK |
| `address.projectAddress` | `project_address` | ✅ | ❌ | ✅ | 🔴 **Module 21 MISSING** |
| `address.projectName` | `project_name` | ✅ | ❌ | ✅ | 🔴 **Module 21 MISSING** |
| `address.lotNumber` | `lot_number` | ✅ | ✅ | ✅ | OK |
| `address.unitLotPrimary` | `unit__lot` (shared) | ✅ | ❌ | ❌ | Not mapped separately |
| `address.unitLotSecondary` | `unit__lot_secondary` | ✅ | ❌ | ❌ | 🔴 **NOT SENT** |

---

## Decision Tree Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `decisionTree.propertyType` | `property_type` | ✅ | ✅ | ✅ | OK |
| `decisionTree.contractType` | `deal_type` | ✅ | ✅ | ✅ | OK |
| `decisionTree.contractTypeSimplified` | `contract_type` | ✅ | ✅ | ✅ | OK |
| `decisionTree.lotType` | N/A | ❌ | ❌ | ❌ | Not in GHL |
| `decisionTree.dualOccupancy` | `single_or_dual_occupancy` | ✅ | ✅ | ✅ | OK (mapped) |
| `decisionTree.status` | `status` | ✅ | ✅ | ✅ | OK |

---

## Property Description Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `propertyDescription.bedsPrimary` | `beds_primary` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.bedsSecondary` | `beds_additional__secondary__dual_key` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.bathPrimary` | `bath_primary` | ✅ | ✅ | ✅ | OK (mapped) |
| `propertyDescription.bathSecondary` | `baths_additional__secondary__dual_key` | ✅ | ✅ | ✅ | OK (mapped) |
| `propertyDescription.garagePrimary` | `garage_primary` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.garageSecondary` | `garage_additional__secondary__dual_key` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.carportPrimary` | `carport_primary` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.carportSecondary` | `carport_additional__secondary__dual_key` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.carspacePrimary` | `carspace_primary` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.carspaceSecondary` | `carspace_additional__secondary__dual_key` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.yearBuilt` | `year_built` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.landSize` | `land_size` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.buildSize` | `build_size` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.buildSizePrimary` | `build_size_primary` | ❌ | ❌ | ❌ | 🔴 **MISSING IN GHL** |
| `propertyDescription.buildSizeSecondary` | `build_size_secondary` | ❌ | ❌ | ❌ | 🔴 **MISSING IN GHL** |
| `propertyDescription.landRegistration` | `land_registration` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.title` | `title` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.bodyCorpPerQuarter` | `body_corp__per_quarter` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.bodyCorpDescription` | `body_corp_description` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.doesThisPropertyHave2Dwellings` | `single_or_dual_occupancy` | ✅ | ✅ | ✅ | OK (mapped) |
| `propertyDescription.propertyDescriptionAdditionalDialogue` | `property_description_additional_dialogue` | ✅ | ✅ | ✅ | OK |
| `propertyDescription.projectBrief` | `project_brief` | ✅ | ⚠️ | ⚠️ | 🔴 **WRONG FIELD NAME** (uses `projectOverview`) |

---

## Purchase Price Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `purchasePrice.asking` | `asking` | ✅ | ✅ | ✅ | OK (mapped) |
| `purchasePrice.askingText` | `asking_text` | ✅ | ✅ | ❌ | ⚠️ **Module 22 MISSING** |
| `purchasePrice.comparableSales` | `comparable_sales` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.acceptableAcquisitionFrom` | `acceptable_acquisition__from` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.acceptableAcquisitionTo` | `acceptable_acquisition__to` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.landPrice` | `land_price` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.buildPrice` | `build_price` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.totalPrice` | `total_price` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.cashbackRebateValue` | `cashback_rebate_value` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.cashbackRebateType` | `cashback_rebate_type` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.priceGroup` | `price_group` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.purchasePriceAdditionalDialogue` | `purchase_price_additional_dialogue` | ✅ | ✅ | ✅ | OK |
| `purchasePrice.acceptedAcquisitionTarget` | `accepted_acquisition_target` | ✅ | ✅ | ❌ | ⚠️ **Module 22 MISSING** |

---

## Rental Assessment Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `rentalAssessment.occupancyPrimary` | `occupancy_primary` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.occupancySecondary` | `occupancy_secondary` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.currentRentPrimary` | `current_rent_primary__per_week` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.currentRentSecondary` | `current_rent_secondary__per_week` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.expiryPrimary` | `expiry_primary` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.expirySecondary` | `expiry_secondary` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.rentAppraisalPrimaryFrom` | `rent_appraisal_primary_from` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.rentAppraisalPrimaryTo` | `rent_appraisal_primary_to` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.rentAppraisalSecondaryFrom` | `rent_appraisal_secondary_from` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.rentAppraisalSecondaryTo` | `rent_appraisal_secondary_to` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.yield` | `yield` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.appraisedYield` | `appraised_yield` | ✅ | ✅ | ✅ | OK |
| `rentalAssessment.rentalAssessmentAdditionalDialogue` | `rental_assessment_additional_dialogue` | ✅ | ✅ | ✅ | OK |

---

## Market Performance Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `marketPerformance.medianPriceChange3Months` | `median_price_change__3_months` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.medianPriceChange1Year` | `median_price_change__1_year` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.medianPriceChange3Year` | `median_price_change__3_year` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.medianPriceChange5Year` | `median_price_change__5_year` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.medianYield` | `median_yield` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.medianRentChange1Year` | `median_rent_change__1_year` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.rentalPopulation` | `rental_population` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.vacancyRate` | `vacancy_rate` | ✅ | ✅ | ✅ | OK |
| `marketPerformance.marketPerformanceAdditionalDialogue` | `market_performance_additional_dialogue` | ✅ | ✅ | ✅ | OK |

---

## Content Sections

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `contentSections.whyThisProperty` | `why_this_property` | ✅ | ✅ | ✅ | OK |
| `contentSections.proximity` | `proximity` | ✅ | ✅ | ✅ | OK |
| `contentSections.investmentHighlights` | `investment_highlights` | ✅ | ✅ | ✅ | OK |

---

## Agent Info

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `sellingAgentName` | `agent_name` | ✅ | ✅ | ✅ | OK |
| `sellingAgentEmail` | `agent_email` | ✅ | ✅ | ✅ | OK |
| `sellingAgentMobile` | `agent_mobile` | ✅ | ✅ | ✅ | OK |
| `sellingAgent` (combined) | N/A | ❌ | ❌ | ❌ | Not in GHL (individual fields only) |

---

## Workflow Fields

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| `packager` | `packager` | ✅ | ✅ | ✅ | OK |
| `sourcer` | `sourcer` | ✅ | ✅ | ✅ | OK |
| `reviewDate` | `review_date` | ✅ | ❌ | ❌ | 🔴 **NOT SENT** |
| `messageForBA` | `message_for_ba` | ✅ | ✅ | ✅ | OK |
| `attachmentsAdditionalDialogue` | `attachments_additional_dialogue` | ✅ | ✅ | ✅ | OK |
| `pushRecordToDealSheet` | `push_record_to_deal_sheet` | ✅ | ✅ | ❌ | ⚠️ **Module 22 MISSING** |
| `cashflowSheetLinkHL` | N/A | ❌ | ❌ | ❌ | Not in GHL |
| `cashflowSheetLinkGeneral` | N/A | ❌ | ❌ | ❌ | Not in GHL |

---

## Project Fields (Module 22 only)

| Form Field | GHL Field | In GHL? | Module 21 | Module 22 | Status |
|------------|-----------|---------|-----------|-----------|--------|
| N/A | `project_identifier` | ✅ | ✅ | ✅ | OK |
| N/A | `is_parent_record` | ✅ | ✅ | ✅ | OK |
| N/A | `project_parent_id` | ✅ | ✅ | ✅ | OK |

---

## Summary of Issues

### 🔴 CRITICAL - Missing in GHL (Need to Create)
1. `build_size_primary` - For dual occupancy primary dwelling
2. `build_size_secondary` - For dual occupancy secondary dwelling

### 🔴 CRITICAL - Not Being Sent (Need to Fix Make.com)
1. **Module 21:**
   - `project_address` - Missing
   - `project_name` - Missing
   - `review_date` - Missing
   
2. **Module 22:**
   - `asking_text` - Missing
   - `accepted_acquisition_target` - Missing
   - `push_record_to_deal_sheet` - Missing

### ⚠️ WRONG FIELD MAPPING (Need to Fix)
1. **Module 21 & 22:**
   - `project_brief` mapping uses `projectOverview` but form has `projectBrief`
   - **Fix:** Change `formData.propertyDescription?.projectOverview` to `formData.propertyDescription?.projectBrief`

### ⚠️ Fields Not in GHL (May Not Need)
1. `decisionTree.lotType` - Not stored in GHL (used for logic only)
2. `sellingAgent` (combined) - Individual fields stored instead
3. `cashflowSheetLinkHL` - Not in GHL
4. `cashflowSheetLinkGeneral` - Not in GHL
5. `address.unitLotPrimary` / `address.unitLotSecondary` - Not mapped separately (uses `unit__lot`)

---

## Action Items

### Priority 1: Fix Critical Issues
1. ✅ Create `build_size_primary` field in GHL
2. ✅ Create `build_size_secondary` field in GHL
3. ✅ Fix Module 21 to send `project_address`
4. ✅ Fix Module 21 to send `project_name`
5. ✅ Fix Module 21 & 22 `project_brief` mapping (use `projectBrief` not `projectOverview`)
6. ✅ Add `review_date` to Module 21 & 22
7. ✅ Add `asking_text` to Module 22
8. ✅ Add `accepted_acquisition_target` to Module 22
9. ✅ Add `push_record_to_deal_sheet` to Module 22

### Priority 2: Verify All Fields for Deal Sheet
- Ensure all fields needed for Deal Sheet are in GHL and being sent
- Test Deal Sheet creation when `packager_approved = "Approved"`

---

**Last Updated:** 2025-01-14
