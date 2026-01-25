# Cities Implementation - Google Maps Distance Matrix API

## Overview

The capital cities endpoint has been completely rewritten to use a hardcoded list of major Australian cities and Google Maps Distance Matrix API for accurate road network distance and travel time calculations.

## Key Changes

### 1. Hardcoded City List
- **Source:** `property-review-system/docs/City-List.txt`
- **Total Cities:** 31 cities across 3 groups
- **Groups:**
  - **Group 1 (Primary Gateways):** 8 capital cities and major metropolises
  - **Group 2 (Secondary/Satellite Cities):** 10 significant urban areas
  - **Group 3 (Regional Service Hubs):** 13 major regional centers

### 2. Google Maps Distance Matrix API Integration
- **Replaces:** Geoapify Places API search
- **Benefits:**
  - Accurate road network distances (not straight-line)
  - Real traffic-aware travel times
  - Wednesday 9 AM departure time (consistent weekday morning traffic)
  - Returns **2 closest cities from each group** (6 total)

### 3. Implementation Details

#### City Data Structure
```typescript
interface City {
  name: string;        // City name
  state: string;        // State/Territory
  address: string;      // Full address for Google Maps geocoding
  group: 1 | 2 | 3;    // City category group
}
```

#### Distance Calculation
- Uses Google Maps Distance Matrix API
- **Departure Time:** Next Wednesday 9 AM (calculated dynamically)
- **Traffic Model:** `best_guess` (accounts for typical traffic)
- **Mode:** `driving`
- **Batching:** Handles 25 destinations per API call (we have 31 cities)

#### Output Format
Returns **2 closest cities from each group**:
- Group 1: 2 closest Primary Gateways
- Group 2: 2 closest Secondary/Satellite Cities
- Group 3: 2 closest Regional Service Hubs

Example output:
```
4 Osborne Circuit Maroochydore QLD
95.2 km (1 hour 15 mins), Brisbane, Queensland
210.5 km (2 hours 30 mins), Sydney, New South Wales
10.5 km (12 mins), Sunshine Coast, Queensland
45.3 km (38 mins), Gold Coast, Queensland
120.3 km (1 hour 25 mins), Mackay, Queensland
180.7 km (2 hours 5 mins), Bundaberg, Queensland
```

### 4. Beach Removed from Requirements
- **Removed from:** `proximity/route.ts` categories and `REQUIRED_AMENITIES`
- **Removed from:** Test page (`test-all-categories/page.tsx`)
- **Reason:** Cities now handled separately via hardcoded list + Google Maps

## Configuration Required

### Environment Variable
Add to `.env.local` in `form-app` directory (same as airports):

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Google Maps API Setup
1. **Enable APIs:** Distance Matrix API must be enabled in Google Cloud Console
2. **API Key:** Create or use existing API key with Distance Matrix API enabled
3. **Billing:** Ensure billing is enabled (Distance Matrix API is not free)

### API Costs
- **Distance Matrix API:** ~$0.005 per element
- **Our usage:** 31 cities = 31 elements per property
- **Cost per property:** ~$0.16 per city search
- **Note:** Google provides $200/month free credit

## Benefits Over Previous Implementation

1. **Accurate Results:** Always returns correct major cities (not random populated places)
2. **Road Network Distance:** Real driving distances, not straight-line
3. **Traffic-Aware Times:** Accounts for Wednesday 9 AM traffic conditions
4. **Consistent Output:** 2 cities from each category group (6 total)
5. **No Data Gaps:** Hardcoded list ensures all major cities are included
6. **Better Coverage:** Includes regional hubs, not just capital cities

## Testing

### Test Endpoint
```
POST /api/geoapify/test-capital-cities
```

### Request Body
```json
{
  "propertyAddress": "4 Osborne Circuit Maroochydore QLD",
  "latitude": -26.6584,  // Optional
  "longitude": 153.0930   // Optional
}
```

### Expected Response
```json
{
  "success": true,
  "capitalCities": "4 Osborne Circuit Maroochydore QLD\n95.2 km (1 hour 15 mins), Brisbane, Queensland\n...",
  "count": 6,
  "citiesByGroup": {
    "group1": [
      {
        "name": "Brisbane",
        "state": "Queensland",
        "distance": 95200,
        "duration": 4500
      },
      ...
    ],
    "group2": [...],
    "group3": [...]
  },
  "coordinates": {
    "lat": -26.6584,
    "lon": 153.0930
  }
}
```

## Notes

- **Wednesday 9 AM:** Departure time is calculated as the next Wednesday at 9 AM to ensure consistent weekday morning traffic estimates
- **Error Handling:** If Google Maps API fails, the endpoint returns an error with details
- **Geocoding:** Uses Geoscape API for address-to-coordinates conversion (if coordinates not provided)
- **Batching:** Automatically handles API batching for cities (25 per request)
- **Output:** Returns exactly 2 cities from each group (6 total), sorted by distance within each group

## Next Steps

1. ✅ City list hardcoded
2. ✅ Google Maps Distance Matrix API integrated
3. ✅ Wednesday 9 AM departure time implemented
4. ✅ Beach removed from requirements
5. ⏳ Add `GOOGLE_MAPS_API_KEY` to `.env.local` (if not already added)
6. ⏳ Test with various Australian addresses
7. ⏳ Monitor API usage and costs

## Related Files

- **City List:** `property-review-system/docs/City-List.txt`
- **Endpoint Code:** `property-review-system/form-app/src/app/api/geoapify/test-capital-cities/route.ts`
- **Original City List Source:** `C:\Users\User\.cursor\JT FOLDER\City List.txt`
- **Proximity Route:** `property-review-system/form-app/src/app/api/geoapify/proximity/route.ts` (beach removed)
