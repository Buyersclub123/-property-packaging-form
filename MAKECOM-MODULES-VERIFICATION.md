# Make.com Modules Verification Checklist

## Modules That Need Code

Based on the "Test Stashproperty AP" scenario, these modules have code:

### ✅ Module 7: Make Code - Parse Stashproperty Planning Info
**File:** `code/make-code-stashproperty-parser.js`
**Status:** ✅ Code exists and appears correct
**Verification:** Based on your response, this is working correctly!

**What to check in Make.com:**
1. Open Module 7
2. Verify the code matches `make-code-stashproperty-parser.js`
3. Check output - should have: floodRisk, bushfireRisk, zoning, lga, state

---

### ✅ Module 9: Make Code - Extract Coordinates
**File:** `code/make-code-extract-coordinates.js`
**Purpose:** Extract lat/lon from Geoscape geocoder response

**What to check in Make.com:**
1. Open Module 9
2. Verify the code matches `make-code-extract-coordinates.js`
3. Check output - should have: latitude, longitude, coordinates

---

### ✅ Module 6: Make Code - Extract Tokens
**File:** `code/make-code-module-6.js`
**Purpose:** Extract accessToken, refreshToken, cookieHeader from login response

**What to check in Make.com:**
1. Open Module 6
2. Verify the code matches `make-code-module-6.js`
3. Check output - should have: accessToken, refreshToken, cookieHeader

---

## Modules That Don't Need Code (HTTP/Webhook)

### Module 3: Webhooks (Trigger)
**Type:** Webhook
**No code needed** - just configuration
**Check:** URL is `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`

### Module 4: HTTP - Geocoder
**Type:** HTTP Request
**No code needed** - just configuration
**Check:** 
- Endpoint: `https://api.psma.com.au/v2/addresses/geocoder`
- Method: GET
- Headers: Authorization token, Accept: application/json
- Query: `address={{3.property_address}}`

### Module 5: HTTP - Login
**Type:** HTTP Request
**No code needed** - just configuration
**Check:**
- Endpoint: `https://stashproperty.com.au/auth/api/login`
- Method: POST
- Body: Email and password

### Module 1: HTTP - Planning Info
**Type:** HTTP Request
**No code needed** - just configuration
**Check:**
- Endpoint: `https://stashproperty.com.au/app/api/planning-info`
- Method: GET
- Query: `lat={{9.latitude}}`, `lon={{9.longitude}}`
- Headers: Cookie from Module 6

### Module 8: Webhooks (Response)
**Type:** Webhook Response
**No code needed** - just configuration
**Check:** 
- Status: 200
- Body: `{{7}}` or specific fields from Module 7

---

## Verification Steps

### Step 1: Check Module 7 Code
1. Open Make.com → "Test Stashproperty AP"
2. Click on **Module 7** (Make Code - Parse Stashproperty)
3. Compare code with `code/make-code-stashproperty-parser.js`
4. **Tell me:** Does it match?

### Step 2: Check Module 9 Code
1. Click on **Module 9** (Make Code - Extract Coordinates)
2. Compare code with `code/make-code-extract-coordinates.js`
3. **Tell me:** Does it match?

### Step 3: Check Module 6 Code
1. Click on **Module 6** (Make Code - Extract Tokens)
2. Compare code with `code/make-code-module-6.js`
3. **Tell me:** Does it match?

### Step 4: Check Module 8 Configuration
1. Click on **Module 8** (Webhook Response)
2. Check Body field - should be `{{7}}` or return Module 7's result
3. **Tell me:** What does Body say?

---

## Expected Module 7 Output

Based on your response, Module 7 is working correctly and returns:
```json
{
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "zoning": "Emerging Community Zone (Emerging Community Zone)",
  "lga": "Sunshine Coast Regional",
  "state": "QLD",
  ...
}
```

This is correct! ✅

---

## Issue: Module 8 Response Structure

The response you're getting is:
```json
[
  {
    "result": {
      "floodRisk": "Yes",
      ...
    }
  }
]
```

This means Module 8 is wrapping Module 7's output in a `result` property.

**Two options:**

### Option A: Fix Module 8 (Recommended)
In Module 8 Body, instead of `{{7}}`, use:
```
{{7.result}}
```
This will return just the result object, not wrapped.

### Option B: Keep Frontend Fix (Already Done)
I've already fixed the frontend to handle `response[0].result`, so it should work now.

---

**Please check Modules 7, 9, and 6 code and Module 8 configuration, then tell me what you find!** 🔍







