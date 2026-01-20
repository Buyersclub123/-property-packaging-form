# Make.com Google Sheets Logging Setup

## Purpose
Log all client emails sent to a Google Sheet for audit and tracking.

## Step-by-Step Setup

### 1. Create Google Sheet

1. Create a new Google Sheet (or use existing)
2. Name the tab: `Email Log`
3. Add headers in Row 1:
   ```
   Timestamp | Property Address | Opportunity Name | Email Addresses Sent To | BA / Sender | Send From Email | Message Type
   ```
4. Share the sheet with your Make.com Google account (Editor permissions)
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### 2. Add Google Sheets Module in Make.com

**Location:** After Module 14 (Gmail - Send Email) in Path 4 (Client Emails)

**Steps:**
1. In Make.com scenario, go to Path 4 (Client Emails)
2. After Module 14 (Gmail), click "+" to add a new module
3. Search for "Google Sheets"
4. Select "Add a row"
5. Connect your Google account (if not already connected)
6. Select the sheet and tab (`Email Log`)

### 3. Map Fields

**In the Google Sheets "Add a row" module, map these fields:**

| Column Name | Make.com Field Mapping |
|-------------|------------------------|
| Timestamp | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
| Property Address | `{{7.propertyAddress}}` |
| Opportunity Name | `{{7.clientInfo.opportunityName}}` |
| Email Addresses Sent To | `{{14.to}}` OR `{{7.to}}` |
| BA / Sender | `{{7.baName}}` |
| Send From Email | `{{7.sendFromEmail}}` (optional) |
| Message Type | `{{7.clientInfo.messageType}}` (optional) |

**Note:** Module 7 receives data from Module 19 (Iterator), which receives from Module 3. All logging fields are passed through.

### 4. Test

1. Send a test email through the portal
2. Check the Google Sheet - a new row should appear
3. Verify all fields are populated correctly

## Troubleshooting

**If fields show as empty:**
- Check Module 7's execution logs to see what data it's receiving
- Verify Module 3 includes `propertyAddress` and `clientInfo.messageType` in output
- Check that Module 7 passes through these fields (see `make-code-module-7.js`)

**If timestamp is wrong timezone:**
- Use: `{{formatDate(now; "YYYY-MM-DD HH:mm:ss"; "Australia/Sydney")}}`

## Data Flow

```
Portal → Module 1 → Module 13 → Module 16 → Module 6 → Module 3 → Module 19 (Iterator) → Module 7 → Module 14 (Gmail) → Google Sheets (Log)
```

Each email sent = one row in the log sheet.










