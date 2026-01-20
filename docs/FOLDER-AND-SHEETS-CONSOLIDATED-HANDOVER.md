# Folder Creation & Cashflow Sheet Population - Consolidated Handover

**Date:** 2026-01-XX  
**Status:** ✅ COMPLETE - Isolated testing complete, ready for integration  
**Reference:** `.cursor/Rules` and `.cursor/Rules2` - Critical working rules for AI assistants  
**Previous Document:** `HANDOVER-2026-01-XX-DEPRECIATION-AND-SHEETS.md` (pre-consolidation)

---

## Executive Summary

This document covers the **isolated testing implementation** for three key features:

1. **Washington Brown Depreciation Calculator Integration** - Manual entry with automatic parsing of depreciation tables (Years 1-10)
2. **Google Drive Folder Creation** - Recursive copying of master template folders with address-based naming
3. **Google Sheets Cashflow Population** - Dynamic field mapping with exact matching (no conditional logic) to populate cashflow spreadsheets

**Current Status:**
- ✅ Test page complete and working (`/test-sheets-population`)
- ✅ Folder creation working (copy template → rename with address)
- ✅ Sheet population working (exact field matching)
- ✅ Depreciation parsing working (Years 1-10)
- ✅ New fields added (P&B/PCI, Insurance Type, Insurance Amount, Rates, Contract Type)
- ⏸️ **SHELVED** - Integration into main form on hold until other priorities complete

---

## Deployment Status

### Development (Current)
- **Test Page URL:** `http://localhost:3000/test-sheets-population`
- **API Endpoints:**
  - `/api/test-populate-sheets` - Test endpoint for folder copy and sheet population
  - `/api/create-property-folder` - Production endpoint (used by main form)
- **Status:** ✅ Working in dev environment
- **Access:** Local development only

### Production
- **Status:** ⚠️ Partial - `/api/create-property-folder` exists but may need updates
- **Note:** Test page (`/test-sheets-population`) is dev-only. Production endpoint exists but may not have all latest field mappings.

---

## Code Locations

### Test Page (UI)
- **File:** `property-review-system/form-app/src/app/test-sheets-population/page.tsx`
- **Status:** ✅ Complete
- **Purpose:** Standalone test page with two tabs:
  - **Washington Brown Tab:** Depreciation calculator integration
  - **Sheets Population Tab:** Folder creation and sheet population testing

### API Endpoints

#### Test Endpoint
- **File:** `property-review-system/form-app/src/app/api/test-populate-sheets/route.ts`
- **Status:** ✅ Complete
- **Purpose:** Test endpoint for copying folder and populating all sheets found

#### Production Endpoint
- **File:** `property-review-system/form-app/src/app/api/create-property-folder/route.ts`
- **Status:** ✅ Complete (may need field mapping updates)
- **Purpose:** Creates property folder, renames HL sheet, populates with form data
- **Used By:** Main form (Step 0 - "Continue with Packaging")

### Core Functions

#### Google Drive Functions
- **File:** `property-review-system/form-app/src/lib/googleDrive.ts`
- **Key Functions:**
  - `copyFolderStructure()` - Recursively copy folder and all contents
  - `findGoogleSheetsInFolder()` - Find all Google Sheets in a folder
  - `populateSpreadsheet()` - Populate sheet using "Autofill data" tab
  - `renameFile()` - Rename a file in Google Drive
  - `deleteFile()` - Delete a file in Google Drive
  - `calculateValue()` - Map form field to sheet field name (exact matching)

#### Depreciation Parsing
- **Location:** `test-sheets-population/page.tsx` (lines 477-509)
- **Function:** Parses Washington Brown depreciation table and extracts Year 1-10 values

---

## Feature 1: Washington Brown Depreciation Calculator

### Overview
Users calculate depreciation using the Washington Brown calculator and manually paste results. The system automatically parses the table and extracts Diminishing Value amounts for Years 1-10.

### Implementation Location
- **Test Page Tab:** `test-sheets-population/page.tsx` (Washington Brown tab)
- **Standalone Page:** `washington-brown/page.tsx` (exists but not actively used)

### How It Works

#### Step 1: User Calculates Depreciation
1. Navigate to `/test-sheets-population` (Washington Brown tab)
2. Property details displayed at top (Address, Total Cost, Year Built, Land Registration)
3. Washington Brown calculator embedded in iframe: `https://www.washingtonbrown.com.au/depreciation/calculator/`
4. User enters property details and generates depreciation schedule

#### Step 2: Manual Copy-Paste
1. User copies depreciation results table from Washington Brown
2. Pastes into "Paste Results Table" textarea
3. Expected table format:
   ```
   Year 1	$10,000	$6,000
   Year 2	$7,000	$6,000
   Year 3	$5,000	$6,000
   ...
   ```

#### Step 3: Automatic Parsing
Parsing logic extracts Diminishing Value amounts (first dollar amount in each row):

```typescript
lines.forEach((line) => {
  const yearMatch = line.match(/Year\s+(\d+)/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1 && year <= 10) {
      const amounts = line.match(/\$[\d,]+/g);
      if (amounts && amounts.length > 0) {
        const diminishingValue = amounts[0].replace(/[$,]/g, '');
        parsedDepreciation[`year${year}`] = diminishingValue;
      }
    }
  }
});
```

#### Step 4: State Update
- Parsed values stored in `depreciation` state: `{ year1: "10000", year2: "7000", ... }`
- Values added to `formData.depreciation` for API submission
- Individual Year 1-10 input fields automatically populated

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

### Sheet Mapping
- **Target Cells:** "Autofill data" tab, B18-B27 (Years 1-10)
- **Field Matching:** Flexible pattern matching for field names:
  - "Depreciation Year 1", "Year 1 Depreciation", "Depreciation 1", etc.
- **Source:** `formData.depreciation.year1` through `formData.depreciation.year10`

---

## Feature 2: Google Drive Folder Creation

### Overview
The system copies a master template folder structure (including all subfolders and files) to create a new property review folder. Folder is named using the property address.

### Implementation Location
- **Function:** `copyFolderStructure()` in `googleDrive.ts` (lines 447-509)
- **API Endpoint:** `/api/create-property-folder` (production) or `/api/test-populate-sheets` (test)

### How It Works

#### Step 1: Copy Folder Structure
```typescript
const propertyFolder = await copyFolderStructure(
  TEMPLATE_FOLDER_ID,        // Folder to copy from
  PROPERTIES_FOLDER_ID,       // Where to create new folder
  propertyAddress,            // Name for new folder (exact property address)
  SHARED_DRIVE_ID             // Shared Drive ID
);
```

#### Step 2: Recursive Copy Process
1. **Get source folder metadata** - Verifies folder exists and gets name
2. **Create new folder** - Creates folder in destination with property address as name
3. **List all items** - Gets all files and subfolders from source folder
4. **Copy recursively:**
   - If item is a folder → Recursively call `copyFolderStructure()`
   - If item is a file → Call `copyFileToFolder()`
5. **Return folder details** - Returns `{ id, name, webViewLink }`

### Folder Naming
- **Format:** Exact property address (e.g., "5 Antilles St Parrearra QLD 4575")
- **Source:** `formData.address.propertyAddress` or `propertyAddress` parameter
- **Uniqueness:** Not checked automatically (GHL uniqueness check should be done before folder creation)

### Key Constants (Environment Variables)
- **Shared Drive ID:** `GOOGLE_DRIVE_SHARED_DRIVE_ID`
- **Master Template Folder:** `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`
- **Properties Folder:** `GOOGLE_DRIVE_PROPERTIES_FOLDER_ID`

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

---

## Feature 3: Google Sheets Cashflow Population

### Overview
The system automatically populates Google Sheets cashflow spreadsheets using **exact field name matching** (no conditional logic). Field names are stored in an "Autofill data" tab, and values are written to column B.

### Implementation Location
- **Function:** `populateSpreadsheet()` in `googleDrive.ts` (lines 587-800)
- **Field Mapping:** `calculateValue()` function (lines 661-803)

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

#### Step 3: Map Fields to Values (Exact Matching)
Uses `calculateValue()` function with **exact field name matching** (no conditional logic):

```typescript
const calculateValue = (fieldName: string): string => {
  const fieldLower = fieldName.toLowerCase().trim();
  
  // Exact matches only - no conditional logic
  if (fieldLower === 'insurance amount') {
    return formData.insuranceAmount || '';
  }
  
  if (fieldLower === 'rates') {
    return formData.rates || '';
  }
  
  // ... more exact matches
  
  return '';
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

### Field Mapping Approach: Exact Matching Only

**Critical Principle:** All field mappings use **exact field name matching** with no conditional logic. Each UI field maps directly to one sheet field.

#### Current Field Mappings

| Sheet Field Name (Column A) | UI Field | Target Cell | Notes |
|----------------------------|----------|-------------|-------|
| `Insurance Amount` | `formData.insuranceAmount` | B16 | Exact match only |
| `Insurance Type` or `Insurance & Strata` | `formData.insuranceType` | B15 | Exact match only |
| `P&B / PCI Report` or `P&B/PCI Report` | `formData.pbPciReport` | B17 | Exact match only |
| `Rates` | `formData.rates` | B14 | Exact match only |
| `Depreciation Year 1` (various patterns) | `formData.depreciation.year1` | B18 | Pattern matching for year extraction |
| `Depreciation Year 2` | `formData.depreciation.year2` | B19 | Pattern matching |
| ... | ... | ... | ... |
| `Depreciation Year 10` | `formData.depreciation.year10` | B27 | Pattern matching |

#### Existing Field Mappings (Pre-existing)
- Address, State, Land Cost, Build Cost, Total Cost
- Cashback Value (conditional - only if type is cashback)
- Total Bed, Total Bath, Total Garage (with dual occupancy logic)
- Low Rent, High Rent (with dual occupancy logic)
- State conversion (to uppercase 3-letter format: VIC, NSW, QLD, etc.)

**Note:** Some existing fields have conditional logic (e.g., cashback, dual occupancy). New fields (Insurance, Rates, P&B/PCI) use exact matching only as per requirements.

### Depreciation Field Mapping
- **Target Cells:** B18-B27 (Years 1-10)
- **Field Name Patterns Supported:**
  - "Depreciation Year 1" or "Depreciation Year1"
  - "Year 1 Depreciation" or "Year1 Depreciation"
  - "Depreciation 1"
- **Source:** `formData.depreciation.year1` through `formData.depreciation.year10`
- **Extraction:** Year number extracted from field name using regex patterns

### State Conversion Logic
**Critical:** State field must be converted to uppercase 3-letter format for cashflow spreadsheet formulas.

```typescript
const convertStateToCode = (state: string): string => {
  const stateMap: Record<string, string> = {
    'VICTORIA': 'VIC',
    'NEW SOUTH WALES': 'NSW',
    'QUEENSLAND': 'QLD',
    'SOUTH AUSTRALIA': 'SA',
    'WESTERN AUSTRALIA': 'WA',
    'TASMANIA': 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  };
  // ... conversion logic
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

---

## Feature 4: Sheet Renaming (H&L Split Contract)

### Overview
For H&L properties with Split Contract, the system:
1. Finds the HL sheet (has "HL" in title)
2. Deletes the non-HL sheet (if exists)
3. Renames the HL sheet with property address
4. Populates the renamed sheet

### Implementation Location
- **File:** `create-property-folder/route.ts` (lines 56-168)
- **Condition:** Only runs if `lotType === 'Individual'` AND `contractType === '01_hl_comms'` OR `contractTypeSimplified === 'Split Contract'`

### Renaming Logic
- **Format:** `CF HL spreadsheet ({streetNumber} {streetName} {suburbName})`
- **Example:** `CF HL spreadsheet (5 Antilles St Parrearra)`
- **Source:** `formData.address.streetNumber`, `streetName`, `suburbName`

### Current Status
- **Note:** Currently processes ALL properties for testing (line 79: `const shouldProcess = !!formData;`)
- **TODO:** Change back to only H&L + Split Contract after testing

---

## Test Page Structure

### URL
`http://localhost:3000/test-sheets-population`

### Tabs

#### Tab 1: Washington Brown Calculator (Default)
- **Purpose:** Calculate and capture depreciation values
- **Features:**
  - Property details display (Address, Total Cost, Year Built, Land Registration)
  - Embedded Washington Brown calculator iframe
  - Manual paste textarea for depreciation table
  - Year 1-10 input fields (auto-populated from paste)
  - Depreciation values stored in `depreciation` state

#### Tab 2: Sheets Population
- **Purpose:** Test folder creation and sheet population
- **Features:**
  - Source Folder ID input (default: Master Template)
  - Destination Parent Folder ID input (default: Properties folder)
  - New Folder Name input
  - **Additional Fields Section:**
    - P&B / PCI Report (dropdown)
    - Insurance Type (dropdown)
    - Insurance Amount ($ input)
    - Rates ($ input)
    - Contract Type (dropdown - UI only, not mapped to sheet)
  - Form Data JSON editor (includes all fields including depreciation)
  - "Copy Folder & Populate Sheets" button
  - Results display with folder link and sheet population status

### Form Data Structure
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

## Field Mapping Reference

### New Fields (Exact Matching)

#### P&B / PCI Report (B17)
- **UI Field:** `formData.pbPciReport`
- **Dropdown Options:**
  - "Pest & Build (P&B) report"
  - "P&B + PCI Reports"
- **Sheet Matching:** Exact match for "p&b / pci report", "p&b/pci report", or "p&b pci report"

#### Insurance Type (B15)
- **UI Field:** `formData.insuranceType`
- **Dropdown Options:**
  - "Insurance"
  - "Insurance & Strata"
- **Sheet Matching:** Exact match for "insurance type" or "insurance & strata"

#### Insurance Amount (B16)
- **UI Field:** `formData.insuranceAmount`
- **Input Type:** Currency ($ value field)
- **Sheet Matching:** Exact match for "insurance amount"

#### Rates (B14)
- **UI Field:** `formData.rates`
- **Input Type:** Currency ($ value field)
- **Sheet Matching:** Exact match for "rates"

#### Depreciation Years 1-10 (B18-B27)
- **UI Field:** `formData.depreciation.year1` through `formData.depreciation.year10`
- **Source:** Washington Brown calculator (manual paste)
- **Sheet Matching:** Pattern matching for "Depreciation Year X", "Year X Depreciation", or "Depreciation X"
- **Extraction:** Year number extracted from field name using regex

#### Contract Type Simplified (UI Only)
- **UI Field:** `formData.contractTypeSimplified`
- **Dropdown Options:**
  - "Single Contract"
  - "Split Contract"
- **Sheet Mapping:** ❌ NOT mapped to spreadsheet (UI only, for future proofing)

---

## Environment Variables

### Required
```env
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"property-packaging",...}'
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AFVxBPJiTmjPUk9PVA
GOOGLE_DRIVE_TEMPLATE_FOLDER_ID=1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5
GOOGLE_DRIVE_PROPERTIES_FOLDER_ID=1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ
```

### Format Notes
- **GOOGLE_SHEETS_CREDENTIALS:** Single-line JSON string, wrapped in single quotes, with `\n` for newlines in private key
- **Example:**
  ```env
  GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w...\n-----END PRIVATE KEY-----\n",...}'
  ```

### Vercel Setup
All environment variables should be added to Vercel:
- Production environment
- Preview environment
- Development environment

---

## API Endpoints

### POST /api/test-populate-sheets
**Purpose:** Test endpoint for copying folder and populating all sheets

**Request Body:**
```json
{
  "sourceFolderId": "1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5",
  "destinationParentFolderId": "1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ",
  "newFolderName": "Test 1",
  "formData": { ... }
}
```

**Response:**
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

### POST /api/create-property-folder
**Purpose:** Production endpoint for creating property folder (used by main form)

**Request Body:**
```json
{
  "propertyAddress": "5 Antilles St Parrearra QLD 4575",
  "formData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "folderId": "...",
  "folderLink": "https://drive.google.com/...",
  "folderName": "5 Antilles St Parrearra QLD 4575"
}
```

**Note:** This endpoint also handles sheet renaming and population for H&L Split Contract properties.

---

## Technical Implementation Details

### Google Drive API Integration
- **Library:** `googleapis` npm package
- **Authentication:** Service account credentials from `GOOGLE_SHEETS_CREDENTIALS`
- **Scopes:** `spreadsheets` and `drive` APIs
- **Shared Drive:** All operations support Shared Drive (uses `supportsAllDrives: true`)

### Google Sheets API Integration
- **Library:** `googleapis` npm package
- **Method:** Batch updates for efficiency
- **Value Input Option:** `USER_ENTERED` (preserves formulas)
- **Tab Name:** "Autofill data" (hardcoded)

### Key Functions

#### `copyFolderStructure()`
- **Location:** `googleDrive.ts` (lines 447-509)
- **Purpose:** Recursively copy folder and all contents
- **Parameters:** `sourceFolderId`, `destinationParentFolderId`, `newFolderName`, `driveId`
- **Returns:** `{ id, name, webViewLink }`

#### `populateSpreadsheet()`
- **Location:** `googleDrive.ts` (lines 587-800)
- **Purpose:** Populate sheet using "Autofill data" tab
- **Parameters:** `spreadsheetId`, `formData`, `driveId`
- **Process:** Read field names → Map to form data → Write to column B

#### `calculateValue()`
- **Location:** `googleDrive.ts` (lines 661-803)
- **Purpose:** Map form field path to sheet field name
- **Approach:** Exact field name matching (no conditional logic for new fields)
- **Note:** Some existing fields have conditional logic (cashback, dual occupancy)

#### `findGoogleSheetsInFolder()`
- **Location:** `googleDrive.ts`
- **Purpose:** Find all Google Sheets in a folder
- **Returns:** Array of `{ id, name }` objects

#### `renameFile()`
- **Location:** `googleDrive.ts`
- **Purpose:** Rename a file in Google Drive
- **Used For:** Renaming HL sheet with property address

#### `deleteFile()`
- **Location:** `googleDrive.ts`
- **Purpose:** Delete a file in Google Drive
- **Used For:** Deleting non-HL sheet when H&L Split Contract condition applies

---

## Testing Instructions

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

### Test Folder Copying & Sheet Population

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Sheets Population" tab
3. Verify default values:
   - Source Folder ID: `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5` (Master Template)
   - Destination Parent Folder ID: `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ` (Properties folder)
   - New Folder Name: "Test 1"
4. Fill in additional fields:
   - P&B / PCI Report: Select from dropdown
   - Insurance Type: Select from dropdown
   - Insurance Amount: Enter dollar value
   - Rates: Enter dollar value
   - Contract Type: Select from dropdown (UI only)
5. Fill depreciation values in Washington Brown tab (if testing depreciation)
6. Click "Copy Folder & Populate Sheets"
7. Verify:
   - Folder is created successfully
   - Folder link is displayed and clickable
   - All sheets found are listed
   - Success/failure status shown for each sheet

### Test Sheet Population Results

1. After folder is copied, open the new folder in Google Drive
2. Open each Google Sheet found
3. Navigate to "Autofill data" tab
4. Verify Column B is populated with values:
   - B14: Rates
   - B15: Insurance Type
   - B16: Insurance Amount
   - B17: P&B / PCI Report
   - B18-B27: Depreciation Years 1-10 (if provided)
   - Other fields: Address, State, Total Cost, etc.

---

## Known Issues & Resolutions

### Issue 1: Invalid JWT Signature Error
**Error:** `invalid_grant: Invalid JWT Signature`

**Possible Causes:**
1. Private key doesn't match service account email (credentials regenerated)
2. Service account doesn't have access to Shared Drive
3. Drive API not enabled in Google Cloud project
4. Credentials JSON corrupted or incorrectly formatted

**Resolution:**
- Regenerate service account key from Google Cloud Console
- Ensure service account has Editor access to Shared Drive
- Verify Drive API is enabled
- Update `GOOGLE_SHEETS_CREDENTIALS` in `.env.local` and Vercel
- Ensure correct format: single-line JSON, wrapped in single quotes, `\n` for newlines

**Status:** ✅ Resolved (credentials regenerated and updated)

### Issue 2: Insurance Amount Not Populating
**Problem:** Insurance Amount (B16) not writing to spreadsheet

**Root Cause:** Conditional logic in field matching was preventing exact match

**Resolution:** ✅ Fixed - Changed to exact field name matching only:
```typescript
if (fieldLower === 'insurance amount') {
  return formData.insuranceAmount || '';
}
```

**Status:** ✅ Resolved

### Issue 3: Field Matching Logic
**Problem:** Initial implementation had conditional logic ("if includes X but not Y")

**Resolution:** ✅ Fixed - All new fields use exact matching only (no conditional logic)

**Status:** ✅ Resolved

---

## Field Mapping Philosophy

### Exact Matching Approach
**Principle:** Each UI field maps directly to one sheet field using exact name matching. No conditional logic, no complex checks.

**Benefits:**
- Simple and predictable
- Easy to debug
- Clear mapping relationship
- No hidden logic

**Example:**
```typescript
// ✅ Good - Exact match
if (fieldLower === 'insurance amount') {
  return formData.insuranceAmount || '';
}

// ❌ Bad - Conditional logic
if (fieldLower.includes('insurance') && 
    fieldLower.includes('amount') && 
    !fieldLower.includes('type')) {
  return formData.insuranceAmount || '';
}
```

### When to Use Pattern Matching
**Depreciation Years:** Pattern matching is acceptable because:
- Field names vary ("Depreciation Year 1", "Year 1 Depreciation", etc.)
- Year number needs to be extracted
- Still simple and predictable (extract year number, return `year${year}`)

---

## Next Steps (When Ready for Integration)

### Integration into Main Form
1. **Add to Step 0 or Step 6:** Folder creation trigger
2. **Add to Step 5 or Step 6:** Depreciation calculator tab/page
3. **Add to Step 6:** Additional fields (P&B/PCI, Insurance, Rates) in form UI
4. **Update Field Mappings:** Ensure all new fields are mapped in `calculateValue()`
5. **Test End-to-End:** Full workflow from form submission to sheet population

### Before Integration
- ✅ Folder creation complete
- ✅ Sheet population complete
- ✅ Depreciation parsing complete
- ✅ New fields added and tested
- ⏳ Property Form Failure Points Discussion (identify manual fallback processes)

---

## References

### Documentation Files
- `property-review-system/HANDOVER-2026-01-XX-DEPRECIATION-AND-SHEETS.md` - Pre-consolidation handover (reference only)
- `property-review-system/docs/Autopopulate-GoogleSheet-values-mapping.csv` - Field mapping CSV (reference)
- `property-review-system/form-app/NEW-FIELDS-FOR-GHL.md` - GHL fields needed
- `property-review-system/form-app/FIELD-MAPPING-MATRIX.md` - Complete field mapping matrix

### Rules Files
- `property-review-system/.cursor/Rules` - Critical working rules
- `property-review-system/.cursor/Rules2` - Additional working rules

### API Documentation
- **Google Drive API:** https://developers.google.com/drive/api
- **Google Sheets API:** https://developers.google.com/sheets/api
- **Washington Brown Calculator:** https://www.washingtonbrown.com.au/depreciation/calculator/

---

## Test Results & Verification Status

### Last Test Session (2026-01-XX)

#### ✅ Working Features
- **Folder Creation:** ✅ Working - Template folder copies successfully
- **Sheet Population:** ✅ Working - All existing fields populate correctly
- **Depreciation Parsing:** ✅ Working - Years 1-10 extracted from Washington Brown table
- **Depreciation Mapping:** ✅ Working - Years 1-10 write to B18-B27
- **P&B/PCI Report:** ✅ Working - Writes to B17
- **Insurance Type:** ✅ Working - Writes to B15
- **Rates:** ✅ Working - Writes to B14
- **Contract Type:** ✅ Working - UI field functional (not mapped to sheet as intended)

#### ⚠️ Issues Found & Resolved
- **Insurance Amount (B16):** ❌ Initially not populating → ✅ Fixed by removing conditional logic, changed to exact matching

#### Test Data Used
- **Address:** `5 Antilles St Parrearra QLD 4575`
- **Depreciation:** Test values from Washington Brown calculator
- **New Fields:** All dropdowns and inputs tested with sample values

### Verification Checklist
- ✅ Folder created with correct name (property address)
- ✅ Folder link accessible
- ✅ All sheets found in folder
- ✅ Sheet population successful for all sheets
- ✅ Depreciation Years 1-10 populate correctly (B18-B27)
- ✅ New fields populate correctly (B14-B17)
- ✅ Exact matching approach working (no conditional logic issues)

---

## Decisions Made & Closed

### Decision 1: Field Mapping Approach
**Decision:** All new fields use **exact field name matching only** (no conditional logic)
**Rationale:** Simple, predictable, easy to debug, clear mapping relationship
**Status:** ✅ Closed - Implemented and tested

### Decision 2: Contract Type Field
**Decision:** `contractTypeSimplified` field is **UI only** (not mapped to spreadsheet)
**Rationale:** Future-proofing for when logic is added later
**Status:** ✅ Closed - Field exists in UI, no spreadsheet mapping

### Decision 3: Depreciation Field Matching
**Decision:** Depreciation fields use **pattern matching** (not exact matching) because field names vary
**Rationale:** Field names can be "Depreciation Year 1", "Year 1 Depreciation", etc. - need to extract year number
**Status:** ✅ Closed - Pattern matching implemented and working

### Decision 4: Insurance Amount Fix
**Decision:** Remove all conditional logic, use exact match only: `if (fieldLower === 'insurance amount')`
**Rationale:** Conditional logic was preventing match, exact matching is simpler and more reliable
**Status:** ✅ Closed - Fixed and verified working

### Decision 5: Test Approach
**Decision:** Build features in isolation first, then integrate into main form
**Rationale:** Easier to test and debug isolated features before integration
**Status:** ✅ Closed - Isolation complete, ready for integration when ready

---

## Summary

**What's Complete:**
- ✅ Test page (`/test-sheets-population`) with two tabs
- ✅ Washington Brown depreciation calculator integration
- ✅ Depreciation parsing (Years 1-10)
- ✅ Folder creation (copy template → rename with address)
- ✅ Sheet population (exact field matching)
- ✅ New fields added (P&B/PCI, Insurance Type, Insurance Amount, Rates, Contract Type)
- ✅ Sheet renaming for H&L Split Contract
- ✅ Baseline tested and working
- ✅ All issues resolved (Insurance Amount fixed)

**What's Next:**
- ⏸️ Integration into main form - ON HOLD
- ⏳ Property Form Failure Points Discussion
- ⏳ Complete other priorities first

**Key Files:**
- Test page: `form-app/src/app/test-sheets-population/page.tsx`
- Test endpoint: `form-app/src/app/api/test-populate-sheets/route.ts`
- Production endpoint: `form-app/src/app/api/create-property-folder/route.ts`
- Core functions: `form-app/src/lib/googleDrive.ts`

---

**End of Handover Document**

**Last Updated:** 2026-01-XX  
**Status:** Complete and ready for integration (when ready)
