# Build Stashproperty Scenario - Step-by-Step Guide

## Overview

Build a standalone Make.com scenario that looks up Stashproperty data for any address.

---

## Step 1: Create New Scenario

1. Go to Make.com
2. Click **"Create a new scenario"**
3. Name it: **"Stashproperty Property Lookup"**

---

## Step 2: Add Webhook Trigger

1. Click **"Add a module"**
2. Search for: **"Webhook"**
3. Select: **"Webhook - Custom webhook"**
4. Click **"Save"**
5. **Copy the webhook URL** (you'll need this for your form)

**Expected Input:**
- `property_address` (Text)

---

## Step 3: Add Geoscape Geocoding Module

1. Click **"Add a module"** (after webhook)
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

**Configuration:**

**URL:**
```
https://api.psma.com.au/v2/addresses/geocoder?address={{1.property_address}}
```

**Method:** `GET`

**Headers:**
- Click **"Add header"**
- Name: `Authorization`
- Value: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- Click **"Add header"** again
- Name: `Accept`
- Value: `application/json`

**Parse response:** Yes (checkbox)

**Click "Save"**

---

## Step 4: Add Stashproperty Login Module

1. Click **"Add a module"** (after Geoscape)
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

**Configuration:**

**URL:**
```
https://stashproperty.com.au/auth/api/login
```

**Method:** `POST`

**Headers:**
- Click **"Add header"**
- Name: `Content-Type`
- Value: `application/json`
- Click **"Add header"** again
- Name: `Accept`
- Value: `application/json`

**Body:**
- Click **"Body"** tab
- Select: **"Raw"**
- Content type: **"JSON"**
- Enter:
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Parse response:** Yes (checkbox)

**Click "Save"**

---

## Step 5: Extract Tokens from Cookies

1. Click **"Add a module"** (after Login)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** Copy from `make-code-stashproperty-login.js`

**Input:** `{{3.Headers}}` (or `{{3.Data.headers}}` - check what's available)

**Click "Save"**

---

## Step 6: Add Stashproperty API Module

1. Click **"Add a module"** (after Extract Tokens)
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

**Configuration:**

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat={{2.features[0].geometry.coordinates[1]}}&lon={{2.features[0].geometry.coordinates[0]}}
```

**Method:** `GET`

**Headers:**
- Click **"Add header"**
- Name: `Accept`
- Value: `application/json`
- Click **"Add header"** again
- Name: `Cookie`
- Value: `{{4.cookieHeader}}`

**Authentication type:** `None`

**Parse response:** Yes (checkbox)

**Click "Save"**

---

## Step 7: Parse Stashproperty Response

1. Click **"Add a module"** (after Stashproperty API)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** Copy from `make-code-stashproperty-parser.js`

**Input:** `{{5.Data}}`

**Click "Save"**

---

## Step 8: Format Final Output (Optional)

1. Click **"Add a module"** (after Parse)
2. Search for: **"Code"**
3. Select: **"Code"**

**Code:** (See Module 7 in STASHPROPERTY-COMPLETE-SETUP.md)

**Purpose:** Combine Geoscape + Stashproperty data

**Click "Save"**

---

## Step 9: Return Data (Webhook Response)

1. Click **"Add a module"** (after Format)
2. Search for: **"Webhook"**
3. Select: **"Webhook response"**

**Status Code:** `200`

**Body:** `{{7}}` (or `{{6}}` if you skipped formatting)

**Click "Save"**

---

## Step 10: Test the Scenario

1. Click **"Run once"** (top right)
2. When prompted, enter:
   - `property_address`: `4 Osborne Circuit Maroochydore QLD 4558`
3. Watch it run through each module
4. Check the final output

---

## Troubleshooting

### Geoscape Returns No Results
- Check address format
- Try full address with state and postcode

### Login Fails
- Check email/password are correct
- Verify credentials haven't changed

### Can't Extract Tokens
- Check Module 3 output
- Look for `Headers` or `Data.headers`
- Adjust input variable in Module 4

### Stashproperty API Returns Unauthorized
- Token might have expired
- Re-run login module to get fresh token
- Check Cookie header format

---

## Quick Reference

**Module Order:**
1. Webhook Trigger
2. Geoscape Geocoding
3. Stashproperty Login
4. Extract Tokens
5. Stashproperty API
6. Parse Response
7. Format Output (optional)
8. Webhook Response

**Key Variables:**
- `{{1.property_address}}` - Address from webhook
- `{{2.features[0].geometry.coordinates[1]}}` - Latitude
- `{{2.features[0].geometry.coordinates[0]}}` - Longitude
- `{{4.cookieHeader}}` - Cookie header for API
- `{{5.Data}}` - Stashproperty API response
- `{{6}}` or `{{7}}` - Final formatted output

---

**Status:** Ready to Build  
**Next:** Follow steps above to create scenario

