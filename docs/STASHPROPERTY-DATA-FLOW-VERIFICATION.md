# Stashproperty Scenario - Data Flow Verification

## Module Flow with Actual Numbers

```
Module 3: Webhook Trigger
  ↓
Module 4: Geoscape Geocoding  
  ↓
Module 5: Stashproperty Login
  ↓
Module 6: Extract Tokens
  ↓
Module 1: Stashproperty API (existing, updated)
  ↓
Module 7: Parse Response
  ↓
Module 8: Webhook Response
```

---

## Data Flow Verification

### Module 3: Webhook Trigger
**Input:** None (receives webhook POST)
**Output:** 
- `property_address` = Address from webhook body

**Verify:** When you test, check that `{{3.property_address}}` contains the address

---

### Module 4: Geoscape Geocoding
**Input:** 
- URL parameter: `{{3.property_address}}`

**Output:**
- `features[0].geometry.coordinates[0]` = **Longitude** (use for `lon`)
- `features[0].geometry.coordinates[1]` = **Latitude** (use for `lat`)
- `features[0].properties.localityName` = Suburb
- `features[0].properties.stateTerritory` = State
- `features[0].properties.postcode` = Postcode

**Verify:** 
- Check Module 4 output has `features` array
- Check `features[0].geometry.coordinates` exists
- Coordinates format: `[lon, lat]` (longitude first!)

---

### Module 5: Stashproperty Login
**Input:** None (hardcoded credentials)
**Output:**
- `Headers` = Response headers object
- OR `Data.headers` = Response headers object
- Contains: `Headers['set-cookie']` or `Headers['Set-Cookie']` = Array of cookie strings

**Verify:**
- Check Module 5 output
- Look for `Headers` or `Data.headers`
- Should contain `set-cookie` or `Set-Cookie` with cookie strings

---

### Module 6: Extract Tokens
**Input:** 
- Map `{{5.Headers}}` OR `{{5.Data.headers}}` to code input
- Check Module 5 output to see which format is available

**Code Input Variable:**
```javascript
const input = input || {};
const httpResponse = input.Data || input;
const headers = httpResponse.headers || httpResponse.Headers || {};
```

**Output:**
- `cookieHeader` = `"last-active-user=...; refreshToken=...; accessToken=..."`
- `accessToken` = JWT token string
- `refreshToken` = UUID string

**Verify:**
- Check Module 6 output
- `cookieHeader` should be a string starting with `last-active-user=`
- Should contain `accessToken=` with a long JWT token

---

### Module 1: Stashproperty API
**Input:**
- URL lat parameter: `{{4.features[0].geometry.coordinates[1]}}` ⚠️ **Index [1] = Latitude**
- URL lon parameter: `{{4.features[0].geometry.coordinates[0]}}` ⚠️ **Index [0] = Longitude**
- Cookie header: `{{6.cookieHeader}}`

**Output:**
- `Data` = Array with planning info
- Structure: `[{ data: [{ zone, hazards, lga, ... }] }]`

**Verify:**
- Check Module 1 output
- Should have `Data` array
- `Data[0].data[0]` should contain `zone`, `hazards`, `lga`, etc.

---

### Module 7: Parse Response
**Input:**
- Map `{{1.Data}}` to code input

**Code Input Variable:**
```javascript
const input = input || {};
const apiResponse = input.Data || input;
```

**Output:**
- `zone`, `zoneDesc`, `zoning`
- `lga`, `state`
- `floodRisk`, `bushfireRisk`, `heritageRisk`, `biodiversityRisk`
- `planningLinks`, `planningLink1`, `planningLink2`

**Verify:**
- Check Module 7 output
- Should have `zone`, `lga`, `floodRisk`, etc.
- Risk values should be "Yes" or "No"

---

### Module 8: Webhook Response
**Input:**
- Body: `{{7}}` (parsed data from Module 7)

**Output:**
- Returns data to webhook caller

**Verify:**
- Response should contain all parsed fields
- Can be used by Property Package Submission form

---

## Common Issues & Fixes

### Issue: Module 4 can't find `{{3.property_address}}`
**Fix:** Check webhook body format. Make sure webhook receives:
```json
{
  "property_address": "4 Osborne Circuit Maroochydore QLD 4558"
}
```

### Issue: Module 6 can't extract tokens
**Fix:** Check Module 5 output format:
- Try `{{5.Headers}}` first
- If not available, try `{{5.Data.headers}}`
- Check if cookies are in `set-cookie` or `Set-Cookie` key

### Issue: Module 1 gets wrong coordinates
**Fix:** Remember Geoscape returns `[lon, lat]`:
- `coordinates[0]` = Longitude
- `coordinates[1]` = Latitude
- Use `[1]` for lat, `[0]` for lon

### Issue: Module 7 can't parse data
**Fix:** Check Module 1 output structure:
- Should be array: `[{ data: [...] }]`
- Or might be: `{ data: [...] }`
- Parser handles both, but check console logs

---

## Testing Each Module

### Test Module 3 (Webhook):
1. Click "Run once"
2. Enter: `property_address = "4 Osborne Circuit Maroochydore QLD 4558"`
3. Check output has `property_address` field

### Test Module 4 (Geoscape):
1. Check it receives `{{3.property_address}}`
2. Check output has `features[0].geometry.coordinates`
3. Verify coordinates are numbers (not null)

### Test Module 5 (Login):
1. Check output has `Headers` or `Data.headers`
2. Look for `set-cookie` or `Set-Cookie` key
3. Should contain cookie strings

### Test Module 6 (Extract Tokens):
1. Check input is mapped correctly (`{{5.Headers}}` or `{{5.Data.headers}}`)
2. Check output has `cookieHeader` string
3. Should start with `last-active-user=`

### Test Module 1 (Stashproperty API):
1. Check URL uses `{{4.features[0].geometry.coordinates[1]}}` and `[0]`
2. Check Cookie header uses `{{6.cookieHeader}}`
3. Check output has `Data` array

### Test Module 7 (Parse):
1. Check input is `{{1.Data}}`
2. Check output has `zone`, `lga`, `floodRisk`, etc.

### Test Module 8 (Response):
1. Check body uses `{{7}}`
2. Response should contain all parsed fields

---

**Status:** Ready for Verification  
**Next:** Test each module and verify data flow









