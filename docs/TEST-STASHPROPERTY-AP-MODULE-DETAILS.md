# Test Stashproperty AP - Module Details

## Module 3: Webhooks (Custom webhook) - TRIGGER

**Webhook URL:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`

**Status:** ✅ URL received
**Note:** Request format will be inferred from Module 4

---

## Module 4: HTTP - First Stash API call

**Status:** ✅ Details received

**API Endpoint:** `https://api.psma.com.au/v2/addresses/geocoder`

**HTTP Method:** `GET`

**Request Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`

**Request Format:**
- Query parameter: `address=3.property_address`
- Uses `property_address` field from Module 3 (webhook)

**Inferred Module 3 Request Format:**
- Module 3 (webhook) expects: `{ "property_address": "123 Main St, Suburb, State" }`

---

## Module 9: Make Code - First processing

**Status:** ✅ Complete

**Purpose:** Extract lat/lon coordinates from Geoscape geocoder response

**Input:**
- Variable: `data` (from "4. Data" - Module 4 output)
- Code accesses: `input.geoscapeData` or `input`

**Processing:**
- Handles different input structures (Make.com wraps arrays in `{v: [...]}`)
- Extracts coordinates from `responseData.data.features[0].geometry.coordinates`
- Normalizes array structures

**Output:**
```json
{
  "longitude": <number>,
  "latitude": <number>,
  "coordinates": [<longitude>, <latitude>],
  "debug": {
    "hasGeoscapeData": <boolean>,
    "hasV": <boolean>,
    "vIsArray": <boolean>,
    "vLength": <number>,
    "hasResponseData": <boolean>,
    "hasData": <boolean>,
    "hasFeatures": <boolean>,
    "geoscapeDataKeys": [<array of keys>],
    "responseDataKeys": [<array of keys>]
  }
}
```

**Code:**
```javascript
// Extract lat/lon from Geoscape response
// Input is automatically provided by Make.com as input.geoscapeData

// Handle different input structures
let geoscapeData = input.geoscapeData || input || {};

// Make.com might wrap arrays in {v: [...]}
let responseData = null;
if (geoscapeData.v && Array.isArray(geoscapeData.v)) {
  responseData = geoscapeData.v[0];
} else if (Array.isArray(geoscapeData)) {
  responseData = geoscapeData[0];
} else {
  responseData = geoscapeData;
}

// Get coordinates array
let coordinates = [];
if (responseData?.data?.features?.[0]?.geometry?.coordinates) {
  coordinates = responseData.data.features[0].geometry.coordinates;
}

// Return lat and lon
return {
  longitude: coordinates[0] || null,
  latitude: coordinates[1] || null,
  coordinates: coordinates,
  debug: {
    hasGeoscapeData: !!geoscapeData,
    hasV: !!geoscapeData?.v,
    vIsArray: Array.isArray(geoscapeData?.v),
    vLength: geoscapeData?.v?.length,
    hasResponseData: !!responseData,
    hasData: !!responseData?.data,
    hasFeatures: !!responseData?.data?.features,
    geoscapeDataKeys: Object.keys(geoscapeData || {}),
    responseDataKeys: responseData ? Object.keys(responseData) : []
  }
};
```

---

## Module 5: HTTP - Second API call

**Status:** ✅ Complete

**Purpose:** Authenticate/login to Stash Property API

**API Endpoint:** `https://stashproperty.com.au/auth/api/login`

**HTTP Method:** `POST`

**Request Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `Origin`: `https://stashproperty.com.au/`

**Request Body (JSON):**
```json
{
  "email": "ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Authentication:** No authentication (credentials in body)

**Note:** This is a login call - does not use coordinates from Module 9. Authentication token will likely be used in subsequent modules.

---

## Module 6: Make Code - Second processing

**Status:** ✅ Complete

**Purpose:** Extract accessToken and refreshToken from Set-Cookie headers in login response

**Input:**
- Variable: `headers` (from "5. HTTP - Make a request [bundle]" - Module 5 output)

**Processing:**
- Handles Make.com wrapped array format: `[{name: "headers", value: {...}}]`
- Extracts Set-Cookie headers (case-insensitive search)
- Parses cookie strings to extract:
  - `accessToken`
  - `refreshToken`
  - `last-active-user`
- Builds Cookie header string for Stash Property API

**Output:**
```json
{
  "accessToken": "<token>",
  "refreshToken": "<token>",
  "lastActiveUser": "<value>",
  "cookieHeader": "last-active-user=<value>; refreshToken=<token>; accessToken=<token>",
  "cookies": {
    "last-active-user": "<value>",
    "refreshToken": "<token>",
    "accessToken": "<token>"
  },
  "rawHeaders": {...},
  "rawSetCookie": [...],
  "debugHttpResponse": {...}
}
```

**Code:**
```javascript
// Make.com Code Module - Extract Tokens from Login Response
// This module extracts accessToken and refreshToken from Set-Cookie headers

// Get HTTP response (from login HTTP module)
// Module 5 returns an array: [{data: {...}, headers: {...}}]
// But Make.com Code module wraps it: [{name: "headers", value: {data: {...}, headers: {...}}}]
let httpResponse = {};
if (Array.isArray(input) && input.length > 0) {
  // Check if it's wrapped format: [{name: "...", value: {...}}]
  if (input[0].value) {
    httpResponse = input[0].value;
  } else {
    httpResponse = input[0];
  }
} else if (input && typeof input === 'object') {
  httpResponse = input.value || input;
}

// Extract Set-Cookie headers - handle nested structure
// httpResponse structure might be: {headers: {data: {...}, headers: {...}}}
// OR: {data: {...}, headers: {...}}
// Try both structures
let headersObj = {};
if (httpResponse.headers && httpResponse.headers.headers) {
  // Nested structure: {headers: {headers: {...}}}
  headersObj = httpResponse.headers.headers || httpResponse.headers.Headers || {};
} else {
  // Direct structure: {headers: {...}}
  headersObj = httpResponse.headers || httpResponse.Headers || {};
}

// Get set-cookie array (search all keys case-insensitively)
let setCookieHeaders = [];
if (headersObj && typeof headersObj === 'object') {
  const headerKeys = Object.keys(headersObj);
  for (let key of headerKeys) {
    if (key.toLowerCase() === 'set-cookie') {
      const value = headersObj[key];
      if (Array.isArray(value)) {
        setCookieHeaders = value;
      } else if (value) {
        setCookieHeaders = [value];
      }
      break;
    }
  }
}

// Handle both array and string formats
let cookieArray = [];
if (Array.isArray(setCookieHeaders)) {
  cookieArray = setCookieHeaders;
} else if (typeof setCookieHeaders === 'string') {
  cookieArray = [setCookieHeaders];
} else if (setCookieHeaders) {
  cookieArray = [String(setCookieHeaders)];
}

// Extract tokens from cookies
let accessToken = null;
let refreshToken = null;
let lastActiveUser = null;

cookieArray.forEach(cookieString => {
  if (!cookieString) return;
  
  // Parse cookie string: "accessToken=value; Domain=...; Path=..."
  const parts = cookieString.split(';');
  if (parts.length > 0) {
    const [name, value] = parts[0].split('=').map(s => s.trim());
    
    if (name === 'accessToken' && value) {
      accessToken = value;
    } else if (name === 'refreshToken' && value) {
      refreshToken = value;
    } else if (name === 'last-active-user' && value) {
      lastActiveUser = value;
    }
  }
});

// Build Cookie header for Stashproperty API
let cookieHeader = '';
if (lastActiveUser) {
  cookieHeader += `last-active-user=${lastActiveUser}; `;
}
if (refreshToken) {
  cookieHeader += `refreshToken=${refreshToken}; `;
}
if (accessToken) {
  cookieHeader += `accessToken=${accessToken};`;
}

// Return tokens
return {
  accessToken: accessToken,
  refreshToken: refreshToken,
  lastActiveUser: lastActiveUser,
  cookieHeader: cookieHeader.trim(),
  // Also return individual cookies for easy access
  cookies: {
    'last-active-user': lastActiveUser,
    'refreshToken': refreshToken,
    'accessToken': accessToken
  },
  // Raw response for debugging
  rawHeaders: headersObj,
  rawSetCookie: setCookieHeaders,
  debugHttpResponse: httpResponse
};
```

---

## Module 1: HTTP - Third API call

**Status:** ✅ Complete

**Purpose:** Get planning info/risk overlays from Stash Property API using coordinates

**API Endpoint:** `https://stashproperty.com.au/app/api/planning-info`

**HTTP Method:** `GET`

**Query Parameters:**
- `lat`: Uses `9. result: latitude` (from Module 9)
- `lon`: Uses `9. result: longitude` (from Module 9)

**Full URL:** `https://stashproperty.com.au/app/api/planning-info?lat={latitude}&lon={longitude}`

**Request Headers:**
- `Accept`: `application/json`
- `Cookie`: Uses `6. result: cookieHeader` (from Module 6 - authentication cookies)

**Authentication:** No authentication (uses Cookie header for auth)

**Note:** This is the main API call that retrieves risk overlays (flood, bushfire, mining, etc.), zoning, LGA, and other planning information.

---

## Module 7: Make Code - Final processing

**Status:** ✅ Complete

**Purpose:** Parse Stashproperty Planning Info response and extract risk overlays, zoning, LGA, etc.

**Input:**
- Variable: `Data` (from "1.Data" - Module 1 output)

**Processing:**
- Handles array response structure: `response[0].data[0]`
- Extracts hazards, heritage, biodiversity, lot size, links
- Formats risk values (0 = "No", >0 = "Yes")
- Formats zoning as `{code} ({description})`
- Extracts planning links

**Output:**
```json
{
  "zone": "<zoning code>",
  "zoneDesc": "<zoning description>",
  "zoning": "<code> (<description>)",
  "lga": "<LGA name>",
  "state": "<state>",
  "lgaPid": "<LGA PID>",
  "floodRisk": "Yes" | "No",
  "floodingRisk": "Yes" | "No",
  "flooding": "<text>",
  "bushfireRisk": "Yes" | "No",
  "bushfire": "<text>",
  "heritageRisk": "Yes" | "No",
  "heritage": "<text>",
  "biodiversityRisk": "Yes" | "No",
  "biodiversity": "<text>",
  "floodingRiskValue": <number>,
  "bushfireRiskValue": <number>,
  "heritageRiskValue": <number>,
  "biodiversityRiskValue": <number>,
  "lotSizeMin": "<min lot size>",
  "lotSizeAvg": "<avg lot size>",
  "planningLinks": ["<link1>", "<link2>"],
  "planningLink1": "<first link>",
  "planningLink2": "<second link>",
  "rawStashData": {...},
  "rawHazards": {...},
  "rawSources": [...]
}
```

**Code:** See full code in SPECIFIC-MAKECOM-QUESTIONS.md

---

## Module 8: Webhooks - Response

**Status:** ✅ Complete

**Purpose:** Return final response to webhook caller

**HTTP Status:** `200`

**Response Body:** Returns output from Module 7 (`7. result`)

**Response Format:** Same as Module 7 output:
```json
{
  "zone": "<zoning code>",
  "zoneDesc": "<zoning description>",
  "zoning": "<code> (<description>)",
  "lga": "<LGA name>",
  "state": "<state>",
  "lgaPid": "<LGA PID>",
  "floodRisk": "Yes" | "No",
  "floodingRisk": "Yes" | "No",
  "flooding": "<text>",
  "bushfireRisk": "Yes" | "No",
  "bushfire": "<text>",
  "heritageRisk": "Yes" | "No",
  "heritage": "<text>",
  "biodiversityRisk": "Yes" | "No",
  "biodiversity": "<text>",
  "floodingRiskValue": <number>,
  "bushfireRiskValue": <number>,
  "heritageRiskValue": <number>,
  "biodiversityRiskValue": <number>,
  "lotSizeMin": "<min lot size>",
  "lotSizeAvg": "<avg lot size>",
  "planningLinks": ["<link1>", "<link2>"],
  "planningLink1": "<first link>",
  "planningLink2": "<second link>",
  "rawStashData": {...},
  "rawHazards": {...},
  "rawSources": [...]
}
```

**Note:** This is the final response returned to whoever calls the webhook URL (Module 3).

