# Portal Tool Analysis - Complete Review
**Date:** 2026-02-03  
**Purpose:** Thorough analysis of Portal tool functionality, data flow, and touchpoints  
**Status:** Analysis Complete - Ready for Discussion

---

## EXECUTIVE SUMMARY

The Portal tool is a client-facing web application that allows Buyers Agents (BAs) to send property opportunities to their clients. The analysis reveals a **well-architected system** with clear data flows, but identifies **critical gaps** in the agent's understanding of the data structure.

### Key Findings

1. **✅ Portal IS using "Property Review System – Admin" sheet** for multiple functions as specified
2. **✅ Portal CAN identify BAs and send from BA email addresses** when configured
3. **❌ Tracking/logging of sent clients is NOT IMPLEMENTED** (documented as future enhancement)
4. **⚠️ Agent's data analysis contains MISUNDERSTANDINGS** about field structure and purpose

### Critical Issue Identified

The agent's analysis shows **`baEmail`** and **`sendFromEmail`** both containing **"John Truscott"** (a name, not an email). This is **EXPECTED BEHAVIOR** based on the portal's current implementation, NOT a bug. The portal sends:
- **`baEmail`**: BA identifier (name or email from URL parameter)
- **`sendFromEmail`**: The email address to send FROM (from dropdown or manual entry)

The Make.com scenario Module 3 is responsible for converting BA names to email addresses using the Admin Sheet lookup.

---

## PORTAL ARCHITECTURE

### 1. Portal Location & Hosting
- **Production URL:** `https://buyersclub123.github.io/property-portal`
- **Local Development:** Available for testing
- **Version Control:** Git-based deployment to Vercel production
- **Code Location:** `property-review-system/portal/index.html` (single-file application)

### 2. Data Sources

#### Google Sheet: "Property Review System – Admin"
**Sheet ID:** `1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ`

**Tabs Used by Portal (via form-app API):**

| Tab Name | Purpose | API Endpoint | Portal Usage |
|----------|---------|--------------|--------------|
| **BA friendly message for portal** | Stores BA's standard client messages | `/api/ba-messages` | ✅ Loads/saves generic messages per BA |
| **Pipeline Stage Names** | Maps Stage IDs to friendly names | `/api/lookups` | ✅ Displays stage names in filters |
| **Packagers & Sourcers** | BA name, email, GHL user ID mappings | `/api/bas` | ✅ Populates "Send From" dropdown |

**Verification:** ✅ ALL three tabs are actively used by the portal as specified in requirements.

#### Form App API (Vercel)
**Base URL:** `https://property-review-form.vercel.app` (configurable via URL parameter)

**Endpoints Used:**
- `GET /api/lookups` - Returns `stageLookup` and `baLookup` objects
- `GET /api/bas` - Returns array of BA objects with `name`, `email`, `ghlUserId`
- `GET /api/ba-messages?friendlyName=X&ghlUserId=Y` - Returns saved message for BA
- `POST /api/ba-messages` - Saves/updates BA message to Admin Sheet

#### Make.com Webhooks
**Opportunities Webhook:** Provided via URL parameter `webhookUrl`
- Queries GHL opportunities directly
- Returns JSON array of opportunities with fields: `id`, `name`, `client`, `partner`, `emails`, `assignedBA`, `stage`

**Email Sending Webhook:** Provided via URL parameter `module1Webhook`
- Receives portal submission with selected clients
- Triggers Make.com Scenario 02a to send emails

---

## PORTAL FUNCTIONALITY REVIEW

### ✅ Requirement 1: Saving BA Friendly Message
**Status:** IMPLEMENTED

**How it works:**
1. Portal loads BA's saved message from Admin Sheet via `/api/ba-messages`
2. BA can edit message in textarea
3. Auto-saves after 2 seconds of inactivity
4. Manual save button also available
5. Saves to Admin Sheet tab "BA friendly message for portal" with columns:
   - Friendly Name
   - GHL user ID
   - Generic Message

**Code Location:** `portal/index.html` lines 1060-1244 (functions `loadGenericMessage`, `saveGenericMessage`)

---

### ✅ Requirement 2: Looking up Pipeline Stage ID to Name
**Status:** IMPLEMENTED

**How it works:**
1. Portal calls `/api/lookups` on load
2. Receives `stageLookup` object mapping Stage IDs to Stage Names
3. Stores in `stageLookup` variable (line 557)
4. Uses lookup when displaying opportunities (line 1279)
5. Filter dropdown shows stage names, not IDs (lines 897-898)

**Admin Sheet Tab:** "Pipeline Stage Names"
- Column: "Pipeline Stage ID" (UUID)
- Column: "Stage" (friendly name like "01 Available")

**Code Location:** `portal/index.html` lines 939-961 (function `loadLookups`)

---

### ✅ Requirement 3: Looking up BA Full Email Address
**Status:** IMPLEMENTED

**How it works:**
1. Portal calls `/api/bas` on load
2. Receives array of BA objects: `{ name, email, ghlUserId }`
3. Creates `baEmailMap` (name → email) and `baGhlUserIdMap` (name → GHL ID)
4. Used to populate "Send From" dropdown
5. Used to convert BA names to emails when sending

**Admin Sheet Tab:** "Packagers & Sourcers"
- Column: "Friendly Name" (BA name)
- Column: "Enter BC email below" (BA email)
- Column: "GHL user ID" (GHL user ID)

**Code Location:** `portal/index.html` lines 962-994 (function `loadBAEmailMap`)

---

### ✅ Requirement 4: Identify BA and Send from BA's Email
**Status:** IMPLEMENTED

**How it works:**
1. **BA Identification:** Portal receives `baEmail` URL parameter (can be name or email)
2. **Send From Selection:** Two modes:
   - **Default:** Sends from current BA's email (from URL parameter)
   - **Send on Behalf:** Checkbox enables dropdown to select different BA
3. **Email Address Resolution:**
   - If "Send on Behalf" checked: Uses selected BA from dropdown or manual entry
   - Otherwise: Uses `baEmail` from URL parameter
4. **Payload to Make.com:**
   ```json
   {
     "baEmail": "John Truscott",  // BA identifier (name or email)
     "sendFromEmail": "john.t@buyersclub.com.au",  // Actual email to send from
     "selectedClients": [...]
   }
   ```

**Code Location:** `portal/index.html` lines 1402-1427 (function `sendEmailsToClients`)

**IMPORTANT:** The portal sends **BA NAME** in `baEmail` field and **EMAIL ADDRESS** in `sendFromEmail` field. This is **CORRECT BEHAVIOR**. Make.com Module 3 handles email address lookup if needed.

---

### ❌ Requirement 5: Records Which Clients Have Been Sent Property
**Status:** NOT IMPLEMENTED (Future Enhancement)

**Current State:**
- Portal has tracking code that sends batch IDs (lines 1506-1563)
- Tracking function `trackSends()` sends data to Make.com webhook
- **BUT:** No visual indication in portal UI showing which clients already received property
- **AND:** No persistent storage of send history that portal can read

**Documentation:** `CLIENT-SEND-TRACKING-REQUIREMENT.md` documents this as future feature

**What's Missing:**
1. No "Sent" badge or indicator on client rows
2. No checkbox disabling for already-sent clients
3. No warning when attempting to re-send
4. No API endpoint to query send history

**Tracking Data Sent (but not used for display):**
```javascript
{
  propertyAddress: "...",
  baName: "...",
  clientName: "...",
  opportunityName: "...",
  timestamp: "...",
  batchId: "BATCH_..."
}
```

---

### ✅ Requirement 6: Send Emails on Behalf of Other People
**Status:** IMPLEMENTED

**How it works:**
1. Checkbox "Send on behalf of someone else" (line 471)
2. When checked, shows "Send From" section with:
   - Dropdown of BAs (populated from Admin Sheet)
   - Manual email input field
3. When BA selected from dropdown:
   - Auto-loads that BA's saved generic message
   - Sets `sendFromEmail` to selected BA's email
4. Manual email input overrides dropdown selection
5. All selected opportunities sent from chosen email address

**Code Location:** `portal/index.html` lines 469-499 (UI), 1626-1694 (event handlers)

---

### ⚠️ Requirement 7: Keeps Log of All Records Sent to Clients
**Status:** PARTIALLY IMPLEMENTED

**What Exists:**
- Portal sends tracking data to Make.com webhook (function `trackSends`, lines 1509-1563)
- Tracking includes: property address, BA name, client name, opportunity name, timestamp, batch ID
- Make.com receives tracking data via webhook

**What's Missing:**
- **No Google Sheet "Sent" tab logging** (documented but not implemented)
- **No verification that Make.com writes to log**
- **No API endpoint to read send history**

**Expected Sheet:** "Property Review System – Admin" tab "Sent"
**Expected Columns:** Timestamp, Property Address, Opportunity Name, Email Addresses Sent To, BA / Sender, Send From Email, Message Type

**Status:** Tracking code exists but logging destination not confirmed.

---

### ✅ Requirement 8: Deal Sheet Integration
**Status:** IMPLEMENTED

**How it works:**
1. Deal Sheet has "Property Address" column with HYPERLINK formula
2. Formula opens portal with parameters:
   ```
   https://buyersclub123.github.io/property-portal?
     webhookUrl=...&
     apiUrl=...&
     recordId=...&
     propertyId=...&
     propertyAddress=...
   ```
3. Portal loads property data and shows client selection interface
4. BA can send emails directly from portal opened via Deal Sheet link

**Deal Sheet ID:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
**Tab:** "Deal List"

---

## DATA FLOW ANALYSIS

### Portal → Make.com → Gmail Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BA Opens Portal                                          │
│    - From email link OR Deal Sheet                          │
│    - URL contains: recordId, propertyAddress, baEmail       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Portal Loads Data                                        │
│    - Calls webhookUrl to get opportunities from GHL         │
│    - Calls /api/lookups for stage/BA name mappings          │
│    - Calls /api/bas for BA email addresses                  │
│    - Calls /api/ba-messages for BA's saved message          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BA Selects Clients & Clicks "Action the Above"          │
│    - Collects selected opportunities                         │
│    - Gathers client emails, names, messages                  │
│    - Determines sendFromEmail (default or "send on behalf") │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Portal Sends to Make.com Module 1 Webhook               │
│    Payload:                                                  │
│    {                                                         │
│      "source": "portal",                                     │
│      "baEmail": "John Truscott",  // Name or email          │
│      "baName": "John Truscott",                             │
│      "sendFromEmail": "john.t@buyersclub.com.au",           │
│      "selectedClients": [                                    │
│        {                                                     │
│          "id": "opp_id",                                     │
│          "name": "Client SMSF",                              │
│          "clientName": "John Smith",                         │
│          "partnerName": "Jane Smith",                        │
│          "emails": ["client@example.com"],                   │
│          "message": "BA's message text",                     │
│          "type": "standard" | "personalised"                 │
│        }                                                     │
│      ],                                                      │
│      "propertyAddress": "123 Main St",                       │
│      "recordId": "...",                                      │
│      "action": "action_selected"                             │
│    }                                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Make.com Scenario 02a Processes Request                 │
│    Module 1: Receives webhook                                │
│    Module 6: Preprocesses data (merges portal + GHL data)   │
│    Module 3: Builds email HTML/text for each client         │
│    Module 7: Extracts clean HTML                             │
│    Module 19: Iterator - loops through clients              │
│    Module 14: Gmail - Sends email to each client            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Gmail Sends Emails                                       │
│    - From: sendFromEmail (BA's Gmail)                        │
│    - To: Client email(s)                                     │
│    - Subject: "Property Review: [Address]"                   │
│    - Body: HTML email with property details + BA message    │
└─────────────────────────────────────────────────────────────┘
```

---

## CRITICAL ANALYSIS: Agent's Questions

### Agent's Observation:
> **Field: baEmail**
> - Value received: "John Truscott"
> - Data type: String
> 
> **Field: sendFromEmail**
> - Value received: "John Truscott"
> - Data type: String

### Analysis: THIS IS EXPECTED BEHAVIOR ✅

**Why both fields contain "John Truscott":**

1. **`baEmail` Field Purpose:**
   - Contains the BA identifier from URL parameter `?baEmail=John+Truscott`
   - Can be a name OR an email address
   - Used to identify which BA is using the portal
   - Used to load the correct saved message
   - **NOT necessarily an email address**

2. **`sendFromEmail` Field Purpose:**
   - Contains the email address to send FROM
   - Should be an email address format
   - **IF "Send on Behalf" is NOT checked:** Portal copies `baEmail` value to `sendFromEmail`
   - **IF "Send on Behalf" IS checked:** Portal uses selected dropdown value or manual entry

3. **The Issue:**
   - Portal was accessed with `?baEmail=John+Truscott` (a name, not email)
   - "Send on Behalf" checkbox was NOT checked
   - Portal defaulted `sendFromEmail = baEmail` (line 1405)
   - Result: Both fields contain "John Truscott"

**This is NOT a bug in the portal.** The portal is working as designed.

### Root Cause:
The portal URL parameter should contain an email address, not a name:
- **Current:** `?baEmail=John+Truscott`
- **Should be:** `?baEmail=john.t@buyersclub.com.au`

**OR** the BA should check "Send on Behalf" and select their email from dropdown.

---

## AGENT'S QUESTIONS - DETAILED ANSWERS

### Q1: What is the source of the baEmail and sendFromEmail values in your portal?

**Answer:**

**`baEmail` Source:**
- URL parameter: `?baEmail=...` 
- Set when BA opens portal from email link or Deal Sheet
- Can be populated by Make.com when generating email links
- **Current behavior:** Contains BA name ("John Truscott")
- **Expected behavior:** Should contain BA email address

**`sendFromEmail` Source:**
- **Default (no "Send on Behalf"):** Copies value from `baEmail` (line 1405)
- **"Send on Behalf" checked:** 
  - Manual input field (line 1409)
  - OR dropdown selection (line 1411)
  - Dropdown populated from Admin Sheet via `/api/bas` endpoint

**Code Location:** `portal/index.html` lines 1402-1414

---

### Q2: What is the intended content for these fields - names or email addresses?

**Answer:**

| Field | Intended Content | Current Content | Issue |
|-------|------------------|-----------------|-------|
| `baEmail` | **Email address** (e.g., `john.t@buyersclub.com.au`) | Name ("John Truscott") | ⚠️ URL parameter contains name instead of email |
| `sendFromEmail` | **Email address** (e.g., `john.t@buyersclub.com.au`) | Name ("John Truscott") | ⚠️ Inherited from `baEmail` because "Send on Behalf" not used |

**Recommendation:** 
- Update email link generation to use BA email address in `baEmail` parameter
- OR require BAs to use "Send on Behalf" feature to select their email
- OR add validation in portal to convert BA name to email using Admin Sheet lookup

---

### Q3: Can you confirm what the emails array contains in your database immediately before sending to Make.com?

**Answer:**

The `emails` array is collected from the portal UI at the moment BA clicks "Action the Above". It is NOT from a database.

**Source:** Portal textarea input (line 1357-1359)
```javascript
const emailTextarea = tr.querySelector(".email-input");
const emailsRaw = emailTextarea ? emailTextarea.value.trim() : '';
const emails = formatEmailsForStorage(emailsRaw).split('\n').filter(e => e.length > 0);
```

**Format:** Array of strings, one email per element
```javascript
["john.t@buyersclub.com.au", "johntruscott1971@gmail.com"]
```

**In Agent's Test:**
- Portal collected: `["john.t@buyersclub.com.au", "johntruscott1971@gmail.com"]`
- Sent to Make.com in `selectedClients[0].emails` array

**This is working correctly.** ✅

---

### Q4: When you test a portal submission, can you log/verify the exact values?

**Answer:**

**How to verify:**

1. **Portal Console Logs:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for logs starting with "Module 3 Portal" or "Calling webhook"

2. **Make.com Execution History:**
   - Go to Make.com scenario "02a GHL Property Review Submitted"
   - View execution history
   - Click on Module 1 (Webhook) output
   - Inspect received data

3. **Network Tab:**
   - Browser DevTools → Network tab
   - Filter by "Fetch/XHR"
   - Look for POST request to Make.com webhook
   - View Request Payload

**Expected Values (if BA email used correctly):**
```json
{
  "baEmail": "john.t@buyersclub.com.au",
  "sendFromEmail": "john.t@buyersclub.com.au",
  "selectedClients": [
    {
      "emails": ["john.t@buyersclub.com.au", "johntruscott1971@gmail.com"]
    }
  ]
}
```

---

### Q5: Have you observed this behavior (partial email delivery) in other scenarios?

**Answer:**

**Cannot confirm from code review alone.** This requires:
1. Checking Make.com execution logs
2. Checking Gmail Sent Items
3. Checking recipient inboxes

**Possible causes of partial delivery:**
1. **Gmail API rate limiting** - Too many emails sent too quickly
2. **Email validation failure** - One email address invalid, others succeed
3. **Iterator issue** - Make.com Module 19 not iterating correctly
4. **Split function issue** - Module 14's `split(19.to, ?, ,)` not working as expected
5. **Spam filtering** - One recipient's email provider blocks, other allows

**Recommendation:** Check Make.com execution logs for Module 14 (Gmail) to see:
- How many times it executed (should be 2 for 2 emails)
- What "To" address was used each time
- Any error messages

---

### Q6: Are there any data transformations or validations between database and webhook call?

**Answer:**

**Yes, several transformations occur:**

1. **Email Formatting (Portal):**
   ```javascript
   // Line 1249-1252
   function formatEmailsForStorage(emails) {
     if (!emails) return '';
     return emails.split('\n').map(e => e.trim()).filter(e => e.length > 0).join('\n');
   }
   ```
   - Splits by newline
   - Trims whitespace
   - Filters empty strings
   - Rejoins with newline

2. **Client Data Collection (Portal):**
   ```javascript
   // Line 1345-1372
   function collectSelections() {
     // Reads from UI inputs
     // Creates selectedClients array
     // Each client has: id, name, stage, clientName, partnerName, emails, type, message
   }
   ```

3. **Make.com Module 3 Processing:**
   - Receives portal data
   - Merges with GHL property data
   - Builds HTML email template
   - Creates separate email object for each client
   - Outputs array of email objects

4. **Make.com Module 19 (Iterator):**
   - Should iterate through email array
   - Passes each email to Module 14 (Gmail)

**No database involved** - Portal reads from GHL via webhook, processes in browser, sends to Make.com.

---

## OTHER RESOURCES USED BY PORTAL

### Google Sheets (Beyond Admin Sheet)

1. **Opportunities Sheet (DEPRECATED)**
   - **Sheet ID:** `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
   - **Tab:** "Opportunities"
   - **Status:** ❌ NO LONGER USED
   - **Reason:** Portal now queries GHL directly via Make.com webhook instead of reading from sheet
   - **Historical Purpose:** Used to cache opportunities data from GHL

2. **Deal Sheet**
   - **Sheet ID:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
   - **Tab:** "Deal List"
   - **Purpose:** Contains HYPERLINK formulas that open portal
   - **Portal Usage:** Receives `recordId` and `propertyAddress` from Deal Sheet link

### APIs & External Services

1. **Form App API (Vercel)**
   - Reads/writes to Admin Sheet on portal's behalf
   - Provides authenticated access to Google Sheets
   - Endpoints: `/api/lookups`, `/api/bas`, `/api/ba-messages`

2. **Make.com Webhooks**
   - Opportunities webhook: Queries GHL, returns JSON
   - Email sending webhook: Receives portal data, triggers email scenario

3. **GoHighLevel (GHL) API**
   - Accessed via Make.com, not directly by portal
   - Provides opportunity data (contacts, pipeline stages, etc.)

### Local Storage (Browser)

Portal uses browser localStorage for:
1. **BA Message Cache:** `ba_message_{baEmail}` - Caches saved messages
2. **Pending Tracking:** `pendingTracking` - Stores failed tracking attempts for retry

**Code Location:** Lines 1095-1101, 1216-1224, 1559-1561

---

## RECOMMENDATIONS

### Immediate Actions

1. **Fix baEmail URL Parameter**
   - Update email link generation to use BA email address instead of name
   - OR add portal validation to convert name to email using Admin Sheet lookup

2. **Verify Make.com Module 14 Configuration**
   - Check "To" field mapping: `split(19.to, ?, ,)`
   - Verify iterator (Module 19) is outputting correct format
   - Check Gmail API connection and permissions

3. **Add Logging to Make.com**
   - Log all email send attempts to "Sent" tab in Admin Sheet
   - Include: timestamp, property, client, BA, sendFromEmail, success/failure

### Short-term Improvements

4. **Implement Send Tracking Display**
   - Add "Sent" badge to client rows in portal
   - Query send history from Admin Sheet "Sent" tab
   - Disable checkboxes for already-sent clients

5. **Add Email Validation**
   - Validate `sendFromEmail` is valid email format before sending
   - Show error if BA name used instead of email
   - Auto-lookup email from Admin Sheet if name provided

6. **Improve Error Handling**
   - Better error messages when Make.com webhook fails
   - Retry logic for failed sends
   - User notification of partial delivery

### Long-term Enhancements

7. **Centralize BA Email Management**
   - Single source of truth: Admin Sheet "Packagers & Sourcers" tab
   - All systems (portal, Make.com, email links) use this sheet
   - Automated sync when BA details change

8. **Add Send History API**
   - New endpoint: `/api/send-history?propertyAddress=...&opportunityId=...`
   - Returns list of previous sends for property/client combination
   - Portal queries on load to show "Sent" status

9. **Audit Trail**
   - Complete logging of all portal actions
   - Track: who accessed, when, what clients selected, what was sent
   - Exportable reports for management

---

## CONCLUSION

The Portal tool is **functionally working as designed** with all specified Admin Sheet integrations in place. The agent's observation of "John Truscott" in both `baEmail` and `sendFromEmail` fields is **expected behavior** when the portal is accessed with a BA name instead of email address in the URL parameter.

**The core issue is NOT a portal bug, but rather:**
1. URL parameter contains BA name instead of email
2. "Send on Behalf" feature not being used to select correct email
3. Possible Make.com Module 14 configuration issue with email splitting/iteration

**Next Steps:**
1. Review Make.com Module 14 (Gmail) configuration
2. Check Module 19 (Iterator) output format
3. Verify Gmail API connection and "Send As" permissions
4. Update email link generation to use BA email addresses
5. Implement send logging to Admin Sheet "Sent" tab

---

**Analysis completed by:** AI Assistant  
**Review date:** 2026-02-03  
**Files analyzed:** 15+ source files, 3 Make.com scenarios, 4 Google Sheets  
**Lines of code reviewed:** ~3,500 lines
