# Existing Make.com Scenarios

## ✅ Confirmed Scenarios

**Note:** Previous automation was in Zapier but has been retired in favor of Make.com. All functionality has been migrated to Make.com scenarios.

### 1. GHL Property Review Submitted ⭐ MAIN SCENARIO
- **Status:** Active
- **Purpose:** Receives webhook from GHL when Property Review is created/changed
- **Worked on:** Yesterday
- **Structure:**
  - Starts with **Webhooks** (Custom webhook)
  - Uses **Router** for branching logic
  - Has **Get Record** module (likely for Stash API or Google Sheets)
  - Multiple **Make Code** modules (custom JavaScript)
  - **Iterator** module (processes lists)
  - Multiple **Gmail** modules (sends emails)
- **Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **What it does:**
  - Receives Property Review data from GHL
  - Processes data through custom code
  - Generates and sends emails (multiple email types)
  - Likely calls Stash API (via Get Record or HTTP modules)
  - Likely writes to Google Sheets

### 2. Property Review Approval Webhook - by Ahmad
- **Status:** Active
- **Purpose:** Writes back to GHL Custom Object when packager approves the email
- **Structure:**
  - **Webhooks** (Custom webhook) - receives approval data
  - **Update Custom Object** (GHL) - writes approval status back
  - **Break** - stops execution
- **What it does:**
  - Receives approval webhook (likely from email approval button)
  - Updates `packager_approved` field in GHL Custom Object
  - Stops execution

### 3. Opportunity SNAPSHOT
- **Status:** Inactive
- **Purpose:** Pulls a view of opportunities in the pipeline stages being monitored
- **Structure:**
  - **Google Sheets** (Trigger) - "Clear Values from a Range"
  - **GoHighLevel** - "Search Opportunities"
  - **GoHighLevel** - "Get an Opportunity"
  - **GoHighLevel** - "Get a Contact"
  - **Google Sheets** - "Add a Row"
  - **Array aggregator** - aggregates data
  - **Google Sheets** - "Clear Values from a Range"
  - **Google Sheets** - "Update a Cell" (multiple)
- **What it does:**
  - Clears Google Sheet range
  - Searches GHL for opportunities in monitored pipeline stages
  - Gets opportunity and contact details
  - Writes to Google Sheet
  - Aggregates data
  - Updates cells
- **Status:** Works for testing, but "Realtime opportunity tracker" is preferred for production

### 4. Realtime opportunity tracker
- **Status:** Inactive (has issues)
- **Purpose:** Tracks opportunities in real time in the pipeline stages being monitored
- **Structure:**
  - **Webhooks** (Custom webhook) - receives opportunity updates
  - **Google Sheets** - "Search Rows" - checks if record exists
  - **Router** - branches based on existence
    - **Branch 1:** "Checks if exists" → **Google Sheets** - "Update a Row"
    - **Branch 2:** "Add row (fallback route)" → **Google Sheets** - "Add a Row"
- **What it does:**
  - Receives webhook when opportunity changes
  - Checks if opportunity already exists in Google Sheet
  - Updates existing row OR adds new row
- **Status:** ⚠️ **NOT WORKING** - needs to be fixed before production
- **Note:** Currently has 45 records waiting in queue

### 5. Test Stashproperty AP ⭐ STASH INTEGRATION
- **Status:** Active
- **Purpose:** Pulls data from Stash API
- **Worked on:** Today
- **Structure:**
  - **Webhooks** (Custom webhook) - receives request
  - **HTTP** - "Make a request" (calls Stash API)
  - **Make Code** - "Run code" (processes Stash response)
  - **HTTP** - "Make a request" (additional API call)
  - **Make Code** - "Run code" (further processing)
  - **HTTP** - "Make a request" (final API call)
  - **Make Code** - "Run code" (final processing)
  - **Webhooks** - "Webhook response" (returns data)
- **What it does:**
  - Receives webhook with property address
  - Calls Stash API to get risk overlays
  - Processes Stash response (extracts zoning, flood, bushfire, mining, etc.)
  - Returns processed data via webhook response
- **Webhook URL:** Need to confirm
- **Returns:** Risk overlays (Flood, Bushfire, Mining, Other Overlay, Special Infrastructure), Zoning, LGA, coordinates

---

## Integration Points

### GHL → Make.com Flow:
1. **GHL Workflow:** "PR → Property Review Created (Trigger)"
   - Triggers when Property Review custom object is created/changed
   - Sends webhook to: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
   - This triggers: **"GHL Property Review Submitted"** scenario

### Make.com → GHL Flow:
1. **"Property Review Approval Webhook - by Ahmad"**
   - Receives approval webhook
   - Updates GHL Custom Object (`packager_approved` field)

### Stash Integration:
1. **"Test Stashproperty AP"** scenario
   - Can be called via webhook
   - Returns Stash data (risk overlays, zoning, LGA)
   - **Question:** Is this called from "GHL Property Review Submitted" scenario, or called directly from form?

### Google Sheets Integration:
1. **"GHL Property Review Submitted"** likely writes to Google Sheets (Property Log)
2. **"Opportunity SNAPSHOT"** reads/writes opportunity data
3. **"Realtime opportunity tracker"** reads/writes opportunity data (when fixed)

---

## Questions to Answer (at end):

1. **"GHL Property Review Submitted" scenario:**
   - Does it call "Test Stashproperty AP" scenario, or does it call Stash API directly?
   - What Google Sheets does it write to? (Property Log tab?)
   - What emails does it send? (Packager email? BA email? Client emails?)
   - What triggers each email path in the Router?

2. **"Test Stashproperty AP" scenario:**
   - What's the webhook URL to trigger it?
   - What's the request format? (just address, or more data?)
   - What's the response format? (JSON structure?)

3. **Google Sheets:**
   - Which Google Sheet is used for Property Log?
   - What tabs exist?
   - Does "GHL Property Review Submitted" write to Property Log?

4. **Email Generation:**
   - Does "GHL Property Review Submitted" generate emails?
   - What's the email template structure?
   - Who receives which emails?

5. **Form Integration:**
   - Should the new form call "Test Stashproperty AP" directly?
   - Or should the form write to GHL, which then triggers "GHL Property Review Submitted"?
   - What's the preferred flow?

---

## Next Steps:

1. ✅ Documented Make.com scenarios
2. ⏭️ Answer questions above
3. ⏭️ Understand integration flow
4. ⏭️ Start building form


