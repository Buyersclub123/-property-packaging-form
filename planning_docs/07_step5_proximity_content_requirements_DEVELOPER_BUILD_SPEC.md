# 07 - Step 5 Proximity & Content Requirements - DEVELOPER BUILD SPEC

**Page:** Step 5 (Proximity & Content)  
**Components:** 3 main sections (Proximity Tool, Why This Property, Investment Highlights)

---

## 1. PROXIMITY TOOL SECTION

### 1.1 Automation Logic

**Trigger:**
- Start proximity calculation when user completes Page 1 (Address field)
- Run in background while user progresses through Steps 2-4
- Results should be ready by the time user reaches Step 5

**Technical Implementation:**
- Reuse logic from `test-all-categories` endpoint
- Uses Google Places API + Distance Matrix API
- Source address: `formData.address` from Page 1

**Loading State:**
- If user arrives at Step 5 before calculation completes: Show "Calculating..." spinner

### 1.2 UI Components

**Component 1: Address Display (Read-only)**
- Display text: `"Amenities calculated for: [Address]"`
- Shows the address used for the proximity calculation
- Position: Top of section

**Component 2: Address Override**
- Label: `"Use different address for proximity calculation"`
- Input field: Text input for alternate address
- Button: `"Update & Rerun"`
- Purpose: Allows recalculation with different address if needed

**Component 3: Results Display**
- Field type: Growing/expandable text area
- Pre-populated with auto-generated proximity list
- **Must be fully editable:** User can add/delete/modify lines
- Output format: `"• [DISTANCE] km ([TIME] mins), [AMENITY NAME]"`
- Example: `"• 2.3 km (5 mins), Westfield Shopping Centre"`

**Component 4: Error Handling**
- Trigger: If Google Maps API fails
- Display: Friendly, obvious error message
- Error text: `"Google Maps could not be accessed to perform the check. Please calculate manually via Chat GPT and the amenity tool, then paste the results below."`
- Fallback: Provide empty text area for manual paste

**Remove:**
- Static instruction text: `"List nearby amenities with distance and travel time. Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]""`

---

## 2. "WHY THIS PROPERTY" SECTION

### 2.1 Automation Logic

**Trigger:**
- Auto-generate content via AI API when Step 5 loads
- Use property address/suburb from `formData.address`

**Technical Implementation:**
- Backend endpoint: `/api/generate-content/why-property`
- AI Service: OpenAI or Google Gemini API
- API Key: User will configure in `.env` (both dev and production)
- Prompt format: `"You are a real estate investment summary tool... for [Suburb/LGA]..."`
- Expected output: 7 bullet points

**Output Format:**
```
* **Heading** - Description
* **Heading** - Description
[...7 total]
```

### 2.2 UI Components

**Component 1: Auto-Generated Content Area**
- Field type: Growing text area
- Pre-populated with AI-generated content
- **Must be fully editable**

**Component 2: Regenerate Button**
- Button: `"Regenerate"`
- Action: Re-run AI query
- Purpose: Allow user to get new content if unsatisfied with first result

**Component 3: Error Handling**
- Trigger: If AI API fails
- Display: Friendly error message
- Error text: `"The AI service could not be reached. Please generate content manually via Chat GPT and paste the results below."`
- Fallback: Provide text area for manual paste

### 2.3 Technical Notes
- User will handle API integration setup with Chat GPT
- Developer focuses on frontend structure and backend endpoint setup
- API key configuration is user's responsibility

---

## 3. INVESTMENT HIGHLIGHTS SECTION (Hotspotting Reports)

### 3.1 Google Sheet Structure

**New Sheet Required** with the following columns:

| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | LGA | Text | Comma-separated list of suburbs (e.g., "Belmont, Redcliffe, Clontarf") |
| B | State | Text | State code (QLD, NSW, VIC, etc.) |
| C | Report Name | Text | Display name (e.g., "Belmont LGA") |
| D | Valid From | Date | Report validity start date |
| E | Valid To | Date | Report validity end date |
| F | Content | Text | Main body content (7 bullet points) |
| G | Extra Info | Text | Additional user notes |

**Key Design Decision:**
- Use comma-separated suburbs in Column A to avoid duplicate rows
- One report can apply to multiple suburbs

### 3.2 Workflow Logic

**Step 1: On Page Load**
- Extract Suburb/LGA from `formData.address.lga`
- Extract State from `formData.address.state`
- Query Google Sheet for matching record (check if current suburb exists in Column A)

**Step 2: If Match Found**
- Populate "Main Body" field with Column F content
- Populate "Extra Info" field with Column G content
- Display report name (Column C) as read-only label
- Display validity dates (Columns D & E) as read-only label
- Allow editing of populated content
- Show "Save Changes" button (if content is edited)

**Step 3: If No Match Found**
- Display message: `"No report found for [Suburb]"`
- Show two options:

**Option 1: Select Existing Report**
- Dropdown showing all available reports (from Column C)
- Filter by State if possible
- On selection:
  - Populate Main Body and Extra Info fields
  - Prompt: `"Link this report to [Current Suburb]?"`
  - If yes: Append current suburb to Column A (comma-separated)
- Button: `"Use This Report"`

**Option 2: Create New Report**
- Paste area for Main Body content
- Input field: Report Name
- Date pickers: Valid From, Valid To
- Text area: Extra Info
- Input field: Suburbs this report applies to (comma-separated or multi-select)
- Button: `"Save New Report"`
- Action: Creates new row in Google Sheet

**Step 4: Save Logic**
- If using existing report: Update Column A to include current suburb (append to comma-separated list)
- If creating new report: Insert new row with all details
- **Critical:** Avoid duplicate rows by always using comma-separated suburbs in Column A

### 3.3 UI Components

**View 1: Match Found**
```
[Report Name] (read-only label)
Valid: [Valid From] - [Valid To] (read-only label)

Main Body: [editable text area, pre-populated]

Extra Info: [editable text area, pre-populated]

[Save Changes] (button, shown if edited)
```

**View 2: No Match**
```
No report found for [Suburb]

--- Option 1: Select Existing Report ---
Select existing report: [Dropdown]
[Use This Report] (button)

--- Option 2: Create New Report ---
Report Name: [input field]
Valid From: [date picker]
Valid To: [date picker]
Main Body: [paste area]
Extra Info: [text area]
Suburbs: [comma-separated input or multi-select]
[Save New Report] (button)
```

### 3.4 API Endpoints Required

- `GET /api/investment-highlights/lookup?lga=[LGA]&state=[STATE]` - Lookup report by suburb/state
- `GET /api/investment-highlights/list` - Get all reports for dropdown
- `POST /api/investment-highlights/link` - Link existing report to new suburb
- `POST /api/investment-highlights/create` - Create new report

---

## 4. CROSS-CUTTING REQUIREMENTS

### 4.1 Universal Principles
1. **All sections have fallback:** If automation fails, user can manually paste content
2. **All content is editable:** Even auto-generated/auto-populated content can be modified
3. **Growing text areas:** All text fields must expand with content
4. **Background processing:** Proximity calculation starts when Page 1 completes

### 4.2 Data Storage
- All Step 5 data stores in `formData.contentSections.proximity` (or similar structure)
- Maintain separation between:
  - Proximity data
  - Why This Property data
  - Investment Highlights data

### 4.3 Error Handling Pattern
All three sections follow the same pattern:
1. Attempt automation
2. If success: Pre-populate fields (editable)
3. If failure: Show friendly error message + provide manual paste option
4. Never block user from proceeding

---

## 5. UNRESOLVED / AMBIGUOUS ITEMS

### 5.1 Technical Clarifications Needed
1. **Proximity API:** Confirm exact endpoint structure from `test-all-categories` to reuse
2. **AI Prompt:** User will provide exact prompt text for "Why This Property" AI generation
3. **Google Sheet Name:** What should the new Investment Highlights sheet be named?
4. **State Filtering:** Should Investment Highlights dropdown filter by state automatically, or show all reports?

### 5.2 UX Clarifications Needed
1. **Loading Indicators:** Should all three sections show loading states simultaneously, or sequentially?
2. **Save Behavior:** Should edits auto-save, or require explicit "Save" button click?
3. **Validation:** Are any fields required before user can proceed to next step?

### 5.3 Data Structure Questions
1. **Form Data Path:** Confirm exact path structure for storing Step 5 data in `formData`
2. **Report Linking:** When linking existing report to new suburb, should user confirm before saving?

---

## 6. TECHNICAL NOTES

- **Existing Code:** Proximity logic exists at `http://localhost:3000/test-all-categories`
- **API Keys:** User manages `.env` configuration for AI services
- **Google Sheets:** Existing integration pattern should be followed for new Investment Highlights sheet
- **Component Structure:** Create separate components for each section (ProximitySection, WhyPropertySection, InvestmentHighlightsSection)

---

**End of Build Spec**
