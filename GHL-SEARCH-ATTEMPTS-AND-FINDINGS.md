# GHL Search Attempts and Findings

## Goal
Search GHL Custom Objects by `property_address` field to check for duplicate addresses before creating new property records.

## GHL Configuration
- **Base URL:** `https://services.leadconnectorhq.com`
- **Custom Object ID:** `692d04e3662599ed0c29edfa`
- **Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **Bearer Token:** `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- **API Version:** `2021-07-28`
- **Field Name:** `property_address`
- **Field Type:** Text, Unique field, Searchable in UI

## What We Tried

### Attempt 1: POST /objects/search (CORRECT ENDPOINT - NEEDS RETRY)
- **URL:** `https://services.leadconnectorhq.com/objects/search` (Note: NOT /v2/objects/search)
- **Method:** POST
- **Headers:**
  - Authorization: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - Version: `2021-07-28`
- **Body (JSON):**
  ```json
  {
    "locationId": "UJWYn4mrgGodB7KZUcHt",
    "objectTypeId": "692d04e3662599ed0c29edfa",
    "query": "property_address:{{1.propertyAddress}}",
    "page": 1,
    "pageLimit": 10
  }
  ```
- **Initial Result:** 404 Not Found
- **Issue Identified:** 
  - Used `/v2/objects/search` instead of `/objects/search`
  - Pagination fields were strings (`"1"`, `"10"`) instead of numbers (`1`, `10`)
- **Status:** ⚠️ NEEDS RETRY WITH CORRECTED CONFIGURATION

### Attempt 2: GET with Filter Query Parameter
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records?filter[property_address]={{1.propertyAddress}}`
- **Method:** GET
- **Headers:**
  - Authorization: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - Version: `2021-07-28`
- **Result:** 404 Not Found
- **Error Message:** `"Cannot GET /objects/692d04e3662599ed0c29edfa/records?filter[property_address]=..."`

### Attempt 3: GET /v1/custom-objects/{objectId}/search
- **URL:** `https://services.leadconnectorhq.com/v1/custom-objects/692d04e3662599ed0c29edfa/search?property_address={{1.propertyAddress}}`
- **Method:** GET
- **Headers:**
  - Authorization: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - Version: `2021-07-28`
- **Result:** 404 Not Found

### Attempt 4: GET /objects/{objectId}/records/ with Query Parameters
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/`
- **Method:** GET
- **Query Parameters:**
  - `locationId`: `UJWYn4mrgGodB7KZUcHt`
  - `property_address`: `{{1.propertyAddress}}`
- **Headers:**
  - Authorization: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - Version: `2021-07-28`
- **Result:** 404 Not Found

### Previous Attempts (from handover document)
1. **GET /objects/{objectId}/records** - 404 (no list endpoint)
2. **GET /objects/{objectId}/records/search** - 404 (treated "search" as record ID)
3. **GET /objects/{objectId}/records?property_address={address}** - 404 (no query parameter support)
4. **POST /objects/search** - 404 (endpoint doesn't exist)

## What Works in GHL API

### ✅ Working Endpoints
1. **Get Record by ID:**
   - `GET /objects/{objectId}/records/{recordId}`
   - Used successfully in "GHL Property Review Submitted" scenario
   - Requires: record ID (not field value)

2. **Update Record by ID:**
   - `PUT /objects/{objectId}/records/{recordId}`
   - Used successfully in "Property Review Approval Webhook" scenario
   - Requires: record ID (not field value)

## Key Findings

### 1. GHL API Limitations
- **No Search Endpoint:** GHL custom objects API does not have a search/list endpoint
- **ID Required:** All operations require a record ID - cannot search by field values
- **No Field Filtering:** Cannot filter records by field values via API, even if field is:
  - Marked as searchable in UI
  - Marked as unique
  - A text field

### 2. Field Configuration
- `property_address` field is:
  - ✅ Searchable in GHL UI
  - ✅ Marked as unique (prevents duplicates on creation)
  - ❌ **NOT searchable via API**

### 3. UI vs API
- **UI Search:** Works in GHL interface when field is marked searchable
- **API Search:** Does NOT work - no equivalent API endpoint exists
- Making a field "searchable" in GHL settings only affects UI search, not API

## Current Make.com Scenario Status

### Scenario: "Check Address Duplicate"
- **Webhook URL:** `https://hook.eu1.make.com/fcjabbpzv88sya6twvn2pa8whalj2vei`
- **Status:** Configured with error handling, but cannot actually search GHL

### Flow:
1. **Module 1:** Custom Webhook - receives `propertyAddress` ✅
2. **Module 8:** Router - routes based on conditions
3. **Module 6:** HTTP Request - attempts GHL search ❌ (always returns 404)
4. **Module 9:** Router - routes based on HTTP status code
   - Route 1: If statusCode = 200 → Module 11 (success response)
   - Route 2 (fallback): If statusCode ≠ 200 → Module 10 (error response)
5. **Module 10/11:** Webhook Response - returns error message

### Current Response:
```json
{
  "exists": false,
  "matchingRecords": [],
  "error": "GHL search endpoint not available - proceeding without duplicate check"
}
```

## Correct Endpoint Configuration (Based on GHL Documentation)

### ✅ Correct Configuration for POST /objects/search
- **URL:** `https://services.leadconnectorhq.com/objects/search` (NOT /v2/objects/search)
- **Method:** POST
- **Headers:**
  - `Authorization`: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - `Version`: `2021-07-28`
- **Body (JSON):**
  ```json
  {
    "locationId": "UJWYn4mrgGodB7KZUcHt",
    "objectTypeId": "692d04e3662599ed0c29edfa",
    "query": "property_address:{{1.propertyAddress}}",
    "page": 1,
    "pageLimit": 10
  }
  ```
- **Key Points:**
  - Use `/objects/search` (not `/v2/objects/search`)
  - `page` and `pageLimit` must be **numbers**, not strings
  - `query` format: `"field_name:value"` (colon-separated)
  - Field must be marked as searchable in GHL UI

## Conclusion

**Attempt 1 used the correct endpoint structure but had two issues:**
1. Used `/v2/objects/search` instead of `/objects/search`
2. Pagination fields were strings instead of numbers

**Attempts 2, 3, 4 used incorrect methods (GET) or URL structures, which explains the 404 errors.**

**Status:** ⚠️ Attempt 1 needs to be retried with corrected configuration.

## Recommendations

### Option 1: Use GHL Workflows (Reactive)
- Create a GHL workflow that triggers when Property Review is created
- Workflow checks for duplicates and flags/prevents creation
- **Limitation:** Runs AFTER creation, not before

### Option 2: Contact GHL Support
- Ask if there's an API endpoint for searching custom objects by field values
- Request this feature if it doesn't exist
- May need to reference API documentation or feature requests

### Option 3: Accept Limitation
- Keep current error handling in place
- Rely on GHL's unique field constraint to prevent duplicates
- Handle duplicate errors when they occur (reactive approach)

### Option 4: Alternative Data Store
- Maintain a separate database/index of addresses
- Check against that before creating in GHL
- Sync with GHL records

## Next Steps
1. Document this limitation in project documentation
2. Decide on approach (workflow, support request, or accept limitation)
3. Update form to handle the current "cannot check" response appropriately

