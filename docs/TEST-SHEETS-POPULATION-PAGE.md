# Test Sheets Population Page - Documentation

**Date Created:** January 15, 2026  
**Purpose:** Standalone test page for testing Google Sheets population without submitting the full property form  
**Status:** ✅ Active and functional

---

## Overview

The test page allows you to test the Google Drive folder copying and Google Sheets population functionality independently of the main property packaging form. This is useful for:

- Testing sheet population logic without filling out the entire form
- Debugging field mapping issues
- Iterating on CSV mapping changes
- Verifying folder structure copying

---

## Access

**URL:** `/test-sheets-population`  
**Full Path:** `http://localhost:3000/test-sheets-population` (local) or your Vercel domain

**Note:** This is a development/testing tool. Consider restricting access in production.

---

## Features

### 1. Folder Copy & Sheet Population

The test page allows you to:
- Copy a master template folder to a new location
- Automatically find all Google Sheets in the copied folder
- Populate the "Autofill data" tab in each sheet with form data
- Test different form data configurations quickly

### 2. Manual Input Fields

**Source Folder ID:**
- Default: `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5` (Master Template)
- The folder to copy from

**Destination Parent Folder ID:**
- Default: `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ` (Properties folder)
- Where the new folder will be created

**New Folder Name:**
- Default: `Test 1`
- Name for the new copied folder

**Form Data (JSON):**
- Default sample data included
- Editable JSON object with form structure
- Can be modified to test different scenarios

---

## Form Data Structure

The test page includes default form data structure. Key sections:

```json
{
  "address": {
    "propertyAddress": "5 Antilles St Parrearra QLD 4575",
    "streetNumber": "5",
    "streetName": "Antilles St",
    "suburbName": "Parrearra",
    "state": "QLD",
    "postCode": "4575"
  },
  "purchasePrice": {
    "landPrice": "450000",
    "buildPrice": "150000",
    "totalPrice": "600000",
    "cashbackRebateValue": "15000",
    "cashbackRebateType": "cashback"
  },
  "propertyDescription": {
    "bedsPrimary": "3",
    "bedsSecondary": "2",
    "bathPrimary": "2",
    "bathSecondary": "1",
    "garagePrimary": "1",
    "garageSecondary": "0"
  },
  "rentalAssessment": {
    "rentAppraisalPrimaryFrom": "450",
    "rentAppraisalPrimaryTo": "500",
    "rentAppraisalSecondaryFrom": "300",
    "rentAppraisalSecondaryTo": "350"
  },
  "decisionTree": {
    "dualOccupancy": "Yes"
  }
}
```

---

## How It Works

### 1. User Input
- User enters source folder ID, destination parent folder ID, folder name, and form data JSON
- Clicks "Copy Folder & Populate Sheets" button

### 2. Folder Copy
- API calls `copyFolderStructure()` to copy the master template
- New folder is created in the destination location
- Folder structure is preserved

### 3. Sheet Discovery
- API calls `findGoogleSheetsInFolder()` to find all Google Sheets in the new folder
- Returns array of sheet objects with `id` and `name`

### 4. Sheet Population
- For each sheet found, API calls `populateSpreadsheet()`
- Function reads the "Autofill data" tab, column A (field names)
- Maps form data to column B based on field name matching
- Uses batch update to write all values at once

### 5. Results Display
- Success/failure status for each sheet
- Folder link to view the new folder
- List of all sheets processed

---

## API Endpoint

**Route:** `/api/test-populate-sheets`  
**Method:** POST  
**Body:**
```json
{
  "sourceFolderId": "1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5",
  "destinationParentFolderId": "1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ",
  "newFolderName": "Test 1",
  "formData": { /* form data object */ }
}
```

**Response:**
```json
{
  "success": true,
  "newFolderName": "Test 1",
  "folderLink": "https://drive.google.com/drive/folders/...",
  "folderId": "...",
  "sheetsFound": 2,
  "successCount": 2,
  "failCount": 0,
  "results": [
    {
      "sheet": "Sheet Name 1",
      "sheetId": "...",
      "success": true,
      "message": "Sheet populated successfully"
    }
  ]
}
```

---

## Sheet Population Logic

### Tab Structure

**Required Tab:** "Autofill data"  
**Column A:** Field names (what to populate)  
**Column B:** Values (populated from form data)

### Field Mapping

The `populateSpreadsheet()` function:

1. **Reads Column A** - Gets all field names from the "Autofill data" tab
2. **Maps to Form Data** - For each field name, looks up corresponding value in form data
3. **Applies Special Logic** - Handles dual occupancy, state format, cashback/rebate, etc.
4. **Writes to Column B** - Batch updates all values at once

### Special Logic

**Dual Occupancy:**
- If `decisionTree.dualOccupancy === "Yes"`, sums primary + secondary values
- Example: Total Bed = bedsPrimary + bedsSecondary (e.g., "3 + 2" or "5")

**State Format:**
- Converts state to uppercase 3-letter format (VIC, NSW, QLD, etc.)
- Required to match Google Sheets formula format

**Cashback/Rebate:**
- Conditional logic based on `cashbackRebateType`
- If type is "cashback", shows cashback value in specific fields
- If type is "rebate", shows rebate value

**Insurance & Strata:**
- Checks for body corp costs
- If body corp exists, combines insurance + body corp
- Otherwise, just insurance value

**Rent Totals (Dual Occupancy):**
- Low Rent: Primary FROM + Secondary FROM
- High Rent: Primary TO + Secondary TO

**Depreciation:**
- Maps from `depreciation.yearX` fields (X = 1-10)

### CSV Mapping Reference

Field mapping logic follows the CSV file: `Autopopulate GoogleSheet values v2.csv`

Key mappings:
- Land Price → `purchasePrice.landPrice`
- Build Price → `purchasePrice.buildPrice`
- State → `address.state` (uppercase 3-letter)
- Total Bed → `propertyDescription.bedsPrimary` (+ secondary if dual)
- Total Bath → `propertyDescription.bathPrimary` (+ secondary if dual)
- Total Garage → `propertyDescription.garagePrimary` (+ secondary if dual)
- Cashback Value → `purchasePrice.cashbackRebateValue` (conditional on type)
- And many more...

---

## Testing Scenarios

### Scenario 1: Single Occupancy
```json
{
  "decisionTree": {
    "dualOccupancy": "No"
  },
  "propertyDescription": {
    "bedsPrimary": "3",
    "bathPrimary": "2",
    "garagePrimary": "1"
  }
}
```

**Expected:** Values populated directly, no summing

### Scenario 2: Dual Occupancy
```json
{
  "decisionTree": {
    "dualOccupancy": "Yes"
  },
  "propertyDescription": {
    "bedsPrimary": "3",
    "bedsSecondary": "2",
    "bathPrimary": "2",
    "bathSecondary": "1",
    "garagePrimary": "1",
    "garageSecondary": "1"
  },
  "rentalAssessment": {
    "rentAppraisalPrimaryFrom": "450",
    "rentAppraisalPrimaryTo": "500",
    "rentAppraisalSecondaryFrom": "300",
    "rentAppraisalSecondaryTo": "350"
  }
}
```

**Expected:** 
- Total Bed: "3 + 2" or "5"
- Total Bath: "2 + 1" or "3"
- Total Garage: "1 + 1" or "2"
- Low Rent: 750 (450 + 300)
- High Rent: 850 (500 + 350)

### Scenario 3: State Format
```json
{
  "address": {
    "state": "qld"  // or "Queensland" or "QLD"
  }
}
```

**Expected:** Written as "QLD" (uppercase 3-letter)

### Scenario 4: Cashback vs Rebate
```json
{
  "purchasePrice": {
    "cashbackRebateType": "cashback",
    "cashbackRebateValue": "15000"
  }
}
```

**Expected:** Cashback value appears in cashback-specific fields

```json
{
  "purchasePrice": {
    "cashbackRebateType": "rebate",
    "cashbackRebateValue": "10000"
  }
}
```

**Expected:** Rebate value appears in rebate-specific fields

---

## Code Locations

### Frontend
**File:** `form-app/src/app/test-sheets-population/page.tsx`  
**Type:** Next.js page component  
**Features:**
- Input fields for folder IDs and folder name
- Textarea for form data JSON (editable)
- Button to trigger test
- Result display area
- Loading state handling

### Backend API
**File:** `form-app/src/app/api/test-populate-sheets/route.ts`  
**Type:** Next.js API route  
**Features:**
- Validates input parameters
- Calls `copyFolderStructure()` to copy folder
- Calls `findGoogleSheetsInFolder()` to find sheets
- Calls `populateSpreadsheet()` for each sheet
- Returns success/failure results

### Core Functions
**File:** `form-app/src/lib/googleDrive.ts`  
**Functions:**
- `copyFolderStructure()` - Copies folder with all contents
- `findGoogleSheetsInFolder()` - Finds all Google Sheets in folder
- `populateSpreadsheet()` - Populates "Autofill data" tab with form data

---

## Usage Instructions

### Step 1: Access the Page
1. Navigate to `/test-sheets-population` in your browser
2. Page loads with default values pre-filled

### Step 2: Review Default Values
- Check that source folder ID is correct (Master Template)
- Check destination folder ID (Properties folder)
- Review form data JSON structure

### Step 3: Modify Form Data (Optional)
- Edit the JSON in the textarea to test different scenarios
- Ensure valid JSON syntax
- Can test dual occupancy, different states, cashback vs rebate, etc.

### Step 4: Click "Copy Folder & Populate Sheets"
- Button triggers the test
- Loading state shows "Copying folder and populating sheets... Please wait."
- Wait for API response

### Step 5: Review Results
- Success message shows folder link
- Shows number of sheets found
- Lists each sheet's processing status
- Any errors are displayed

### Step 6: Verify in Google Drive
- Click the folder link to open in Google Drive
- Navigate to any Google Sheet
- Open the "Autofill data" tab
- Verify Column B is populated with correct values

---

## Troubleshooting

### Issue: "No Google Sheets found in folder"
**Cause:** The copied folder doesn't contain any Google Sheets  
**Solution:** Check the source folder (Master Template) contains Google Sheets

### Issue: "Sheet populated successfully" but values are empty
**Cause:** Field names in Column A don't match form data structure  
**Solution:** Check the "Autofill data" tab has correct field names in Column A

### Issue: "API Error 400/500"
**Cause:** Invalid input parameters or form data structure  
**Solution:** 
- Check all folder IDs are valid
- Verify form data JSON is valid syntax
- Check server logs for detailed error

### Issue: State values not matching formulas
**Cause:** State not in uppercase 3-letter format  
**Solution:** Code now converts states automatically, but verify the form data provides a state value

### Issue: Dual occupancy sums not working
**Cause:** `decisionTree.dualOccupancy` not set to "Yes"  
**Solution:** Ensure form data includes `decisionTree.dualOccupancy: "Yes"` and both primary and secondary values

---

## Related Files

- **CSV Mapping:** `Autopopulate GoogleSheet values v2.csv` (in JT FOLDER)
- **Core Logic:** `form-app/src/lib/googleDrive.ts`
- **Integration:** `form-app/src/app/api/create-property-folder/route.ts` (uses same functions)
- **Documentation:** `docs/DEAL-SHEET-SETUP-GUIDE.md`

---

## Future Enhancements

Potential improvements:
- Add form data templates for common scenarios (dropdown selection)
- Add validation for form data structure before submission
- Show preview of field mappings before populating
- Add option to test without copying folder (just populate existing folder)
- Add logging/history of test runs
- Add ability to compare before/after values

---

## Notes

- This is a testing tool - don't use in production workflow
- Always verify populated values in Google Sheets after testing
- Form data structure must match the actual form's data structure
- Field names in "Autofill data" tab Column A must match CSV mapping exactly
- The test page uses the same core functions as the main form submission

---

**Last Updated:** January 15, 2026  
**Status:** ✅ Functional and tested
