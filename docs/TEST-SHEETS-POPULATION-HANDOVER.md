# Test Sheets Population - Handover Document

**Date:** 2026-01-XX  
**Test Module:** `http://localhost:3000/test-sheets-population`  
**Status:** ✅ Core functionality complete and tested | ⏳ Next: Duplicate folder name checking

---

## Executive Summary

This document covers the **standalone test module** for folder creation, sheet population, and file management. All testing is done in isolation at `/test-sheets-population` before integration into the main property form.

**Current Status:**
- ✅ Folder creation working (copy template → rename with address)
- ✅ Sheet population working (all fields including B14-B17, B18-B27)
- ✅ Contract type deletion working (deletes opposite sheet)
- ✅ File renaming working (CF spreadsheet and Photos.docx)
- ⏳ **Next:** Duplicate folder name checking (not yet implemented)

---

## Test Module Location

**Test Page:** `property-review-system/form-app/src/app/test-sheets-population/page.tsx`  
**Test Endpoint:** `property-review-system/form-app/src/app/api/test-populate-sheets/route.ts`  
**URL:** `http://localhost:3000/test-sheets-population`

---

## What Has Been Implemented

### 1. Folder Creation & Copying
- **Function:** `copyFolderStructure()` in `googleDrive.ts`
- **Process:** Recursively copies master template folder to Properties folder
- **Naming:** Uses exact property address as folder name
- **Status:** ✅ Working

### 2. Sheet Population
- **Function:** `populateSpreadsheet()` in `googleDrive.ts`
- **Fields Populated:**
  - **B14:** Rates (direct write, no column A check)
  - **B15:** Insurance Type (direct write, no column A check)
  - **B16:** Insurance Amount (direct write, no column A check)
  - **B17:** P&B/PCI Report (direct write, no column A check)
  - **B18-B27:** Depreciation Years 1-10 (pattern matching from column A)
  - **Other fields:** Address, State, Total Cost, Beds, Baths, Garage, Rent (via column A matching)
- **Status:** ✅ Working

### 3. Contract Type Deletion
- **Logic:** Based on `contractTypeSimplified` field value:
  - If "Single Contract" → deletes sheet with "split contract" in name
  - If "Split Contract" → deletes sheet with "single contract" in name
- **Location:** `test-populate-sheets/route.ts` (lines 62-125)
- **Case Sensitivity:** Case-insensitive matching
- **Status:** ✅ Working

### 4. File Renaming
- **CF Spreadsheet:** Renamed to `CF spreadsheet [ADDRESS]`
  - Format: `CF spreadsheet {streetNumber} {streetName} {suburbName}`
  - Example: `CF spreadsheet 5 Antilles St Parrearra`
- **Photos.docx:** Renamed to `Photos [ADDRESS].docx`
  - Format: `Photos {streetNumber} {streetName} {suburbName}.docx`
  - Example: `Photos 5 Antilles St Parrearra.docx`
- **Location:** `test-populate-sheets/route.ts` (lines 127-164)
- **Status:** ✅ Working

---

## Testing Status

### ✅ Tested & Working

1. **Folder Creation**
   - Template folder copies successfully
   - Folder named with property address
   - Folder link accessible

2. **Sheet Population**
   - All fields populate correctly:
     - B14: Rates ✅
     - B15: Insurance Type ✅
     - B16: Insurance Amount ✅
     - B17: P&B/PCI Report ✅
     - B18-B27: Depreciation Years 1-10 ✅
     - Other existing fields ✅

3. **Contract Type Deletion**
   - "Single Contract" → deletes split contract sheet ✅
   - "Split Contract" → deletes single contract sheet ✅
   - Case-insensitive matching works ✅

4. **File Renaming**
   - CF spreadsheet renamed correctly ✅
   - Photos.docx renamed correctly ✅
   - Address format correct (partial address) ✅

### ⏳ Not Yet Implemented

**Duplicate Folder Name Checking**
- **Requirement:** Check if folder with same address already exists before creating
- **Logic:** Should ignore unit/lot numbers when comparing addresses
- **User Experience:** Show friendly warning if duplicate found
- **Status:** ⏳ **Next item to implement**

---

## What We Were About to Work On

### Duplicate Folder Name Checking

**Requirement:**
- When "Continue with Packaging" is clicked (or test button in test module), check if a folder with the same address already exists
- Compare addresses ignoring unit/lot numbers (e.g., "Unit 2, 5 Antilles St" should match "5 Antilles St")
- If duplicate found, show friendly warning message
- Let user decide: create anyway, use alternative name, or cancel

**Proposed Approach:**
1. Create `normalizeAddressForComparison()` function to remove unit/lot prefixes
2. Create `checkDuplicateFolder()` function to list folders and compare normalized names
3. Add duplicate check to test endpoint before folder creation
4. Return friendly error response if duplicate found
5. (Future) Add UI modal in test page to show warning and options

**Files That Would Need Changes:**
- `form-app/src/lib/googleDrive.ts` - Add normalization and duplicate check functions
- `form-app/src/app/api/test-populate-sheets/route.ts` - Add duplicate check before folder creation
- `form-app/src/app/test-sheets-population/page.tsx` - (Future) Add UI handling for duplicate warning

**Status:** ⏳ **Ready to implement** - Functions were created but reverted per user request to test in dev first

---

## Test Page Structure

### Tabs

#### Tab 1: Washington Brown Calculator
- **Purpose:** Calculate and capture depreciation values
- **Features:**
  - Property details display
  - Embedded Washington Brown calculator iframe
  - Manual paste textarea for depreciation table
  - Year 1-10 input fields (auto-populated from paste)
  - Depreciation values stored in state

#### Tab 2: Sheets Population
- **Purpose:** Test folder creation and sheet population
- **Features:**
  - Source Folder ID input (default: Master Template)
  - Destination Parent Folder ID input (default: Properties folder)
  - New Folder Name input
  - Additional Fields Section:
    - P&B / PCI Report (dropdown)
    - Insurance Type (dropdown)
    - Insurance Amount ($ input)
    - Rates ($ input)
    - Contract Type (dropdown - UI only)
  - Form Data JSON editor
  - "Copy Folder & Populate Sheets" button
  - Results display with folder link and sheet population status

---

## Form Data Structure

```typescript
{
  address: {
    propertyAddress: string,
    streetNumber: string,
    streetName: string,
    suburbName: string,
    state: string,
    postCode: string,
  },
  purchasePrice: {
    landPrice: string,
    buildPrice: string,
    totalPrice: string,
    cashbackRebateValue: string,
    cashbackRebateType: string,
  },
  propertyDescription: {
    bedsPrimary: string,
    bedsSecondary: string,
    bathPrimary: string,
    bathSecondary: string,
    garagePrimary: string,
    garageSecondary: string,
    yearBuilt: string,
    landRegistration: string,
  },
  rentalAssessment: {
    rentAppraisalPrimaryFrom: string,
    rentAppraisalPrimaryTo: string,
    rentAppraisalSecondaryFrom: string,
    rentAppraisalSecondaryTo: string,
  },
  decisionTree: {
    dualOccupancy: string,
    contractTypeSimplified: string, // "Single Contract" or "Split Contract"
  },
  depreciation: {
    year1: string,
    year2: string,
    // ... up to year10
  },
  pbPciReport: string, // "Pest & Build (P&B) report" or "P&B + PCI Reports"
  insuranceType: string, // "Insurance" or "Insurance & Strata"
  insuranceAmount: string, // Currency value
  rates: string, // Currency value
  contractTypeSimplified: string, // "Single Contract" or "Split Contract" (UI only)
}
```

---

## Key Implementation Details

### Direct Cell Writes (B14-B17)
**Important:** These fields are written directly to cells WITHOUT checking column A:
- B14: Rates
- B15: Insurance Type
- B16: Insurance Amount
- B17: P&B/PCI Report

**Reason:** User explicitly requested no column A checking for these fields - direct field-to-cell mapping only.

**Code Location:** `googleDrive.ts` lines 896-929

### Contract Type Deletion Logic
- Checks both `formData.decisionTree.contractTypeSimplified` and `formData.contractTypeSimplified`
- Case-insensitive matching
- Deletes opposite contract type sheet
- Removes deleted sheet from array before population

**Code Location:** `test-populate-sheets/route.ts` lines 62-125

### File Renaming Logic
- Extracts address from `formData.address` (streetNumber + streetName + suburbName)
- Renames remaining spreadsheet after deletion
- Finds and renames Photos.docx file
- Uses partial address format (no state/postcode)

**Code Location:** `test-populate-sheets/route.ts` lines 127-164

---

## Known Issues & Resolutions

### Issue 1: Insurance Amount Not Populating (B16)
**Problem:** Initially not writing to spreadsheet  
**Root Cause:** Conditional logic in field matching  
**Resolution:** ✅ Fixed - Changed to direct cell write (no column A check)  
**Status:** ✅ Resolved

### Issue 2: Contract Type Deletion Not Working
**Problem:** Both spreadsheets remained after deletion attempt  
**Root Causes:**
- Case sensitivity mismatch ("Single contract" vs "Single Contract")
- File ID trailing periods
- Missing shared drive parameters in deleteFile function
- Service account permissions (Content Manager can trash but not permanently delete)
**Resolution:** ✅ Fixed - All issues addressed:
- Case-insensitive matching
- File ID cleaning (trim and remove trailing periods)
- Shared drive parameters added
- Trash first, then permanent delete if needed
**Status:** ✅ Resolved

### Issue 3: File Propagation Timing
**Problem:** Files not immediately available after folder copy  
**Resolution:** ✅ Fixed - Added 1-second delay after copy before listing files  
**Status:** ✅ Resolved

---

## Next Steps

### Immediate: Duplicate Folder Name Checking
1. **Add normalization function** to remove unit/lot prefixes from addresses
2. **Add duplicate check function** to compare normalized folder names
3. **Update test endpoint** to check for duplicates before creating folder
4. **Test in dev** using test module
5. **Add UI handling** (optional) - friendly warning modal in test page

### Future: Integration into Main Form
- Once testing complete, integrate into main property form
- Update production endpoint (`create-property-folder/route.ts`)
- Add UI handling in `Step0AddressAndRisk.tsx` or `Step6FolderCreation.tsx`

---

## Testing Instructions

### Test Folder Creation & Sheet Population

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Sheets Population" tab
3. Verify default values:
   - Source Folder ID: `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5` (Master Template)
   - Destination Parent Folder ID: `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ` (Properties folder)
   - New Folder Name: "Test 1" (or any unique name)
4. Fill in additional fields:
   - P&B / PCI Report: Select from dropdown
   - Insurance Type: Select from dropdown
   - Insurance Amount: Enter dollar value
   - Rates: Enter dollar value
   - Contract Type: Select "Single Contract" or "Split Contract"
5. (Optional) Fill depreciation values in Washington Brown tab
6. Click "Copy Folder & Populate Sheets"
7. Verify:
   - Folder created successfully
   - Folder link displayed and clickable
   - Only one spreadsheet remains (opposite contract type deleted)
   - Spreadsheet renamed to "CF spreadsheet [ADDRESS]"
   - Photos.docx renamed to "Photos [ADDRESS].docx"
   - All sheets populated correctly (check "Autofill data" tab)

### Test Contract Type Deletion

1. Set Contract Type to "Single Contract"
2. Click "Copy Folder & Populate Sheets"
3. Verify: Split contract sheet is deleted, only single contract sheet remains
4. Repeat with "Split Contract" - verify single contract sheet is deleted

### Test Duplicate Folder Names (When Implemented)

1. Create folder with address "5 Antilles St Parrearra"
2. Try to create another folder with same address
3. Verify: Friendly warning message appears
4. Test with unit/lot variations:
   - "Unit 2, 5 Antilles St Parrearra" should match "5 Antilles St Parrearra"
   - "Lot 5, 5 Antilles St Parrearra" should match "5 Antilles St Parrearra"

---

## Environment Variables

### Required
```env
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AFVxBPJiTmjPUk9PVA
GOOGLE_DRIVE_TEMPLATE_FOLDER_ID=1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5
GOOGLE_DRIVE_PROPERTIES_FOLDER_ID=1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ
```

---

## Key Files Reference

- **Test Page:** `form-app/src/app/test-sheets-population/page.tsx`
- **Test Endpoint:** `form-app/src/app/api/test-populate-sheets/route.ts`
- **Core Functions:** `form-app/src/lib/googleDrive.ts`
  - `copyFolderStructure()` - Copy folder recursively
  - `findGoogleSheetsInFolder()` - Find all sheets in folder
  - `populateSpreadsheet()` - Populate sheet with form data
  - `deleteFile()` - Delete file from Drive
  - `renameFile()` - Rename file in Drive
  - `listFilesInFolder()` - List all files in folder

---

## Summary

**What's Complete:**
- ✅ Folder creation and copying
- ✅ Sheet population (all fields including new ones)
- ✅ Contract type deletion
- ✅ File renaming (CF spreadsheet and Photos.docx)
- ✅ All issues resolved and tested

**What's Next:**
- ⏳ Duplicate folder name checking (ready to implement)
- ⏳ UI handling for duplicate warning (after backend implemented)
- ⏳ Integration into main property form (after testing complete)

**Test Module:** `http://localhost:3000/test-sheets-population`  
**Status:** Ready for duplicate folder name checking implementation

---

**Last Updated:** 2026-01-XX  
**Next Update:** After duplicate folder name checking is implemented and tested
