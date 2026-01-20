# Master Plan - Property Review System Enhancements

**Date:** 2025-01-15  
**Status:** Planning Phase  
**Purpose:** Comprehensive plan for major system enhancements beyond immediate fixes

---

## 📋 Table of Contents

1. [Immediate Priority](#immediate-priority)
2. [Project Email Formatting](#project-email-formatting)
3. [Form Edit Access](#form-edit-access)
4. [Email Button Options](#email-button-options)
5. [New Deal Sheet](#new-deal-sheet)
6. [Deal Sheet → Client Selection](#deal-sheet--client-selection)
7. [Send Tracking & Logging](#send-tracking--logging)
8. [Portal Client Status Display](#portal-client-status-display)
9. [Future Items (To Be Added)](#future-items-to-be-added)

---

## Immediate Priority

### Fix Test Page Syntax Error
**Status:** 🔴 BLOCKING  
**File:** `form-app/src/app/test-proximity/page.tsx`  
**Issue:** JSX compilation error at line 93  
**Action:** Fix syntax error to unblock proximity automation testing

---

## Project Email Formatting

### Current Status
- ✅ Email template logic complete for standard properties
- ✅ Data mapping for projects exists
- ❌ **Visual formatting for project emails NOT implemented**

### Requirements
**What Needs to Be Defined:**
1. **Visual Format for Multiple Lots:**
   - How to display multiple lots in a single email
   - Formatting for individual lot details within project email
   - Distinction between shared project data vs. lot-specific data

2. **Project-Specific Sections:**
   - Project Brief (shared across all lots)
   - Sales Assessment (shared across all lots)
   - Individual lot sections (lot-specific data)

3. **Email Structure:**
   - Header with project name and estate address
   - Shared project information section
   - Individual lot sections (how many lots to show, pagination?)
   - Footer/CTA

### Implementation Tasks
- [ ] Define visual format for project emails
- [ ] Create formatting rules for lot sections
- [ ] Update `code/MODULE-3-COMPLETE-FOR-MAKE.js` with project formatting logic
- [ ] Test with multi-lot projects
- [ ] Verify Portal version matches main version

### Reference Documents
- `PROJECT-LOTS-ARCHITECTURE.md` - Architecture for project data storage
- `MAKE-COM-IMPLEMENTATION-GUIDE.md` - Implementation guide for projects
- `HANDOVER-2025-01-SESSION-REVIEW.md` - Project email structure requirements

---

## Form Edit Access

### Current State
- ✅ Form creates new property records
- ❌ **No functionality to edit existing records**

### Requirements
**What Needs to Be Built:**
1. **Access Method:**
   - URL parameter to open form in "edit mode" (e.g., `?edit=true&recordId=...`)
   - Or dedicated edit route (e.g., `/edit-property/:recordId`)

2. **Data Loading:**
   - Fetch existing property data from GHL
   - Populate all form fields with existing values
   - Handle missing/optional fields gracefully

3. **Form Behavior:**
   - Pre-fill all steps with existing data
   - Allow user to modify any field
   - Save changes back to GHL (update record, not create new)

4. **Validation:**
   - Same validation rules as new property form
   - Ensure required fields are still mandatory

### Implementation Tasks
- [ ] Create edit mode detection in form
- [ ] Add API endpoint to fetch property data by recordId
- [ ] Update form store to handle pre-populated data
- [ ] Update submission logic to update GHL record (not create new)
- [ ] Add edit mode indicator in UI
- [ ] Test edit workflow end-to-end

### Technical Considerations
- **GHL API:** Use `PUT` or `PATCH` to update existing record
- **Form State:** Ensure Zustand store handles edit mode correctly
- **Navigation:** Allow user to navigate between steps in edit mode
- **Confirmation:** Show confirmation before saving changes

---

## Email Button Options

### Current State
- ✅ Email buttons exist in packager/BA approval emails
- ✅ "Review Suitable Clients" button opens portal
- ✅ "Needs Editing & Resubmitting" button sends back to packager
- ❌ **No "Edit Property" button option**

### Requirements
**What Needs to Be Added:**
1. **New Button: "Edit Property"**
   - Appears in approval emails (packager and BA emails)
   - Opens form in edit mode with pre-filled data
   - URL format: `https://form-url.com/?edit=true&recordId={recordId}`

2. **Button Placement:**
   - Add alongside existing "Review Suitable Clients" and "Needs Editing" buttons
   - Or replace "Needs Editing" with "Edit Property" (clarify with user)

3. **Access Control:**
   - Who can edit? (Packager only? BA? Both?)
   - Should edits require re-approval?

### Implementation Tasks
- [ ] Add "Edit Property" button to email template
- [ ] Generate edit URL with recordId parameter
- [ ] Update email template code (`MODULE-3-COMPLETE-FOR-MAKE.js`)
- [ ] Test button opens form in edit mode
- [ ] Verify edit functionality works from email link

### Reference
- **Email Template:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`
- **Form Route:** `form-app/src/app/page.tsx` (or create dedicated edit route)

---

## New Deal Sheet

### Current State
- ✅ Google Sheets Deal Sheet exists (used for opportunities tracking)
- ❌ **No dedicated Deal Sheet view for viewing all properties**

### Requirements
**What Needs to Be Created:**
1. **New Deal Sheet View:**
   - Display all properties (from GHL Custom Object)
   - Columns: Property Address, Property Type, Status, Date Created, BA, etc.
   - Filtering and sorting capabilities
   - Search functionality

2. **Data Source:**
   - Pull from GHL Custom Object (`property_reviews`)
   - Or sync to Google Sheets for easier viewing
   - Real-time or periodic sync?

3. **View Options:**
   - Table view (spreadsheet-like)
   - Card view (visual property cards)
   - Or both (toggle between views)

4. **Actions Available:**
   - View property details
   - Edit property (opens form in edit mode)
   - Send to clients (see next section)
   - Filter by status, BA, property type, etc.

### Implementation Options

**Option A: Google Sheets Deal Sheet**
- Create new Google Sheet tab
- Use Make.com to sync GHL data to Sheet
- Use Google Apps Script for actions (buttons)
- **Pros:** Familiar interface, easy filtering/sorting
- **Cons:** Not real-time, requires sync automation

**Option B: Custom Portal/Web App**
- Build dedicated Deal Sheet view in portal or new app
- Direct API connection to GHL
- Real-time data
- **Pros:** Real-time, more flexible
- **Cons:** Requires development, separate app to maintain

**Option C: Enhance Existing Portal**
- Add "Deal Sheet" view to existing portal
- List all properties with actions
- **Pros:** Single app, consistent UI
- **Cons:** Portal may become cluttered

### Implementation Tasks
- [ ] Decide on implementation approach (A, B, or C)
- [ ] Design Deal Sheet layout and columns
- [ ] Implement data fetching (GHL API or Sheet sync)
- [ ] Add filtering and sorting
- [ ] Add search functionality
- [ ] Add action buttons (View, Edit, Send to Clients)
- [ ] Test with real property data

### Reference Documents
- `PROJECT-COMPLETION-CHECKLIST.md` - Mentions Deal Sheet integration
- `docs/workflow.md` - Current workflow documentation

---

## Deal Sheet → Client Selection

### Current State
- ✅ Portal exists for client selection (accessed from email link)
- ❌ **No way to select property from Deal Sheet and send to clients**

### Requirements
**What Needs to Be Built:**
1. **Selection from Deal Sheet:**
   - User clicks "Send to Clients" button on property in Deal Sheet
   - Opens portal (or client selection interface) with that property pre-selected
   - Or opens modal/overlay for client selection

2. **Replicate Current Portal Functionality:**
   - Same client selection interface as current portal
   - Same filtering (by BA, Pipeline Stage)
   - Same message options (standard or personalized)
   - Same email sending workflow

3. **URL/Parameter Handling:**
   - If opening portal: `https://portal-url.com?recordId={recordId}&propertyId={propertyId}&source=deal_sheet`
   - Portal should detect `source=deal_sheet` and show appropriate UI

### Implementation Tasks
- [ ] Add "Send to Clients" button to Deal Sheet
- [ ] Implement button click handler (opens portal or modal)
- [ ] Update portal to handle `source=deal_sheet` parameter
- [ ] Ensure portal loads correct property data when opened from Deal Sheet
- [ ] Test end-to-end: Deal Sheet → Portal → Client Selection → Email Send
- [ ] Verify email sending works from Deal Sheet flow

### Technical Considerations
- **Reuse Existing Portal:** Leverage current portal code
- **Make.com Webhook:** Same webhook as current portal (`MODULE_1_WEBHOOK`)
- **Payload Format:** Same payload structure as current portal sends

---

## Send Tracking & Logging

### Current State
- ✅ Client send tracking requirement documented (`CLIENT-SEND-TRACKING-REQUIREMENT.md`)
- ❌ **No tracking/logging implementation**

### Requirements
**What Needs to Be Built:**
1. **Log Structure:**
   - Track: Who sent (BA name/email)
   - Track: When sent (date/timestamp)
   - Track: What property (property address, recordId)
   - Track: Which clients (client IDs/emails, client names)
   - Track: Message type (standard or personalized)
   - Track: Source (portal, deal_sheet, email, etc.)

2. **Storage Location:**
   - **Option A:** GHL Custom Object field (`clients_sent_to` JSON array)
   - **Option B:** Separate GHL Custom Object (`property_send_log`)
   - **Option C:** Google Sheets (new tab: "Send Log")
   - **Option D:** Database (if available)

3. **Log Entry Creation:**
   - When email is sent from portal
   - When email is sent from Deal Sheet
   - When email is sent from any source
   - Capture all relevant metadata

4. **Log Viewing:**
   - View log entries per property
   - View log entries per client
   - View log entries per BA
   - Filter by date range
   - Export to CSV/Excel

### Implementation Tasks
- [ ] Decide on storage location (GHL field, separate object, or Sheet)
- [ ] Design log data structure
- [ ] Update Make.com scenario to log sends
- [ ] Create log viewing interface (portal, Deal Sheet, or separate view)
- [ ] Add filtering and search to log view
- [ ] Test logging with real sends
- [ ] Verify log entries are accurate

### Reference Documents
- `CLIENT-SEND-TRACKING-REQUIREMENT.md` - Detailed requirements
- Current portal code tracks sends but may not persist to GHL

---

## Portal Client Status Display

### Current State
- ✅ Portal shows client list with checkboxes
- ❌ **No indication if client has already been sent the property**

### Requirements
**What Needs to Be Built:**
1. **Status Display:**
   - Show "Sent" badge/indicator for clients who already received property
   - Show date when sent
   - Show who sent it (BA name)
   - Very visible indication (highlighted background, icon, etc.)

2. **Checkbox Behavior:**
   - Auto-disable checkbox for clients already sent
   - Show tooltip/hover text with send details
   - Allow re-send with double confirmation (see below)

3. **Re-Send Functionality:**
   - If BA attempts to send again, show warning:
     - "This property has already been sent to [Client Name] on [Date] by [BA Name]. Are you sure you want to send again?"
   - Require explicit confirmation ("Yes, Send Again" button)
   - Only enable checkbox after confirmation
   - Log re-send as separate entry (or update existing entry)

4. **Data Source:**
   - Read from send log (see Send Tracking section)
   - Query GHL field `clients_sent_to` or separate log object
   - Load status when portal opens

### Implementation Tasks
- [ ] Design UI for "Sent" status indicator
- [ ] Add API endpoint or Make.com module to fetch send status
- [ ] Update portal to load and display send status
- [ ] Implement checkbox disable logic for sent clients
- [ ] Implement re-send confirmation dialog
- [ ] Test with properties that have been sent
- [ ] Test re-send workflow

### Reference Documents
- `CLIENT-SEND-TRACKING-REQUIREMENT.md` - Detailed requirements for this feature

---

## Future Items (To Be Added)

**Note:** User mentioned there will be more items to add later. This section will be updated as new requirements are identified.

---

## Implementation Priority

### Phase 1: Foundation (Immediate)
1. ✅ Fix test page syntax error
2. ⚠️ Project email formatting (define requirements first)
3. ⚠️ Form edit access (enables other features)

### Phase 2: Core Features
4. ⚠️ Email button options (depends on form edit access)
5. ⚠️ New Deal Sheet (view all properties)
6. ⚠️ Deal Sheet → Client Selection (depends on Deal Sheet)

### Phase 3: Tracking & Status
7. ⚠️ Send tracking & logging (foundation for status display)
8. ⚠️ Portal client status display (depends on send tracking)

### Phase 4: Future Enhancements
9. ⚠️ Additional items (to be added)

---

## Dependencies

```
Form Edit Access
    ↓
Email Button Options
    ↓
New Deal Sheet
    ↓
Deal Sheet → Client Selection
    ↓
Send Tracking & Logging
    ↓
Portal Client Status Display
```

**Project Email Formatting** - Can be done independently (no dependencies)

---

## Questions to Resolve

### Project Email Formatting
- [ ] How many lots should be shown per email? (All? Paginated?)
- [ ] Should project emails have different structure than standard emails?
- [ ] How to display shared vs. lot-specific data visually?

### Form Edit Access
- [ ] Who can edit? (Packager only? BA? Both?)
- [ ] Should edits require re-approval?
- [ ] Should edit history be tracked?

### Deal Sheet
- [ ] Which implementation approach? (Google Sheets, Custom App, Portal Enhancement)
- [ ] Real-time or periodic sync?
- [ ] What columns/fields to display?

### Send Tracking
- [ ] Which storage option? (GHL field, separate object, Google Sheet)
- [ ] Should we track multiple sends to same client? (Yes - as separate entries)
- [ ] Should we track send status per BA? (Yes - for audit trail)

### Portal Status Display
- [ ] Exact UI design for "Sent" indicator?
- [ ] Should re-send create new log entry or update existing?

---

## Reference Documents

### Primary Documents
- `TODO-LIST.md` - Current task list
- `HANDOVER-2025-01-15-PROXIMITY-AUTOMATION.md` - Most recent handover
- `CLIENT-SEND-TRACKING-REQUIREMENT.md` - Client tracking requirements

### Email Template
- `code/MODULE-3-COMPLETE-FOR-MAKE.js` - Email template code
- `code/CONTRADICTIONS-FINDINGS.md` - Email formatting rules

### Project Documents
- `PROJECT-LOTS-ARCHITECTURE.md` - Project data architecture
- `MAKE-COM-IMPLEMENTATION-GUIDE.md` - Make.com implementation

### Workflow Documents
- `docs/workflow.md` - Current workflow
- `PROJECT-COMPLETION-CHECKLIST.md` - Completion checklist

---

**Document Created:** 2025-01-15  
**Last Updated:** 2025-01-15  
**Status:** Planning - Awaiting user input on questions and priorities
