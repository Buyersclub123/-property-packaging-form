# Adding Property Details (Beds/Bath/Car) to Make.com Scenario

## Problem
The `/app/api/planning-info` endpoint returns planning/risk overlay data but **does NOT include property details** (bedrooms, bathrooms, car spaces, land size, year built, title).

## Solution
We need to add a second API call to get property details from `/app/api/properties/{propertyId}`.

## Challenge
We need to find the property ID first. The planning-info response doesn't include it.

## Steps to Add Property Details

### Step 1: Find Property ID Search Endpoint

We need to test different possible endpoints to find the property ID:

**Option A: Try Stash search endpoint with coordinates**
- Add a new HTTP module after Module 4 (Geocoding)
- Try calling: `https://stashproperty.com.au/app/api/properties/search?lat={{4.latitude}}&lon={{4.longitude}}`
- Or: `https://stashproperty.com.au/app/api/search?lat={{4.latitude}}&lon={{4.longitude}}`
- Or: `https://stashproperty.com.au/app/api/properties?lat={{4.latitude}}&lon={{4.longitude}}`

**Option B: Use Nexu API to search**
- The property details JSON you shared came from `api.nexu.com.au`
- Try: `https://api.nexu.com.au/properties/search?address={{1.property_address}}`
- Or: `https://api.nexu.com.au/properties?lat={{4.latitude}}&lon={{4.longitude}}`

**Option C: Use address to search**
- Try: `https://stashproperty.com.au/app/api/properties/search?address={{1.property_address}}`

### Step 2: Extract Property ID

Once you find the search endpoint that works, extract the `id` field from the response.

### Step 3: Call Property Details Endpoint

Add another HTTP module to call:
- URL: `https://stashproperty.com.au/app/api/properties/{{propertyId}}`
- Method: GET
- Headers: Same as planning-info (Authorization: Bearer {token})

### Step 4: Merge Responses

Update Module 7 (Parser) to merge:
- Planning-info response (from Module 1)
- Property details response (from new module)

The parser already checks for `attributes.bedrooms`, `attributes.bathrooms`, `attributes.parkingSpaces`, `landArea`, `yearBuilt` in the response.

## Current Make.com Flow

```
Module 1: Webhook (receives address)
Module 2: Geoscape Geocoding (address → lat/lon)
Module 3: Stash Planning Info (lat/lon → planning/risk overlays)
Module 4: [NEW] Property Search (lat/lon → propertyId)
Module 5: [NEW] Property Details (propertyId → beds/bath/car)
Module 6: [NEW] Merge/Combine responses
Module 7: Parser (extract all fields)
Module 8: Webhook Response (return to frontend)
```

## Testing

1. Test each possible search endpoint in Make.com
2. Check which one returns a property `id` field
3. Once found, use that endpoint
4. Then call `/app/api/properties/{propertyId}` to get property details
5. The parser will automatically extract beds/bath/car from the merged response

## Next Steps

1. **Test search endpoints** - Try the endpoints listed above in Make.com
2. **Share which one works** - Once you find the working endpoint, share it
3. **I'll update the scenario** - I'll create the exact module configuration once we know the endpoint

## Alternative: Direct Nexu API

If Stash's search endpoint doesn't work, we can call Nexu API directly:
- Endpoint: `https://api.nexu.com.au/properties/search`
- Requires: API key (may need to get from Stash or use your own)
- Returns: Property details including `id`, `attributes.bedrooms`, etc.






