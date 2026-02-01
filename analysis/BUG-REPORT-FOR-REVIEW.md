# 🐛 Bug Report: PDF Link & Suburb Not Working

**Date:** 2026-01-26  
**Reporter:** User  
**Severity:** 🔴 **CRITICAL**  
**Status:** Root cause identified, ready for fix

---

## 📝 **Issue Summary**

When selecting a report from the dropdown on Step 5:
1. ❌ PDF shortcut is NOT created in the property folder
2. ❌ Suburb is NOT added to column A in the Investment Highlights sheet

**Expected Behavior:**
- ✅ PDF shortcut should appear in folder
- ✅ Suburb should be added to column A

---

## 🔍 **Test Scenario**

**Property:** 13 Milkman Way Kawungan QLD  
**Step 5:** Selected "FRASER COAST Wide Bay Burnett Region" from dropdown  
**Spreadsheet Data (verified by user):**
- Column A: "Point Vernon"
- Column B: "QLD"
- Column C: "FRASER COAST Wide Bay Burnett Region"
- **Column F:** `https://drive.google.com/file/d/1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz/view?usp=drivesdk` ✅
- **Column G:** `1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz` ✅

**Data is present in F&G, but code is not picking it up.**

---

## 🐛 **ROOT CAUSE: Property Name Mismatch**

### **The Bug**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 167-168

```typescript
// CURRENT CODE (WRONG):
hotspottingPdfLink: result.data.pdfLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.fileId || report.fileId || '',
```

**Problem:**
- The lookup API returns properties named `pdfDriveLink` and `pdfFileId`
- The code is trying to access `pdfLink` and `fileId`
- **Property names don't match!**

### **Code Flow**

1. **Dropdown Selection** (`handleDropdownSelect`):
   - Gets `report` object from `get-reports` API
   - `report.pdfLink` = Column F ✅
   - `report.fileId` = Column G ✅

2. **Lookup API Call**:
   - Calls `/api/investment-highlights/lookup` with first suburb
   - Returns `result.data` with:
     - `result.data.pdfDriveLink` (Column F) ✅
     - `result.data.pdfFileId` (Column G) ✅
     - **BUT NO `result.data.pdfLink` or `result.data.fileId`** ❌

3. **Property Access**:
   - Code tries: `result.data.pdfLink` → **UNDEFINED** ❌
   - Falls back to: `report.pdfLink` → Should work, but...
   - If `report.pdfLink` is also empty (due to API reading issue), final value is empty string

4. **Result:**
   - `hotspottingPdfFileId` = empty string
   - Folder creation checks: `if (formData?.hotspottingPdfFileId)` → **FALSE**
   - PDF shortcut creation is skipped ❌

### **Evidence**

**File:** `src/lib/googleSheets.ts`  
**Lines:** 709-710 (lookup function returns):

```typescript
pdfDriveLink: matchingRow[5] || '', // Column F
pdfFileId: matchingRow[6] || '', // Column G
```

**File:** `src/lib/googleSheets.ts`  
**Lines:** 614-615 (interface definition):

```typescript
pdfDriveLink?: string; // Column N (documentation says N, but code reads F)
pdfFileId?: string; // Column O (documentation says O, but code reads G)
```

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 167-168 (component tries to access):

```typescript
result.data.pdfLink  // ❌ DOES NOT EXIST (should be pdfDriveLink)
result.data.fileId   // ❌ DOES NOT EXIST (should be pdfFileId)
```

---

## 🔧 **THE FIX**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 167-168

**Change from:**
```typescript
hotspottingPdfLink: result.data.pdfLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.fileId || report.fileId || '',
```

**Change to:**
```typescript
hotspottingPdfLink: result.data.pdfDriveLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.pdfFileId || report.fileId || '',
```

**Also update logging (lines 173-178):**
```typescript
console.log('[InvestmentHighlights] PDF link and report info stored:', {
  pdfLink: result.data.pdfDriveLink || report.pdfLink,
  fileId: result.data.pdfFileId || report.fileId,
  reportName: result.data.reportName || report.reportName,
  validPeriod: result.data.validPeriod || report.validPeriod,
});
```

---

## 🔍 **SECONDARY ISSUE: Suburb Not Added**

**File:** `src/components/steps/Step6FolderCreation.tsx`  
**Lines:** 290-311

**Condition:**
```typescript
if (formData.hotspottingReportName && formData.address?.suburbName && formData.address?.state)
```

**Potential Issues:**
1. `hotspottingReportName` might not be stored (same property name issue?)
2. Matching logic might be too strict
3. Suburb format mismatch

**File:** `src/app/api/investment-highlights/add-suburb/route.ts`  
**Lines:** 38-41

Matching by reportName + state. Should work, but needs debugging.

**Recommendation:** Add logging to verify:
- What `hotspottingReportName` value is stored
- What values are being matched
- Why matching might fail

---

## 📋 **FILES TO MODIFY**

1. ✅ `src/components/steps/step5/InvestmentHighlightsField.tsx` (lines 167-168, 174-175)
2. 🔍 `src/components/steps/Step6FolderCreation.tsx` (add logging for suburb addition)
3. 🔍 `src/app/api/investment-highlights/add-suburb/route.ts` (add logging for matching)

---

## ✅ **TESTING STEPS**

After fix:
1. Select report from dropdown
2. Check browser console for PDF link/fileId values
3. Verify `hotspottingPdfFileId` is stored (not empty)
4. Submit form
5. Verify PDF shortcut appears in folder
6. Verify suburb is added to column A

---

## 📊 **SUMMARY**

**Primary Issue:** Property name mismatch (`pdfLink` vs `pdfDriveLink`, `fileId` vs `pdfFileId`)  
**Impact:** PDF shortcut not created  
**Fix Complexity:** 🟢 **SIMPLE** (2-line change)  
**Secondary Issue:** Suburb not added (needs investigation)  
**Status:** 🔴 **READY FOR FIX**

---

**Next Steps:**
1. Apply fix to property names
2. Add logging for debugging
3. Test with same scenario
4. Investigate suburb addition if still failing
