# 07 - Step 5 Proximity & Content Requirements

_Section from planning session transcript: Lines 2000-2450_

This section documents the agreed requirements for Step 5 (Proximity & Content), including automation, AI integration, and the Investment Highlights/Hotspotting feature.

---

## Step 5 Overview

**User Context:**

I have not told you what I want to do the fields yet, so let me finisg that and we can come back to it: For Page 5 Proximity Tool – the auto proximity functionality of this works now, so it can be built into this. Since we know the address from page 1, once they press continue with packaging this page can start its process so by the time they get here it has already populated

I think we need to do one thing:  Have a field confirming the address which was used to calculate the times / distances immediately above it which would have been the address they user first entered on page 1– With the option to change the address and run it again (so a separate field would be needed for this with a button. 

If the response comes back saying it could not access GoogleMaps (which the system is coded to do I believe) there needs to be a friendly but obvious note to the user saying Google Maps could not be accessed to perform the check so they must to it manually via Chat GPT and the amenity tool  - SO if the automation fails the user nmust be able to paste in the values we need to use for packaging the property

Also if the field can grow with the list as the human will need to review the list and make edits (so they must be able to delete / add values. 

We don't need the text above the box (shown below), it can be removed
List nearby amenities with distance and travel time.
Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]"

---

## Section A: Proximity Tool

### Automation

**Cursor Understanding:**

**Revised Step 5: Proximity Requirement**

**Automation:**
-   **Trigger:** Auto-starts once Page 1 (Address) is completed (likely running in background or on mount of Step 5 if not earlier).
-   **Logic:** Uses `test-all-categories` logic (Places API + Distance Matrix).
-   **Fallback:** If automation fails (or "Google Maps could not be accessed"), show friendly error + manual paste input.

**UI Changes:**
1.  **Address Confirmation:** Display "Amenities calculated for: [Address]" at the top.
2.  **Retry/Change Address:** Input field + "Update & Rerun" button to change the address used for proximity *only*.
3.  **Result List:**
    -   **Editable:** The list must be editable (add/delete/edit lines).
    -   **Format:** The automation generates the list, but user can tweak it.
    -   **Field Height:** Dynamic/Growing text area or list component.
4.  **Cleanup:** Remove the static instruction text ("List nearby amenities...").

**Question:**
The automation logic exists in `test-all-categories`. I will port this into the new `ProximitySection` component.
Does the user need to *see* the "loading" state if they arrive at Step 5 quickly? Or should we just show "Calculating..." if it's not ready?
(Assuming "Calculating..." spinner/text is sufficient).

**User:** "Calculating..." if it's not ready? (Assuming "Calculating..." spinner/text is sufficient). is fine

**Confirmation:** ✅ Approved

### Detailed Requirements

**Background Processing:**
- Start proximity calculation when user completes Page 1 (Address)
- Run in background so results are ready by time user reaches Step 5
- If not ready when user arrives at Step 5, show "Calculating..." spinner

**UI Components:**

1. **Address Display (Read-only):**
   - "Amenities calculated for: [Address]"
   - Shows the address used for proximity calculation

2. **Address Override Section:**
   - Label: "Use different address for proximity calculation"
   - Input field for alternate address
   - Button: "Update & Rerun"
   - Purpose: Allow user to recalculate with different address if needed

3. **Results Display:**
   - Growing/expandable text area
   - Pre-populated with auto-generated proximity list
   - Fully editable (add/delete/modify lines)
   - Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]"

4. **Error Handling:**
   - If Google Maps API fails:
     - Show friendly, obvious error message
     - Message: "Google Maps could not be accessed to perform the check. Please calculate manually via Chat GPT and the amenity tool, then paste the results below."
     - Provide empty text area for manual paste

5. **Remove:**
   - Static instruction text above the field

**Status:** Reuse logic from `http://localhost:3000/test-all-categories`

---

## Section B: "Why This Property" (AI-Generated Content)

### User Requirements

**User:**

Page 5 Why This property
For this field we currently use CHAT GPT to google and find reasons for the property. We can create an API to do this, (See info below about API the API, I can get the specific rules from CHATGPOT ON how to recreate what it gets. 
This field should grow with the text so the human csn review and edit as needed.
IF the technology fails there needs to be a friendly note stating the necessary resource can not be reached to they user will need to follow the manual process via Chat GPT, and it they do do this it means they must be able to paste the values into the field they want to used for the property package

[...API details provided...]

**Cursor Understanding:**

**Revised Step 5: "Why This Property" Requirement**

**Automation:**
-   **Trigger:** Auto-generated via API (OpenAI or Gemini) using the property address/suburb.
-   **Output:** 7 bullet points in the format: `* **Heading** - Description`.
-   **Logic:**
    -   Backend API endpoint (e.g., `/api/generate-content/why-property`).
    -   Prompt: "You are a real estate investment summary tool... for [Suburb]...".
-   **Fallback:** Friendly error + Manual paste input.

**UI Changes:**
-   **Growing Text Area:** Similar to Proximity list, allows editing/pasting.
-   **Regenerate Button:** Option to re-run the AI query.

**Question:**
Do you have an OpenAI or Gemini API key available in your `.env`? Or should we mock this for now / use a placeholder?
(I can set up the structure and the backend route, but it will need a key to work).

**User:** We have a login availanble so we can create this now to see if it works

**User:** .env alredy exsits so I can add the appropriate value in both dev and Productioon,. I will work woth CHSYT GOT to set yp the API. you csn focus on planing the other stuff. I am about to give you notes on Why this property for Page 5, give ,e a few minutes and then thats the last thing we need to do

**Confirmation:** ✅ Approved - User will set up API key

### Detailed Requirements

**AI Integration:**
- Backend API endpoint: `/api/generate-content/why-property`
- Use OpenAI or Google Gemini API
- Prompt format: "You are a real estate investment summary tool... for [Suburb/LGA]..."
- Expected output: 7 bullet points with headings and descriptions

**UI Components:**

1. **Auto-Generated Content Area:**
   - Growing text area
   - Pre-populated with AI-generated content
   - Fully editable

2. **Regenerate Button:**
   - Allow user to re-run AI query
   - Useful if first result isn't satisfactory

3. **Error Handling:**
   - If API fails:
     - Show friendly error message
     - Message: "The AI service could not be reached. Please generate content manually via Chat GPT and paste the results below."
     - Provide text area for manual paste

4. **Format:**
   - 7 bullet points
   - Format: `* **Heading** - Description`

**API Setup:**
- User will configure API key in `.env`
- User will work with Chat GPT to set up API integration
- Developer focuses on frontend structure and backend endpoint setup

---

## Section C: Investment Highlights (Hotspotting Report)

### User Requirements

**User Context:**

For Investment Highlights, I want to explain what I want to do. At the moment we use a tool called "Hotspotting" which provides reports for LGA's (Local government areas) which are suburbs. The report is a word document which has a main body, and then some extra information. I want to create a google sheet which has the following columns: A/ LGA (Key), B/ State (Key), C/ Report Name (i.e Belmont LGA), D/ Valid From (Date), E/ Valid To (Date), F/ Content (Main Body), G/ Extra Info (User notes). The logic would be, we check the suburb / LGA to see if there is a match, if there is a match we populate Main Body and Extra Info. If there is no match we give the user 2 options: 1/ They can select a report from a dropdown which shows the reports available, 2/ They can create a new report by pasting in the Main Body, entering the Report Name, Valid From, Valid To. When they save the report we need to ask them which Suburbs the report is for (as some reports are used for multiple suburbs), and we save the report with a comma separated list of suburbs in the LGA column. This way we don't have duplicate rows for the same report.

**Cursor Understanding:**

**Revised Step 5: Investment Highlights Requirement**

**Automation:**
-   **Trigger:** Check Google Sheet for matching LGA/Suburb.
-   **Logic:**
    -   **Match Found:** Populate Main Body & Extra Info from sheet.
    -   **No Match:** Show dropdown of available reports OR allow user to create new.

**Sheet Structure (New Sheet):**
-   **Column A:** LGA (Key) - Comma-separated list of suburbs this report applies to.
-   **Column B:** State (Key).
-   **Column C:** Report Name (e.g., "Belmont LGA").
-   **Column D:** Valid From (Date).
-   **Column E:** Valid To (Date).
-   **Column F:** Content (Main Body - 7 points).
-   **Column G:** Extra Info (User notes).

**Workflow:**
1.  **Match:** Check Suburb/LGA in Sheet.
2.  **Found:** Populate Main Body & Extra Info.
3.  **Not Found:**
    -   Show Dropdown of available reports.
    -   OR User pastes new text (ChatGPT output) + Enters Report Name/Dates.
4.  **Save:** Prompt to save changes/new entries back to the Sheet (linking Suburb/LGA).
5.  **Note:** Store comma-separated list of Suburbs the report is used for (to avoid duplicate rows).

**Confirmation:** ✅ Approved

### Detailed Requirements

**Google Sheet Structure:**

| Column | Name | Type | Purpose |
|--------|------|------|---------|
| A | LGA | Text | Comma-separated list of suburbs (e.g., "Belmont, Redcliffe, Clontarf") |
| B | State | Text | State code (QLD, NSW, etc.) |
| C | Report Name | Text | Display name (e.g., "Belmont LGA") |
| D | Valid From | Date | Report validity start date |
| E | Valid To | Date | Report validity end date |
| F | Content | Text | Main body (7 bullet points) |
| G | Extra Info | Text | Additional user notes |

**Workflow Logic:**

1. **On Page Load:**
   - Extract Suburb/LGA from `formData.address.lga`
   - Extract State from `formData.address.state`
   - Query Google Sheet for matching record

2. **If Match Found:**
   - Populate "Main Body" field with Column F content
   - Populate "Extra Info" field with Column G content
   - Show report name and validity dates (read-only)
   - Allow editing of populated content

3. **If No Match:**
   - Show two options:
     
     **Option 1: Select Existing Report**
     - Dropdown showing all available reports (Column C)
     - Filter by State if possible
     - On selection, populate Main Body and Extra Info
     - Prompt: "Link this report to [Current Suburb]?"
     - If yes, append current suburb to Column A (comma-separated)
     
     **Option 2: Create New Report**
     - Paste area for Main Body content
     - Input field for Report Name
     - Date pickers for Valid From and Valid To
     - Text area for Extra Info
     - Multi-select or text input for Suburbs this report applies to
     - Save button creates new row in sheet

4. **Save Logic:**
   - If using existing report: Update Column A to include current suburb
   - If creating new report: Insert new row with all details
   - Avoid duplicate rows by using comma-separated suburbs in Column A

**UI Components:**

1. **Match Found View:**
   - Report Name (read-only label)
   - Valid From - Valid To (read-only label)
   - Main Body (editable text area, pre-populated)
   - Extra Info (editable text area, pre-populated)
   - "Save Changes" button (if edited)

2. **No Match View:**
   - Message: "No report found for [Suburb]"
   - **Option 1 Section:**
     - Label: "Select existing report"
     - Dropdown of available reports
     - "Use This Report" button
   - **Option 2 Section:**
     - Label: "Create new report"
     - Paste area for Main Body
     - Input: Report Name
     - Date pickers: Valid From, Valid To
     - Text area: Extra Info
     - Input: Suburbs (comma-separated or multi-select)
     - "Save New Report" button

**API Endpoints:**

- `GET /api/investment-highlights/lookup?lga=[LGA]&state=[STATE]`
- `GET /api/investment-highlights/list` (for dropdown)
- `POST /api/investment-highlights/link` (link existing report to new suburb)
- `POST /api/investment-highlights/create` (create new report)

---

## Summary: Step 5 Components

### 1. Proximity Section
- Auto-run proximity calculation
- Display results with address confirmation
- Allow address override and rerun
- Editable results list
- Error handling with manual paste option

### 2. "Why This Property" Section
- AI-generated content (OpenAI/Gemini)
- 7 bullet points format
- Regenerate option
- Fully editable
- Error handling with manual paste option

### 3. Investment Highlights Section
- Google Sheet-based hotspotting reports
- Auto-lookup by LGA/Suburb
- Select existing or create new report
- Link reports to multiple suburbs
- Editable content with save functionality

### 4. Tenancy Section
- (Existing functionality - not detailed in this transcript)

---

## Key Decisions

1. **All sections have fallback:** If automation fails, user can manually paste content
2. **All content is editable:** Even auto-generated/auto-populated content can be modified
3. **Background processing:** Proximity calculation starts early to be ready when user arrives
4. **API integration:** User will configure API keys for AI services
5. **Google Sheet integration:** New sheet for Investment Highlights/Hotspotting reports
6. **No duplicate reports:** Use comma-separated suburbs in single row

---
