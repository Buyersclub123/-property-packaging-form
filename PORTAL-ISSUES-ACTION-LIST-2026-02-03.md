# Portal Issues - Action List
**Date:** 2026-02-03  
**Status:** Open Issues Tracking  
**Last Updated:** 2026-02-03

---

## OPEN ISSUES (Priority Order)

### HIGH PRIORITY

#### Issue #1: BA Email Address Lookup Not Working
**Requirement:** Item 4 - Identify BA and send from BA's email address  
**Status:** ❌ BROKEN  
**Priority:** HIGH

**Problem:**
- Portal sends BA name ("John Truscott") in both `baEmail` and `sendFromEmail` fields to Make.com
- Should send email addresses in both fields

**Root Cause:**
- Line 1397: `baIdentifier = baEmail || currentBAFilter` gets BA name from URL parameter
- Line 1405: `sendFromEmail = baIdentifier || baEmail` copies the name instead of looking up email
- Portal has `baEmailMap` loaded from Admin Sheet but doesn't use it

**Fix Required:**
Before sending to Make.com (line 1416-1427), portal must:
1. Check if `baIdentifier` is a name (not email format)
2. If name, lookup email from `baEmailMap[baIdentifier]`
3. Use email address for both `baEmail` and `sendFromEmail` fields

**Additional Requirement:**
Add user warning message if BA name has no email match:
> "Your name is not matched to an email address to allow you to send emails to clients from this portal. Please contact support before attempting to send email from here."

**Code Location:** `portal/index.html` function `sendEmailsToClients` lines 1394-1427

**Dependencies:** Blocks Issue #6 (Send on behalf testing)

---

#### Issue #2: BA Friendly Message Not Saving to Admin Sheet
**Requirement:** Item 1 - Saving BA friendly message for portal  
**Status:** ❌ BROKEN  
**Priority:** HIGH

**Problem:**
- Portal shows "saved" confirmation message
- Admin Sheet tab "BA friendly message for portal" remains empty
- No data written to sheet

**Root Cause:**
- Save function requires both `friendlyName` AND `ghlUserId` to write to sheet
- Portal likely missing `ghlUserId` when calling `/api/ba-messages` POST endpoint

**Fix Required:**
- Portal must pass both BA's friendly name and their GHL user ID (from `baGhlUserIdMap`) when calling `/api/ba-messages` POST endpoint

**Code Location:** `portal/index.html` lines 1180-1183

**Admin Sheet Tab:** "BA friendly message for portal"
- Column A: Friendly Name
- Column B: GHL user ID  
- Column C: Generic Message

---

#### Issue #3: BA Email Lookup Verification
**Requirement:** Item 3 - Looking up BA full email address  
**Status:** ✅ WORKING (needs verification)  
**Priority:** HIGH

**Current State:**
- Portal calls `/api/bas` endpoint successfully
- Loads BA email addresses from Admin Sheet tab "Packagers & Sourcers" into `baEmailMap`
- Map used to populate "Send From" dropdown

**Issue:**
- While lookup works, portal doesn't use this map to convert BA names to emails before sending to Make.com
- This is root cause of Issue #1

**Action Required:**
- Confirm lookup is working correctly
- Use this map to fix Issue #1

**Code Location:** `portal/index.html` lines 962-994 (function `loadBAEmailMap`)

**Admin Sheet Tab:** "Packagers & Sourcers"
- Column: "Friendly Name" (BA name)
- Column: "Enter BC email below" (BA email)
- Column: "GHL user ID" (GHL user ID)

---

### MEDIUM PRIORITY

#### Issue #4: UI Improvements - Status Column and Sent Indicator
**Requirement:** Item 5 - Records which clients have been sent property (UI portion)  
**Status:** ❌ NOT IMPLEMENTED  
**Priority:** MEDIUM

**Changes Required:**

1. **Remove Status Column:**
   - Remove "Status" column from portal table view
   - Status is not editable and all records are "open"

2. **Update Count Text:**
   - Change from: "Showing all 25 opportunities"
   - Change to: "Showing all 25 OPEN opportunities"

3. **Add Sent Indicator:**
   - Add green background color to "Opportunity Name" cell for clients already sent property
   - Keep checkbox enabled (allow resend if client lost email)
   - Do not grey out or disable checkbox

**Dependencies:** Requires send history query functionality (Issue #5)

---

#### Issue #5: Send History Query and Logging
**Requirement:** Item 7 - Keeps a log of all records sent to clients  
**Status:** ❌ NOT IMPLEMENTED  
**Priority:** MEDIUM

**Current State:**
- Admin Sheet "Sent" tab exists
- Portal sends tracking data to Make.com webhook
- Only "source" field populating in sheet
- Other fields not being written

**Action Required:**
1. **JT to investigate Make.com** - verify scenario receives tracking data from portal
2. Update Make.com to write all tracking fields to Admin Sheet "Sent" tab:
   - Timestamp
   - Property Address
   - Opportunity Name
   - Email Addresses Sent To
   - BA / Sender
   - Send From Email
   - Message Type

**For Portal (Future):**
- Create API endpoint to query "Sent" tab by property address and opportunity ID
- Portal calls this on load to get send history
- Use data to highlight sent clients (green background per Issue #4)

**Status:** Awaiting JT's Make.com investigation results

---

### LOW PRIORITY

#### Issue #6: Send on Behalf Feature Testing
**Requirement:** Item 6 - Allows sending emails on behalf of other people  
**Status:** ✅ WORKING (cannot verify - BLOCKED)  
**Priority:** LOW (blocked by Issue #1)

**Current State:**
- "Send on behalf" checkbox functional
- Dropdown shows BA list from Admin Sheet
- When selected, should use that BA's email for sending

**Blocker:**
- Cannot verify functionality until Issue #1 (BA email address lookup) is fixed

**Test Plan (After Issue #1 Fixed):**
1. Check "Send on behalf" checkbox
2. Select BA from dropdown
3. Verify selected BA's saved message loads
4. Verify `sendFromEmail` uses selected BA's email address
5. Verify emails send from correct BA's Gmail account

**Dependencies:** Blocked by Issue #1

---

#### Issue #7: Deal Sheet Link Generation Not Working
**Requirement:** Item 8 - Deal Sheet integration  
**Status:** ⚠️ PARTIALLY WORKING  
**Priority:** LOW (test after portal fixes)

**Current State:**
- Portal opens correctly when HYPERLINK exists in Deal Sheet
- Portal loads property data successfully

**Problem:**
- New properties added to Deal Sheet are NOT getting HYPERLINK formulas in "Property Address" field
- Link generation code not running correctly

**Action Required:**
- After portal Issues #1, #2, #3 are resolved, investigate why Deal Sheet link generation failing for new properties
- Test end-to-end: Property added to Deal Sheet → HYPERLINK created → Portal opens correctly

**Status:** Test required after high priority portal fixes complete

---

## CLOSED ISSUES

*(None yet)*

---

## PRIORITY SUMMARY

**HIGH PRIORITY (Must Fix):**
1. Issue #1: BA Email Address Lookup Not Working
2. Issue #2: BA Friendly Message Not Saving
3. Issue #3: BA Email Lookup Verification

**MEDIUM PRIORITY:**
4. Issue #4: UI Improvements (Status Column + Sent Indicator)
5. Issue #5: Send History Query and Logging

**LOW PRIORITY (Blocked or Future):**
6. Issue #6: Send on Behalf Testing (blocked by #1)
7. Issue #7: Deal Sheet Link Generation (test after fixes)

---

## NEXT STEPS

1. Fix Issue #1 (BA email lookup) - unblocks Issue #6
2. Fix Issue #2 (message saving)
3. Verify Issue #3 (email lookup working)
4. JT investigates Make.com for Issue #5
5. Implement Issue #4 (UI changes) after #5 data available
6. Test Issue #6 after #1 fixed
7. Test Issue #7 after high priority items complete

---

**Document maintained by:** AI Assistant  
**Review with:** JT  
**Update frequency:** As issues discovered/resolved
