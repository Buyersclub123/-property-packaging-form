# Route 2 Implementation - Handover Document

**Date:** January 11, 2026  
**Status:** Route 2 Module 22 Code Complete - Architecture Change Required

---

## 🎯 Current Status

### Route 1 (Single Property)
- ✅ **Status:** Working and production-ready
- ✅ **Last Successful Test:** January 10, 2026, 10:22 AM
- ✅ **Record ID:** 69622858402d07d34f0877a4
- ✅ **Module 21:** All 80+ fields mapped correctly
- ✅ **Numeric Field Handling:** Resolved (integers as strings, floats as numbers)

### Route 2 (Project/Multiple Lots)
- ⚠️ **Status:** Code complete, architecture change required
- ✅ **Module 22 Code:** Complete with all fields mapped
- ⚠️ **Module 9:** Needs to be removed/disabled (parent record creation)
- ⏳ **Testing:** Pending (waiting for architecture change)

---

## 🔄 Architecture Decision: Remove Parent Record

### What Changed
**Previous Approach:**
- Module 9: Create parent record with shared project data
- Module 12: Create child records (one per lot) linked to parent

**New Approach:**
- Remove Module 9 entirely (no parent record)
- All lots become child records with `is_parent_record: "No"`
- All children receive all shared project values (via Module 22)

### Rationale
- Parent record was being created with empty `lot_number` (not useful)
- All data needed is now included in each child record
- Simpler architecture: all records are equal children, linked by `project_identifier`

---

## ✅ What's Complete

### Module 22 Code Module
**File:** `ROUTE-2-MODULE-22-COMPLETE-CODE.js`

**Status:** Complete - All fields mapped

**Fields Included:**
- ✅ Address fields (including `project_address` as separate field)
- ✅ Project linking fields (`project_identifier`, `is_parent_record: "No"`)
- ✅ Shared fields: `property_type`, `sourcer`, `packager`, `deal_type`, `status`, `folder_link`, `project_name`, `project_brief`
- ✅ All Risk Overlays (zoning, flood, bushfire, mining, etc. + dialogues)
- ✅ All Market Performance fields (9 fields, using `toFloat()`)
- ✅ Content Sections (`why_this_property`, `proximity`, `investment_highlights`)
- ✅ Property Description fields (lot-specific)
- ✅ Purchase Price fields (including `net_price` calculation, `asking` mapping, `price_group`)
- ✅ Rental Assessment fields (lot-specific)
- ✅ Agent Info (`agent_name`, `agent_email`, `agent_mobile`)
- ✅ Additional fields (`message_for_ba`, `attachments_additional_dialogue`)

**Helper Functions:**
- `nullIfEmpty()` - Converts empty values to `null`
- `toFloat()` - Converts market performance values to numbers (returns `0` for empty)
- `mapAskingValue()` - Maps form values to GHL values ("On-market" → "on-market", etc.)
- `mapSingleDualOccupancy()` - Maps "Yes"/"No" to "dual_occupancy"/"single_occupancy"
- `requiredString()` - Ensures `property_address` is never empty (defaults to "No Address Provided")

---

## ⚠️ What Needs to Be Done

### Immediate Actions Required

#### 1. Remove/Disable Module 9
**Action:** Disable or remove Module 9 (HTTP - Create Parent Record) from Route 2 flow

**Current Flow:**
```
Module 6 (Set Variable) 
→ Module 9 (HTTP - Create Parent Record) ← REMOVE THIS
→ Module 10 (Set Variable - parent_record_id) ← REMOVE/UPDATE
→ Module 11 (Iterator - lots array)
→ Module 22 (Code - Transform data)
→ Module 12 (HTTP - Create Child Record)
```

**New Flow:**
```
Module 6 (Set Variable)
→ Module 13 (Set Variable - project_identifier) ← Generate identifier here
→ Module 11 (Iterator - lots array)
→ Module 22 (Code - Transform data)
→ Module 12 (HTTP - Create Child Record)
```

**Notes:**
- Module 10 (`parent_record_id`) is no longer needed
- Module 13 (`project_identifier`) should generate identifier before Iterator
- All records created by Module 12 are children (no parent)

#### 2. Update Module 13 (project_identifier)
**Action:** Ensure Module 13 generates `project_identifier` before Iterator (Module 11)

**Format:** `PROJ-YYYYMMDD-HHmmss` (e.g., `PROJ-20260111-143022`)

**Current:** Should already be working, but verify it runs before Module 11

#### 3. Verify Module 22 Input Mapping
**Action:** Ensure Module 22 receives:
- `lot_data` or `lotData` - From Iterator (Module 11 output)
- `shared_data` or `shared_Data` or `sharedData` - From Module 6 (`incoming_data.formData`)
- `project_identifier` - From Module 13

**Current Code Handles:**
- Multiple input variable name patterns (case-insensitive)
- Multiple paths to find shared data
- Clear error messages if inputs missing

#### 4. Verify Module 12 Configuration
**Action:** Ensure Module 12 uses Module 22 output

**Configuration:**
- Body type: `json`
- Body input method: `jsonString`
- Body content: `{{22.result}}`

---

## 📋 Testing Checklist

### Before Testing
- [ ] Module 9 is disabled/removed
- [ ] Module 10 is removed or disconnected
- [ ] Module 13 generates `project_identifier` before Module 11
- [ ] Module 22 inputs are correctly mapped
- [ ] Module 12 uses `{{22.result}}` as body content

### Test Scenario
1. Submit form with multiple lots (Route 2)
2. Verify no parent record is created
3. Verify all child records are created (one per lot)
4. Verify all child records have:
   - `is_parent_record: "No"`
   - Same `project_identifier` (all children linked)
   - All shared fields populated (address, risk overlays, market performance, etc.)
   - Lot-specific fields populated (property description, purchase price, rental assessment)
   - `property_address` format: "Lot {lotNumber}, {projectAddress}"

### Fields to Verify
- [ ] `body_corp__per_quarter` - Test with "Owner Corp (community)" selected
- [ ] `body_corp_description` - Test with "Owner Corp (community)" selected
- [ ] All market performance fields (should be numbers, not strings)
- [ ] `net_price` calculation (only when `cashbackRebateType === 'cashback'`)
- [ ] `asking` field mapping (form → GHL values)
- [ ] `single_or_dual_occupancy` mapping ("Yes"/"No" → "dual_occupancy"/"single_occupancy")

---

## 🐛 Known Issues

### Form Bug (Not Make.com Issue)
**Issue:** When "Owner Corp (community)" is selected in Title dropdown, Body Corp $ (per quarter) and Body Corp Description fields don't show/drop down.

**Status:** Documented in `ROUTE-2-MODULE-22-MISSING-FIELDS-TODO.md`
**Action Required:** Fix in form code (not Make.com)
**Location:** `form-app/src/components/steps/Step2PropertyDetails.tsx`
**Impact:** Fields don't appear when "Owner Corp (community)" is selected, so data cannot be entered in form

### Form Field Changes
**Field Rename (Completed):**
- ✅ `projectOverview` → `projectBrief` (renamed in form and Make.com code)
- Form TypeScript interface: Uses `projectBrief` (see `form-app/src/types/form.ts`)
- Form component: Uses `projectBrief` (see `form-app/src/components/steps/Step2PropertyDetails.tsx`)
- Module 22 code: Uses `project_brief` mapping from `shared_data.propertyDescription?.projectBrief`

**Status:** Form and code already use correct field name (`projectBrief` / `project_brief`)

### GHL Field Names
**Fields Removed from GHL (Do NOT Send):**
- ❌ `build_size_secondary` - Deleted from GHL (use `build_size` instead)
- ❌ `build_size_primary` - Deleted from GHL (use `build_size` instead)
- ❌ `project_overview` - Deleted from GHL (use `project_brief` instead)
- ❌ `rent_dialogue_primary` - Deleted from GHL (use `rental_assessment_additional_dialogue` instead)
- ❌ `rent_dialogue_secondary` - Deleted from GHL (use `rental_assessment_additional_dialogue` instead)

**Status:** Module 22 code uses correct field names (does NOT send deleted fields)

---

## 📁 Key Files

### Code Files
- **`ROUTE-2-MODULE-22-COMPLETE-CODE.js`** - Complete Module 22 code (ready to paste into Make.com)
- **`MODULE-21-COMPLETE-CODE-ALL-FIELDS.md`** - Route 1 code module (reference for patterns)

### Documentation
- **`ROUTE-2-MODULE-22-MISSING-FIELDS-TODO.md`** - Field mapping checklist (✅ all fields completed)
- **`HANDOVER-2026-01-10-SESSION-END.md`** - Route 1 status and numeric field handling
- **`HANDOVER-2026-01-11-ROUTE-2-SESSION-END.md`** - This document (Route 2 status)

### Form Files (Reference)
- **`form-app/src/types/form.ts`** - TypeScript interfaces (uses `projectBrief`, not `projectOverview`)
- **`form-app/src/components/steps/Step2PropertyDetails.tsx`** - Form component (uses `projectBrief`)

---

## 🔧 Technical Details

### Field Data Types

**Strings (using `nullIfEmpty()`):**
- All address fields
- All text fields
- All dialogue fields
- Purchase price fields (except market performance)

**Numbers (using `toFloat()`):**
- `median_price_change__3_months`
- `median_price_change__1_year`
- `median_price_change__3_year`
- `median_price_change__5_year`
- `median_yield`
- `median_rent_change__1_year`
- `rental_population`
- `vacancy_rate`

**Special Mappings:**
- `asking` - Uses `mapAskingValue()` ("On-market" → "on-market", etc.)
- `single_or_dual_occupancy` - Uses `mapSingleDualOccupancy()` ("Yes" → "dual_occupancy", "No" → "single_occupancy")

**Calculated Fields:**
- `net_price` - Calculated only if `cashbackRebateType === 'cashback'` (totalPrice - cashbackRebateValue)

### Input Variable Patterns

Module 22 code handles multiple input variable name patterns for robustness:
- `lot_data` / `lotData`
- `shared_data` / `shared_Data` / `sharedData` / `fd`
- `project_identifier` / `projectIdentifier`

Also tries multiple paths to find shared data:
- `input.shared_data`
- `input.incoming_data.formData`
- `input.Data.formData`
- `input.data.formData`

---

## 🎯 Next Session Focus

1. **Remove Module 9** from Route 2 flow
2. **Update Module 13** to generate `project_identifier` before Iterator
3. **Test Route 2** with multiple lots
4. **Verify all fields** are populated correctly in child records
5. **Test body corp fields** with "Owner Corp (community)" selected (after form bug is fixed)

---

## 📝 Notes

- Route 1 is fully working and can be used as reference
- Module 22 code follows the same patterns as Module 21 (Route 1)
- All shared project data is now included in each child record (no parent needed)
- Architecture is simpler: all records are children, linked by `project_identifier`

---

**End of Handover Document**
