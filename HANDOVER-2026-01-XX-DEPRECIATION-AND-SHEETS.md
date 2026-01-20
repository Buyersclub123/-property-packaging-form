# Property Review System - Handover Document
## Depreciation Integration, Google Folder Copying & Cashflow Sheet Population

**Date:** January 2026  
**Reference:** See `HANDOVER-COMPLETE-2026-01-15.md` for complete system overview  
**Session Focus:** Washington Brown depreciation calculator integration, Google Drive folder copying, and Google Sheets cashflow auto-population

---

## Executive Summary

This document covers the implementation of three key features:

1. **Washington Brown Depreciation Calculator Integration** - Manual entry with automatic parsing of depreciation tables
2. **Google Drive Folder Copying** - Recursive copying of master template folders for property reviews
3. **Google Sheets Cashflow Population** - Dynamic field mapping and automatic population of cashflow spreadsheets

---

## 1. Washington Brown Depreciation Calculator Integration

### Overview
Users can calculate depreciation values using the Washington Brown calculator and manually paste the results into the form. The system automatically parses the table and extracts Diminishing Value amounts for Years 1-10.

### Implementation Location
- **Test Page:** `form-app/src/app/test-sheets-population/page.tsx` (Washington Brown tab)
- **Standalone Page:** `form-app/src/app/washington-brown/page.tsx`

### How It Works

#### Step 1: User Calculates Depreciation
1. User navigates to `/test-sheets-population` (Washington Brown tab)
2. Property details are displayed at the top (Address, Total Cost, Year Built, Land Registration)
3. Washington Brown calculator is embedded in an iframe: `https://www.washingtonbrown.com.au/depreciation/calculator/`
4. User enters property details in the calculator and generates depreciation schedule

#### Step 2: Manual Copy-Paste
1. User copies the depreciation results table from Washington Brown
2. Pastes into the "Paste Results Table" textarea
3. Table format expected:
   ```
   Year 1	$10,000	$6,000
   Year 2	$7,000	$6,000
   Year 3	$5,000	$6,000
   ...
   ```

#### Step 3: Automatic Parsing
The parsing logic (`page.tsx` lines 477-509) extracts Diminishing Value amounts:

```typescript
// Parse each line
lines.forEach((line) => {
  // Match "Year X" pattern
  const yearMatch = line.match(/Year\s+(\d+)/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1 && year <= 10) {
      // Extract dollar amounts
      const amounts = line.match(/\$[\d,]+/g);
      if (amounts && amounts.length > 0) {
        // First dollar amount is Diminishing Value
        const diminishingValue = amounts[0].replace(/[$,]/g, '');
        parsedDepreciation[`year${year}`] = diminishingValue;
      }
    }
  }
});
```

#### Step 4: State Update
- Parsed values are stored in `depreciation` state object: `{ year1: "10000", year2: "7000", ... }`
- Values are also added to `formData.depreciation` for API submission
- Individual Year 1-10 input fields are automatically populated

### Data Structure
```typescript
depreciation: {
  year1: "10000",  // Diminishing Value for Year 1 (no $ or commas)
  year2: "7000",
  year3: "5000",
  // ... up to year10
}
```

### Why Manual Entry?
- **Cross-Origin Restrictions:** Cannot access iframe content from `washingtonbrown.com.au` domain
- **No postMessage API:** Washington Brown doesn't send messages to parent window
- **URL Monitoring Failed:** Cannot access `iframe.contentWindow.location` due to cross-origin policy
- **Solution:** Manual copy-paste with automatic parsing is the most reliable approach

### Known Issues
- ⚠️ **Depreciation parsing not populating year values** - Currently under investigation
  - Textarea is uncontrolled (no `value` prop), which may prevent React from tracking updates
  - Parsing logic exists but may not be triggering state updates correctly

---

## 2. Google Drive Folder Copying

### Overview
The system can copy a master template folder structure (including all subfolders and files) to create a new property review folder.

### Implementation Location
- **Function:** `copyFolderStructure()` in `form-app/src/lib/googleDrive.ts` (lines 447-509)
- **API Endpoint:** `/api/test-populate-sheets` (also used by `/api/create-property-folder`)

### How It Works

#### Step 1: Copy Folder Structure
```typescript
const newFolder = await copyFolderStructure(
  sourceFolderId,           // Folder to copy from
  destinationParentFolderId, // Where to create new folder
  newFolderName,            // Name for new folder
  SHARED_DRIVE_ID           // Shared Drive ID: '0AFVxBPJiTmjPUk9PVA'
);
```

#### Step 2: Recursive Copy Process
1. **Get source folder metadata** - Verifies folder exists and gets name
2. **Create new folder** - Creates folder in destination with new name
3. **List all items** - Gets all files and subfolders from source folder
4. **Copy recursively:**
   - If item is a folder → Recursively call `copyFolderStructure()`
   - If item is a file → Call `copyFileToFolder()`
5. **Return folder details** - Returns `{ id, name, webViewLink }`

### Key Constants
- **Shared Drive ID:** `0AFVxBPJiTmjPUk9PVA`
- **Master Template Folder:** `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5`
- **Properties Folder:** `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ`

### Shared Drive Support
All Drive API calls include Shared Drive compatibility:
```typescript
{
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
  corpora: 'drive',
  driveId: SHARED_DRIVE_ID
}
```

### Service Account Authentication
- **Service Account Email:** `market-performance-api@property-packaging.iam.gserviceaccount.com`
- **Credentials:** Stored in `GOOGLE_SHEETS_CREDENTIALS` environment variable
- **Scopes:** `spreadsheets` and `drive` APIs

### Known Issues
- ⚠️ **Invalid JWT Signature Error** - Persistent authentication error
  - Error: `invalid_grant: Invalid JWT Signature`
  - **Root Cause:** Private key doesn't match service account email (likely credentials are outdated or regenerated)
  - **Investigation:**
    - Private key format is correct (starts with `-----BEGIN`, contains newlines)
    - Key parsing handles escaped newlines (`\n` → actual newlines)
    - Issue persists despite multiple fixes, suggesting credentials themselves are invalid
  - **Next Steps:**
    1. Verify service account email matches credentials JSON
    2. Regenerate service account key if needed
    3. Ensure service account has access to Shared Drive
    4. Verify Drive API is enabled in Google Cloud project

---

## 3. Google Sheets Cashflow Population

### Overview
The system automatically populates Google Sheets cashflow spreadsheets using a dynamic field mapping system. Field names are stored in an "Autofill data" tab, and values are written to column B.

### Implementation Location
- **Function:** `populateSpreadsheet()` in `form-app/src/lib/googleDrive.ts` (lines 587-800)
- **API Endpoint:** `/api/test-populate-sheets` calls this function for each sheet found

### How It Works

#### Step 1: Find All Google Sheets
After copying the folder, the system finds all Google Sheets:
```typescript
const sheets = await findGoogleSheetsInFolder(newFolder.id, SHARED_DRIVE_ID);
```

#### Step 2: Read "Autofill data" Tab
For each sheet, reads column A (field names) and column B (where values will be written):
```typescript
const response = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: `'Autofill data'!A:B`,
});
```

#### Step 3: Map Fields to Values
Uses `calculateValue()` function to map form data to field names:
```typescript
const calculateValue = (fieldName: string): string => {
  const fieldLower = fieldName.toLowerCase().trim();
  
  // Address mapping
  if (fieldLower.includes('address') && !fieldLower.includes('state')) {
    return formData.address?.propertyAddress || '';
  }
  
  // State mapping (converted to uppercase 3-letter format)
  if (fieldLower.includes('state')) {
    const state = formData.address?.state || '';
    return convertStateToCode(state); // VIC, NSW, QLD, etc.
  }
  
  // ... more mappings
};
```

#### Step 4: Batch Write Values
Writes all values to column B in a single batch update:
```typescript
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId,
  requestBody: {
    valueInputOption: 'USER_ENTERED', // Preserves formulas
    data: updates.map(update => ({
      range: `'Autofill data'!B${rowNumber}`,
      values: [[value]],
    })),
  },
});
```

### Field Mapping Logic

Complete field mappings are documented in `docs/Autopopulate-GoogleSheet-values-mapping.csv`. Key mappings:

#### Basic Fields
| Sheet Field Name | Form Field Path | Logic |
|-----------------|-----------------|-------|
| Address | `formData.address?.propertyAddress` | Direct mapping |
| State | `formData.address?.state` | **Converted to uppercase 3-letter format** (VIC, NSW, QLD) |
| Total Cost | `formData.purchasePrice?.totalPrice` | Direct mapping |

#### Conditional Fields
| Sheet Field Name | Form Field Path | Condition |
|-----------------|-----------------|-----------|
| Land Cost | `formData.purchasePrice?.landPrice` | **Only if** `contractTypeSimplified === 'Split Contract'` |
| Build Cost | `formData.purchasePrice?.buildPrice` | **Only if** `contractTypeSimplified === 'Split Contract'` |
| Cashback Value | `formData.purchasePrice?.cashbackRebateValue` | **Only if** `cashbackRebateType === 'cashback'` |

#### Dual Occupancy Fields
For properties with dual occupancy (`dualOccupancy === 'Yes'`), these fields sum primary + secondary:

| Sheet Field Name | Logic |
|-----------------|-------|
| Total Bed | `bedsPrimary + bedsSecondary` (formatted as `"3 + 2"`) |
| Total Bath | `bathPrimary + bathSecondary` |
| Total Garage | `garagePrimary + garageSecondary` |
| Low Rent | `rentAppraisalPrimaryFrom + rentAppraisalSecondaryFrom` |
| High Rent | `rentAppraisalPrimaryTo + rentAppraisalSecondaryTo` |

### State Conversion Logic

**Critical:** State field must be converted to uppercase 3-letter format for cashflow spreadsheet formulas.

```typescript
const convertStateToCode = (state: string): string => {
  if (!state) return '';
  
  const stateUpper = state.toUpperCase().trim();
  
  // If already 3-letter code, return as-is
  if (stateUpper.length === 3 && /^[A-Z]{3}$/.test(stateUpper)) {
    return stateUpper;
  }
  
  // Map full state names to codes
  const stateMap: Record<string, string> = {
    'VICTORIA': 'VIC',
    'NEW SOUTH WALES': 'NSW',
    'QUEENSLAND': 'QLD',
    'SOUTH AUSTRALIA': 'SA',
    'WESTERN AUSTRALIA': 'WA',
    'TASMANIA': 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
    'ACT': 'ACT',
  };
  
  if (stateMap[stateUpper]) {
    return stateMap[stateUpper];
  }
  
  // Return uppercase if 2-3 letters
  if (stateUpper.length >= 2 && stateUpper.length <= 3) {
    return stateUpper;
  }
  
  return stateUpper;
};
```

### Dual Occupancy Detection

The system checks multiple conditions to determine if a property is dual occupancy:
```typescript
const isDual = formData.decisionTree?.dualOccupancy === 'Yes' || 
               formData.propertyDescription?.bedsSecondary || 
               formData.propertyDescription?.bathSecondary || 
               formData.propertyDescription?.garageSecondary;
```

### Field Mapping CSV

**File:** `docs/Autopopulate-GoogleSheet-values-mapping.csv`

**Structure:**
- Column A: Sheet Field Name (e.g., "Address", "State", "Total Bed")
- Column B: Form Field Path (e.g., `formData.address?.propertyAddress`)
- Column C: Logic/Notes (detailed explanation of mapping logic)
- Column D: Status (Confirmed, Needs verification, Critical, etc.)

**Usage:** This CSV serves as the source of truth for field mapping logic. When adding new fields:
1. Add row to CSV with field name, form path, logic, and status
2. Update `calculateValue()` function in `googleDrive.ts` to handle the new field
3. Test with real data to verify mapping works correctly

### Depreciation Values

Depreciation values from Washington Brown are included in `formData.depreciation`:
```typescript
{
  depreciation: {
    year1: "10000",
    year2: "7000",
    // ... up to year10
  }
}
```

**Note:** Depreciation values are passed to the API but are **not currently mapped** to sheet fields. If depreciation fields exist in the "Autofill data" tab, they need to be added to `calculateValue()` function.

---

## 4. Complete Workflow

### End-to-End Process

1. **User navigates to test page:** `http://localhost:3000/test-sheets-population`

2. **Washington Brown Tab:**
   - User calculates depreciation using embedded calculator
   - User copies depreciation table and pastes into textarea
   - System parses and populates Year 1-10 fields
   - Depreciation values stored in `formData.depreciation`

3. **Sheets Population Tab:**
   - User enters/verifies:
     - Source Folder ID (default: Master Template)
     - Destination Parent Folder ID (default: Properties folder)
     - New Folder Name (e.g., "Test 1")
   - User reviews/edits form data JSON (includes depreciation values)
   - User clicks "Copy Folder & Populate Sheets"

4. **Backend Processing:**
   - API receives request at `/api/test-populate-sheets`
   - Calls `copyFolderStructure()` to copy folder
   - Calls `findGoogleSheetsInFolder()` to find all sheets
   - For each sheet, calls `populateSpreadsheet()`:
     - Reads "Autofill data" tab
     - Maps form data to field names
     - Writes values to column B
   - Returns results with success/failure for each sheet

5. **Results Display:**
   - Shows folder link (clickable)
   - Lists all sheets found
   - Shows success/failure status for each sheet
   - Displays error messages if any sheet fails

---

## 5. Fields Needing Creation in GHL (GoHighLevel)

### Overview
Several form fields need to be created in the GHL custom object to support the cashflow sheet population workflow.

### Documentation Reference
- **File:** `form-app/NEW-FIELDS-FOR-GHL.md`
- **File:** `form-app/FIELD-MAPPING-MATRIX.md`

### High Priority Fields

#### 1. `sourcer`
- **Type:** Dropdown
- **Status:** ✅ Field exists in GHL, **needs UI** in form
- **Priority:** URGENT
- **Notes:** Field exists but not exposed in form UI

#### 2. `selling_agent`
- **Type:** Text (combined field: "Name, Email, Mobile")
- **Status:** ❌ **NEEDS CREATE** in GHL
- **Priority:** URGENT
- **Notes:** Combined field for selling agent information

#### 3. `packager`
- **Type:** Auto-populated from email address
- **Status:** ✅ **COMPLETE** - Auto-populated from email
- **Priority:** ✅ DONE
- **Implementation:** Extracts username from email (e.g., "john.t" from "john.t@buyersclub.com.au")

### Medium Priority Fields

#### 4. `rent_appraisal_primary_from`
- **Type:** Number (currency)
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Split field for primary rental appraisal range

#### 5. `rent_appraisal_primary_to`
- **Type:** Number (currency)
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Split field for primary rental appraisal range

#### 6. `rent_appraisal_secondary_from`
- **Type:** Number (currency)
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Split field for secondary rental appraisal range (dual occupancy)

#### 7. `rent_appraisal_secondary_to`
- **Type:** Number (currency)
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Split field for secondary rental appraisal range (dual occupancy)

#### 8. `build_size`
- **Type:** Number (sqm)
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Build size in square meters

#### 9. `land_registration`
- **Type:** Text/Dropdown
- **Status:** ✅ IN UI, **NEEDS CREATE** in GHL
- **Priority:** MEDIUM
- **Notes:** Land registration status (e.g., "Registered", "Unregistered")

#### 10. `cashback_rebate_value`
- **Type:** Number (currency)
- **Status:** ✅ IN UI, **NEEDS VERIFY MAPPING**
- **Priority:** MEDIUM
- **Notes:** May map to existing `Client_Cashback__Rebates_Discount` field

#### 11. `cashback_rebate_type`
- **Type:** Dropdown
- **Status:** ✅ IN UI, **NEEDS VERIFY MAPPING**
- **Priority:** MEDIUM
- **Notes:** Type of cashback/rebate (e.g., "cashback", "rebate")

#### 12. `price_group`
- **Type:** Text or Dropdown
- **Status:** ⚠️ **NEEDS VERIFY/CREATE**
- **Priority:** MEDIUM
- **Notes:** May be auto-generated - needs discussion

### Low Priority Fields

#### 13. `project_name`
- **Type:** Text
- **Status:** ⚠️ **VERIFY NEED**
- **Priority:** LOW
- **Notes:** For projects only - check occasionally

#### 14. `project_commencement_scheduled_for`
- **Type:** Date
- **Status:** ⚠️ **LATER**
- **Priority:** LOW
- **Notes:** User will come back to this

#### 15. `acceptable_acquisition_from`
- **Type:** Number (currency)
- **Status:** ⚠️ **VERIFY NEED**
- **Priority:** LOW
- **Notes:** Price range field

#### 16. `acceptable_acquisition_to`
- **Type:** Number (currency)
- **Status:** ⚠️ **VERIFY NEED**
- **Priority:** LOW
- **Notes:** Price range field

### Excel Sheet Only (Not Needed in GHL)

These fields are used in Google Sheets/Excel but don't need to be in GHL:

- `cashback__rebate_payment__details` - Payment details (Excel only)
- `project_completion_scheduled_for` - Completion date (Excel only)
- General notes fields (Excel only)

### Summary by Priority

**🔴 URGENT - Create/Add UI Now:**
1. `sourcer` - Add UI (field exists)
2. `selling_agent` - Create field + add UI
3. ~~`packager`~~ ✅ **COMPLETE**

**🟡 MEDIUM - Create in GHL:**
4-12. Rent appraisal fields, build size, land registration, cashback fields, price group

**🟢 LOW - Later:**
13-16. Project fields, acceptable acquisition fields

---

## 6. Technical Implementation Details

### File Structure

```
form-app/src/
├── app/
│   ├── test-sheets-population/
│   │   └── page.tsx                    # Main test page with tabs
│   ├── washington-brown/
│   │   └── page.tsx                    # Standalone WB page
│   └── api/
│       └── test-populate-sheets/
│           └── route.ts               # API endpoint
├── lib/
│   ├── googleDrive.ts                 # Drive API + populateSpreadsheet()
│   └── googleSheets.ts                # Sheets API client
└── docs/
    └── Autopopulate-GoogleSheet-values-mapping.csv  # Field mapping
```

### Key Functions

#### `copyFolderStructure()`
- **Location:** `form-app/src/lib/googleDrive.ts:447-509`
- **Purpose:** Recursively copy folder and all contents
- **Parameters:** `sourceFolderId`, `destinationParentFolderId`, `newFolderName`, `driveId`
- **Returns:** `{ id, name, webViewLink }`

#### `populateSpreadsheet()`
- **Location:** `form-app/src/lib/googleDrive.ts:587-800`
- **Purpose:** Populate sheet using "Autofill data" tab
- **Parameters:** `spreadsheetId`, `formData`, `driveId`
- **Process:** Read field names → Map to form data → Write to column B

#### `calculateValue()`
- **Location:** `form-app/src/lib/googleDrive.ts:661-752` (inside `populateSpreadsheet()`)
- **Purpose:** Map form field path to sheet field name
- **Logic:** Case-insensitive matching, conditional logic, dual occupancy handling

#### `convertStateToCode()`
- **Location:** `form-app/src/lib/googleDrive.ts:623-658` (inside `populateSpreadsheet()`)
- **Purpose:** Convert state names to uppercase 3-letter format
- **Returns:** "VIC", "NSW", "QLD", etc.

### Environment Variables

**Required:**
- `GOOGLE_SHEETS_CREDENTIALS` - Service account JSON (as string, with escaped newlines)

**Format:**
```json
{
  "type": "service_account",
  "project_id": "property-packaging",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "market-performance-api@property-packaging.iam.gserviceaccount.com",
  ...
}
```

**Note:** Private key may have escaped newlines (`\n`) which are automatically converted to actual newlines by the code.

### API Endpoints

#### `POST /api/test-populate-sheets`
- **Purpose:** Copy folder and populate all sheets
- **Request Body:**
  ```json
  {
    "sourceFolderId": "1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5",
    "destinationParentFolderId": "1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ",
    "newFolderName": "Test 1",
    "formData": { ... }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "newFolderName": "Test 1",
    "folderLink": "https://drive.google.com/...",
    "folderId": "...",
    "sheetsFound": 2,
    "successCount": 2,
    "failCount": 0,
    "results": [
      {
        "sheetName": "Cashflow Sheet",
        "sheetId": "...",
        "success": true,
        "message": "Sheet populated successfully"
      }
    ]
  }
  ```

---

## 7. Known Issues & Troubleshooting

### Issue 1: Invalid JWT Signature Error
**Error:** `invalid_grant: Invalid JWT Signature`

**Symptoms:**
- Folder creation fails
- All Drive API calls fail
- Error occurs even with correct credentials format

**Possible Causes:**
1. Private key doesn't match service account email (credentials regenerated)
2. Service account doesn't have access to Shared Drive
3. Drive API not enabled in Google Cloud project
4. Credentials JSON corrupted or incorrectly formatted

**Debugging Steps:**
1. Check service account email matches credentials JSON
2. Verify private key format (starts with `-----BEGIN`, contains newlines)
3. Check Shared Drive permissions (service account must be member)
4. Verify Drive API is enabled
5. Regenerate service account key if needed

**Files to Check:**
- `form-app/src/lib/googleDrive.ts` - `getDriveClient()` function
- `.env.local` - `GOOGLE_SHEETS_CREDENTIALS` variable

### Issue 2: Depreciation Parsing Not Working
**Symptoms:**
- Year values not populated when pasting table
- Textarea doesn't update state

**Possible Causes:**
1. Textarea is uncontrolled (no `value` prop)
2. Parsing regex not matching table format
3. State update not triggering re-render

**Debugging Steps:**
1. Check browser console for errors
2. Verify table format matches expected pattern
3. Add `value` prop to textarea to make it controlled
4. Add debug logging to parsing function

**Files to Check:**
- `form-app/src/app/test-sheets-population/page.tsx` - Lines 475-509

### Issue 3: Field Not Populating in Sheet
**Symptoms:**
- Field exists in "Autofill data" tab but value not written
- Field name doesn't match expected format

**Possible Causes:**
1. Field name not in `calculateValue()` function
2. Case sensitivity mismatch
3. Form data path incorrect
4. Conditional logic preventing population

**Debugging Steps:**
1. Check CSV mapping file for field name
2. Verify field name in sheet matches CSV
3. Check `calculateValue()` function includes field
4. Verify form data contains expected value
5. Check conditional logic (e.g., split contract, dual occupancy)

**Files to Check:**
- `docs/Autopopulate-GoogleSheet-values-mapping.csv`
- `form-app/src/lib/googleDrive.ts` - `calculateValue()` function

---

## 8. Testing Instructions

### Test Depreciation Parsing

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Washington Brown Calculator" tab
3. Copy sample depreciation table:
   ```
   Year 1	$10,000	$6,000
   Year 2	$7,000	$6,000
   Year 3	$5,000	$6,000
   ```
4. Paste into "Paste Results Table" textarea
5. Verify Year 1-10 fields are populated with values (10000, 7000, 5000, etc.)
6. Check `formData.depreciation` object contains values

### Test Folder Copying

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Sheets Population" tab
3. Verify default values:
   - Source Folder ID: `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5`
   - Destination Parent Folder ID: `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ`
   - New Folder Name: "Test 1"
4. Click "Copy Folder & Populate Sheets"
5. Verify:
   - Folder is created successfully
   - Folder link is displayed and clickable
   - All sheets found are listed
   - Success/failure status shown for each sheet

### Test Sheet Population

1. After folder is copied, open the new folder in Google Drive
2. Open each Google Sheet found
3. Navigate to "Autofill data" tab
4. Verify Column B is populated with values:
   - Address matches form data
   - State is uppercase 3-letter format (VIC, NSW, QLD)
   - Total Bed/Bath/Garage correct (with dual occupancy logic if applicable)
   - Low Rent/High Rent correct (summed if dual occupancy)
   - Conditional fields (Land Cost, Build Cost, Cashback) only populated if conditions met

### Test Field Mapping

1. Add a new field to "Autofill data" tab (e.g., "Test Field")
2. Add mapping to CSV file
3. Update `calculateValue()` function to handle new field
4. Re-run folder copy and population
5. Verify new field is populated correctly

---

## 9. Next Steps / TODO

### Immediate Actions

1. **Fix JWT Signature Error:**
   - Verify service account credentials are valid
   - Regenerate key if needed
   - Ensure service account has Shared Drive access
   - Verify Drive API is enabled

2. **Fix Depreciation Parsing:**
   - Make textarea controlled (add `value` prop)
   - Add debug logging to parsing function
   - Test with various table formats
   - Verify state updates trigger re-renders

3. **Add Depreciation Field Mapping:**
   - Add depreciation fields to "Autofill data" tab in sheets
   - Update CSV mapping file
   - Add depreciation mapping to `calculateValue()` function
   - Test with real depreciation data

### Short-Term Tasks

4. **Create GHL Fields:**
   - Create high-priority fields (`sourcer` UI, `selling_agent`)
   - Create medium-priority fields (rent appraisal, build size, etc.)
   - Verify field mappings work with GHL webhook

5. **Integrate into Main Form:**
   - Add Washington Brown tab to main property form
   - Connect depreciation values to form submission
   - Ensure depreciation included in sheet population

6. **Error Handling Improvements:**
   - Better error messages for JWT/auth errors
   - Distinguish credential issues from permission issues
   - Add retry logic for transient errors
   - User-friendly error messages in UI

### Long-Term Tasks

7. **Documentation:**
   - Update main handover doc with new features
   - Document Shared Drive setup requirements
   - Create troubleshooting guide for common errors
   - Document GHL field creation process

8. **Testing:**
   - Test all field mappings with real property data
   - Test dual occupancy logic with various scenarios
   - Test conditional field population
   - Test with different state formats

9. **Performance:**
   - Optimize batch updates for large sheets
   - Add progress indicators for long-running operations
   - Cache field mappings if possible

---

## 10. Related Files & Documentation

### Code Files
- `form-app/src/app/test-sheets-population/page.tsx` - Main test page
- `form-app/src/app/washington-brown/page.tsx` - Standalone WB page
- `form-app/src/app/api/test-populate-sheets/route.ts` - API endpoint
- `form-app/src/lib/googleDrive.ts` - Drive API functions
- `form-app/src/lib/googleSheets.ts` - Sheets API client

### Documentation Files
- `HANDOVER-COMPLETE-2026-01-15.md` - Complete system overview
- `docs/Autopopulate-GoogleSheet-values-mapping.csv` - Field mapping CSV
- `form-app/NEW-FIELDS-FOR-GHL.md` - GHL fields needed
- `form-app/FIELD-MAPPING-MATRIX.md` - Complete field mapping matrix

### Configuration Files
- `.env.local` - Environment variables (including `GOOGLE_SHEETS_CREDENTIALS`)

---

## 11. Contact & Support

For questions about this implementation:
- Refer to main handover document: `HANDOVER-COMPLETE-2026-01-15.md`
- Check field mapping CSV: `docs/Autopopulate-GoogleSheet-values-mapping.csv`
- Review code comments in relevant files
- Check GHL field requirements: `form-app/NEW-FIELDS-FOR-GHL.md`

---

**End of Handover Document**

**Last Updated:** January 2026  
**Next Review:** After JWT error resolution and depreciation parsing fix
