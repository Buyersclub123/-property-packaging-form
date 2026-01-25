# Handover Document - Single Property Route Implementation
**Date:** January 9, 2026  
**Session Focus:** GHL Integration, Dual Occupancy Fields, Build Fixes  
**Status:** In Progress - Build Errors Blocking Deployment

---

## 🎯 Where We Are

### ✅ Completed

1. **Form Updates:**
   - ✅ Added `occupancyPrimary` and `occupancySecondary` fields to TypeScript types
   - ✅ Updated Step 2 (Property Details) to show separate occupancy dropdowns for dual occupancy
   - ✅ Fixed "Unit" vs "Units" logic (always uses "Units" for dual occupancy)
   - ✅ Removed `buildSizePrimary`/`buildSizeSecondary` (single combined total confirmed)
   - ✅ Added "Message for BA" textarea field in Step 6
   - ✅ Updated validation logic for dual occupancy properties

2. **Sourcer/Packager Management:**
   - ✅ Created `/api/sourcers` API route to read from Google Sheet
   - ✅ Google Sheet integration working (reads from "Packagers & Sourcers" tab)
   - ✅ Form now populates sourcer dropdown from Google Sheet
   - ✅ Sourcers sorted alphabetically
   - ✅ Extracts part before `@` symbol from emails (e.g., `john.t@buyersclub.com.au` → `john.t`)

3. **GHL Field Updates:**
   - ✅ Changed `Packager` and `Sourcer` fields from Dropdown to Text in GHL
   - ⚠️ **TODO:** Create `occupancy_primary` and `occupancy_secondary` fields in GHL (currently only single `occupancy` field exists)

4. **Make.com JSON Mapping:**
   - ✅ Complete JSON body prepared for Module 14 with all field mappings
   - ✅ Includes `occupancy_primary` and `occupancy_secondary` mappings
   - ✅ Includes `message_for_ba` mapping
   - ✅ Includes `sourcer`/`packager` with email extraction logic
   - ✅ Includes all price fields (land_price, build_price, total_price, cashback fields)

### ⚠️ Blocking Issues

1. **Build Errors in `Step2PropertyDetails.tsx`:**
   - **Error:** Syntax error preventing deployment
   - **Location:** Lines 1565-1567 - Ternary operator closing structure
   - **Impact:** Cannot deploy to Vercel until fixed
   - **Status:** In progress - TypeScript compiler shows:
     - Line 1565: `'}' expected`
     - Line 1567: `')' expected`

---

## 🚧 What's Immediately In Front of Us

### 1. **Fix Build Errors (CRITICAL - Blocks Deployment)**

**File:** `form-app/src/components/steps/Step2PropertyDetails.tsx`

**Problem:**
- Complex nested ternary operator structure around line 1258-1567
- Conditional rendering for single vs dual occupancy "Current Rent and Expiry" section
- Missing or incorrect closing braces/parentheses

**Current Structure:**
```tsx
{isEstablished && (
  (isDualOccupancy 
    ? (rentalAssessment?.occupancyPrimary === 'Tenanted' || rentalAssessment?.occupancySecondary === 'Tenanted')
    : rentalAssessment?.occupancyPrimary === 'Tenanted') && (
  <div>
    {isDualOccupancy ? (
      // Dual occupancy UI
    ) : (
      // Single occupancy UI - THIS IS WHERE THE ERROR IS
      rentalAssessment?.occupancyPrimary === 'Tenanted' ? (
        // ... content
      ) : null
    )}
  </div>
)}
```

**Fix Required:**
- Properly close all nested ternaries
- Ensure parentheses and braces are balanced
- Verify TypeScript compiler passes (no errors)
- Test build completes successfully

### 2. **Create GHL Fields for Dual Occupancy (BLOCKING GHL INTEGRATION)**

**Required Fields:**
- `occupancy_primary` (Text or Dropdown - needs decision)
- `occupancy_secondary` (Text or Dropdown - needs decision)

**Current State:**
- Form already collects `occupancyPrimary` and `occupancySecondary`
- Make.com JSON mapping already includes these fields
- **GHL fields do NOT exist yet** - this will cause API errors when Module 14 runs

**Action Required:**
1. Log into GHL
2. Go to Settings > Custom Fields
3. Create new field: `occupancy_primary`
   - Type: Dropdown (same options as existing `occupancy` field: Tenanted, Owner Occupier, Vacant)
4. Create new field: `occupancy_secondary`
   - Type: Dropdown (same options)
5. Update Make.com Module 14 JSON to use correct field names (already done, just verify)

---

## 📋 Next Steps / To-Do List

### Priority 1: Critical (Blocks Everything)

- [ ] **Fix build errors in `Step2PropertyDetails.tsx`**
  - [ ] Resolve ternary operator closing structure (lines 1565-1567)
  - [ ] Verify TypeScript compilation passes
  - [ ] Test `npm run build` completes successfully
  - [ ] Deploy to Vercel for testing

### Priority 2: GHL Integration Setup

- [ ] **Create GHL custom fields:**
  - [ ] Create `occupancy_primary` field in GHL (Dropdown: Tenanted, Owner Occupier, Vacant)
  - [ ] Create `occupancy_secondary` field in GHL (Dropdown: same options)
  - [ ] Verify field names match Make.com JSON mapping (snake_case)

- [ ] **Set up Make.com Module 14:**
  - [ ] Add HTTP module after Module 5 (Route 1 - Single Property)
  - [ ] Configure URL: `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`
  - [ ] Set Method: POST
  - [ ] Add Headers:
    - `Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
    - `Version: 2021-07-28`
    - `Content-Type: application/json`
  - [ ] Set Body: Use "JSON string" mode
  - [ ] Copy complete JSON body (provided in this document)

### Priority 3: Testing & Validation

- [ ] **Test Single Property Submission (New Property):**
  - [ ] Submit a new single property through form
  - [ ] Verify Make.com Module 14 executes successfully
  - [ ] Verify GHL record is created with all fields populated
  - [ ] Check `sourcer` and `packager` fields show friendly names (part before `@`)

- [ ] **Test Established Single Occupancy:**
  - [ ] Submit established property with single occupancy
  - [ ] Verify `occupancy_primary` is populated
  - [ ] Verify `occupancy_secondary` is empty/null
  - [ ] Verify Current Rent and Expiry fields map correctly

- [ ] **Test Established Dual Occupancy:**
  - [ ] Submit established property with dual occupancy
  - [ ] Verify `occupancy_primary` is populated (Unit A)
  - [ ] Verify `occupancy_secondary` is populated (Unit B)
  - [ ] Verify both Current Rent fields map correctly
  - [ ] Verify both Expiry fields map correctly
  - [ ] Verify "Units" (plural) displays correctly in form

- [ ] **Test "Message for BA" Field:**
  - [ ] Enter text in "Message for BA" field in Step 6
  - [ ] Submit property
  - [ ] Verify `message_for_ba` field is populated in GHL

### Priority 4: Multi-Line Field Handling (Deferred)

- [ ] **Fix multi-line field escaping in Make.com:**
  - [ ] `why_this_property` (currently causes JSON errors)
  - [ ] `proximity` (currently causes JSON errors)
  - [ ] `investment_highlights` (currently causes JSON errors)
  - [ ] **Solution:** Use "Create JSON" module before HTTP module (as documented in `MAKE-COM-CREATE-JSON-MODULE-GUIDE.md`)
  - [ ] **Status:** Temporarily excluded from Module 14 JSON until Create JSON module is implemented

### Priority 5: Email Template Integration (Future)

- [ ] Build email template using GHL record data
- [ ] Include "Message for BA" at beginning of email
- [ ] Send email to Business Analyst
- [ ] Format multi-line fields correctly in email

### Priority 6: Deal Sheet Integration (Future)

- [ ] Integrate with Deal Sheet
- [ ] Map GHL fields to Deal Sheet columns
- [ ] Handle dual occupancy data in Deal Sheet

---

## 📝 Make.com Module 14 Configuration

### Complete JSON Body for Module 14

**IMPORTANT:** Copy this entire JSON into Module 14's "JSON string" body field.

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    "sourcer": "{{replace(5.incoming_data.formData.sourcer; \"@buyersclub.com.au\"; \"\")}}",
    "packager": "{{replace(5.incoming_data.formData.packager; \"@buyersclub.com.au\"; \"\")}}",
    "deal_type": "{{5.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{5.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{5.incoming_data.formData.address.folderLink}}",
    
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
    
    "why_this_property": "{{5.incoming_data.formData.contentSections.whyThisProperty}}",
    "proximity": "{{5.incoming_data.formData.contentSections.proximity}}",
    "investment_highlights": "{{5.incoming_data.formData.contentSections.investmentHighlights}}",
    
    "agent_name": "{{5.incoming_data.formData.sellingAgentName}}",
    "agent_mobile": "{{5.incoming_data.formData.sellingAgentMobile}}",
    "agent_email": "{{5.incoming_data.formData.sellingAgentEmail}}",
    
    "message_for_ba": "{{5.incoming_data.formData.messageForBA}}",
    "attachments_additional_dialogue": "{{5.incoming_data.formData.attachmentsAdditionalDialogue}}"
  }
}
```

**Note:** The multi-line fields (`why_this_property`, `proximity`, `investment_highlights`) are included but may cause JSON errors due to newlines. These should be handled using a "Create JSON" module (see Priority 4).

---

## 🔧 Technical Details

### Field Mappings

**Address Fields:**
- `suburb_name` → `address.suburbName` (fixed from `address.suburb`)
- `post_code` → `address.postCode` (fixed from `address.postcode`)
- `unit__lot` → `address.unitNumber` (not `address.unitLotPrimary`)

**Decision Tree Fields:**
- `deal_type` → `decisionTree.contractType` (not `dealType`)
- `status` → `decisionTree.status` (not root-level `status`)

**Agent Fields:**
- `agent_name` → Root-level `sellingAgentName` (not `agentInfo.agentName`)
- `agent_mobile` → Root-level `sellingAgentMobile`
- `agent_email` → Root-level `sellingAgentEmail`

**Sourcer/Packager:**
- Uses `replace()` function to extract part before `@buyersclub.com.au`
- Example: `john.t@buyersclub.com.au` → `john.t`

**Occupancy Fields (NEW):**
- `occupancy_primary` → `rentalAssessment.occupancyPrimary`
- `occupancy_secondary` → `rentalAssessment.occupancySecondary`

---

## 📚 Reference Documents

- `SINGLE-PROPERTY-ROUTE-IMPLEMENTATION.md` - Implementation guide for Module 14
- `MAKE-COM-IMPLEMENTATION-GUIDE.md` - General Make.com setup guide
- `MAKE-COM-CREATE-JSON-MODULE-GUIDE.md` - Guide for handling multi-line fields
- `FIELD-MAPPING-MATRIX.md` - Complete field mapping reference
- `EXISTING-GHL-INFRASTRUCTURE.md` - GHL custom object structure
- `GHL-FIELDS-CREATED-2026-01-09.csv` - List of all GHL fields

---

## ⚠️ Known Issues

1. **Build Errors:** TypeScript compilation fails due to ternary operator structure
2. **GHL Fields Missing:** `occupancy_primary` and `occupancy_secondary` need to be created
3. **Multi-Line Fields:** JSON escaping issue with `why_this_property`, `proximity`, `investment_highlights` (deferred)
4. **Conditional Price Fields:** Logic for `land_price`/`build_price` vs `total_price` based on contract type needs testing

---

## 🎯 Success Criteria

1. ✅ Form submits successfully without errors
2. ✅ Make.com Module 14 executes successfully
3. ✅ GHL record is created with all fields populated correctly
4. ✅ Dual occupancy properties show separate primary/secondary occupancy
5. ✅ Sourcer/Packager show friendly names (not full emails)
6. ✅ "Message for BA" field is captured and stored in GHL
7. ✅ Established properties with dual occupancy work correctly

---

**Last Updated:** January 9, 2026  
**Next Review:** After build errors are fixed and GHL fields are created
