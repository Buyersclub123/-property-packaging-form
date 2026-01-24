# Priority Checklist - What to Work On Next

**Instructions:** Mark each item with your decision:
- ✅ = Yes, do this
- ❌ = No, skip this
- ❓ = Maybe, discuss further

---

## 🔥 P1 (HIGH PRIORITY)

### Issues from Show & Tell (Jan 23, 2026)

- [ ] **Page 5 (Market Performance) - Make Fields Read-Only**
  - **Problem:** Users can edit fields without clicking "Needs updating", then can't save
  - **Solution:** Make all value fields read-only by default (especially if populated), only editable when "Needs updating" clicked
  - **Impact:** Prevents user confusion and data loss
  - **Effort:** 2-3 hours
  - **Your Decision:** ____

- [ ] **Page 6 (Proximity & Content) - Checkbox Not Retained**
  - **Problem:** Review checkbox doesn't retain when navigating back/forth
  - **Solution:** Add carriage return instead of just space to ensure validation never fails
  - **Impact:** Users can skip content review
  - **Effort:** 1 hour
  - **Your Decision:** LEts do this page now____

- [ ] **Page 7 (Insurance) - Value Display Bug**
  - **Problem:** Insurance value shows "$5" instead of "$5,192" on Page 9 (field type issue)
  - **Solution:** Fix field type, remove decimal places (only show round figures)
  - **Impact:** Incorrect values displayed in cashflow
  - **Effort:** 2-3 hours
  - **Your Decision:** ____

- [ ] **Page 3 - Unit Numbers Not Retained**
  - **Problem:** "Does this property have unit numbers?" value not retained when navigating back/forth
  - **Impact:** User loses data
  - **Effort:** 1-2 hours
  - **Your Decision:** ____

- [ ] **Hotspotting Report - Valid Period Extraction**
  - **Problem:** If can't obtain Valid Period, system puts "could not obtain" in sheet
  - **Solution:** Show friendly message with entry field for user to paste from front page
  - **Impact:** Better UX, complete data
  - **Effort:** 2-3 hours
  - **Your Decision:**LEts do this page now

- [ ] **Hotspotting Report - File Naming**
  - **Problem:** Files named with suburb prefix (e.g., "Point Vernon Fraser Coast")
  - **Solution:** Remove suburb prefix, only use report name (e.g., "Fraser Coast")
  - **Impact:** Cleaner file naming
  - **Effort:** 1 hour
  - **Your Decision:** LEts do this page now

- [ ] **Investment Highlights - Missing 7 Edit Fields**
  - **Problem:** 7 individual section edit fields not showing
  - **Impact:** Can't edit individual sections
  - **Effort:** 3-4 hours
  - **Your Decision:** LEts do this page now - I understand the confusion with this now_

- [ ] **Investment Highlights - "Regional" in Heading**
  - **Problem:** Shows "Fraser Coast Regional" - where did "Regional" come from?
  - **Action:** Check extraction logic
  - **Impact:** Incorrect heading
  - **Effort:** 1-2 hours
  - **Your Decision:** LEts do this page now

- [ ] **Make.com - Investment Highlights Newline Escaping**
  - **Problem:** Form sends `\\n` (escaped newlines) to GHL, Make.com receives `\\\\n` (double-escaped), email formatting breaks
  - **Root Cause:** `JSON.stringify()` in form API escapes newlines, Make.com's `normaliseNewlines()` function doesn't handle double-escaped newlines correctly
  - **Solution:** Update `normaliseNewlines()` in `MODULE-3-COMPLETE-FOR-MAKE.js` to replace `\\\\n` BEFORE `\\n` (order matters)
  - **Impact:** Email formatting for Investment Highlights section is broken
  - **Effort:** 30 minutes (simple regex order fix)
  - **Your Decision:** ____

- [ ] **Make.com - "Why This Property" Formatting**
  - **Problem:** "Why This Property" section may have same newline escaping issue as Investment Highlights
  - **Solution:** Same fix as Investment Highlights - update `normaliseNewlines()` in `MODULE-3-COMPLETE-FOR-MAKE.js`
  - **Impact:** Email formatting consistency
  - **Effort:** Included in Investment Highlights fix (same function)
  - **Your Decision:** ____

- [ ] **Duplicate Folder Names**
  - **Problem:** Need to prevent duplicate folder names (suggests re-packaging same property)
  - **Solution:** Add validation/process for handling duplicates
  - **Impact:** Prevents confusion and errors
  - **Effort:** 2-3 hours
  - **Your Decision:** ____

---

### URGENT - Must Complete Tomorrow (Friday)

- [ ] **Form Edit Access** ⚠️ DEADLINE: FRIDAY
  - **What:** Edit existing records (not just create new)
  - **Impact:** Can update properties after creation
  - **Effort:** 8-12 hours
  - **Priority:** REALLY IMPORTANT TO BE DONE
  - **Your Decision:** ✅ DO TOMORROW (FRI)

- [ ] **Email Button Options** ⚠️ DEADLINE: FRIDAY
  - **What:** "Edit Property" button in emails
  - **Impact:** Easy access to edit from email
  - **Effort:** 2-3 hours
  - **Priority:** REALLY IMPORTANT TO BE DONE
  - **Your Decision:** ✅ DO TOMORROW (FRI)

- [ ] **Project Email Formatting** ⚠️ DEADLINE: END OF FRIDAY
  - **What:** Define visual format for multi-lot project emails
  - **Impact:** Better project presentation
  - **Effort:** 4-6 hours
  - **Priority:** NEED TO DO END OF TOMORROW
  - **Your Decision:** ✅ DO TOMORROW (FRI)

---

### Issues from Recent Work (Last 2-3 Days)

- [x] **Fix Step 5 field clearing issue** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **Problem:** Investment Highlights & Why This Property clear when Proximity loads
  - **Impact:** User has to go back/forward to see their data
  - **Effort:** 1-2 hours
  - **Status:** Fixed, add to test checklist

- [ ] **Add Hotspotting PDF to property folder**
  - **Problem:** PDF link/shortcut not added when folder created
  - **Impact:** Users have to manually add PDF
  - **Effort:** 2-3 hours
  - **Your Decision:** LEts do this page now_

- [ ] **Fix Unit Number Bug (Page 2)**
  - **Problem:** hasUnitNumbers doesn't persist when navigating back to Page 2
  - **Impact:** User loses unit number selection state
  - **Effort:** 1-2 hours
  - **Action:** Update Step1DecisionTree.tsx (or Step 2 equivalent) to initialize state from useFormStore
  - **Your Decision:** ____

- [ ] **Investment Highlights enhanced workflow**
  - **What:** Searchable dropdown, date validation, drag & drop, auto-suburb mapping
  - **Impact:** Major UX improvement, reduces manual work
  - **Effort:** 6-8 hours (detailed plan exists)
  - **Your Decision:** ____

---

### Issues from Existing TODO Lists

- [ ] **Fix Market Performance Check Buttons**
  - **Problem:** "Check data", "Data is fine", "Need to update" buttons not working
  - **Impact:** Broke during show & tell, embarrassing
  - **Effort:** 2-3 hours
  - **Note:** This is from TODO-LIST.md (#11)
  - **Your Decision:** I believe this is fixed, make sure its on a trgeted  test list, I did just test it and it was fine but it could be sequence related issue. SPECIFICALLY test when there not data alreadt, I have tested onlty recenetly with available data 

- [ ] **Separate Market Performance Field Functionality**
  - **Problem:** Fields affect each other, changes break things
  - **Impact:** Prevents future breakage
  - **Effort:** 3-4 hours (refactoring)
  - **Note:** This is from TODO-LIST.md (#12)
  - **Your Decision:** You can review code to ensure this is the case, I wanted each page section or field in the caase of Proxmity/ Market performance, investment highlights to be independent so if we make changes in the future we dont impact other things ____

- [ ] **Fix Cashflow Spreadsheet Dropdown Calc**
  - **Problem:** Drawdown sheet not fully working working
  - **Impact:** Can't select/calculate cashflow properly
  - **Effort:** 1-2 hours
  - **Note:** Reported Jan 22, 2026
  - **Your Decision:** ____

---

## 🔧 P2 (MEDIUM PRIORITY)

### UI Improvements (Show & Tell)

- [ ] **Page 9 - Remove "Create Another Folder" Button**
  - **Problem:** Button no longer needed
  - **Impact:** Cleaner UI
  - **Effort:** 15 minutes
  - **Your Decision:** ____

- [ ] **Page 10 (Submission) - Update Checklist**
  - **Remove:** "Investment Highlights reviewed" checkbox
  - **Add:** "CMA reports and Hotspotting report added to the folder" with link to folder
  - **Impact:** More accurate checklist
  - **Effort:** 1-2 hours
  - **Your Decision:** ____

- [ ] **Page 10 (Submission) - Add Missing Elements**
  - **Add:** Attachments notes field
  - **Add:** BA Message field
  - **Note:** These existed on previous last page, just need to replicate
  - **Impact:** Complete submission page
  - **Effort:** 2-3 hours
  - **Your Decision:** ____

### Quick Fixes

- [ ] **Hide Proximity error if pre-fetched data exists**
  - **Problem:** Error shows but field works (confusing)
  - **Impact:** Better UX, less user confusion
  - **Effort:** 30 minutes
  - **Your Decision:** LEts do this page now

- [ ] **Attachments Additional Dialogue field**
  - **Problem:** Field missing from Step 9 (Submission)
  - **Impact:** Can't add notes about attachments
  - **Effort:** 1 hour
  - **Note:** This is from FORM-CHANGES-TODO.md (#1)
  - **Your Decision:** _THIS IS MENTIONED FURTHER DOWN ALONOG WITH THE BA MESSAGE<> THESE FIELDS EXISTED AND WORKED WITH THE EMAIL INTEGRATION AND WERE ON THE PREVIOUS LAST PAGE SO JUST NEED TO REPLLICATE THEM ON OUR BACK PAGE 

- [ ] **Fix Test Page Syntax Error**
  - **Problem:** `/test-proximity` page has JSX error
  - **Impact:** Can't test proximity automation
  - **Effort:** 30 minutes
  - **Note:** This is from TODO-LIST.md (#1)
  - **Your Decision:** I THINK THIS IS CLOSED, THE P1 ISSUE FOR KNOKCING THE DATA OUT OF INVESTMENT HIGGHLIGTS IS IN PLAY NOW> OR IS THIS THE TIMINIG ISSUE WHEN YOU ENTER THST PAGE?LEts do this page now_

---

### Multi-Lot Project Improvements

- [ ] **Save totalPrice to Lot Data**
  - **Problem:** Calculated totalPrice not saved for lots
  - **Impact:** Multi-lot projects missing total price
  - **Effort:** 1-2 hours
  - **Note:** This is from FORM-CHANGES-TODO.md (#3)
  - **Your Decision:** Need to test again_

- [x] **Price Group Calculation** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **Problem:** price_group field not auto-generated
  - **Impact:** Manual entry required
  - **Effort:** 2 hours (need to define logic)
  - **Status:** Believed fixed, add to test checklist (pages 5-9)

- [ ] **Fix Project Address Overwriting Property Address**
  - **Problem:** Route 2 Module 22 uses wrong address
  - **Impact:** Property address incorrect for projects
  - **Effort:** 1-2 hours
  - **Note:** This is from FORM-CHANGES-TODO.md (#6)
  - **Your Decision:** _Need to test around this___

---

### Testing & Bug Fixes

- [ ] **Test body_corp fields**
  - **Problem:** Not tested yet
  - **Impact:** May not work correctly
  - **Effort:** 1 hour
  - **Note:** This is from ROUTE-2-MODULE-22-MISSING-FIELDS-TODO.md
  - **Your Decision:** Add to test list for when getting to pages 6-9____

- [x] **Fix "Owner Corp (community)" dropdown bug** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **Problem:** Body Corp fields don't show when selected
  - **Impact:** Can't enter body corp data
  - **Effort:** 1-2 hours
  - **Status:** Believed resolved, add to test checklist (pages 6-9)

---

### Cleanup

- [x] **Remove CMI Reports Notice from Page 1** ✅ COMPLETE
  - **Problem:** Notice no longer needed
  - **Impact:** Cleaner UI
  - **Effort:** 15 minutes
  - **Status:** CLOSED

---

## 📦 P3 (LOW PRIORITY - Future Enhancements)

### Research & Analysis Tasks

- [ ] **Investment Highlights Output Analysis**
  - **What:** Run output through ChatGPT analysis tool to dial in format
  - **Impact:** Better formatted output
  - **Effort:** 2-3 hours
  - **Your Decision:** LEts do this page now

- [ ] **Why This Property Output Analysis**
  - **What:** Run output through ChatGPT analysis tool (formatting "seems weird")
  - **Impact:** Better formatted output
  - **Effort:** 2-3 hours
  - **Your Decision:** LEts do this page now

### New Feature Research

- [ ] **Photo Document Generator**
  - **What:** Drag photos into box (like hotspotting report upload), auto-generate photo document
  - **Impact:** Automated photo document creation
  - **Effort:** 12-16 hours (research + implementation)
  - **Your Decision:**LEts do this page now

- [ ] **CMA Reports Upload**
  - **What:** Same drag/drop box style as Hotspotting
  - **Impact:** Easier CMA report management
  - **Effort:** 6-8 hours
  - **Your Decision:** ____

- [ ] **Other Documents Upload**
  - **What:** Drag/drop capability for any documents
  - **Impact:** Flexible document management
  - **Effort:** 4-6 hours
  - **Your Decision:** ____

- [ ] **Independent Data Entry Interface**
  - **What:** For LGA Hotspotting reports and Market Performance data (team can enter when not busy)
  - **Impact:** Better data management workflow
  - **Effort:** 16-20 hours
  - **Your Decision:** ____

- [ ] **Video Format Requirements**
  - **Question:** What formats are OK for folder sharing?
  - **Action:** Research video format compatibility
  - **Effort:** 1-2 hours research
  - **Your Decision:** ____

### Major Features (High Effort)

- [ ] **QA Step for Email Workflow**
  - **What:** Add QA approval step in email workflow
  - **Current Flow:** Submitted → Packager Approve → BA Email → Client Email
  - **New Flow:** Submitted → Packager Approve → **QA STEP APPROVAL** → BA Email → Client Email
  - **Impact:** Quality control before client-facing emails
  - **Effort:** 8-12 hours
  - **Your Decision:** ____

- [ ] **New Field in Opportunities - BA Assignment**
  - **What:** Add field for BA looking after the client
  - **Impact:** Better client management tracking
  - **Effort:** 2-3 hours
  - **Your Decision:** ____

- [ ] **Smart Property Linking**
  - **What:** If property passes pipeline value stage, force record to be linked to a property
  - **Impact:** Better data integrity, prevents orphaned records
  - **Effort:** 4-6 hours
  - **Your Decision:** ____

- [ ] **New Deal Sheet**
  - **What:** View all properties with filtering/sorting
  - **Impact:** Better property management
  - **Effort:** 12-16 hours
  - **Note:** This is from TODO-LIST.md (#6)
  - **Your Decision:** ____

- [ ] **Deal Sheet → Client Selection**
  - **What:** Send properties to clients from Deal Sheet
  - **Impact:** Streamlined workflow
  - **Effort:** 6-8 hours
  - **Note:** This is from TODO-LIST.md (#7)
  - **Your Decision:** ____

- [ ] **Send Tracking & Logging**
  - **What:** Track who sent what to which clients
  - **Impact:** Better visibility and accountability
  - **Effort:** 6-8 hours
  - **Note:** This is from TODO-LIST.md (#8)
  - **Your Decision:** ____

- [ ] **Portal Client Status Display**
  - **What:** Show "Sent" badge for already-sent properties
  - **Impact:** Prevent duplicate sends
  - **Effort:** 3-4 hours
  - **Note:** This is from TODO-LIST.md (#9)
  - **Your Decision:** ____

To add: NEW FIELD IN THE OPORTUNITES FOR BA LOOKING AFTER THE CLIENT TO BE ADDED
SMARTS SO IF A PROPERTY IS TAKEN PASSEDF A PIPELINE VALUE STAGE< IT FORCES THE RECORD TO BE LINKED TO A PROEPTY>

---

## 📸 FUTURE - AFTER BACKLOG CLEARED

- [ ] **Create System Baseline Snapshot**
  - **What:** Holistic system snapshot of requirements and current state
  - **When:** After today's 4 items are complete and deployed to production
  - **Approach:** Git tag + clean docs (Option 3)
    - Tag current state as "v1.0-production-baseline"
    - Archive old docs to `_archive/` folder
    - Create ONE comprehensive doc: `SYSTEM-BASELINE.md`
  - **Goal:** Clean baseline with no noise, fresh start for maintenance
  - **Consider:** Possibly create new project since it's in production
  - **Your Decision:** ____

---

### UI/UX Improvements

- [ ] **Mobile Responsive Email Template**
  - **Problem:** Bullet points overlap on mobile
  - **Impact:** Better mobile experience
  - **Effort:** 2-3 hours
  - **Note:** This is from TODO-LIST.md (#10)
  - **Your Decision:** ____

- [ ] **Address Validation with Suggestions**
  - **What:** Spelling correction, address suggestions
  - **Impact:** Fewer address errors
  - **Effort:** 6-8 hours
  - **Note:** This is from TODO-ADDRESS-VALIDATION.md (Deferred)
  - **Your Decision:** ____

---

### Architecture Changes

- [x] **Module 9 Change - Remove Parent Record** ✅ TENTATIVELY FIXED - NEEDS TESTING
  - **What:** Create only child records for multi-lot projects
  - **Impact:** Simplified data structure
  - **Effort:** 4-6 hours (requires testing)
  - **Status:** Believed to work now, add to test checklist

---

## ❓ NEEDS CLARIFICATION - RESOLVED

- [x] **Attachments Note & BA Message** ✅ CLARIFIED
  - **What:** These fields existed on the previous last page before we changed to current last page
  - **Solution:** Replicate "Attachments Additional Dialogue" and "BA Message" fields on Page 10 (Submission)
  - **Status:** Already listed in P2 "Page 10 (Submission) - Add Missing Elements"
  - **Note:** Should be easy to resolve - just replicate existing functionality

---

## 🚀 ALREADY COMPLETE (Possibly Resolves Some TODOs)

These were completed in the last 2-3 days. Review if any existing TODOs are now resolved:

- ✅ **Phase 5: 3-Step Flow** → Now 4 steps with Insurance Calculator ✅ COMPLETE
  - **Was:** Step 6 (Washington Brown), Step 7 (Cashflow), Step 8 (Submission)
  - **Now:** Step 6 (Insurance), Step 7 (Washington Brown), Step 8 (Cashflow), Step 9 (Submission)
  - **Status:** CLOSED

- ✅ **API Protection System** (Rate limiting, logging, email alerts)
  - **Question:** Any related TODOs now resolved?
  - **Your Decision:** NEED TO DEPLPOY TO PROD FIRST

- ✅ **Form Validation Fix** (Step 5 fields)
  - **Question:** Any related TODOs now resolved?
  - **Your Decision:** NOT SURE WHAT THIS MEANS

---

## 📝 SUMMARY

**Total Items to Review:** 57
- **P1 (High):** 18 items
  - 3 URGENT (must complete Friday)
  - 10 from show & tell
  - 5 from recent work
- **P2 (Medium):** 12 items (3 UI improvements + 9 quick fixes/improvements)
- **P3 (Low):** 20 items (7 analysis + 13 major features/research)
- **Needs Testing:** 5 items (tentatively fixed)
- **Complete:** 3 items (closed)

---

---

## 🧪 TESTING CHECKLIST

Items marked as "tentatively fixed" that need testing:

- [ ] **Step 5 field clearing issue** - Test Investment Highlights & Why This Property don't clear when navigating
- [ ] **Market Performance check buttons** - SPECIFICALLY test when there's NO data already (sequence-related issue possible)
- [ ] **Price group calculation** - Test during e2e tests or when progressing through steps 5-9
- [ ] **Body corp fields** - Test on pages 6-9
- [ ] **Owner Corp dropdown** - Test that fields show when selected (pages 6-9)
- [ ] **Module 9 parent record** - Test multi-lot project record creation
- [ ] **Project address vs property address** - Test Route 2 Module 22

---

## 🎯 NEXT STEPS

1. **URGENT:** Review 3 Friday deadline items (Form Edit Access, Email Button, Project Email Formatting)
2. **Review immediate fixes** - See `IMMEDIATE-FIXES-REQUIREMENTS.md` for detailed requirements
3. **Prioritize** - Decide which items to tackle first
4. **Create action plan** - Break down selected items into implementation tasks

---

**Ready when you are!** Take your time reviewing. ☕
