# Email Log Google Sheet Setup

## Purpose
Log all emails sent to clients for audit and tracking purposes.

## Google Sheet Structure

### Sheet Name: `Email Log`

### Columns (in order):
1. **Timestamp** - Date & Time email was sent
2. **Property Address** - Address of the property
3. **Opportunity Name** - Client opportunity name
4. **Email Addresses Sent To** - Comma-separated list of recipient emails
5. **BA / Sender** - BA name or sender email
6. **Send From Email** - (Optional) Email address used to send (if different from BA)
7. **Message Type** - (Optional) Standard or Personalised

### Example Row:
```
2025-12-21 14:30:15 | 123 Main St, City QLD 4000 | John Smith SMSF IP1 | john@example.com,partner@example.com | John Smith | john.smith@buyersclub.com.au | Personalised
```

## Setup Instructions

1. **Create Google Sheet:**
   - Create a new Google Sheet or use existing one
   - Name the tab: `Email Log`
   - Add headers in Row 1 (see columns above)

2. **Share Sheet with Make.com:**
   - Share the sheet with your Make.com Google account
   - Give "Editor" permissions

3. **Get Sheet ID:**
   - From the sheet URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - Copy the `[SHEET_ID]` part

4. **Configure Make.com:**
   - Add Google Sheets module after Module 14 (Gmail)
   - Map fields to columns (see mapping below)

## Field Mapping for Make.com

**After Module 14 (Gmail)**, add a Google Sheets "Add a row" module.

**Data Flow:** Module 3 → Module 19 (Iterator) → Module 7 → Module 14 (Gmail) → Google Sheets

**Field Mappings:**
- **Timestamp**: `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` (or use Australia/Sydney timezone)
- **Property Address**: `{{19.propertyAddress}}` (from Iterator)
- **Opportunity Name**: `{{19.clientInfo.opportunityName}}` (from Iterator)
- **Email Addresses Sent To**: `{{14.to}}` (from Gmail module) OR `{{19.to}}` (from Iterator)
- **BA / Sender**: `{{19.baName}}` (from Iterator)
- **Send From Email**: `{{19.sendFromEmail}}` (from Iterator) - Optional
- **Message Type**: `{{19.clientInfo.messageType}}` (from Iterator) - Optional

**Alternative:** If fields aren't available from Module 19, use Module 7's output:
- Property Address: `{{7.propertyAddress}}`
- Opportunity Name: `{{7.clientInfo.opportunityName}}`
- BA / Sender: `{{7.baName}}`
- Send From Email: `{{7.sendFromEmail}}`
- Message Type: `{{7.clientInfo.messageType}}`

## Notes

- Each email sent = one row in the log
- If multiple emails sent to same opportunity (client + partner), each gets a separate row
- Timestamp should be in Australia/Sydney timezone
- Sheet will grow over time - consider archiving old data periodically

