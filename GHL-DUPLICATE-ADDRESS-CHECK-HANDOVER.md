# GHL Duplicate Address Check - Handover Document

## Goal
Check if a property address already exists in GHL custom objects before creating a folder. This prevents duplicate property records.

## Current Status
**Status:** In Progress - Search endpoint not working  
**Last Attempt:** HTTP module with filter query parameter  
**Blocking Issue:** GHL API doesn't support searching custom object records by field values

## What We're Trying to Do
When a user enters an address in Step 0 (Address & Risk) and clicks "Check Stash" or "Continue with Packaging", the form should:
1. Check if the address already exists in GHL custom objects
2. If duplicate found: Show alert with matching record details
3. If no duplicate: Proceed with folder creation

## Implementation Details

### Form Integration
- **File:** `src/components/steps/Step0AddressAndRisk.tsx`
- **API Route:** `src/app/api/ghl/check-address/route.ts`
- **Webhook URL:** `https://hook.eu1.make.com/fcjabbpzv88sya6twvn2pa8whalj2vei`
- **Integration Point:** 
  - Runs when "Check Stash" is clicked (after address verification)
  - Runs when "Continue with Packaging" is clicked

### Address Normalization
- **File:** `src/lib/addressNormalizer.ts`
- **Purpose:** Normalize addresses for consistent comparison
- **Handles:** Variations like "St" vs "Street", "QLD" vs "Queensland", etc.
- **Status:** Created and ready to use

## What We Learned

### GHL API Structure
- **Base URL:** `https://services.leadconnectorhq.com`
- **Custom Object ID:** `692d04e3662599ed0c29edfa`
- **Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **Bearer Token:** `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- **API Version:** `2021-07-28`

### Working Endpoints
1. **Get Record by ID:**
   - `GET /objects/{objectId}/records/{recordId}`
   - Used in: "GHL Property Review Submitted" scenario (module 13)
   - Works: ✅

2. **Update Record by ID:**
   - `PUT /objects/{objectId}/records/{recordId}`
   - Used in: "Property Review Approval Webhook" scenario (module 11)
   - Works: ✅

### Non-Working Endpoints (What We Tried)
1. **List All Records:**
   - `GET /objects/{objectId}/records`
   - Result: 404 - Endpoint doesn't exist

2. **Search Records:**
   - `GET /objects/{objectId}/records/search`
   - Result: 404 - Treated "search" as record ID

3. **Search with Query:**
   - `GET /objects/{objectId}/records?property_address={address}`
   - Result: 404 - Endpoint doesn't support query parameters

4. **POST Search:**
   - `POST /objects/search` or `/v2/objects/search`
   - Body: `{locationId, objectTypeId, query, page, pageLimit}`
   - Result: 404 - Endpoint doesn't exist

5. **Filter Query Parameter:**
   - `GET /objects/{objectId}/records?filter[property_address]={address}`
   - Status: Not yet tested (next step)

## Make.com Scenario Attempts

### Scenario: "GHL Check Address Webhook"
- **Webhook URL:** `https://hook.eu1.make.com/fcjabbpzv88sya6twvn2pa8whalj2vei`
- **Status:** Created but not working
- **Modules:**
  1. Webhook (module 1) - ✅ Works
  2. HTTP module (module 2/5/6) - ❌ All attempts failed

### Attempted Configurations
1. **HTTP Module - Direct GET:**
   - URL: `/objects/{objectId}/records`
   - Method: GET
   - Result: 404

2. **HTTP Module - With Query:**
   - URL: `/objects/{objectId}/records`
   - Method: GET
   - Query: `property_address={{1.propertyAddress}}`
   - Result: 404

3. **HTTP Module - POST Search:**
   - URL: `https://services.leadconnectorhq.com` (various paths)
   - Method: POST
   - Body: `{locationId, objectTypeId, query, page, pageLimit}`
   - Result: 404

4. **GoHighLevel Module:**
   - Tried to find "Search for CRM Objects" module
   - Result: Not available in Make.com's GHL integration

## Key Findings

### GHL API Limitations
- **No Search Endpoint:** GHL custom objects API doesn't have a search/list endpoint
- **ID Required:** All operations require a record ID
- **No Field Filtering:** Can't filter records by field values via API

### Make.com Integration
- **HTTP Module:** Works for known endpoints (GET by ID, PUT by ID)
- **GoHighLevel Module:** Limited to Contacts, Opportunities, Tasks - no Custom Objects support
- **Connection:** "My GoHighlevel Location" connection exists but doesn't auto-inject locationId for HTTP modules

## Next Steps

### Option 1: Test Filter Query Parameter (Current)
- **Action:** Test `GET /objects/{objectId}/records?filter[property_address]={address}`
- **Status:** Ready to test
- **If Works:** Implement in Make.com scenario

### Option 2: Enable Address Field as Searchable in GHL
- **Action:** In GHL settings, make `property_address` field searchable
- **Then:** Use Make.com's "Search for CRM Objects" module (if it supports custom objects)
- **Status:** Not yet verified if this works

### Option 3: Get All Records and Filter in Code
- **Action:** If GHL supports pagination, get all records and filter by address in Make.com code module
- **Challenge:** Need to find correct endpoint for listing records
- **Status:** Endpoint not found yet

### Option 4: Alternative Approach
- **Action:** Skip duplicate check, rely on GHL's unique constraint on address field
- **Trade-off:** Will get error when trying to create duplicate, but won't prevent it proactively
- **Status:** Not ideal but may be only option

## Code Changes Made

### 1. API Route Created
**File:** `src/app/api/ghl/check-address/route.ts`
- Calls Make.com webhook
- Handles errors gracefully (proceeds if check fails)
- Returns: `{success, exists, recordId?, error?}`

### 2. Form Integration
**File:** `src/components/steps/Step0AddressAndRisk.tsx`
- Added GHL check when "Check Stash" clicked
- Added GHL check when "Continue with Packaging" clicked
- Shows alert if duplicate found
- Logs to console for debugging

### 3. Address Normalization
**File:** `src/lib/addressNormalizer.ts`
- Created utility functions for address normalization
- Handles common variations and abbreviations
- Ready to use once search is working

## Environment Variables Needed
- `MAKE_GHL_CHECK_WEBHOOK_URL` - Make.com webhook URL (currently hardcoded in code)

## References
- **Working Scenario:** "GHL Property Review Submitted" (module 13 - GET by ID)
- **Working Scenario:** "Property Review Approval Webhook" (module 11 - PUT by ID)
- **Blueprint Files:** `C:\Users\User\.cursor\JT FOLDER\*.blueprint.json`

## Questions to Resolve
1. Does GHL support filtering custom objects by field values?
2. Is there a pagination endpoint to get all records?
3. Can the address field be made searchable in GHL settings?
4. Does Make.com's GoHighLevel integration support custom objects search?

## Notes
- All attempts to search/list records have failed with 404 errors
- The API clearly supports GET by ID and PUT by ID, but not search/list
- May need to contact GHL support or check latest API documentation
- Alternative: Use GHL workflows to handle duplicate detection



