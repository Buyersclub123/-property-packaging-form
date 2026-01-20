# Route 2 - Module 9 Baseline Working Configuration

**Date Created:** January 10, 2026  
**Purpose:** Baseline snapshot of working Module 9 and Module 12 configuration before adding fields  
**Status:** ✅ WORKING - Creating parent and child records successfully  
**Important:** This is the working baseline. If changes break things, revert to this configuration.

---

## Current Module 9 (Parent Record) - WORKING CONFIGURATION

### HTTP Request Settings

**Module ID:** 9  
**Module Type:** `http:MakeRequest`  
**URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`  
**Method:** `POST`  
**Authentication Type:** `No authentication`

**Headers:**
- `Authorization`: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- `Version`: `2021-07-28`

**Body Configuration:**
- **Body content type:** `application/json` (dropdown shows: `json`)
- **Body input method:** `JSON string` (dropdown shows: `jsonString`)
- **Parse response:** `Yes` (enabled)
- **Stop on HTTP error:** `Yes` (enabled)
- **Allow redirects:** `Yes` (enabled)
- **Share cookies:** `No` (disabled)
- **Request compressed content:** `Yes` (enabled)

### Current Working JSON Body (EXACT COPY)

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

**Note:** This is the MINIMAL working configuration. It creates parent records successfully but only includes 4 fields. Additional fields can be added incrementally.

---

## Current Module 12 (Child Record) - WORKING CONFIGURATION

### HTTP Request Settings

**Module ID:** 12  
**Module Type:** `http:MakeRequest`  
**URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`  
**Method:** `POST`  
**Authentication Type:** `No authentication`

**Headers:**
- `Authorization`: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- `Version`: `2021-07-28`

**Body Configuration:**
- **Body content type:** `application/json` (dropdown shows: `json`)
- **Body input method:** `JSON string` (dropdown shows: `jsonString`)
- **Parse response:** `Yes` (enabled)
- **Stop on HTTP error:** `Yes` (enabled)
- **Allow redirects:** `Yes` (enabled)
- **Share cookies:** `No` (disabled)
- **Request compressed content:** `Yes` (enabled)

### Current Working JSON Body (EXACT COPY)

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

**Note:** This creates child records successfully but is missing many fields from the complete JSON document.

---

## Current Route 2 Flow Structure

```
Module 1: Custom Webhook (Hook ID: 2303330)
  ↓
Module 2: Router
  ├─ Route 1: Single Property (lotType ≠ "Multiple")
  │   └─ Module 21: Code Module (transform data)
  │   └─ Module 14: HTTP - Create Record
  │   └─ Module 15: HTTP - Get Record
  │
  └─ Route 2: Project (lotType = "Multiple")
      ├─ Module 6: Set Variable (incoming_data) ← Stores formData
      ├─ Module 9: HTTP - Create Parent Record ← CURRENT MINIMAL JSON
      ├─ Module 10: Set Variable (parent_record_id) ← Captures {{9.data.record.id}}
      ├─ Module 13: Set Variable ("lots_array) ← Stores {{1.formData.lots}} (NOTE: Name has quote mark)
      ├─ Module 11: Iterator (BasicFeeder) ← Iterates {{1.formData.lots}}
      └─ Module 12: HTTP - Create Child Record ← CURRENT MINIMAL JSON
```

---

## What's Currently Working

✅ **Module 9 creates parent records successfully** with these 4 fields:
- `property_address` (from project address)
- `is_parent_record`: "Yes"
- `project_identifier` (auto-generated: PROJ-YYYYMMDD-HHmmss)
- `folder_link`

✅ **Module 12 creates child records successfully** with these 16 fields:
- `property_address`
- `lot_number`
- `project_parent_id`
- `is_parent_record`: "No"
- `build_size`
- `land_registration`
- `land_size`
- `build_size_primary`
- `build_size_secondary`
- `land_price`
- `build_price`
- `total_price`
- `cashback_rebate_value`
- `cashback_rebate_type`
- `rent_appraisal_primary_from`
- `rent_appraisal_primary_to`
- `rent_appraisal_secondary_from`
- `rent_appraisal_secondary_to`

✅ **Module 10 captures parent record ID** correctly: `{{9.data.record.id}}`

✅ **Module 11 Iterator processes lots array** correctly

✅ **Multiple child records are created** (one per lot)

---

## Known Issues / Missing Fields

⚠️ **Module 9 (Parent Record) - Missing Fields:**
- Missing all address fields (street_number, street_name, suburb_name, state, post_code, lga, unit__lot, google_map)
- Missing sourcer/packager (with email extraction)
- Missing deal_type and status
- Missing all risk overlay fields (zoning, flood, bushfire, mining, etc.)
- Missing property description fields (title, body_corp, etc.)
- Missing purchase price fields (asking, asking_text, acceptable_acquisition__from/to, etc.)
- Missing market performance fields (median_price_change, median_yield, etc.)
- Missing content sections (why_this_property, proximity, investment_highlights)
- Missing agent info (agent_name, agent_mobile, agent_email)
- Missing message_for_ba and attachments_additional_dialogue
- Missing lot number prefix in property_address (should be "Lot [NUMBER], [ADDRESS]")
- Missing project_identifier capture in Module 13 (Module 13 currently stores lots_array, not project_identifier)

⚠️ **Module 12 (Child Record) - Missing Fields:**
- Missing lot number prefix in property_address (should be "Lot [NUMBER], [ADDRESS]")
- Missing project_identifier (should reference Module 9's response or Module 13)
- Missing all primary/secondary property description fields (beds, bath, garage, carport, carspace)
- Missing year_built
- Missing title, body_corp fields
- Missing does_this_property_have_2_dwellings
- Missing acceptable_acquisition__from/to
- Missing occupancy fields (occupancy_primary, occupancy_secondary)
- Missing current rent fields (current_rent_primary__per_week, current_rent_secondary__per_week)
- Missing expiry fields (expiry_primary, expiry_secondary)
- Missing rent_appraisal_primary (single field, not just from/to)
- Missing rent_appraisal_secondary (single field, not just from/to)
- Missing yield and appraised_yield
- Missing rent dialogue fields

⚠️ **Module 13 - Incorrect Configuration:**
- Currently named: `"lots_array"` (with quote mark - likely typo)
- Currently stores: `{{1.formData.lots}}` (lots array)
- Should be named: `project_identifier`
- Should store: `{{9.data.record.properties.project_identifier}}` (from Module 9 response)

---

## Important Notes

1. **Current Approach:** Direct JSON in HTTP module body field (not using Code module)
2. **Field Type Handling:** Not explicitly handled (may work if GHL accepts current format, or may need fixing)
3. **Integer Fields:** Currently sent as strings (in quotes `"{{...}}"`) - may need verification
4. **Float Fields:** Not present in current minimal JSON (market performance fields missing)
5. **`asking` Field Mapping:** Not present in current minimal JSON (needs value mapping: "On-market" → "on-market", etc.)

---

## Next Steps (Incremental Approach)

**RECOMMENDED:** Add fields incrementally to existing JSON rather than replacing with Code module.

### Step 1: Fix Module 13
- Change variable name from `"lots_array"` to `project_identifier`
- Change value from `{{1.formData.lots}}` to `{{9.data.record.properties.project_identifier}}`

### Step 2: Add Missing Address Fields to Module 9
- Add street_number, street_name, suburb_name, state, post_code, lga, unit__lot, google_map
- Add lot number prefix to property_address

### Step 3: Add Missing Project Fields to Module 9
- Add sourcer/packager (with email extraction using replace function)
- Add deal_type, status
- Add risk overlay fields
- Add property description fields
- Add purchase price fields (including asking field mapping)
- Add market performance fields
- Add content sections
- Add agent info
- Add message_for_ba and attachments fields

### Step 4: Fix Module 12 property_address
- Add lot number prefix: `"Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}"`

### Step 5: Add Missing Child Fields to Module 12
- Add project_identifier from Module 13
- Add all missing property description fields
- Add all missing purchase price fields
- Add all missing rental assessment fields

---

## Rollback Instructions

If changes break the working configuration:

1. **Revert Module 9 JSON Body** to the exact JSON above (4 fields only)
2. **Revert Module 12 JSON Body** to the exact JSON above (17 fields only)
3. **Verify Module 9 Settings** match the configuration above
4. **Verify Module 12 Settings** match the configuration above
5. **Test** that parent and child records are created successfully

---

## Blueprint Location

The complete blueprint JSON has been saved separately. See blueprint export for full scenario structure.

**Scenario Name:** "Form App Property Submission"  
**Webhook Hook ID:** 2303330  
**Zone:** eu1.make.com

---

**Last Updated:** January 10, 2026  
**Baseline Status:** ✅ WORKING - DO NOT MODIFY WITHOUT DOCUMENTING CHANGES
