# Module 14 - Complete JSON String for Body Content

**Route:** Route 1 (Single Property)  
**Module:** Module 14 (HTTP - Make a Request)  
**Mode:** JSON String  
**Date:** January 10, 2026

---

## Complete JSON String

Copy this entire JSON string and paste it into Module 14's "Body content" field:

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
    "unit__lot_secondary": "{{5.incoming_data.formData.address.unitNumberSecondary}}",
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
    "land_size": "{{5.incoming_data.formData.propertyDescription.landSize}}",
    "build_size": "{{5.incoming_data.formData.propertyDescription.buildSize}}",
    "build_size_primary": "{{5.incoming_data.formData.propertyDescription.buildSizePrimary}}",
    "build_size_secondary": "{{5.incoming_data.formData.propertyDescription.buildSizeSecondary}}",
    "land_registration": "{{5.incoming_data.formData.propertyDescription.landRegistration}}",
    "title": "{{5.incoming_data.formData.propertyDescription.title}}",
    "body_corp__per_quarter": "{{5.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}",
    "body_corp_description": "{{5.incoming_data.formData.propertyDescription.bodyCorpDescription}}",
    "does_this_property_have_2_dwellings": "{{5.incoming_data.formData.propertyDescription.singleOrDual}}",
    "property_description_additional_dialogue": "{{5.incoming_data.formData.propertyDescription.additionalDialogue}}",
    "asking": "{{5.incoming_data.formData.purchasePrice.asking}}",
    "asking_text": "{{5.incoming_data.formData.purchasePrice.askingText}}",
    "accepted_acquisition_target": "{{5.incoming_data.formData.purchasePrice.acceptedAcquisitionTarget}}",
    "acceptable_acquisition__from": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}",
    "acceptable_acquisition__to": "{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}",
    "land_price": "{{5.incoming_data.formData.purchasePrice.landPrice}}",
    "build_price": "{{5.incoming_data.formData.purchasePrice.buildPrice}}",
    "total_price": "{{5.incoming_data.formData.purchasePrice.totalPrice}}",
    "cashback_rebate_value": "{{5.incoming_data.formData.purchasePrice.cashbackRebateValue}}",
    "cashback_rebate_type": "{{5.incoming_data.formData.purchasePrice.cashbackRebateType}}",
    "comparable_sales": "{{5.incoming_data.formData.purchasePrice.comparableSales}}",
    "purchase_price_additional_dialogue": "{{5.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}",
    "price_group": "{{5.incoming_data.formData.purchasePrice.priceGroup}}",
    "occupancy": "{{5.incoming_data.formData.rentalAssessment.occupancy}}",
    "occupancy_primary": "{{5.incoming_data.formData.rentalAssessment.occupancyPrimary}}",
    "occupancy_secondary": "{{5.incoming_data.formData.rentalAssessment.occupancySecondary}}",
    "current_rent_primary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentPrimary}}",
    "current_rent_secondary__per_week": "{{5.incoming_data.formData.rentalAssessment.currentRentSecondary}}",
    "expiry_primary": "{{5.incoming_data.formData.rentalAssessment.expiryPrimary}}",
    "expiry_secondary": "{{5.incoming_data.formData.rentalAssessment.expirySecondary}}",
    "rent_appraisal_primary": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimary}}",
    "rent_appraisal_primary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryFrom}}",
    "rent_appraisal_primary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryTo}}",
    "rent_appraisal_secondary": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondary}}",
    "rent_appraisal_secondary_from": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryFrom}}",
    "rent_appraisal_secondary_to": "{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryTo}}",
    "yield": "{{5.incoming_data.formData.rentalAssessment.yield}}",
    "appraised_yield": "{{5.incoming_data.formData.rentalAssessment.appraisedYield}}",
    "rent_dialogue_primary": "{{5.incoming_data.formData.rentalAssessment.rentDialoguePrimary}}",
    "rent_dialogue_secondary": "{{5.incoming_data.formData.rentalAssessment.rentDialogueSecondary}}",
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
    "why_this_property": "{{replace(replace(5.incoming_data.formData.contentSections.whyThisProperty; "\n"; "\\n"); "\""; "\\\"")}}",
    "proximity": "{{replace(replace(5.incoming_data.formData.contentSections.proximity; "\n"; "\\n"); "\""; "\\\"")}}",
    "investment_highlights": "{{replace(replace(5.incoming_data.formData.contentSections.investmentHighlights; "\n"; "\\n"); "\""; "\\\"")}}",
    "agent_name": "{{5.incoming_data.formData.agentInfo.name}}",
    "agent_mobile": "{{5.incoming_data.formData.agentInfo.mobile}}",
    "agent_email": "{{5.incoming_data.formData.agentInfo.email}}",
    "message_for_ba": "{{5.incoming_data.formData.messageForBA}}",
    "attachments_additional_dialogue": "{{5.incoming_data.formData.attachmentsAdditionalDialogue}}",
    "push_record_to_deal_sheet": "{{5.incoming_data.formData.pushRecordToDealSheet}}",
    "review_date": "{{formatDate(now; \"YYYY-MM-DD\")}}",
    "lot_number": null,
    "project_parent_id": null,
    "project_identifier": null,
    "is_parent_record": null,
    "project_brief": null,
    "project_overview": null
  }
}
```

---

## How to Use

1. **Open Module 14** in Make.com (Route 1 - Single Property)
2. **Set Body content to:** "JSON string"
3. **Paste the entire JSON above** into the "Body content" field
4. **Click Save**

---

## Notes

- All field mappings use `{{5.incoming_data.formData...}}` (Module 5 - Set Variable in Route 1)
- Empty values are already handled - form sends `null` instead of empty strings
- Multi-line fields (`why_this_property`, `proximity`, `investment_highlights`) are included - Make.com's JSON string mode should handle them
- Project-specific fields are set to `null` for single properties

---

## Testing

After pasting this, test by submitting a single property form and checking if Module 14 executes successfully without the "LocationId is not specified" error.
