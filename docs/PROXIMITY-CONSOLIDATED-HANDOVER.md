# Proximity Feature - Consolidated Implementation Handover

**Date:** 2026-01-XX  
**Status:** ✅ COMPLETE - Shelved for integration later  
**Reference:** `.cursor/Rules` and `.cursor/Rules2` - Critical working rules for AI assistants  
**Previous Document:** `PROXIMITY-ISOLATED-TESTING-HANDOVER.md` (pre-consolidation)

---

## Executive Summary

This document covers the **consolidated proximity feature** that combines all 9 category endpoints into a single unified endpoint. All proximity results now use **Google Maps Distance Matrix API** for accurate drive distances with Wednesday 9 AM traffic estimates.

**Current Status:**
- ✅ Consolidated endpoint complete and tested
- ✅ All results use Google Maps drive distances (not Haversine/crow flight)
- ✅ Baseline output verified with multiple test addresses
- ⏸️ **SHELVED** - Integration into main form (page 5-6) on hold until folder creation and cashflow sheet writing are complete

---

## Deployment Status

### Development (Current)
- **Test Page URL:** `http://localhost:3000/test-all-categories`
- **API Endpoint:** `http://localhost:3000/api/geoapify/proximity`
- **Status:** ✅ Working in dev environment
- **Access:** Local development only

### Production
- **Status:** ❌ Not deployed
- **Note:** Feature is complete but shelved. Will be integrated into main form after other priorities are complete.

---

## Code Locations

### Main Consolidated Endpoint
- **File:** `property-review-system/form-app/src/app/api/geoapify/proximity/route.ts`
- **Status:** ✅ Complete
- **Purpose:** Single endpoint that handles all proximity categories

### Test Page (UI)
- **File:** `property-review-system/form-app/src/app/test-all-categories/page.tsx`
- **Status:** ✅ Complete
- **Purpose:** Standalone test page for testing consolidated endpoint

### Legacy Test Endpoints (Reference Only)
- **Location:** `property-review-system/form-app/src/app/api/geoapify/test-*/route.ts`
- **Status:** ⚠️ Deprecated - Logic moved to consolidated endpoint
- **Note:** These endpoints still exist but are not actively used. Consider removing after integration is complete.

### Data Files
- **Airports:** `property-review-system/docs/Airport-List.txt` (26 airports, 3 tiers)
- **Cities:** `property-review-system/docs/City-List.txt` (31 cities, 3 tiers)

---

## Agreed Rules & Requirements

### Output Format
- **Single combined list**, sorted by distance (closest first)
- **No section headings** (no "Airports:", "Schools:", etc.)
- **No starting address** at top
- **Format:** `Distance (time), Name [Category if missing]`
- **Example:** `169 m (1 min), Lewisham Train Station`

### Category Name Appending Rules
- **Append category name ONLY if missing** (e.g., "Train Station", "Kindergarten", "Childcare")
- Only append if confident it's that category (trust Geoapify data)
- If name doesn't contain category word → append it
- **Examples:**
  - `"15 Smith Street"` → `"15 Smith Street Kindergarten"`
  - `"Trinity Grammar School Infants"` → stays as is (already has "School")
  - `"Woolworths"` → `"Woolworths Supermarket"`

### AIRPORTS & CAPITAL CITIES (Same Logic)
- **Tier 3 closest** → show Tier 3 + Tier 1
- **Tier 2 closest** → show Tier 2 + Tier 1  
- **Tier 1 closest** → show Tier 1 + closest from Tier 2 & 3
- **Distance Method:** Google Maps Distance Matrix API (Wednesday 9 AM departure time)
- **Traffic Model:** `best_guess` with `duration_in_traffic`

### TRAIN STATIONS
- Use only `public_transport.train` category (exclude `railway.train` fallback)
- Include Tram stations (max 10km) using `public_transport.tram` category
- Filter single-word names like "Koala" (likely infrastructure, not stations)
- Exclude railway societies/clubs/modellers (e.g., "Sunshine Railway Modellers Society")
- Must contain "station", "stop", or "interchange" to be valid (or trust `public_transport.train` category)
- Append "Train Station" only if name doesn't contain "station" or "train"
- **Note:** Filtering is generic and location-agnostic (works across Australia)

### KINDERGARTEN & CHILDCARE
- Combine into one category (show 3-4 total combined)
- Append category name only if missing
- Filter childcare to exclude kindergartens (avoid duplicates)

### SUPERMARKETS
- Always show closest (even if not Woolworths/Coles/IGA/Aldi)
- Plus all 4 chains (Woolworths, Coles, IGA, Aldi) if found
- Append "Supermarket" suffix if missing (e.g., "Woolworths" → "Woolworths Supermarket")

### HOSPITALS
- Prioritize Emergency Department hospitals when possible
- Exclude specialty hospitals (rehabilitation, psychiatric, psychology clinics)
- Ensure at least one ED hospital included if available
- Returns up to 2 hospitals total

### SCHOOLS
- Returns 3 closest schools
- Append "School" if missing in name

### BUS STOPS
- Returns closest bus stop
- Append "Bus Stop" if missing in name

---

## Distance Calculation Method

### ✅ ALL RESULTS USE GOOGLE MAPS

**Important:** All proximity results (including Geoapify categories) now use **Google Maps Distance Matrix API** for drive distances, NOT Haversine formula (crow flight).

**Implementation:**
- **Function:** `getDistancesFromGoogleMapsCoordinates()` in `proximity/route.ts`
- **Batching:** Max 25 destinations per API call (automatic batching)
- **Departure Time:** Next Wednesday 9 AM (calculated dynamically)
- **Traffic Model:** `best_guess`
- **Mode:** `driving`
- **Duration:** Uses `duration_in_traffic` when available, falls back to `duration`

**Categories Using Google Maps:**
- ✅ Airports (hardcoded list + Google Maps)
- ✅ Capital Cities (hardcoded list + Google Maps)
- ✅ Train Stations (Geoapify + Google Maps)
- ✅ Bus Stops (Geoapify + Google Maps)
- ✅ Schools (Geoapify + Google Maps)
- ✅ Supermarkets (Geoapify + Google Maps)
- ✅ Hospitals (Geoapify + Google Maps)
- ✅ Kindergarten (Geoapify + Google Maps)
- ✅ Childcare (Geoapify + Google Maps)

**Note for Packagers:** All distances shown are **drive distances** based on Wednesday 9 AM traffic conditions. This provides realistic travel time estimates for weekday morning commutes.

---

## Data Source Disclaimer

**Disclaimer Text (Already in Code/UI):**
```
*Data provided by Geoapify Places API and Google Maps Distance Matrix API. Distances and times are estimates.
```

**Location:**
- **API Response:** Included in `proximity` field and `disclaimer` field
- **Test Page UI:** Displayed below results (line 123 in `test-all-categories/page.tsx`)

**Purpose:** 
- Attribution to data sources
- Sets expectations that distances/times are estimates
- Protects against liability for inaccurate data

---

## Baseline Test Results

**Status:** ✅ Working baseline established  
**Test Addresses Verified:**
- `4 osborne circuit marrochydore` ✅
- `15 barker street Lewisham NSW` ✅
- `5 acacia street point vernon QLD` ✅
- `19 Holcomb St Elizabeth East SA` ✅

**Verified Features:**
- ✅ Train stations: Filtered to exclude societies/clubs/modellers (e.g., "Sunshine Railway Modellers Society")
- ✅ Supermarkets: Append "Supermarket" suffix if missing (e.g., "Woolworths" → "Woolworths Supermarket")
- ✅ Airports & Cities: Use Google Maps Distance Matrix API (drive distances with Wednesday 9 AM traffic)
- ✅ All Geoapify results: Use Google Maps drive distances (not Haversine)
- ✅ Single combined list, sorted by distance
- ✅ Category names appended when missing
- ✅ Disclaimer displayed in UI

---

## Environment Variables

**Required Environment Variables:**
```env
GEOAPIFY_API_KEY=61cf69f5359f4d5197a72214a78164c9
NEXT_PUBLIC_GEOSCAPE_API_KEY=VfqDRW796v5jGTfXcHgJXDdoGi7DENZA
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

**Optional (with defaults):**
```env
GEOAPIFY_API_BASE_URL=https://api.geoapify.com/v2/places
PSMA_API_ENDPOINT=https://api.psma.com.au/v2/addresses/geocoder
GOOGLE_MAPS_API_BASE_URL=https://maps.googleapis.com/maps/api/distancematrix/json
```

**Vercel Setup:**
- All environment variables should be added to Vercel:
  - Production environment
  - Preview environment
  - Development environment

**Note:** No hardcoded API keys remain in the code. All endpoints check for environment variables and throw errors if missing.

---

## API Request/Response Format

### Request Format
```json
{
  "propertyAddress": "15 Barker Street Lewisham NSW",
  "latitude": -33.9123,  // Optional
  "longitude": 151.1654  // Optional
}
```

### Response Format
```json
{
  "success": true,
  "proximity": "169 m (1 min), Lewisham Train Station\n...\n\n*Data provided by Geoapify Places API and Google Maps Distance Matrix API. Distances and times are estimates.",
  "results": [
    {
      "name": "Lewisham Train Station",
      "distance": 169,
      "category": "train_station",
      "formattedLine": "169 m (1 min), Lewisham Train Station"
    },
    ...
  ],
  "count": 25,
  "coordinates": { "lat": -33.9123, "lon": 151.1654 },
  "disclaimer": "Data provided by Geoapify Places API and Google Maps Distance Matrix API. Distances and times are estimates."
}
```

---

## Technical Implementation Details

### Geocoding
- **API:** Geoscape Geocoding API v2
- **Endpoint:** `https://api.psma.com.au/v2/addresses/geocoder`
- **Authentication:** API key in `Authorization` header
- **Response:** Returns coordinates as `[lon, lat]` array

### Geoapify Places API
- **API:** Geoapify Places API v2
- **Base URL:** `https://api.geoapify.com/v2/places`
- **Key Parameters:**
  - `categories`: Comma-separated list of Geoapify categories
  - `limit`: Maximum results (typically 50-100)
  - `filter`: `circle:lon,lat,radius` (radius in meters)
  - `bias`: `proximity:lon,lat` (for proximity sorting)
- **URL Encoding:** `filter` and `bias` parameters are NOT URL-encoded (appended directly to URL)

### Google Maps Distance Matrix API
- **API:** Google Maps Distance Matrix API
- **Base URL:** `https://maps.googleapis.com/maps/api/distancematrix/json`
- **Key Parameters:**
  - `origins`: Origin coordinates (`lat,lon`)
  - `destinations`: Pipe-separated (`|`) list of destination coordinates (`lat,lon`)
  - `departure_time`: Unix timestamp (seconds) for Wednesday 9 AM
  - `traffic_model`: `best_guess`
  - `mode`: `driving`
- **Batching:** API allows max 25 destinations per request, so all results are automatically batched
- **Traffic:** Uses `duration_in_traffic` when available, falls back to `duration`

### Key Functions

**`getDistancesFromGoogleMapsCoordinates()`**
- **Location:** `proximity/route.ts` (lines 218-289)
- **Purpose:** Batch Geoapify places and get Google Maps drive distances
- **Parameters:** `originLat`, `originLon`, `destinations[]` (array of `{lat, lon}`)
- **Returns:** Array of `{distance, duration}` in meters and seconds
- **Batching:** Automatically handles batching (25 per API call)

**`getNextWednesday9AM()`**
- **Location:** `proximity/route.ts` (lines 200-216)
- **Purpose:** Calculate next Wednesday 9 AM timestamp
- **Returns:** Unix timestamp in seconds

**`formatDistanceTime()`**
- **Location:** `proximity/route.ts` (lines 179-199)
- **Purpose:** Format distance (meters) and duration (seconds) for display
- **Parameters:** `distanceMeters`, `durationSeconds` (optional)
- **Returns:** `{distance: string, time: string}` (e.g., `{distance: "1.2 km", time: "3 mins"}`)

**`appendCategoryName()`**
- **Location:** `proximity/route.ts` (lines 290-330)
- **Purpose:** Append category name to place name if missing
- **Parameters:** `name: string`, `category: string`
- **Returns:** Formatted name with category appended if needed

---

## Error Handling & Fallback Behavior

### No Fallback Logic
**Important:** The system has **NO fallback logic**. If Google Maps API fails or is not configured:
- Those results are **skipped** (not returned)
- No Haversine fallback
- No error messages in output
- System continues with other categories that succeed

**Rationale:** 
- Ensures all distances are accurate drive distances
- Prevents mixing drive distances with crow flight distances
- If API fails, manual process required (packager calculates manually)

### Error Detection
- **Missing API Key:** Endpoint throws error on startup
- **API Failure:** Results for that category are skipped (logged to console)
- **Geocoding Failure:** Returns error response (address not found)

---

## Next Steps (When Ready for Integration)

### Integration into Main Form
1. **Add to Step 5 or Step 6** (Proximity step)
2. **Background Processing:** Can process while user fills other steps (runs on page 5-6)
3. **Display:** Show results in proximity textarea (same format as current manual entry)
4. **Error Handling:** Show error message if API fails (allow manual entry fallback)

### Before Integration
- ✅ Folder creation complete
- ✅ Cashflow sheet writing complete
- ⏳ Property Form Failure Points Discussion (identify manual fallback processes)

---

## Known Issues & Resolutions

### Issue 1: Train Station False Positives
**Problem:** Geoapify sometimes returns non-stations (e.g., "Sunshine Railway Modellers Society", "Koala")
**Resolution:** ✅ Fixed - Filtering logic excludes societies/clubs/modellers and known problematic single-word names
**Status:** ✅ Resolved

### Issue 2: Supermarket Names Missing "Supermarket"
**Problem:** Some supermarket names don't include "Supermarket" suffix
**Resolution:** ✅ Fixed - `appendCategoryName()` function appends "Supermarket" if missing
**Status:** ✅ Resolved

### Issue 3: Distance Method Inconsistency
**Problem:** Some results used Haversine (crow flight), others used Google Maps (drive distance)
**Resolution:** ✅ Fixed - All results now use Google Maps Distance Matrix API
**Status:** ✅ Resolved

---

## Testing Instructions

### Test the Consolidated Endpoint

1. **Start Dev Server:**
   ```bash
   cd property-review-system/form-app
   npm run dev
   ```

2. **Navigate to Test Page:**
   - URL: `http://localhost:3000/test-all-categories`

3. **Enter Test Address:**
   - Example: `15 barker street Lewisham NSW`
   - Or: `4 osborne circuit marrochydore`

4. **Click "Test All Categories"**
   - Results appear in single combined list
   - Sorted by distance (closest first)
   - Disclaimer shown at bottom

5. **Verify:**
   - All results show drive distances (not crow flight)
   - Category names appended when missing
   - Train stations filtered (no societies/clubs)
   - Supermarkets have "Supermarket" suffix
   - Disclaimer displayed

### Test API Directly

```bash
curl -X POST http://localhost:3000/api/geoapify/proximity \
  -H "Content-Type: application/json" \
  -d '{"propertyAddress": "15 barker street Lewisham NSW"}'
```

---

## References

### Documentation Files
- `property-review-system/docs/PROXIMITY-ISOLATED-TESTING-HANDOVER.md` - Pre-consolidation handover (reference only)
- `property-review-system/TODO-LIST.md` - Agreed rules (lines 266-331)
- `property-review-system/docs/Airport-List.txt` - Hardcoded airport list
- `property-review-system/docs/City-List.txt` - Hardcoded city list

### Rules Files
- `property-review-system/.cursor/Rules` - Critical working rules
- `property-review-system/.cursor/Rules2` - Additional working rules

### API Documentation
- **Geoapify Places API:** https://apidocs.geoapify.com/docs/places/#about
- **Geoscape Geocoding API:** https://developer.psma.com.au/apis/address-geocoder
- **Google Maps Distance Matrix API:** https://developers.google.com/maps/documentation/distance-matrix

---

## Summary

**What's Complete:**
- ✅ Consolidated endpoint (`/api/geoapify/proximity`)
- ✅ All results use Google Maps drive distances (Wednesday 9 AM traffic)
- ✅ All agreed rules implemented (filtering, category appending, tier logic)
- ✅ Test page working (`/test-all-categories`)
- ✅ Baseline verified with multiple addresses
- ✅ Disclaimer included in code and UI

**What's Next:**
- ⏸️ Integration into main form (page 5-6) - ON HOLD
- ⏳ Property Form Failure Points Discussion
- ⏳ Complete folder creation and cashflow sheet writing first

**Key Files:**
- Main endpoint: `form-app/src/app/api/geoapify/proximity/route.ts`
- Test page: `form-app/src/app/test-all-categories/page.tsx`
- Data files: `docs/Airport-List.txt`, `docs/City-List.txt`

---

**End of Handover Document**

**Last Updated:** 2026-01-XX  
**Status:** Complete and shelved for integration later
