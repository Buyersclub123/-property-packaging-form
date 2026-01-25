# Module 14 - Fix for Empty Numeric Dropdown Fields

**Date:** January 10, 2026  
**Issue:** Empty numeric dropdown fields (carport, carspace, etc.) cause 400 errors  
**Error:** `"Invalid value '' provided for 'carport_primary' field. Allowed values are 0, 1, 2, 3, 4, 5, 6, 7, 8, 9"`

---

## 🔍 Problem

When numeric dropdown fields (beds, baths, garage, carport, carspace) are empty in the form, Make.com sends them as empty strings `""`. GHL rejects empty strings and expects either:
- A number (0-9)
- `null` (not `""`)
- The field omitted entirely

**Currently Failing:**
- `carport_primary` - Error on this field
- Likely will fail on: `carport_secondary`, `carspace_primary`, `carspace_secondary` if they're empty

---

## ✅ Solution Options

### Option 1: Use "Create JSON" Module (Recommended)

**Best approach:** Switch from "JSON string" mode to using Make.com's "Create JSON" module. This automatically handles empty values correctly.

**Steps:**
1. Add "Create JSON" module before Module 14
2. Build the JSON structure using the module's UI
3. Map all fields - empty values automatically become `null`
4. Use the Create JSON output in Module 14's HTTP request

**Benefits:**
- Handles empty values automatically
- No complex conditional logic needed
- Easier to maintain
- Also solves multi-line field issues

**Reference:** See `MAKE-COM-CREATE-JSON-MODULE-GUIDE.md`

---

### Option 2: Fix Empty Strings in JSON String Mode (Quick Fix)

If you want to keep using "JSON string" mode, use Make.com's `ifEmpty()` function:

#### For Each Numeric Dropdown Field:

**Current (Problematic):**
```json
"carport_primary": "{{5.incoming_data.formData.propertyDescription.carportPrimary}}"
```

**Fixed (Use This):**
```json
"carport_primary": {{if(not(empty(5.incoming_data.formData.propertyDescription.carportPrimary)); "\"{{5.incoming_data.formData.propertyDescription.carportPrimary}}\""; "null")}}
```

**Explanation:**
- If field is NOT empty → Send as quoted string: `"5"`
- If field IS empty → Send as `null` (unquoted, which JSON interprets as null)

---

## 📋 Fields That Need This Fix

### High Priority (Currently Failing or Likely to Fail):

1. `carport_primary` ⚠️ **CURRENTLY FAILING**
2. `carport_additional__secondary__dual_key`
3. `carspace_primary`
4. `carspace_additional__secondary__dual_key`

### Medium Priority (May Fail if Empty):

5. `beds_primary` (if can be empty)
6. `beds_additional__secondary__dual_key`
7. `bath_primary` (if can be empty)
8. `baths_additional__secondary__dual_key`
9. `garage_primary` (if can be empty)
10. `garage_additional__secondary__dual_key`

---

## 🔧 Quick Fix for Module 14 JSON Body

**Replace these lines in Module 14's JSON string body:**

### Current (Line 128):
```json
"carport_primary": "{{5.incoming_data.formData.propertyDescription.carportPrimary}}",
```

### Fixed:
```json
"carport_primary": {{if(not(empty(5.incoming_data.formData.propertyDescription.carportPrimary)); "\"{{5.incoming_data.formData.propertyDescription.carportPrimary}}\""; "null")}},
```

**Repeat for:**
- `carport_additional__secondary__dual_key` (line 129)
- `carspace_primary` (line 130)
- `carspace_additional__secondary__dual_key` (line 131)

---

## 🎯 Recommended Approach

**For immediate fix (Option 2):**
1. Fix the 4 carport/carspace fields first (they're optional and most likely to be empty)
2. Test Module 14
3. If other fields fail, fix them too

**For long-term solution (Option 1):**
1. Implement "Create JSON" module
2. This solves both empty field issues AND multi-line field issues
3. Better maintainability

---

## 📝 Testing

After applying the fix:
1. Submit form with empty carport/carspace fields
2. Verify Module 14 executes successfully
3. Check GHL record - empty fields should show as blank (not cause errors)

---

**Status:** Fix ready for implementation  
**Priority:** High - Currently blocking Module 14 execution
