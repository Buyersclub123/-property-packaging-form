# Stashproperty Standalone Scenario - Complete Setup Guide

## Overview

This is a **standalone Make.com scenario** for Stashproperty data lookup that:
- Takes a property address as input
- Geocodes it using Geoscape API
- Gets risk overlay data from Stashproperty API
- Returns formatted data ready for Property Package Submission form

---

## Scenario Flow

```
Module 1: Webhook Trigger (or Manual)
  ↓ Receives: property_address
Module 2: Geoscape Geocoding
  ↓ Returns: lat, lon, suburb, state, postcode
Module 3: Stashproperty Login
  ↓ Returns: accessToken, refreshToken (in cookies)
Module 4: Extract Tokens from Cookies
  ↓ Returns: cookieHeader ready for API
Module 5: Stashproperty API
  ↓ Returns: Planning info (risk overlays, zoning, etc.)
Module 6: Parse Stashproperty Response
  ↓ Formats: Risk overlays, zoning, LGA
Module 7: Format Final Output
  ↓ Combines: Geoscape + Stashproperty data
Module 8: Return/Store Data
  ↓ Output: Complete property data
```

---

## Module 1: Trigger

### Option A: Webhook Trigger (Recommended)

**Type:** Webhook - Custom webhook

**Purpose:** Receive address from Property Package Submission form

**Configuration:**
- Create webhook
- Copy webhook URL (use this in your form)

**Expected Input:**
```json
{
  "property_address": "4 Osborne Circuit Maroochydore QLD 4558"
}
```

### Option B: Manual Trigger

**Type:** Manual trigger

**Purpose:** Testing or one-off lookups

**Input Field:**
- `property_address` (Text)

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

**Parse Response:** Yes

**Extract Fields:**
- `lat`: `{{2.features[0].geometry.coordinates[1]}}`
- `lon`: `{{2.features[0].geometry.coordinates[0]}}`
- `suburb`: `{{2.features[0].properties.localityName}}`
- `state`: `{{2.features[0].properties.stateTerritory}}`
- `postcode`: `{{2.features[0].properties.postcode}}`

---

## Module 3: Stashproperty Login

**Type:** HTTP - Make a Request

**URL:** `https://stashproperty.com.au/auth/api/login`

**Method:** `POST`

**Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`

**Body (Raw JSON):**
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Parse Response:** Yes

**Important:** 
- Tokens are returned in `Set-Cookie` headers, not response body
- We'll extract them in the next module

---

## Module 4: Extract Tokens from Cookies

**Type:** Code (JavaScript)

**Code:** Copy from `make-code-stashproperty-login.js`

**Input:** `{{3.Headers}}` or `{{3.Data.headers}}`

**Output:**
- `accessToken`: JWT token
- `refreshToken`: Refresh token UUID
- `cookieHeader`: Ready-to-use Cookie header string

**Code:**
```javascript
// Get HTTP response headers
const headers = input.Headers || input.Data?.headers || input.headers || {};

// Extract Set-Cookie headers
const setCookieHeaders = headers['set-cookie'] || headers['Set-Cookie'] || [];

// Handle both array and string formats
let cookieArray = [];
if (Array.isArray(setCookieHeaders)) {
  cookieArray = setCookieHeaders;
} else if (typeof setCookieHeaders === 'string') {
  cookieArray = [setCookieHeaders];
}

// Extract tokens
let accessToken = null;
let refreshToken = null;
let lastActiveUser = null;

cookieArray.forEach(cookieString => {
  if (!cookieString) return;
  const parts = cookieString.split(';');
  if (parts.length > 0) {
    const [name, value] = parts[0].split('=').map(s => s.trim());
    if (name === 'accessToken' && value) accessToken = value;
    else if (name === 'refreshToken' && value) refreshToken = value;
    else if (name === 'last-active-user' && value) lastActiveUser = value;
  }
});

// Build Cookie header
let cookieHeader = '';
if (lastActiveUser) cookieHeader += `last-active-user=${lastActiveUser}; `;
if (refreshToken) cookieHeader += `refreshToken=${refreshToken}; `;
if (accessToken) cookieHeader += `accessToken=${accessToken};`;

return {
  accessToken: accessToken,
  refreshToken: refreshToken,
  lastActiveUser: lastActiveUser,
  cookieHeader: cookieHeader.trim()
};
```

---

## Module 5: Stashproperty API

**Type:** HTTP - Make a Request

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat={{2.lat}}&lon={{2.lon}}
```

**Method:** `GET`

**Headers:**
- `Accept`: `application/json`
- `Cookie`: `{{4.cookieHeader}}`

**Parse Response:** Yes

**Authentication Type:** `None` (we're using Cookie header manually)

---

## Module 6: Parse Stashproperty Response

**Type:** Code (JavaScript)

**Code:** Copy from `make-code-stashproperty-parser.js`

**Input:** `{{5.Data}}`

**Output:** Formatted risk overlays, zoning, LGA, etc.

---

## Module 7: Format Final Output (Optional)

**Type:** Code (JavaScript)

**Purpose:** Combine Geoscape + Stashproperty data

**Code:**
```javascript
const geoscape = input.Geoscape || input[2] || {};
const stash = input.Stashproperty_Parser || input[6] || {};

return {
  // Address info
  propertyAddress: input.property_address || geoscape.address || '',
  suburb: geoscape.suburb || '',
  state: geoscape.state || '',
  postcode: geoscape.postcode || '',
  lat: geoscape.lat || '',
  lon: geoscape.lon || '',
  
  // Stashproperty data
  zone: stash.zone || '',
  zoneDesc: stash.zoneDesc || '',
  zoning: stash.zoning || '',
  lga: stash.lga || '',
  floodRisk: stash.floodRisk || 'No',
  bushfireRisk: stash.bushfireRisk || 'No',
  heritageRisk: stash.heritageRisk || 'No',
  biodiversityRisk: stash.biodiversityRisk || 'No',
  planningLinks: stash.planningLinks || [],
  planningLink1: stash.planningLink1 || '',
  planningLink2: stash.planningLink2 || '',
  
  // Combined fields
  fullAddress: `${input.property_address || ''}, ${geoscape.suburb || ''} ${geoscape.state || ''} ${geoscape.postcode || ''}`.trim(),
  lgaAndSuburb: stash.lga && geoscape.suburb ? `${stash.lga}, ${geoscape.suburb}` : (stash.lga || geoscape.suburb || ''),
  
  // Status
  stashpropertyAvailable: !stash.error && stash.zone ? true : false,
  geoscapeAvailable: geoscape.lat && geoscape.lon ? true : false
};
```

---

## Module 8: Return/Store Data

### Option A: Webhook Response

**Type:** Webhook Response

**Body:** `{{7}}` (output from Module 7)

**Status Code:** `200`

### Option B: Google Sheets (Logging)

**Type:** Google Sheets - Add a Row

**Spreadsheet:** Your logging sheet

**Row Data:**
- `Timestamp`: `{{now}}`
- `Address`: `{{7.propertyAddress}}`
- `Suburb`: `{{7.suburb}}`
- `LGA`: `{{7.lga}}`
- `Zone`: `{{7.zone}}`
- `Flood Risk`: `{{7.floodRisk}}`
- `Bushfire Risk`: `{{7.bushfireRisk}}`
- `Status`: `{{7.stashpropertyAvailable}}`

---

## Error Handling

### Geoscape Fails
- **Action:** Return error with message
- **Output:** `{ error: true, errorMessage: "Address not found. Please enter coordinates manually." }`

### Login Fails
- **Action:** Return error
- **Output:** `{ error: true, errorMessage: "Stashproperty login failed. Please check credentials." }`

### Stashproperty API Fails
- **Action:** Return partial data (Geoscape only)
- **Output:** `{ ...geoscapeData, stashpropertyAvailable: false, errorMessage: "Stashproperty data unavailable" }`

---

## Testing

### Test 1: Manual Trigger
1. Use Manual trigger
2. Enter: `4 Osborne Circuit Maroochydore QLD 4558`
3. Run scenario
4. Check output

### Test 2: Webhook
1. Copy webhook URL
2. Send POST request:
   ```json
   {
     "property_address": "4 Osborne Circuit Maroochydore QLD 4558"
   }
   ```
3. Check response

---

## Integration with Property Package Submission Form

**How to call from form:**
1. Form submits address to webhook
2. Webhook triggers scenario
3. Scenario returns formatted data
4. Form populates fields with returned data

**Expected Response Format:**
```json
{
  "propertyAddress": "4 Osborne Circuit Maroochydore QLD 4558",
  "suburb": "Maroochydore",
  "state": "QLD",
  "postcode": "4558",
  "lat": "-26.65",
  "lon": "153.09",
  "zone": "R",
  "zoneDesc": "Rural",
  "zoning": "R (Rural)",
  "lga": "Bundaberg Regional",
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "heritageRisk": "No",
  "biodiversityRisk": "No",
  "planningLinks": [...],
  "stashpropertyAvailable": true
}
```

---

## Manual Entry Fallback

For new suburbs or when API fails, Property Package Submission form should have manual entry fields:

**Fields:**
- Zone (text)
- Zone Description (text)
- LGA (text)
- Flood Risk (Yes/No dropdown)
- Bushfire Risk (Yes/No dropdown)
- Heritage Risk (Yes/No dropdown)
- Biodiversity Risk (Yes/No dropdown)
- Planning Scheme Links (text, multiple)

**Logic:**
- If `stashpropertyAvailable: false`, show manual entry fields
- If `stashpropertyAvailable: true`, pre-fill fields but allow editing

---

## Next Steps

1. **Create scenario in Make.com** following modules above
2. **Test with sample address**
3. **Integrate webhook URL** into Property Package Submission form
4. **Set up error handling** for edge cases
5. **Document manual entry process** for packagers

---

**Status:** ✅ Ready to Build  
**Login Endpoint:** Found  
**All Modules:** Defined









