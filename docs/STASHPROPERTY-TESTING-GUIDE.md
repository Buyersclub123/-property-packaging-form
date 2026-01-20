# Stashproperty Scenario - Step-by-Step Testing Guide

## Quick Test (Make.com "Run Once")

### Step 1: Open Your Scenario
1. Go to Make.com
2. Open your **"Test Stashproperty API"** scenario (or whatever you named it)

### Step 2: Run Once
1. Click **"Run once"** button (top right, looks like a play button ▶️)
2. When prompted for webhook data, enter:
   ```json
   {
     "property_address": "123 George Street, Sydney NSW 2000"
   }
   ```
3. Click **"Run"** or **"OK"**

### Step 3: Watch the Execution
- Each module will execute in order
- Click on each module to see its input/output
- Look for any red error indicators

### Step 4: Check Results
- **Module 3 (Webhook):** Should show `property_address: "123 George Street..."`
- **Module 4 (Geoscape):** Should show `features[0].geometry.coordinates` with lat/lon
- **Module 5 (Login):** Should show `Headers` with Set-Cookie
- **Module 6 (Extract Tokens):** Should show `cookieHeader` with tokens
- **Module 1 (Stashproperty API):** Should show `Data` array with planning info
- **Module 7 (Parse):** Should show formatted `floodRisk`, `bushfireRisk`, etc.
- **Module 8 (Response):** Should show final output

---

## Option 2: Google Sheets Test Tool (For Multiple Addresses)

### Step 1: Create Test Google Sheet

1. **Create a new Google Sheet**
2. **Name it:** `Stashproperty Test Tool`
3. **Create 2 tabs:**

#### Tab 1: "Test Addresses"
Headers in Row 1:
```
Address | Status | Timestamp | Result (JSON)
```

#### Tab 2: "Results"
Headers in Row 1:
```
Address | Zone | LGA | State | Flood Risk | Bushfire Risk | Heritage Risk | Biodiversity Risk | Planning Links | Timestamp
```

4. **Share the sheet** with your Make.com Google account (Editor permissions)
5. **Copy the Sheet ID** from URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

---

### Step 2: Add Google Sheets Modules to Your Scenario

**Add these modules AFTER Module 8 (Webhook Response):**

#### Module 9: Google Sheets - Add Row (Log Test)
1. Click **"+"** after Module 8
2. Search for **"Google Sheets"**
3. Select **"Add a row"**
4. Connect your Google account
5. Select your test sheet
6. Select tab: **"Test Addresses"**
7. Map fields:
   - **Address:** `{{3.property_address}}`
   - **Status:** `"Testing"`
   - **Timestamp:** `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}`
   - **Result (JSON):** `{{json(7)}}`

#### Module 10: Google Sheets - Add Row (Formatted Results)
1. Click **"+"** after Module 9
2. Add another **"Google Sheets - Add a row"**
3. Select your test sheet
4. Select tab: **"Results"**
5. Map fields:
   - **Address:** `{{3.property_address}}`
   - **Zone:** `{{7.zone}}`
   - **LGA:** `{{7.lga}}`
   - **State:** `{{7.state}}`
   - **Flood Risk:** `{{7.floodRisk}}`
   - **Bushfire Risk:** `{{7.bushfireRisk}}`
   - **Heritage Risk:** `{{7.heritageRisk}}`
   - **Biodiversity Risk:** `{{7.biodiversityRisk}}`
   - **Planning Links:** `{{7.planningLink1}}` (or combine multiple)
   - **Timestamp:** `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}`

---

### Step 3: Create Google Apps Script Trigger

1. **In your Google Sheet**, go to **Extensions** → **Apps Script**
2. **Paste this code:**

```javascript
function testStashpropertyWebhook() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Test Addresses');
  const webhookUrl = 'YOUR_WEBHOOK_URL_HERE'; // Get from Module 3 in Make.com
  
  // Get all addresses from column A (skip header row)
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) { // Start from row 2 (skip header)
    const address = data[i][0]; // Column A
    const status = data[i][1]; // Column B
    
    // Skip if already processed or empty
    if (!address || status === 'Done' || status === 'Error') {
      continue;
    }
    
    try {
      // Call Make.com webhook
      const payload = {
        property_address: address
      };
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(webhookUrl, options);
      const result = JSON.parse(response.getContentText());
      
      // Update status
      sheet.getRange(i + 1, 2).setValue('Done'); // Column B = Status
      sheet.getRange(i + 1, 3).setValue(new Date()); // Column C = Timestamp
      sheet.getRange(i + 1, 4).setValue(JSON.stringify(result)); // Column D = Result
      
      // Wait 2 seconds between requests (rate limiting)
      Utilities.sleep(2000);
      
    } catch (error) {
      // Mark as error
      sheet.getRange(i + 1, 2).setValue('Error');
      sheet.getRange(i + 1, 4).setValue(error.toString());
    }
  }
}
```

3. **Replace `YOUR_WEBHOOK_URL_HERE`** with your actual webhook URL from Module 3
4. **Save** the script (Ctrl+S or Cmd+S)
5. **Run it:** Click **"Run"** button → Select `testStashpropertyWebhook` → Click **"Run"**
6. **Authorize:** Grant permissions when prompted

---

### Step 4: Use the Test Tool

1. **Add test addresses** to Column A in "Test Addresses" tab:
   ```
   123 George Street, Sydney NSW 2000
   456 Collins Street, Melbourne VIC 3000
   789 Queen Street, Brisbane QLD 4000
   ```

2. **Run the script:**
   - Go to **Extensions** → **Apps Script**
   - Click **"Run"** → Select `testStashpropertyWebhook` → Click **"Run"**

3. **Check results:**
   - **"Test Addresses"** tab: Shows status and raw JSON
   - **"Results"** tab: Shows formatted data (if you added Module 10)

---

## Option 3: Test via Webhook URL (Postman/curl)

### Step 1: Get Webhook URL
1. In Make.com, open Module 3 (Webhook Trigger)
2. **Copy the webhook URL** (looks like: `https://hook.us1.make.com/...`)

### Step 2: Test with Postman
1. Open Postman
2. **Method:** `POST`
3. **URL:** Paste your webhook URL
4. **Headers:**
   - `Content-Type`: `application/json`
5. **Body (raw JSON):**
   ```json
   {
     "property_address": "123 George Street, Sydney NSW 2000"
   }
   ```
6. Click **"Send"**
7. Check response - should see formatted Stashproperty data

### Step 3: Test with curl (PowerShell)
```powershell
curl -X POST "YOUR_WEBHOOK_URL_HERE" `
  -H "Content-Type: application/json" `
  -d '{\"property_address\": \"123 George Street, Sydney NSW 2000\"}'
```

---

## Troubleshooting

### Module 4 (Geoscape) Fails
- **Error:** "Address not found"
- **Fix:** Try a different address format or check Geoscape API key

### Module 5 (Login) Fails
- **Error:** "Unauthorized" or "Invalid credentials"
- **Fix:** Check email/password in Module 5 body

### Module 6 (Extract Tokens) Returns Empty
- **Error:** `cookieHeader` is empty
- **Fix:** Check Module 5 output - look for `Headers['set-cookie']` or `Headers['Set-Cookie']`
- Update Module 6 input to use correct format: `{{5.Headers}}` or `{{5.Data.headers}}`

### Module 1 (Stashproperty API) Fails
- **Error:** "Unauthorized"
- **Fix:** Check `{{6.cookieHeader}}` is being used correctly
- Verify coordinates: lat = `{{4.features[0].geometry.coordinates[1]}}`, lon = `{{4.features[0].geometry.coordinates[0]}}`

### Module 7 (Parse) Returns Empty
- **Error:** No data in output
- **Fix:** Check `{{1.Data}}` format - might need to adjust parser code

---

## What to Check After Testing

✅ **All modules execute successfully**  
✅ **Module 4 returns lat/lon coordinates**  
✅ **Module 6 extracts cookieHeader**  
✅ **Module 1 returns planning info**  
✅ **Module 7 formats risk overlays correctly**  
✅ **Module 8 returns final JSON response**

---

## Next Steps After Testing

Once testing is successful:
1. **Save the scenario**
2. **Turn on the scenario** (toggle switch at top)
3. **Integrate with your Property Package Submission form** (if needed)

---

**Ready to test?** Start with **Option 1** (Run Once) - it's the quickest!

