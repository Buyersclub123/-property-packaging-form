# 04 - Google Sheets Field Mapping Logic - Part 2: New Fields (Rows 14-27)

_Section from planning session transcript: Lines 800-1700_

This section documents the agreed logic for mapping new fields to the Google Sheets cashflow spreadsheet (rows 14-27).

---

## Key Decision: Consistent Mapping Method

**User Concern:**

To be called "Council/Water Rates" in the UI. I feel like the logic for mapping to the casfhlow sheets is not consistent. for this one you are saying map to cell 14 where as the others were not done ny cell referance, I think we need to be consistent. I have deleted the value which was in row 13 which means this fielld would not be cell 13. So what mapping rules are we using as we cannot do different things?

**Cursor Response:**

You raise a valid point about consistency.

**Current Inconsistency:**
-   **Rows 1-13 (Existing Logic):** Uses "Keyword Matching" (e.g., find row with "Address" in Column A -> Write to Column B of that row). This is resilient to row insertions/deletions.
-   **Rows 14-27 (My Previous Proposal):** Used "Direct Cell Addressing" (e.g., write to B14). This breaks if rows change (like your deletion of row 13).

**Proposed Consistent Logic:**
We should use **Keyword Matching** for *all* fields to maintain robustness.

**User:** Yes but I still want to go through each one

**Confirmation:** Approved - Keyword Matching method for all fields

---

## Field-by-Field Logic Review (New Fields)

### Field 13: Council/Water Rates $

**Cursor**

**Logic for "Council/Water Rates $" Field (Final Confirmation)**

**Source:**
-   **Review Page:** Editable numeric field labeled **"Council/Water Rates $"**.
-   **Storage:** `formData.rates`.
-   **GHL Sync:** **NONE**. This field exists only in the form state for the purpose of generating the sheet. It is **NOT** sent to GHL.

**Sheet Mapping:**
-   **Search:** Find row with text **"Council/Water Rates $"** in Column A.
-   **Write:** Value from `formData.rates` into Column B.

**User:** yes

**User Follow-up:** Apologies, we do not need to create a field in GHL for Council/Water Rates $, please can you update the rule for that

**Cursor:** Revised - No GHL field needed

**User:** Correct, I havedeleted the field in GHL accordingly. Thank you

**Confirmation:** ✅ Approved (Form Only, No GHL Sync)

---

### Field 14: Insurance or Insurance & Strata Field (Label)

**Initial Proposal (Rejected):**

**Cursor Initial:**
-   **Source:** `formData.propertyDescription.bodyCorpPerQuarter`.
-   **Logic:**
    -   If `bodyCorpPerQuarter` has a value (is not empty/0) -> **"Insurance & Strata"**.
    -   Otherwise -> **"Insurance"**.

**User Rejection:**

NO thats lazy coding (not done by you), "Title" types which can attract Strata costs are: Strata, Owner corp (Community), Survey Strata, Built Strata (pleae verify values in the drop down in fhe form so the code is corerect), so when Title type is one of these, the value should be Insurance & Strata in the field Insurance or Insurance & Strata Field, otherwise it would be Insurance. THIS IS FOR ROW 14, lets discuss ROW 15 seperately

**Revised Logic (Approved):**

**Cursor (After Code Verification):**

**Found Title Dropdown Options:**
-   `individual` -> "Individual"
-   `torrens` -> "Torrens"
-   `green` -> "Green"
-   `strata` -> "Strata"
-   `owners_corp_community` -> "Owners Corp (Community)"
-   `survey_strata` -> "Survey Strata"
-   `built_strata` -> "Built Strata"
-   `tbc` -> "TBC"

**Logic for Row 14: "Insurance or Insurance & Strata Field" (Label)**

**Source:**
-   **Title Type:** `formData.propertyDescription.title` (Page 3).

**Mapping Logic:**
1.  **Check Title Type:**
    -   Is the Title one of: `strata`, `owners_corp_community`, `survey_strata`, `built_strata`?
2.  **If YES (It is Strata):**
    -   Set label to **"Insurance & Strata"**.
3.  **If NO (It is NOT Strata):**
    -   Set label to **"Insurance"**.
4.  **Target:** Write this label to the row in the sheet matching "Insurance or Insurance & Strata Field".

**User:** Yes

**Confirmation:** ✅ Approved (Based on Title Type, not Body Corp)

---

### Field 15: Insurance or Insurance & Strata $ (Value)

**User UI Requirements:**

I'll explain it to see if we are on the same page. If it is just Insurance in field "Insurance or Insurance & Strata Field" then we need an editable cell called "Insurance $", and this value would be sent to thecashflow sheet.  if it is "Insurance & Strata" in field "Insurance or Insurance & Strata Field" we need the "Body Corp Per Quarter ($)" field showing an annulised amount, next the the edibable "Insurance" field, with another "Total" field which shows the sum of the 2 fields, and it would be this value that is sent to the csdhflow sheet

**Cursor Understanding:**

**Review Page UI Logic:**

1.  **Check Title Type (Background):**
    -   If Strata/Community -> **Mode: "Insurance & Strata"**.
    -   Else -> **Mode: "Insurance Only"**.

2.  **UI Display - Mode: "Insurance Only"**
    -   **Field 1:** "Insurance $" (Editable).
    -   **Output to Sheet:** Value of Field 1.

3.  **UI Display - Mode: "Insurance & Strata"**
    -   **Field 1:** "Annualised Body Corp" (Read-only, calculated as `bodyCorpPerQuarter * 4`).
    -   **Field 2:** "Insurance $" (Editable).
    -   **Field 3:** "Total" (Read-only, calculated as `Field 1 + Field 2`).
    -   **Output to Sheet:** Value of Field 3 (Total).

**Sheet Mapping:**
-   Write the **Output** value (from above) to the row matching **"Insurance or Insurance & Strata $"**.

**GHL Sync:** No, we do not need to push this data to GHL

**User:** Yes, and no we do not need to push this data to GHL

**Confirmation:** ✅ Approved (Form Only, No GHL Sync, Complex UI Logic)

---

### Field 16: P&B / PCI

**Cursor**

**Logic for "P&B / PCI" Field**

**Source:**
-   **Property Type:** `formData.decisionTree.propertyType` (Page 2).

**Mapping Logic:**
1.  **Check Property Type:**
    -   **If New:** Value = **"P&B + PCI Reports"**.
    -   **If Established:** Value = **"Pest & Build (P&B) report"**.
2.  **Target:** Write this text string to the row in the sheet matching **"P&B / PCI"**.

*Note: This is a label/text field in the sheet, not a value.*

**User:** Yes

**Confirmation:** ✅ Approved

---

### Fields 17-26: Depreciation Year 1-10

**Initial Proposal:**

**Cursor**

**Logic for Depreciation Fields (Y1 - Y10)**

**Source:**
-   **Review Page:** Editable fields for Years 1-10.
-   **Storage:** `formData.depreciation.year1` through `formData.depreciation.year10`.

**Mapping Logic:**
1.  **Iterate:** For Years 1 to 10.
2.  **Search Logic:** Search Column A for text containing **"Depreciation Year X"** (where X is 1-10).
3.  **Write Logic:** Write the corresponding value (`formData.depreciation.yearX`) to Column B.

**User Requirement (Washington Brown Integration):**

For this, at the monment on the Washington Brown Calculator tab in the http://localhost:3000/test-sheets-population URL, there is a field we paste the output from WashingBrown website into as one big copy paste, the tool the pulls out the values from the text we paste in. And presents it into to the individual cells you see in the screen shot. The Wshing Brown Calculator will provide eitehr Prime cost values for Diminishing Value and Prime cost values. IF we are presented with Diminishing values and Prime costs we would also utilise the Diminishing value values, Iwill pasty an example of what the data looks like that we paste into the box you can see in th screen shot called "Paste Results Table" So whilst it populates the values in the ceslls you see on the screenshot, I think it would be beneficial to have additional cells on the review page we talkedk about, which can be autopopulated from the table you see in the screen shot, but which are also editable, as the Calculator will not always be able to provide values to us. And we might want to edit what it hsa goovenm us. 

**Example Washington Brown Output:**
```
SHOW FULL 10 YEAR BREAKDOWN
down arrow icon
Estimated Results
YEARS	DIMINISHING VALUE	PRIME COST
Year 1	$11,000	$7,000
Year 2	$8,000	$7,000
Year 3	$7,000	$7,000
Year 4	$6,000	$7,000
Year 5	$6,000	$7,000
Year 6	$6,000	$6,000
Year 7	$5,000	$6,000
Year 8	$5,000	$6,000
Year 9	$5,000	$5,000
Year 10	$5,000	$5,000
Star
First 10 Year
TOTAL SAVINGS
$64,000	$63,000
Get Full Report Quote
```

**Revised Logic (Approved):**

**Cursor**

**Logic for Depreciation Fields (Y1-Y10) - Revised for Review Page**

**Requirement:**
-   **Review Page UI:** Include 10 editable numeric fields for Years 1-10.
-   **Auto-Population:** A "Paste Results" textarea on the Review Page (identical to the test module logic).
-   **Paste Logic:**
    -   When text is pasted, parse it.
    -   Look for "Year X".
    -   If "DIMINISHING VALUE" column exists (2nd column usually), extract that.
    -   Populate the 10 editable fields.
-   **Sheet Mapping:**
    -   Write the values from the 10 editable fields to the corresponding "Depreciation Year X" rows in the sheet.

**User:** Yes (bvut we defintely need to talk about UI. There are 2 more fields we need to addd as werll

**Confirmation:** ✅ Approved (With Washington Brown paste & parse functionality)

---

### Fields 27-29: Build Window, Cashback 1 month, Cashback 2 month

**Initial Inquiry:**

**User:** See screen shot

**Cursor Initial Proposal:**

**Logic for "Cashback 1 month" and "Cashback 2 month" Fields**

I see rows 27 and 28 in your screenshot.

**User:** sorry there are 3 field see screen shot

**Cursor Second Attempt:**

**Logic for "Build Window", "Cashback 1 month", "Cashback 2 month"**

**Row 27: Build Window**
-   **Source:** `formData.propertyDescription.landRegistration` (Page 3).
-   **Logic:** [Attempted to derive from existing field]
-   **Question:** Should we add an editable "Build Window (Months)" field to the Review Page?

**User Clarification:**

I love that you went and found that logic, but no we are not using registred field, but your instinct was correct. For Build window we need an editable field with values of 09 mo, 12 mo, 15 mo, 18 mo. For the Cashback 1 month & Cashback 2 month we need drropdowns with months 1-18

**Final Logic (Approved):**

**Cursor**

**Logic for "Build Window", "Cashback 1 month", "Cashback 2 month" (Confirmed)**

**Source:**
-   **Review Page:** Three new editable dropdown fields.
-   **Storage:** `formData.buildWindow`, `formData.cashback1Month`, `formData.cashback2Month`.
-   **GHL Sync:** None (Form Only).

**Field Details:**
1.  **Build Window:**
    -   **Dropdown Values:** `09 mo`, `12 mo`, `15 mo`, `18 mo`.
    -   **Mapping:** Search "Build Window" -> Write Selected Value.

2.  **Cashback 1 month:**
    -   **Dropdown Values:** `1`, `2`, `3`, ..., `18` (Numbers representing months).
    -   **Mapping:** Search "Cashback 1 month" -> Write Selected Value.

3.  **Cashback 2 month:**
    -   **Dropdown Values:** `1`, `2`, `3`, ..., `18`.
    -   **Mapping:** Search "Cashback 2 month" -> Write Selected Value.

**User:** Yes

**Confirmation:** ✅ Approved

---

## Summary of New Fields (Rows 13-29)

| Field | Source | Logic | UI Type | GHL Sync | Status |
|-------|--------|-------|---------|----------|--------|
| Council/Water Rates $ | Review Page | Direct input | Editable $ field | ❌ No | ✅ Approved |
| Insurance or Insurance & Strata Field | Title Type | Conditional label based on Title | Read-only label | ❌ No | ✅ Approved |
| Insurance or Insurance & Strata $ | Title Type + Body Corp + Insurance | Complex calculation | Conditional UI (see details) | ❌ No | ✅ Approved |
| P&B / PCI | Property Type | Conditional text | Read-only label | ❌ No | ✅ Approved |
| Depreciation Year 1-10 | Washington Brown paste | Parse & populate | 10 editable fields + paste area | ❌ No | ✅ Approved |
| Build Window | Review Page | Dropdown selection | Dropdown (09/12/15/18 mo) | ❌ No | ✅ Approved |
| Cashback 1 month | Review Page | Dropdown selection | Dropdown (1-18) | ❌ No | ✅ Approved |
| Cashback 2 month | Review Page | Dropdown selection | Dropdown (1-18) | ❌ No | ✅ Approved |

---

## Key Decisions

1. **Mapping Method:** All fields use Keyword Matching (search Column A) for robustness.
2. **GHL Sync:** None of the new fields sync to GHL - they are Form Only for sheet population.
3. **Insurance Logic:** Based on Title Type (not Body Corp presence), with complex UI showing annualized Body Corp + Insurance when Strata.
4. **Washington Brown:** Dedicated paste & parse functionality for depreciation values (prefer Diminishing Value column).
5. **Build Window:** Manual dropdown, not derived from Land Registration field.

---
