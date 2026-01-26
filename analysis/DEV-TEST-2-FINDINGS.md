# Dev Test 2 Findings - Torquay, QLD

**Date:** 2026-01-26  
**Test Property:** 5 Koala Drive, Hervey Bay QLD 4655 → **5 CLEO CT, TORQUAY QLD 4655** (Geoscape corrected)  
**LGA:** Fraser Coast Regional (same as Test 1)  
**Purpose:** Test dropdown functionality with existing report

---

## 🎉 **POSITIVE FINDINGS**

1. ✅ **Dropdown Shows Reports**
   - User could see existing hotspotting report in dropdown
   - Dropdown populated correctly for same LGA

2. ✅ **Proximity & Why This Property - ALREADY POPULATED!**
   - User: "proximity and why this property were already populated when I got to the page"
   - This is **exactly what we want** - early processing working!
   - User: "which is great" - confirms this is the expected behavior

3. ✅ **Manual Entry Form - CORRECT BEHAVIOR**
   - Made main body field read-only to prevent pasting in wrong field
   - User could cancel out and return to main screen
   - This is the correct UX

4. ✅ **Property Submission - SUCCESS**
   - Property submitted OK
   - Folder created (no hotspotting report as expected, since none was associated)

5. ✅ **Re-renders Improved**
   - Test 1: 132 renders
   - Test 2: 36 renders (much better!)
   - Still needs improvement, but significant progress

---

## 🚨 **CRITICAL ISSUES**

### Issue 1: Dropdown Selection Not Populating Form Field ⚠️ **BLOCKING**

**Problem:**
- User could see report in dropdown ✅
- User selected/pressed the report ✅
- **Report did NOT load into the form field** ❌
- Form field remained empty (value length: 0)

**Evidence from Logs:**
```
InvestmentHighlightsField.tsx:123 [InvestmentHighlights] Dropdown selection: Object
InvestmentHighlightsField.tsx:57 [InvestmentHighlights] Component render # 7
InvestmentHighlightsField.tsx:58 [InvestmentHighlights] Current value length: 0
... (multiple dropdown selections, all showing value length: 0)
```

**Root Cause - IDENTIFIED:**
In `handleDropdownSelect()` function (line 122-171):
```typescript
const firstSuburb = report.suburbs[0] || '';  // ❌ BUG: suburbs is a STRING, not an array!
```

**The Problem:**
- `ReportOption.suburbs` is defined as `string` (comma-separated suburbs)
- Code tries to access `report.suburbs[0]` as if it's an array
- This returns the first **character** of the string, not the first suburb
- Lookup API fails or returns wrong data
- Form field never populates

**Fix Required:**
```typescript
// CURRENT (BROKEN):
const firstSuburb = report.suburbs[0] || '';

// SHOULD BE:
const suburbsArray = report.suburbs.split(',').map(s => s.trim());
const firstSuburb = suburbsArray[0] || '';
```

**Location:** `src/components/steps/step5/InvestmentHighlightsField.tsx` line 133

---

### Issue 2: Form Field Not Populating After PDF Upload ⚠️ **BLOCKING**

**Problem:**
- Same issue as Test 1
- After PDF upload and ChatGPT formatting, form field remains empty
- User had to manually type "g" to progress

**Status:** Same as Test 1 - needs `onChange(formattedMainBody)` after upload

---

### Issue 3: Inconsistent Checkbox Validation ⚠️ **MINOR**

**Problem:**
- Test 1: Did NOT force user to tick checkbox
- Test 2: DID force user to tick checkbox
- Inconsistent behavior

**Investigation Needed:**
- Check validation logic for checkbox
- May be related to form state or step validation

---

## 📊 **COMPARISON: Test 1 vs Test 2**

| Issue | Test 1 (Point Vernon) | Test 2 (Torquay) | Status |
|-------|----------------------|------------------|--------|
| **PDF Upload** | ✅ Worked | N/A (didn't test) | - |
| **ChatGPT Formatting** | ✅ Worked (51,353 → 2,417 chars) | N/A | - |
| **Form Field Population (Upload)** | ❌ Not populated | N/A | **NEEDS FIX** |
| **Dropdown Shows Reports** | N/A | ✅ Worked | - |
| **Dropdown Selection** | N/A | ❌ Not populated | **NEEDS FIX** |
| **Proximity API** | ✅ Fixed (no 401) | ✅ Already populated | **WORKING** |
| **Re-renders** | 132 renders | 36 renders | **IMPROVED** |
| **Checkbox Validation** | ❌ Not enforced | ✅ Enforced | **INCONSISTENT** |

---

## 🔍 **DETAILED LOG ANALYSIS**

### Dropdown Selection Attempts:
```
InvestmentHighlightsField.tsx:123 [InvestmentHighlights] Dropdown selection: Object
... (render #7, value length: 0)
InvestmentHighlightsField.tsx:123 [InvestmentHighlights] Dropdown selection: Object
... (render #11, value length: 0)
InvestmentHighlightsField.tsx:123 [InvestmentHighlights] Dropdown selection: Object
... (render #15, value length: 0)
InvestmentHighlightsField.tsx:123 [InvestmentHighlights] Dropdown selection: Object
... (render #27, value length: 0)
```

**Analysis:**
- Dropdown selection handler called 4 times
- Each time, component re-rendered
- But value length stayed at 0
- No error messages in console
- Suggests lookup API call is failing silently or returning wrong data

### Re-renders - Improved:
- Test 1: 132 renders (render #1 through #132)
- Test 2: 36 renders (render #1 through #36)
- **73% reduction** - significant improvement!
- Still needs further optimization

### Proximity & Why This Property:
- **Already populated** when user reached Step 5
- This is the **correct behavior** - early processing working!
- User confirmed this is what they expect

---

## 🎯 **PRIORITY FIXES**

### Priority 1: Dropdown Selection Bug (BLOCKING)
- **Impact:** Users cannot select existing reports from dropdown
- **Effort:** Low (fix string/array bug)
- **Status:** Root cause identified, ready to fix

### Priority 2: Form Field Population After Upload (BLOCKING)
- **Impact:** Users cannot see formatted content after PDF upload
- **Effort:** Low (add `onChange(formattedMainBody)`)
- **Status:** Root cause identified, ready to fix

### Priority 3: PDF Permissions (BLOCKING - from Test 1)
- **Impact:** Users cannot access PDFs after submission
- **Effort:** Low (add permission setting)
- **Status:** Ready to fix

### Priority 4: Checkbox Validation Consistency (MINOR)
- **Impact:** Inconsistent UX
- **Effort:** Low (investigate validation logic)
- **Status:** Needs investigation

### Priority 5: Re-renders (PERFORMANCE)
- **Impact:** Performance issue, but improved significantly
- **Effort:** Medium (further optimization)
- **Status:** Lower priority (73% improvement already achieved)

---

## ✅ **READY FOR FIXES**

**Immediate Actions:**
1. Fix dropdown selection bug (string vs array)
2. Fix form field population after PDF upload
3. Fix PDF permissions
4. Investigate checkbox validation inconsistency

**After Fixes:**
- Test dropdown selection again
- Test PDF upload again
- Update test log with final results

---

**Status:** ✅ **ANALYSIS COMPLETE** - Ready to implement fixes
