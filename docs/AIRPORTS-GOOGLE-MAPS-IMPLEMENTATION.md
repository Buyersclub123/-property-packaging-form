# Airports Implementation - Google Maps Distance Matrix API

## Overview

The airports endpoint has been completely rewritten to use a hardcoded list of major Australian airports and Google Maps Distance Matrix API for accurate road network distance and travel time calculations.

## Key Changes

### 1. Hardcoded Airport List
- **Source:** `property-review-system/docs/Airport-List.txt`
- **Total Airports:** 26 airports across 3 groups
- **Groups:**
  - **Group 1 (Primary Gateways):** 7 major international hubs (SYD, MEL, BNE, PER, ADL, CNS, DRW)
  - **Group 2 (Secondary/Restricted International):** 10 airports with limited international services
  - **Group 3 (Major Domestic/Regional):** 9 regional hubs

### 2. Google Maps Distance Matrix API Integration
- **Replaces:** Geoapify Places API search
- **Benefits:**
  - Accurate road network distances (not straight-line)
  - Real traffic-aware travel times
  - Wednesday 9 AM departure time (consistent weekday morning traffic)
  - Returns closest airport from each group

### 3. Implementation Details

#### Airport Data Structure
```typescript
interface Airport {
  name: string;        // Full airport name
  code: string;        // IATA code (e.g., "SYD")
  address: string;     // Full address for Google Maps geocoding
  group: 1 | 2 | 3;    // Airport category group
}
```

#### Distance Calculation
- Uses Google Maps Distance Matrix API
- **Departure Time:** Next Wednesday 9 AM (calculated dynamically)
- **Traffic Model:** `best_guess` (accounts for typical traffic)
- **Mode:** `driving`
- **Batching:** Handles 25 destinations per API call (we have 26 airports)

#### Output Format
Returns **one closest airport from each group**:
- Group 1: Closest Primary Gateway
- Group 2: Closest Secondary/Restricted International
- Group 3: Closest Major Domestic/Regional

Example output:
```
4 Osborne Circuit Maroochydore QLD
10.5 km (12 mins), Sunshine Coast Airport (MCY)
95.2 km (1 hour 15 mins), Brisbane Airport (BNE)
12.3 km (14 mins), Whitsunday Coast Airport (PPP)
```

## Configuration Required

### Environment Variable
Add to `.env.local` in `form-app` directory:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Google Maps API Setup
1. **Enable APIs:** Distance Matrix API must be enabled in Google Cloud Console
2. **API Key:** Create or use existing API key with Distance Matrix API enabled
3. **Billing:** Ensure billing is enabled (Distance Matrix API is not free)

### API Costs
- **Distance Matrix API:** ~$0.005 per element
- **Our usage:** 26 airports = 26 elements per property
- **Cost per property:** ~$0.13 per airport search
- **Note:** Google provides $200/month free credit

## Benefits Over Previous Implementation

1. **Accurate Results:** Always returns correct major airports (not local/private airfields)
2. **Road Network Distance:** Real driving distances, not straight-line
3. **Traffic-Aware Times:** Accounts for Wednesday 9 AM traffic conditions
4. **Consistent Output:** One airport from each category group
5. **No Data Gaps:** Hardcoded list ensures all major airports are included

## Testing

### Test Endpoint
```
POST /api/geoapify/test-airports
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
  "airports": "4 Osborne Circuit Maroochydore QLD\n10.5 km (12 mins), Sunshine Coast Airport (MCY)\n95.2 km (1 hour 15 mins), Brisbane Airport (BNE)\n12.3 km (14 mins), Whitsunday Coast Airport (PPP)",
  "count": 3,
  "airportsByGroup": {
    "group1": {
      "name": "Brisbane Airport",
      "code": "BNE",
      "distance": 95200,
      "duration": 4500
    },
    "group2": {
      "name": "Sunshine Coast Airport",
      "code": "MCY",
      "distance": 10500,
      "duration": 720
    },
    "group3": {
      "name": "Whitsunday Coast Airport",
      "code": "PPP",
      "distance": 12300,
      "duration": 840
    }
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
- **Batching:** Automatically handles API batching for airports (25 per request)

## Next Steps

1. ✅ Airport list hardcoded
2. ✅ Google Maps Distance Matrix API integrated
3. ✅ Wednesday 9 AM departure time implemented
4. ⏳ Add `GOOGLE_MAPS_API_KEY` to `.env.local`
5. ⏳ Test with various Australian addresses
6. ⏳ Monitor API usage and costs

## Related Files

- **Airport List:** `property-review-system/docs/Airport-List.txt`
- **Endpoint Code:** `property-review-system/form-app/src/app/api/geoapify/test-airports/route.ts`
- **Original Airport List Source:** `C:\Users\User\.cursor\JT FOLDER\Airport List.txt`
