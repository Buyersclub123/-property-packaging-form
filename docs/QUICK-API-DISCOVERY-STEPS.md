# Quick Steps: Find Stashproperty API Endpoint

## ⚠️ Important: You're Looking at the Wrong Tab

The stack trace you're seeing (`/xjs/_/js/...`) is from **Google's JavaScript**, not Stashproperty.

---

## ✅ Correct Steps:

### Step 1: Open DevTools
- Press `F12` (or Right-click → Inspect)

### Step 2: Click "Network" Tab
- **NOT** the "Console" tab
- Look for tabs: Elements | Console | Sources | Network | etc.
- Click **"Network"**

### Step 3: Clear & Filter
- Click the **trash icon** (clear all requests)
- In the filter box, type: `stash` or `api`
- Make sure "All" is selected (not just XHR)

### Step 4: Trigger the Plugin
- Navigate to a property listing page (e.g., realestate.com.au)
- Click the **Stash BA Chrome plugin icon** (or let it auto-detect)
- Watch the Network tab for new requests

### Step 5: Find the Request
Look for requests with:
- **Name** containing "stash" or "property" or "api"
- **Domain** like `stashproperty.com.au` or `api.stashproperty.com.au`
- **Type** = XHR or Fetch
- **Status** = 200 (green)

---

## 📋 What to Copy:

When you find the request, click it and copy:

### From "Headers" Tab:
```
Request URL: https://api.stashproperty.com.au/v1/property/lookup
Request Method: POST
```

### From "Headers" → "Request Headers":
```
X-API-Key: stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891
Content-Type: application/json
```

### From "Payload" Tab (if POST):
```json
{
  "address": "15 Barker Street Lewisham NSW"
}
```

### From "Response" Tab:
```json
{
  "beds": 3,
  "baths": 2,
  ...
}
```

---

## 🔄 Alternative: Check Google Sheets Instead

If the Chrome plugin isn't working, try this:

### Method 1: Check Apps Script
1. Open your **"Stash Auto Lookup.xlsx"** in Google Sheets
2. Go to **Extensions → Apps Script**
3. Look for code that makes API calls
4. Find `UrlFetchApp.fetch()` calls
5. Copy the URL and headers

### Method 2: Network Tab on Google Sheets
1. Open **"Stash Auto Lookup.xlsx"** in Google Sheets
2. Open DevTools (`F12`) → **Network** tab
3. Enter a property address in the sheet
4. Watch for API requests to `stashproperty.com.au`

---

## 🆘 Still Not Working?

If you can't find API calls:

1. **Is the plugin installed?**
   - Go to `chrome://extensions/`
   - Check if "Stash BA" is enabled

2. **Is the plugin working?**
   - Try clicking it manually on a property page
   - Does it show property data?

3. **Try a different page:**
   - realestate.com.au property listing
   - domain.com.au property listing
   - Any page with a clear property address

---

## 📸 What You Should See:

In the Network tab, you should see something like:

```
Name                    | Type | Status | Domain
------------------------|------|--------|------------------
property-lookup         | XHR  | 200    | api.stashproperty.com.au
get-property-details    | Fetch| 200    | stashproperty.com.au
```

**NOT** something like:
```
xjs.hd.en_GB...         | JS   | 200    | www.google.com  ❌
```

---

## Next Steps:

Once you find the API request:
1. **Copy the Request URL** (this is the endpoint!)
2. **Copy the Request Method** (GET or POST)
3. **Copy the Headers** (especially API key)
4. **Copy the Request Body** (if POST)
5. **Share with me** and I'll create the Make.com integration

---

**Status:** 🔍 Looking for API Endpoint  
**Current Issue:** Looking at Console tab instead of Network tab  
**Solution:** Switch to Network tab and filter by "stash"









