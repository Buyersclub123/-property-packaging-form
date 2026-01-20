# 03 - Google Sheets Field Mapping Logic - Part 1: Core Fields (Rows 1-13)

_Section from planning session transcript: Lines 320-800_

This section documents the agreed logic for mapping form data to the Google Sheets cashflow spreadsheet for core fields (rows 1-13).

---

## Understanding Exercise Context

**User**

When I say review current logic, .thsayt includes me in the excercise. and I dont undertand how you could be"I will proceed to update src/lib/googleDrive.ts (specifically the populateSpreadsheet function) to implement the specific logic for B15, B16, and B17, replacing the current "direct write from UI dropdown" approach with the calculated approach you requested." as you dont know what the logic I want is. I told you the current logic was to facilitate testing of create folder, rename folder, rename google sheets, delets a sheet etc/ I WANTRD TO KNOW THAT COULD WORK BEFOREE WE DID THE LOGIC SO, fields 2- 13 have existing logic, I wamt to revisit one field at a time with you to ensure the logic is correct/ Understand? Y/N

**Cursor**

Yes.

---

## Field-by-Field Logic Review

### Field 1: Address

**User**

OK, so the adress field confirmed on page 1 of the proerpty form, coupled with the Unit and or Lot number if relevent detailed on page 2 of the property form, need to be pushed to the field B2 of the Autofill data tab of the cashflow spreadsheets in the folder that been created. It this address that would also be used to name the folder, as well as editing the photos doc name and the cashflow spreadsheet name (noting one of the cashflow sheets will always be deleted. SO I need you to play back to me your understadning here. And if we think about from a UI perspective, I think it is sensible we have a page which shows the human all gthe fiedls which will be used in the creation & editing of the folder - some of these fields will be read only as they are values entered elsewhere in the form, so will be auto calculated based on other values, and some will be editable so the human can set the values

I read the document, I feel like we should discuss all oogic before we build and before we do the UI 

Yes plan is sound, approved, please can we now discuss the next field wnhich is State?

**Confirmation:** Approved

---

### Field 2: State

**Cursor**

**Logic for "State" Field**

**Source:**
This field comes from **Page 1 (Address & Risk Check)** of the Property Form (`formData.address.state`).

**Mapping Logic:**
1.  **Format:** The Google Sheet expects a 3-letter uppercase state code (e.g., "QLD", "NSW", "VIC") because it uses this code in formulas (like Stamp Duty calculations).
2.  **Transformation:**
    *   If the user entered/selected "Queensland", transform to "**QLD**".
    *   If "New South Wales", transform to "**NSW**".
    *   If "Victoria", transform to "**VIC**".
    *   If "South Australia", transform to "**SA**".
    *   If "Western Australia", transform to "**WA**".
    *   If "Tasmania", transform to "**TAS**".
    *   If "Northern Territory", transform to "**NT**".
    *   If "Australian Capital Territory", transform to "**ACT**".
3.  **Target:** Write this 3-letter code to the cell mapped to "Address State" in the Cashflow Spreadsheet.

**Does this logic match your requirement?**
> Field: State
> Value: QLD
> Mapped Field: Address State

**User:** Yes

**Confirmation:** Approved

---

### Field 3: Land Cost

**Cursor**

**Logic for "Land Cost" Field**

**Source:**
This field comes from **Page 3 (Property Details)**, specifically the **Purchase Price** section (`formData.purchasePrice.landPrice`).

**Mapping Logic:**
1.  **Check Contract Type:**
    *   **If H&L (Split Contract):** Use the value from the **Land Price** field (`formData.purchasePrice.landPrice`).
    *   **If Single Contract (Established or New Single Contract):** This field should be **empty** or **0**, because there is no separate land component (it's all Total Price).
2.  **Target:** Write this value to the cell mapped to "Land Cost" in the Cashflow Spreadsheet.

**Does this match your requirement?**
> Field: Land Cost
> Value: 450000
> Mapped Field: Land Cost

**User:** Yes

**Confirmation:** Approved

---

### Field 4: Build Cost

**Cursor**

**Logic for "Build Cost" Field**

**Source:**
This field comes from **Page 3 (Property Details)**, specifically the **Purchase Price** section (`formData.purchasePrice.buildPrice`).

**Mapping Logic:**
1.  **Check Contract Type:**
    *   **If H&L (Split Contract):** Use the value from the **Build Price** field (`formData.purchasePrice.buildPrice`).
    *   **If Single Contract (Established or New Single Contract):** This field should be **empty** or **0**, because there is no separate build component.
2.  **Target:** Write this value to the cell mapped to "Build Cost" in the Cashflow Spreadsheet.

**Does this match your requirement?**
> Field: Build Cost
> Value: 150000
> Mapped Field: Build Cost

**User:** Yes

**Confirmation:** Approved

---

### Field 5: Total Cost

**Cursor**

**Logic for "Total Cost" Field**

**Source:**
This logic depends on the **Contract Type** selected in the Decision Tree (Page 2).

**Initial Proposal (Rejected):**
1.  **If Single Contract:** Use `formData.purchasePrice.totalPrice`.
2.  **If H&L (Split Contract):** Calculate: `Land Price` + `Build Price`.

**User Feedback:**

For this one, if there is a total price presented for split contracts in the preropty form (land price + build price) I feel like we sould use that value, otherwise we are introducing another calculation which could be wrong. For me, a field (whichi yes is autocalculated) has been seen by a human, the value should be reused. what do you think?

**Revised Logic (Approved):**

**Revised Mapping Logic:**
1.  **Check for "Total Price" Field:**
    *   The property form (Page 3) displays a "Total Price" field.
    *   For **Single Contracts**, this is a direct input (`formData.purchasePrice.totalPrice`).
    *   For **Split Contracts (H&L)**, the form auto-calculates this and likely stores it (or displays it).
2.  **Action:**
    *   We will grab the value directly from the `Total Price` field in the form data.
    *   *Constraint:* We must ensure the form *saves* this auto-calculated total into `formData.purchasePrice.totalPrice` (or similar) even for Split Contracts.
3.  **Target:** Write this value to the cell mapped to "Total Cost" in the Cashflow Spreadsheet.

**User:** Yes

**Confirmation:** Approved

---

### Field 6: Cashback Value

**Cursor**

**Logic for "Cashback Value" Field**

**Source:**
This field comes from **Page 3 (Property Details)**, specifically the **Purchase Price** section (`formData.purchasePrice.cashbackRebateValue` and `formData.purchasePrice.cashbackRebateType`).

**Mapping Logic:**
1.  **Check Type:**
    *   Check `formData.purchasePrice.cashbackRebateType`.
    *   **If Type is "Cashback":** Use the value from `formData.purchasePrice.cashbackRebateValue`.
    *   **If Type is "Rebate" or "None" (or empty):** This field should be **empty** or **0**.
    *   *Reason:* Your comment said "If cashback / Rebate value = cashback, present cashback value in this field". This implies we *only* populate this cell if it's a "Cashback", not a "Rebate".
2.  **Target:** Write this value to the cell mapped to "Cashback Value (not rebate)" in the Cashflow Spreadsheet.

**Does this match your requirement?**
> Field: Cashback Value
> Value: 15000
> Mapped Field: Cashback Value (not rebate)
> Comment: If cashback / Rebate vlue = cashback, present cashvack value in this field

**User:** Yes. NOTING: > Field: Cashback Value > Value: 15000 THIS VALUE IS NOT HARD CODED ITS EDITBABLE IN THE FORM, just to highlight

**Confirmation:** Approved (with note that value is editable in form)

---

### Fields 7-9: Total Bed, Total Bath, Total Garage

**Cursor**

**Logic for "Total Bed", "Total Bath", "Total Garage" Fields**

**Source:**
These fields come from **Page 3 (Property Details)** (`formData.propertyDescription`).

**Mapping Logic (Applied to Beds, Baths, and Garage individually):**
1.  **Check Dual Occupancy:**
    *   Check `formData.decisionTree.dualOccupancy` (or `formData.propertyDescription.bedsSecondary` existence).
    *   **If Single Occupancy:** Use the "Primary" value only (e.g., `bedsPrimary`).
    *   **If Dual Occupancy:** Construct a string in the format **"Primary + Secondary"**.
        *   Example: `bedsPrimary` = 3, `bedsSecondary` = 2 → Output: **"3 + 2"**.
        *   *Note:* We are NOT summing them mathematically (e.g., "5"). We are displaying the split string "3 + 2".
2.  **Target:** Write these values to the cells mapped to "Total Beds", "Total Bath", and "Total Garage" in the Cashflow Spreadsheet.

**Does this match your requirement?**
> Field: Total Bed
> Value: 3 + 2
> Mapped Field: Total Beds
> Comment: If Dual occupancy show primary bed + secondary bed i.e 4 + 2

**User:** YES

**Confirmation:** Approved

---

### Fields 10-11: Low Rent and High Rent

**Cursor**

**Logic for "Low Rent" and "High Rent" Fields**

**Source:**
These fields come from **Page 3 (Property Details)**, specifically the **Rental Assessment** section (`formData.rentalAssessment`).

**Mapping Logic:**
1.  **Check Dual Occupancy:**
    *   Check `formData.decisionTree.dualOccupancy` (or `formData.rentalAssessment.rentAppraisalSecondaryFrom` existence).
2.  **Low Rent Logic:**
    *   **If Single Occupancy:** Use `rentAppraisalPrimaryFrom`.
    *   **If Dual Occupancy:** **Sum** the Primary From and Secondary From values.
        *   Example: `Primary From` = 450, `Secondary From` = 300 → Output: **750** (numeric sum).
3.  **High Rent Logic:**
    *   **If Single Occupancy:** Use `rentAppraisalPrimaryTo`.
    *   **If Dual Occupancy:** **Sum** the Primary To and Secondary To values.
        *   Example: `Primary To` = 500, `Secondary To` = 350 → Output: **850** (numeric sum).
4.  **Target:** Write these values to "Low Rent" and "High Rent" rows in the Google Sheet.

**User Clarification:**

yes I am aware of those fields you mentioned as they appear in for form and map to GHL. but you mentioned fields called "Total of Lowe Rent" and "Total of Higher Rent" A/ the rist one has a spelling mistake (lowe instead of low) B/ Are these fielsd you believe exist in the googlesheet we are writing to? c/ Are these calculated fields in the UI which woil be shown to the humna when they review the page to see the data that will be pushed to the cashflow sheets D/ are these backgrouod fields in tghe current form used to calculate yield and appraised yield?  I do not know where they existing so I am wanting you to explain before I can confirm

**Cursor Clarification:**

**A/ Spelling Mistake:**
Yes, "Total of Lowe Rent" was a copy-paste from the table you provided. I am treating it as "Low Rent".

**B/ Existence in Google Sheet:**
Yes. The **Google Sheet** "Autofill data" tab has rows in Column A. My code scans Column A for text like "Low Rent" or "High Rent". If it finds a row with that text, it writes the value to Column B.

**C/ UI Review Page:**
In the proposed "Review Page", yes, we should display these calculated totals so the human can see "Total Low Rent: $750" and "Total High Rent: $850" before they click "Create Folder".

**D/ Background Fields:**
Currently, `formData.rentalAssessment` has `rentAppraisalPrimaryFrom`, `rentAppraisalPrimaryTo`, etc.
The "Total" sum (e.g. 450 + 300 = 750) is **NOT** currently a stored field in `formData`.
It is a **calculation** we perform on-the-fly right before writing to the sheet.

**User Final Clarification:**

ok, in for cashflow sheet the tab Autofill data (Which I did paste in for you) has fields called Low Rent and High Rent, so we need to push the data to those. Of courdse since we have a requirement to show on one page all the data that will get pushed to teh cashflow spreadsheet, we need to consider how we present the information. Make sense? 

**Cursor:**

Yes, that makes perfect sense.

1.  **Sheet Logic:** We will push the calculated sums to the "Low Rent" and "High Rent" rows in the "Autofill data" tab of the Google Sheet.
2.  **UI Requirement:** On the review page, we will present these as read-only calculated fields (e.g., "Total Low Rent Estimate: $750", "Total High Rent Estimate: $850") so the user can verify the numbers that will be sent.

**Rent Logic Status:**
> Field: Low Rent / High Rent
> Logic: Sum Primary + Secondary (if dual).
> Destination: "Low Rent" / "High Rent" rows in Sheet.

**User:** Yes

**Confirmation:** Approved

---

### Field 12: Average Rent

**Note:** This field is auto-calculated in the Google Sheet itself, so no value needs to be pushed from the form.

> Average Rent: 800 | Average of Low & High Rent | Auto Calc no field | This could be auto calc in the sheet so no need to pull in from form

---

## Summary of Core Fields (Rows 1-13)

| Field | Source | Logic | Destination | Status |
|-------|--------|-------|-------------|--------|
| Address | Page 1 + Page 2 (Lot/Unit) | Combine Lot + Unit + Street Address | B2 (Autofill data tab) | ✅ Approved |
| State | Page 1 | Transform to 3-letter code (QLD, NSW, etc.) | Address State row | ✅ Approved |
| Land Cost | Page 3 | Use if H&L, else 0 | Land Cost row | ✅ Approved |
| Build Cost | Page 3 | Use if H&L, else 0 | Build Cost row | ✅ Approved |
| Total Cost | Page 3 | Use form's Total Price field directly | Total Cost row | ✅ Approved |
| Cashback Value | Page 3 | Use if type="Cashback", else 0 | Cashback Value row | ✅ Approved |
| Total Bed | Page 3 | "Primary + Secondary" format if dual | Total Beds row | ✅ Approved |
| Total Bath | Page 3 | "Primary + Secondary" format if dual | Total Bath row | ✅ Approved |
| Total Garage | Page 3 | "Primary + Secondary" format if dual | Total Garage row | ✅ Approved |
| Low Rent | Page 3 | Sum Primary + Secondary if dual | Low Rent row | ✅ Approved |
| High Rent | Page 3 | Sum Primary + Secondary if dual | High Rent row | ✅ Approved |
| Average Rent | N/A | Auto-calculated in sheet | N/A | ✅ No action needed |

---

## Key Decisions

1. **Total Cost:** Use the form's displayed Total Price value (which human has seen) rather than recalculating Land + Build.
2. **Rent Fields:** Calculate sums on-the-fly, display on Review Page for human verification.
3. **Bed/Bath/Garage:** Display as "X + Y" string format, not mathematical sum.
4. **UI Requirement:** All mapped values must be shown on a Review Page before folder creation.

---
