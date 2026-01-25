# Using Stash BA Chrome Plugin to Discover API Endpoint

## Overview

The **Stash BA Chrome Plugin** automatically recognizes property addresses on web pages and fetches data from Stashproperty. We can use this to discover the exact API endpoint and request format for Make.com integration.

---

## Why This Works

The Chrome plugin must make API calls to Stashproperty's backend to fetch property data. By inspecting these network requests, we can:
1. **Find the exact API endpoint URL**
2. **See the request format** (headers, body, query params)
3. **Understand the response structure**
4. **Copy the authentication method** (API key format)

---

## Step-by-Step: Discover API via Chrome Plugin

### Step 1: Install Chrome DevTools

1. **Open Chrome** and navigate to any page with a property address (e.g., realestate.com.au listing, GHL property page)
2. **Open DevTools:**
   - Press `F12` (or `Ctrl+Shift+I` / `Cmd+Option+I` on Mac)
   - Or Right-click → **Inspect**

### Step 2: Enable Network Monitoring

1. **Go to Network tab** in DevTools
2. **Clear existing requests** (click trash icon or press `Ctrl+L`)
3. **Enable "Preserve log"** checkbox (keeps requests after page navigation)
4. **Filter by:** Type "stash" or "api" in the filter box

### Step 3: Trigger the Chrome Plugin

1. **Navigate to a page with a property address** (e.g., a property listing)
2. **Click the Stash BA Chrome plugin icon** (or let it auto-detect the address)
3. **Wait for the plugin to fetch data** (you'll see a popup/overlay with property info)

### Step 4: Find the API Request

In the **Network tab**, look for:

1. **Requests to Stashproperty domains:**
   - `stashproperty.com.au`
   - `api.stashproperty.com.au`
   - `app.stashproperty.com.au`
   - Any subdomain with "stash" or "api"

2. **Request types to check:**
   - `XHR` requests (most likely)
   - `Fetch` requests
   - `JS` files that might contain API calls

### Step 5: Inspect the API Request

Click on the request to see details:

#### **Headers Tab:**
Look for:
- **Request URL:** This is your API endpoint! (e.g., `https://api.stashproperty.com.au/v1/property/lookup`)
- **Request Method:** GET or POST?
- **Request Headers:**
  - `Authorization: Bearer {token}`
  - `X-API-Key: {key}`
  - `Cookie: {session}` (if using session auth)
  - `Content-Type: application/json`

#### **Payload Tab** (if POST):
See what data is sent:
```json
{
  "address": "15 Barker Street Lewisham NSW",
  "format": "full"
}
```

#### **Query String Parameters** (if GET):
See URL parameters:
```
?address=15+Barker+Street+Lewisham+NSW&format=full
```

#### **Response Tab:**
See the JSON structure returned:
```json
{
  "beds": 3,
  "baths": 2,
  "car_spaces": 2,
  "land_size": 450,
  "flood_risk": "No",
  "bushfire_risk": "Yes",
  ...
}
```

---

## What to Document

Copy these details:

### 1. **API Endpoint:**
```
URL: https://api.stashproperty.com.au/v1/property/lookup
Method: POST
```

### 2. **Authentication:**
```
Header: X-API-Key
Value: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
```

### 3. **Request Format:**
```json
{
  "address": "{{property_address}}"
}
```

### 4. **Response Structure:**
Note the field names:
- `beds` or `bedrooms`?
- `baths` or `bathrooms`?
- `car_spaces` or `garage`?
- `flood_risk` or `flooding_risk`?
- etc.

---

## Alternative: Check Plugin Source Code

If network inspection doesn't work, we can check the plugin's source:

### Step 1: Find Plugin Files

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (toggle top-right)
   - Find "Stash BA" extension
   - Click **Details**

2. **View Source:**
   - Note the **Extension ID**
   - Plugin files are usually in:
     ```
     C:\Users\{YourUser}\AppData\Local\Google\Chrome\User Data\Default\Extensions\{ExtensionID}\{Version}\
     ```

### Step 2: Search for API Calls

Look for files containing:
- `fetch(` or `XMLHttpRequest`
- `stashproperty.com.au`
- `api.stashproperty`
- API endpoint URLs

---

## Expected API Endpoint Patterns

Based on common API patterns, the endpoint might be:

### Option 1: REST API
```
POST https://api.stashproperty.com.au/v1/property/lookup
POST https://api.stashproperty.com.au/v1/property/search
GET  https://api.stashproperty.com.au/v1/property?address={address}
```

### Option 2: GraphQL
```
POST https://api.stashproperty.com.au/graphql
```

### Option 3: Custom Endpoint
```
POST https://stashproperty.com.au/api/property/lookup
POST https://app.stashproperty.com.au/api/property/details
```

---

## Once We Have the Endpoint

I'll create:

1. **Make.com HTTP Module** configuration
2. **Request/Response mapping** based on what we discover
3. **Integration into existing flow** (after Module 13)
4. **Error handling** for API failures

---

## Quick Test After Discovery

Once you find the endpoint, test it with curl:

```bash
curl -X POST "https://api.stashproperty.com.au/v1/property/lookup" \
  -H "X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891" \
  -H "Content-Type: application/json" \
  -d '{"address": "15 Barker Street Lewisham NSW"}'
```

---

## Troubleshooting

### Plugin Not Making Requests?
- **Check if plugin is enabled** in Chrome extensions
- **Try a different page** with a property address
- **Check plugin permissions** (may need access to certain sites)

### Can't Find API Calls?
- **Clear browser cache** and try again
- **Check "All" filter** in Network tab (not just XHR)
- **Try incognito mode** (fewer extensions interfering)

### Multiple Requests?
- **Look for the one that returns property data** (largest response, JSON format)
- **Check response size** (property data will be substantial)

---

## Next Steps

1. **Follow steps above** to discover API endpoint
2. **Document the endpoint, headers, and request format**
3. **Share the details** and I'll create the Make.com integration
4. **Test with sample address** to verify it works

---

**Status:** 🔍 Ready to Discover API Endpoint  
**Method:** Chrome Plugin Network Inspection  
**API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891









