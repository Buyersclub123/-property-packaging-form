# Stashproperty → Make.com Integration Plan

## Overview

Integrate Stashproperty API into Make.com scenario to automatically populate:
1. **Property Details** (Beds, Bath, Car, Land Size) → GHL fields
2. **Risk Overlays** (Flood, Bushfire, Heritage, Biodiversity) → Email template

---

## Integration Flow

### Current Flow:
```
Module 1 (Webhook) → Module 13 (GHL Get Record) → Module 16 → Module 6 → Module 3 → ...
```

### Enhanced Flow:
```
Module 1 (Webhook) → Module 13 (GHL Get Record) → Module [NEW] (Stashproperty API) → Module 16 → Module 6 → Module 3 → ...
```

---

## Module: Stashproperty API Call

### Location: After Module 13 (GHL Get Record)

**Module Type:** HTTP - Make a Request

### Configuration:

**Method:** `GET`

**URL:** `https://stashproperty.com.au/app/api/planning-info`

**Query Parameters:**
```
lat: {{13.latitude}} OR {{geocoded_lat}}
lon: {{13.longitude}} OR {{geocoded_lon}}
```

**Headers:**
```
Authorization: Bearer stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
Accept: application/json
```

**Note:** If GHL doesn't have lat/lon, we'll need a geocoding step first (see below).

---

## Geocoding Step (If Needed)

If GHL record doesn't have latitude/longitude, add a geocoding module before Stashproperty API:

**Option 1: Use Geoscape API** (from Apps Script code)
- URL: `https://api.psma.com.au/v2/addresses/geocoder?address={{13.property_address}}`
- Header: `Authorization: VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- Extract: `features[0].geometry.coordinates` → `[lon, lat]`

**Option 2: Use Google Geocoding API** (if you have access)
- URL: `https://maps.googleapis.com/maps/api/geocode/json?address={{13.property_address}}&key={{GOOGLE_API_KEY}}`
- Extract: `results[0].geometry.location.lat` and `.lng`

---

## Module: Parse Stashproperty Response

### Location: After Stashproperty API Module

**Module Type:** Code (JavaScript)

### Purpose:
Extract and format data from Stashproperty API response.

### Code Structure:

```javascript
// Parse JSON response
const stashData = input.Data || input;

// Extract Property Details
const propertyDetails = {
  beds: stashData.beds || stashData.bedrooms || '',
  baths: stashData.baths || stashData.bathrooms || '',
  carSpaces: stashData.car_spaces || stashData.car_spots || stashData.garage || '',
  landSize: stashData.land_size || stashData.lot_size || '',
  builtYear: stashData.year_built || stashData.built_year || '',
  titleType: stashData.title_type || stashData.title || ''
};

// Extract Risk Overlays from planning-info API response
// Response is an array, so get first item
const planningData = Array.isArray(input.Data) && input.Data.length ? input.Data[0] : (input.Data || {});
const hazards = planningData.hazards || {};
const heritage = planningData.heritage || {};
const bio = planningData.biodiversity || {};

const riskOverlays = {
  flooding: hazards.floodingRisk || hazards.flooding || 'No',
  bushfire: hazards.bushfireRisk || hazards.bushfire || 'No',
  heritage: hazards.heritageRisk || heritage.heritage || 'No',
  biodiversity: hazards.biodiversityRisk || bio.Biodiversity || 'No',
  zoningCode: planningData.zone || '',
  zoningDescription: planningData.zoneDesc || ''
};

// Format Risk Overlays for Email Template
const formatRiskOverlay = (risk) => {
  if (!risk || risk === 'No' || risk === 'None' || risk === '-1.0') {
    return 'No';
  }
  if (risk === 'Yes' || risk === 'High' || risk > 0) {
    return 'Yes';
  }
  return 'No';
};

const formattedOverlays = {
  flood: formatRiskOverlay(riskOverlays.flooding),
  bushfire: formatRiskOverlay(riskOverlays.bushfire),
  heritage: formatRiskOverlay(riskOverlays.heritage),
  biodiversity: formatRiskOverlay(riskOverlays.biodiversity),
  zoning: riskOverlays.zoningCode && riskOverlays.zoningDescription 
    ? `${riskOverlays.zoningCode} (${riskOverlays.zoningDescription})`
    : riskOverlays.zoningCode || riskOverlays.zoningDescription || ''
};

// Return combined data
return {
  ...propertyDetails,
  ...formattedOverlays,
  rawStashData: stashData // Keep raw data for reference
};
```

---

## Update Module 6: Merge Stashproperty Data

### Current Module 6:
Preprocesses webhook data and handles portal vs. normal GHL requests.

### Enhancement:
Merge Stashproperty data into the data flow.

### Code Addition:

```javascript
// After existing Module 6 logic...

// Merge Stashproperty data if available
const stashPropertyData = input.Stashproperty_Data || input.Stashproperty || {};

if (stashPropertyData && Object.keys(stashPropertyData).length > 0) {
  // Merge property details (Stashproperty overwrites GHL if present)
  merged.beds_primary = stashPropertyData.beds || merged.beds_primary;
  merged.baths_primary = stashPropertyData.baths || merged.baths_primary;
  merged.car_spaces = stashPropertyData.carSpaces || merged.car_spaces;
  merged.land_size = stashPropertyData.landSize || merged.land_size;
  merged.year_built = stashPropertyData.builtYear || merged.year_built;
  merged.title_type = stashPropertyData.titleType || merged.title_type;
  
  // Add risk overlays
  merged.flood_risk = stashPropertyData.flood || merged.flood_risk;
  merged.bushfire_risk = stashPropertyData.bushfire || merged.bushfire_risk;
  merged.heritage_risk = stashPropertyData.heritage || merged.heritage_risk;
  merged.biodiversity_risk = stashPropertyData.biodiversity || merged.biodiversity_risk;
  merged.zoning_code = stashPropertyData.zoning || merged.zoning_code;
  
  console.log("Module 6 - Merged Stashproperty data:", {
    beds: merged.beds_primary,
    baths: merged.baths_primary,
    flood: merged.flood_risk,
    bushfire: merged.bushfire_risk
  });
}
```

---

## Update Module 3: Use Risk Overlays in Email Template

### Current Module 3:
Generates email body with property details and risk overlays.

### Enhancement:
Use Stashproperty risk overlay data if available.

### Code Addition (in Property Overlays section):

```javascript
// In Module 3, where Property Overlays are formatted...

// Use Stashproperty data if available, otherwise use GHL data
const floodStatus = input.flood_risk || input.flooding_risk || 'No';
const bushfireStatus = input.bushfire_risk || input.bushfire_risk || 'No';
const heritageStatus = input.heritage_risk || 'No';
const biodiversityStatus = input.biodiversity_risk || 'No';
const zoningInfo = input.zoning_code || input.zoning || '';

// Format for email template
const propertyOverlaysHtml = `
  <tr>
    <td class="col-label">Property Overlays</td>
    <td class="col-content">
      <div class="content-box">
        ${zoningInfo ? htmlLine("Zoning", zoningInfo) : ''}
        ${htmlLine("Flood", floodStatus === 'Yes' || floodStatus === 'High' ? 'Yes' : 'No')}
        ${htmlLine("Bushfire", bushfireStatus === 'Yes' || bushfireStatus === 'High' ? 'Yes' : 'No')}
        ${htmlLine("Mining", "No")}
        ${heritageStatus === 'Yes' || heritageStatus === 'High' ? htmlLine("Other", `Heritage: ${heritageStatus}`) : htmlLine("Other", "No")}
        ${biodiversityStatus === 'Yes' || biodiversityStatus === 'High' ? htmlLine("Other", `Biodiversity: ${biodiversityStatus}`) : ''}
        ${htmlLine("Special Infrastructure", "No")}
        ${htmlLine("Due Diligence Acceptance", "Yes")}
      </div>
    </td>
  </tr>
`;
```

---

## Data Flow Summary

```
Module 13 (GHL)
  ↓ property_address
Module [NEW] (Stashproperty API)
  ↓ API Response (JSON)
Module [NEW] (Parse Stashproperty)
  ↓ Formatted Data
Module 16 (Extract packager_approved)
  ↓
Module 6 (Preprocess + Merge Stashproperty)
  ↓ Merged Data (GHL + Stashproperty)
Module 3 (Generate Email)
  ↓ Uses Stashproperty data for:
     - Property Description (beds, bath, car, land size)
     - Property Overlays (flood, bushfire, zoning)
```

---

## Error Handling

### Scenarios:

1. **API Call Fails:**
   - Continue with GHL data only
   - Log error for monitoring
   - Don't block email generation

2. **Missing Fields:**
   - Use GHL data as fallback
   - Don't fail if Stashproperty data incomplete

3. **Invalid Address:**
   - API returns error
   - Continue with GHL data
   - Log warning

### Code Example:

```javascript
// In Stashproperty API module error handler
try {
  // API call
} catch (error) {
  console.log("Stashproperty API error:", error);
  // Return empty object so flow continues
  return {
    error: true,
    errorMessage: error.message,
    // Continue with empty data - Module 6 will use GHL data
  };
}
```

---

## Testing Checklist

- [ ] API endpoint identified and tested
- [ ] Make.com HTTP module configured
- [ ] Authentication works (API key accepted)
- [ ] Response parsed correctly
- [ ] Property details extracted (beds, bath, car, land size)
- [ ] Risk overlays extracted (flood, bushfire, heritage, biodiversity)
- [ ] Data merged correctly in Module 6
- [ ] Email template uses Stashproperty data
- [ ] Fallback to GHL data works if API fails
- [ ] Error handling works correctly

---

## Next Steps

1. **Test API Authentication** (See `STASHPROPERTY-API-TEST-PLAN.md`)
   - Test if API key works with `Bearer` prefix
   - Or try direct API key format
   - Verify which authentication method works

2. **Check GHL Data**
   - Does Module 13 return `latitude` and `longitude`?
   - If yes → Use directly in Stashproperty API
   - If no → Add geocoding step first

3. **Create Make.com Modules**
   - HTTP module for Stashproperty API call
   - Code module to parse response
   - Update Module 6 to merge data
   - Update Module 3 to use risk overlays

4. **Test End-to-End**
   - Test with sample property
   - Verify data flows correctly
   - Check email output

5. **Deploy to Production**

---

## API Endpoint Found ✅

**URL:** `https://stashproperty.com.au/app/api/planning-info`  
**Method:** `GET`  
**Parameters:** `lat`, `lon` (latitude/longitude)  
**Authentication:** `Authorization: Bearer {api_key}` (to be tested)

**Note:** This endpoint returns planning/risk overlay data. For property details (beds, baths, etc.), we may need to check if GHL already has this data or find another Stashproperty endpoint.

---

**Status:** ✅ API Endpoint Found - Ready to Test Authentication  
**API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891  
**Next:** Test API authentication method


