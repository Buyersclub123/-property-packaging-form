# Route 2 - Module 9 & Module 12 Complete JSON

**Date:** January 10, 2026  
**Purpose:** Complete field mappings for Route 2 (Project) parent and child records

**⚠️ IMPORTANT:** Use the Code module approach (see `ROUTE-2-MODULE-9-CODE-MODULE.md`) instead of building JSON directly in Module 9. The Code module handles the `asking` field mapping cleanly. This JSON file is kept as reference only.

---

## Module 9 - Parent Record (Complete JSON)

**Note:** All fields come from `{{6.incoming_data.formData}}` - shared project data only (no lot-specific fields)  
**Address format:** `"Lot [FIRST_LOT_NUMBER], [ADDRESS]"` - Parent uses first/lowest lot number  
**Asking field:** Test without mapping first - if GHL rejects it, add Code module from `ROUTE-2-MODULE-9-CODE-MODULE.md`

**Note:** All fields come from `{{6.incoming_data.formData}}` - shared project data only (no lot-specific fields)  
**Address format:** `"Lot [FIRST_LOT_NUMBER], [ADDRESS]"` - Parent uses first/lowest lot number

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

---

## Module 12 - Child Record (Complete JSON)

**Note:** All lot-specific fields come from `{{11...}}` (Iterator output from Module 11)  
**Address format:** `"Lot [LOT_NUMBER], [ADDRESS]"` - Each child record gets its lot number prefixed

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

---

## Important Notes

### Integer Fields (Send as Strings)
All price and rent fields should be sent as strings (wrapped in quotes `"{{...}}"`), not numbers. This matches what we learned from Route 1.

### Float Fields (Send as Numbers)
Market performance fields in Module 9 should be numbers (no quotes around `{{...}}`). These are only in parent record, not child records.

### `asking` Field Mapping
Module 9 uses a nested `if()` statement to map form values to GHL values. Alternatively, you could add a Code module before Module 9 to handle this mapping.

### Module 13
Module 13 should capture `project_identifier` from Module 9's response so it can be used in Module 12 child records.

---

**Copy the JSON above into Module 9 and Module 12 body fields respectively.**
