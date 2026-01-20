# Google Sheet → Stashproperty Webhook Trigger

## Step 1: Create Google Sheet

1. **Create a new Google Sheet**
2. **Name it:** `Stashproperty Address Input`
3. **In Row 1, add headers:**
   ```
   Address | Status | Timestamp | Webhook URL
   ```
4. **In Row 2, Column A, add a test address:**
   ```
   123 George Street, Sydney NSW 2000
   ```
5. **In Row 2, Column D, paste your webhook URL** (from Module 3 in Make.com)

---

## Step 2: Add Google Apps Script

1. **In your Google Sheet**, go to **Extensions** → **Apps Script**
2. **Delete any existing code**
3. **Paste this code:**

```javascript
function sendAddressToWebhook() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Start from row 2 (skip header)
  for (let i = 1; i < data.length; i++) {
    const address = data[i][0]; // Column A
    const status = data[i][1]; // Column B
    const webhookUrl = data[i][3]; // Column D
    
    // Skip if no address, already sent, or no webhook URL
    if (!address || status === 'Sent' || !webhookUrl) {
      continue;
    }
    
    try {
      // Send to webhook
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
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        sheet.getRange(i + 1, 2).setValue('Sent'); // Column B = Status
        sheet.getRange(i + 1, 3).setValue(new Date()); // Column C = Timestamp
      } else {
        sheet.getRange(i + 1, 2).setValue('Error: ' + responseCode);
      }
      
      // Wait 1 second between requests
      Utilities.sleep(1000);
      
    } catch (error) {
      sheet.getRange(i + 1, 2).setValue('Error: ' + error.toString());
    }
  }
}
```

4. **Save** (Ctrl+S or Cmd+S)
5. **Click "Run"** → Select `sendAddressToWebhook` → Click **"Run"**
6. **Authorize** when prompted (grant permissions)

---

## Step 3: Test It

1. **Make sure your Make.com scenario is ON** (toggle switch at top)
2. **In Google Sheets**, go to **Extensions** → **Apps Script**
3. **Click "Run"** → Select `sendAddressToWebhook` → Click **"Run"**
4. **Check Column B** - should change to "Sent"
5. **Go to Make.com** - you should see a new execution running!

---

## How to Use

- **Add addresses** to Column A
- **Add webhook URL** to Column D (same row as address)
- **Run the script** to send addresses to your webhook
- **Status** appears in Column B

---

**Ready?** Do Step 1 first, then tell me when done and we'll do Step 2.

