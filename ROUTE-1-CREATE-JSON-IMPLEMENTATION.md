# Route 1 (Single Property) - Create JSON Module Implementation

**Date:** January 10, 2026  
**Purpose:** Add Create JSON module to Route 1 to handle empty values and multi-line fields  
**Status:** Ready for implementation

---

## 📋 Quick Summary

**What we're doing:**
- Adding a "Create JSON" module after Module 5, before Module 14 (HTTP - Make a Request)
- Mapping all 87 form fields to Create JSON
- Updating Module 14 to use Create JSON output (data structure mode)

**Why:**
- ✅ Handles empty values automatically (sends `null` instead of empty strings)
- ✅ Properly escapes multi-line fields
- ✅ No complex conditionals needed
- ✅ Stable long-term solution

---

## ✅ Step-by-Step Implementation

### Step 1: Add Create JSON Module

1. In Make.com scenario, go to **Route 1** (Single Property)
2. Find **Module 14** (HTTP - Make a Request)
3. Click the **"+"** button **BETWEEN** Module 5 and Module 14
4. Search for: **"Create JSON"** or **"Tools > Create JSON"**
5. Select: **"Tools > Create JSON"**
6. Click **"Save"**
7. This will become the new **Module 13** (Module 14 will shift to Module 15)

---

### Step 2: Build JSON Structure

**In the Create JSON module:**

1. **Click "Add item"**

   **Item 1:**
   - **Key:** `locationId`
   - **Value Type:** Text
   - **Value:** `UJWYn4mrgGodB7KZUcHt` (hardcode this)

2. **Click "Add item" again**

   **Item 2:**
   - **Key:** `properties`
   - **Value Type:** Object (select "Object" from dropdown)
   - **Value:** (leave empty)

3. **Click INSIDE the `properties` object** (this expands it to show nested fields)

---

### Step 3: Add All 87 Fields

**Click "Add item" INSIDE the `properties` object for each field below:**

#### Core Property (6 fields):

1. **Key:** `property_address`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.propertyAddress}}`

2. **Key:** `sourcer`  
   **Value Type:** Text  
   **Value:** `{{replace(5.incoming_data.formData.sourcer; '@buyersclub.com.au'; '')}}`

3. **Key:** `packager`  
   **Value Type:** Text  
   **Value:** `{{replace(5.incoming_data.formData.packager; '@buyersclub.com.au'; '')}}`

4. **Key:** `deal_type`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.decisionTree.contractType}}`

5. **Key:** `status`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.decisionTree.status}}`

6. **Key:** `folder_link`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.folderLink}}`

#### Address (9 fields):

7. **Key:** `street_number`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.streetNumber}}`

8. **Key:** `street_name`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.streetName}}`

9. **Key:** `suburb_name`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.suburbName}}`

10. **Key:** `state`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.state}}`

11. **Key:** `post_code`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.postCode}}`

12. **Key:** `lga`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.lga}}`

13. **Key:** `unit__lot`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.unitNumber}}`

14. **Key:** `unit__lot_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.unitNumberSecondary}}`

15. **Key:** `google_map`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.googleMap}}`

#### Risk Overlays (12 fields):

16. **Key:** `zoning`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.zoning}}`

17. **Key:** `flood`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.flood}}`

18. **Key:** `flood_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.floodDialogue}}`

19. **Key:** `bushfire`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.bushfire}}`

20. **Key:** `bushfire_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.bushfireDialogue}}`

21. **Key:** `mining`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.mining}}`

22. **Key:** `mining_dialogie`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.miningDialogue}}`

23. **Key:** `other_overlay`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.otherOverlay}}`

24. **Key:** `other_overlay_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.otherOverlayDialogue}}`

25. **Key:** `special_infrastructure`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.specialInfrastructure}}`

26. **Key:** `special_infrastructure_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.specialInfrastructureDialogue}}`

27. **Key:** `due_diligence_acceptance`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.riskOverlays.dueDiligenceAcceptance}}`

#### Property Description (21 fields):

28. **Key:** `beds_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bedsPrimary}}`

29. **Key:** `beds_additional__secondary__dual_key`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bedsSecondary}}`

30. **Key:** `bath_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bathPrimary}}`

31. **Key:** `baths_additional__secondary__dual_key`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bathSecondary}}`

32. **Key:** `garage_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.garagePrimary}}`

33. **Key:** `garage_additional__secondary__dual_key`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.garageSecondary}}`

34. **Key:** `carport_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.carportPrimary}}`

35. **Key:** `carport_additional__secondary__dual_key`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.carportSecondary}}`

36. **Key:** `carspace_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.carspacePrimary}}`

37. **Key:** `carspace_additional__secondary__dual_key`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.carspaceSecondary}}`

38. **Key:** `year_built`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.yearBuilt}}`

39. **Key:** `land_size`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.landSize}}`

40. **Key:** `build_size`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.buildSize}}`

41. **Key:** `build_size_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.buildSizePrimary}}`

42. **Key:** `build_size_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.buildSizeSecondary}}`

43. **Key:** `land_registration`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.landRegistration}}`

44. **Key:** `title`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.title}}`

45. **Key:** `body_corp__per_quarter`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}`

46. **Key:** `body_corp_description`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bodyCorpDescription}}`

47. **Key:** `single_or_dual_occupancy`  
    **Value Type:** Text  
    **Value:** `{{if(equals(5.incoming_data.formData.decisionTree.dualOccupancy; "Yes"); "dual_occupancy"; if(equals(5.incoming_data.formData.decisionTree.dualOccupancy; "No"); "single_occupancy"; ""))}}`

48. **Key:** `property_description_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.additionalDialogue}}`

#### Purchase Price (13 fields):

49. **Key:** `asking`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.asking}}`

50. **Key:** `asking_text`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.askingText}}`

51. **Key:** `accepted_acquisition_target`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.acceptedAcquisitionTarget}}`

52. **Key:** `acceptable_acquisition__from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}`

53. **Key:** `acceptable_acquisition__to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}`

54. **Key:** `land_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.landPrice}}`

55. **Key:** `build_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.buildPrice}}`

56. **Key:** `total_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.totalPrice}}`

57. **Key:** `cashback_rebate_value`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.cashbackRebateValue}}`

58. **Key:** `cashback_rebate_type`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.cashbackRebateType}}`

59. **Key:** `comparable_sales`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.comparableSales}}`

60. **Key:** `purchase_price_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.additionalDialogue}}`

61. **Key:** `price_group`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.priceGroup}}`

#### Rental Assessment (18 fields):

62. **Key:** `occupancy`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.occupancy}}`

63. **Key:** `occupancy_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.occupancyPrimary}}`

64. **Key:** `occupancy_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.occupancySecondary}}`

65. **Key:** `current_rent_primary__per_week`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.currentRentPrimary}}`

66. **Key:** `current_rent_secondary__per_week`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.currentRentSecondary}}`

67. **Key:** `expiry_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.expiryPrimary}}`

68. **Key:** `expiry_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.expirySecondary}}`

69. **Key:** `rent_appraisal_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimary}}`

70. **Key:** `rent_appraisal_primary_from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryFrom}}`

71. **Key:** `rent_appraisal_primary_to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryTo}}`

72. **Key:** `rent_appraisal_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondary}}`

73. **Key:** `rent_appraisal_secondary_from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryFrom}}`

74. **Key:** `rent_appraisal_secondary_to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryTo}}`

75. **Key:** `yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.yield}}`

76. **Key:** `appraised_yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.appraisedYield}}`

77. **Key:** `rent_dialogue_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentDialoguePrimary}}`

78. **Key:** `rent_dialogue_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentDialogueSecondary}}`

79. **Key:** `rental_assessment_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.additionalDialogue}}`

#### Market Performance (9 fields):

80. **Key:** `median_price_change__3_months`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange3Months}}`

81. **Key:** `median_price_change__1_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange1Year}}`

82. **Key:** `median_price_change__3_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange3Year}}`

83. **Key:** `median_price_change__5_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange5Year}}`

84. **Key:** `median_yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianYield}}`

85. **Key:** `median_rent_change__1_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianRentChange1Year}}`

86. **Key:** `rental_population`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.rentalPopulation}}`

87. **Key:** `vacancy_rate`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.vacancyRate}}`

88. **Key:** `market_perfornance_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.additionalDialogue}}`

#### Content Sections (3 fields):

89. **Key:** `why_this_property`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.whyThisProperty}}`

90. **Key:** `proximity`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.proximity}}`

91. **Key:** `investment_highlights`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.investmentHighlights}}`

#### Agent Information (3 fields):

92. **Key:** `agent_name`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.agentInfo.name}}`

93. **Key:** `agent_mobile`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.agentInfo.mobile}}`

94. **Key:** `agent_email`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.agentInfo.email}}`

#### Workflow Fields (4 fields):

95. **Key:** `message_for_ba`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.messageForBA}}`

96. **Key:** `attachments_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.attachmentsAdditionalDialogue}}`

97. **Key:** `push_record_to_deal_sheet`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.pushRecordToDealSheet}}`

98. **Key:** `review_date`  
    **Value Type:** Text  
    **Value:** `{{formatDate(now; "YYYY-MM-DD")}}`

#### Project-Specific Fields (set to null for single property):

99. **Key:** `lot_number`  
    **Value Type:** Text  
    **Value:** (leave empty - Create JSON will send `null`)

100. **Key:** `project_parent_id`  
     **Value Type:** Text  
     **Value:** (leave empty - Create JSON will send `null`)

101. **Key:** `project_identifier`  
     **Value Type:** Text  
     **Value:** (leave empty - Create JSON will send `null`)

102. **Key:** `is_parent_record`  
     **Value Type:** Text  
     **Value:** (leave empty - Create JSON will send `null`)

103. **Key:** `project_brief`  
     **Value Type:** Text  
     **Value:** (leave empty - Create JSON will send `null`)

104. **Key:** `project_overview`  
     **Value Type:** Text  
     **Value:** (leave empty - Create JSON will send `null`)

---

### Step 4: Update Module 14 (HTTP - Make a Request)

**After creating all fields in Create JSON module:**

1. Click on **Module 14** (now Module 15 - HTTP - Make a Request)
2. In the **Body** section, change from **"JSON string"** to **"Data structure"**
3. Map the body to Create JSON output:
   - Click the mapping icon (🔗)
   - Select **Module 13** (Create JSON)
   - Select the output data structure
4. Click **"Save"**

---

## ✅ Testing Checklist

After implementation, test with:

1. **Empty fields test:**
   - Submit form with no carport/carspace values
   - Should NOT get 400 error
   - GHL record should be created

2. **Multi-line fields test:**
   - Submit form with text in `why_this_property`, `proximity`, `investment_highlights`
   - Should NOT get JSON parsing error
   - Fields should populate correctly in GHL

3. **All fields test:**
   - Submit complete form
   - Verify all fields populate in GHL

---

## 📝 Notes

- **All fields use:** `{{5.incoming_data.formData...}}` (Module 5 - Set Variable in Route 1)
- **Empty values:** Create JSON automatically converts empty strings to `null`
- **Multi-line fields:** Create JSON automatically escapes newlines and special characters
- **No conditionals needed:** Create JSON handles all edge cases automatically

---

## 🚨 Common Issues

**Issue:** "Invalid reference" error
- **Solution:** Make sure all field paths use `{{5.incoming_data.formData...}}` (not `{{1.formData...}}`)

**Issue:** Field not found
- **Solution:** Check field name matches exactly (use mapping icon 🔗 to select from dropdown)

**Issue:** Module 14 still shows errors
- **Solution:** Make sure you changed from "JSON string" to "Data structure" mode in Module 14

---

**Status:** Ready for implementation  
**Next:** Test Route 1, then implement Route 2
