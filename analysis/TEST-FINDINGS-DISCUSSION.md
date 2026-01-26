# Test Findings - Discussion Document

**Date:** 2026-01-26  
**Test Property:** 3 Cleo Ct Torquay QLD 4655  
**Test Flow:** Dropdown selection (not PDF upload)

---

## 🔍 **ISSUES IDENTIFIED**

### 1. **Page 5 - Proximity Loading & Layout** ⚠️
**Issue:** 
- Proximity was slower to load (acceptable)
- Once loaded, it did NOT push "Why This Property" down (unlike previous versions)
- User suggestion: Move Investment Highlights to the top of Page 5 so while human is working on it, other fields can load out of sight further down

**Current Order:**
1. Proximity (loads slowly)
2. Why This Property (gets pushed down when Proximity loads)
3. Investment Highlights

**Proposed Order:**
1. Investment Highlights (user works on this first)
2. Proximity (loads in background)
3. Why This Property (loads in background)

**Root Cause:** Layout/CSS issue - Proximity field expanding doesn't push content down properly

---

### 2. **Page 5 - Checkbox Validation Missing** 🚨 **CRITICAL**
**Issue:** 
- Page allowed progression without ticking the checkbox
- Inconsistent behavior (last 2 tests discussed this)

**Current Validation (MultiStepForm.tsx line 726-751):**
```typescript
case 5: // Proximity & Content
  // Checks for content fields (proximity, whyThisProperty, investmentHighlights)
  // BUT DOES NOT CHECK FOR contentReviewed CHECKBOX
  return true;
```

**Missing Check:**
```typescript
if (!contentSections.contentReviewed) {
  setValidationError('Please confirm you have reviewed all content by checking the checkbox.');
  return false;
}
```

**Root Cause:** Validation function doesn't check `contentReviewed` checkbox state

---

### 3. **Page 8 - Error Message Not Specific** ⚠️
**Issue:** 
- If you don't create a folder, the error message is the same as if you haven't completed a field
- Need to differentiate: "Please fill in all required fields... **or you have not created the folder for the property**"

**Current Error Message:**
```
"Please fill in all required fields before proceeding. Check the form for highlighted fields."
```

**Proposed Error Message:**
```
"Please fill in all required fields before proceeding, or you have not created the folder for the property. Check the form for highlighted fields."
```

**Root Cause:** Generic error message doesn't check for folder creation status

---

### 4. **Folder Creation - PDF Link Missing** 🚨 **CRITICAL**
**Issue:** 
- When selecting report from dropdown (not uploading PDF), the PDF link was not added to the folder
- This is a different flow than PDF upload

**Current Flow (PDF Upload):**
1. Upload PDF → Extract metadata → Format with AI → Organize PDF → Save to sheet → Store PDF link in form state ✅

**Current Flow (Dropdown Selection):**
1. Select from dropdown → Lookup report → Populate form field → **STOPS HERE** ❌
2. **Missing:** PDF link not stored in form state
3. **Missing:** PDF link not added to folder when folder is created

**Root Cause:** `handleDropdownSelect` doesn't store PDF link/fileId in form state

**Solution Needed:**
- When dropdown report is selected, store `pdfLink` and `fileId` from the lookup result
- When folder is created (Step 8), add PDF link to folder if it exists

---

### 5. **Google Sheet - Suburb Not Added** 🚨 **CRITICAL**
**Issue:** 
- When selecting report from dropdown, suburb (Torquay) was not added to column A
- Column A should build up association with LGA: "Point Vernon, Torquay" (comma-separated)

**Current Behavior:**
- Dropdown selection: Only populates form field, doesn't update Google Sheet
- PDF upload: Updates Google Sheet with suburb ✅

**Expected Behavior:**
- When dropdown report is selected, if suburb is not in column A, add it
- Example: If column A = "Point Vernon", and user selects for "Torquay", update to "Point Vernon, Torquay"

**Root Cause:** `handleDropdownSelect` doesn't call any API to update Google Sheet

**Solution Needed:**
- Create API endpoint: `/api/investment-highlights/add-suburb-to-report`
- Or modify existing endpoint to handle suburb addition
- Call this when dropdown report is selected

---

### 6. **Google Sheet - Columns N&O Instead of F&G** 🚨 **CRITICAL**
**Issue:** 
- Tool still posted values to columns N&O instead of F&G
- User provided Google Sheet data showing columns F&G are empty

**Expected Structure (7 columns A-G):**
- A: Suburbs (comma-separated)
- B: State
- C: Report Name
- D: Valid Period
- E: Main Body
- F: PDF Drive Link
- G: PDF File ID

**Current Code (organize-pdf/route.ts):**
```typescript
// Line 324: Reading A2:G ✅
range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:G`,

// Line 381: Updating A{row}:G{row} ✅
range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}:G${actualRowNumber}`,

// Line 391: Appending to A:G ✅
range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A:G`,
```

**Possible Causes:**
1. **Sheet has empty columns between G and N** - Data might be writing correctly but sheet structure has gaps
2. **Wrong sheet being written to** - Environment variable pointing to wrong sheet
3. **Row data array has extra elements** - `rowData` array might have more than 7 elements

**Investigation Needed:**
- Check actual Google Sheet structure (are there empty columns B-G?)
- Check `rowData` array length in `saveToGoogleSheet` function
- Verify `INVESTMENT_HIGHLIGHTS_SHEET_ID` environment variable

---

## 📋 **PROPOSED FIXES**

### Fix 1: Reorder Step 5 Components
**File:** `Step5Proximity.tsx`
- Move Investment Highlights to top
- Keep Proximity and Why This Property below

### Fix 2: Add Checkbox Validation
**File:** `MultiStepForm.tsx` (validateStep function, case 5)
- Add check for `contentSections.contentReviewed`
- Show specific error message if unchecked

### Fix 3: Improve Page 8 Error Message
**File:** `Step6FolderCreation.tsx` or `MultiStepForm.tsx`
- Check if folder is created before showing generic error
- Include folder creation status in error message

### Fix 4: Store PDF Link on Dropdown Selection
**File:** `InvestmentHighlightsField.tsx` (handleDropdownSelect)
- Store `pdfLink` and `fileId` from lookup result
- Update form state: `updateFormData({ hotspottingPdfLink, hotspottingPdfFileId })`

### Fix 5: Add Suburb to Google Sheet on Dropdown Selection
**File:** `InvestmentHighlightsField.tsx` (handleDropdownSelect)
- After successful lookup, call API to add suburb to column A
- Create new API endpoint or modify existing one

### Fix 6: Investigate Column Writing Issue
**File:** `organize-pdf/route.ts` (saveToGoogleSheet function)
- Add logging to verify `rowData` array length
- Verify sheet structure (check for empty columns)
- Ensure `rowData` has exactly 7 elements

---

## ❓ **QUESTIONS FOR DISCUSSION**

1. **Checkbox Validation:** Should checkbox be required, or optional? (User says it was required in previous tests)

2. **Suburb Addition:** When should suburb be added to Google Sheet?
   - Immediately when dropdown is selected?
   - Only when form is submitted?
   - Both?

3. **PDF Link in Folder:** Should PDF link be added to folder immediately when dropdown is selected, or only when folder is created?

4. **Column Writing:** Can you check the Google Sheet structure? Are there empty columns between G and N?

5. **Layout Priority:** Is moving Investment Highlights to top the best solution, or should we fix the layout so Proximity properly pushes content down?

---

## 🎯 **NEXT STEPS**

1. **Review this document** - Confirm understanding of issues
2. **Answer questions** - Provide guidance on behavior
3. **Implement fixes** - Make code changes
4. **Update test log** - Document fixes in DEV-TEST-LOGS-ANALYSIS.md
5. **Test again** - Verify all fixes work

---

**Status:** ⏸️ **AWAITING DISCUSSION** - Please review and provide feedback before implementation
