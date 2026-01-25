# Convert Test Scenario to Full Stashproperty Scenario

## Current Test Scenario

You already have:
- ✅ Stashproperty API module (working)
- ✅ Manual Cookie header

## What We Need to Add

We need to add modules BEFORE your existing Stashproperty API module:

1. **Webhook Trigger** (or Manual trigger with address field)
2. **Geoscape Geocoding** (address → lat/lon)
3. **Stashproperty Login** (get fresh token)
4. **Extract Tokens** (from cookies)
5. **Update Stashproperty API** (use dynamic lat/lon and fresh cookie)
6. **Parse Response** (after API)
7. **Format Output** (optional)
8. **Webhook Response** (return data)

---

## Step-by-Step Conversion

### Step 1: Add Webhook Trigger (Before Everything)

1. Click **"Add a module"** at the START of your scenario
2. Search for: **"Webhook"**
3. Select: **"Webhook - Custom webhook"**
4. Click **"Save"**
5. **Copy the webhook URL**

**This becomes Module 3** (Make.com will assign the number)

**Expected Input:**
- `property_address` (Text)

---

### Step 2: Add Geoscape Module (After Webhook)

1. Click **"Add a module"** (after webhook, before your existing Stashproperty API)
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

**URL:**
```
https://api.psma.com.au/v2/addresses/geocoder?address={{3.property_address}}
```
**⚠️ Note:** Use `{{3.property_address}}` (Module 3 is the webhook)

**Method:** `GET`

**Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`

**Parse response:** Yes

**This becomes Module 4**

**Output Fields:**
- `features[0].geometry.coordinates[0]` = Longitude
- `features[0].geometry.coordinates[1]` = Latitude
- `features[0].properties.localityName` = Suburb
- `features[0].properties.stateTerritory` = State
- `features[0].properties.postcode` = Postcode

---

### Step 3: Add Login Module (After Geoscape)

1. Click **"Add a module"** (after Geoscape)
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

**URL:** `https://stashproperty.com.au/auth/api/login`

**Method:** `POST`

**Authentication type:** `No authentication` (or `None`)

**Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`

**Body (Raw JSON):**
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Parse response:** Yes

**This becomes Module 5**

**Output Fields:**
- `Headers` or `Data.headers` = Contains Set-Cookie headers
- Look for: `Headers['set-cookie']` or `Headers['Set-Cookie']`

---

### Step 4: Add Extract Tokens Module (After Login)

1. Click **"Add a module"** (after Login)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** Copy from `make-code-stashproperty-login.js`

**Input Variable Mapping:**
- Map `{{5.Headers}}` OR `{{5.Data.headers}}` to the code input
- Check Module 5 output to see which format is available

**This becomes Module 6**

**Output Fields:**
- `cookieHeader` = Ready-to-use Cookie header string
- `accessToken` = JWT token
- `refreshToken` = Refresh token UUID

---

### Step 5: Update Your Existing Stashproperty API Module

**Find your existing Stashproperty API module** (currently Module 1) and update it:

**Change URL from:**
```
https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891
```

**To:**
```
https://stashproperty.com.au/app/api/planning-info?lat={{4.features[0].geometry.coordinates[1]}}&lon={{4.features[0].geometry.coordinates[0]}}
```
**⚠️ Note:** Use `{{4.}}` (Module 4 is Geoscape)

**Update Cookie header:**
- Change from manual cookie string
- To: `{{6.cookieHeader}}`
**⚠️ Note:** Use `{{6.}}` (Module 6 is Extract Tokens)

**Authentication type:** `No authentication` (or `None`)

**This stays as Module 1** (but runs after Module 6)

**Output Fields:**
- `Data` = Array with planning info response

---

### Step 6: Add Parse Module (After Stashproperty API)

1. Click **"Add a module"** (after your Stashproperty API)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** Copy from `make-code-stashproperty-parser.js`

**Input Variable Mapping:**
- Map `{{1.Data}}` to the code input
**⚠️ Note:** Use `{{1.Data}}` (Module 1 is Stashproperty API)

**This becomes Module 7**

**Output Fields:**
- `zone`, `zoneDesc`, `zoning`
- `lga`, `state`
- `floodRisk`, `bushfireRisk`, `heritageRisk`, `biodiversityRisk`
- `planningLinks`, `planningLink1`, `planningLink2`

---

### Step 7: Add Format Output Module (Optional - SKIP THIS)

**⚠️ You can skip this step** - Module 7 (Parse) already formats the data well enough.

If you want to add it:
1. Click **"Add a module"** (after Parse)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** (See Module 7 in STASHPROPERTY-COMPLETE-SETUP.md)

**Input Variable Mapping:**
- Map `{{4}}` (Geoscape data)
- Map `{{7}}` (Parsed Stashproperty data)

**Purpose:** Combine Geoscape + Stashproperty data

**This would become Module 8** (if you add it)

---

### Step 8: Add Webhook Response (At the End)

1. Click **"Add a module"** (at the end)
2. Search for: **"Webhook"**
3. Select: **"Webhook response"**

**Status Code:** `200`

**Body:** 
- Use `{{7}}` (from Module 7 - Parse Response)
- If you added Format module: `{{8}}`

**This becomes Module 8** (if you skipped Format Output)

---

## Final Module Order (Actual Make.com Numbers)

```
Module 3: Webhook Trigger
  ↓ Receives: property_address
Module 4: Geoscape Geocoding
  ↓ Uses: {{3.property_address}}
  ↓ Returns: lat, lon, suburb, state, postcode
Module 5: Stashproperty Login
  ↓ Returns: Headers with Set-Cookie
Module 6: Extract Tokens
  ↓ Uses: {{5.Headers}} or {{5.Data.headers}}
  ↓ Returns: cookieHeader, accessToken, refreshToken
Module 1: Stashproperty API (your existing module, updated)
  ↓ Uses: {{4.features[0].geometry.coordinates[1]}} (lat)
  ↓ Uses: {{4.features[0].geometry.coordinates[0]}} (lon)
  ↓ Uses: {{6.cookieHeader}} (Cookie header)
  ↓ Returns: {{1.Data}} (planning info)
Module 7: Parse Response
  ↓ Uses: {{1.Data}}
  ↓ Returns: Formatted risk overlays, zoning, etc.
Module 8: Webhook Response
  ↓ Uses: {{7}} (parsed data from Module 7)
  ↓ Returns: Final formatted output
```

**Note:** Format Output module is optional. If you skip it, Module 8 (Webhook Response) uses `{{7}}` directly.

---

## Data Flow Verification Checklist

Verify each module is using the correct input:

- [ ] **Module 4 (Geoscape):** Uses `{{3.property_address}}` ✅
- [ ] **Module 6 (Extract Tokens):** Uses `{{5.Headers}}` or `{{5.Data.headers}}` ✅
- [ ] **Module 1 (Stashproperty API):** 
  - [ ] URL uses `{{4.features[0].geometry.coordinates[1]}}` for lat ✅
  - [ ] URL uses `{{4.features[0].geometry.coordinates[0]}}` for lon ✅
  - [ ] Cookie header uses `{{6.cookieHeader}}` ✅
- [ ] **Module 7 (Parse):** Uses `{{1.Data}}` ✅
- [ ] **Module 8 (Response):** Uses `{{7}}` ✅

---

## Quick Checklist

- [ ] Add Webhook Trigger at start
- [ ] Add Geoscape module (before Stashproperty API)
- [ ] Add Login module (before Stashproperty API)
- [ ] Add Extract Tokens module (after Login)
- [ ] Update Stashproperty API URL (use dynamic lat/lon)
- [ ] Update Stashproperty API Cookie header (use {{6.cookieHeader}})
- [ ] Add Parse module (after Stashproperty API)
- [ ] Add Format Output module (optional)
- [ ] Add Webhook Response (at end)
- [ ] Test with sample address

---

## Benefits of Converting

✅ **Reuse what's working** - Your Stashproperty API module already works  
✅ **Less duplication** - One scenario instead of two  
✅ **Easier testing** - Can test individual modules  
✅ **Cleaner** - Everything in one place

---

**Status:** Ready to Convert  
**Next:** Follow steps above to add modules to your test scenario

