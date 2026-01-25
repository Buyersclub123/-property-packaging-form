# Complete Google Sheet Logging Setup

## Overview

**No code changes needed** - this is all Make.com configuration.

**One Google Sheet** with **3 tabs**:
1. **Sent** - Successful email sends
2. **Errors** - All errors (via Error Handler)
3. **Filtered** - Webhooks that didn't match Router conditions (Module 18)

## Step 1: Create Google Sheet

1. **Create a new Google Sheet** (or use existing)
2. **Name it:** `Property Review System Logs` (or any name you prefer)
3. **Create 3 tabs:**

### Tab 1: "Sent"
Headers in Row 1:
```
Timestamp | Property Address | Opportunity Name | Email Addresses Sent To | BA / Sender | Send From Email | Message Type
```

### Tab 2: "Errors"
Headers in Row 1:
```
Timestamp | Scenario Name | Execution ID | Module Name | Error Type | Error Message | Record ID | Property Address | BA Email | Input Data (JSON)
```

### Tab 3: "Filtered"
Headers in Row 1:
```
Timestamp | Record ID | Property Address | Reason | Source | Packager Approved | Input Data (JSON)
```

4. **Share the sheet** with your Make.com Google account (Editor permissions)
5. **Copy the Sheet ID** from URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

## Step 2: Set Up Error Handler (Catches All Errors)

**This catches errors from ANY module automatically.**

1. **In Make.com scenario:**
   - Click **Settings** icon (gear ⚙️) at top
   - Scroll to **"Error Handler"** section
   - Click **"Add error handler"**
   - This creates a new flow that runs when ANY module fails

2. **In Error Handler flow:**
   - Add **Google Sheets** → **"Add a row"** module
   - Connect Google account (if not already)
   - Select your sheet
   - Select tab: **"Errors"**
   - Map fields:

| Column | Make.com Field |
|--------|----------------|
| Timestamp | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
| Scenario Name | `{{scenario.name}}` |
| Execution ID | `{{execution.id}}` |
| Module Name | `{{error.moduleName}}` |
| Error Type | `{{error.type}}` |
| Error Message | `{{error.message}}` |
| Record ID | `{{error.inputData.id}}` or `{{error.inputData.recordId}}` |
| Property Address | `{{error.inputData.propertyAddress}}` |
| BA Email | `{{error.inputData.baEmail}}` |
| Input Data (JSON) | `{{json(error.inputData)}}` |

3. **Save** the Error Handler

## Step 3: Set Up Success Logging (After Module 14)

**This logs successful email sends.**

1. **In Path 4 (Client Emails):**
   - After **Module 14 (Gmail - Send Email)**, click **"+"**
   - Add **Google Sheets** → **"Add a row"** module
   - Select your sheet
   - Select tab: **"Sent"**
   - Map fields:

| Column | Make.com Field |
|--------|----------------|
| Timestamp | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
| Property Address | `{{7.propertyAddress}}` |
| Opportunity Name | `{{7.clientInfo.opportunityName}}` |
| Email Addresses Sent To | `{{14.to}}` |
| BA / Sender | `{{7.baName}}` |
| Send From Email | `{{7.sendFromEmail}}` |
| Message Type | `{{7.clientInfo.messageType}}` |

2. **Save** the module

## Step 4: Set Up Filtered Webhook Logging (After Module 18)

**This logs webhooks that don't match Router conditions.**

1. **After Module 18** (which comes after Router):
   - Add **Google Sheets** → **"Add a row"** module
   - Select your sheet
   - Select tab: **"Filtered"**
   - Map fields:

| Column | Make.com Field |
|--------|----------------|
| Timestamp | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
| Record ID | `{{1.id}}` or `{{1.recordId}}` |
| Property Address | `{{1.propertyAddress}}` |
| Reason | `{{1.source}}` (or create custom text like "No matching router condition") |
| Source | `{{1.source}}` |
| Packager Approved | `{{1.packager_approved}}` |
| Input Data (JSON) | `{{json(1)}}` |

**Note:** Module 18 receives data from Module 1 (Webhook), so use `{{1.fieldName}}` to access webhook data.

2. **Save** the module

## Summary

**What gets logged where:**

| Event | Tab | Trigger |
|-------|-----|---------|
| Email sent successfully | **Sent** | After Module 14 (Gmail) |
| Any module fails | **Errors** | Make.com Error Handler (automatic) |
| Webhook filtered out | **Filtered** | After Module 18 |

## Testing

1. **Test Success Logging:**
   - Send an email through portal
   - Check "Sent" tab - should see new row

2. **Test Error Logging:**
   - Temporarily break something (e.g., invalid GHL API key)
   - Run scenario
   - Check "Errors" tab - should see error

3. **Test Filtered Logging:**
   - Send a webhook that doesn't match Router conditions
   - Check "Filtered" tab - should see new row

## Monitoring

**Daily checks:**
- **Sent tab:** Count of emails sent
- **Errors tab:** Any failures (investigate immediately)
- **Filtered tab:** Webhooks that didn't match (expected, but good to monitor)

**No code changes needed** - all Make.com configuration!










