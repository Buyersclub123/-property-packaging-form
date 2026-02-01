# Code Review Findings - Test 4 Issues

**Date:** 2026-01-26  
**Test Property:** 13 Milkman Way Kawungan QLD  
**Issues:** Suburb not added, PDF not in folder

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **Issue 1: PDF Link Not in Folder**

**Problem Flow:**
1. User selects "FRASER COAST Wide Bay Burnett Region" from dropdown
2. `handleDropdownSelect()` does lookup using `report.suburbs[0]` (which is "Point Vernon")
3. Lookup finds report for "Point Vernon"
4. Lookup reads from columns F&G (lines 709-710 in googleSheets.ts)
5. But F&G might be empty (data in N&O), so `result.data.pdfFileId` is empty string
6. Code stores: `result.data.pdfFileId || report.fileId` (line 168)
7. If `result.data.pdfFileId` is empty, it should use `report.fileId`
8. BUT: The dropdown `report` object has `fileId` from `get-reports` route (line 56)
9. `get-reports` reads from column G (line 56), which might also be empty
10. So `hotspottingPdfFileId` ends up as empty string
11. When folder is created, `formData?.hotspottingPdfFileId` is empty (line 226)
12. Shortcut creation is skipped

**Root Cause:**
- Dropdown `report` object has `fileId` from column G (which is empty)
- Lookup `result.data.pdfFileId` is also from column G (which is empty)
- Neither source has the fileId because data is in N&O, not F&G
- Need to read from N&O as fallback

---

### **Issue 2: Suburb Not Added**

**Problem Flow:**
1. User submits form
2. Code checks: `formData.hotspottingReportName && formData.address?.suburbName` (line 290)
3. Calls `/api/investment-highlights/add-suburb` with:
   - `suburb: formData.address.suburbName` (should be "Kawungan")
   - `state: formData.address.state` (should be "QLD")
   - `reportName: formData.hotspottingReportName` (should be "FRASER COAST Wide Bay Burnett Region")
4. `add-suburb` route matches by reportName AND state (line 38-41)
5. Matches: `rowReportName === normalizedReportName && rowState === normalizedState`
6. Report name in sheet: "FRASER COAST Wide Bay Burnett Region"
7. But matching might fail due to:
   - Case sensitivity
   - Extra whitespace
   - Exact string match issues

**Root Cause:**
- Matching logic might be too strict
- OR `hotspottingReportName` is not being stored correctly
- OR suburb name format doesn't match (needs state brackets?)

---

## 🔧 **FIXES NEEDED**

### **Fix 1: Read PDF Link/FileId from N&O as Fallback**

**File:** `src/lib/googleSheets.ts` - `lookupInvestmentHighlights()`

**Change:**
- Read from F&G first (new structure)
- If F&G are empty, read from N&O (old structure - backward compatibility)
- This ensures `pdfFileId` is always retrieved

### **Fix 2: Use Dropdown Report Data Directly**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx` - `handleDropdownSelect()`

**Change:**
- When dropdown report is selected, use `report.fileId` and `report.pdfLink` directly
- Don't rely on lookup result for PDF data
- Lookup is only needed for mainBody content
- OR: Update `get-reports` route to also read from N&O as fallback

### **Fix 3: Fix Suburb Addition Matching**

**File:** `src/app/api/investment-highlights/add-suburb/route.ts`

**Change:**
- Match ONLY by reportName (not by state, since state is already known from report)
- Make matching more robust (trim, case-insensitive)
- Add logging to debug matching failures

### **Fix 4: Add State Brackets to Suburb Format**

**Files:**
- `src/app/api/investment-highlights/add-suburb/route.ts`
- `src/lib/googleSheets.ts` (lookup matching)

**Change:**
- Save suburbs as "Suburb (State)" format
- Update matching to handle state brackets

---

## 📋 **IMMEDIATE FIXES**

1. **Update lookup to read from N&O if F&G empty** - Critical for PDF link
2. **Update get-reports to read from N&O if F&G empty** - Critical for dropdown
3. **Fix add-suburb matching** - Make it more robust
4. **Add logging** - Track what values are being stored and matched

---

**Status:** 🔍 **READY FOR FIXES** - Code review complete, fixes identified
