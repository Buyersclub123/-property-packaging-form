# Module 14 - Create JSON Module Implementation Guide

**Date:** January 10, 2026  
**Purpose:** Replace JSON string mode with "Create JSON" module to properly handle empty values and multi-line fields  
**Status:** Ready for implementation

---

## 🎯 Why Use Create JSON Module?

**Benefits:**
- ✅ Automatically handles empty values (sends `null` instead of empty strings)
- ✅ Properly escapes multi-line fields (`why_this_property`, `proximity`, `investment_highlights`)
- ✅ No complex conditional logic needed
- ✅ Long-term stable solution
- ✅ Works with any field value (empty or not)

**Current Problems It Solves:**
- ❌ Empty numeric dropdown fields cause 400 errors
- ❌ Multi-line fields break JSON parsing in JSON string mode
- ❌ Need to add/remove conditionals for each field

---

## 📋 Implementation Steps

### Step 1: Add "Create JSON" Module in Route 1 (After Router)

**Location:** In Route 1 (Single Property), after Module 5 (Set Variable), before Module 14 (HTTP - Make a Request)

**Why This Location?**
- ✅ **Single Property** has all fields at root: `formData.propertyDescription`, `formData.purchasePrice`, etc.
- ✅ **Projects** have fields in `formData.lots[]` - different structure, can't use same JSON
- ✅ Route 2 uses Iterator (Module 11) which exposes lot data as `{{11.propertyDescription...}}`
- ✅ Placing it in Route 1 only ensures it only runs for single properties
- ✅ Avoids errors when projects try to access root-level fields that don't exist

**Data Structure Difference:**

**Single Property:**
```json
{
  "formData": {
    "propertyDescription": { ... },  // ✅ Exists at root
    "purchasePrice": { ... },        // ✅ Exists at root
    "rentalAssessment": { ... }      // ✅ Exists at root
  }
}
```

**Projects:**
```json
{
  "formData": {
    "lots": [
      {
        "propertyDescription": { ... },  // ❌ Only in lots array
        "purchasePrice": { ... },        // ❌ Only in lots array
        "rentalAssessment": { ... }      // ❌ Only in lots array
      }
    ]
  }
}
```

**Instructions:**
1. In Make.com scenario, go to **Route 1** (Single Property)
2. Find Module 14 (HTTP - Make a Request)
3. Click the **"+"** button **BETWEEN** Module 5 and Module 14
4. Search for: **"Create JSON"** or **"Tools > Create JSON"**
5. Select: **"Tools > Create JSON"**
6. Click **"Save"**
7. This will become the new **Module 13** (HTTP module will shift to Module 15)

---

### Step 2: Build the JSON Structure

**In the Create JSON module, click "Add item" for each field below:**

#### Item 1: Top-Level Object

**Key:** `locationId`  
**Value Type:** Text  
**Value:** `UJWYn4mrgGodB7KZUcHt`  
**Note:** Map from Module 1 (webhook) - this is static, but you can also hardcode it

**Click "Add item" again:**

#### Item 2: Properties Object

**Key:** `properties`  
**Value Type:** Object  
**Value:** (Leave empty - we'll add items inside)

**Click INSIDE the Object to expand it, then click "Add item" to add nested fields:**

---

### Step 3: Add All Property Fields

**For each field below, click "Add item" INSIDE the `properties` object:**

#### Core Property Information (Lines 1-6):

1. **Key:** `property_address`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.propertyAddress}}` (map from Module 5 - Set Variable in Route 1)

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

#### Address Fields (Lines 7-15):

7. **Key:** `street_number`  
   **Value Type:** Text  
   **Value:** `{{5.incoming_data.formData.address.streetNumber}}` (map from Module 1 - webhook)

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
    **Value:** `` (empty - Create JSON will handle this)

15. **Key:** `google_map`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.address.googleMap}}`

#### Risk Overlays Fields (Lines 16-28):

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

#### Property Description Fields (Lines 29-46):

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
    **✅ Note:** Create JSON will automatically handle empty values!

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

39. **Key:** `land_registration`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.landRegistration}}`

40. **Key:** `land_size`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.landSize}}`

41. **Key:** `build_size`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.buildSize}}`

42. **Key:** `title`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.title}}`

43. **Key:** `body_corp__per_quarter`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bodyCorpPerQuarter}}`

44. **Key:** `body_corp_description`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.bodyCorpDescription}}`

45. **Key:** `does_this_property_have_2_dwellings`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.doesThisPropertyHave2Dwellings}}`

46. **Key:** `property_description_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.propertyDescription.propertyDescriptionAdditionalDialogue}}`

#### Purchase Price Fields (Lines 47-56):

47. **Key:** `asking`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.asking}}`

48. **Key:** `asking_text`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.askingText}}`

49. **Key:** `acceptable_acquisition__from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionFrom}}`

50. **Key:** `acceptable_acquisition__to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.acceptableAcquisitionTo}}`

51. **Key:** `comparable_sales`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.comparableSales}}`

52. **Key:** `land_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.landPrice}}`

53. **Key:** `build_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.buildPrice}}`

54. **Key:** `total_price`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.totalPrice}}`

55. **Key:** `cashback_rebate_value`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.cashbackRebateValue}}`

56. **Key:** `cashback_rebate_type`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.cashbackRebateType}}`

57. **Key:** `purchase_price_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.purchasePrice.purchasePriceAdditionalDialogue}}`

#### Rental Assessment Fields (Lines 58-71):

58. **Key:** `occupancy_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.occupancyPrimary}}`

59. **Key:** `occupancy_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.occupancySecondary}}`

60. **Key:** `current_rent_primary__per_week`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.currentRentPrimary}}`

61. **Key:** `current_rent_secondary__per_week`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.currentRentSecondary}}`

62. **Key:** `expiry_primary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.expiryPrimary}}`

63. **Key:** `expiry_secondary`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.expirySecondary}}`

64. **Key:** `rent_appraisal_primary_from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryFrom}}`

65. **Key:** `rent_appraisal_primary_to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalPrimaryTo}}`

66. **Key:** `rent_appraisal_secondary_from`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryFrom}}`

67. **Key:** `rent_appraisal_secondary_to`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentAppraisalSecondaryTo}}`

68. **Key:** `yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.yield}}`

69. **Key:** `appraised_yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.appraisedYield}}`

70. **Key:** `rental_assessment_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.rentalAssessment.rentalAssessmentAdditionalDialogue}}`

#### Market Performance Fields (Lines 72-81):

71. **Key:** `median_price_change__3_months`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange3Months}}`

72. **Key:** `median_price_change__1_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange1Year}}`

73. **Key:** `median_price_change__3_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange3Year}}`

74. **Key:** `median_price_change__5_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianPriceChange5Year}}`

75. **Key:** `median_yield`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianYield}}`

76. **Key:** `median_rent_change__1_year`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.medianRentChange1Year}}`

77. **Key:** `rental_population`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.rentalPopulation}}`

78. **Key:** `vacancy_rate`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.vacancyRate}}`

79. **Key:** `market_perfornance_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.marketPerformance.marketPerformanceAdditionalDialogue}}`

#### Multi-Line Content Fields (Lines 82-84) - ✅ NOW INCLUDED:

80. **Key:** `why_this_property`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.whyThisProperty}}`  
    **✅ Note:** Create JSON properly escapes multi-line text!

81. **Key:** `proximity`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.proximity}}`  
    **✅ Note:** Create JSON properly escapes multi-line text!

82. **Key:** `investment_highlights`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.contentSections.investmentHighlights}}`  
    **✅ Note:** Create JSON properly escapes multi-line text!

#### Agent Fields (Lines 85-87):

83. **Key:** `agent_name`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.sellingAgentName}}`

84. **Key:** `agent_mobile`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.sellingAgentMobile}}`

85. **Key:** `agent_email`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.sellingAgentEmail}}`

#### Additional Fields (Lines 88-89):

86. **Key:** `message_for_ba`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.messageForBA}}`

87. **Key:** `attachments_additional_dialogue`  
    **Value Type:** Text  
    **Value:** `{{5.incoming_data.formData.attachmentsAdditionalDialogue}}`

---

### Step 4: Update Route 1 - Module 14 (HTTP - Make a Request)

**For Single Property Route (Route 1):**

1. **Click on Module 14** (HTTP - Make a Request) in Route 1
2. **Body Input Method:** Change from "JSON string" to **"Data structure"**
3. **Body Content:** 
   - Click the mapping icon
   - Select: **`2.JSON`** (the output from Create JSON module - Module 2)
   - Or map to: **`2.jsonString`** (if that's what Create JSON outputs)
4. **Content Type:** Should be `application/json` (auto-set)
5. **Click "Save"**

**Note:** Module numbers may have shifted - use the Create JSON module's output (it's now Module 2, before the Router)

---

### Step 5: Update Route 2 - Module 12 (HTTP - Create Child Records) - Optional

**For Project Route (Route 2) - Child Records:**

**Note:** Child records use data from the Iterator (Module 11), which iterates over `formData.lots`. You have two options:

**Option A:** Use the Create JSON module structure as a template, but map from Iterator output:
- The structure is the same, but map from `{{11.propertyDescription.bedsPrimary}}` instead of `{{5.incoming_data.formData.propertyDescription.bedsPrimary}}`
- This requires building the JSON structure again in Module 12 (or using Create JSON again)

**Option B:** Keep Module 12 as JSON string mode for now (since it uses Iterator output, not Module 1 output)

**Recommendation:** For now, focus on Route 1 (Single Property). Route 2 child records can be updated later if needed, or you can add another Create JSON module after the Iterator that uses the same structure but maps from Iterator output.

---

## ✅ Verification Checklist

After implementation:

- [ ] Create JSON module added **before Router (Module 2)**
- [ ] All 87 fields added to Create JSON module
- [ ] All field mappings use `{{5.incoming_data.formData...}}` (from webhook, not Module 5)
- [ ] Multi-line fields included (`why_this_property`, `proximity`, `investment_highlights`)
- [ ] Route 1 - Module 14 updated to use "Data structure" mode
- [ ] Route 1 - Module 14 maps to Create JSON output (Module 2)
- [ ] Test with form submission (empty and filled fields)
- [ ] Verify GHL record created successfully in Route 1
- [ ] Verify all fields populate correctly
- [ ] (Optional) Update Route 2 - Module 12 if needed

---

## 🧪 Testing

**Test Cases:**

1. **Test with empty carport/carspace fields:**
   - Submit form with no carport/carspace values
   - Should NOT get 400 error
   - GHL record should be created

2. **Test with multi-line fields:**
   - Submit form with text in `why_this_property`, `proximity`, `investment_highlights`
   - Should NOT get JSON parsing error
   - Fields should populate correctly in GHL

3. **Test with all fields filled:**
   - Submit complete form
   - Verify all fields populate in GHL

---

## 📝 Notes

- **Field Mapping:** Use the mapping icon (🔗) to map from Module 1's (webhook) `formData` output
- **Module Reference:** All fields now reference `{{5.incoming_data.formData...}}` instead of `{{5.incoming_data.formData...}}`
- **Empty Values:** Create JSON automatically converts empty strings to `null`
- **Multi-line Fields:** Create JSON automatically escapes newlines and special characters
- **No Conditionals Needed:** Create JSON handles all edge cases automatically

---

## 🚀 Next Steps After Implementation

1. Remove old JSON string from Module 14 (Route 1) if still there
2. Test thoroughly with different form submissions (single property)
3. Consider updating Route 2 - Module 12 (child records) to use Create JSON module after Iterator
4. Document any issues or edge cases found
5. Remove the temporary JSON string version from documentation (if no longer needed)

---

## 📊 Updated Scenario Structure

**After implementation, the scenario structure will be:**

```
Module 1: Custom Webhook
  ↓
Module 2: Create JSON (NEW - builds JSON structure)
  ↓
Module 3: Router (was Module 2)
  ├─ Route 1: Single Property
  │   ├─ Module 5: Set Variable (incoming_data) - may not be needed anymore
  │   └─ Module 14: HTTP - Create GHL Record (uses Module 2 JSON output)
  └─ Route 2: Project
      ├─ Module 6: Set Variable (incoming_data)
      ├─ Module 9: HTTP - Create Parent Record
      ├─ Module 10: Set Variable (parent_record_id)
      ├─ Module 11: Iterator (formData.lots)
      └─ Module 12: HTTP - Create Child Records (could use Create JSON too)
```

**Note:** Module numbers will shift - always reference modules by their function, not number!

---

**Status:** Ready for implementation  
**Priority:** High - Long-term stable solution for Module 14
