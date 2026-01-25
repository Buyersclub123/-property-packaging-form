# Critical Questions - Need Answers Before Building

**📋 See `SPECIFIC-MAKECOM-QUESTIONS.md` for detailed questions with module numbers and screenshot references.**

## 🔴 BLOCKING - Must Answer Before Day 1

### 1. Make.com Stash Integration - "Test Stashproperty AP" Scenario
**Question:** Need specific details from screenshots with module numbers

**What I need (from screenshots):**
- **Module 1 (Webhooks):** Exact webhook URL to trigger this scenario
- **Module 1:** Request format/JSON structure expected
- **Module 2 (HTTP):** Stash API endpoint URL, request format
- **Module 3 (Make Code):** What does it process? Output format?
- **Module 4 (HTTP):** Second Stash API call - endpoint, request format
- **Module 5 (Make Code):** What does it process?
- **Module 6 (HTTP):** Third Stash API call - endpoint, request format
- **Module 7 (Make Code):** Final output JSON structure
- **Module 8 (Webhook response):** Exact response JSON format returned

**Why:** Need this to call Stash API from the new form (Step 1: Address entry → Stash check)

**Reference:** See `SPECIFIC-MAKECOM-QUESTIONS.md` for complete module-by-module questions

---

### 2. GHL API Access
**Question:** How do we write to GHL Custom Objects from the new form?

**What I need:**
- **From "Property Review Approval Webhook - by Ahmad" scenario:**
  - Module 2 (Update Custom Object): What is the exact GHL API endpoint?
  - Module 2: What authentication method? (How is it configured in Make.com?)
  - Module 2: Request format for updating custom object?
- **From "GHL Property Review Submitted" scenario:**
  - Does it write to GHL? Which module?
  - Or does it only read from GHL?
- **Direct API access:**
  - API endpoint URL (e.g., `https://api.gohighlevel.com/v1/custom-objects/...`)
  - Authentication method (Bearer token? API key?)
  - Do we have API credentials/keys?

**Why:** New form needs to write property data to GHL Custom Objects

**Alternative:** Can we use Make.com webhook instead? (Write to Make.com → Make.com writes to GHL)

---

### 3. Google Sheets API Access
**Question:** Do we have Google Service Account credentials?

**What I need:**
- Service account email
- Credentials JSON file (or location)
- Confirmation that all sheets are shared with service account
- Test access to read/write

**Why:** Need to read Market Performance data and write logs

---

### 4. ChatGPT/UI Tool Integration
**Question:** How do we call the ChatGPT UI tools programmatically?

**What I need:**
- Is there an API endpoint for https://amenity-distance-app-a22o.vercel.app/?
- Or do we call ChatGPT API directly with custom GPT?
- Request format (address + amenity list?)
- Response format
- API credentials/keys

**Why:** Need to auto-populate "Why this property?", "Proximity", "Investment Highlights"

---

## 🟡 IMPORTANT - Should Answer Before Day 2-3

### 5. Form Submission Flow
**Question:** What's the preferred flow for form submission?

**From "GHL Property Review Submitted" scenario:**
- **Module 1 (Webhooks):** This receives webhook from GHL when custom object is created/changed
- **Question:** Should new form:
  - **Option A:** Form → GHL API (direct write to custom object) → GHL triggers Module 1 webhook → "GHL Property Review Submitted" runs
  - **Option B:** Form → Make.com webhook (new webhook?) → Make.com → GHL API → triggers Module 1 webhook
  - **Option C:** Form → Make.com webhook → Make.com writes to GHL → triggers Module 1 webhook

**Why:** Determines architecture of form submission

**Need to know:**
- Does "GHL Property Review Submitted" Module 1 webhook ONLY trigger from GHL custom object changes?
- Or can we call it directly from the form?
- What's the exact payload format Module 1 expects?

---

### 6. Packager/Sourcer Dropdowns
**Question:** How do we get the list of users for Packager/Sourcer dropdowns?

**What I need:**
- GHL API endpoint for users? (e.g., `/v1/users`)
- Or should we maintain a list in Google Sheets?
- Format: `{ "id": "123", "name": "John Doe", "email": "john@example.com" }`?

**Why:** Form needs dropdowns with full names and emails

---

### 7. Missing GHL Custom Fields
**Question:** Do these fields exist in GHL, or do we need to create them?

**Fields to check:**
- `rent_appraisal_primary_from` / `rent_appraisal_primary_to` (vs. existing `rent_appraisal_primary`)
- `rent_appraisal_secondary_from` / `rent_appraisal_secondary_to` (vs. existing `rent_appraisal_secondary`)
- `build_size` (for H&L & Projects)
- `lga` (for Investment Highlights lookup)
- `land_registration` (for H&L/Projects, replaces Year Built)
- Editing workflow fields (if implementing editing features)

**Why:** Requirements mention splitting some fields and adding new ones

---

### 8. Deal Sheet Google Sheet
**Question:** What's the Google Sheet ID/URL for the Deal Sheet?

**What I need:**
- Google Sheet ID or URL
- Tab name
- Column structure (especially "Status" column for two-way sync)
- Confirmation it exists and is accessible

**Why:** Need to write property data and sync Status field

---

## 🟢 NICE TO HAVE - Can Answer During Development

### 9. Email Template Details
**Question:** What's the exact email template structure from "GHL Property Review Submitted"?

**What I need:**
- Sample email output
- HTML structure
- Subject line format
- Recipient list

**Why:** New form should generate same format (or we can use existing Make.com scenario)

**Note:** Can reverse-engineer from existing Make.com scenario if needed

---

### 10. Error Handling & Logging
**Question:** What should happen when APIs fail?

**What I need:**
- Should form allow manual override?
- Should errors be logged to Google Sheet "Errors" tab?
- Should users be notified?

**Why:** Need error handling strategy

**Note:** Can implement basic error handling and refine later

---

## 📋 Quick Answers Needed

**Priority Order:**
1. **Make.com Stash webhook URL** (blocks Step 1 of form)
2. **GHL API access** (blocks form submission)
3. **Google Sheets API access** (blocks Market Performance lookup)
4. **ChatGPT/UI Tool API** (blocks auto-population)

**Can Start Building With:**
- Form structure (HTML/CSS/JS)
- Field definitions and validation
- Multi-step workflow UI
- Conditional logic (show/hide fields)

**Cannot Build Without:**
- API integrations (Stash, GHL, Google Sheets, ChatGPT)
- Form submission endpoint

---

## Recommendation

**Start building form structure NOW** while getting answers to questions 1-4.

**Day 1 can include:**
- Form HTML/CSS/JS structure
- Multi-step workflow UI
- Field definitions and validation rules
- Conditional visibility logic
- Mock API calls (will replace with real APIs once we have credentials)

**Day 2-3 can include:**
- Real API integrations (once we have credentials)
- Form submission logic
- Error handling

This way we're not blocked waiting for answers!

