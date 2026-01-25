# Make.com Scenarios & GHL Webhooks - Complete Reference
**Last Updated:** January 2025  
**Source:** Blueprint files from `C:\Users\User\.cursor\JT FOLDER`

---

## 📋 Make.com Scenarios

### 1. GHL Property Review Submitted ⭐ MAIN SCENARIO
**File:** `GHL Property Review Submitted.blueprint.json`  
**Status:** Active (DO NOT MODIFY)  
**Purpose:** Receives webhook from GHL when Property Review is created/changed

**Webhook:**
- **URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **Hook ID:** `2216766`
- **Receives:** All Property Review custom object fields from GHL

**Structure:**
- **Module 1:** Custom Webhook (receives GHL data)
- **Module 2+:** Router (branches based on conditions)
- **Modules:** Get Record, Make Code (JavaScript), Iterator, Gmail modules
- **Flow:** Processes data → Builds email templates → Sends emails

**Key Features:**
- Receives all GHL custom object fields
- Processes through custom JavaScript code
- Generates multiple email types
- Likely calls Stash API
- Likely writes to Google Sheets

**⚠️ IMPORTANT:** This scenario is production and must remain untouched. We will create a NEW scenario for form app submissions.

---

### 2. Property Review Approval Webhook - by Ahmad
**File:** `Property Review Approval Webhook - by Ahmad.blueprint.json`  
**Status:** Active  
**Purpose:** Writes approval status back to GHL Custom Object

**Webhook:**
- **Hook ID:** `2226052`
- **Receives:** Approval data from email approval button

**Structure:**
- **Module 1:** Custom Webhook
  - Receives: `recordId`, `propertyId`, `action`, `field`, `value`
- **Module 11:** HTTP - Update Custom Object (GHL)
  - **Method:** PUT
  - **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/{{1.recordId}}`
  - **Headers:**
    - `Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
    - `Version: 2021-07-28`
  - **Body:** Updates `packager_approved` field
  - **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Module 13:** Break (on error, with retry)

**What it does:**
1. Receives approval webhook (from email approval button)
2. Updates `packager_approved` field in GHL Custom Object
3. Stops execution

---

### 3. GHL Check Address Webhook
**File:** `GHL Check Address Webhook.blueprint.json`  
**Status:** Active  
**Purpose:** Checks if property address already exists in GHL

**Webhook:**
- **Receives:** `propertyAddress` (text)

**Structure:**
- **Module 1:** Custom Webhook
  - Receives: `propertyAddress`
- **Module 2:** HTTP - Get All Records (GHL)
  - **Method:** GET
  - **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`
  - **Headers:**
    - `Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
    - `Version: 2021-07-28`
  - **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Module 3:** Make Code - Check for Matching Address
  - **Language:** JavaScript
  - **Input:** `propertyAddress`, `records`
  - **Logic:** Normalizes addresses and compares
  - **Returns:** `{ exists: boolean, matchingRecords: [...], totalRecordsChecked: number }`
- **Module 4:** Webhook Response
  - **Status:** 200
  - **Body:** Result from Module 3

**What it does:**
1. Receives property address
2. Gets all GHL records
3. Normalizes and compares addresses
4. Returns matching records (if any)

**Used by:** Form app (Step 0) to check for duplicate addresses

---

### 4. Test Stashproperty AP
**File:** `Test Stashproperty AP.blueprint.json`  
**Status:** Active  
**Purpose:** Calls Stash API to get risk overlays

**Structure:**
- **Module 3:** Custom Webhook (receives request)
- **Module 4+:** HTTP modules (calls Stash API)
- **Module 9+:** Make Code modules (processes Stash response)
- **Final Module:** Webhook Response (returns data)

**What it does:**
1. Receives webhook with property address
2. Calls Stash API to get risk overlays
3. Processes Stash response (extracts zoning, flood, bushfire, mining, etc.)
4. Returns processed data via webhook response

**Returns:** Risk overlays (Flood, Bushfire, Mining, Other Overlay, Special Infrastructure), Zoning, LGA, coordinates

---

## 🔗 GHL Workflows (Webhooks from GHL to Make.com)

### 1. PR → Property Review Created (Trigger) ⭐ MAIN WORKFLOW
**Purpose:** Triggered when Property Review custom object is created/changed  
**Make.com Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`  
**Triggers:**
- Property Review Created
- Property Review Changed (when "Resubmit for testing?" = 'yes')
- Property Review Changed (when "BA Approved" = 'Approved')
- Property Review Changed (when "Packager Approved" = 'Approved')

**Payload:** Sends all custom object fields to Make.com  
**Triggers Scenario:** "GHL Property Review Submitted"

**Fields Sent:**
- All Property Review custom object fields (see `EXISTING-GHL-INFRASTRUCTURE.md` for complete list)
- Includes: `id`, `property_address`, `template_type`, `sourcer`, `packager`, `deal_type`, `review_date`, and all other fields

---

### 2. PR Opportunity update Make.com
**Purpose:** Updates when Opportunity changes  
**Make.com Webhook URL:** `https://hook.eu1.make.com/phqgvu4i3knw9p7y42i5d6dhyw54xbaci`  
**Trigger:** Opportunity Changed (in pipeline 'DA PROPERTY TEAM P...', Status = 'open')  
**Payload:** Sends opportunity data (id, name, stage, contact info, partner info, status, followers)

---

### 3. PR - Opportunity Pipeline stage change capture Make
**Purpose:** Captures pipeline stage changes  
**Make.com Webhook URL:** `https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt`  
**Trigger:** Pipeline Stage Changed (in pipeline '04. PROPERTY TEAM P...')  
**Payload:** Sends `opportunity_id`, `stage_name`, `pipeline_stage_id`  
**Note:** May be redundant - need to verify if still used

---

## 🔧 GHL API Configuration

### Base Configuration
- **Base URL:** `https://services.leadconnectorhq.com`
- **Object ID:** `692d04e3662599ed0c29edfa` (Property Reviews)
- **Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **API Version:** `2021-07-28`
- **Bearer Token:** `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`

### API Endpoints Used

#### Get All Records
- **Method:** GET
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`
- **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Headers:**
  - `Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - `Version: 2021-07-28`

#### Get Record by ID
- **Method:** GET
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/{recordId}`
- **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Headers:** Same as above

#### Create Record
- **Method:** POST
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records`
- **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Headers:** Same as above
- **Body:** JSON with `properties` object containing field values

#### Update Record
- **Method:** PUT
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/{recordId}`
- **Query:** `locationId=UJWYn4mrgGodB7KZUcHt`
- **Headers:** Same as above
- **Body:** JSON with `properties` object containing fields to update

---

## 📊 Data Flow Diagrams

### Current Flow (GHL → Make.com)
```
GHL Custom Object Created/Changed
  ↓
GHL Workflow: "PR → Property Review Created"
  ↓
Webhook: https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d
  ↓
Make.com Scenario: "GHL Property Review Submitted"
  ↓
Processes data → Builds email → Sends to packager
```

### New Flow (Form App → Make.com)
```
Form App Submission
  ↓
NEW Webhook: [TO BE CREATED]
  ↓
NEW Make.com Scenario: "Form App Property Submission"
  ↓
Create GHL Record(s)
  ↓
Build email template
  ↓
Store email in parent record (if project)
  ↓
Send email to packager
  ↓
Write to Deal Sheet
```

---

## 🎯 Key Insights for New Scenario

### What We Can Reuse
1. **GHL API Connection:** Already configured in Make.com
2. **Email Template Logic:** Can copy from "GHL Property Review Submitted" scenario
3. **GHL API Endpoints:** Same endpoints, same authentication
4. **Field Mapping:** Same GHL field names

### What's Different
1. **Data Source:** Form app sends structured form data (not GHL webhook)
2. **Record Creation:** Need to CREATE records (not just read)
3. **Parent-Child Logic:** Need to handle project lots structure
4. **Deal Sheet:** Need to write to Deal Sheet after creation
5. **Response:** Need to return response to form app

### What We Need to Build
1. **New Webhook:** Custom webhook for form app
2. **Data Mapping:** Map form fields to GHL fields
3. **Record Creation:** Create single or parent+children records
4. **Email Template:** Build from form data (or get from created record)
5. **Deal Sheet Write:** Add row(s) to Google Sheets
6. **Response:** Return JSON to form app

---

## 📝 Field Mapping Reference

### Form App → GHL Field Mapping
See `docs/EXISTING-GHL-INFRASTRUCTURE.md` for complete GHL field list.

**Key Mappings:**
- `formData.address.projectAddress` → `property_address`
- `formData.address.streetNumber` → `street_number`
- `formData.address.streetName` → `street_name`
- `formData.address.suburb` → `suburb_name`
- `formData.address.state` → `state`
- `formData.address.postcode` → `post_code`
- `formData.templateType` → `template_type`
- `formData.folderLink` → `folder_link`

### New Fields Needed (Create in GHL First)
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

---

## ✅ Next Steps

1. **Review existing scenarios** (reference only - don't modify)
2. **Create missing GHL fields** (if not done)
3. **Create NEW Make.com scenario:** "Form App Property Submission"
4. **Get new webhook URL** from Make.com
5. **Build scenario modules:**
   - Webhook (receives form data)
   - Router (detect project vs single property)
   - Create GHL record(s)
   - Build email template
   - Store email in parent (if project)
   - Send email
   - Write to Deal Sheet
   - Return response
6. **Update form app code** with new webhook URL
7. **Test end-to-end**

---

## 📚 Reference Documents

- **GHL Infrastructure:** `docs/EXISTING-GHL-INFRASTRUCTURE.md`
- **Handover Document:** `HANDOVER-2025-01-SESSION.md`
- **Implementation Guide:** `MAKE-COM-IMPLEMENTATION-GUIDE.md`
- **Project Architecture:** `PROJECT-LOTS-ARCHITECTURE.md`
- **Completion Checklist:** `PROJECT-COMPLETION-CHECKLIST.md`

---

**Status:** Ready to build new scenario  
**Confidence Level:** High - All existing scenarios documented, clear path forward
