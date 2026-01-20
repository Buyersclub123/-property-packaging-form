# Stashproperty API Integration Plan

## Goal

Use Stashproperty API to automatically populate:
1. **Property Details:** Beds, Bath, Car, Land Size, etc.
2. **Risk Overlays:** Flood, Bushfire, Heritage, Biodiversity (for email template)

## API Information

**API Key:** `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

**Authentication:** API key in header (likely `X-API-Key` or `Authorization: Bearer`)

**Access:** Full account access to all Stashproperty data

**Restrictions:** 
- Cannot publish/use their proprietary data (e.g., flood risk grading)
- Can use property information and market performance data

---

## Integration Points

### Option 1: Make.com Module (Recommended)

**Location:** After Module 13 (GHL Get Record) or before Module 3 (Email Generation)

**Flow:**
```
Module 13 (GHL) → Module [NEW] (Stashproperty API) → Module 6 → Module 3
```

**What it does:**
1. Takes property address from GHL record
2. Calls Stashproperty API
3. Extracts property details and risk overlays
4. Passes data to Module 3 for email generation

### Option 2: Update Module 6

**Enhance existing Module 6** to call Stashproperty API when property address is available.

---

## Data Mapping

### Property Details (from Stashproperty API)

| Stashproperty Field | GHL Field | Email Template Field |
|---------------------|-----------|---------------------|
| Beds | `beds_primary` | Property Description → Bed |
| Baths | `baths_primary` | Property Description → Bath |
| Car Spaces | `car_spaces` | Property Description → Garage/Car-port/Car-space |
| Land Size | `land_size` | Property Description → Land Size |
| Built Year | `year_built` | Property Description → Built |
| Title Type | `title_type` | Property Description → Title |

### Risk Overlays (from Stashproperty API)

| Stashproperty Field | Email Template Field |
|---------------------|---------------------|
| Flooding Risk | Property Overlays → Flood |
| Bushfire Risk | Property Overlays → Bushfire |
| Heritage Risk | Property Overlays → Other (if applicable) |
| Biodiversity Risk | Property Overlays → Other (if applicable) |
| Zoning Code | Property Overlays → Zoning |
| Zoning Description | Property Overlays → Zoning (description) |

---

## API Endpoint Discovery

### Steps to Find Endpoint:

1. **Check Stashproperty Documentation:**
   - Look for API docs in "My Profile" section
   - Check for developer documentation

2. **Inspect Network Requests:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Use the Excel sheet to trigger a lookup
   - Find the API call in network requests
   - Note: URL, method (GET/POST), headers, request body

3. **Common API Patterns:**
   - `https://api.stashproperty.com.au/v1/property/{address}`
   - `https://stashproperty.com.au/api/property/lookup`
   - `https://api.stashproperty.com.au/property/search`

4. **Check Excel for Clues:**
   - Look at Apps Script code (if any)
   - Check for hardcoded URLs
   - Review network requests when Excel refreshes

---

## Make.com Implementation

### Module: HTTP - Make a Request

**Method:** GET or POST (depending on API)

**URL:** `[TO BE DETERMINED]`

**Headers:**
```
X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
Content-Type: application/json
```

**Query Parameters (if GET):**
```
address: {{6.property_address}}
```

**Request Body (if POST):**
```json
{
  "address": "{{6.property_address}}"
}
```

### Response Parsing

**Expected Response Format:** JSON (based on Excel "Raw JSON" column)

**Extract Fields:**
- Property details (beds, bath, car, land size)
- Risk overlays (flood, bushfire, heritage, biodiversity)
- Zoning information

### Data Mapping Module

After HTTP module, add a **Set Variables** or **Code** module to:
1. Parse JSON response
2. Map fields to GHL format
3. Format risk overlays for email template
4. Handle missing/null values

---

## Risk Overlay Formatting

### For Email Template:

**Current Format (from Training Manual):**
```
Property Overlays
• Zoning: GR (General Residential)
• Flood: No
• Bushfire: No
• Mining: No
• Other: No
• Special Infrastructure: No

Due Diligence Acceptance: Yes
```

### Mapping Logic:

```javascript
// Flood
if (floodingRisk === "High" || floodingRisk > 0) {
  floodStatus = "Yes";
} else {
  floodStatus = "No";
}

// Bushfire
if (bushfireRisk === "High" || bushfireRisk > 0) {
  bushfireStatus = "Yes";
} else {
  bushfireStatus = "No";
}

// Zoning
zoning = `${zoningCode} (${zoningDescription})`;
```

---

## Implementation Steps

### Phase 1: API Discovery
- [ ] Identify exact API endpoint
- [ ] Test API call with Postman/curl
- [ ] Verify response format
- [ ] Document required headers/parameters

### Phase 2: Make.com Integration
- [ ] Create HTTP module in Make.com
- [ ] Configure authentication (API key)
- [ ] Test with sample address
- [ ] Parse response JSON

### Phase 3: Data Mapping
- [ ] Map property details to GHL fields
- [ ] Format risk overlays for email template
- [ ] Handle edge cases (missing data, errors)
- [ ] Add error handling

### Phase 4: Integration with Existing Flow
- [ ] Add Stashproperty module after Module 13
- [ ] Update Module 6 to merge Stashproperty data
- [ ] Update Module 3 to use Stashproperty data
- [ ] Test end-to-end flow

### Phase 5: Testing
- [ ] Test with various addresses
- [ ] Verify property details populate correctly
- [ ] Verify risk overlays format correctly
- [ ] Test error scenarios (invalid address, API down)

---

## Error Handling

### Scenarios to Handle:

1. **Invalid Address:**
   - API returns error or no data
   - Fallback to manual entry or skip Stashproperty data

2. **API Rate Limits:**
   - If rate limited, queue request or retry later
   - Log error for monitoring

3. **Missing Fields:**
   - Some properties may not have all data
   - Use defaults or leave blank

4. **API Down:**
   - Timeout handling
   - Fallback to existing manual process

---

## Next Steps

1. **Identify API Endpoint:**
   - Check Stashproperty website for API docs
   - Inspect network requests from Excel
   - Contact Stashproperty support if needed

2. **Test API:**
   - Use Postman or curl to test endpoint
   - Verify authentication works
   - Document response structure

3. **Build Make.com Module:**
   - Once endpoint is known, create HTTP module
   - Test with sample address
   - Parse and map data

---

## Questions to Answer

1. **API Endpoint:** What's the exact URL?
2. **Authentication Method:** Header format? (`X-API-Key` vs `Authorization: Bearer`?)
3. **Request Format:** GET with query params? POST with JSON body?
4. **Response Format:** Exact JSON structure?
5. **Address Format:** How should address be formatted? (full address? components?)

---

**Created:** [Current Date]
**API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
**Status:** 🔍 API Endpoint Discovery Phase










