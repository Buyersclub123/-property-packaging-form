# Property Review System - Handover Document
## Washington Brown Integration & Google Sheets Population

**Date:** January 16, 2026  
**Reference:** See `HANDOVER-COMPLETE-2026-01-15.md` for complete system overview  
**Session Focus:** Washington Brown Calculator integration, Google Sheets auto-population, and folder creation testing

---

## Executive Summary

This session focused on:
1. **Washington Brown Depreciation Calculator Integration** - Creating a dedicated page/tab for users to calculate depreciation values
2. **Google Sheets Auto-Population** - Implementing automatic population of Google Sheets from form data using an "Autofill data" tab
3. **Folder Creation & Testing** - Testing the folder copying and sheet population workflow
4. **Field Mapping Documentation** - Creating CSV documentation for field mapping logic

---

## Pages Created/Modified

### 1. Test Sheets Population Page (`/test-sheets-population`)
**File:** `form-app/src/app/test-sheets-population/page.tsx`

**Purpose:** Standalone test page for copying folders and populating Google Sheets

**Features:**
- **Tabbed Interface:** Two tabs - "Washington Brown Calculator" (default) and "Sheets Population"
- **Sheets Population Tab:**
  - Input fields for source folder ID, destination parent folder ID, and new folder name
  - Form data JSON editor (pre-populated with sample data)
  - Button to copy folder and populate all sheets found in the new folder
  - Results display showing success/failure for each sheet
- **Washington Brown Tab:** See section below

**Key State:**
- `activeTab`: Controls which tab is visible (`'sheets' | 'washington-brown'`)
- `formData`: Complete form data object including address, purchase price, property description, rental assessment, decision tree
- `depreciation`: Object storing depreciation values (`year1`, `year2`, etc.)
- `sourceFolderId`: Default `'1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5'` (Master Template)
- `destinationParentFolderId`: Default `'1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ'` (Properties folder)

**API Integration:**
- Calls `/api/test-populate-sheets` POST endpoint
- Passes `sourceFolderId`, `destinationParentFolderId`, `newFolderName`, and `formData`

---

### 2. Washington Brown Calculator Page (`/washington-brown`)
**File:** `form-app/src/app/washington-brown/page.tsx`

**Purpose:** Dedicated page for Washington Brown depreciation calculator integration

**Features:**
- **Property Details Display:** Shows Address, Total Cost, Year Built, and Land Registration at the top
- **Washington Brown Widget:** Embedded iframe pointing to `https://www.washingtonbrown.com.au/depreciation/calculator/`
- **Manual Entry Section:**
  - Textarea for pasting the full depreciation table
  - Automatic parsing to extract "Diminishing Value" amounts from pasted table
  - 10 individual input fields (Year 1-10) for manual entry
  - Parsing logic extracts values from table format like:
    ```
    Year 1	$10,000	$6,000
    Year 2	$7,000	$6,000
    ```

**Implementation Details:**
- Uses `useRef` for iframe reference (`iframeRef`)
- Attempted automatic capture via `postMessage` API (failed due to cross-origin restrictions)
- Attempted URL monitoring (failed due to cross-origin restrictions)
- **Final Solution:** Manual copy-paste with automatic parsing

**Parsing Logic:**
- Matches lines containing "Year X" pattern
- Extracts first dollar amount from each line (Diminishing Value)
- Removes `$` and commas, stores as numeric string
- Updates `depreciation` state object with `year1`, `year2`, etc.

**Note:** This page exists as a standalone route but was later integrated into the test-sheets-population page as a tab.

---

## API Routes Created/Modified

### 1. Test Populate Sheets API (`/api/test-populate-sheets`)
**File:** `form-app/src/app/api/test-populate-sheets/route.ts`

**Purpose:** API endpoint to copy a folder structure and populate all Google Sheets found in it

**Process:**
1. Receives POST request with:
   - `sourceFolderId`: Folder to copy from
   - `destinationParentFolderId`: Where to create new folder
   - `newFolderName`: Name for the new folder
   - `formData`: Complete form data object
2. Calls `copyFolderStructure()` to copy the folder
3. Calls `findGoogleSheetsInFolder()` to find all sheets
4. For each sheet found, calls `populateSpreadsheet()` to populate it
5. Returns results with success/failure for each sheet

**Shared Drive ID:** `0AFVxBPJiTmjPUk9PVA` (hardcoded constant)

**Error Handling:**
- Comprehensive logging at each step
- Returns detailed error messages
- Continues processing even if one sheet fails

---

## Library Functions Created/Modified

### 1. `populateSpreadsheet()` Function
**File:** `form-app/src/lib/googleDrive.ts`

**Purpose:** Populates Google Sheets using an "Autofill data" tab

**How It Works:**
1. Reads the "Autofill data" tab (columns A and B)
2. Column A contains field names (e.g., "Address", "State", "Land Cost")
3. Column B is where values are written
4. Maps form data to field names using `calculateValue()` function
5. Writes values to column B using batch update

**Field Mapping Logic:**
- Uses case-insensitive matching on field names
- Handles dual occupancy logic (adds primary + secondary values)
- Conditional logic for split contracts, cashback values, etc.
- See CSV file for complete mapping details

**Key Features:**
- Reads field names dynamically from the sheet (no hardcoded cell references)
- Handles empty/unmapped fields gracefully
- Logs all updates for debugging
- Uses `USER_ENTERED` value input option (allows formulas to be preserved)

### 2. `copyFolderStructure()` Function
**File:** `form-app/src/lib/googleDrive.ts`

**Purpose:** Recursively copies a folder and all its contents

**Process:**
1. Gets source folder metadata
2. Creates new folder in destination
3. Lists all items in source folder
4. Recursively copies subfolders
5. Copies files
6. Returns folder details with webViewLink

**Shared Drive Support:**
- Uses `supportsAllDrives: true` flag
- Handles `driveId` parameter for Shared Drive operations

---

## Documentation Created

### 1. Field Mapping CSV
**File:** `docs/Autopopulate-GoogleSheet-values-mapping.csv`

**Purpose:** Documents the mapping logic between form fields and Google Sheet fields

**Structure:**
- `Sheet Field Name`: Name of the field in the "Autofill data" tab
- `Form Field Path`: Path to the form data (e.g., `formData.address?.propertyAddress`)
- `Logic/Notes`: Detailed explanation of the mapping logic, including conditional logic
- `Status`: Confirmation status (Confirmed, Needs verification, Critical, etc.)

**Key Mappings Documented:**
- Address, State
- Land Cost, Build Cost, Total Cost
- Cashback Value (conditional)
- Total Bed/Bath/Garage (with dual occupancy logic)
- Low Rent, High Rent (with dual occupancy logic)

**Usage:** This CSV serves as the source of truth for field mapping logic and should be updated when new fields are added.

---

## What We Learned

### 1. Cross-Origin Restrictions
- **Issue:** Cannot access iframe content or URL from different domains
- **Attempted Solutions:**
  - `postMessage` API - Failed (Washington Brown doesn't send messages)
  - URL monitoring - Failed (cross-origin prevents access to `iframe.contentWindow.location`)
- **Solution:** Manual copy-paste with automatic parsing

### 2. Google Sheets Population Strategy
- **Old Approach:** Hardcoded cell references (e.g., `'Personal 90%'!E4`)
- **New Approach:** Dynamic field mapping using "Autofill data" tab
- **Benefits:**
  - More flexible - can add new fields without code changes
  - Easier to maintain - field names are in the sheet itself
  - Works with multiple sheet types

### 3. Dual Occupancy Logic
- Must check multiple conditions to determine if property is dual occupancy:
  - `formData.decisionTree?.dualOccupancy === 'Yes'`
  - OR presence of `bedsSecondary`, `bathSecondary`, or `garageSecondary`
- When dual occupancy, values are formatted as `"primary + secondary"` (e.g., `"3 + 2"`)

### 4. Conditional Field Population
- Some fields only populate under certain conditions:
  - **Land Cost / Build Cost:** Only for split contracts
  - **Cashback Value:** Only if `cashbackRebateType === 'cashback'`
- Logic is documented in the CSV file

### 6. State Field Format (⚠️ Implementation Gap)
- **CSV Requirement:** State field must be converted to uppercase 3-letter format (VIC, NSW, QLD) for cashflow spreadsheet formulas
- **CSV Status:** Marked as "Critical - must be uppercase 3-letter format"
- **Current Implementation:** Returns state as-is without conversion
- **Impact:** Cashflow spreadsheet formulas may fail if state is not in expected format
- **Action Required:** Implement state conversion logic in `calculateValue()` function

### 5. State Management
- Used `useRef` instead of `useState` for `lastIframeUrl` to avoid React warnings about dependency array size changes
- Depreciation values are stored in both `depreciation` state and `formData.depreciation` for consistency

---

## Issues Encountered & Resolutions

### Issue 1: React useEffect Dependency Warning
**Error:** `Warning: The final argument passed to useEffect changed size between renders`

**Cause:** `lastIframeUrl` state was in dependency array and updated within the effect

**Resolution:** Changed to `useRef` hook (`lastIframeUrlRef`) and removed from dependency array

**File:** `test-sheets-population/page.tsx` line 51

---

### Issue 2: Cross-Origin Iframe Access
**Error:** Cannot access iframe content or URL from Washington Brown domain

**Attempted Solutions:**
1. `postMessage` API - Washington Brown doesn't send messages
2. URL monitoring - Cross-origin prevents access

**Resolution:** Manual copy-paste with automatic table parsing

**Implementation:** Textarea that parses pasted table and extracts Diminishing Value amounts

---

### Issue 3: Duplicate Function Definition
**Error:** `the name populateSpreadsheet is defined multiple times`

**Cause:** Function was accidentally defined twice in `googleDrive.ts`

**Resolution:** Removed duplicate definition (kept the first one at line 342)

**File:** `form-app/src/lib/googleDrive.ts`

---

### Issue 4: Invalid JWT Signature Error
**Error:** `invalid_grant: Invalid JWT Signature` when accessing Google Drive API

**Investigation:**
- Credentials format is valid (verified with test script)
- Sheets API works with same credentials
- Error occurs specifically when calling Drive API

**Root Cause:** Service account (`market-performance-api@property-packaging.iam.gserviceaccount.com`) likely doesn't have access to the Shared Drive

**Status:** ⚠️ **UNRESOLVED** - Needs verification that service account is added as member of Shared Drive `0AFVxBPJiTmjPUk9PVA`

**Next Steps:**
1. Verify service account is member of Shared Drive
2. Check Shared Drive permissions
3. Ensure Drive API is enabled for the Google Cloud project

**Files Affected:**
- `form-app/src/lib/googleDrive.ts` - All Drive API calls fail
- `form-app/src/app/api/test-populate-sheets/route.ts` - Fails at folder copying step

---

### Issue 5: Server Port Conflicts
**Issue:** Dev server starting on port 3001 instead of 3000

**Cause:** Port 3000 already in use by another process

**Resolution:** Killed process on port 3000, restarted server

**Command Used:** `taskkill /F /PID <pid>`

---

## Code Structure

### File Organization

```
form-app/src/
├── app/
│   ├── test-sheets-population/
│   │   └── page.tsx          # Main test page with tabs
│   ├── washington-brown/
│   │   └── page.tsx          # Standalone WB page (also integrated as tab)
│   └── api/
│       └── test-populate-sheets/
│           └── route.ts     # API endpoint for folder copy & sheet population
├── lib/
│   ├── googleDrive.ts        # Drive API functions + populateSpreadsheet()
│   └── googleSheets.ts       # Sheets API functions
└── docs/
    └── Autopopulate-GoogleSheet-values-mapping.csv  # Field mapping documentation
```

---

## Key Constants & IDs

### Google Drive IDs
- **Shared Drive ID:** `0AFVxBPJiTmjPUk9PVA`
- **Master Template Folder:** `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5`
- **Properties Folder:** `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ`

### Service Account
- **Email:** `market-performance-api@property-packaging.iam.gserviceaccount.com`
- **Project:** `property-packaging`
- **Key ID:** `471ded19a26c8597742345aa62a5c1ab7f4f6a71` (from temp-credentials.txt)

### URLs
- **Washington Brown Calculator:** `https://www.washingtonbrown.com.au/depreciation/calculator/`
- **Test Page:** `http://localhost:3000/test-sheets-population`
- **Washington Brown Page:** `http://localhost:3000/washington-brown`

---

## Testing Instructions

### Testing Folder Copy & Sheet Population

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Sheets Population" tab
3. Verify default values:
   - Source Folder ID: Master Template
   - Destination Parent Folder ID: Properties folder
   - New Folder Name: "Test 1"
4. Review form data JSON (can be edited)
5. Click "Copy Folder & Populate Sheets"
6. Check results:
   - Should show folder link
   - Should list all sheets found
   - Should show success/failure for each sheet
7. Open the new folder in Google Drive
8. Open each sheet and check "Autofill data" tab - Column B should be populated

### Testing Washington Brown Integration

1. Navigate to `http://localhost:3000/test-sheets-population`
2. Click "Washington Brown Calculator" tab (default)
3. Verify property details are displayed at top
4. Use Washington Brown calculator in iframe
5. Copy the results table
6. Paste into "Paste Results Table" textarea
7. Verify Year 1-10 fields are automatically populated with Diminishing Value amounts
8. Values are stored in `formData.depreciation` object

---

## Known Limitations

1. **Manual Depreciation Entry:** Cannot automatically capture from Washington Brown widget due to cross-origin restrictions
2. **Shared Drive Access:** Service account may need to be added as member (JWT error suggests this)
3. **Field Mapping:** Some fields marked as "Needs verification" in CSV - should be tested with real data
4. **Error Handling:** JWT signature errors need better error messages to distinguish between credential issues and permission issues
5. **State Field Conversion:** ⚠️ **CRITICAL** - State field not converted to uppercase 3-letter format as required by CSV. Current implementation returns state as-is, which may break cashflow spreadsheet formulas.

---

## Next Steps / TODO

1. **Resolve JWT Signature Error:**
   - Verify service account is member of Shared Drive
   - Check Drive API is enabled
   - Test with working credentials if available

2. **Fix State Field Conversion (CRITICAL):**
   - Implement state conversion to uppercase 3-letter format (VIC, NSW, QLD, etc.)
   - Update `calculateValue()` function in `googleDrive.ts`
   - Test with various state formats (full names, lowercase, mixed case)
   - Verify cashflow spreadsheet formulas work correctly

3. **Verify Field Mappings:**
   - Test all fields marked "Needs verification" in CSV
   - Confirm conditional logic works correctly
   - Test with real property data

4. **Integrate into Main Form:**
   - Add Washington Brown tab to main property packaging form
   - Connect depreciation values to form submission
   - Ensure depreciation data is included in sheet population

5. **Error Handling Improvements:**
   - Better error messages for JWT/auth errors
   - Distinguish between credential issues and permission issues
   - Add retry logic for transient errors

6. **Documentation:**
   - Update main handover doc with new features
   - Document Shared Drive setup requirements
   - Create troubleshooting guide for common errors

---

## Related Files

- **Main Handover:** `HANDOVER-COMPLETE-2026-01-15.md`
- **Field Mapping:** `docs/Autopopulate-GoogleSheet-values-mapping.csv`
- **Test Credentials Script:** `form-app/test-credentials.js` (for debugging credentials)
- **Temp Credentials:** `form-app/temp-credentials.txt` (backup - contains service account JSON)

---

## Session Notes

### Key Decisions Made

1. **Tab Order:** Washington Brown tab appears first (before Sheets Population) as users need to get WB info before submitting
2. **Manual Entry:** Chose manual copy-paste over automatic capture due to cross-origin limitations
3. **Field Mapping:** Used dynamic "Autofill data" tab approach instead of hardcoded cell references
4. **Depreciation Format:** Stores as `year1`, `year2`, etc. in `formData.depreciation` object

### Code Quality Notes

- All functions have comprehensive error handling and logging
- Console logs added for debugging (can be removed in production)
- TypeScript types used throughout
- React hooks properly managed (useRef for values that shouldn't trigger re-renders)

---

## Contact & Support

For questions about this implementation, refer to:
- Main handover document: `HANDOVER-COMPLETE-2026-01-15.md`
- Field mapping CSV: `docs/Autopopulate-GoogleSheet-values-mapping.csv`
- Code comments in relevant files

---

**End of Handover Document**
