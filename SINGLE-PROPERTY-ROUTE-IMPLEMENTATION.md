# Single Property Route Implementation Guide
**Date:** January 9, 2026  
**Status:** In Progress  
**Goal:** Add HTTP module after Module 5 to create GHL records for single property submissions

---

## 🎯 Current State

### What's Working:
- ✅ Module 1: Custom Webhook receives form data
- ✅ Module 5: Set Variable (`incoming_data`) - Route 1 (Single Property)
- ✅ Module 12 (Route 2): Successfully creates child records for projects

### What's Missing:
- ❌ HTTP module after Module 5 to create GHL record for single properties
- ❌ No GHL record is created when single property is submitted
- ❌ Form data is lost (nothing happens after Module 5)

---

## 📋 Step-by-Step Implementation Plan

### Step 1: Add HTTP Module After Module 5

**Location:** Make.com Scenario → After Module 5 (Route 1)

**Module Type:** HTTP > Make a Request

**Configuration:**

#### Basic Settings:
- **Method:** `POST`
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`

#### Headers:
```
Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd
Version: 2021-07-28
Content-Type: application/json
```

#### Body (JSON):
We'll map all fields from `{{5.incoming_data.formData}}` to GHL fields.

**Reference:** Module 12 structure (working), but using root-level formData instead of Iterator output.

---

### Step 2: Field Mapping Strategy

**Key Differences from Module 12:**
- Module 12 uses: `{{11.propertyDescription.bedsPrimary}}` (Iterator output)
- Single Property uses: `{{5.incoming_data.formData.propertyDescription.bedsPrimary}}` (root level)

**Contract Type Logic:**
- Single Contract (`decisionTree.contractType = "02"`): Use `total_price` only, leave `land_price` and `build_price` empty
- Split Contract (H&L): Use `land_price` + `build_price`, leave `total_price` empty

---

## 🔧 Complete Field Mapping (Proposed)

### Core Property Information

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{5.incoming_data.formData.address.propertyAddress}}",
    "template_type": "{{5.incoming_data.formData.decisionTree.templateType}}",
    "sourcer": "{{5.incoming_data.formData.sourcer}}",
    "packager": "{{5.incoming_data.formData.packager}}",
    "deal_type": "{{5.incoming_data.formData.dealType}}",
    "status": "{{5.incoming_data.formData.status}}",
    "folder_link": "{{5.incoming_data.folderLink}}",
    
    "street_number": "{{5.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{5.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{5.incoming_data.formData.address.suburb}}",
    "state": "{{5.incoming_data.formData.address.state}}",
    "post_code": "{{5.incoming_data.formData.address.postcode}}",
    "lga": "{{5.incoming_data.formData.address.lga}}",
    "unit__lot": "{{5.incoming_data.formData.address.unitLotPrimary}}",
    "unit__lot_secondary": "{{5.incoming_data.formData.address.unitLotSecondary}}",
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
    
    "agent_name": "{{5.incoming_data.formData.agentInfo.agentName}}",
    "agent_mobile": "{{5.incoming_data.formData.agentInfo.agentMobile}}",
    "agent_email": "{{5.incoming_data.formData.agentInfo.agentEmail}}",
    
    "attachments_additional_dialogue": "{{5.incoming_data.formData.attachmentsAdditionalDialogue}}"
  }
}
```

### ⚠️ IMPORTANT: Contract Type Logic

**We need to handle purchase price fields conditionally:**

**Option 1: Use Make.com IF statements (Recommended)**
```json
"land_price": "{{if(equals(5.incoming_data.formData.decisionTree.contractType; \"02\"); \"\"; 5.incoming_data.formData.purchasePrice.landPrice)}}",
"build_price": "{{if(equals(5.incoming_data.formData.decisionTree.contractType; \"02\"); \"\"; 5.incoming_data.formData.purchasePrice.buildPrice)}}",
"total_price": "{{if(equals(5.incoming_data.formData.decisionTree.contractType; \"02\"); 5.incoming_data.formData.purchasePrice.totalPrice; \"\")}}"
```

**Option 2: Map all three, GHL will handle empty values**
- For Single Contract: `total_price` has value, `land_price` and `build_price` are empty
- For Split Contract: `land_price` and `build_price` have values, `total_price` is empty

**Also need to handle cashback/rebate fields (only for contract types 01, 02, 03):**
```json
"cashback_rebate_value": "{{if(contains(5.incoming_data.formData.decisionTree.contractType; [\"01\"; \"02\"; \"03\"]); 5.incoming_data.formData.purchasePrice.cashbackRebateValue; \"\")}}",
"cashback_rebate_type": "{{if(contains(5.incoming_data.formData.decisionTree.contractType; [\"01\"; \"02\"; \"03\"]); 5.incoming_data.formData.purchasePrice.cashbackRebateType; \"\")}}"
```

---

## 🧪 Testing Plan

### After Adding HTTP Module:

1. **Submit a Single Property Test:**
   - Use your ready property submission
   - Submit through form app
   - Check Make.com execution log

2. **Verify GHL Record Created:**
   - Open GHL and check if record exists
   - Verify record has correct address

3. **Check Field Population:**
   - Go through ALL fields in GHL record
   - Document which fields have values ✅
   - Document which fields are empty ❌
   - Compare with what was submitted in form

4. **Document Findings:**
   - Create list of populated fields
   - Create list of empty fields (should have values)
   - Identify any mapping issues

---

## ⚠️ Important Notes

1. **GHL Field Names:**
   - Use exact field names from GHL (with underscores)
   - Some fields have double underscores: `unit__lot`, `body_corp__per_quarter`
   - Two fields have typos: `mining_dialogie`, `market_perfornance_additional_dialogue`

2. **Empty Values:**
   - GHL ignores empty/null fields (safe to include)
   - Better to include all fields even if empty (for future use)

3. **Data Types:**
   - Yes/No fields: "Yes" or "No" (strings)
   - Numeric fields: Can be numbers or strings
   - Date fields: Format as required by GHL

4. **Make.com Expression Syntax:**
   - Use `{{5.incoming_data.formData.fieldName}}` format
   - Nested fields: `{{5.incoming_data.formData.propertyDescription.bedsPrimary}}`
   - Array access: Not needed for single property (no lots array)

---

## 📝 Next Steps After This Module

Once GHL record creation is working:

1. ✅ Verify all fields populate correctly
2. ⏭️ Add email template building (later)
3. ⏭️ Add email sending (later)
4. ⏭️ Add Deal Sheet integration (later)

---

## 🔗 References

- **Module 12 Structure:** Working child record creation (Route 2)
- **GHL Fields CSV:** `GHL-FIELDS-CREATED-2026-01-09.csv`
- **Field Mapping Matrix:** `form-app/FIELD-MAPPING-MATRIX.md`
- **GHL Infrastructure:** `docs/EXISTING-GHL-INFRASTRUCTURE.md`
- **Handover Doc:** `HANDOVER-2026-01-09-SESSION.md`

---

**Status:** Ready for implementation  
**Next Action:** Add HTTP module in Make.com after Module 5
