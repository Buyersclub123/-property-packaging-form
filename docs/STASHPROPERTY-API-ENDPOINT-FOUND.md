# Stashproperty API Endpoint - DISCOVERED ✅

## API Endpoint Found!

From your Google Sheets Apps Script code, we found the Stashproperty API endpoint.

---

## Primary API Endpoint

### Planning Info API

**URL:** `https://stashproperty.com.au/app/api/planning-info`

**Method:** `GET`

**Query Parameters:**
- `lat` - Latitude (decimal, e.g., `-24.883688961467872`)
- `lon` - Longitude (decimal, e.g., `152.3923265417891`)

**Full URL Example:**
```
https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891
```

**Headers:**
```
Authorization: Bearer {access_token}
Accept: application/json
```

**Response:** JSON object with planning information including:
- `zone` - Zoning code
- `zoneDesc` - Zoning description
- `lga` - Local Government Area
- `state` - State
- `hazards` - Object with:
  - `flooding` - Flooding summary
  - `floodingRisk` - Flooding risk level
  - `bushfire` - Bushfire summary
  - `bushfireRisk` - Bushfire risk level
  - `heritageRisk` - Heritage risk
  - `biodiversityRisk` - Biodiversity risk
- `heritage` - Heritage information
- `biodiversity` - Biodiversity information
- `lotSize` - Lot size information
- `openSpace` - Open space information
- `links` - Array of planning scheme links
- `disclaimers` - Array of disclaimers

---

## Authentication

The Apps Script code uses:
1. **`stashLogin()` function** - Gets an access token
2. **Token stored** in `PropertiesService.getScriptProperties()` as `STASH_ACCESS`
3. **Bearer token** format: `Authorization: Bearer {token}`

**Note:** We need to find the `stashLogin()` function to understand:
- How to authenticate
- Whether it uses your API key: `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`
- Or if it uses username/password

---

## Additional Endpoints Found

### Geoscape Geocoding API (for address → lat/lon)

**URL:** `https://api.psma.com.au/v2/addresses/geocoder`

**Method:** `GET`

**Query Parameters:**
- `address` - Full address string

**Headers:**
```
Authorization: VfqDRW796v5jGTfXcHgJXDdoGi7DENZA
Accept: application/json
```

**Response:** GeoJSON with coordinates

---

### WMS (Web Map Service) Endpoints

**Base URL:** `https://geoserver.stashproperty.com.au/geoserver/ows`

**Layers Available:**
- `stash:flooding` - Flood overlay
- `stash:easement` - Easement overlay
- `stash:biodiversity` - Biodiversity overlay
- `stash:infrastructure_power` - Power infrastructure
- `stash:infrastructure_power_line` - Power lines
- `stash:dgi_distressed` - DGI Distressed
- `stash:dgi_downsizer` - DGI Downsizer
- `stash:dgi_renovator` - DGI Renovator
- `stash:dgi_splitter` - DGI Splitter
- `stash:sa1_heatmap` - SA1 heatmap data

**Note:** These are for map overlays, not property details.

---

## Next Steps

### 1. Find Authentication Method

We need to locate the `stashLogin()` function in your Apps Script to understand:
- How to get the access token
- Whether it uses your API key or username/password
- Token expiration/refresh logic

**Check:** Look for `StashQuickDemo.gs` file or search for `stashLogin` function in your Apps Script.

### 2. Test the API

Once we have authentication, test with:
```bash
curl -X GET "https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891" \
  -H "Authorization: Bearer {your_token}" \
  -H "Accept: application/json"
```

### 3. Create Make.com Integration

After authentication is confirmed, I'll create:
- HTTP module configuration
- Data parsing module
- Integration into existing flow

---

## Important Notes

1. **Address → Coordinates:** We'll need to geocode addresses first (using Geoscape API or another service)
2. **Authentication:** The API uses Bearer token, not API key directly
3. **Property Details:** This endpoint returns planning/risk overlays, but we may need another endpoint for property details (beds, baths, etc.)

---

**Status:** ✅ API Endpoint Found  
**Next:** Find `stashLogin()` function for authentication details









