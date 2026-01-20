# Project Completion Checklist - Property Review System

**Last Updated:** January 2025  
**Status:** 🔴 Critical items pending for project completion

---

## 🎯 Overview

This document outlines all critical pieces needed to close out the Property Review System project. The form is built, but we need to complete the integrations and ensure all data flows correctly.

---

## 1. ✅ Submit to GHL (via Make.com)

### Current State
- ❌ Step 6 is trying to submit directly to GHL API (`/api/ghl/submit-property`)
- ❌ This fails because:
  - GHL API token is incorrect/expired
  - Not all fields exist in GHL yet (see Section 5)

### Required Fix
- ✅ **Option: Skip direct GHL API call**
- ✅ **Send all data to Make.com webhook only**
- ✅ **Make.com will create the GHL record** (it already has the GHL API connection configured)

### Implementation Steps
1. **Update `Step6FolderCreation.tsx`:**
   - Remove direct GHL API call (`/api/ghl/submit-property`)
   - Send all form data to Make.com webhook only
   - Make.com webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
   - Make.com will handle GHL record creation via its existing "Get Record" → "Create/Update Record" modules

2. **Payload Structure for Make.com:**
   ```json
   {
     "source": "form_app",
     "action": "submit_new_property",
     "formData": {
       // All form data here
     },
     "folderLink": "...",
     "ghlRecordId": null  // Will be created by Make.com
   }
   ```

3. **Make.com Scenario (already exists):**
   - Module 1: Webhook (receives form data)
   - Module 6: Preprocess data
   - Module 13: Create GHL record (via GHL API)
   - Module 3: Build email template
   - Router: Send email to packager

### Status
- 🔴 **Pending**: Remove direct GHL API call from Step 6
- 🔴 **Pending**: Send all data to Make.com only

---

## 2. 📊 Push Data to Deal Sheet (Google Sheets)

### Current State
- ❌ Form submission does not write to Deal Sheet
- ❌ Deal Sheet is separate from form submission

### Required Functionality
- ✅ **Write all property data to Google Sheets on form submission**
- ✅ **Sheet ID**: `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- ✅ **Tab Name**: `Opportunities` (or production tab name)
- ✅ **Trigger**: After successful Make.com webhook call (or on Make.com side)

### Implementation Options

#### Option A: Write from Make.com (Recommended)
- Make.com already has Google Sheets integration
- After creating GHL record, add Google Sheets "Add a row" module
- Map all form fields to Deal Sheet columns
- **Pros**: Centralized, Make.com handles auth, no additional API needed
- **Cons**: Requires Make.com scenario update

#### Option B: Write from Form App
- Create `/api/google-sheets/write-deal` endpoint
- Call after Make.com webhook succeeds
- Use Google Sheets API (Service Account credentials)
- **Pros**: Direct control
- **Cons**: Requires Google Sheets API setup, duplicate auth handling

### Deal Sheet Column Mapping
Need to map all form fields to Deal Sheet columns. Reference:
- See `FIELD-MAPPING-MATRIX.md` (if exists)
- See `EXISTING-GHL-INFRASTRUCTURE.md` for field names

### Status
- 🔴 **Pending**: Map all form fields to Deal Sheet columns
- 🔴 **Pending**: Implement Deal Sheet write (via Make.com or form app)
- 🔴 **Pending**: Test Deal Sheet data population

---

## 3. 🔘 Button in Deal Sheet to Send Property to Clients

### Current State
- ❌ No button functionality documented
- ✅ Portal exists for client selection (but triggered via email)

### Required Functionality
- ✅ **Google Apps Script button in Deal Sheet**
- ✅ **Button triggers**: "Send to Clients" workflow
- ✅ **Function**: Opens portal or triggers Make.com webhook to send property to selected clients

### Implementation Steps
1. **Create Google Apps Script in Deal Sheet:**
   ```javascript
   function sendPropertyToClients() {
     // Get selected row data
     // Call Make.com webhook with property data
     // Or open portal URL with property ID
   }
   ```

2. **Two Options:**
   - **Option A**: Button opens portal URL with property ID (like email link does)
   - **Option B**: Button directly calls Make.com webhook (bypasses portal)

3. **Make.com Webhook:**
   - Same webhook as portal: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
   - Payload: `{ "source": "deal_sheet", "recordId": "...", "action": "send_to_clients" }`

### Status
- 🔴 **Pending**: Create Google Apps Script button
- 🔴 **Pending**: Implement button click handler
- 🔴 **Pending**: Test button functionality

---

## 4. 🎯 Auto-Selection of Clients When Property First Raised

### Current State
- ✅ Make.com already has auto-selection logic (when Status = "01 Available")
- ✅ Triggered when Property Review is created/changed
- ❓ **Question**: Does it have all the data it needs?

### Required Functionality
- ✅ **Make.com automatically selects matching clients** based on:
  - Property criteria (location, price range, property type, etc.)
  - Client preferences (stored in Opportunities Google Sheet)
  - BA assignment (follower/owner)
- ✅ **Send auto-selected property to clients automatically**
- ✅ **Store client selection in GHL or Deal Sheet** (for future "Send Again" functionality)

### Data Requirements for Auto-Selection
Make.com needs access to all property data to match clients. Currently Make.com:
- ✅ Reads GHL record (Module 13: Get Record)
- ✅ Has access to Opportunities Google Sheet (client data)
- ❓ **Question**: Are all property fields available in GHL for matching?

### Data Persistence for "Send Again"
When user clicks "Send to Clients" in future:
- ❓ **Question**: Where is client selection stored?
- ❓ **Question**: Where is email template data stored?
- **Requirement**: All form data must be in GHL so email can be recreated

### Status
- 🟡 **Partially Working**: Auto-selection exists in Make.com
- 🔴 **Pending**: Verify all property data is in GHL for matching
- 🔴 **Pending**: Ensure client selection is stored for future use
- 🔴 **Pending**: Test auto-selection with real data

---

## 5. 🔧 Update Custom Object Fields in GHL

### Current State
- ✅ Most fields exist in GHL (see `EXISTING-GHL-INFRASTRUCTURE.md`)
- ❌ Some fields are missing (see list below)
- ❌ Some fields may need repurposing (see mismatches below)

### Missing Fields (Need to Create in GHL)

Based on form vs GHL comparison:

1. **Property Description:**
   - `build_size` - For H&L & Projects (building size in m²)
   - `land_registration` - For H&L/Projects (replaces Year Built for new properties)
   - `lga` - For Investment Highlights lookup (Local Government Area)

2. **Purchase Price:**
   - `rent_appraisal_primary_from` - If splitting `rent_appraisal_primary`
   - `rent_appraisal_primary_to` - If splitting `rent_appraisal_primary`
   - `rent_appraisal_secondary_from` - If splitting `rent_appraisal_secondary`
   - `rent_appraisal_secondary_to` - If splitting `rent_appraisal_secondary`
   - `land_price` - For H&L split contracts
   - `build_price` - For H&L split contracts
   - `total_price` - For H&L split contracts
   - `cashback_rebate_value` - For cashback/rebate amount
   - `cashback_rebate_type` - For cashback/rebate type (percentage/amount)

3. **Attachments:**
   - `folder_link` - Google Drive folder URL (created in Step 6)

4. **Project-Specific:**
   - Project lot fields (if stored separately, not in `lots` array)
   - `project_address` - For projects with multiple lots
   - `use_property_address` - Checkbox for projects

5. **Workflow/Editing:**
   - `ba_editing_notes` - BA notes for edits
   - `section_flagged` - Which section needs editing
   - `packager_response_notes` - Packager response to BA edits
   - `blocked_status` - Is property blocked from sending?

### Field Mismatches (Need Clarification)

1. **`accepted_acquisition_target` vs `acceptable_acquisition__from` + `acceptable_acquisition__to`:**
   - Current: Single field `accepted_acquisition_target`
   - Form has: `acceptableAcquisitionFrom` + `acceptableAcquisitionTo`
   - **Decision needed**: Use existing field or create new range fields?

2. **`rent_appraisal_primary` vs `rent_appraisal_primary_from` + `rent_appraisal_primary_to`:**
   - Current: Single field `rent_appraisal_primary`
   - Form has: `rentAppraisalPrimaryFrom` + `rentAppraisalPrimaryTo`
   - **Decision needed**: Use existing field or create new range fields?

3. **Field Name Typos:**
   - `mining_dialogie` (should be `mining_dialogue`)
   - `market_perfornance_additional_dialogue` (should be `market_performance_additional_dialogue`)

### Fields to Repurpose/Delete
- Review old fields that are no longer used
- Archive or delete deprecated fields
- Update Make.com templates if field names change

### Implementation Steps
1. **Create missing fields in GHL:**
   - Go to GHL → Custom Objects → Property Reviews
   - Add all missing fields from list above
   - Set correct field types (Text, Number, Yes/No, Dropdown, etc.)

2. **Update field names:**
   - Fix typos (`mining_dialogie` → `mining_dialogue`)
   - Consider splitting range fields if needed

3. **Update Make.com webhook payload:**
   - Add all new fields to GHL workflow trigger
   - Ensure all fields are sent to Make.com

4. **Update form submission mapping:**
   - Map all form fields to correct GHL field names
   - Handle field name differences

### Status
- 🔴 **Pending**: Create missing fields in GHL
- 🔴 **Pending**: Fix field name typos
- 🔴 **Pending**: Decide on field mismatches (range vs single)
- 🔴 **Pending**: Update Make.com webhook payload
- 🔴 **Pending**: Update form submission mapping

---

## 6. 🔗 Update Webhooks for New Fields

### Current State
- ✅ Make.com webhook exists: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- ✅ GHL workflow sends all custom object fields to Make.com
- ❌ New fields won't be included until GHL workflow is updated

### Required Updates

1. **GHL Workflow Trigger:**
   - **Workflow**: "PR → Property Review Created" (Main Workflow)
   - **Webhook URL**: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
   - **Action**: Add all new fields to payload (automatically done when fields exist in GHL)

2. **Make.com Webhook Payload:**
   - **Module 1**: Receives all fields from GHL
   - **Module 6**: Preprocesses data (may need update if new fields added)
   - **Module 13**: Gets record from GHL (should include new fields automatically)

3. **Make.com Email Template (Module 3):**
   - May need updates to include new fields in email template
   - Check if new fields should appear in email

4. **Form App → Make.com Webhook:**
   - When form submits directly to Make.com (not via GHL), payload must include all fields
   - Update `Step6FolderCreation.tsx` payload structure

### Implementation Steps
1. **After creating new fields in GHL:**
   - GHL workflow will automatically include new fields in webhook payload
   - Test webhook to verify new fields are present

2. **Update Make.com Module 6 (Preprocessor):**
   - Check if it handles all new fields
   - Update if needed to map new field names

3. **Update Make.com Module 3 (Email Template):**
   - Add new fields to email template if needed
   - Update formatting for new field types

4. **Update Form App Payload:**
   - Ensure all form fields are included in Make.com webhook call
   - Match GHL field names exactly

### Status
- 🔴 **Pending**: Create new fields in GHL first (see Section 5)
- 🔴 **Pending**: Test GHL webhook includes all new fields
- 🔴 **Pending**: Update Make.com modules if needed
- 🔴 **Pending**: Update form app payload structure

---

## 7. 💾 Data Persistence for Email Recreation

### Current State
- ✅ Form data is stored in Zustand (browser localStorage)
- ✅ Form data is sent to Make.com/GHL on submission
- ❓ **Question**: Is all data persisted in GHL for future use?

### Required Functionality
- ✅ **All form data must be saved in GHL** (so email can be recreated)
- ✅ **Client selection must be stored** (for "Send Again" functionality)
- ✅ **Email template data must be available** (or be able to regenerate from GHL data)

### Data Storage Locations

1. **GHL Custom Object (Primary):**
   - ✅ All property data stored here
   - ✅ Make.com reads from here to build emails
   - ✅ Portal reads from here to show property details
   - **Status**: ✅ Working (once all fields are created)

2. **Google Sheets Deal Sheet:**
   - ✅ Stores property summary (for Deal Sheet view)
   - ✅ Stores client opportunities (for client matching)
   - ❓ **Question**: Does it store full property data or just summary?

3. **Make.com Data Store (if used):**
   - Make.com may cache data temporarily
   - Not reliable for long-term storage

### "Send Again" Workflow

When BA clicks "Send to Clients" in Deal Sheet later:
1. **Get property data from GHL** (via recordId)
2. **Match clients** (from Opportunities Google Sheet)
3. **Build email template** (from GHL data via Make.com Module 3)
4. **Send to selected clients** (via Make.com Module 14)

### Required Data in GHL
All of these must be in GHL for email recreation:
- ✅ Property address, description, pricing, rental
- ✅ Risk overlays, dialogue text
- ✅ Content sections (Why this Property?, Proximity, Investment Highlights)
- ✅ Market performance data
- ✅ Agent information
- ✅ Folder link
- ✅ Project lot details (if applicable)

### Status
- 🟡 **Partially Working**: Most data is in GHL
- 🔴 **Pending**: Verify all fields are in GHL (see Section 5)
- 🔴 **Pending**: Test "Send Again" workflow end-to-end
- 🔴 **Pending**: Verify email can be recreated from GHL data only

---

## 📋 Summary of Critical Actions

### Immediate Priority (Blocking Submission)
1. **✅ Fix Step 6 submission:** Remove direct GHL API call, send to Make.com only
2. **✅ Ensure Make.com receives all form data**

### High Priority (Required for Full Functionality)
3. **🔴 Create missing GHL fields** (Section 5)
4. **🔴 Update Make.com webhook payload** (Section 6)
5. **🔴 Implement Deal Sheet write** (Section 2)
6. **🔴 Create Deal Sheet button** (Section 3)

### Medium Priority (Enhancements)
7. **🟡 Test auto-selection of clients** (Section 4)
8. **🟡 Verify data persistence** (Section 7)
9. **🟡 Test "Send Again" workflow** (Section 7)

---

## 🔍 Testing Checklist

### Test 1: Form Submission → Make.com → GHL
- [ ] Submit form from Step 6
- [ ] Verify Make.com webhook receives all data
- [ ] Verify GHL record is created with all fields
- [ ] Verify packager email is sent

### Test 2: Deal Sheet Population
- [ ] Submit form
- [ ] Verify Deal Sheet row is created
- [ ] Verify all columns are populated correctly

### Test 3: Deal Sheet Button → Client Emails
- [ ] Click "Send to Clients" button in Deal Sheet
- [ ] Verify portal opens or Make.com webhook is called
- [ ] Verify client emails are sent

### Test 4: Auto-Selection on First Submit
- [ ] Submit property with Status = "01 Available"
- [ ] Verify Make.com auto-selects matching clients
- [ ] Verify auto-selected clients receive email

### Test 5: Send Again Later
- [ ] Wait for property to be in Deal Sheet
- [ ] Click "Send to Clients" button
- [ ] Verify email can be recreated from GHL data
- [ ] Verify clients receive email

---

## 📝 Notes

1. **Make.com is the Hub:**
   - All data flows through Make.com
   - Make.com handles GHL API calls (not form app)
   - Make.com handles Google Sheets writes (can be added)

2. **GHL is the Source of Truth:**
   - All property data is stored in GHL
   - Make.com reads from GHL to build emails
   - Portal reads from GHL to show property details

3. **Form App is Just the Input:**
   - Form app collects data and sends to Make.com
   - Form app does NOT need direct GHL API access
   - Form app does NOT need Google Sheets API access (if Make.com handles it)

4. **Data Flow:**
   ```
   Form App → Make.com Webhook → [Make.com Processes] → GHL Record
                                                      → Google Sheets
                                                      → Email to Packager
   ```

---

## ✅ Next Steps

1. **Update Step 6 to skip direct GHL API call** (1-2 hours)
2. **Create missing GHL fields** (2-4 hours)
3. **Test Make.com receives all data** (1 hour)
4. **Add Deal Sheet write to Make.com** (2-3 hours)
5. **Create Deal Sheet button** (2-3 hours)
6. **End-to-end testing** (4-6 hours)

**Total Estimated Time:** 12-19 hours

---

**Last Updated:** January 2025  
**Next Review:** After Step 6 fix is completed
