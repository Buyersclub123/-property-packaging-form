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

## 🧪 TESTING INCIDENTS

Issues discovered during testing that need investigation and resolution:

### Incident #1: Hotspotting PDF Not Added to Folder (Match Found, Report In Date)
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

## 🔥 URGENT - Must Complete 

- [ ] **Page 10 (Submission) - Add Missing Elements**
  - **Add:** Attachments notes field
  - **Add:** BA Message field
  - **Note:** These existed on previous last page, just need to replicate
  - **Impact:** Complete submission page
  - **Effort:** 2-3 hours
  - **Your Decision:** FIXED
  
  -- [ ] **QA Step for Email Workflow**
  - **What:** Add QA approval step in email workflow
  - **Current Flow:** Submitted → Packager Approve → BA Email → Client Email
  - **New Flow:** Submitted → Packager Approve → **QA STEP APPROVAL** → BA Email → Client Email
  - **Impact:** Quality control before client-facing emails
  - **Effort:** 8-12 hours
  - **Your Decision:** TO DO

  - [ ] **New Field in Opportunities - BA Assignment**
  - **What:** Add field for BA looking after the client
  - **Impact:** Better client management tracking
  - **Effort:** 2-3 hours
  - **Your Decision:** TO DO
  
  [ ] **Form Edit Access** ⚠️ DEADLINE: Y | **TO DO**
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

---

## 📋 TO DO

- [ ] **Fix Cashflow Spreadsheet Dropdown Calc**
  - **Problem:** Drawdown sheet not fully working working
  - **Impact:** Can't select/calculate cashflow properly
  - **Effort:** 1-2 hours
  - **Your Decision:** TO DO

- [ ] **Page 9 - Remove "Create Another Folder" Button**
  - **Problem:** Button no longer needed
  - **Impact:** Cleaner UI
  - **Effort:** 15 minutes
  - **Your Decision:** TO DO

- [ ] **Page 10 (Submission) - Update Checklist**
  - **Remove:** "Investment Highlights reviewed" checkbox
  - **Add:** "CMA reports and Hotspotting report added to the folder" with link to folder
  - **Impact:** More accurate checklist
  - **Effort:** 1-2 hours
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





---

## 💡 NICE TO DO

- [ ] **Duplicate Folder Names**
  - **Problem:** Need to prevent duplicate folder names (suggests re-packaging same property)
  - **Solution:** Add validation/process for handling duplicates
  - **Impact:** Prevents confusion and errors
  - **Effort:** 2-3 hours
  - **Your Decision:** Nice to do

  - [ ] **Mobile Responsive Email Template**
  - **Problem:** Bullet points overlap on mobile
  - **Impact:** Better mobile experience
  - **Effort:** 2-3 hours
  - **Your Decision:** TO DO

- [ ] **Page 5 (Market Performance) - Make Fields Read-Only**
  - **Problem:** Users can edit fields without clicking "Needs updating", then can't save
  - **Solution:** Make all value fields read-only by default (especially if populated), only editable when "Needs updating" clicked
  - **Impact:** Prevents user confusion and data loss
  - **Effort:** 2-3 hours
  - **Your Decision:** Nice to do - change to medium priority

- [ ] **Page 3 - Unit Numbers Not Retained**
  - **Problem:** "Does this property have unit numbers?" value not retained when navigating back/forth
  - **Impact:** User loses data
  - **Effort:** 1-2 hours
  - **Your Decision:** NICE TO DO, LOW PRIORITY

- [ ] **Why This Property Output Analysis**
  - **What:** Run output through ChatGPT analysis tool (formatting "seems weird")
  - **Impact:** Better formatted output
  - **Effort:** 2-3 hours
  - **Your Decision:** NICE TO DO

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

- [ ] **Fix Proximity & Why This Property Duplicate API Calls**
  - **Problem:** Both fields still loading when user reaches Step 5, causing duplicate API calls
  - **Root Cause:** Early processing starts on Step 3, but Step 5 components don't check if early processing is still "processing" - they only check if data is "ready". If user moves quickly through Step 4, early processing is still running when Step 5 loads, so components trigger their own API calls, resulting in duplicate calls.
  - **Solution:** Components should check `earlyProcessing?.proximity?.status === 'processing'` and wait/poll for completion before triggering fallback API calls. Only trigger new calls if status is 'error' or undefined.
  - **Impact:** Prevents duplicate API calls, reduces API costs, improves performance
  - **Effort:** 2-3 hours
  - **Your Decision:** NICE TO DO

---## 🧪 NEED TO TEST AGAIN

Items that were previously fixed but need re-testing:

- [x] **Module 9 Change - Remove Parent Record** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **What:** Create only child records for multi-lot projects
  - **Impact:** Simplified data structure
  - **Effort:** 4-6 hours (requires testing)
  - **Status:** TO DO - NEED TO TEST
  - **Your Decision:** TO DO

  - [ ] **Fix Project Address Overwriting Property Address**
  - **Problem:** Route 2 Module 22 uses wrong address
  - **Impact:** Property address incorrect for projects
  - **Effort:** 1-2 hours
  - **Your Decision:** TO DO TEST AGAIN
  
  - [ ] **Fix Project Address Overwriting Property Address**
  - **Problem:** Route 2 Module 22 uses wrong address
  - **Impact:** Property address incorrect for projects
  - **Effort:** 1-2 hours
  - **Your Decision:** TO DO TEST AGAIN

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

- [x] **Attachments Note & BA Message** ✅ CLARIFIED
  - **What:** These fields existed on the previous last page before we changed to current last page
  - **Solution:** Replicate "Attachments Additional Dialogue" and "BA Message" fields on Page 10 (Submission)
  - **Note:** Already listed in TO DO section as "Page 10 (Submission) - Add Missing Elements"
  - **Your Decision:** FIXED

---

## 📝 SUMMARY

**Total Items:**
- **URGENT:** 3 items (all TO DO)
- **TO DO:** 13 items
- **Nice to do:** 8 items
- **Test:** 3 items
- **Need to Test Again:** 1 item
- **Fixed:** 24 items (including Incident #1: PDF Not Added to Folder)

---

