# TODO List - Property Review System

**Last Updated:** 2026-01-XX (added code review issues section)  
**Purpose:** Single source of truth for all ongoing tasks and priorities

---

## ✅ COMPLETED

- ✅ Contradictions review complete - all sections documented (see `code/CONTRADICTIONS-FINDINGS.md`)
- ✅ Baseline backup created: `MODULE-3-COMPLETE-FOR-MAKE.js.baseline-v6`
- ✅ Client send tracking requirement documented (see `CLIENT-SEND-TRACKING-REQUIREMENT.md`)
- ✅ Contract Type Field - Created, mapped to GHL, and mapped through Make.com (tested)
- ✅ Body Corp Description field added to email template (2025-01-14)
- ✅ Rental Assessment testing completed - Verified Current Rent/Expiry/Yield for tenanted Established, verified only Appraisal/Appraised Yield for New H&L (2025-01-14)
- ✅ Purchase Price testing completed - Verified New Property (Single Contract) with rebate, Established Property (03_internal_with_comms) with rebate (2025-01-14)
- ✅ Body Corp display verified for SURVEY STRATA and BUILT STRATA title types (2025-01-14)
- ✅ "Message for BA (Optional)" styling updated to match "Pre-Submission Checklist" (2025-01-14)
- ✅ All Email Formatting Contradictions fixed - Purchase Price (1.1-1.6), Property Description (2.1-2.2), Rental Assessment (3.1), Subject Line (4.1), Portal Version (5.1) (2025-01-14)
- ✅ "Other" removed from Cashback/Rebate Type dropdown (2025-01-14)
- ✅ Comparable Sales validation added as mandatory for H&L Single Contract (2025-01-14)
- ✅ Code updates deployed to Vercel (2025-01-14)

---

## 🔄 IN PROGRESS

### Phase 5: New Page Flow (3-Step Implementation) (2026-01-21)
**Status:** 🔄 Ready to Start  
**Priority:** HIGH  
**Details:**
- Phase 5 restructures the final submission flow from 1 combined step into 3 separate steps
- **Step 6:** Washington Brown Calculator (NEW)
- **Step 7:** Cashflow Review & Folder Creation (NEW logic)
- **Step 8:** Pre-Submission Checklist & Final Submission (migrated from old Step 6)
- **Handoff Documents Created:**
  - `PHASE-5-STEP-6-HANDOFF.md` (Chat F)
  - `PHASE-5-STEP-7-HANDOFF.md` (Chat G)
  - `PHASE-5-STEP-8-HANDOFF.md` (Chat H)
  - `PHASE-5-CHAT-ASSIGNMENT.md` (Coordination)
  - `START-PHASE-5-HERE.md` (Quick start guide)
- **Estimated Time:** 6-10 hours total (can be parallelized to 2-3 hours)
- **Next Step:** Open 3 new Cursor chats and assign each step
- **See:** `START-PHASE-5-HERE.md` for instructions

### Proximity Consolidation - Phase 1 (2026-01-XX)
**Status:** ✅ COMPLETE - Integrated in Phase 4A  
**Details:**
- ✅ Consolidated all 9 test endpoints into single `/api/geoapify/proximity` endpoint
- ✅ All results now use Google Maps drive distances (Wednesday 9 AM traffic)
- ✅ Implemented agreed rules for output format, filtering, and category appending
- ✅ Baseline output verified and working
- ✅ **INTEGRATED:** Phase 4A - Proximity Tool Integration (auto-calculation on Step 5)
- **Note:** No fallback logic - if Google Maps API fails, results are skipped (manual process required)

### Property Form Failure Points Discussion (2026-01-XX)
**Status:** Pending Discussion  
**Priority:** High - Before integrating proximity feature  
**Details:**
- Review every section of the property form to identify potential points of failure
- Ensure manual process exists for each automated step
- Document fallback procedures for:
  - Proximity data (Google Maps API failure)
  - Folder creation (Google Drive API failure)
  - Cashflow sheet population (Google Sheets API failure)
  - GHL submission (API failure)
  - Make.com webhooks (webhook failure)
  - Address geocoding (Geoscape API failure)
- Goal: System can still progress even if individual components fail

### Proximity Automation Test Page
**Status:** Syntax error - needs fix  
**Details:**
- Created standalone test page at `/test-proximity`
- JSX compilation error at line 93 preventing page from loading
- Once fixed, will test ChatGPT → Backend API → Form workflow
- See `HANDOVER-2025-01-15-PROXIMITY-AUTOMATION.md` for full details

---

## 🔍 CODE REVIEW ISSUES

**Last Reviewed:** 2026-01-XX  
**File:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`

### Issue #1: Portal Data Extraction Fallback Logic
**Status:** ✅ Working - No change needed  
**Priority:** LOW  
**Details:**
- Multiple fallback paths for Module 6 data extraction
- Checks `.result` first, then flat structure
- Currently working correctly - fallbacks handle all cases
- May be slightly inefficient but functional

### Issue #2: Dual Occupancy "0" Check Inconsistency
**Status:** ⚠️ Minor cleanup opportunity  
**Priority:** LOW  
**Details:**
- Line 606: Checks `bedsSecondaryPortal` directly without excluding "0"
- Line 569: `hasBedsSecondaryPortal` correctly excludes "0"
- Inconsistency: Could display "3 + 0" if `isDualPortal` is true from other flags
- **Note:** Would never have 0 as secondary dwelling in practice, so low impact
- **Fix:** Use `hasBedsSecondaryPortal` instead of `bedsSecondaryPortal` in line 606

### Issue #3: Missing Error Handling for Normal Requests
**Status:** ⚠️ Should be fixed  
**Priority:** MEDIUM  
**Details:**
- Portal requests validate property data exists (lines 1294-1313)
- Normal requests have no validation check
- Risk: Could send empty emails if webhook data is missing
- **Fix:** Add same validation check for normal requests before building email (around line 1600)

### Issue #4: Hardcoded Email Fallback
**Status:** ⚠️ Low priority - unlikely to occur  
**Priority:** LOW  
**Details:**
- Line 2831: `HARDCODED_PACKAGER_EMAIL` used as fallback in multiple places
- Masks configuration issues - should log warning when used
- **Note:** Very unlikely to happen - form submission requires email address, form notes who you are, and email can be edited if wrong address entered
- **Fix:** Add warning logs at each fallback point to track when hardcoded email is used

### Issue #5: Property Type Detection Duplication
**Status:** ⚠️ Intentional duplication - monitor for divergence  
**Priority:** LOW  
**Details:**
- Portal section (lines 579-583) and Normal section (lines 1723-1726) duplicate identical property type detection logic
- **Note:** Duplication is INTENTIONAL - Portal is alternate way to create emails from different entry point, meant to duplicate email structure
- Risk: Logic divergence if one path is updated without updating the other (both must stay in sync)
- **Monitoring approach:** When property type logic changes, ensure both Portal and Normal sections are updated identically
- **Optional future refactor:** Could extract to shared function, but HIGH RISK - requires extensive testing of both paths in isolation

---

## 🔧 FIELD MAPPING FIXES

**Last Reviewed:** 2025-01-14  
**Reference:** `docs/FORM-CHANGES-20250114.md` - Complete field comparison and change log

### Issue #8: `projectBrief` Mapping Fix (Module 22)
**Status:** ⚠️ Needs Fix  
**Priority:** MEDIUM (Projects not needed tonight)  
**Details:**
- Module 22 currently uses `projectOverview` but form has `projectBrief`
- Only needed for projects (Module 22), not single properties (Module 21)
- **Fix Required:** Change `shared_data.propertyDescription?.projectOverview` → `shared_data.propertyDescription?.projectBrief` in `ROUTE-2-MODULE-22-COMPLETE-CODE.js` (Line 149)
- **Action:** Review `docs/FORM-CHANGES-20250114.md` for complete details and all field mapping issues

---

## 📋 PENDING (Priority Order)

### 1. Fix Test Page Syntax Error (IMMEDIATE)
**Priority:** HIGH - BLOCKING  
**Status:** Needs Fix  
**Details:**
- JSX compilation error at line 93 in `form-app/src/app/test-proximity/page.tsx`
- Prevents proximity automation testing
- See `HANDOVER-2025-01-15-PROXIMITY-AUTOMATION.md` for details

### 2. Test Email Formatting
**Priority:** HIGH  
**Status:** In Progress  
**Details:**
- Test all property types and scenarios
- Verify all contradictions are fixed
- Test both main version and Portal version
- ✅ Body Corp Description - Added and tested
- ✅ Rental Assessment - Verified Established tenanted and New H&L scenarios
- ✅ Purchase Price - Verified rebate scenarios for New and Established
- ✅ Body Corp - Verified SURVEY STRATA and BUILT STRATA title types

### 3. Project Email Formatting
**Priority:** HIGH  
**Status:** Planning  
**Details:**
- Define visual format for project emails (how multiple lots are displayed)
- Create formatting rules for lot sections
- Update `code/MODULE-3-COMPLETE-FOR-MAKE.js` with project formatting logic
- Test with multi-lot projects
- See `MASTER-PLAN-2025-01-15.md` for full requirements

### 4. Form Edit Access
**Priority:** HIGH  
**Status:** Not Started  
**Details:**
- Set up form to edit existing records (not just create new)
- Add URL parameter to open form in edit mode (e.g., `?edit=true&recordId=...`)
- Fetch existing property data from GHL and pre-populate form
- Update submission logic to update GHL record (not create new)
- See `MASTER-PLAN-2025-01-15.md` for full requirements

### 5. Email Button Options
**Priority:** MEDIUM  
**Status:** Not Started  
**Details:**
- Add "Edit Property" button to email templates
- Button opens form in edit mode with pre-filled data
- Ensure option is available in email buttons (packager and BA emails)
- See `MASTER-PLAN-2025-01-15.md` for full requirements

### 6. New Deal Sheet
**Priority:** MEDIUM  
**Status:** Not Started  
**Details:**
- Create new Deal Sheet to view all properties
- Display properties from GHL Custom Object
- Add filtering, sorting, and search functionality
- Decide on implementation: Google Sheets, Custom App, or Portal Enhancement
- See `MASTER-PLAN-2025-01-15.md` for full requirements

### 7. Deal Sheet → Client Selection
**Priority:** MEDIUM  
**Status:** Not Started  
**Details:**
- Create functionality to select property from Deal Sheet and send to clients
- Replicate current portal functionality for client selection
- Add "Send to Clients" button to Deal Sheet
- Open portal (or modal) with property pre-selected
- See `MASTER-PLAN-2025-01-15.md` for full requirements

### 8. Send Tracking & Logging
**Priority:** MEDIUM  
**Status:** Planning  
**Details:**
- Create log to track who and when sent what properties to which clients
- Track: BA name/email, timestamp, property, client IDs/emails, message type, source
- Decide on storage location (GHL field, separate object, or Google Sheet)
- Create log viewing interface with filtering
- See `CLIENT-SEND-TRACKING-REQUIREMENT.md` and `MASTER-PLAN-2025-01-15.md`

### 9. Portal Client Status Display
**Priority:** MEDIUM  
**Status:** Not Started  
**Details:**
- Identify in portal if a client has already been sent a property
- Show "Sent" badge/indicator with date and BA name
- Auto-disable checkbox for clients already sent
- Implement re-send confirmation dialog
- See `CLIENT-SEND-TRACKING-REQUIREMENT.md` and `MASTER-PLAN-2025-01-15.md`

### 10. Review Mobile Responsive Email Template Issue
**Priority:** MEDIUM  
**Status:** Ready for review  
**Details:**
- See `C:\Users\User\.cursor\JT FOLDER\20250114\EMAIL-MOBILE-RESPONSIVE-ISSUE.txt`
- Bullet points overlap with sidebar on mobile portrait mode
- Review proposed CSS solutions (responsive container + increased bullet margin)
- Test and implement before production deployment

### 11. Fix Market Performance Check Buttons Functionality
**Priority:** HIGH  
**Status:** Needs Fix  
**Details:**
- Market performance check buttons functionality has been disturbed
- Buttons affected: "Check data", "Data is fine, progress to step 5", "Need to update data"
- File: `form-app/src/components/steps/Step3MarketPerformance.tsx`
- Test all check button workflows to ensure they work correctly
- **Note:** This caused issues during a show and tell presentation

### 12. Separate Market Performance Field Functionality
**Priority:** HIGH  
**Status:** Needs Refactoring  
**Details:**
- Functionality of fields on Market Performance page should be separated in code
- Currently, changing one field can impact other fields unintentionally
- This caused one field's functionality to be accidentally turned off during a change
- File: `form-app/src/components/steps/Step3MarketPerformance.tsx`
- **Action Required:**
  - Refactor code to isolate functionality for each field/button
  - Ensure SPI form fields, REI form fields, check buttons, and save functionality are independent
  - Add clear separation between:
    - "Check data" button logic
    - "Data is fine, progress to step 5" button logic
    - "Need to update data" button logic
    - SPI form field handlers
    - REI form field handlers
    - Save button handler
  - Test each component independently to ensure changes to one don't affect others
- **Note:** This caused embarrassment during a show and tell when a field stopped working unexpectedly

---

## 🔄 PROXIMITY CONSOLIDATION - AGREED RULES (2026-01-XX)

### Output Format
- Single combined list, sorted by distance (closest first)
- No section headings
- No starting address at top
- Format: `Distance (time), Name [Category if missing]`
- Example: `169 m (1 min), Lewisham Train Station`

### Category Name Appending Rules
- **Append category name ONLY if missing** (e.g., "Train Station", "Kindergarten", "Childcare")
- Only append if confident it's that category (trust Geoapify data)
- If name doesn't contain category word → append it
- Example: "15 Smith Street" → "15 Smith Street Kindergarten"
- Example: "Trinity Grammar School Infants" → stays as is (already has "School")

### AIRPORTS & CAPITAL CITIES (Same Logic)
- **Tier 3 closest** → show Tier 3 + Tier 1
- **Tier 2 closest** → show Tier 2 + Tier 1  
- **Tier 1 closest** → show Tier 1 + closest from Tier 2 & 3
- Use Google Maps Distance Matrix API (Wednesday 9 AM departure time)

### TRAIN STATIONS
- Use only `public_transport.train` category (exclude `railway.train` fallback)
- Include Tram stations (max 10km) using `public_transport.tram` category
- Filter single-word names like "Koala" (likely infrastructure, not stations)
- Exclude railway societies/clubs/modellers (e.g., "Sunshine Railway Modellers Society")
- Must contain "station", "stop", or "interchange" to be valid
- Append "Train Station" only if name doesn't contain "station" or "train"

### KINDERGARTEN & CHILDCARE
- Combine into one category (show 3-4 total combined)
- Append category name only if missing

### SUPERMARKETS
- Always show closest (even if not Woolworths/Coles/IGA/Aldi)
- Plus all 4 chains (Woolworths, Coles, IGA, Aldi)
- Append "Supermarket" suffix if missing (e.g., "Woolworths" → "Woolworths Supermarket")

### HOSPITALS
- Prioritize Emergency Department hospitals when possible

### Implementation Notes
- Phase 1: Basic consolidation with strict filtering ✅ COMPLETE
- Phase 2: Add web search verification if Phase 1 results problematic
- Don't spend too long if not working - can review separate searches
- Background processing: Runs on page 5-6, so can process in background

### Baseline Established (2026-01-XX)
**Status:** ✅ Working baseline established  
**Test Addresses Verified:**
- `4 osborne circuit marrochydore` ✅
- `15 barker street Lewisham NSW` ✅
- `5 acacia street point vernon QLD` ✅
- `19 Holcomb St Elizabeth East SA` ✅

**Current Implementation:**
- ✅ Train stations: Filtered to exclude societies/clubs/modellers (e.g., "Sunshine Railway Modellers Society")
- ✅ Supermarkets: Append "Supermarket" suffix if missing (e.g., "Woolworths" → "Woolworths Supermarket")
- ✅ Airports & Cities: Use Google Maps Distance Matrix API (drive distances with Wednesday 9 AM traffic)
- ✅ **ALL Geoapify results: Now use Google Maps Distance Matrix API** (drive distances with Wednesday 9 AM traffic) - ✅ COMPLETE

**Note:** All proximity results (including Geoapify categories) now use Google Maps drive distances. See `docs/PROXIMITY-CONSOLIDATED-HANDOVER.md` for complete documentation.

---

## 📚 REFERENCE DOCUMENTS

- **Master Plan (2025-01-15):** `MASTER-PLAN-2025-01-15.md` - Comprehensive plan for major system enhancements
- **Handover (2025-01-15):** `HANDOVER-2025-01-15-PROXIMITY-AUTOMATION.md` - Proximity automation, email template status, portal formatting
- **Field Comparison & Changes (2025-01-14):** `docs/FORM-CHANGES-20250114.md` - Field mapping analysis and form change requirements
- **Field Comparison Matrix (2025-01-14):** `docs/FIELD-COMPARISON-MATRIX-20250114.md` - Complete form vs GHL vs Make.com comparison
- **Contradictions:** `code/CONTRADICTIONS-FINDINGS.md`
- **Client Tracking:** `CLIENT-SEND-TRACKING-REQUIREMENT.md`
- **Git Workflow & Backup Safety:** `GIT-WORKFLOW-AND-BACKUP-SAFETY.md`
- **Field Descriptions:** `C:\Users\User\.cursor\JT FOLDER\FIELD-DESCRIPTIONS-AND-NOTES.csv`
- **Visual Examples:** `C:\Users\User\.cursor\JT FOLDER\EMAIL-VISUAL-EXAMPLES-V6 JT-CORRECTED.txt`

---

## 📝 NOTES

- All code changes should be tested before deployment to Vercel
- Portal version must have identical logic to main version
- Form validation fixes should be done before email formatting fixes

---
