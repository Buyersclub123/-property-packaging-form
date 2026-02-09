# Priority Checklist - What to Work On Next

---



**Instructions:** For each item, add your decision next to "- **Your Decision:** ____" (or update "- **Status:**" if that field exists)
- **Fixed** = This issue has been resolved (will be moved to "✅ FIXED" section at bottom)
- **TO DO** = Item needs to be done (kept in current priority section, clearly marked)
- **Test** = Item may be resolved or not an issue, but needs double-checking (will be moved to "🧪 TEST" section)
- **Nice to Have** / **Nice to do** = Lower priority, can add sentence to change priority if needed
- **Need to test again** = Previously fixed but needs re-testing (will be moved to "🧪 NEED TO TEST AGAIN" section)
- **REMOVE FROM LIST** = Item no longer valid (will be removed)

After you've marked items, the list will be automatically reorganized:
- Items marked "Fixed" → Moved to "✅ FIXED" section at bottom
- Items marked "Test" → Moved to "🧪 TEST" section (items to verify/resolve)
- Items marked "Need to test again" → Moved to "🧪 NEED TO TEST AGAIN" section
- Items marked "Nice to Have" / "Nice to do" → Stay in current priority section (P1/P2/P3) or moved based on your priority notes (e.g., "change to medium priority", "LOW PRIORITY")
- Items marked "TO DO" → Remain in current section, clearly marked
- Items marked "REMOVE FROM LIST" → Removed entirely
- All other items → Remain in their current priority sections

## 📋 REFERENCE - Make.com Router Filter Issues

**Issue:** Module 10 (BA Path) and Module 20 (QA Path) are reading approval fields from the webhook (Module 1) instead of from the GHL record data (Module 16), so `qa_approved` may be missing or incorrect, causing the QA path to be skipped.

**Why it might suddenly stop working after working for days:**

1. **GHL webhook payload changed** - The webhook (Module 1) previously included `qa_approved`, so `{{1.qa_approved}}` worked. GHL may have stopped sending it in the webhook, or this property has a different value/empty field, so the filter now fails.

2. **Module 13's GHL API response structure changed** - Module 13's GHL API response structure changed, so Module 16 can't extract `qa_approved` anymore, or the property's `qa_approved` value changed (e.g., empty/null vs "Approved"), exposing the malformed filter.

3. **Property data changed** - The property's `qa_approved` value changed (e.g., empty/null vs "Approved"), exposing the malformed filter.

**Quick check:** In Make.com execution logs, verify what `{{1.qa_approved}}` and `{{16.result.qa_approved}}` contain for the failing run.

**Analysis from Failed Run (Module 1 Output):**

**Property:** Lot 345, Units A&B, 3 Croydon St Petersham NSW 2049

**Findings:**
- ✅ `qa_approved` **IS present** in webhook: `"qa_approved": "null"` (string "null", not missing)
- ✅ `packager_approved`: `"Approved"` ✓
- ✅ `ba_approved`: `"null"` (string)
- ✅ `packager`: `"john.t"` (short name format)

**Key Observations:**
1. The webhook includes `qa_approved`, but it's `"null"` (string), not `"Approved"`
2. The malformed filter in Module 20 (`"\"a\": \"{{1.qa_approved}}\"."`) is likely breaking the comparison
3. Even if the filter worked, `"null" != "Approved"` should make the QA path trigger, but the malformed condition may prevent that
4. **Note:** Recent properties have full names in packager field instead of short names - this one shows `"john.t"` (short), indicating possible inconsistency in GHL webhook data format

**Comparison: Failed Run vs Working Run (Module 1 Output):**

| Field | Failed Run (Earlier) | Working Run (2:27 PM) | Match? |
|-------|---------------------|----------------------|--------|
| `qa_approved` | `"null"` | `"null"` | ✅ **IDENTICAL** |
| `packager_approved` | `"Approved"` | `"Approved"` | ✅ **IDENTICAL** |
| `ba_approved` | `"null"` | `"null"` | ✅ **IDENTICAL** |
| `packager` | `"john.t"` | `"john.t"` | ✅ **IDENTICAL** |

**CRITICAL FINDING:** Both runs have **identical approval field values** in the webhook payload. This means:
- ❌ The issue is **NOT** with the webhook payload (Module 1)
- ✅ The problem is likely:
  1. **Malformed filter in Module 20** causing unpredictable behavior (`"\"a\": \"{{1.qa_approved}}\"."`)
  2. **Module 16 extraction** - Module 16 may be extracting different values from Module 13 (GHL record) than what's in the webhook
  3. **Filter evaluation inconsistency** - The malformed filter may work sometimes and fail other times due to Make.com's filter evaluation logic

**CHANGES MADE TODAY (Same Time Period Issue Started):**

**1. Module 3 - Added QA Logic (Today):**
- **Local file (old):** Does NOT read `qa_approved`, subject logic: `if (packagerApproved === "approved") { subjectPrefix = "BA AUTO SEND – "; }`
- **Blueprint (new, today):** Reads `qa_approved`, subject logic: `if (qaApproved === "approved") { subjectPrefix = "BA AUTO SEND – "; } else if (packagerApproved === "approved") { subjectPrefix = "QA TO VERIFY – "; }`
- **Impact:** Module 3 now generates "QA TO VERIFY" subject when `packager_approved === "approved"` AND `qa_approved !== "approved"`

**2. Module 16 - Updated to Extract qa_approved (Today):**
- **Local file (old):** Only returns `packager_approved`
- **Blueprint (new, today):** Returns both `packager_approved` AND `qa_approved` from Module 13's GHL record

**ANALYSIS: Why Module 16 Change Was Made**

**Context from Documentation (Scenario 02a/ISSUES-TRACKER.md):**
- **Portal requests:** Portal payload to Module 1 contains `source: "portal"`, `id`, but **NO** `qa_approved`, `packager_approved`, or `ba_approved`
- **For Portal requests:** Approval fields must come from Module 13 (GHL record) → Module 16 extracts them
- **Change was made for Portal requests, NOT for GHL webhook requests**

**For GHL Webhook Requests:**
- GHL webhook (Module 1) **DOES** include all approval fields (`packager_approved`, `qa_approved`, `ba_approved`)
- GHL workflow triggers fire when approval status changes (Property Review Changed when "Packager Approved" = 'Approved', etc.)
- **If webhook fires on approval changes, Module 1 should have current data - no need for Module 16**

**EVIDENCE FOUND:**
- **File:** `make-com-scenarios/QA-STEP-ANALYSIS.md`
- **Date:** 2026-01-29
- **Status:** "✅ Implementation Complete - Ready for Testing (2026-01-29)"
- **Line 414:** "Module 16: Add qa_approved extraction"
- **Line 331-332:** "Phase 7: Module 16 Updates - [x] ✅ Add `qa_approved` extraction"

**FACT:** Documentation shows Module 16 was changed to extract `qa_approved` on January 29, 2026 as part of QA step implementation.

**USER CONFIRMATION NEEDED:** You don't remember agreeing to this change. Either:
1. Documentation is incorrect about when/why it was implemented
2. Change was made without your knowledge/agreement
3. Change was reverted and re-added today without discussion

**WHAT BREAKS IF WE REVERT MODULE 16 (remove qa_approved extraction):**

**✅ Portal requests:** WILL BREAK
- Module 14 filter uses `{{16.result.qa_approved}}` for Portal requests
- Portal webhook doesn't include `qa_approved` in Module 1
- Without Module 16 extracting it from Module 13, Portal client emails won't send

**✅ GHL webhook requests:** WON'T BREAK
- Router filters (Module 20, Module 10) use `{{1.qa_approved}}` (from webhook)
- GHL webhook includes `qa_approved` in Module 1
- Module 16's `qa_approved` extraction is NOT used for GHL webhook router filters

**RECOMMENDATION:**
- **Keep Module 16 extracting qa_approved** (needed for Portal)
- **Fix router filters for GHL webhook requests** to use `{{1.qa_approved}}` correctly (not malformed)
- **The issue today is the malformed filter, not Module 16**

**Benefit 2: QA Workflow Step (Module 3 QA logic)**
- **Why:** Adds quality control layer between Packager and BA
- **Business value:** Prevents poorly packaged properties from reaching BA, reducing BA time wasted on unsuitable properties
- **Workflow:** Packager → QA Review → BA Review → Client
- **Benefit:** QA can catch errors, formatting issues, or missing information before BA sees the property

**THE MISMATCH:**
- Module 3 and Module 16 were updated to support QA workflow using GHL as source of truth
- **BUT** router filters (Module 20, Module 10) still use `{{1.*}}` (webhook) instead of `{{16.result.*}}` (GHL record)
- This creates inconsistency: Module 3 generates emails based on one data source, but router filters decide paths based on a different (potentially stale) data source

**DECISION NEEDED:**
- **Option A:** Keep Module 3/16 changes, fix router filters to use `{{16.result.*}}` (recommended if QA workflow is needed)
- **Option B:** Revert Module 3/16 changes, fix router filters to properly use `{{1.*}}` (if QA workflow isn't needed or can be handled differently)

**Module 20 Filter (QA Path) in Blueprint:**
```json
{
    "a": "\"a\": \"{{1.qa_approved}}\".",
    "b": "Approved",
    "o": "text:notequal"
}
```
- ❌ **Malformed** AND using wrong source (`{{1.*}}` instead of `{{16.result.*}}`)
- Should be: `"a": "{{16.result.qa_approved}}"` to match today's changes

**FIX APPLIED (2026-02-03):**
- ✅ **Module 3 Updated:** Reinstated QA logic to match blueprint
  - Added `qaApproved` variable reading
  - Updated subject prefix logic: `if (qaApproved === "approved") { "BA AUTO SEND" } else if (packagerApproved === "approved") { "QA TO VERIFY" }`
  - Added `isQAEmail` flag: `packagerApproved === "approved" && qaApproved !== "approved"`
  - Updated `isBAEmail` flag: `packagerApproved === "approved" && qaApproved === "approved" && baApproved !== "approved"`
  - Added QA email message preview handling
  - Added QA approval section HTML with "QA TO VERIFY" text
  - Added QA text body handling
  - Added QA recipient email: `packaging@buyersclub.com.au`
  - Added `isQAEmail` to console logs
  - **File:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`
  - **Status:** ✅ Code updated, awaiting user testing

**Next Steps:**
- ⏳ **TESTING:** User testing property submission to verify QA path works
- 🔍 **VERIFY:** After testing, check Make.com execution logs to confirm QA email is generated and sent correctly

---

## 🧪 TESTING INCIDENTS

Issues discovered during testing that need investigation and resolution:

---

## 🔥 URGENT - Must Complete 

(No urgent items remaining)

---

## ✅ ACTION LIST - Items Ready to Work On

Items that have been prioritized and are ready for implementation:

- [ ] **Email Tempate - N/A bieng used instead of Vacant**
  - **Problem:** N/A shown for currebt rent and expiry 
  - **Impact:** Poor UI Experience?
  - **Effort:** 1-2 hours
  JT UPDATE: 

- [ ] **Email Tempate - Asking using backend wording for Pre Launch Opportunity**
  - **Problem:** BAck end field name being used not friendly field name
  - **Impact:** Poor UI Experience
  - **Effort:** 1-2 hours
  JT UPDATE: 

- [ ] **Page 8 - Fix Cashflow Spreadsheet Dropdown Calc**
  - **Problem:** Drawdown sheet not fully working working
  - **Impact:** Can't select/calculate cashflow properly
  - **Effort:** 1-2 hours
  JT UPDATE: 

- [ ] **Page 9 - Remove "Create Another Folder" Button**
  - **Problem:** Button no longer needed
  - **Impact:** Cleaner UI
  - **Effort:** 15 minutes
JT UPDATE: FIXED

- [ ] **Page 10 (Submission) - Update Checklist**
  - **Remove:** "Investment Highlights reviewed" checkbox
  - **Add:** "CMA reports and Hotspotting report added to the folder" with link to folder
  - **Impact:** More accurate checklist
  - **Effort:** 1-2 hours
JT UPDATE:

- [ ] **Page 1 - Make LGA Field Mandatory**
  - **What:** Make LGA (Local Government Area) field required on Page 1 (Address & Risk Check)
  - **Problem:** "Why This Property" API call on Page 5 requires LGA, but field is optional. If LGA is missing, API fails with 400 error.
  - **Solution:** 
    - Make LGA field required (add validation to prevent proceeding to Page 2 without LGA)
    - Add helpful message (user will provide text)
    - Add Google search link that opens with suburb and state pre-filled (e.g., "LGA of [Suburb] [State]") to minimize user keystrokes
  - **Impact:** Ensures LGA is always available for Page 5 API calls and Investment Highlights lookup
  - **Effort:** 2-3 hours
JT UPDATE:

- [x] **Page 6 - Hotspotting Report Name - Popup Message** ✅ FIXED (2026-01-28)
  - **What:** Add instruction about removing "Location Report" from report names on Page 6
  - **Message:** "Remove the words 'Location Report' from the beginning of the name. The list is presented in alphabetical order so the report needs to start with the LGA name."
  - **Problem:** Users may include "Location Report" in the name, which breaks alphabetical sorting in the dropdown list
  - **Impact:** Ensures proper alphabetical ordering in Investment Highlights dropdown (reports sorted by LGA name)
  - **Effort:** 1-2 hours
  - **Implementation:** Added instruction text to the existing warning message box in PDF verification UI. Message is displayed as a bullet point in the amber warning box, always visible when users are verifying extracted report name. Also increased warning message text size from `text-xs` to `text-base` with better styling for visibility.
JT UPDATE:FIXED

- [x] **Page 6 - Investment Highlights Reselection After Navigation** ✅ FIXED (2026-01-28)
  - **What:** Ensure "Change Selection or Enter Manually" button is always visible when a report has been selected
  - **Problem:** "Change Selection" button exists and works correctly for all three selection methods (auto-match, dropdown, PDF upload), BUT disappears when user navigates away from Page 6 and returns. Component remounts, state resets (`matchStatus` → `null`), so button becomes invisible even though `value` and `formData` (hotspottingReportName, etc.) still have data.
  - **Technical Details:**
    - Button exists at line 704 in `InvestmentHighlightsField.tsx`, only visible when `matchStatus === 'found'` (line 668)
    - **Auto-match (`lookupReport`)**: Sets `matchStatus` to `'found'` at line 223 when match is found
    - **Dropdown selection (`handleDropdownSelect`)**: Sets `matchStatus` to `'found'` at line 149 when report is selected
    - **PDF upload (`handleConfirmMetadata`)**: Sets `matchStatus` to `'found'` at line 587 after PDF is processed
    - **State initialization**: `matchStatus` initializes to `null` at line 47, `reportName` to `''` at line 48, `validPeriod` to `''` at line 49
    - **Issue**: On component remount (navigation away/back), state resets but `value` prop and `formData` (via `updateFormData`) still contain the data
  - **Solution:** On component mount (in `useEffect`), check if `value` exists AND report info exists in `formData` (hotspottingReportName, hotspottingPdfFileId, hotspottingValidPeriod, etc.). If so, restore state: set `matchStatus` to `'found'`, restore `reportName` and `validPeriod` from formData. This will make the button visible again. Add this check to the existing `useEffect` at line 83 or create a new one that runs on mount.
  - **Impact:** Users can always change their selection, even after navigating away and back. Works for all three selection methods (auto-match, dropdown, PDF upload).
  - **Effort:** 1-2 hours
  - **Implementation:** Added new `useEffect` hook that runs on mount to restore UI state from `formData`. Checks for `hotspottingReportName` or `hotspottingPdfFileId` in formData, and if found (and no earlyProcessing data exists), restores `matchStatus` to `'found'` and restores `reportName` and `validPeriod`. This matches the pattern used by Proximity and Why This Property fields. Also increased size of important warning message from `text-xs` to `text-base` with better styling.
JT UPDATE:FIXED

- [ ] **Page 9 - Checklist Updates for Dual Occupancy Properties**
  - **What:** Update submission checklist on Page 9 for Dual Occupancy properties
  - **Changes:**
    - Remove "Investment Highlights reviewed" from checklist
    - Remove "Dual occupancy details confirmed (2 sets of bed/bath/garage)" from checklist
    - Remove "Land cost and build cost confirmed" from checklist
    - Add "Marketing Materials uploaded" to checklist
  - **Impact:** More accurate checklist for dual occupancy properties
  - **Effort:** 1-2 hours
JT UPDATE:

- [ ] **Page 9 - Checklist Updates for Single Occupancy Properties**
  - **What:** Update submission checklist on Page 9 for Single Occupancy properties
  - **Changes:**
    - Remove "Investment Highlights reviewed" from checklist
  - **Impact:** More accurate checklist for single occupancy properties
  - **Effort:** 1 hour
JT UPDATE:

- [ ] **Page 9 - Add Friendly Text Next to Open Folder Link**
  - **What:** Add helpful text next to the "Open folder" link on Page 9
  - **Text:** "Forgotten to add an attachment? Click the folder link now and add it in"
  - **Impact:** Helps users remember to add attachments before submission
  - **Effort:** 30 minutes
JT UPDATE:

- [ ] **Page 9 - Email Receipt Text and Resend Button**
  - **What:** Add text about checking spam folder and resend email functionality
  - **Text:** "If you don't receive the email, check your spam folder or use the 'Resend Email' button above"
  - **Question:** Need to clarify/implement "Resend Email" button - where should it be located?
  - **Impact:** Better user guidance for email delivery issues
  - **Effort:** 1-2 hours (depends on Resend Email button implementation)
JT UPDATE:

- [ ] **Page 8 - Remove Create Another Folder Button**
  - **What:** Remove "Create another folder" button from Page 8
  - **Problem:** Button was only for testing purposes, no longer needed
  - **Impact:** Cleaner UI, removes testing artifact
  - **Effort:** 15 minutes
JT UPDATE:

- [ ] **Page 8 - Split Contract Fields Default Values**
  - **What:** Set default values for split contract fields on Page 8
  - **Fields:** Build Window, Cashback 1 month, Cashback 2 month (visible when property is split contract)
  - **Requirements:**
    - Keep fields editable and mandatory
    - Default Build Window to "09 mo"
    - Default Cashback 1 month to empty
    - Default Cashback 2 month to empty
    - Make cashback fields dropdown/select lists
  - **Impact:** Better UX, consistent default values for split contracts
  - **Effort:** 1-2 hours
JT UPDATE:

- [x] **Page 8 - Folder Creation Error Message** ✅ REVIEWED - NO CHANGES NEEDED
  - **What:** Update error message when folder creation is forgotten
  - **Problem:** Current error message only mentions missing fields, doesn't mention that folder hasn't been created
  - **Solution:** Include folder creation status in error message
  - **Impact:** Users will know if folder creation was missed, not just field validation
  - **Effort:** 1 hour
  - **Status:** Reviewed - Current message is accurate. Folder cannot be created without mandatory fields (Council/Water Rates, Insurance Amount, etc.), so the error message correctly states "fill in all required fields before proceeding, or you have not created the folder". No changes needed.
JT UPDATE:FIXED

- [ ] **Page 5 (Market Performance) - Make Fields Read-Only**
  - **Problem:** Users can edit fields without clicking "Needs updating", then can't save
  - **Solution:** Make all value fields read-only by default (especially if populated), only editable when "Needs updating" clicked
  - **Impact:** Prevents user confusion and data loss
  - **Effort:** 2-3 hours
  - **Priority:** Medium priority
JT UPDATE:

- [ ] **Fix Project Address Overwriting Property Address**
  - **Problem:** Route 2 Module 22 uses wrong address
  - **Impact:** Property address incorrect for projects
  - **Effort:** 1-2 hours
  - **Note:** Duplicate entry - appears twice in NEED TO TEST AGAIN section
JT UPDATE:

---

## 📋 TO DO

- [ ] **Page 1 - Improve Stash API Error Handling for Make.com Credit Issues**
  - **What:** Better error detection and user messaging when Make.com returns "Accepted" response
  - **Problem:** When Make.com runs out of credits, webhook returns "Accepted" (plain text) instead of JSON data. Code currently treats this as valid response and returns empty fields, making it unclear why LGA, Zoning, Flood, and Bushfire data is missing.
  - **Solution:** 
    - Detect when response is just "Accepted" (plain text string)
    - Show clear error message: "Make.com scenario may not have executed. Please check your Make.com account status (credits/quota)."
    - Log this specific case for easier debugging
  - **Impact:** Users will immediately know when Make.com has issues (credits/quota) instead of silently getting empty data
  - **Effort:** 1-2 hours
  - **Your Decision:** TO DO





---

## 🔧 GENERAL/BACKEND

Items that are not page-specific (backend, email, GHL/Make.com, portal, etc.):

- [ ] **Form Edit Access** ⚠️ DEADLINE: Y | **TO DO**
  - **What:** Edit existing records (not just create new)
  - **Impact:** Can update properties after creation
  - **Effort:** 8-12 hours
  - **Priority:** REALLY IMPORTANT TO BE DONE
  - **Your Decision:** TO DO

- [ ] **Email Button Options** ⚠️ DEADLINE:  | **TO DO**
  - **What:** "Edit Property" button in emails
  - **Impact:** Easy access to edit from email
  - **Effort:** 2-3 hours
  - **Priority:** REALLY IMPORTANT TO BE DONE
  - **Your Decision:** TO DO

- [ ] **Project Email Formatting** ⚠️ DEADLINE:  | **TO DO**
  - **What:** Define visual format for multi-lot project emails
  - **Impact:** Better project presentation
  - **Effort:** 4-6 hours
  - **Priority:** NEED TO DO END OF TOMORROW
  - **Your Decision:** TO DO

- [ ] **Smart Property Linking**
  - **What:** If property passes pipeline value stage, force record to be linked to a property
  - **Impact:** Better data integrity, prevents orphaned records
  - **Effort:** 4-6 hours
  - **Your Decision:** TO DO

- [ ] **New Deal Sheet**
  - **What:** View all properties with filtering/sorting
  - **Impact:** Better property management
  - **Effort:** 12-16 hours
  - **Your Decision:** TO DO

- [ ] **Send Tracking & Logging**
  - **What:** Track who sent what to which clients
  - **Impact:** Better visibility and accountability
  - **Effort:** 6-8 hours
  - **Your Decision:** TO DO

- [ ] **Portal Client Status Display**
  - **What:** Show "Sent" badge for already-sent properties
  - **Impact:** Prevent duplicate sends
  - **Effort:** 3-4 hours
  - **Your Decision:** TO DO

- [ ] **Create System Baseline Snapshot**
  - **What:** Holistic system snapshot of requirements and current state
  - **When:** After today's 4 items are complete and deployed to production
  - **Approach:** Git tag + clean docs (Option 3)
    - Tag current state as "v1.0-production-baseline"
    - Archive old docs to `_archive/` folder
    - Create ONE comprehensive doc: `SYSTEM-BASELINE.md`
  - **Goal:** Clean baseline with no noise, fresh start for maintenance
  - **Consider:** Possibly create new project since it's in production
  - **Your Decision:** TO DO

- [ ] **Mobile Responsive Email Template**
  - **Problem:** Bullet points overlap on mobile
  - **Impact:** Better mobile experience
  - **Effort:** 2-3 hours
  - **Your Decision:** TO DO

- [ ] **Photo Document Generator**
  - **What:** Drag photos into box (like hotspotting report upload), auto-generate photo document
  - **Impact:** Automated photo document creation
  - **Effort:** 12-16 hours (research + implementation)
  - **Your Decision:** NICE TO DO

- [ ] **CMA Reports Upload**
  - **What:** Same drag/drop box style as Hotspotting
  - **Impact:** Easier CMA report management
  - **Effort:** 6-8 hours
  - **Your Decision:** NICE TO DO

- [ ] **Other Documents Upload**
  - **What:** Drag/drop capability for any documents
  - **Impact:** Flexible document management
  - **Effort:** 4-6 hours
  - **Your Decision:** NICE TO DO

- [ ] **Independent Data Entry Interface**
  - **What:** For LGA Hotspotting reports and Market Performance data (team can enter when not busy)
  - **Impact:** Better data management workflow
  - **Effort:** 16-20 hours
  - **Your Decision:** NICE TO DO

---

## 💡 NICE TO DO

- [ ] **Page 8 - Duplicate Folder Names**
  - **Problem:** Need to prevent duplicate folder names (suggests re-packaging same property)
  - **Solution:** Add validation/process for handling duplicates
  - **Impact:** Prevents confusion and errors
  - **Effort:** 2-3 hours
  - **Your Decision:** Nice to do


- [ ] **Page 3 - Unit Numbers Not Retained**
  - **Problem:** "Does this property have unit numbers?" value not retained when navigating back/forth
  - **Impact:** User loses data
  - **Effort:** 1-2 hours
  - **Your Decision:** NICE TO DO, LOW PRIORITY

- [ ] **Page 1 - Smart Paste for Selling Agent Fields**
  - **What:** Add intelligent paste parsing for Selling Agent Name, Company, Email, and Mobile fields
  - **Problem:** Users often copy contact information from Google reviews, real estate websites, or contact lists in multi-line format. Currently requires manual entry into separate fields.
  - **Solution:** 
    - Create `parseContactFromText()` function in `src/lib/phoneFormatter.ts`
    - Detect multi-line pasted text in any of the Selling Agent fields
    - Automatically extract:
      - **Name:** First line that looks like a person's name (2-4 words, proper case or all-caps like "MATT BROOKS")
      - **Company:** Lines containing "Real Estate", "Realty", "Agency", etc.
      - **Phone:** Australian mobile numbers in various formats (04XX XXX XXX, +61 4XX XXX XXX, etc.)
      - **Email:** Email addresses
    - Auto-format phone numbers to +61 4XX XXX XXX format
    - Skip section headers like "Agency logo", "Inspection times", "Price guide", etc.
    - Skip ratings like "5.0" or "(97 reviews)"
  - **Examples Handled:**
    - `"Alan Riley\n5.0\n(97 reviews)\n0422723719"` → Name: "Alan Riley", Phone: "+61 4 227 237 19"
    - `"Tyson Clarke\nQueensland Sotheby's International Realty\n...\n+61 407 034 803"` → Name: "Tyson Clarke", Company: "Queensland Sotheby's International Realty", Phone: "+61 4 070 348 03"
    - `"MATT BROOKS\nManor Real Estate\n...\n0422 037 063"` → Name: "MATT BROOKS", Company: "Manor Real Estate", Phone: "+61 4 220 370 63"
    - `"Eliza Coppin\nTom Offermann Real Estate\n...\n0423 726 639"` → Name: "Eliza Coppin", Company: "Tom Offermann Real Estate", Phone: "+61 4 237 266 39"
  - **Impact:** Saves time, reduces errors, improves UX when copying from external sources
  - **Effort:** 2-3 hours (parser function + component integration)
  - **Files to Modify:**
    - Create: `src/lib/phoneFormatter.ts` (phone formatting + contact parser)
    - Update: `src/components/steps/Step0AddressAndRisk.tsx` (add onPaste handlers to all Selling Agent fields)
    - Update: `src/types/form.ts` (add `sellingAgentCompany?: string` field)
  - **Your Decision:** NICE TO HAVE
  - **Note:** Create a standalone test rig to test the paste parsing logic before integrating into the main form


---

## 🧪 NEED TO TEST AGAIN

Items that were previously fixed but need re-testing:

- [x] **Module 9 Change - Remove Parent Record** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **What:** Create only child records for multi-lot projects
  - **Impact:** Simplified data structure
  - **Effort:** 4-6 hours (requires testing)
  - **Status:** TO DO - NEED TO TEST
  - **Your Decision:** TO DO


  - [x] **Price Group Calculation** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **Problem:** price_group field not auto-generated
  - **Impact:** Manual entry required
  - **Effort:** 2 hours (need to define logic)
  - **Status:** Believed fixed, add to test checklist (pages 5-9)
  - **Your Decision:** Test

- [ ] **Test body_corp fields**
  - **Problem:** Not tested yet
  - **Impact:** May not work correctly
  - **Effort:** 1 hour
  - **Your Decision:** Test

- [x] **Fix "Owner Corp (community)" dropdown bug** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **Problem:** Body Corp fields don't show when selected
  - **Impact:** Can't enter body corp data
  - **Effort:** 1-2 hours
  - **Status:** Believed resolved, add to test checklist (pages 6-9)
  - **Your Decision:** Test

---

## ✅ FIXED

Items that have been resolved and are complete:

- [x] **Page 1 - Due Diligence Dropdown Order** ✅ FIXED
  - **What:** Change Due Diligence dropdown option order on Page 1
  - **Current:** Defaults to "--Select--", then "No", then "Yes"
  - **Change:** Keep "--Select--" as default, but change order to "Yes" then "No"
  - **Impact:** Better UX, Yes option appears first after default
  - **Effort:** 30 minutes
  - **Your Decision:** FIXED
  - **Date Fixed:** 2026-01-28

- [x] **Page 1 - Make Due Diligence Field More Obvious** ✅ FIXED
  - **What:** Highlight Due Diligence field to make it more visible on Page 1
  - **Solution:** Add green border/highlight or visual emphasis around the field
  - **Impact:** Users less likely to miss this important field
  - **Effort:** 1 hour
  - **Your Decision:** FIXED
  - **Implementation:** Added green border (border-2 border-green-400), light green background (bg-green-50), rounded container, and emphasized label styling
  - **Date Fixed:** 2026-01-28

- [x] **Page 1 - Make Selling Agent Fields Mandatory** ✅ FIXED
  - **What:** Make Selling Agent Name, Email, and Mobile fields required on Page 1
  - **Fields:** Selling Agent Name, Selling Agent Email, Selling Agent Mobile
  - **Impact:** Ensures complete selling agent information is captured
  - **Effort:** 1-2 hours
  - **Date Fixed:** 2026-01-28
  - **Implementation Details:**
    - All three fields now have `required` attribute and red asterisks (*)
    - All fields accept "TBC" as valid input (case insensitive)
    - Mobile field: Auto-formats phone numbers to +61 4 50 581 822 format, accepts "TBC"
    - Email field: Validates email format or accepts "TBC", normalizes to lowercase
    - Name field: Accepts any text or "TBC"
    - Validation added to `handleProceedToStep2` function and `MultiStepForm.tsx`
    - Inline error messages (replaced alert dialogs) - red error box above buttons
    - Auto-scrolls to relevant section when validation fails
    - Created `src/lib/phoneFormatter.ts` for phone number formatting utilities

- [x] **Fix Step 5 field clearing issue** ✅ FIXED
  - **Problem:** Investment Highlights & Why This Property clear when Proximity loads
  - **Impact:** User has to go back/forward to see their data
  - **Effort:** 1-2 hours
  - **Your Decision:** FIXED

- [x] **Add Hotspotting PDF to property folder** ✅ FIXED
  - **Problem:** PDF link/shortcut not added when folder created
  - **Impact:** Users have to manually add PDF
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Fix Unit Number Bug (Page 2)** ✅ FIXED
  - **Problem:** hasUnitNumbers doesn't persist when navigating back to Page 2
  - **Impact:** User loses unit number selection state
  - **Effort:** 1-2 hours
  - **Action:** Update Step1DecisionTree.tsx (or Step 2 equivalent) to initialize state from useFormStore
  - **Your Decision:** FIXED

- [x] **Investment Highlights enhanced workflow** ✅ FIXED
  - **What:** Searchable dropdown, date validation, drag & drop, auto-suburb mapping
  - **Impact:** Major UX improvement, reduces manual work
  - **Effort:** 6-8 hours (detailed plan exists)
  - **Your Decision:** FIXED

- [x] **Fix Market Performance Check Buttons** ✅ FIXED
  - **Problem:** "Check data", "Data is fine", "Need to update" buttons not working
  - **Impact:** Broke during show & tell, embarrassing
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Separate Market Performance Field Functionality** ✅ FIXED
  - **Problem:** Fields affect each other, changes break things
  - **Impact:** Prevents future breakage
  - **Effort:** 3-4 hours (refactoring)
  - **Your Decision:** FIXED

- [x] **Hide Proximity error if pre-fetched data exists** ✅ FIXED
  - **Problem:** Error shows but field works (confusing)
  - **Impact:** Better UX, less user confusion
  - **Effort:** 30 minutes
  - **Your Decision:** FIXED

- [x] **Remove CMI Reports Notice from Page 1** ✅ FIXED
  - **Problem:** Notice no longer needed
  - **Impact:** Cleaner UI
  - **Effort:** 15 minutes
  - **Your Decision:** FIXED

- [x] **Investment Highlights Output Analysis** ✅ FIXED
  - **What:** Run output through ChatGPT analysis tool to dial in format
  - **Impact:** Better formatted output
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Video Format Requirements** ✅ FIXED
  - **Question:** What formats are OK for folder sharing?
  - **Action:** Research video format compatibility
  - **Effort:** 1-2 hours research
  - **Your Decision:** FIXED

- [x] **Deal Sheet → Client Selection** ✅ FIXED
  - **What:** Send properties to clients from Deal Sheet
  - **Impact:** Streamlined workflow
  - **Effort:** 6-8 hours
  - **Your Decision:** FIXED

- [x] **Address Validation with Suggestions** ✅ FIXED
  - **What:** Spelling correction, address suggestions
  - **Impact:** Fewer address errors
  - **Effort:** 6-8 hours
  - **Your Decision:** FIXED

- [x] **API Protection System** ✅ FIXED
  - **What:** Rate limiting, logging, email alerts
  - **Your Decision:** FIXED

- [x] **Form Validation Fix** ✅ FIXED
  - **What:** Step 5 fields
  - **Your Decision:** FIXED

- [x] **Save totalPrice to Lot Data** ✅ FIXED
  - **Problem:** Calculated totalPrice not saved for lots
  - **Impact:** Multi-lot projects missing total price
  - **Effort:** 1-2 hours
  - **Your Decision:** FIXED

- [x] **Page 6 (Proximity & Content) - Checkbox Not Retained** ✅ FIXED
  - **Problem:** Review checkbox doesn't retain when navigating back/forth
  - **Solution:** Add carriage return instead of just space to ensure validation never fails
  - **Impact:** Users can skip content review
  - **Effort:** 1 hour
  - **Your Decision:** FIXED

- [x] **Page 7 (Insurance) - Value Display Bug** ✅ FIXED
  - **Problem:** Insurance value shows "$5" instead of "$5,192" on Page 9 (field type issue)
  - **Solution:** Fix field type, remove decimal places (only show round figures)
  - **Impact:** Incorrect values displayed in cashflow
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Hotspotting Report - Valid Period Extraction** ✅ FIXED
  - **Problem:** If can't obtain Valid Period, system puts "could not obtain" in sheet
  - **Solution:** Show friendly message with entry field for user to paste from front page
  - **Impact:** Better UX, complete data
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Hotspotting Report - File Naming** ✅ FIXED
  - **Problem:** Files named with suburb prefix (e.g., "Point Vernon Fraser Coast")
  - **Solution:** Remove suburb prefix, only use report name (e.g., "Fraser Coast")
  - **Impact:** Cleaner file naming
  - **Effort:** 1 hour
  - **Your Decision:** FIXED

- [x] **Investment Highlights - "Regional" in Heading** ✅ FIXED
  - **Problem:** Shows "Fraser Coast Regional" - where did "Regional" come from?
  - **Action:** Check extraction logic
  - **Impact:** Incorrect heading
  - **Effort:** 1-2 hours
  - **Your Decision:** FIXED

- [x] **Make.com - Investment Highlights Newline Escaping** ✅ FIXED
  - **Problem:** Form sends `\\n` (escaped newlines) to GHL, Make.com receives `\\\\n` (double-escaped), email formatting breaks
  - **Root Cause:** `JSON.stringify()` in form API escapes newlines, Make.com's `normaliseNewlines()` function doesn't handle double-escaped newlines correctly
  - **Solution:** Update `normaliseNewlines()` in `MODULE-3-COMPLETE-FOR-MAKE.js` to replace `\\\\n` BEFORE `\\n` (order matters)
  - **Impact:** Email formatting for Investment Highlights section is broken
  - **Effort:** 30 minutes (simple regex order fix)
  - **Your Decision:** FIXED

- [x] **Make.com - "Why This Property" Formatting** ✅ FIXED
  - **Problem:** "Why This Property" section may have same newline escaping issue as Investment Highlights
  - **Solution:** Same fix as Investment Highlights - update `normaliseNewlines()` in `MODULE-3-COMPLETE-FOR-MAKE.js`
  - **Impact:** Email formatting consistency
  - **Effort:** Included in Investment Highlights fix (same function)
  - **Your Decision:** FIXED

- [x] **Phase 5: 3-Step Flow** ✅ FIXED
  - **Was:** Step 6 (Washington Brown), Step 7 (Cashflow), Step 8 (Submission)
  - **Now:** Step 6 (Insurance), Step 7 (Washington Brown), Step 8 (Cashflow), Step 9 (Submission)
  - **Your Decision:** FIXED

- [x] **Page 10 (Submission) - Add Missing Elements** ✅ FIXED
  - **What:** Add Attachments notes field and BA Message field to Page 10
  - **Add:** Attachments notes field
  - **Add:** BA Message field
  - **Note:** These existed on previous last page, just need to replicate
  - **Impact:** Complete submission page
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Page 6 - Fix Proximity & Why This Property Duplicate API Calls** ✅ FIXED
  - **Problem:** Both fields still loading when user reaches Page 6, causing duplicate API calls
  - **Root Cause:** Early processing starts on Page 4, but Page 6 components don't check if early processing is still "processing" - they only check if data is "ready". If user moves quickly through Page 5, early processing is still running when Page 6 loads, so components trigger their own API calls, resulting in duplicate calls.
  - **Solution:** Components should check `earlyProcessing?.proximity?.status === 'processing'` and wait/poll for completion before triggering fallback API calls. Only trigger new calls if status is 'error' or undefined.
  - **Impact:** Prevents duplicate API calls, reduces API costs, improves performance
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **QA Step for Email Workflow** ✅ FIXED
  - **What:** Add QA approval step in email workflow
  - **Current Flow:** Submitted → Packager Approve → BA Email → Client Email
  - **New Flow:** Submitted → Packager Approve → **QA STEP APPROVAL** → BA Email → Client Email
  - **Impact:** Quality control before client-facing emails
  - **Effort:** 8-12 hours
  - **Your Decision:** FIXED

- [x] **New Field in Opportunities - BA Assignment** ✅ FIXED
  - **What:** Add field for BA looking after the client
  - **Impact:** Better client management tracking
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Page 6 - Why This Property Output Analysis** ✅ FIXED
  - **What:** Run output through ChatGPT analysis tool (formatting "seems weird")
  - **Impact:** Better formatted output
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED

- [x] **Page 6 - Stop Duplicate Proximity API Calls** ✅ FIXED
  - **What:** Analyze and fix duplicate proximity API calls on Page 6
  - **Problem:** Proximity field is making 2x API calls unnecessarily
  - **Action:** Analysis first to identify root cause, then implement fix
  - **Impact:** Reduces API costs and improves performance
  - **Effort:** 2-3 hours (analysis + fix)
  - **Your Decision:** FIXED

- [x] **Incident #1: Hotspotting PDF Not Added to Folder** ✅ FIXED (2026-01-28)
  - **Date:** Current Testing Session
  - **Test Scenario:** Tested a property where the Suburb and LGA matched with an existing hotspotting report and the report was in date
  - **Issue:** When the folder was created, the hotspotting report was not in the folder
  - **Expected Behavior:** PDF shortcut should be added to property folder when report is selected from dropdown or auto-lookup finds a match
  - **Status:** ✅ **FIXED** (2026-01-28)

  #### Root Cause Analysis

  **Primary Issue:**
  The folder creation API (`/api/create-property-folder/route.ts` line 234) only adds a PDF shortcut if `formData?.hotspottingPdfFileId` exists and is truthy. When a report is selected from the dropdown:

  1. **Dropdown Selection Flow:**
     - User selects report from dropdown → `handleDropdownSelect()` is called
     - Calls `/api/investment-highlights/lookup` API
     - Lookup API reads Google Sheet columns A-G (line 649 in `googleSheets.ts`)
     - Returns `pdfFileId` from Column G (`matchingRow[6]`) (line 710)
     - Sets `hotspottingPdfFileId` in formData (line 169 in `InvestmentHighlightsField.tsx`)
     - **Problem:** If Column G (PDF File ID) is empty in the Google Sheet, `pdfFileId` will be an empty string `''`
     - Empty string is falsy, so `if (formData?.hotspottingPdfFileId)` fails (line 234)
     - Result: PDF shortcut is NOT created

  **All Scenarios - Status After Fix:**

  1. **✅ Auto-Lookup Match (FIXED):**
     - Auto-lookup finds match → Now stores `hotspottingPdfFileId` in formData
     - **Status:** ✅ **FIXED** - PDF shortcut now created

  2. **✅ Dropdown Selection (Already Working):**
     - User selects from dropdown → Stores `hotspottingPdfFileId` in formData
     - **Status:** ✅ Working correctly

  3. **✅ PDF Upload Scenario (Working):**
     - User uploads PDF → Gets fileId from upload
     - Calls `/api/investment-highlights/organize-pdf` → Returns fileId
     - Sets `hotspottingPdfFileId` (line 569)
     - **Status:** ✅ Working correctly

  4. **✅ Manual Entry Scenario (Expected Behavior):**
     - User enters content manually (no match found)
     - No PDF fileId set
     - **Status:** ✅ Correct - no PDF should be added

  5. **⚠️ Edge Case: Empty PDF File ID Column:**
     - Match found in Google Sheet but Column G (PDF File ID) is empty
     - **Status:** PDF won't be added (expected - no fileId available)
     - **Note:** This is a data quality issue, not a code bug

  6. **⚠️ Edge Case: Folder Created Before Report Selected:**
     - If folder is created on Step 8 before user selects report on Step 5 (unlikely due to flow)
     - **Status:** PDF won't be added (folder already created)
     - **Note:** Current flow prevents this (folder created on Step 8, after Step 5)

  **Summary of Findings:**

  **VERIFIED FACTS (From Code Analysis):**
  1. ✅ Folder creation checks `if (formData?.hotspottingPdfFileId)` (line 234 in `create-property-folder/route.ts`)
  2. ✅ Lookup API reads Column G (`matchingRow[6]`) for `pdfFileId` (line 710 in `googleSheets.ts`)
  3. ✅ Dropdown selection correctly sets `hotspottingPdfFileId` in formData (line 169 in `InvestmentHighlightsField.tsx`)
  4. ❌ **Auto-lookup did NOT set `hotspottingPdfFileId` in formData** (missing `updateFormData()` call)
  5. ✅ Folder is created on Step 8 (Cashflow Review) - AFTER Step 5 (where report is selected)

  **ACTUAL ROOT CAUSE (Verified):**
  - **Issue:** Auto-lookup flow (`lookupReport()` function) was NOT storing PDF File ID in formData
  - **Details:** When auto-lookup found a match, it only set the main body content via `onChange(mainBody)`, but did NOT call `updateFormData()` to store `hotspottingPdfFileId` and `hotspottingPdfLink`
  - **Comparison:** Dropdown selection flow (`handleDropdownSelect()`) correctly stored PDF File ID (line 169), but auto-lookup did not
  - **Result:** When folder was created on Step 8, `formData?.hotspottingPdfFileId` was undefined/empty, so PDF shortcut was not created

  **FIX APPLIED (2026-01-28):**
  - **File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`
  - **Change:** Added `updateFormData()` call in `lookupReport()` function (lines 247-252) to store:
    - `hotspottingPdfLink: result.data.pdfDriveLink || ''`
    - `hotspottingPdfFileId: result.data.pdfFileId || ''`
    - `hotspottingReportName: result.data.reportName || ''`
    - `hotspottingValidPeriod: result.data.validPeriod || ''`
  - **Result:** ✅ **FIXED** - PDF shortcuts now created for both auto-lookup and dropdown selection flows
  - **Test:** Verified with "24 Stirling Cct Redbank Plains QLD 4301" - PDF now appears in folder ✅

  **Current Flow (Timing is Correct):**
  1. Step 0: "Continue with Packaging" clicked → Enables fields (does NOT create folder)
  2. Step 5: User selects investment highlights report → Sets `hotspottingPdfFileId` in formData
  3. Step 8: User clicks "Create Folder & Populate Spreadsheet" → Folder created, checks for `hotspottingPdfFileId`
  - **Timing is correct** - folder is created AFTER report selection

  **Additional Root Causes:**
  1. **No Fallback to Drive Link:** Folder creation only checks for `hotspottingPdfFileId`, not `hotspottingPdfLink`. Even if Column F (PDF Drive Link) has a valid link, it won't be used if Column G is empty
  2. **No Validation/Error Handling:** No warning to user if PDF File ID is missing when report is selected
  3. **Silent Failure:** If PDF File ID is empty, the folder creation succeeds but PDF is silently not added

  **Remaining Edge Cases (Not Bugs - Expected Behavior or Data Quality Issues):**
  1. ✅ **Match found but Column G (PDF File ID) is empty** → PDF won't be added (data quality issue - fileId not available in sheet)
  2. ✅ **Match found with Drive Link (Column F) but no File ID (Column G)** → PDF won't be added (no fileId to create shortcut - would need to extract from link)
  3. ✅ **Manual entry (no match)** → PDF won't be added (expected behavior - user enters manually, no PDF to add)
  4. ✅ **Lookup API returns empty pdfFileId** → PDF won't be added (data quality issue - Google Sheet missing fileId)

---

## 📝 SUMMARY

**Total Items:**
- **URGENT:** 0 items
- **ACTION LIST:** 19 items (ready to work on)
- **TO DO:** 0 items (moved to ACTION LIST)
- **Nice to do:** 2 items
- **Test:** 3 items
- **Need to Test Again:** 1 item
- **Fixed:** 26 items (including Incident #1: Hotspotting PDF Not Added to Folder and Page 6 - Stop Duplicate Proximity API Calls)

---PROXIMTY TOOL OVERVIEW - IMPLEMENTED

Solution:
Use Geoscape coordinates from page 1 (already available)
Use Haversine formula for straight-line distances to hardcoded airports/cities (no geocoding needed)
Make 2 Geoapify calls:
Combined call for all amenity categories (limit 500)
Separate call for hospitals only (limit 500) to ensure enough hospital results
Use Haversine to sort each category by distance (top 10 per category)
Apply production logic to reduce amenities before Google Maps:
Train: 1, Bus: 1, Childcare: 4, Schools: 3, Supermarkets: 5, Hospitals: 2
Apply tier logic to airports/cities:
If closest is Group 3: show Group 3 + Group 1
If closest is Group 2: show Group 2 + Group 1
If closest is Group 1: show Group 1 + closest from Group 2/3
Result: 2 airports + 2 cities max
Send final combined list (max 21 destinations) to Google Maps in one call
Test tool created:
Shows raw results, filtered amenities, all airports/cities, filtered airports/cities, and final list
Validates the approach before production implementation
TEST TOO CREATED is http://localhost:3000/test/proximity-api for this

