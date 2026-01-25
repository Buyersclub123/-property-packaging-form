# Stashproperty API - Make.com Setup Guide

## ✅ API Response Structure Confirmed

The API returns data in this structure:
```json
[
  {
    "data": [
      {
        "state": "QLD",
        "lga": "Bundaberg Regional",
        "zone": "R",
        "zoneDesc": "Rural",
        "hazards": {
          "floodingRisk": 5,
          "bushfireRisk": 0,
          "heritageRisk": 0,
          "biodiversityRisk": 0,
          "flooding": "Localised DFE",
          "bushfire": "No bushfire known in this area",
          ...
        },
        ...
      }
    ]
  }
]
```

---

## Make.com Module Setup

### Module Flow:
```
Module 1 (Webhook)
  ↓
Module 13 (GHL Get Record)
  ↓
Module [NEW] (Geocode - IF needed) 
  ↓
Module [NEW] (Stashproperty API)
  ↓
Module [NEW] (Parse Stashproperty Response)
  ↓
Module 16 (Extract packager_approved)
  ↓
Module 6 (Preprocess + Merge Stashproperty)
  ↓
Module 3 (Generate Email)
```

---

## Step 1: Check if GHL Has Lat/Lon

**Question:** Does Module 13 (GHL Get Record) return `latitude` and `longitude` fields?

- **If YES:** Skip to Step 2 (Stashproperty API)
- **If NO:** Add geocoding module first (see Geocoding section below)

---

## Step 2: Stashproperty API Module

### Module Type: HTTP - Make a Request

**Location:** After Module 13 (or after geocoding if needed)

**Configuration:**

**URL:**
```
https://stashproperty.com.au/app/api/planning-info
```

**Method:** `GET`

**Query Parameters:**
- `lat`: `{{13.latitude}}` OR `{{geocode.lat}}`
- `lon`: `{{13.longitude}}` OR `{{geocode.lon}}`

**Headers:**
- `Accept`: `application/json`
- `Cookie`: `last-active-user=b6794945-e8ab-4f64-98b6-63e55976be06; _fw_crm_v=8ac3fc99-dcdd-4535-d9de-720bd1b579d0; refreshToken=2f8ae913-1515-4621-a05f-5c04b07aa77a; accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; first_session=...; __session=...`

**⚠️ Important:** The Cookie header needs to be updated with a fresh `accessToken` periodically (it expires).

**Authentication Type:** `None` (don't use API key authentication)

---

## Step 3: Parse Stashproperty Response Module

### Module Type: Code (JavaScript)

**Location:** After Stashproperty API module

**Code:** Copy from `make-code-stashproperty-parser.js`

**Input Variable:** `{{Stashproperty_API.Data}}` (or whatever you named the HTTP module)

**Output:** Returns formatted fields:
- `zone`, `zoneDesc`, `zoning`
- `lga`, `state`
- `floodRisk`, `bushfireRisk`, `heritageRisk`, `biodiversityRisk`
- `flooding`, `bushfire`, `heritage`, `biodiversity`
- `planningLinks`, `planningLink1`, `planningLink2`

---

## Step 4: Geocoding (If Needed)

If GHL doesn't have lat/lon, add geocoding before Stashproperty API:

### Option A: Geoscape API (from your Apps Script)

**Module Type:** HTTP - Make a Request

**URL:**
```
https://api.psma.com.au/v2/addresses/geocoder?address={{13.property_address}}
```

**Method:** `GET`

**Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`

**Parse Response:** Extract:
- `lat`: `{{Geoscape.features[0].geometry.coordinates[1]}}`
- `lon`: `{{Geoscape.features[0].geometry.coordinates[0]}}`

### Option B: Google Geocoding API

**Module Type:** HTTP - Make a Request

**URL:**
```
https://maps.googleapis.com/maps/api/geocode/json?address={{13.property_address}}&key={{YOUR_GOOGLE_API_KEY}}
```

**Method:** `GET`

**Parse Response:** Extract:
- `lat`: `{{Google.results[0].geometry.location.lat}}`
- `lon`: `{{Google.results[0].geometry.location.lng}}`

---

## Step 5: Update Module 6

Add code to merge Stashproperty data into the flow.

**Location:** In Module 6, after existing preprocessing logic

**Add this code:**
```javascript
// Merge Stashproperty data if available
const stashData = input.Stashproperty_Parser || input.Stashproperty || {};

if (stashData && !stashData.error && Object.keys(stashData).length > 0) {
  // Merge risk overlays (Stashproperty overwrites GHL if present)
  merged.flood_risk = stashData.floodRisk || stashData.floodingRisk || merged.flood_risk;
  merged.bushfire_risk = stashData.bushfireRisk || merged.bushfire_risk;
  merged.heritage_risk = stashData.heritageRisk || merged.heritage_risk;
  merged.biodiversity_risk = stashData.biodiversityRisk || merged.biodiversity_risk;
  
  // Merge zoning
  merged.zoning_code = stashData.zoning || stashData.zone || merged.zoning_code;
  merged.zoning_description = stashData.zoneDesc || merged.zoning_description;
  
  // Merge location
  merged.lga = stashData.lga || merged.lga;
  merged.state = stashData.state || merged.state;
  
  console.log("Module 6 - Merged Stashproperty data:", {
    flood: merged.flood_risk,
    bushfire: merged.bushfire_risk,
    zoning: merged.zoning_code
  });
}
```

---

## Step 6: Update Module 3

Module 3 should already use the risk overlay fields from Module 6. Verify it's reading:
- `input.flood_risk` or `input.floodingRisk`
- `input.bushfire_risk` or `input.bushfireRisk`
- `input.zoning_code` or `input.zoning`

---

## Token Refresh Strategy

**Problem:** The `accessToken` expires and needs to be refreshed.

**Options:**

1. **Manual Refresh (Temporary):**
   - Get fresh token from browser DevTools periodically
   - Update Cookie header in Make.com HTTP module

2. **Automatic Refresh (Future):**
   - Find the login endpoint
   - Create a login module that runs before Stashproperty API
   - Extract `accessToken` from login response
   - Use it in Cookie header

3. **Contact Stashproperty:**
   - Ask for API documentation
   - Request long-lived API key or token
   - Or ask for proper API authentication method

---

## Testing Checklist

- [ ] Module 13 returns lat/lon (or geocoding works)
- [ ] Stashproperty API module configured correctly
- [ ] Cookie header has valid accessToken
- [ ] Parse module extracts data correctly
- [ ] Module 6 merges Stashproperty data
- [ ] Module 3 uses Stashproperty data in emails
- [ ] Test with real property address
- [ ] Verify email output includes risk overlays

---

## Current Status

✅ **API Endpoint Found:** `/app/api/planning-info`  
✅ **Authentication Method:** Cookie header with `accessToken`  
✅ **Response Structure:** Confirmed and parsed  
✅ **Parser Module:** Created  
⏳ **Integration:** Ready to implement  
⚠️ **Token Refresh:** Needs solution

---

**Next Steps:**
1. Check if Module 13 has lat/lon
2. Add Stashproperty API module to Make.com scenario
3. Add Parse module
4. Update Module 6 to merge data
5. Test end-to-end









