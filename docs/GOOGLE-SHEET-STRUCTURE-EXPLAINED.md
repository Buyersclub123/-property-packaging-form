# Google Sheet Structure - Visual Explanation

## One Google Sheet, Three Tabs

Think of it like a filing cabinet with 3 drawers:

```
┌─────────────────────────────────────────┐
│  Property Review System Logs           │
├─────────────────────────────────────────┤
│  [Sent]  [Errors]  [Filtered]         │
└─────────────────────────────────────────┘
```

## Tab 1: "Sent" - Successful Emails

**What it tracks:** Every email that was successfully sent to a client

**When it logs:** After Module 14 (Gmail) successfully sends an email

**Columns (Row 1 headers):**
```
| Timestamp           | Property Address                    | Opportunity Name      | Email Addresses Sent To              | BA / Sender    | Send From Email              | Message Type   |
|---------------------|------------------------------------|-----------------------|--------------------------------------|----------------|------------------------------|----------------|
| 2025-12-21 14:30:15 | 123 Main St, City QLD 4000        | John Smith SMSF IP1   | john@example.com,partner@example.com | John Smith     | john.smith@buyersclub.com.au | Personalised   |
| 2025-12-21 14:31:22 | 456 Oak Ave, Town NSW 2000        | Jane Doe Investment   | jane@example.com                     | Jane Doe       | jane.doe@buyersclub.com.au   | Standard       |
```

**Example row:**
- Timestamp: When email was sent
- Property Address: The property address
- Opportunity Name: Client opportunity name
- Email Addresses Sent To: Who received it (comma-separated)
- BA / Sender: Which BA sent it
- Send From Email: Email address used to send
- Message Type: Standard or Personalised

---

## Tab 2: "Errors" - All Failures

**What it tracks:** Any error that occurs anywhere in the scenario

**When it logs:** Automatically via Make.com Error Handler (catches errors from ANY module)

**Columns (Row 1 headers):**
```
| Timestamp           | Scenario Name              | Execution ID | Module Name | Error Type      | Error Message                    | Record ID              | Property Address         | BA Email              | Input Data (JSON) |
|---------------------|----------------------------|--------------|------------|-----------------|----------------------------------|------------------------|--------------------------|-----------------------|-------------------|
| 2025-12-21 15:00:00 | Property Review System     | 123456789    | Module 13  | Invalid API Key | GHL API authentication failed    | 6945137fb4468e598c8e12 | 123 Main St, City QLD    | john@example.com      | {...}             |
| 2025-12-21 15:05:00 | Property Review System     | 123456790    | Module 14  | Gmail Error     | Recipient email address invalid  | 6945137fb4468e598c8e12 | 123 Main St, City QLD    | john@example.com      | {...}             |
```

**Example row:**
- Timestamp: When error occurred
- Scenario Name: Which Make.com scenario
- Execution ID: Unique execution ID (for debugging)
- Module Name: Which module failed (e.g., "Module 13", "Module 14")
- Error Type: Type of error (e.g., "Invalid API Key", "Gmail Error")
- Error Message: Detailed error message
- Record ID: GHL record ID (if available)
- Property Address: Property address (if available)
- BA Email: BA email (if available)
- Input Data (JSON): Full input data that caused error (for debugging)

---

## Tab 3: "Filtered" - Skipped Webhooks

**What it tracks:** Webhooks that didn't match any Router condition (filtered out)

**When it logs:** After Module 18 (webhooks that don't go to Paths 1, 2, 3, or 4)

**Columns (Row 1 headers):**
```
| Timestamp           | Record ID              | Property Address         | Reason                    | Source  | Packager Approved | Input Data (JSON) |
|---------------------|------------------------|--------------------------|--------------------------|---------|-------------------|-------------------|
| 2025-12-21 16:00:00 | 6945137fb4468e598c8e12 | 123 Main St, City QLD    | No matching router        | portal  |                   | {...}             |
| 2025-12-21 16:01:00 | 6945137fb4468e598c8e13 | 456 Oak Ave, Town NSW    | packager_approved empty   | ghl     |                   | {...}             |
```

**Example row:**
- Timestamp: When webhook was received
- Record ID: GHL record ID
- Property Address: Property address (if available)
- Reason: Why it was filtered (e.g., "No matching router condition", "packager_approved empty")
- Source: Where webhook came from ("portal" or "ghl")
- Packager Approved: Value of packager_approved field (if available)
- Input Data (JSON): Full webhook data (for debugging)

---

## Visual Summary

```
Google Sheet: "Property Review System Logs"
│
├── Tab: "Sent" (Green ✅)
│   └── Every successful email send
│       └── Triggered by: Module 14 (Gmail) success
│
├── Tab: "Errors" (Red ❌)
│   └── Every error from any module
│       └── Triggered by: Make.com Error Handler (automatic)
│
└── Tab: "Filtered" (Yellow ⚠️)
    └── Webhooks that didn't match Router
        └── Triggered by: Module 18 (after Router)
```

## How to Create It

1. **Open Google Sheets**
2. **Create new sheet** (or use existing)
3. **Rename sheet** to "Property Review System Logs"
4. **Create 3 tabs:**
   - Right-click bottom tab → "Insert sheet" → Name it "Sent"
   - Right-click bottom tab → "Insert sheet" → Name it "Errors"
   - Right-click bottom tab → "Insert sheet" → Name it "Filtered"
5. **Add headers** to Row 1 in each tab (copy from above)
6. **Share** with Make.com Google account (Editor permissions)
7. **Copy Sheet ID** from URL

## What Happens Automatically

Once configured in Make.com:

- ✅ **Email sent** → Row added to "Sent" tab
- ❌ **Error occurs** → Row added to "Errors" tab
- ⚠️ **Webhook filtered** → Row added to "Filtered" tab

**You don't need to do anything** - Make.com writes to the sheet automatically!










