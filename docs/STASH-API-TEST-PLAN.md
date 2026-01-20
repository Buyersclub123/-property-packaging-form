# Stash API Test Plan

## Test Address
**Address:** `4 Osborne Circuit Maroochydore QLD 4558`

## Test Webhook
**URL:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`  
**Method:** `POST`  
**Request:**
```json
{
  "property_address": "4 Osborne Circuit Maroochydore QLD 4558"
}
```

## Test Steps

1. **Call webhook** with test address
2. **Capture full response** (including all fields)
3. **Document in Google Sheet** - Create sheet to store:
   - Request address
   - Response timestamp
   - All response fields
   - Raw data structures
   - Field mappings

## Google Sheet Structure

**Sheet Name:** "Stash API Test Results"

**Columns:**
- Timestamp
- Test Address
- Response Status (200/error)
- Error Message (if any)
- Coordinates (latitude, longitude)
- Zoning (zone, zoneDesc, zoning)
- LGA (lga, lgaPid, state)
- Flood Risk (floodRisk, floodingRisk, flooding)
- Bushfire Risk (bushfireRisk, bushfire)
- Heritage Risk (heritageRisk, heritage)
- Biodiversity Risk (biodiversityRisk, biodiversity)
- Lot Size (lotSizeMin, lotSizeAvg)
- Planning Links (planningLinks array)
- Raw Stash Data (full JSON)
- Raw Hazards (hazards object)
- Raw Sources (sources array)
- Other Available Fields (document any other fields we discover)

## What to Document

1. **Exact field names** and values from response
2. **LGA format** - exact string format (e.g., "Sunshine Coast Regional Council" vs "Sunshine Coast")
3. **Coordinates** - format and precision
4. **All available fields** - even if not currently used (for future reference)
5. **Data structures** - nested objects, arrays, etc.
6. **Error scenarios** - what happens if address is invalid, API fails, etc.

## Next Steps After Test

1. **Update Module 7** to include coordinates in output
2. **Map LGA format** to Google Sheet format
3. **Document all available fields** for future use
4. **Create field mapping** document (Stash API → Form fields)
5. **Update form integration** code with actual field names

## Integration Notes

- Form will call this webhook when user enters address
- Response will auto-populate: Flood, Bushfire, Zoning, LGA, State
- User can override any auto-populated values
- Mining, Other Overlay, Special Infrastructure remain manual







