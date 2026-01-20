# Route 2 Migration - Final Steps Checklist

**Date:** January 11, 2026  
**Purpose:** Close out Route 2 migration - Remove parent record, finalize flow

---

## 🎯 Quick Summary

**What Changed:**
- ❌ Remove Module 9 (Create Parent Record) - No longer needed
- ❌ Remove/Update Module 10 (parent_record_id) - No longer needed
- ✅ Keep Module 13 (project_identifier) - Generate before Iterator
- ✅ Keep Module 22 (Code - Transform data) - Already complete
- ✅ Keep Module 12 (HTTP - Create Child Record) - Update to use Module 22 output

**Architecture:**
- Old: Module 9 (parent) → Module 12 (children) 
- New: Module 13 (identifier) → Module 11 (Iterator) → Module 22 (transform) → Module 12 (children only)

---

## ✅ Step-by-Step Actions in Make.com

### Step 1: Disable/Remove Module 9

**Action:** Disable or remove Module 9 (HTTP - Create Parent Record)

**Options:**
1. **Disable (Recommended):** Click Module 9 → Settings → Disable (keeps it for reference)
2. **Delete:** Right-click Module 9 → Delete (permanent)

**Why:** Parent records are no longer created. All records are children linked by `project_identifier`.

---

### Step 2: Remove/Update Module 10

**Action:** Module 10 sets `parent_record_id` which is no longer needed

**Options:**
1. **Disable:** Click Module 10 → Settings → Disable
2. **Delete:** Right-click Module 10 → Delete

**Why:** No parent record exists, so `parent_record_id` is not needed.

**Note:** If Module 22 code references `parent_record_id`, it should already handle it being missing (Module 22 code is complete).

---

### Step 3: Verify Module 13 (project_identifier)

**Action:** Ensure Module 13 generates `project_identifier` BEFORE Module 11 (Iterator)

**Check:**
1. Open Module 13 (Set Variable)
2. **Variable Name:** Should be `project_identifier`
3. **Value:** Should generate format: `PROJ-YYYYMMDD-HHmmss`
   - Example: `PROJ-20260111-143022`
   - In Make.com: `PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}`

**Flow Order:**
```
Module 6 (Set Variable)
  ↓
Module 13 (Set Variable - project_identifier) ← MUST be here
  ↓
Module 11 (Iterator - lots array)
  ↓
Module 22 (Code - Transform data)
  ↓
Module 12 (HTTP - Create Child Record)
```

**If Module 13 is AFTER Module 11:**
- Move Module 13 to BEFORE Module 11
- Disconnect Module 11 from Module 6
- Connect Module 6 → Module 13 → Module 11

---

### Step 4: Verify Module 22 Input Mapping

**Action:** Check that Module 22 receives correct inputs

**Open Module 22 (Code):**

**Required Inputs:**
1. **lot_data** (from Iterator)
   - Map: `{{11}}` or `{{11.lot_data}}` or `{{11.lotData}}`
   - This is the output from Module 11 (Iterator)

2. **shared_data** (from Module 6)
   - Map: `{{6.incoming_data.formData}}` OR `{{6.Data.formData}}`
   - This contains all shared form data

3. **project_identifier** (from Module 13)
   - Map: `{{13.project_identifier}}` OR `{{13.Data.project_identifier}}`
   - This links all child records together

**Note:** Module 22 code is flexible and handles multiple input variable name patterns. Just ensure you map the three inputs above.

**To Verify:**
- Click Module 22 → Check "Input variables" section
- Should see mappings to Module 11, Module 6, and Module 13

---

### Step 5: Verify Module 12 Configuration

**Action:** Ensure Module 12 uses Module 22 output

**Open Module 12 (HTTP - Create Child Record):**

**Check Configuration:**
1. **Body Type:** Should be `json`
2. **Body Input Method:** Should be `jsonString`
3. **Body Content:** Should be `{{22.result}}`

**If using different format:**
- Change body type to `json`
- Change body input method to `jsonString`
- Replace any JSON template with: `{{22.result}}`

**Why:** Module 22 generates the complete JSON string. Module 12 just sends it.

**Old JSON Template:** Delete any old JSON template from Module 12 - it's no longer needed.

---

## 🧪 Testing Checklist

### Before Running Test

- [ ] Module 9 is disabled/removed
- [ ] Module 10 is disabled/removed (or disconnected)
- [ ] Module 13 generates `project_identifier` BEFORE Module 11
- [ ] Module 22 inputs are mapped correctly (lot_data, shared_data, project_identifier)
- [ ] Module 12 body uses `{{22.result}}`

### Test Scenario

1. **Submit form with multiple lots** (Route 2)
2. **Verify in Make.com execution:**
   - Module 9 should NOT run (disabled/skipped)
   - Module 10 should NOT run (disabled/skipped)
   - Module 13 runs and generates `project_identifier`
   - Module 11 (Iterator) runs for each lot
   - Module 22 runs for each lot (transforms data)
   - Module 12 runs for each lot (creates child record)

3. **Verify in GHL:**
   - ✅ No parent record is created
   - ✅ All child records are created (one per lot)
   - ✅ All child records have `is_parent_record: "No"`
   - ✅ All child records have same `project_identifier` (all linked)
   - ✅ All shared fields populated (address, risk overlays, market performance, etc.)
   - ✅ Lot-specific fields populated (property description, purchase price, rental assessment)
   - ✅ `property_address` format: "Lot {lotNumber}, {projectAddress}"

### Fields to Verify in GHL

- [ ] `project_identifier` - Same value for all children
- [ ] `is_parent_record` - All should be "No"
- [ ] `property_address` - Format: "Lot X, {address}"
- [ ] `project_address` - Project address (separate field)
- [ ] All risk overlay fields populated
- [ ] All market performance fields (should be numbers, not strings)
- [ ] `net_price` calculation (only when cashback type is 'cashback')
- [ ] `asking` field mapping (form values → GHL values)

---

## 🔍 Troubleshooting

### Issue: Module 22 error "Input variables missing"

**Solution:**
- Check Module 22 input mapping
- Ensure `lot_data` maps to `{{11}}`
- Ensure `shared_data` maps to `{{6.incoming_data.formData}}` (or try `{{6.Data.formData}}`)
- Ensure `project_identifier` maps to `{{13.project_identifier}}`

### Issue: Module 12 error "Invalid JSON"

**Solution:**
- Check Module 12 body type is `json`
- Check body input method is `jsonString`
- Check body content is exactly `{{22.result}}` (not `{{22.Data.result}}` or `{{22.result.json}}`)

### Issue: All children have same project_identifier but want to verify

**Solution:**
- In GHL, filter by `project_identifier: "PROJ-YYYYMMDD-HHmmss"`
- All child records from same submission should appear
- Check that `is_parent_record` is "No" for all
- Check that `lot_number` is different for each

### Issue: Module 13 not generating identifier

**Solution:**
- Open Module 13 → Check variable name is `project_identifier`
- Check value uses format: `PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}`
- Test Module 13 in isolation to see output

---

## 📋 Reference Files

- **Module 22 Code:** `ROUTE-2-MODULE-22-COMPLETE-CODE.js` (ready to paste - already in Make.com)
- **Handover Doc:** `HANDOVER-2026-01-11-ROUTE-2-SESSION-END.md` (full details)
- **Field Mapping:** `ROUTE-2-MODULE-22-MISSING-FIELDS-TODO.md` (all fields complete ✅)

---

## ✅ Completion Checklist

Once all steps are complete:

- [ ] Module 9 disabled/removed
- [ ] Module 10 disabled/removed
- [ ] Module 13 verified (generates identifier before Iterator)
- [ ] Module 22 inputs verified
- [ ] Module 12 uses `{{22.result}}`
- [ ] Test submission successful
- [ ] All child records created in GHL
- [ ] All fields populated correctly
- [ ] No parent record created

---

**Status:** Ready for final testing 🚀
