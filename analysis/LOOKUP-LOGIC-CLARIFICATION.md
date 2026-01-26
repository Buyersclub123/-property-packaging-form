# Investment Highlights Lookup Logic - Clarification

**Date:** 2026-01-26  
**Based on:** User's detailed explanation of expected behavior

---

## 📋 **TWO LOOKUP SCENARIOS**

### **Scenario 1: Auto-Lookup on Page 5 Load**
**When:** User arrives at Page 5 (Proximity & Content)

**Behavior:**
1. System tries to match property's suburb name with suburbs listed in column A
2. If match found:
   - Use Report Name (column C)
   - Use Valid Period (column D)
   - Use Main Body (column E)
   - Use PDF Link (column F or N)
   - Use PDF File ID (column G or O)
   - Populate form field automatically

**Current Code:**
- `lookupInvestmentHighlights()` in `googleSheets.ts` (lines 633-728)
- Called from `InvestmentHighlightsField.tsx` on component mount (line 117)
- Matches by suburb in column A OR LGA

**Issue:**
- Currently matches by suburb OR LGA
- But if suburb not in column A, won't find report
- Example: Property suburb "Torquay" but sheet has "Point Vernon" → No match

---

### **Scenario 2: Dropdown Selection + Submission**
**When:** User selects report from dropdown (suburb not in column A)

**Behavior:**
1. User selects report from dropdown
2. Form stores report data (reportName, validPeriod, pdfLink, fileId)
3. On form submission:
   - Match by Report Name (column C) - NOT by suburb
   - Add property's suburb to column A (comma-separated)
   - Example: "Point Vernon" → "Point Vernon, Torquay"

**Current Code:**
- `handleDropdownSelect()` in `InvestmentHighlightsField.tsx` (line 122)
- Calls `/api/investment-highlights/lookup` with first suburb from dropdown
- On submission: Calls `/api/investment-highlights/add-suburb` (Step6FolderCreation.tsx line 292)

**Issue:**
- `add-suburb` route matches by suburb AND state AND reportName
- But should match ONLY by reportName (since suburb doesn't exist in sheet yet)

---

## 🏷️ **SUBURB FORMAT WITH STATE**

**User's Suggestion:**
- Use format: "Torquay (QLD)" instead of just "Torquay"
- Avoids confusion between same suburb names in different states
- Example: "Torquay (QLD)" vs "Torquay (VIC)"

**Current Format:**
- Column A: "Point Vernon" (no state)
- Form shows: "Suburb: Torquay (QLD)" (with state)

**Proposed Format:**
- Column A: "Point Vernon (QLD), Torquay (QLD)" (with state in brackets)
- Consistent format throughout

**Impact:**
- Need to update how suburbs are saved to column A
- Need to update lookup to match with state brackets
- Need to update add-suburb to include state in brackets

---

## 🧪 **FOCUSED TESTING PLAN**

### **Records Already Proven Working:**
- ✅ **Record 1 (Point Vernon):** Auto-lookup works when suburb is in column A
- ✅ **Record 2 (FRASER COAST):** Dropdown selection works, body content populates (but links don't)

### **Dummy Records to Create for Testing:**

**Record 3: Dropdown Selection Test (Suburb NOT in Column A)**
- Column A: "Random Suburb (QLD)" (any suburb, NOT Torquay)
- Column B: "QLD"
- Column C: "Torquay (QLD)" (Report Name - matches property suburb)
- Column D: "Test Period"
- Column E: "Test main body content"
- Column F: "https://drive.google.com/file/d/TEST_FILE_ID/view" (PDF Link)
- Column G: "TEST_FILE_ID" (File ID)
- **Purpose:** 
  - Test Scenario 2: Property suburb "Torquay" not in column A
  - User selects report from dropdown (report name "Torquay (QLD)")
  - Verify: PDF link/fileId retrieved correctly
  - Verify: On submission, "Torquay (QLD)" added to column A

**Record 4: Multiple Suburbs Test**
- Column A: "Point Vernon (QLD), Hervey Bay (QLD)"
- Column B: "QLD"
- Column C: "FRASER COAST Wide Bay Burnett Region"
- Column D: "January - April 2026"
- Column E: "Test main body"
- Column F: "https://drive.google.com/file/d/TEST_FILE_ID_2/view"
- Column G: "TEST_FILE_ID_2"
- **Purpose:** Test comma-separated suburbs matching (if needed)

**Record 5: Backward Compatibility Test (Optional)**
- Column A: "Test Suburb (QLD)"
- Column B: "QLD"
- Column C: "Test Report"
- Column D: "Test Period"
- Column E: "Test body"
- Column F: "" (empty - new structure)
- Column G: "" (empty - new structure)
- Column N: "https://drive.google.com/file/d/OLD_FILE_ID/view" (old structure)
- Column O: "OLD_FILE_ID" (old structure)
- **Purpose:** Test backward compatibility - read from N&O if F&G empty
- **Note:** You mentioned you can paste N&O values into F&G, so this might not be needed

---

## 🔧 **FIXES NEEDED**

### **Fix 1: Update Lookup to Support Both Column Structures**
**File:** `src/lib/googleSheets.ts` - `lookupInvestmentHighlights()`

**Changes:**
- Read from F&G first (new structure)
- If F&G are empty, read from N&O (old structure - backward compatibility)
- This fixes PDF link not being added to folder

### **Fix 2: Update Add-Suburb to Match by Report Name Only**
**File:** `src/app/api/investment-highlights/add-suburb/route.ts`

**Changes:**
- Currently matches by suburb AND state AND reportName
- Should match ONLY by reportName (since suburb doesn't exist in sheet)
- Add suburb with state brackets: "Torquay (QLD)"

### **Fix 3: Update Suburb Format to Include State**
**Files:**
- `src/lib/googleSheets.ts` - How suburbs are saved
- `src/app/api/investment-highlights/add-suburb/route.ts` - Suburb format
- `src/app/api/investment-highlights/organize-pdf/route.ts` - Suburb format

**Changes:**
- Save suburbs as "Suburb (State)" format
- Update lookup to match with state brackets
- Update add-suburb to include state in brackets

### **Fix 4: Fix Page 8 Error Message**
**File:** `src/components/MultiStepForm.tsx` or Step 6 validation

**Changes:**
- Find where error message is actually shown
- Update to mention folder creation

---

## ✅ **READY FOR TESTING**

**User Actions:**
1. Create dummy records in Google Sheet (as listed above)
2. Test Scenario 1: Auto-lookup with "Torquay (QLD)" in column A
3. Test Scenario 2: Dropdown selection, then verify suburb added on submission
4. Test backward compatibility: Record with data in N&O

**After Testing:**
- Share results
- We'll implement fixes based on findings

---

---

## 🎯 **FOCUSED TEST SCENARIO**

**Primary Test: Record 3 - Dropdown Selection with Suburb NOT in Column A**

**Test Steps:**
1. Create property with suburb "Torquay (QLD)"
2. Navigate to Page 5
3. Auto-lookup should NOT find match (Torquay not in column A)
4. User selects "Torquay (QLD)" report from dropdown
5. Verify: PDF link/fileId are retrieved and stored
6. Create folder
7. Verify: PDF shortcut appears in folder
8. Submit form
9. Verify: "Torquay (QLD)" added to column A (comma-separated with existing suburbs)

**What This Tests:**
- ✅ Dropdown selection retrieves PDF link/fileId correctly
- ✅ PDF shortcut creation in folder
- ✅ Suburb addition on submission
- ✅ Report name matching (not suburb matching)

**Status:** ⏸️ **AWAITING USER TESTING** - User will create Record 3 and test dropdown selection flow
