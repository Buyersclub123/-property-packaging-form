# Stashproperty API Discovery Guide

## Goal

Find the exact API endpoint and request format so we can integrate it into Make.com.

## API Key

**Your API Key:** `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

---

## Method 1: Inspect Network Requests (Recommended)

### Steps:

1. **Open Google Sheets** with your "Stash Auto Lookup" file

2. **Open Browser DevTools:**
   - Press `F12` (or Right-click → Inspect)
   - Go to **Network** tab
   - Clear existing requests (trash icon)

3. **Trigger a Lookup:**
   - Enter a property address in the Excel sheet
   - Wait for data to populate
   - Watch the Network tab for API calls

4. **Find the API Call:**
   - Look for requests to `stashproperty.com.au` or `api.stashproperty.com.au`
   - Click on the request
   - Check:
     - **Request URL** (this is the endpoint!)
     - **Request Method** (GET/POST)
     - **Request Headers** (look for API key)
     - **Request Payload** (if POST, see what data is sent)
     - **Response** (see the JSON structure)

5. **Document:**
   - Copy the URL
   - Note the method
   - Copy headers (especially where API key is)
   - Copy request body (if POST)
   - Copy response structure

---

## Method 2: Check Apps Script Code

### Steps:

1. **Open Google Sheets**
2. **Go to:** Extensions → Apps Script
3. **Look for code** that makes HTTP requests
4. **Find:**
   - `UrlFetchApp.fetch()` calls
   - API endpoint URLs
   - Headers with API key
   - Request parameters

### What to Look For:

```javascript
// Example of what you might find:
var url = "https://api.stashproperty.com.au/v1/property/lookup";
var options = {
  'method': 'post',
  'headers': {
    'X-API-Key': 'stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891',
    'Content-Type': 'application/json'
  },
  'payload': JSON.stringify({
    'address': address
  })
};
var response = UrlFetchApp.fetch(url, options);
```

---

## Method 3: Check Stashproperty Website

### Steps:

1. **Log into Stashproperty**
2. **Go to:** My Profile → API section
3. **Look for:**
   - API documentation link
   - Example requests
   - Endpoint URLs
   - Authentication instructions

---

## Method 4: Test with curl/Postman

Once you find the endpoint, test it:

### Example curl command:

```bash
curl -X POST "https://api.stashproperty.com.au/v1/property/lookup" \
  -H "X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891" \
  -H "Content-Type: application/json" \
  -d '{"address": "15 Barker Street Lewisham NSW"}'
```

---

## What We Need to Know

### Critical Information:

1. **Endpoint URL:**
   - Full URL (e.g., `https://api.stashproperty.com.au/v1/property/lookup`)

2. **HTTP Method:**
   - GET or POST?

3. **Authentication:**
   - Header name? (`X-API-Key`, `Authorization`, etc.)
   - Format? (`Bearer {key}` or just `{key}`?)

4. **Request Format:**
   - If GET: Query parameters? (e.g., `?address=...`)
   - If POST: JSON body structure?

5. **Address Format:**
   - Full address string?
   - Separate components (street, suburb, state)?
   - URL encoded?

6. **Response Format:**
   - JSON structure?
   - Where are beds/bath/car/land size?
   - Where are risk overlays?

---

## Expected Response Fields

Based on your Excel sheet, the API should return:

### Property Details:
- Beds
- Baths
- Car spaces
- Land size
- Built year
- Title type

### Risk Overlays:
- Flooding Risk
- Bushfire Risk
- Heritage Risk
- Biodiversity Risk
- Zoning Code
- Zoning Description

### Other:
- Address
- Lat/Lon
- LGA
- State
- Demographics
- Planning links

---

## Next Steps

1. **Try Method 1 first** (Network inspection) - easiest and most reliable
2. **If that doesn't work**, try Method 2 (Apps Script)
3. **Once we have the endpoint**, I'll create the Make.com integration
4. **Test with sample address** to verify it works
5. **Integrate into existing flow**

---

## Once We Have the Endpoint

I'll create:
1. **Make.com HTTP module** configuration
2. **Data parsing module** to extract fields
3. **Mapping to GHL fields** and email template
4. **Error handling** for edge cases

---

**Status:** 🔍 Discovery Phase
**Next Action:** Inspect network requests or check Apps Script code










