# Test 4 Findings - Review Document

**Date:** 2026-01-26  
**Test Property:** 7 Cleo Ct Torquay QLD 4655  
**Test Flow:** Dropdown selection (not PDF upload)

---

## ✅ **WORKING CORRECTLY**

1. **Page 5 - Investment Highlights at Top** ✅
   - Investment Highlights component is at the top
   - Proximity and Why This Property load below (out of sight)
   - User can work on Investment Highlights while others load

2. **Page 5 - Checkbox Validation** ✅
   - User was forced to tick checkbox before leaving page
   - ONE exit rule working correctly

3. **Dropdown Selection** ✅
   - User was able to select report from dropdown
   - PDF link and report info stored (from logs: `[InvestmentHighlights] PDF link and report info stored`)

---

## ❌ **ISSUES FOUND**

### Issue 1: Page 8 Error Message Not Updated
**Problem:** 
- Error message still shows: "Please fill in all required fields before proceeding. Check the form for highlighted fields."
- Should show: "Please fill in all required fields before proceeding, or you have not created the folder for the property. Check the form for highlighted fields."

**Root Cause:** 
- Code was updated in `MultiStepForm.tsx` case 8, but error might be coming from a different place
- OR the validation is happening at Step 6 (Folder Creation) instead of Step 8

**Investigation Needed:**
- Check if Step 6 has its own validation
- Check if error is being overridden somewhere
- The code in `MultiStepForm.tsx` case 8 was updated, but user still sees old message
- May need to check browser cache or if validation happens elsewhere

---

### Issue 2: PDF Link Not Added to Folder
**Problem:**
- User created folder but no Hotspotting report in there
- PDF link was stored when dropdown selected (confirmed in logs)
- But shortcut not created in folder

**Root Cause:**
- `create-property-folder/route.ts` checks for `formData?.hotspottingPdfFileId`
- But the formData being sent might not include this field
- OR the field exists but the shortcut creation is failing silently

**Investigation Needed:**
- Check if `hotspottingPdfFileId` is in formData when folder is created
- Check logs for "Adding PDF shortcut" message
- Verify `createShortcut` function is working
- **CRITICAL FINDING:** Lookup function reads from columns F&G (lines 709-710 in googleSheets.ts)
- But Google Sheet has data in N&O (old structure)
- So `result.data.pdfFileId` is empty string, causing `hotspottingPdfFileId` to be empty
- When folder creation checks `formData?.hotspottingPdfFileId`, it's empty, so shortcut not created

---

### Issue 3: Suburb Not Added to Google Sheet
**Problem:**
- User submitted property but suburb (Torquay) not added to column A
- Should update from "Point Vernon" to "Point Vernon, Torquay"

**Root Cause:**
- Code exists in `Step6FolderCreation.tsx` to call `/api/investment-highlights/add-suburb`
- But it might not be executing or failing silently
- OR `hotspottingReportName` is not in formData

**Investigation Needed:**
- Check if `hotspottingReportName` exists in formData at submission
- Check server logs for add-suburb API call
- Verify API endpoint is working
- Code shows it stores `hotspottingReportName` when dropdown selected (line 169)
- But may not persist correctly or may be lost during form navigation

---

### Issue 4: Columns N&O Still Used (Not F&G)
**Problem:**
- Google Sheet shows data in columns N&O (PDF Drive Link, PDF File ID)
- Should be in columns F&G
- User asks: "could this be stopping the link being added to the folder?"

**Root Cause:**
- Save route was updated to use 7 columns (A-G)
- BUT: The existing data in the sheet might be in N&O from before
- OR: There's another route being called that still uses 15 columns
- OR: The lookup function is reading from N&O, so when we store it, we're reading old data

**Investigation Needed:**
- Check what columns the lookup function reads from
- Check if there are multiple routes writing to the sheet
- Verify the save route is actually being called (not just organize-pdf)

**User's Question:** Could columns N&O issue be stopping the link being added to folder?
- **Answer:** YES! This is the root cause:
  1. Lookup function reads from columns F&G (correct - lines 709-710)
  2. But Google Sheet has data in N&O (old structure from before fix)
  3. So `result.data.pdfFileId` returns empty string (column G is empty)
  4. We store empty string in `hotspottingPdfFileId`
  5. When folder creation checks `formData?.hotspottingPdfFileId`, it's empty
  6. So shortcut creation is skipped (line 226: `if (formData?.hotspottingPdfFileId)`)

**Solution Needed:**
- Update lookup function to read from N&O as fallback if F&G are empty
- OR migrate existing data from N&O to F&G in Google Sheet
- OR update lookup to check both locations (F&G first, then N&O as fallback)

---

## 🔍 **ROOT CAUSE ANALYSIS**

### Why PDF Link Not in Folder:
1. **FormData not including hotspotting fields** - When folder is created, `formData` might not have `hotspottingPdfFileId`
2. **Lookup returns data from N&O** - If lookup reads from N&O, the fileId might be wrong/empty
3. **Shortcut creation failing silently** - Error is caught but not logged properly

### Why Suburb Not Added:
1. **hotspottingReportName not in formData** - Field might not be persisted correctly
2. **API call failing silently** - Error caught but not logged
3. **API endpoint issue** - The add-suburb route might have a bug

### Why Columns N&O:
1. **Lookup function reading from wrong columns** - Still reading from N&O instead of F&G
2. **Existing data in N&O** - Old data structure, new code writes to F&G but lookup reads from N&O
3. **Multiple routes** - Another route (like organize-pdf) might be writing to N&O

---

## 📋 **NEXT STEPS**

1. ✅ **Check lookupInvestmentHighlights function** - Reads from F&G (lines 709-710), but data is in N&O
2. **Fix lookup function** - Add fallback to read from N&O if F&G are empty (for backward compatibility)
3. **Check formData persistence** - Verify hotspotting fields persist through form navigation
4. **Fix error message** - Find where Step 8 error is actually shown (may be Step 6 validation)
5. **Add logging** - Add console.logs to track:
   - What lookupInvestmentHighlights returns (pdfFileId value)
   - When folder is created, what's in formData.hotspottingPdfFileId?
   - When submission happens, what's in formData.hotspottingReportName?

## 🔧 **PROPOSED FIXES**

### Fix 1: Update Lookup Function to Support Both Column Structures
- Read from F&G first (new structure)
- If F&G are empty, read from N&O (old structure - backward compatibility)
- This will fix PDF link not being added to folder

### Fix 2: Find and Fix Error Message Location
- Check Step 6 validation (if it exists)
- Update error message to mention folder creation

### Fix 3: Verify FormData Persistence
- Ensure hotspotting fields persist through form navigation
- May need to check Zustand store persistence

---

---

## 💡 **USER'S CRITICAL OBSERVATION**

**User noticed:**
- Form shows "Suburb: Torquay (QLD)" in Investment Highlights section
- But report name is "FRASER COAST Wide Bay Burnett Region" (from Google Sheet column C)
- Google Sheet has "Point Vernon" in column A (suburbs), not "Torquay"
- **Question:** Is the lookup incorrectly trying to match "Torquay" instead of matching by report name?

**Analysis:**
- Lookup function matches by suburb in column A OR LGA
- If "Torquay" is not in column A, it won't find the report
- OR it might be finding the wrong report
- The report should be matched by report name "FRASER COAST Wide Bay Burnett Region" (column C)

**User's Test Proposal:**
- Add dummy record in Google Sheet with "Torquay" in column A to test if matching works
- This will help confirm if the lookup logic is the issue

**Status:** ⏸️ **AWAITING USER TEST** - User will test with dummy record to confirm lookup behavior
