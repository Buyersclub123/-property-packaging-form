# Make.com Logging Setup - Step by Step

## Prerequisites
✅ Google Sheet created with 3 tabs: "Sent", "Errors", "Filtered"
✅ Headers added to Row 1 in each tab
✅ Sheet shared with Make.com Google account (Editor permissions)
✅ Sheet ID copied from URL

---

## Step 1: Set Up Error Handler (Catches All Errors)

**Purpose:** Automatically logs ANY error from ANY module

### Instructions:

1. **Open your Make.com scenario** (the Property Review System scenario)

2. **Right-click on Module 1** (Webhook module)
   - Right-click = Click with right mouse button (or Ctrl+Click on Mac)
   - A context menu will appear

3. **Select "Add error handler"** from the menu
   - This creates a new error handling route (shown with transparent/dashed lines)
   - This will catch errors from Module 1 and all downstream modules

5. **In the Error Handler flow:**
   - Click the **"+"** button to add a module
   - Search for **"Google Sheets"**
   - Select **"Add a row"**
   - Connect your Google account (if not already connected)
   - Click **"Select a spreadsheet"** → Find and select your sheet
   - Click **"Select a sheet"** → Select **"Errors"** tab

6. **Map the fields** (one by one):

   Click each field dropdown and select or type:

   | Field Name | Value to Enter |
   |------------|-----------------|
   | **Timestamp** | Click dropdown → Search for `formatDate` → Select `formatDate(now; "YYYY-MM-DD HH:mm:ss")` |
   | **Scenario Name** | Click dropdown → Select `{{scenario.name}}` |
   | **Execution ID** | Click dropdown → Select `{{execution.id}}` |
   | **Module Name** | Click dropdown → Select `{{error.moduleName}}` |
   | **Error Type** | Click dropdown → Select `{{error.type}}` |
   | **Error Message** | Click dropdown → Select `{{error.message}}` |
   | **Record ID** | Click dropdown → Try `{{error.inputData.id}}` first, if not available try `{{error.inputData.recordId}}` |
   | **Property Address** | Click dropdown → Select `{{error.inputData.propertyAddress}}` |
   | **BA Email** | Click dropdown → Select `{{error.inputData.baEmail}}` |
   | **Input Data (JSON)** | Click dropdown → Search for `json` → Select `json(error.inputData)` |

7. **Add "Resume" card** (important!):
   - At the end of error handler route, click **"+"**
   - Search for **"Resume"** card
   - Add it as the last module
   - Configure: Choose whether to continue or stop scenario after error

8. **Click "OK"** to save all modules

**✅ Done!** Now all errors will automatically log to "Errors" tab.

---

## Step 2: Set Up Success Logging (After Module 14)

**Purpose:** Logs successful email sends

### Instructions:

1. **In your Make.com scenario**, go to **Path 4** (Client Emails path)

2. **Find Module 14** (Gmail - Send Email module)

3. **Click the "+" button** AFTER Module 14 (on the right side)

4. **Add Google Sheets module:**
   - Search for **"Google Sheets"**
   - Select **"Add a row"**
   - Select your sheet
   - Select tab: **"Sent"**

5. **Map the fields:**

   | Field Name | Value to Enter |
   |------------|-----------------|
   | **Timestamp** | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
   | **Property Address** | `{{7.propertyAddress}}` |
   | **Opportunity Name** | `{{7.clientInfo.opportunityName}}` |
   | **Email Addresses Sent To** | `{{14.to}}` OR `{{7.to}}` |
   | **BA / Sender** | `{{7.baName}}` |
   | **Send From Email** | `{{7.sendFromEmail}}` |
   | **Message Type** | `{{7.clientInfo.messageType}}` |

   **Note:** If a field shows as empty/not available:
   - Click the field dropdown
   - Look for the field name in the list
   - If not found, try `{{19.fieldName}}` instead of `{{7.fieldName}}` (Module 19 is the Iterator)

6. **Click "OK"** to save

**✅ Done!** Now successful emails will log to "Sent" tab.

---

## Step 3: Set Up Filtered Webhook Logging (After Module 18)

**Purpose:** Logs webhooks that don't match Router conditions

### Instructions:

1. **In your Make.com scenario**, find **Module 18** (comes after the Router)

2. **Click the "+" button** AFTER Module 18

3. **Add Google Sheets module:**
   - Search for **"Google Sheets"**
   - Select **"Add a row"**
   - Select your sheet
   - Select tab: **"Filtered"**

4. **Map the fields:**

   | Field Name | Value to Enter |
   |------------|-----------------|
   | **Timestamp** | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
   | **Record ID** | `{{1.id}}` OR `{{1.recordId}}` |
   | **Property Address** | `{{1.propertyAddress}}` |
   | **Reason** | Type: `"No matching router condition"` OR use `{{1.source}}` |
   | **Source** | `{{1.source}}` |
   | **Packager Approved** | `{{1.packager_approved}}` |
   | **Input Data (JSON)** | `{{json(1)}}` |

   **Note:** Module 18 receives data from Module 1 (Webhook), so use `{{1.fieldName}}`

5. **Click "OK"** to save

**✅ Done!** Now filtered webhooks will log to "Filtered" tab.

---

## Testing

### Test Success Logging:
1. Send an email through the portal
2. Check "Sent" tab in Google Sheet
3. Should see a new row with email details

### Test Error Logging:
1. Temporarily break something (e.g., change GHL API key to invalid)
2. Run scenario
3. Check "Errors" tab
4. Should see error details
5. **Fix the break** (restore correct API key)

### Test Filtered Logging:
1. Send a webhook that doesn't match Router conditions
2. Check "Filtered" tab
3. Should see webhook details

---

## Troubleshooting

**If fields show as empty:**
- Click the field dropdown in Make.com
- Look for the field name in the list
- Try alternative module numbers (e.g., `{{19.fieldName}}` instead of `{{7.fieldName}}`)

**If Error Handler doesn't work:**
- Make sure Error Handler is enabled in scenario settings
- Check that Google Sheets module is correctly configured
- Test by intentionally breaking a module

**If no data appears:**
- Check that sheet is shared with Make.com Google account
- Verify tab names match exactly: "Sent", "Errors", "Filtered"
- Check Make.com execution logs for errors

---

## You're Done! 🎉

All three logging points are now configured. The system will automatically:
- ✅ Log successful emails → "Sent" tab
- ❌ Log all errors → "Errors" tab  
- ⚠️ Log filtered webhooks → "Filtered" tab

No manual work needed - Make.com does it all automatically!

