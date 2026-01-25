# Handover Document - January 10, 2026 Session End

**Date:** January 10, 2026  
**Session Focus:** Route 1 completion, Route 2 implementation planning, numeric field type resolution  
**Status:** Route 1 ✅ WORKING | Route 2 🔄 IN PROGRESS

---

## 🎯 Executive Summary

**What Works:**
- ✅ Route 1 (Single Property) is fully functional and creating records in GHL successfully
- ✅ All 80+ form fields are mapped and working
- ✅ Numeric field type handling is resolved (integers as strings, floats as numbers)
- ✅ `asking` field value mapping is working
- ✅ Multi-line text fields are preserved correctly

**What Needs Work:**
- 🔄 Route 2 (Project) - Parent/Child record structure needs completion
- 🔄 Module 9 needs `is_parent_record: "Yes"` field explicitly set
- 🔄 Lot number prefixing in addresses for both parent and child records
- 🔄 Module 12 child record JSON needs to be updated with lot number prefix

**Critical Discovery (January 10, 2026):**
- Integer fields (prices, rents) must be sent as **strings** (not numbers) to GHL API
- Float fields (market performance) must be sent as **numbers** (not strings)
- This was discovered through extensive testing and documented in `MODULE-14-FIX-ATTEMPTS-TRACKER.md`

---

## ✅ Route 1 (Single Property) - COMPLETE & WORKING

### Current Configuration

**Module Flow:**
```
Module 1: Webhook (receives form data)
  ↓
Module 21: Code Module (transforms data for GHL)
  ↓
Module 14: HTTP - Create Record (sends to GHL)
```

### Module 21 - Complete Working Code

**File:** `MODULE-21-COMPLETE-CODE-ALL-FIELDS.md`

**Key Configuration:**
- **Input Variable:** `fd` mapped to `{{1.formData}}`
- **Return Type:** Object (`return payload;` - NOT stringified)
- **Integer Fields:** Use `nullIfEmpty()` → sends as strings
- **Float Fields:** Use `toFloat()` → sends as numbers
- **Text Fields:** Use `nullIfEmpty()` → sends as strings or null
- **`asking` Field:** Use `mapAskingValue()` → maps form values to GHL values

### Module 14 - HTTP Configuration

**Body content type:** `json`  
**Body input method:** `jsonString`  
**Body content:** `{{21.result}}`

### Working Field Type Handling

**Integer Fields (Send as Strings):**
- `acceptable_acquisition__from`
- `acceptable_acquisition__to`
- `land_price`
- `build_price`
- `total_price`
- `cashback_rebate_value`
- `current_rent_primary__per_week`
- `current_rent_secondary__per_week`
- `rent_appraisal_primary_from`
- `rent_appraisal_primary_to`
- `rent_appraisal_secondary_from`
- `rent_appraisal_secondary_to`

**Float Fields (Send as Numbers):**
- `median_price_change__3_months`
- `median_price_change__1_year`
- `median_price_change__3_year`
- `median_price_change__5_year`
- `median_yield`
- `median_rent_change__1_year`
- `rental_population`
- `vacancy_rate`

### `asking` Field Value Mapping

**Form Values → GHL Values:**
- "On-market" → "on-market"
- "Off-market" → "off-market"
- "Pre-launch" → "pre-launch opportunity"
- "Coming Soon" → "coming soon"
- "TBC" → null
- "N/A" → null

**Code Location:** `mapAskingValue()` function in Module 21

**⚠️ VERIFICATION NEEDED:** 
- Current mapping uses dash format: "pre-launch opportunity"
- GHL successful response showed underscore format: "prelaunch_opportunity"
- **Action Required:** Verify which format GHL actually stores/accepts long-term
- **Reference File:** `GHL-FIELD-VALUE-MAPPINGS.md` (lines 8-11 show both formats are accepted)

### Test Results

**Last Successful Test:**
- **Date:** January 10, 2026, 10:22 AM
- **Record ID:** `69622858402d07d34f0877a4`
- **Status:** 200 - Success
- **All fields working:** Integer fields as strings, float fields as numbers, multi-line fields present

---

## 🔄 Route 2 (Project) - IN PROGRESS

### Current Status

**What's Working:**
- ✅ Route 2 flow structure exists (Router → Set Variable → HTTP Create Parent → Iterator → HTTP Create Child)
- ✅ Multiple child records were successfully created in previous tests (Route 2 has already worked in the sense of creating multiple records)
- ✅ Iterator module (Module 11) is processing lots array correctly
- ✅ Module 10 successfully captures parent_record_id from Module 9
- ✅ Module 13 successfully captures project_identifier from Module 9

**What Needs Completion:**
- ⚠️ **IMMEDIATE ISSUE:** Module 9 needs `is_parent_record: "Yes"` field explicitly set
  - **Status:** Field is documented in `ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md` (line 83)
  - **Status:** Field is in Code module approach (`ROUTE-2-MODULE-9-CODE-MODULE.md` line 131)
  - **Action Required:** Verify it's actually in Make.com Module 9 configuration (user reported not seeing it)
  - **Critical:** Without this field, GHL won't recognize the record as a parent record
- ⚠️ Module 9 parent address needs lot number prefix: `"Lot [FIRST_LOT_NUMBER], [ADDRESS]"`
- ⚠️ Module 12 child addresses need lot number prefix: `"Lot [LOT_NUMBER], [ADDRESS]"`
- ⚠️ Module 9 JSON needs to include all parent record fields (currently has most, but needs verification)
- ⚠️ Module 12 JSON needs to include all child record fields

### Immediate Issue (Last Discussion Before Handover)

**Issue:** Module 9's `is_parent_record` field may not be configured in Make.com
- User reported: "I dont see the code in moduile 9 telling GHL that it is the parent record"
- The field exists in documentation files but needs verification in actual Make.com scenario
- Both JSON approach and Code module approach include this field, but it must be verified in Make.com

**Action Required:**
1. Check Make.com Module 9 configuration
2. Verify if using Code module approach or direct JSON approach
3. If direct JSON: Ensure `"is_parent_record": "Yes"` is in the body JSON
4. If Code module: Ensure Code module includes `is_parent_record: "Yes"` in payload
5. Test that parent record is created with this field set correctly

### Route 2 Module Flow

```
Module 1: Webhook (receives form data)
  ↓
Module 2: Router (Route 2: Project) ← Selects Route 2 if lots array exists
  ↓
Module 6: Set Variable (incoming_data) ← Stores formData
  ↓
[OPTIONAL] Code Module (transform parent data) ← RECOMMENDED (see ROUTE-2-MODULE-9-CODE-MODULE.md)
  - Purpose: Handle lot number prefixing and asking field mapping
  - If NOT using Code module, Module 9 must build JSON directly
  ↓
Module 9: HTTP - Create Parent Record
  - Must include: `is_parent_record: "Yes"` ← CRITICAL FIELD
  - Must include: `property_address: "Lot [FIRST_LOT], [ADDRESS]"` ← WITH LOT PREFIX
  - Returns: parent record ID and project_identifier
  ↓
Module 10: Set Variable (parent_record_id) ← Captures parent record ID from Module 9 response
  ↓
Module 13: Set Variable (project_identifier) ← Captures project_identifier from Module 9 response
  ↓
Module 11: Iterator (lots) ← Iterates over formData.lots array
  - Output: Each lot's data as separate bundle (accessed via {{11...}})
  ↓
Module 12: HTTP - Create Child Record (one per lot, executed for each Iterator bundle)
  - Must include: `is_parent_record: "No"`
  - Must include: `property_address: "Lot [LOT_NUMBER], [ADDRESS]"` ← WITH LOT PREFIX
  - Must include: `project_parent_id: "{{10.parent_record_id}}"`
  - Must include: `project_identifier: "{{13.project_identifier}}"`
```

### Module 9 - Parent Record Requirements

**File:** `ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md`

**⚠️ CRITICAL: These fields MUST be explicitly set in Module 9 configuration**

**Critical Fields:**
- ✅ `is_parent_record: "Yes"` - **MUST BE EXPLICITLY SET** (user reported not seeing this)
- ✅ `project_identifier: "PROJ-[TIMESTAMP]"` - Auto-generated (can use `formatDate(now; "YYYYMMDD-HHmmss")` in JSON or JavaScript in Code module)
- ✅ `lot_number: null` - Not applicable to parent (explicitly set to null)
- ✅ `project_parent_id: null` - Parent has no parent (explicitly set to null)
- ✅ `property_address: "Lot [FIRST_LOT_NUMBER], [PROJECT_ADDRESS]"` - **MUST INCLUDE LOT NUMBER PREFIX**

**Address Format for Parent (Direct JSON Approach):**
```
"property_address": "Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}"
```

**Address Format for Parent (Code Module Approach):**
```javascript
const firstLotNumber = formData.lots && formData.lots.length > 0 ? formData.lots[0].lotNumber : null;
const baseAddress = formData.address?.projectAddress || formData.address?.propertyAddress;
const parentAddress = firstLotNumber 
  ? `Lot ${firstLotNumber}, ${baseAddress || "No Address Provided"}`
  : requiredString(baseAddress);
```

**Recommended Approach:**
- **Option A (Recommended):** Use Code module before Module 9 (see `ROUTE-2-MODULE-9-CODE-MODULE.md`)
  - Code module handles lot number prefixing and `asking` field mapping cleanly
  - Module 9 then uses: `{{[CODE_MODULE].result}}` as body content
  - Body content type: `json`, Body input method: `jsonString`
  
- **Option B (Alternative):** Build JSON directly in Module 9 body field
  - Use complete JSON from `ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md`
  - More complex due to nested `if()` statements for `asking` field mapping
  - Harder to maintain with 80+ fields

**⚠️ Action Required: Verify `is_parent_record: "Yes"` is actually in Make.com Module 9**

### Module 12 - Child Record Requirements

**File:** `ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md`

**Critical Fields:**
- ✅ `is_parent_record: "No"` - **MUST BE EXPLICITLY SET**
- ✅ `lot_number: "{{11.lotNumber}}"` - From Iterator output
- ✅ `project_parent_id: "{{10.parent_record_id}}"` - From Module 10 (links to parent)
- ✅ `project_identifier: "{{13.project_identifier}}"` - From Module 13 (must match parent)
- ✅ `property_address: "Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}"` - **MUST INCLUDE LOT NUMBER PREFIX**

**Address Format for Child:**
```
"Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}"
```

**Field Sources:**
- Lot-specific fields come from `{{11...}}` (Iterator output from Module 11)
- Shared fields come from `{{6.incoming_data.formData...}}` (Module 6)

**⚠️ Important - Numeric Field Handling (Route 2 Must Match Route 1):**
- **Integer fields (prices, rents) must be sent as strings** (e.g., `"768000"`, `"0"`)
- **Float fields (market performance) must be sent as numbers** (e.g., `3.02`, `15.00`)
- **Module 9 (parent):** Market performance fields are floats (numbers), price fields are integers (strings)
- **Module 12 (child):** Price and rental fields are integers (strings), no market performance fields
- **If using Code module approach:** Use same `nullIfEmpty()` for integers, `toFloat()` for floats as Route 1
- **If using direct JSON:** Integer fields wrapped in quotes `"{{...}}"`, float fields without quotes `{{...}}`

### Lot Number Prefixing Requirement

**Critical Requirement:**
- **Each GHL record (parent AND child) must have its lot number prefixed to the address**
- **Format:** `"Lot [LOT_NUMBER], [BASE_ADDRESS]"` (with space after "Lot", comma separator, space after comma)
- **Example:** `"Lot 17, 123 Main St, Suburb, State 4000"`
- **Parent Record:** Uses first lot number from `formData.lots[0].lotNumber`
- **Child Records:** Each uses its own `lotNumber` from Iterator output (accessed via `{{11.lotNumber}}`)

**Why This Matters:**
- GHL/Deal Sheet entries need to be clearly distinguishable
- Each lot is a separate entry in Deal Sheet
- Address format helps identify which lot each record represents
- **Important:** The folder_link address does NOT include lot number (base address only), but GHL record addresses DO include lot number prefix

**Implementation:**
- Parent: `"Lot {{get(6.incoming_data.formData.lots; 0; lotNumber)}}, {{6.incoming_data.formData.address.projectAddress}}"`
- Child: `"Lot {{11.lotNumber}}, {{6.incoming_data.formData.address.projectAddress}}"`

### Folder Attachment Logic

**Important Note:**
- **Only ONE folder is created** for the entire project (not one per lot)
- **Folder address does NOT include lot number** (it's the project base address without lot prefix)
- **Example:** 
  - Project address: "123 Main St, Suburb, State 4000"
  - Folder created for: "123 Main St, Suburb, State 4000" ✅
  - Folder NOT created for: "Lot 1, 123 Main St, Suburb, State 4000" ❌
- **All records (parent + children) share the same `folder_link`**
- **Folder is created BEFORE Route 2 processing** (in form app's Step6FolderCreation.tsx before submission to Make.com)
- **The `folder_link` field in form submission contains the base address (no lot number)**
- **All GHL records reference this same folder, even though their addresses include lot number prefixes**

---

## 🔧 Technical Details - Numeric Field Type Resolution

### The Problem (January 10, 2026)

**Issue:**
- GHL API was rejecting numeric fields with error: `"Invalid field value '1950000' for 'acceptable_acquisition__from'"`
- Make.com was converting numbers to strings when sending HTTP requests
- Even when Module 21 output showed correct numbers, GHL received strings

**Discovery Process:**
- Documented in `MODULE-14-FIX-ATTEMPTS-TRACKER.md`
- Multiple attempts with different configurations
- Key finding: Having `asking` field in payload affected number handling behavior

### The Solution

**Final Working Configuration:**
1. **Module 21:** Returns object (`return payload;`) - NOT stringified
2. **Module 14:** Body content type "json", Body input method "jsonString", Body content `{{21.result}}`
3. **Integer fields:** Use `nullIfEmpty()` → sends as strings
4. **Float fields:** Use `toFloat()` → sends as numbers
5. **`asking` field:** Must be present in payload (affects number handling)

**Why This Works:**
- Make.com's `http:MakeRequest` module, when configured with `contentType: "json"` and `inputMethod: "jsonString"`, handles objects correctly when `asking` field is present
- GHL accepts integer fields as strings (e.g., `"768000"`)
- GHL requires float fields as numbers (e.g., `3.02`)
- This combination successfully creates records in GHL

### Form App Changes

**File:** `form-app/src/components/steps/Step6FolderCreation.tsx`

**Change Made:**
- Modified `convertEmptyStringsToNull()` function
- Empty/null numeric fields now return `'0'` (string) instead of `null`
- This ensures numeric fields always have a value (even if empty, they're `"0"`)

**Code:**
```javascript
if (isNumericField && (value === null || value === undefined || value === '')) {
  result[key] = '0'; // Return as string "0" - Module 21's nullIfEmpty() handles it
}
```

---

## ⚠️ CRITICAL: Dropdown Value Mapping Verification Required

**Status:** 🔴 **HIGH PRIORITY - Must verify ALL dropdown values match GHL expectations**

### Why This Matters
- Form dropdown values must exactly match GHL's expected values for each field
- Mismatched values will cause GHL API to reject records with validation errors
- We already fixed `asking` field mapping, but other dropdowns may have the same issue

### Dropdown Fields That Need Verification

**High Priority (May Cause Errors):**

1. **`asking`** (Purchase Price → Asking)
   - **Current Mapping:** ✅ Working with `mapAskingValue()` function
   - **Form Values:** "On-market", "Off-market", "Pre-launch", "Coming Soon", "TBC", "N/A"
   - **GHL Values:** "on-market", "off-market", "pre-launch opportunity", "coming soon", null
   - **⚠️ Verification Needed:** Confirm dash format ("pre-launch opportunity") vs underscore format ("prelaunch_opportunity")
   - **Status:** Working, but format needs confirmation

2. **`occupancy`** / **`occupancy_primary`** / **`occupancy_secondary`** (Rental Assessment)
   - **Form Values:** "Owner Occupied", "Tenanted", "Vacant"
   - **GHL Expected:** ⚠️ **NOT VERIFIED** - Check GHL field configuration
   - **Status:** ❌ **NEEDS VERIFICATION**
   - **Action:** Test or check GHL field allowed values
   - **Reference:** `FORM-VALUE-MAPPING-CHANGES.md` lines 68-78

3. **`cashback_rebate_type`** (Purchase Price → Cashback Rebate Type)
   - **Form Values:** "Cashback", "Rebate on Land", "Rebate on Build"
   - **GHL Expected:** ⚠️ **NOT VERIFIED** - Check GHL field configuration
   - **Status:** ❌ **NEEDS VERIFICATION**
   - **Action:** Test or check GHL field allowed values
   - **Reference:** `FORM-VALUE-MAPPING-CHANGES.md` lines 82-92

4. **`does_this_property_have_2_dwellings`** / **`singleOrDual`** (Property Description)
   - **Form Values:** "Yes", "No" (likely)
   - **GHL Expected:** ⚠️ **NOT VERIFIED** - Check GHL field configuration
   - **Status:** ❌ **NEEDS VERIFICATION**
   - **Action:** Test or check GHL field allowed values

5. **Yes/No Overlay Fields** (Risk Overlays)
   - **Fields:** `flood`, `bushfire`, `mining`, `other_overlay`, `special_infrastructure`
   - **Form Values:** "Yes", "No"
   - **GHL Expected:** ⚠️ **NOT VERIFIED** - Check GHL field configuration
   - **Status:** ❌ **NEEDS VERIFICATION**
   - **Action:** Test or check GHL field allowed values

**Medium Priority (Likely Correct, but Should Verify):**

6. **`deal_type`** / **`contractType`** (Decision Tree)
   - **Form Values:** "01 H&L Comms", "02 Single Comms", "03 Internal with Comms", "04 Internal No-Comms", "05 Established"
   - **GHL Expected:** ✅ **REPORTED CORRECT** - Same values (confirmed in docs)
   - **Status:** ✅ **REPORTED AS WORKING**
   - **Action:** ✅ No action needed (but verify if errors occur)

7. **`status`** (Decision Tree)
   - **Form Values:** "01 Available", "02 EOI", "03 Contr' Exchanged"
   - **GHL Expected:** ✅ **REPORTED CORRECT** - Same values (confirmed in docs: "01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost")
   - **Status:** ✅ **REPORTED AS WORKING**
   - **Action:** ✅ No action needed (but verify if errors occur)

### How to Verify Dropdown Values

**Option 1: Check GHL Field Configuration (Recommended)**
- Log into GHL
- Navigate to Custom Objects → Property Reviews
- Check each dropdown field's allowed values
- Compare with form dropdown values
- Document any mismatches

**Option 2: Test with API Calls**
- Submit form with each dropdown value
- Check if GHL accepts or rejects
- Look for validation errors in Make.com logs
- Document which values work/fail

**Option 3: Check Existing Successful Records**
- Query GHL for existing Property Review records
- Check what values are stored in dropdown fields
- Compare with form values

### Action Items for Next Session

1. **Create Dropdown Value Verification Checklist**
   - List all dropdown fields
   - For each field, document:
     - Form value options
     - GHL expected values (if known)
     - Verification status (✅ Verified / ❌ Needs Verification / ⚠️ Needs Testing)
     - Mapping function needed (if any)

2. **Test Each Dropdown Field**
   - Submit test records with each dropdown option
   - Document which values work/fail
   - Create mapping functions for mismatched values (similar to `mapAskingValue()`)

3. **Update Code Modules**
   - If mappings needed, add mapping functions to Module 21 (Route 1) and Route 2 Code module
   - Ensure all dropdown values are properly mapped before sending to GHL

4. **Document Verified Values**
   - Update `GHL-FIELD-VALUE-MAPPINGS.md` with verified values
   - Update `FORM-VALUE-MAPPING-CHANGES.md` with any needed changes

### Reference Files

- **`GHL-FIELD-VALUE-MAPPINGS.md`** - Documents `asking` field mapping requirements
- **`FORM-VALUE-MAPPING-CHANGES.md`** - Lists dropdown fields needing verification
- **`MODULE-21-COMPLETE-CODE-ALL-FIELDS.md`** - Contains `mapAskingValue()` function example

---

## 📋 TODO List (Current Priorities)

### High Priority

1. **✅ COMPLETE:** Route 1 numeric field type handling - Integer fields as strings, float fields as numbers
2. **✅ COMPLETE:** Route 1 `asking` field value mapping - Form values → GHL values
3. **🔄 IN PROGRESS:** Route 2 Module 9 - Verify `is_parent_record: "Yes"` is explicitly set
4. **🔄 IN PROGRESS:** Route 2 Module 9 - Implement lot number prefix in parent address
5. **🔄 IN PROGRESS:** Route 2 Module 12 - Implement lot number prefix in child addresses
6. **⏳ PENDING:** Route 2 - Add Code module before Module 9 (recommended approach)
7. **⏳ PENDING:** Route 2 - Test parent record creation with all fields
8. **⏳ PENDING:** Route 2 - Test child record creation with lot-specific fields

### Medium Priority

9. **⏳ PENDING:** ⚠️ **CRITICAL - Dropdown Value Mapping Verification**
   - **All dropdown fields must be verified to ensure form values match GHL expected values**
   - See "Dropdown Value Mapping Verification" section below for complete list
   - **High Priority Fields to Verify:**
     - `asking` - Verify dash vs underscore format (currently using "pre-launch opportunity")
     - `occupancy` / `occupancy_primary` / `occupancy_secondary` - Verify: "Owner Occupied", "Tenanted", "Vacant" accepted?
     - `cashback_rebate_type` - Verify: "Cashback", "Rebate on Land", "Rebate on Build" accepted?
     - `does_this_property_have_2_dwellings` / `singleOrDual` - Verify: "Yes", "No" accepted?
     - `flood`, `bushfire`, `mining`, etc. (Yes/No fields) - Verify: "Yes", "No" accepted?
   - **Already Verified (Reported Correct):**
     - `deal_type` / `contractType` - "01 H&L Comms", "02 Single Comms", etc. ✅
     - `status` - "01 Available", "02 EOI", "03 Contr' Exchanged" ✅
   - **Action:** Test each dropdown field or check GHL field configuration for allowed values
   - **Reference Files:** `GHL-FIELD-VALUE-MAPPINGS.md`, `FORM-VALUE-MAPPING-CHANGES.md`

10. **⏳ PENDING:** Document all field mappings for Route 2 parent vs child records
    - Which fields go in parent only?
    - Which fields go in child only?
    - Which fields are shared?

11. **⏳ PENDING:** Test Route 2 end-to-end with real form submission
    - Submit form with 4 lots
    - Verify 1 parent + 4 child records created
    - Verify all addresses have lot number prefix
    - Verify folder_link is shared across all records

### Low Priority

12. **⏳ PENDING:** Review and optimize Module 9 JSON structure
    - Consider Code module approach instead of manual JSON
    - Ensure all shared project fields are included
    - Verify field mappings match Route 1 patterns

13. **⏳ PENDING:** Review and optimize Module 12 JSON structure
    - Ensure all lot-specific fields are included
    - Verify field mappings from Iterator output
    - Test with various lot data combinations

---

## 📁 Key Files Reference

### Route 1 Files

- **`MODULE-21-COMPLETE-CODE-ALL-FIELDS.md`** - Complete working code for Module 21
- **`MODULE-14-FIX-ATTEMPTS-TRACKER.md`** - Detailed troubleshooting log of numeric field issues
- **`MODULE-14-COMPLETE-JSON-STRING.md`** - Reference JSON structure (not used - Code module approach is better)

### Route 2 Files

- **`ROUTE-2-MODULE-9-CODE-MODULE.md`** - Code module approach for Module 9 (RECOMMENDED)
- **`ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md`** - Complete JSON structures for Module 9 and Module 12
- **`ROUTE-1-CREATE-JSON-IMPLEMENTATION.md`** - Reference for Create JSON approach (not recommended - too tedious)

### Supporting Files

- **`GHL-FIELD-VALUE-MAPPINGS.md`** - Value mapping requirements between form and GHL
- **`FORM-VALUE-MAPPING-CHANGES.md`** - Specific form value mapping changes needed
- **`HANDOVER-2026-01-10-SESSION-END.md`** - This file (current handover)

### Form App Files

- **`form-app/src/components/steps/Step6FolderCreation.tsx`** - Form submission logic with numeric field handling

---

## 🚨 Important Notes for Next Session

### Before Starting Route 2 Work

1. **Verify Module 9 Current State:**
   - Check if Module 9 currently has `is_parent_record` field
   - Check if Module 9 currently uses Code module or direct JSON
   - Check Module 9's body configuration (content type, input method)

2. **Verify Module 12 Current State:**
   - Check Module 12's current JSON structure
   - Check if child addresses include lot number prefix
   - Check Module 12's field mappings from Iterator output

3. **Understand Route 2 Flow:**
   - Review `ROUTE-2-MODULE-9-CODE-MODULE.md` for recommended Code module approach
   - Review `ROUTE-2-MODULE-9-AND-12-COMPLETE-JSON.md` for complete JSON structures
   - Decide: Code module vs direct JSON for Module 9

### Key Decisions Needed

1. **Module 9 Approach:**
   - Option A: Add Code module before Module 9 (cleaner, easier to maintain)
   - Option B: Build JSON directly in Module 9 (matches current pattern, but harder to maintain)

2. **Dropdown Value Mapping Verification (CRITICAL):**
   - **MUST VERIFY:** All dropdown fields match GHL expected values
   - Priority: `occupancy`, `cashback_rebate_type`, `does_this_property_have_2_dwellings`, Yes/No overlay fields
   - Action: Create verification checklist, test each dropdown, create mapping functions as needed
   - See "Dropdown Value Mapping Verification" section above for complete details

3. **Lot Number Prefixing:**
   - Confirm: Should parent use first lot number or project address only?
   - Confirm: Should child addresses always include lot number prefix?
   - Confirm: Format is `"Lot [NUMBER], [ADDRESS]"` (not `"Lot[NUMBER]"`)

### Testing Checklist for Route 2

When Route 2 is ready for testing:

- [ ] Test with form submission containing 4 lots
- [ ] Verify 1 parent record created with `is_parent_record: "Yes"`
- [ ] Verify 4 child records created with `is_parent_record: "No"`
- [ ] Verify parent address includes lot number prefix
- [ ] Verify each child address includes its own lot number prefix
- [ ] Verify all parent fields are populated (shared project data)
- [ ] Verify all child fields are populated (lot-specific data)
- [ ] Verify `project_identifier` matches between parent and children
- [ ] Verify `project_parent_id` in children matches parent record ID
- [ ] Verify `folder_link` is shared across all records
- [ ] Verify folder address does NOT include lot number (base address only)

---

## 💡 Lessons Learned

### Numeric Field Handling

**Key Learning:**
- GHL API accepts integer fields as **strings** (`"768000"`)
- GHL API requires float fields as **numbers** (`3.02`)
- Make.com's `http:MakeRequest` with `jsonString` input method works when:
  - Module 21 returns object (not stringified)
  - `asking` field is present in payload
  - Integer fields use `nullIfEmpty()` (sends as strings)
  - Float fields use `toFloat()` (sends as numbers)

**Why This Matters:**
- Don't try to send integers as numbers - GHL will reject them
- Don't try to send floats as strings - GHL will reject them
- The combination of object return + `jsonString` input + `asking` field presence is critical

### Code Module vs Direct JSON

**Key Learning:**
- Code modules are cleaner and easier to maintain for complex transformations
- Direct JSON in HTTP module body is fine for simple cases
- For 80+ fields with value mappings, Code module approach is recommended

**Route 1:** Uses Code module (Module 21) - ✅ Working well  
**Route 2:** Should use Code module before Module 9 - ⚠️ Not yet implemented

### Folder Attachment Logic

**Key Learning:**
- Only ONE folder is created per project (not per lot)
- Folder address is the base project address (no lot number)
- All records (parent + children) share the same `folder_link`

**Why This Matters:**
- Don't create multiple folders for multiple lots
- Don't prefix lot number to folder address
- Folder is created before Route 2 processing (in form app or earlier)

---

## 📞 Questions for Next Session

1. **Module 9 Current State:**
   - Does Module 9 currently use Code module or direct JSON?
   - What is Module 9's current body configuration?

2. **Route 2 Testing:**
   - Has Route 2 been tested end-to-end recently?
   - What was the last test result?

3. **`asking` Field Format:**
   - Which format does GHL actually store: "pre-launch opportunity" or "prelaunch_opportunity"?
   - Should we update `mapAskingValue()` to use underscore format?

4. **Lot Number Prefixing:**
   - Confirmed: Parent uses first lot number in address?
   - Confirmed: All children use their own lot number in address?

---

**Last Updated:** January 10, 2026, 11:30 PM  
**Next Session Focus:** Complete Route 2 implementation - Module 9 and Module 12 configuration  
**Status:** Ready for Route 2 completion work
