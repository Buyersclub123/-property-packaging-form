# Route 2 - Module 9 & Module 12 Incremental Complete JSON

**Date:** January 10, 2026  
**Purpose:** Complete JSON bodies for Module 9 and Module 12 - Each step shows the FULL code to paste  
**Important:** Copy and paste the ENTIRE JSON from each step - this is the complete code, not just additions

---

## STEP 1: Current Working Baseline (DO NOT USE - This is just reference)

**This is what's currently working with minimal fields. We'll build from here incrementally.**

### Module 9 - Current Baseline (4 fields only)
```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{6.incoming_data.formData.address.projectAddress}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}"
  }
}
```

### Module 12 - Current Baseline (17 fields only)
```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "{{6.incoming_data.formData.address.projectAddress}}",
    "lot_number": "{{11.lotNumber}}",
    "project_parent_id": "{{10.parent_record_id}}",
    "is_parent_record": "No",
    "build_size": "{{11.propertyDescription.buildSize}}",
    "land_registration": "{{11.propertyDescription.landRegistration}}",
    "land_size": "{{11.propertyDescription.landSize}}",
    "build_size_primary": "{{11.propertyDescription.buildSizePrimary}}",
    "build_size_secondary": "{{11.propertyDescription.buildSizeSecondary}}",
    "land_price": "{{11.purchasePrice.landPrice}}",
    "build_price": "{{11.purchasePrice.buildPrice}}",
    "total_price": "{{11.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{11.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{11.purchasePrice.cashbackRebateType}}",
    "rent_appraisal_primary_from": "{{11.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{11.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary_from": "{{11.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{11.rentalAssessment.rentAppraisalSecondaryTo}}"
  }
}
```

---

## STEP 2: Add Address Fields to Module 9

**What this adds:** All address fields + lot number prefix in property_address

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}"
  }
}
```

**COMPLETE JSON TO PASTE INTO MODULE 12 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}",
    "lot_number": "{{11.lotNumber}}",
    "project_parent_id": "{{10.parent_record_id}}",
    "project_identifier": "{{13.project_identifier}}",
    "is_parent_record": "No",
    "build_size": "{{11.propertyDescription.buildSize}}",
    "land_registration": "{{11.propertyDescription.landRegistration}}",
    "land_size": "{{11.propertyDescription.landSize}}",
    "build_size_primary": "{{11.propertyDescription.buildSizePrimary}}",
    "build_size_secondary": "{{11.propertyDescription.buildSizeSecondary}}",
    "land_price": "{{11.purchasePrice.landPrice}}",
    "build_price": "{{11.purchasePrice.buildPrice}}",
    "total_price": "{{11.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{11.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{11.purchasePrice.cashbackRebateType}}",
    "rent_appraisal_primary_from": "{{11.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{11.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary_from": "{{11.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{11.rentalAssessment.rentAppraisalSecondaryTo}}"
  }
}
```

**NOTE:** Module 12 now includes `project_identifier` from Module 13. You'll need to fix Module 13 first (see below).

**Before Step 2 - Fix Module 13:**
1. Open Module 13 (Set Variable)
2. Change variable name from `"lots_array"` to: `project_identifier`
3. Change value from `{{1.formData.lots}}` to: `{{9.data.record.properties.project_identifier}}`
4. Save Module 13

---

## STEP 3: Add Sourcer/Packager and Decision Tree Fields to Module 9

**What this adds:** Sourcer, packager (with email extraction), deal_type, status

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 4: Add Risk Overlay Fields to Module 9

**What this adds:** All risk overlay fields (zoning, flood, bushfire, mining, other_overlay, special_infrastructure, due_diligence_acceptance)

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "zoning": "{{6.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{6.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{6.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{6.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{6.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{6.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{6.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{6.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{6.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{6.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{6.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{6.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 5: Add Property Description Fields to Module 9

**What this adds:** Property description fields (title, body_corp, singleOrDual, additionalDialogue)

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "zoning": "{{6.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{6.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{6.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{6.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{6.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{6.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{6.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{6.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{6.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{6.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{6.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{6.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    "title": "{{6.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{6.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{6.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "property_description_additional_dialogue": "{{6.incoming_data.formData.propertyDescription.additionalDialogue}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 6: Add Purchase Price Fields to Module 9

**What this adds:** Purchase price fields (asking with mapping, asking_text, acceptable_acquisition, cashback, comparable_sales, price_group, purchase_price_additional_dialogue)

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "zoning": "{{6.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{6.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{6.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{6.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{6.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{6.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{6.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{6.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{6.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{6.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{6.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{6.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    "title": "{{6.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{6.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{6.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "property_description_additional_dialogue": "{{6.incoming_data.formData.propertyDescription.additionalDialogue}}",
    "asking": "{{if(equals(6.incoming_data.formData.purchasePrice.asking; "On-market"); "on-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Off-market"); "off-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Pre-launch"); "pre-launch opportunity"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Coming Soon"); "coming soon"; ""))))}}",
    "asking_text": "{{6.incoming_data.formData.purchasePrice.askingText}}",
    "accepted_acquisition_target": "{{6.incoming_data.formData.purchasePrice.acceptedAcquisitionTarget}}",
    "acceptable_acquisition__from": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "cashback_rebate_type": "{{6.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "comparable_sales": "{{6.incoming_data.formData.purchasePrice.comparableSales}}",
    "purchase_price_additional_dialogue": "{{6.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    "price_group": "{{6.incoming_data.formData.purchasePrice.priceGroup}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 7: Add Rental Assessment and Market Performance Fields to Module 9

**What this adds:** Rental assessment (occupancy) and market performance fields (median_price_change, median_yield, rental_population, vacancy_rate)

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "zoning": "{{6.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{6.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{6.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{6.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{6.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{6.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{6.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{6.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{6.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{6.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{6.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{6.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    "title": "{{6.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{6.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{6.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "property_description_additional_dialogue": "{{6.incoming_data.formData.propertyDescription.additionalDialogue}}",
    "asking": "{{if(equals(6.incoming_data.formData.purchasePrice.asking; "On-market"); "on-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Off-market"); "off-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Pre-launch"); "pre-launch opportunity"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Coming Soon"); "coming soon"; ""))))}}",
    "asking_text": "{{6.incoming_data.formData.purchasePrice.askingText}}",
    "accepted_acquisition_target": "{{6.incoming_data.formData.purchasePrice.acceptedAcquisitionTarget}}",
    "acceptable_acquisition__from": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "cashback_rebate_type": "{{6.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "comparable_sales": "{{6.incoming_data.formData.purchasePrice.comparableSales}}",
    "purchase_price_additional_dialogue": "{{6.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    "price_group": "{{6.incoming_data.formData.purchasePrice.priceGroup}}",
    "occupancy": "{{6.incoming_data.formData.rentalAssessment.occupancy}}",
    "median_price_change__3_months": {{6.incoming_data.formData.marketPerformance.medianPriceChange3Months}},
    "median_price_change__1_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange1Year}},
    "median_price_change__3_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange3Year}},
    "median_price_change__5_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange5Year}},
    "median_yield": {{6.incoming_data.formData.marketPerformance.medianYield}},
    "median_rent_change__1_year": {{6.incoming_data.formData.marketPerformance.medianRentChange1Year}},
    "rental_population": {{6.incoming_data.formData.marketPerformance.rentalPopulation}},
    "vacancy_rate": {{6.incoming_data.formData.marketPerformance.vacancyRate}},
    "market_perfornance_additional_dialogue": "{{6.incoming_data.formData.marketPerformance.marketPerformanceAdditionalDialogue}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**NOTE:** Market performance fields (median_price_change, median_yield, etc.) are numbers without quotes. If GHL rejects these, we may need to switch to Code module approach.

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 8: Add Content Sections and Agent Info to Module 9

**What this adds:** Content sections (why_this_property, proximity, investment_highlights) and agent info (agent_name, agent_mobile, agent_email, message_for_ba, attachments_additional_dialogue, push_record_to_deal_sheet)

**COMPLETE JSON TO PASTE INTO MODULE 9 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}",
    "street_number": "{{6.incoming_data.formData.address.streetNumber}}",
    "street_name": "{{6.incoming_data.formData.address.streetName}}",
    "suburb_name": "{{6.incoming_data.formData.address.suburbName}}",
    "state": "{{6.incoming_data.formData.address.state}}",
    "post_code": "{{6.incoming_data.formData.address.postCode}}",
    "lga": "{{6.incoming_data.formData.address.lga}}",
    "unit__lot": "{{6.incoming_data.formData.address.unitNumber}}",
    "unit__lot_secondary": "{{6.incoming_data.formData.address.unitNumberSecondary}}",
    "google_map": "{{6.incoming_data.formData.address.googleMap}}",
    "sourcer": "{{replace(6.incoming_data.formData.sourcer; "@buyersclub.com.au"; "")}}",
    "packager": "{{replace(6.incoming_data.formData.packager; "@buyersclub.com.au"; "")}}",
    "deal_type": "{{6.incoming_data.formData.decisionTree.contractType}}",
    "status": "{{6.incoming_data.formData.decisionTree.status}}",
    "folder_link": "{{6.incoming_data.formData.folderLink}}",
    "zoning": "{{6.incoming_data.formData.riskOverlays.zoning}}",
    "flood": "{{6.incoming_data.formData.riskOverlays.flood}}",
    "flood_dialogue": "{{6.incoming_data.formData.riskOverlays.floodDialogue}}",
    "bushfire": "{{6.incoming_data.formData.riskOverlays.bushfire}}",
    "bushfire_dialogue": "{{6.incoming_data.formData.riskOverlays.bushfireDialogue}}",
    "mining": "{{6.incoming_data.formData.riskOverlays.mining}}",
    "mining_dialogie": "{{6.incoming_data.formData.riskOverlays.miningDialogue}}",
    "other_overlay": "{{6.incoming_data.formData.riskOverlays.otherOverlay}}",
    "other_overlay_dialogue": "{{6.incoming_data.formData.riskOverlays.otherOverlayDialogue}}",
    "special_infrastructure": "{{6.incoming_data.formData.riskOverlays.specialInfrastructure}}",
    "special_infrastructure_dialogue": "{{6.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}",
    "due_diligence_acceptance": "{{6.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}",
    "title": "{{6.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{6.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{6.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "property_description_additional_dialogue": "{{6.incoming_data.formData.propertyDescription.additionalDialogue}}",
    "asking": "{{if(equals(6.incoming_data.formData.purchasePrice.asking; "On-market"); "on-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Off-market"); "off-market"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Pre-launch"); "pre-launch opportunity"; if(equals(6.incoming_data.formData.purchasePrice.asking; "Coming Soon"); "coming soon"; ""))))}}",
    "asking_text": "{{6.incoming_data.formData.purchasePrice.askingText}}",
    "accepted_acquisition_target": "{{6.incoming_data.formData.purchasePrice.acceptedAcquisitionTarget}}",
    "acceptable_acquisition__from": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{6.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "cashback_rebate_type": "{{6.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "comparable_sales": "{{6.incoming_data.formData.purchasePrice.comparableSales}}",
    "purchase_price_additional_dialogue": "{{6.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    "price_group": "{{6.incoming_data.formData.purchasePrice.priceGroup}}",
    "occupancy": "{{6.incoming_data.formData.rentalAssessment.occupancy}}",
    "median_price_change__3_months": {{6.incoming_data.formData.marketPerformance.medianPriceChange3Months}},
    "median_price_change__1_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange1Year}},
    "median_price_change__3_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange3Year}},
    "median_price_change__5_year": {{6.incoming_data.formData.marketPerformance.medianPriceChange5Year}},
    "median_yield": {{6.incoming_data.formData.marketPerformance.medianYield}},
    "median_rent_change__1_year": {{6.incoming_data.formData.marketPerformance.medianRentChange1Year}},
    "rental_population": {{6.incoming_data.formData.marketPerformance.rentalPopulation}},
    "vacancy_rate": {{6.incoming_data.formData.marketPerformance.vacancyRate}},
    "market_perfornance_additional_dialogue": "{{6.incoming_data.formData.marketPerformance.marketPerformanceAdditionalDialogue}}",
    "why_this_property": "{{6.incoming_data.formData.contentSections.whyThisProperty}}",
    "proximity": "{{6.incoming_data.formData.contentSections.proximity}}",
    "investment_highlights": "{{6.incoming_data.formData.contentSections.investmentHighlights}}",
    "agent_name": "{{6.incoming_data.formData.agentInfo.name}}",
    "agent_mobile": "{{6.incoming_data.formData.agentInfo.mobile}}",
    "agent_email": "{{6.incoming_data.formData.agentInfo.email}}",
    "message_for_ba": "{{6.incoming_data.formData.messageForBA}}",
    "attachments_additional_dialogue": "{{6.incoming_data.formData.attachmentsAdditionalDialogue}}",
    "push_record_to_deal_sheet": "{{6.incoming_data.formData.pushRecordToDealSheet}}",
    "is_parent_record": "Yes",
    "project_identifier": "PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}",
    "project_brief": null,
    "project_overview": null,
    "lot_number": null,
    "project_parent_id": null
  }
}
```

**Module 12 stays the same as Step 2** (no changes needed)

---

## STEP 9: Add Missing Property Description Fields to Module 12

**What this adds:** All property description fields (beds, bath, garage, carport, carspace, year_built, title, body_corp, singleOrDual, additionalDialogue)

**COMPLETE JSON TO PASTE INTO MODULE 12 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}",
    "lot_number": "{{11.lotNumber}}",
    "project_parent_id": "{{10.parent_record_id}}",
    "project_identifier": "{{13.project_identifier}}",
    "is_parent_record": "No",
    "beds_primary": "{{11.propertyDescription.bedsPrimary}}",
    "beds_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.bedsSecondary); "0"; 11.propertyDescription.bedsSecondary)}}",
    "bath_primary": "{{11.propertyDescription.bathPrimary}}",
    "baths_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.bathSecondary); "0"; 11.propertyDescription.bathSecondary)}}",
    "garage_primary": "{{11.propertyDescription.garagePrimary}}",
    "garage_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.garageSecondary); "0"; 11.propertyDescription.garageSecondary)}}",
    "carport_primary": "{{11.propertyDescription.carportPrimary}}",
    "carport_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.carportSecondary); "0"; 11.propertyDescription.carportSecondary)}}",
    "carspace_primary": "{{11.propertyDescription.carspacePrimary}}",
    "carspace_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.carspaceSecondary); "0"; 11.propertyDescription.carspaceSecondary)}}",
    "year_built": "{{11.propertyDescription.yearBuilt}}",
    "land_size": "{{11.propertyDescription.landSize}}",
    "build_size": "{{11.propertyDescription.buildSize}}",
    "build_size_primary": "{{11.propertyDescription.buildSizePrimary}}",
    "build_size_secondary": "{{11.propertyDescription.buildSizeSecondary}}",
    "land_registration": "{{11.propertyDescription.landRegistration}}",
    "title": "{{11.propertyDescription.title}}",
    "body_corp__per_quarter": "{{11.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{11.propertyDescription.bodyCorpDescription}}",
    "single_or_dual_occupancy": "{{if(equals(11.singleOrDual; "Yes"); "dual_occupancy"; if(equals(11.singleOrDual; "No"); "single_occupancy"; ""))}}",
    "property_description_additional_dialogue": "{{11.propertyDescription.additionalDialogue}}",
    "acceptable_acquisition__from": "{{11.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{11.purchasePrice.acceptableAcquisitionTo}}",
    "land_price": "{{11.purchasePrice.landPrice}}",
    "build_price": "{{11.purchasePrice.buildPrice}}",
    "total_price": "{{11.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{11.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{11.purchasePrice.cashbackRebateType}}",
    "rent_appraisal_primary_from": "{{11.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{11.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary_from": "{{11.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{11.rentalAssessment.rentAppraisalSecondaryTo}}"
  }
}
```

**Module 9 stays the same as Step 8** (no changes needed)

---

## STEP 10: Add Missing Rental Assessment Fields to Module 12

**What this adds:** All rental assessment fields (occupancy, current rent, expiry, rent appraisal single fields, yield, rent dialogue, additional dialogue)

**COMPLETE JSON TO PASTE INTO MODULE 12 BODY FIELD:**

```json
{
  "locationId": "UJWYn4mrgGodB7KZUcHt",
  "properties": {
    "property_address": "Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}",
    "lot_number": "{{11.lotNumber}}",
    "project_parent_id": "{{10.parent_record_id}}",
    "project_identifier": "{{13.project_identifier}}",
    "is_parent_record": "No",
    "beds_primary": "{{11.propertyDescription.bedsPrimary}}",
    "beds_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.bedsSecondary); "0"; 11.propertyDescription.bedsSecondary)}}",
    "bath_primary": "{{11.propertyDescription.bathPrimary}}",
    "baths_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.bathSecondary); "0"; 11.propertyDescription.bathSecondary)}}",
    "garage_primary": "{{11.propertyDescription.garagePrimary}}",
    "garage_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.garageSecondary); "0"; 11.propertyDescription.garageSecondary)}}",
    "carport_primary": "{{11.propertyDescription.carportPrimary}}",
    "carport_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.carportSecondary); "0"; 11.propertyDescription.carportSecondary)}}",
    "carspace_primary": "{{11.propertyDescription.carspacePrimary}}",
    "carspace_additional__secondary__dual_key": "{{if(empty(11.propertyDescription.carspaceSecondary); "0"; 11.propertyDescription.carspaceSecondary)}}",
    "year_built": "{{11.propertyDescription.yearBuilt}}",
    "land_size": "{{11.propertyDescription.landSize}}",
    "build_size": "{{11.propertyDescription.buildSize}}",
    "build_size_primary": "{{11.propertyDescription.buildSizePrimary}}",
    "build_size_secondary": "{{11.propertyDescription.buildSizeSecondary}}",
    "land_registration": "{{11.propertyDescription.landRegistration}}",
    "title": "{{11.propertyDescription.title}}",
    "body_corp__per_quarter": "{{11.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{11.propertyDescription.bodyCorpDescription}}",
    "single_or_dual_occupancy": "{{if(equals(11.singleOrDual; "Yes"); "dual_occupancy"; if(equals(11.singleOrDual; "No"); "single_occupancy"; ""))}}",
    "property_description_additional_dialogue": "{{11.propertyDescription.additionalDialogue}}",
    "acceptable_acquisition__from": "{{11.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{11.purchasePrice.acceptableAcquisitionTo}}",
    "land_price": "{{11.purchasePrice.landPrice}}",
    "build_price": "{{11.purchasePrice.buildPrice}}",
    "total_price": "{{11.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{11.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{11.purchasePrice.cashbackRebateType}}",
    "occupancy_primary": "{{11.rentalAssessment.occupancyPrimary}}",
    "occupancy_secondary": "{{11.rentalAssessment.occupancySecondary}}",
    "current_rent_primary__per_week": "{{11.rentalAssessment.currentRentPrimary}}",
    "current_rent_secondary__per_week": "{{11.rentalAssessment.currentRentSecondary}}",
    "expiry_primary": "{{11.rentalAssessment.expiryPrimary}}",
    "expiry_secondary": "{{11.rentalAssessment.expirySecondary}}",
    "rent_appraisal_primary": "{{11.rentalAssessment.rentAppraisalPrimary}}",
    "rent_appraisal_primary_from": "{{11.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{11.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary": "{{11.rentalAssessment.rentAppraisalSecondary}}",
    "rent_appraisal_secondary_from": "{{11.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{11.rentalAssessment.rentAppraisalSecondaryTo}}",
    "yield": "{{11.rentalAssessment.yield}}",
    "appraised_yield": "{{11.rentalAssessment.appraisedYield}}",
    "rent_dialogue_primary": "{{11.rentalAssessment.rentDialoguePrimary}}",
    "rent_dialogue_secondary": "{{11.rentalAssessment.rentDialogueSecondary}}",
    "rental_assessment_additional_dialogue": "{{11.rentalAssessment.rentalAssessmentAdditionalDialogue}}"
  }
}
```

**Module 9 stays the same as Step 8** (no changes needed)

---

## Testing After Each Step

**After each step:**
1. Save the module with the new JSON
2. Run a test execution in Make.com
3. Check that the execution completes successfully (200 status)
4. Verify the created record in GHL has the new fields populated
5. If it fails, revert to the previous step's JSON

**If errors occur:**
- Check the execution log in Make.com
- Look for field type errors (numbers vs strings)
- If market performance fields (Step 7) cause errors, we may need to switch to Code module approach
- If multi-line fields (Step 8) cause JSON errors, we may need to handle them differently

---

**Last Updated:** January 10, 2026  
**Status:** Ready for incremental implementation
