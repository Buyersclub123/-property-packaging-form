# Make.com Implementation Guide
**For:** Property Review System Integration  
**Date:** January 2025  
**Status:** Ready to implement

---

## 🎯 Overview

This guide will walk you through **creating a NEW Make.com scenario** to handle form submissions from the Property Review Form App. 

**⚠️ IMPORTANT: We will NOT modify the existing "PR → Property Review Created" scenario.** This keeps the production workflow safe and allows us to test independently.

---

## 📋 Current State

### What's Already Working (Existing Scenario - DO NOT TOUCH)
- ✅ Make.com scenario exists: "PR → Property Review Created"
- ✅ Webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- ✅ GHL API connection configured in Make.com
- ✅ Email template builder logic exists (can be reused)
- ✅ Can create/update GHL records via Make.com
- ✅ **Status:** Keep this scenario completely untouched

### What We're Building (New Scenario)
- ⏳ **NEW scenario:** "Form App Property Submission"
- ⏳ **NEW webhook URL:** (to be created in Make.com)
- ⏳ Create GHL records from form data
- ⏳ Handle parent-child record structure for projects
- ⏳ Write to Deal Sheet after GHL record creation
- ⏳ Store email template in parent record for "Send Again" functionality
- ⏳ Reuse email template logic from existing scenario

---

## 🔍 Step 1: Review Existing Scenario (Reference Only)

**Action:** Open your existing "PR → Property Review Created" scenario to understand the email template logic.

**What to Document (for reference):**
1. How does the email template get built? (What modules are used?)
2. What data structure does the email template expect?
3. How is the email sent to packager?

**Why:** We'll reuse this email template logic in the new scenario.

**⚠️ Important:** Do NOT modify this scenario. We're just reviewing it to understand the logic.

---

## 🆕 Step 2: Create New Make.com Scenario

**Action:** Create a completely new scenario in Make.com.

**Action Items:**

1. **Create New Scenario:**
   - Name: "Form App Property Submission"
   - Description: "Handles form app submissions, creates GHL records, sends emails"

2. **Add Webhook Module (Module 1):**
   - Add "Webhooks" → "Custom webhook" module
   - **This will generate a NEW webhook URL**
   - Save the webhook URL - we'll need to update the form app code with this URL
   - Configure to accept POST requests
   - **Note:** This is a DIFFERENT webhook URL from the existing scenario

3. **Test Webhook:**
   - The form app will send this structure:
   ```json
   {
     "source": "form_app",
     "action": "submit_new_property",
     "formData": {
       "decisionTree": { ... },
       "address": { ... },
       "riskOverlays": { ... },
       "propertyDescription": { ... },
       "purchasePrice": { ... },
       "rentalAssessment": { ... },
       "lots": [ ... ],  // Only for projects
       // ... all other form fields
     },
     "folderLink": "https://drive.google.com/...",
     "ghlRecordId": null
   }
   ```

**Next:** Once webhook is created, we'll build the rest of the scenario.

---

## 🔄 Step 3: Add Data Preprocessing

**Purpose:** Prepare form data for GHL record creation.

**Action Items:**

1. **Add Data Mapping Module (Optional):**
   - If needed, add a "Set variables" or "Data mapper" module
   - Map form fields to a consistent structure
   - This step may not be needed if we can map directly in GHL creation module

2. **Detect if Project:**
   - Add a router or filter module
   - Check if `formData.lots` exists and has items
   - Or check `formData.templateType === "Project"`
   - Route to:
     - **Path 1:** Single property flow
     - **Path 2:** Project flow (parent + children)

**Questions to Answer:**
- Do we need preprocessing, or can we map directly in GHL module?
- How should we detect if it's a project vs single property?

---

## 🆕 Step 4: Create GHL Record Creation Module

**Current Behavior:** Scenario only reads GHL records (Module 13: Get Record).

**New Requirement:** Create GHL records from form data.

### For Single Properties:

**Action Items:**

1. **Add "Create a Record" Module (GHL):**
   - Use GHL API connection (already configured)
   - Object ID: `692d04e3662599ed0c29edfa`
   - Location ID: `UJWYn4mrgGodB7KZUcHt`
   - Map all form fields to GHL fields
   - Store `folder_link` from payload

2. **Field Mapping:**
   - Map all fields from `formData` to GHL custom object fields
   - Reference: `docs/EXISTING-GHL-INFRASTRUCTURE.md` for field names
   - Important: Use exact GHL field names (with underscores, not camelCase)

3. **Store Record ID:**
   - Save the created record ID for later use
   - This will be returned to form app

### For Projects (with lots):

**Action Items:**

1. **Detect if Project:**
   - Check if `formData.lots` exists and has items
   - Or check `formData.templateType === "Project"`

2. **Create Parent Record First:**
   - Create GHL record with:
     - `is_parent_record: true`
     - `project_parent_id: null` (or empty)
     - `project_identifier: [generate_unique_id]` (e.g., "PROJ-2025-001")
     - All shared project data (address, risk overlays, content sections, etc.)
     - `lots_data: [JSON_string_of_lots_array]` (if field exists)
   - Save parent record ID

3. **Create Child Records (Loop):**
   - For each item in `formData.lots`:
     - Create GHL record with:
       - `is_parent_record: false`
       - `project_parent_id: [parent_record_id]`
       - `project_identifier: [same_as_parent]`
       - `lot_number: [lot.lotNumber]`
       - `property_address: "[project_address] - [lot_number]"`
       - Only lot-specific data (beds, bath, land size, build size, prices, rental, etc.)
   - Save all child record IDs

4. **Error Handling:**
   - If parent creation fails, stop and return error
   - If child creation fails, log error but continue with other children
   - Return partial success if some children fail

**Questions to Answer:**
- Do we have a "Create a Record" module for GHL?
- How do we generate unique `project_identifier`?
- Should we use Make.com's iterator to loop through lots?

---

## 📧 Step 5: Build Email Template

**Purpose:** Build email template from form data (similar to existing scenario logic).

**Action Items:**

1. **Get GHL Record(s) After Creation:**
   - After creating GHL record(s), use "Get a record" module to retrieve them
   - This ensures we have the record ID and can reference it
   - For projects: Get parent record (we'll use this for email template)

2. **Build Email Template:**
   - **Option A:** Reuse logic from existing scenario
     - Copy the email template builder modules from existing scenario
     - Modify to use form data or GHL record data
   - **Option B:** Build from scratch
     - Use "Text parser" or "HTML" module to build email
     - Include all property data
     - For projects: Include all lots in email

3. **For Projects - Include All Lots:**
   - Email should show:
     - Shared project data (address, risk overlays, content sections)
     - All lots listed with their specific data
   - Use iterator to loop through `formData.lots` and build lot sections

4. **Store Email Template in Parent Record:**
   - After building email template:
     - If project: Update parent record with:
       - Use "Update a record" module
       - Set `email_template_html: [complete_html]`
       - Set `email_template_text: [plain_text_version]`
     - If single property: Store in record (if fields exist)

**Questions to Answer:**
- Should we copy modules from existing scenario or build from scratch?
- How complex is the email template? (Can we reuse existing logic?)

---

## 📊 Step 6: Add Deal Sheet Integration

**Current Behavior:** (May not exist yet)

**New Requirement:** Write property data to Google Sheets Deal Sheet after GHL record creation.

**Action Items:**

1. **Add Google Sheets "Add a row" Module:**
   - Connection: Google Sheets (configure if needed)
   - Spreadsheet ID: `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
   - Sheet Name: `Opportunities`

2. **For Single Properties:**
   - Add one row with all property data
   - Include `ghl_record_id` for "Send Again" button

3. **For Projects:**
   - Add one row per CHILD record (not parent)
   - Each row should have:
     - Lot-specific data
     - Reference to parent (for "Send Again" button)
     - `ghl_record_id` (child record ID)
     - `project_parent_id` (parent record ID)

4. **Field Mapping:**
   - Map form fields to Deal Sheet columns
   - Need to know: What columns exist in Deal Sheet?
   - Create mapping document if needed

**Questions to Answer:**
- Do we have Google Sheets connection configured?
- What columns exist in the Deal Sheet?
- Do we have a column mapping document?

---

## 📤 Step 7: Update Response Format

**Current Behavior:** (May not return response to form app)

**New Requirement:** Return JSON response to form app after successful submission.

**Action Items:**

1. **Add Response Module (or update existing):**
   - Return JSON format:
   ```json
   {
     "success": true,
     "recordId": "[ghl_record_id]",
     "parentRecordId": "[parent_id_if_project]",
     "childRecordIds": ["[child_id_1]", "[child_id_2]"],
     "message": "Property submitted successfully"
   }
   ```

2. **For Single Properties:**
   - Return `recordId` only

3. **For Projects:**
   - Return `parentRecordId` and `childRecordIds` array

4. **Error Handling:**
   - Return error response if something fails:
   ```json
   {
     "success": false,
     "error": "Error message here",
     "recordId": null
   }
   ```

**Questions to Answer:**
- Does Make.com automatically return webhook response?
- Or do we need to add a specific response module?

---

## 🧪 Step 8: Testing Plan

### Test 1: Single Property Submission
1. Submit form with single property
2. Verify:
   - ✅ GHL record created with all fields
   - ✅ Email template built correctly
   - ✅ Packager email sent
   - ✅ Deal Sheet row added
   - ✅ Response returned to form app

### Test 2: Project Submission (Parent + Children)
1. Submit form with project (multiple lots)
2. Verify:
   - ✅ Parent record created
   - ✅ Child records created (one per lot)
   - ✅ Parent-child linking correct
   - ✅ Email template includes all lots
   - ✅ Email template stored in parent record
   - ✅ Deal Sheet rows added (one per child)
   - ✅ Response returned with parent + child IDs

### Test 3: Error Handling
1. Test with invalid data
2. Verify:
   - ✅ Error response returned
   - ✅ No partial records created
   - ✅ Error logged in Make.com

### Test 4: Existing GHL Flow (Regression)
1. Trigger existing "PR → Property Review Created" workflow
2. Verify:
   - ✅ Existing flow still works (should be unaffected)
   - ✅ No breaking changes (we didn't modify it)

---

## 📝 Field Mapping Reference

### Critical New Fields (Need to Create in GHL First)
- `project_parent_id` (Text)
- `project_identifier` (Text)
- `is_parent_record` (Yes/No)
- `lot_number` (Text)
- `email_template_html` (Long Text)
- `email_template_text` (Long Text)
- `build_size` (Text)
- `land_registration` (Text)
- `lga` (Text)
- `folder_link` (Text)

### Form Field → GHL Field Mapping
See `docs/EXISTING-GHL-INFRASTRUCTURE.md` for complete list.

Key mappings:
- `formData.address.projectAddress` → `property_address`
- `formData.address.streetNumber` → `street_number`
- `formData.address.streetName` → `street_name`
- `formData.address.suburb` → `suburb_name`
- `formData.address.state` → `state`
- `formData.address.postcode` → `post_code`
- `formData.templateType` → `template_type`
- `formData.folderLink` → `folder_link`

---

## 🚀 Implementation Order

**Recommended Sequence:**

1. **Step 1:** Review existing scenario (reference only - don't modify)
2. **Step 2:** Create missing GHL fields (if not done)
3. **Step 3:** Create NEW Make.com scenario
4. **Step 4:** Add webhook module (get new webhook URL)
5. **Step 5:** Add data preprocessing (detect project vs single property)
6. **Step 6:** Create GHL record creation module (single property first)
7. **Step 7:** Test single property submission
8. **Step 8:** Add project support (parent + children)
9. **Step 9:** Build email template (reuse logic from existing scenario)
10. **Step 10:** Add Deal Sheet integration
11. **Step 11:** Update response format
12. **Step 12:** Update form app code with new webhook URL
13. **Step 13:** End-to-end testing

---

## ❓ Questions to Answer Before Starting

1. **Existing Scenario (Reference):**
   - Can you share a screenshot or export of existing "PR → Property Review Created" scenario?
   - This helps us understand email template logic to reuse

2. **GHL Fields:**
   - Have the new fields been created in GHL?
   - (project_parent_id, project_identifier, is_parent_record, etc.)
   - If not, we need to create them first (see Step 2 in handover doc)

3. **Deal Sheet:**
   - What columns exist in Deal Sheet?
   - Do we have column mapping document?

4. **Testing:**
   - Can we use test data first?
   - Should we test in a separate Make.com space or same space?

5. **Webhook URL:**
   - Once we create the new webhook, we'll need to update form app code
   - Do you have access to update `Step6FolderCreation.tsx`?

---

## 📚 Reference Documents

- **Make.com Scenarios & GHL Webhooks:** `docs/MAKECOM-SCENARIOS-AND-GHL-WEBHOOKS.md` ⭐ **START HERE**
- **Handover Document:** `HANDOVER-2025-01-SESSION.md`
- **GHL Infrastructure:** `docs/EXISTING-GHL-INFRASTRUCTURE.md`
- **Project Architecture:** `PROJECT-LOTS-ARCHITECTURE.md`
- **Completion Checklist:** `PROJECT-COMPLETION-CHECKLIST.md`

---

---

## ⚠️ Important Notes

### Why Create a New Scenario?

1. **Safety:** Existing production workflow stays untouched
2. **Testing:** Can test independently without risk
3. **Rollback:** Easy to disable/delete if issues arise
4. **Isolation:** Problems in new scenario won't affect existing workflow

### What Happens to Form App Code?

Once we create the new webhook URL, we'll need to update:
- `form-app/src/components/steps/Step6FolderCreation.tsx`
- Change webhook URL from: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- To: `[NEW_WEBHOOK_URL]` (we'll get this when we create the webhook)

### Can We Reuse Existing Logic?

Yes! We can:
- Copy email template builder modules from existing scenario
- Reuse GHL API connection (already configured)
- Reference existing scenario for structure/flow

---

**Status:** Ready to implement  
**Next Step:** Start with Step 1 - Review existing scenario (reference only)
