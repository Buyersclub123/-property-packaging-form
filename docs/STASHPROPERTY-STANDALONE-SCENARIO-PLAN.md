# Stashproperty Standalone Scenario - Integration Plan

## Overview

Create a **separate Make.com scenario** for Stashproperty data lookup that can be:
- Triggered by Property Package Submission form
- Called independently with an address
- Used to populate risk overlay data during property packaging

---

## Scenario Flow

```
Trigger (Webhook or Manual)
  ↓ Receives: property_address
Geoscape Geocoding
  ↓ Returns: lat, lon
Stashproperty API
  ↓ Returns: Planning info (risk overlays, zoning, etc.)
Parse Stashproperty Response
  ↓ Formats: Risk overlays, zoning, LGA, suburb
Store/Return Data
  ↓ Output: Formatted data ready for use
```

---

## Module 1: Trigger

### Option A: Webhook Trigger
**Type:** Webhook - Custom webhook

**Purpose:** Receive address from Property Package Submission form

**Input:**
```json
{
  "property_address": "4 Osborne Circuit Maroochydore QLD 4558"
}
```

### Option B: Manual Trigger
**Type:** Manual trigger

**Purpose:** Manual testing or one-off lookups

**Input:** Address field

---

## Module 2: Geoscape Geocoding

**Type:** HTTP - Make a Request

**URL:**
```
https://api.psma.com.au/v2/addresses/geocoder?address={{1.property_address}}
```

**Method:** `GET`

**Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`

**Response Structure:**
```json
{
  "features": [
    {
      "geometry": {
        "coordinates": [lon, lat]  // Note: [longitude, latitude]
      },
      "properties": {
        "localityName": "Maroochydore",  // Suburb
        "stateTerritory": "QLD",
        "postcode": "4558",
        ...
      }
    }
  ]
}
```

**Extract:**
- `lat`: `{{Geoscape.features[0].geometry.coordinates[1]}}`
- `lon`: `{{Geoscape.features[0].geometry.coordinates[0]}}`
- `suburb`: `{{Geoscape.features[0].properties.localityName}}`
- `state`: `{{Geoscape.features[0].properties.stateTerritory}}`
- `postcode`: `{{Geoscape.features[0].properties.postcode}}`

---

## Module 3: Stashproperty API

**Type:** HTTP - Make a Request

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat={{2.lat}}&lon={{2.lon}}
```

**Method:** `GET`

**Headers:**
- `Accept`: `application/json`
- `Cookie`: `last-active-user=...; accessToken=...; refreshToken=...; __session=...`

**⚠️ Token Management:** 
- Token expires, needs refresh
- See "Token Refresh" section below

---

## Module 4: Parse Stashproperty Response

**Type:** Code (JavaScript)

**Code:** Use `make-code-stashproperty-parser.js`

**Input:** `{{3.Data}}`

**Output:** Formatted risk overlays, zoning, LGA, etc.

---

## Module 5: Format Output

**Type:** Code (JavaScript) - Optional

**Purpose:** Combine Geoscape + Stashproperty data into final format

**Output:**
```javascript
{
  // From Geoscape
  address: input.property_address,
  suburb: geoscapeData.suburb,
  state: geoscapeData.state,
  postcode: geoscapeData.postcode,
  lat: geoscapeData.lat,
  lon: geoscapeData.lon,
  
  // From Stashproperty
  zone: stashData.zone,
  zoneDesc: stashData.zoneDesc,
  zoning: stashData.zoning,
  lga: stashData.lga,
  floodRisk: stashData.floodRisk,
  bushfireRisk: stashData.bushfireRisk,
  heritageRisk: stashData.heritageRisk,
  biodiversityRisk: stashData.biodiversityRisk,
  planningLinks: stashData.planningLinks,
  
  // Combined
  fullAddress: `${address}, ${suburb} ${state} ${postcode}`,
  lgaAndSuburb: `${stashData.lga}, ${geoscapeData.suburb}`
}
```

---

## Module 6: Store/Return Data

### Option A: Return via Webhook Response
**Type:** Webhook Response

**Purpose:** Return data to calling scenario/form

### Option B: Store in Google Sheets
**Type:** Google Sheets - Add a Row

**Purpose:** Log lookups for reference

### Option C: Both
**Purpose:** Return data AND log it

---

## Error Handling

### Geoscape Fails
- **Action:** Return error, allow manual entry
- **Message:** "Address not found. Please enter coordinates manually."

### Stashproperty API Fails
- **Action:** Return partial data (Geoscape only)
- **Flag:** `stashpropertyAvailable: false`
- **Message:** "Stashproperty data unavailable. Please enter risk overlays manually."

### Token Expired
- **Action:** Try to refresh token (if login endpoint found)
- **Fallback:** Return error, manual entry required

---

## Manual Entry Fallback

For new suburbs or when API fails, provide manual entry fields:

**Fields needed:**
- Zone
- Zone Description
- LGA
- Flood Risk (Yes/No)
- Bushfire Risk (Yes/No)
- Heritage Risk (Yes/No)
- Biodiversity Risk (Yes/No)
- Planning Scheme Links

**Integration:** These can be entered in Property Package Submission form and override API data.

---

## Token Refresh - Finding Login Endpoint

We need to find how to get fresh `accessToken` automatically.

### Method 1: Check Browser Network Tab During Login

**Steps:**
1. Open DevTools (F12) → Network tab
2. Clear requests
3. Go to: `https://stashproperty.com.au/auth/login`
4. Enter credentials and click Login
5. Watch for POST requests
6. Look for:
   - `/auth/login` (POST)
   - `/app/api/auth/login` (POST)
   - `/api/login` (POST)
   - `/app/api/session` (POST)
   - Any POST request that returns `accessToken`

### Method 2: Check Apps Script stashLogin Function

**If you find it:**
- Share the login endpoint URL
- Share the request format (body, headers)
- We'll replicate it in Make.com

### Method 3: Inspect Login Form

**Check:**
- Form action URL
- Form method (POST)
- Form fields (email, password)
- Any hidden fields

---

## Next Steps

1. **Find Login Endpoint** (see Token Refresh section above)
2. **Create Geoscape Module** (Module 2)
3. **Create Stashproperty API Module** (Module 3)
4. **Create Parse Module** (Module 4)
5. **Create Output Formatting** (Module 5)
6. **Set up Error Handling**
7. **Test with sample address**
8. **Integrate with Property Package Submission form**

---

## Questions to Answer

1. **How will Property Package Submission form trigger this?**
   - Webhook? Direct Make.com API call? Other?

2. **Where should the data be stored/returned?**
   - Google Sheets? GHL custom fields? Returned to form?

3. **What format does Property Package Submission form expect?**
   - JSON? Specific field names?

4. **Should we cache lookups?**
   - If same address looked up multiple times, use cached data?

---

**Status:** Planning Phase  
**Next:** Find login endpoint, then build scenario









