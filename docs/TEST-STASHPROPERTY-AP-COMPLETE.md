# Test Stashproperty AP - Complete Module Flow

## Overview

**Scenario Name:** "Test Stashproperty AP"  
**Purpose:** Get risk overlays, zoning, and LGA data from Stash Property API based on property address  
**Webhook URL:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`

---

## Complete Flow

### Module 3: Webhooks (TRIGGER)
**Webhook URL:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`  
**Request Format:**
```json
{
  "property_address": "123 Main St, Suburb, State"
}
```

---

### Module 4: HTTP - Geocode Address
**Endpoint:** `https://api.psma.com.au/v2/addresses/geocoder`  
**Method:** `GET`  
**Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`
**Query:** `?address={property_address}`  
**Returns:** Geocoded coordinates

---

### Module 9: Make Code - Extract Coordinates
**Input:** Module 4 output  
**Output:**
```json
{
  "longitude": <number>,
  "latitude": <number>,
  "coordinates": [<longitude>, <latitude>]
}
```

---

### Module 5: HTTP - Login to Stash Property
**Endpoint:** `https://stashproperty.com.au/auth/api/login`  
**Method:** `POST`  
**Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `Origin`: `https://stashproperty.com.au/`
**Body:**
```json
{
  "email": "ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```
**Returns:** Authentication cookies (Set-Cookie headers)

---

### Module 6: Make Code - Extract Tokens
**Input:** Module 5 headers  
**Output:**
```json
{
  "accessToken": "<token>",
  "refreshToken": "<token>",
  "lastActiveUser": "<value>",
  "cookieHeader": "last-active-user=<value>; refreshToken=<token>; accessToken=<token>"
}
```

---

### Module 1: HTTP - Get Planning Info
**Endpoint:** `https://stashproperty.com.au/app/api/planning-info`  
**Method:** `GET`  
**Query Parameters:**
- `lat`: Module 9 latitude
- `lon`: Module 9 longitude
**Headers:**
- `Accept`: `application/json`
- `Cookie`: Module 6 cookieHeader
**Returns:** Planning info with risk overlays

---

### Module 7: Make Code - Parse Planning Info
**Input:** Module 1 output  
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

---

### Module 8: Webhooks - Response
**HTTP Status:** `200`  
**Response Body:** Module 7 output  
**Returns:** Final JSON response to caller

---

## How to Call from New Form

**Endpoint:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`  
**Method:** `POST`  
**Request:**
```json
{
  "property_address": "123 Main St, Suburb, State"
}
```

**Response:**
```json
{
  "zone": "...",
  "zoning": "...",
  "lga": "...",
  "state": "...",
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "heritageRisk": "No",
  "biodiversityRisk": "No",
  // ... other fields
}
```

---

## Field Mapping to Form Fields

| Stash API Field | Form Field | Notes |
|----------------|------------|-------|
| `floodRisk` / `floodingRisk` | `flood` | "Yes" or "No" |
| `bushfireRisk` | `bushfire` | "Yes" or "No" |
| `heritageRisk` | `heritage` | May map to `other_overlay`? |
| `biodiversityRisk` | `biodiversity` | May map to `other_overlay`? |
| `zoning` | `zoning` | Full format: "CODE (Description)" |
| `lga` | `lga` | For Investment Highlights lookup |
| `state` | `state` | State code |
| `mining` | `mining` | ⚠️ Not explicitly extracted - need to check |
| `other_overlay` | `other_overlay` | ⚠️ May map from heritage/biodiversity? |
| `special_infrastructure` | `special_infrastructure` | ⚠️ Not explicitly extracted - need to check |

---

## Notes

1. **Authentication:** Login happens once per scenario execution (Module 5), tokens extracted (Module 6), used in Module 1
2. **Coordinates:** Geocoded in Module 4, extracted in Module 9, used in Module 1
3. **Missing Fields:** `mining`, `other_overlay`, and `special_infrastructure` are not explicitly extracted. Need to check if they're in `rawStashData` or `rawHazards`
4. **Error Handling:** Module 7 returns error object if no planning data found
5. **Response Time:** Multiple API calls (geocode + login + planning info) - may take several seconds

---

## Integration Points

- **New Form:** Call Module 3 webhook with `property_address`
- **Response:** Use Module 8 response to populate form fields
- **Error Handling:** Check for `error: true` in response
- **Coordinates:** Available from Module 9 if needed (not in final response)







