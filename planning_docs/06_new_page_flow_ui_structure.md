# 06 - New Page Flow & UI Structure

_Section from planning session transcript: Lines 1900-2200_

This section documents the agreed restructuring of the form pages (Steps 6-8) to accommodate the new Washington Brown Calculator and Cashflow Review functionality.

---

## Original Context

**User**

No, we hae other things to discuss first, let me give you some information: Lets ,e give this to yuo a moment, while I make notes about Page 5: Thinking about the layout with the extra pages: 

Slide 6 becomes the Washing Brown Calculator, so this is what we see on the Washington Brown Calculator tab in http://localhost:3000/test-sheets-population

Slide 7 becomes the Cashflow Spreadsheet Review and Input file so the tab Sheets Population in the same URL would be edited to show the fields we discussed, and I think the field order should be as they are in the cashflow spreadsheet mapping list – & the create folder button of course already exists

Slide 8 becomes the Pre-Submission Checklist, Attachments Additional Dialogue (Optional) & Message for BA (Optional) with the Submit Property button Underneath

We then need a friendly message once the property has been submitted to confirm it has been submitted – Is there anyway to confirm the Packager email has been sent, or do we have a friendly message which tells the packager they need to review the property and approve it by pressing the approve button in the email they will receive.

---

## Revised Page Flow

**Cursor Understanding:**

**Revised Page Flow & UI Plan:**

Thank you for the detailed layout. This changes the structure significantly.

**New Flow:**
-   **Step 1-5:** Existing Steps (Address, Decision Tree, etc.).
-   **Step 6: Washington Brown Calculator**
    -   Paste Text Area.
    -   Result Parsing (Prime Cost/Diminishing Value).
    -   Displays the parsed values (for review).
-   **Step 7: Cashflow Review & Folder Creation**
    -   Displays ALL fields mapped to the Google Sheet (in Sheet order).
    -   Editable fields: Rates, Insurance, Build Window, Cashback 1/2m, etc.
    -   "Create Folder" button (Executes the folder creation & sheet population).
    -   *Logic Check:* Folder Creation happens *before* submission? Or is this just "Review" and creation happens at the end?
    -   *Correction based on your text:* "Slide 7 becomes the Cashflow Spreadsheet Review... & the create folder button". So Folder Creation happens here.
-   **Step 8: Submission & Checklist**
    -   Pre-submission Checklist.
    -   Attachments.
    -   Additional Dialogue / Message for BA.
    -   "Submit Property" button (Triggers GHL / Email).

**Success Message:**
-   After "Submit Property", show a "Success" screen.
-   **Message:** "Property Submitted Successfully. Please check your email to approve the property submission." (Or similar friendly instruction).

**Question:**
Does "Create Folder" (Step 7) happen *independently* of "Submit Property" (Step 8)?
-   i.e., The user creates the folder/sheet first, checks it, and THEN goes to Step 8 to submit to GHL?
-   OR does "Submit Property" do everything? (Your description implies Step 7 has a "Create Folder" button, so I assume it's independent).

Please confirm: **Is Folder Creation (Step 7) a separate user action before the final Submission (Step 8)?**

**User Confirmation:**

Question:
Does "Create Folder" (Step 7) happen independently of "Submit Property" (Step 8)? **YES OTHER WISE THEY CANNOT REVIEW THE CONTENTS OF THE FODLER BEFORE IT IS SUBMITTED**

i.e., The user creates the folder/sheet first, checks it, and THEN goes to Step 8 to submit to GHL? **YES**

OR does "Submit Property" do everything? (Your description implies Step 7 has a "Create Folder" button, so I assume it's independent).

Please confirm: Is Folder Creation (Step 7) a separate user action before the final Submission (Step 8)? **YEHS FODLER CREATION IS SEPERATE**

**Confirmation:** ✅ Approved - Folder Creation is separate from Submission

---

## Detailed Page Breakdown

### Step 6: Washington Brown Calculator

**Purpose:** Parse depreciation values from Washington Brown website output

**UI Components:**
1. **Paste Text Area:** Large textarea for pasting Washington Brown output
2. **Parse Button:** Trigger parsing of pasted text
3. **Results Display:** Show parsed values in individual fields
4. **Editable Fields:** 10 fields for Year 1-10 depreciation values

**Logic:**
- Parse pasted text looking for "Year X" rows
- Extract "DIMINISHING VALUE" column (preferred over Prime Cost)
- Populate 10 editable fields
- Allow manual editing of auto-populated values

**Example Input Format:**
```
YEARS	DIMINISHING VALUE	PRIME COST
Year 1	$11,000	$7,000
Year 2	$8,000	$7,000
[...etc...]
```

**Status:** Reuse existing logic from `http://localhost:3000/test-sheets-population` Washington Brown Calculator tab

---

### Step 7: Cashflow Spreadsheet Review & Folder Creation

**Purpose:** Display all fields that will be written to the cashflow spreadsheet, allow editing, and create the folder

**UI Components:**

1. **Field Display Grid:**
   - Display ALL fields in the order they appear in the cashflow spreadsheet
   - Read-only fields (auto-calculated from earlier steps)
   - Editable fields (new inputs like Rates, Insurance, Build Window, etc.)

2. **Field Categories:**
   
   **Read-Only (Auto-calculated):**
   - Address (with Lot/Unit)
   - State
   - Land Cost
   - Build Cost
   - Total Cost
   - Cashback Value
   - Total Bed/Bath/Garage
   - Low Rent / High Rent
   - Insurance Label (based on Title Type)
   - P&B / PCI Label (based on Property Type)
   
   **Editable:**
   - Council/Water Rates $
   - Insurance $ (or Annualized Body Corp + Insurance $ if Strata)
   - Depreciation Year 1-10 (from Step 6)
   - Build Window (dropdown: 09/12/15/18 mo)
   - Cashback 1 month (dropdown: 1-18)
   - Cashback 2 month (dropdown: 1-18)

3. **Insurance Section (Conditional UI):**
   - **If NOT Strata:** Single editable "Insurance $" field
   - **If Strata:** 
     - "Annualized Body Corp" (read-only, calculated)
     - "Insurance $" (editable)
     - "Total" (read-only, sum of above two)

4. **Action Button:**
   - "Create Folder" button
   - Executes folder creation & sheet population
   - User can review folder contents before proceeding to Step 8

**Layout:** Fields in same order as cashflow spreadsheet mapping list

**Status:** Adapt from `http://localhost:3000/test-sheets-population` Sheets Population tab

---

### Step 8: Pre-Submission Checklist & Final Submission

**Purpose:** Final checks and submission to GHL/Make.com

**UI Components:**

1. **Pre-Submission Checklist:**
   - Existing checklist items
   - User must check off items before submitting

2. **Attachments:**
   - File upload or attachment management
   - (Existing functionality)

3. **Additional Dialogue (Optional):**
   - Optional text field for additional notes

4. **Message for BA (Optional):**
   - Optional text field for message to Business Analyst

5. **Action Button:**
   - "Submit Property" button
   - Triggers GHL webhook
   - Triggers Make.com integration
   - Sends packager email

6. **Success Screen:**
   - Friendly confirmation message
   - Instructions for next steps
   - Message: "Property Submitted Successfully. Please check your email to approve the property submission." (or similar)

**Status:** Existing Step 6 functionality, restructured as Step 8

---

## Workflow Sequence

```
Step 1: Address & Risk Check
Step 2: Decision Tree
Step 3: Property Details
Step 4: Market Performance
Step 5: Proximity & Content
    ↓
Step 6: Washington Brown Calculator
    - Paste depreciation data
    - Parse values
    - Review/edit 10 year breakdown
    ↓
Step 7: Cashflow Review & Folder Creation
    - Review all mapped fields
    - Edit new fields (Rates, Insurance, etc.)
    - Click "Create Folder"
    - Review folder contents in Google Drive
    ↓
Step 8: Pre-Submission Checklist & Submission
    - Complete checklist
    - Add attachments
    - Optional notes/messages
    - Click "Submit Property"
    - Success message displayed
```

---

## Key Decisions

1. **Folder Creation is Separate:** User creates folder in Step 7, reviews it, then proceeds to Step 8 for final submission

2. **Field Order:** Step 7 displays fields in the same order as the cashflow spreadsheet mapping list

3. **Two-Phase Process:** 
   - Phase 1 (Step 7): Create & populate folder
   - Phase 2 (Step 8): Submit to GHL/Make.com

4. **Review Opportunity:** User can review folder contents between creation and submission

5. **Success Messaging:** Friendly confirmation with instructions after submission

---
