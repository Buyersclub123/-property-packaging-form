# 🔴 CRITICAL BUG ANALYSIS - PDF Link & Suburb Not Working

**Date:** 2026-01-26  
**Test Property:** 13 Milkman Way Kawungan QLD  
**Issue:** PDF not in folder, suburb not added to sheet  
**Status:** 🚨 **ROOT CAUSE IDENTIFIED**

---

## 📊 **SPREADSHEET DATA VERIFIED**

From user's test data:
- **Column A:** "Point Vernon" (suburbs)
- **Column B:** "QLD" (state)
- **Column C:** "FRASER COAST Wide Bay Burnett Region" (report name)
- **Column F:** `https://drive.google.com/file/d/1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz/view?usp=drivesdk` ✅ **HAS DATA**
- **Column G:** `1v7DKjwCVRCSPTEYfv3huIViWUdWS1jIz` ✅ **HAS DATA**

**Data is present in F&G, but code is not picking it up.**

---

## 🐛 **ROOT CAUSE #1: PROPERTY NAME MISMATCH**

### **The Bug:**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 167-168

```typescript
hotspottingPdfLink: result.data.pdfLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.fileId || report.fileId || '',
```

**Problem:**
- Lookup API returns: `result.data.pdfDriveLink` and `result.data.pdfFileId`
- Code is looking for: `result.data.pdfLink` and `result.data.fileId`
- **Property names don't match!**

**Data Flow:**
1. Dropdown selection → `report.pdfLink` and `report.fileId` (from `get-reports` route, columns F&G) ✅
2. Lookup API call → Returns `result.data.pdfDriveLink` and `result.data.pdfFileId` (from `lookupInvestmentHighlights`, columns F&G) ✅
3. Code tries to access `result.data.pdfLink` → **UNDEFINED** ❌
4. Falls back to `report.pdfLink` → Should work, but might be empty if dropdown didn't read correctly
5. Final value: Empty string → PDF shortcut not created

### **Evidence:**

**File:** `src/lib/googleSheets.ts`  
**Lines:** 709-710

```typescript
pdfDriveLink: matchingRow[5] || '', // Column F
pdfFileId: matchingRow[6] || '', // Column G
```

**File:** `src/lib/googleSheets.ts`  
**Lines:** 614-615 (Interface definition)

```typescript
pdfDriveLink?: string; // Column N
pdfFileId?: string; // Column O
```

**Note:** Interface says N&O, but code reads F&G. This is a documentation mismatch, but the actual reading is correct.

---

## 🐛 **ROOT CAUSE #2: LOOKUP API PROPERTY NAMES**

**File:** `src/lib/googleSheets.ts`  
**Line:** 709-710

The lookup function returns:
- `pdfDriveLink` (not `pdfLink`)
- `pdfFileId` (not `fileId`)

But the component expects:
- `pdfLink`
- `fileId`

---

## 🐛 **ROOT CAUSE #3: SUBURB NOT ADDED**

**File:** `src/components/steps/Step6FolderCreation.tsx`  
**Lines:** 290-311

**Condition Check:**
```typescript
if (formData.hotspottingReportName && formData.address?.suburbName && formData.address?.state)
```

**Potential Issues:**
1. `hotspottingReportName` might not be stored correctly (same property name issue?)
2. Matching logic in `add-suburb` route might be too strict
3. Suburb name format mismatch (needs "(State)" suffix?)

**File:** `src/app/api/investment-highlights/add-suburb/route.ts`  
**Lines:** 38-41

```typescript
const rowIndex = rows.findIndex((row) => {
  const rowReportName = (row[2] || '').trim().toLowerCase(); // Column C
  const rowState = (row[1] || '').trim().toUpperCase(); // Column B
  return rowReportName === normalizedReportName && rowState === normalizedState;
});
```

**Matching:**
- Report name: "FRASER COAST Wide Bay Burnett Region" (case-insensitive)
- State: "QLD" (uppercase)
- Should match, but might fail if:
  - Extra whitespace
  - Report name stored differently
  - Suburb format issue

---

## 🔧 **FIXES REQUIRED**

### **Fix #1: Property Name Mismatch (CRITICAL)**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 167-168

**Change:**
```typescript
// BEFORE (WRONG):
hotspottingPdfLink: result.data.pdfLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.fileId || report.fileId || '',

// AFTER (CORRECT):
hotspottingPdfLink: result.data.pdfDriveLink || report.pdfLink || '',
hotspottingPdfFileId: result.data.pdfFileId || report.fileId || '',
```

**Why:** The lookup API returns `pdfDriveLink` and `pdfFileId`, not `pdfLink` and `fileId`.

---

### **Fix #2: Add Logging**

**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`  
**Lines:** 173-178

**Add:**
```typescript
console.log('[InvestmentHighlights] Dropdown report object:', {
  pdfLink: report.pdfLink,
  fileId: report.fileId,
  reportName: report.reportName,
});

console.log('[InvestmentHighlights] Lookup result:', {
  pdfDriveLink: result.data.pdfDriveLink,
  pdfFileId: result.data.pdfFileId,
  pdfLink: result.data.pdfLink, // Will be undefined
  fileId: result.data.fileId, // Will be undefined
});

console.log('[InvestmentHighlights] Final stored values:', {
  pdfLink: result.data.pdfDriveLink || report.pdfLink,
  fileId: result.data.pdfFileId || report.fileId,
});
```

---

### **Fix #3: Verify Dropdown Data**

**File:** `src/app/api/investment-highlights/get-reports/route.ts`  
**Lines:** 55-56

**Add logging:**
```typescript
console.log('[get-reports] Row data:', {
  rowIndex: index,
  pdfLink: (row[5] || '').trim(),
  fileId: (row[6] || '').trim(),
  reportName: (row[2] || '').trim(),
});
```

---

### **Fix #4: Suburb Addition Debugging**

**File:** `src/app/api/investment-highlights/add-suburb/route.ts`  
**Lines:** 32-42

**Add logging:**
```typescript
console.log('[add-suburb] Matching request:', {
  suburb: newSuburb,
  state: normalizedState,
  reportName: normalizedReportName,
});

console.log('[add-suburb] Row being checked:', {
  rowReportName: (row[2] || '').trim().toLowerCase(),
  rowState: (row[1] || '').trim().toUpperCase(),
  match: rowReportName === normalizedReportName && rowState === normalizedState,
});
```

---

## 📋 **TESTING CHECKLIST**

After fixes:
1. ✅ Select report from dropdown
2. ✅ Check console logs for PDF link/fileId values
3. ✅ Verify `hotspottingPdfFileId` is stored in form state
4. ✅ Submit form
5. ✅ Verify PDF shortcut appears in folder
6. ✅ Verify suburb is added to column A in sheet
7. ✅ Check console logs for add-suburb matching

---

## 🎯 **PRIORITY**

1. **CRITICAL:** Fix property name mismatch (Fix #1)
2. **HIGH:** Add logging to verify data flow
3. **MEDIUM:** Debug suburb addition matching
4. **LOW:** Clean up interface documentation

---

**Status:** 🔴 **READY FOR FIXES** - Root causes identified, fixes documented
