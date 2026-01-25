# Contract Type Field Not Appearing - Diagnosis & Fix

**Date:** 2025-01-13  
**Issue:** `contractTypeSimplified` field computed correctly in form but not appearing in GHL records after 5-6 test submissions

---

## 🔍 Root Cause Analysis

### The Problem
The form correctly computes `contractTypeSimplified` and sends it to Make.com, but Make.com is **not mapping this field** when creating GHL records.

### Data Flow
```
Form App
  ↓
Sends: formData.decisionTree.contractTypeSimplified = "Single Contract" or "Split Contract"
  ↓
Make.com Webhook: https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h
  ↓
Make.com Scenario: "Form App Property Submission" (or similar)
  ↓
Make.com "Create a Record" Module (GHL)
  ↓
❌ Field NOT mapped → GHL record created WITHOUT contract_type field
```

### Why It's Not Working
1. **Form sends field correctly:** `formData.decisionTree.contractTypeSimplified` is in the payload
2. **Make.com receives it:** Webhook receives the data
3. **Make.com doesn't map it:** The "Create a Record" module in Make.com isn't configured to map `formData.decisionTree.contractTypeSimplified` to the GHL field name

### Important: Why No Error?
**Good question!** Make.com typically **doesn't error** when:
- A field isn't in the "Create a Record" module's field mapping → Make.com simply doesn't try to write it (silently ignored)
- A field is mapped but doesn't exist in GHL → **This WOULD error** (but we're not seeing errors, so this isn't the case)

**Most likely scenario:** The field exists in GHL, but Make.com's "Create a Record" module doesn't have `contract_type` (or `contract_type_simplified`) in its field mapping at all, so Make.com never tries to write to it → No error, but field is missing.

**To verify:**
1. Check Make.com execution logs for any errors during record creation
2. Check if `contract_type` field appears in the "Create a Record" module's field dropdown
3. If field doesn't appear in dropdown → Field might not exist in GHL (or Make.com hasn't refreshed field list)
4. If field appears but isn't mapped → That's the issue (needs mapping)

---

## ✅ Solution: Update Make.com Configuration

### Step 1: Verify GHL Field Exists & Get Exact Name

**Check 1: Does the field exist in GHL?**
1. Log into GHL
2. Go to Custom Objects → Property Reviews
3. View fields list
4. **Confirm the field exists** (if it doesn't, that's the problem - field needs to be created first)
5. Note the exact internal field name (not the display label)

**Possible field names:**
- Option A: `contract_type` (without `_simplified`)
- Option B: `contract_type_simplified` (with `_simplified`)

**Check 2: Does Make.com see the field?**
1. Open Make.com scenario
2. Go to "Create a Record" module (GHL Custom Object)
3. Click on field mapping section
4. **Check if `contract_type` or `contract_type_simplified` appears in the field dropdown**
   - ✅ **If it appears:** Field exists, just needs to be mapped
   - ❌ **If it doesn't appear:** Either field doesn't exist in GHL, or Make.com needs to refresh field list (try disconnecting/reconnecting GHL connection)

### Step 2: Update Make.com "Create a Record" Module

**Location:** Make.com Scenario → "Create a Record" module (GHL Custom Object)

**Action Required:**
1. Open the "Create a Record" module in Make.com
2. Find the field mapping section
3. Add/Update the mapping:
   - **GHL Field Name:** `contract_type` OR `contract_type_simplified` (match what you created in Step 1)
   - **Value Source:** `{{formData.decisionTree.contractTypeSimplified}}`
   - **Default Value (if empty):** Leave blank or use empty string

**Example Mapping:**
```
GHL Field: contract_type
Value: {{formData.decisionTree.contractTypeSimplified}}
```

OR if field name is `contract_type_simplified`:
```
GHL Field: contract_type_simplified
Value: {{formData.decisionTree.contractTypeSimplified}}
```

### Step 3: Verify Field Mapping

**Check in Make.com:**
1. Look at the "Create a Record" module
2. Verify `contract_type` (or `contract_type_simplified`) is in the field list
3. Verify it's mapped to `{{formData.decisionTree.contractTypeSimplified}}`
4. Save the scenario

### Step 4: Test

1. Submit a test property from the form
2. Check GHL record:
   - Go to Property Reviews in GHL
   - Find the test record
   - Verify `contract_type` (or `contract_type_simplified`) field has value:
     - H&L with "01 H&L Comms" → Should be "Split Contract"
     - H&L with "02 Single Comms" → Should be "Single Contract"
     - Established/Projects → Should be empty

---

## 📋 Field Name Reference

### Form Field (JavaScript)
- **Name:** `contractTypeSimplified` (camelCase)
- **Location:** `formData.decisionTree.contractTypeSimplified`
- **Values:** `"Single Contract"` | `"Split Contract"` | `null`

### GHL Field (Database)
- **Name:** `contract_type` OR `contract_type_simplified` (snake_case)
- **Location:** Property Reviews Custom Object
- **Values:** `"Single Contract"` | `"Split Contract"` | `""` (empty)

### Make.com Mapping
- **Read from:** `{{formData.decisionTree.contractTypeSimplified}}`
- **Write to:** `contract_type` OR `contract_type_simplified` (match GHL field name)

---

## 🔧 Alternative: Code Fix (If Make.com Can't Be Updated)

If you can't update Make.com right now, we can add a temporary workaround in the form code to send the field in a format Make.com expects. However, **the proper fix is in Make.com configuration**.

---

## 📝 Notes

- The form code is working correctly - field is computed and sent
- **Make.com doesn't error on unmapped fields** - it simply ignores them (which is why no errors occurred)
- **If Make.com tried to write to a non-existent GHL field, it WOULD error** - but since the field isn't mapped, it never tries
- The issue is likely: Field exists in GHL, but Make.com's "Create a Record" module doesn't have it in the field mapping
- Once Make.com is configured correctly, all future submissions will include the field
- Previous submissions (5-6 properties) won't have the field - they would need to be manually updated or resubmitted

## 🔍 Debugging Steps

**If field still doesn't work after mapping:**

1. **Check Make.com Execution Logs:**
   - Go to Make.com scenario → Executions
   - Find a recent execution
   - Check for any errors in the "Create a Record" module
   - Look for error messages about unknown fields

2. **Verify Field Name Match:**
   - GHL field name must EXACTLY match what's in Make.com dropdown
   - Check for typos, case sensitivity, underscores vs hyphens

3. **Test Field Value:**
   - In Make.com, add a "Set Variable" module before "Create a Record"
   - Set: `testField = {{formData.decisionTree.contractTypeSimplified}}`
   - Run scenario and check if value is captured correctly

4. **Check GHL API Response:**
   - After "Create a Record" module, add a "Get Record" module
   - Fetch the created record
   - Check if `contract_type` field exists and has value

---

## ✅ Verification Checklist

- [ ] Confirmed exact GHL field name (`contract_type` or `contract_type_simplified`)
- [ ] Updated Make.com "Create a Record" module to map the field
- [ ] Saved Make.com scenario
- [ ] Submitted test property from form
- [ ] Verified field appears in GHL record with correct value
- [ ] Tested with H&L Single Contract property
- [ ] Tested with H&L Split Contract property
- [ ] Tested with Established property (should be empty)
