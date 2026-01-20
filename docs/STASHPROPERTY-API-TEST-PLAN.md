# Stashproperty API Test Plan

## API Key

**Your API Key:** `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

---

## API Endpoint

**URL:** `https://stashproperty.com.au/app/api/planning-info`

**Method:** `GET`

**Query Parameters:**
- `lat` - Latitude (e.g., `-24.883688961467872`)
- `lon` - Longitude (e.g., `152.3923265417891`)

---

## Test Authentication Methods

We'll try these authentication formats to see which one works:

### Method 1: Bearer Token (from Apps Script code)
```bash
Authorization: Bearer stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
```

### Method 2: Direct API Key
```bash
Authorization: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
```

### Method 3: X-API-Key Header
```bash
X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
```

---

## Test Commands

### Test 1: Bearer Token Format
```bash
curl -X GET "https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891" \
  -H "Authorization: Bearer stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891" \
  -H "Accept: application/json"
```

### Test 2: Direct API Key Format
```bash
curl -X GET "https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891" \
  -H "Authorization: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891" \
  -H "Accept: application/json"
```

### Test 3: X-API-Key Header Format
```bash
curl -X GET "https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891" \
  -H "X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891" \
  -H "Accept: application/json"
```

---

## Expected Response

If successful, you should see JSON like:
```json
[
  {
    "zone": "R1",
    "zoneDesc": "General Residential",
    "lga": "Sunshine Coast",
    "state": "QLD",
    "hazards": {
      "flooding": "...",
      "floodingRisk": "No",
      "bushfire": "...",
      "bushfireRisk": "Yes",
      ...
    },
    ...
  }
]
```

---

## Next Steps

1. **Test the API** with one of the methods above
2. **Share the result** (success or error message)
3. **Once we know which auth method works**, I'll create the Make.com integration

---

**Status:** 🔍 Ready to Test  
**API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891









