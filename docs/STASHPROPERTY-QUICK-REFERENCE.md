# Stashproperty Scenario - Quick Reference

## Module Numbers & Data Flow

```
Module 3: Webhook Trigger
  ↓ Output: property_address
Module 4: Geoscape Geocoding
  ↓ Input: {{3.property_address}}
  ↓ Output: features[0].geometry.coordinates[0] (lon), [1] (lat)
Module 5: Stashproperty Login
  ↓ Output: Headers (with Set-Cookie)
Module 6: Extract Tokens
  ↓ Input: {{5.Headers}} or {{5.Data.headers}}
  ↓ Output: cookieHeader
Module 1: Stashproperty API
  ↓ Input: {{4.features[0].geometry.coordinates[1]}} (lat)
  ↓ Input: {{4.features[0].geometry.coordinates[0]}} (lon)
  ↓ Input: {{6.cookieHeader}} (Cookie header)
  ↓ Output: Data (planning info array)
Module 7: Parse Response
  ↓ Input: {{1.Data}}
  ↓ Output: zone, lga, floodRisk, bushfireRisk, etc.
Module 8: Webhook Response
  ↓ Input: {{7}} (parsed data)
  ↓ Output: Returns to webhook caller
```

---

## Key Variable References

| Module | What It Uses | Variable Reference |
|--------|-------------|-------------------|
| Module 4 | Address from webhook | `{{3.property_address}}` |
| Module 6 | Headers from login | `{{5.Headers}}` or `{{5.Data.headers}}` |
| Module 1 | Latitude from Geoscape | `{{4.features[0].geometry.coordinates[1]}}` |
| Module 1 | Longitude from Geoscape | `{{4.features[0].geometry.coordinates[0]}}` |
| Module 1 | Cookie header | `{{6.cookieHeader}}` |
| Module 7 | API response | `{{1.Data}}` |
| Module 8 | Parsed data | `{{7}}` |

---

## Important Notes

1. **Geoscape coordinates:** `[longitude, latitude]` format
   - `coordinates[0]` = Longitude (use for `lon`)
   - `coordinates[1]` = Latitude (use for `lat`)

2. **Module 1 is your existing module** - it keeps its number but runs after Module 6

3. **Format Output is optional** - Module 7 already formats data well

4. **Module 8 uses `{{7}}`** - Direct output from Parse module

---

**Quick Check:** Verify each module's input variables match the table above!

