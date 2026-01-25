# 05 - Address Construction & Folder Naming Logic

_Section from planning session transcript: Lines 1700-1900_

This section documents the agreed logic for constructing the full property address (with Lot/Unit) for folder naming and file naming purposes.

---

## Address Construction Logic

**Cursor Initial Proposal:**

**Group A: Address Construction (Logic for Folder/File Naming)**

**Source:**
-   **Address:** `formData.address.propertyAddress` (Page 1).
-   **Unit:** `formData.address.unitNumber` (Page 2, if `hasUnitNumbers` is Yes).
-   **Lot:** `formData.address.lotNumber` (Page 2, for H&L, unless "Not Applicable").

**Logic:**
1.  **Start with:** `propertyAddress`.
2.  **Prefix Unit:** If `unitNumber` exists, prepend "Unit [Unit] ".
3.  **Prefix Lot:** If `lotNumber` exists (and is not "Not Applicable"), prepend "Lot [Lot] ".
4.  **Result:** "Unit 2, Lot 5, 123 Smith St" (example).

**Use Case:**
-   **Folder Name:** Exact string.
-   **Sheet Name:** `CF spreadsheet [String]`.
-   **File Name:** `Photos [String].docx`.
-   **Sheet Cell B2:** Exact string.

**Validation:**
-   Ensure "Unit" and "Lot" labels are added only if the number doesn't already contain them (e.g. if user typed "Unit 2").

**User Correction:**

Sorry, can you put Lot Number before Unit Number in what you wrote

**Revised Logic (Approved):**

**Cursor**

**Revised Address Construction Logic (Lot First)**

**Logic:**
1.  **Prefix Lot:** If `lotNumber` exists (and is not "Not Applicable"), start with "Lot [Lot] ".
2.  **Prefix Unit:** If `unitNumber` exists, append "Unit [Unit] ".
3.  **Append Address:** Append `propertyAddress` (Page 1).
4.  **Result:** "Lot 5, Unit 2, 123 Smith St" (example).

**Use Case:**
-   **Folder Name:** Exact string.
-   **Sheet Name:** `CF spreadsheet [String]`.
-   **File Name:** `Photos [String].docx`.
-   **Sheet Cell B2:** Exact string.

**User Additional Context:**

see the attachment, in the property form at the moment, tehre is code which shows the address at the top of each page, so on page 1 it would be the street address but if Lot/Unit values are entered on page 2, from page 2 onwards each page shows the full address at the top. So the logic alredy exists, so you just use that. Also, curenttly in the code when you get to page 6 there is a field which shows you the address field in a field called Foler Name (non editable) so you just need to repurpose this code. If we think about check to see if there is a folder with the same address as being packaged, this could kick in from page 2, it needs to be a friendly message which is informative (gives advice on what to do as thre is a duplicate)

**Cursor Understanding:**

**Logic for Address & Folder Naming (Confirmed)**

**Source:**
-   **Reuse Existing Logic:** The logic that generates the "Property Address" header (Lot + Unit + Street) already exists in the code (e.g., `MultiStepForm.tsx` or similar). I will locate and reuse this exact function.
-   **Folder Name Field:** The non-editable "Folder Name" field on Page 6 (Review Page) currently uses this address. I will maintain this behavior.

**Duplicate Check Logic:**
-   **Trigger:** Page 2 (Decision Tree/Address confirmation) or Page 6 (Review). You mentioned "could kick in from page 2".
-   **Action:** Check Google Drive for existing folder with same name.
-   **Feedback:** "Friendly" informative message if duplicate found.

**Contract Type Deletion Logic (Last Item):**
-   **Logic:**
    -   If Contract Type is "Single Contract" -> Delete "Split Contract" sheet.
    -   If Contract Type is "Split Contract" -> Delete "Single Contract" sheet.
-   **Note:** This logic was already proven in the test module.

**Confirmation:** ✅ Approved

---

## Filename Length Restrictions

**User Question:**

Is there a document name length restriction for Google Sheet names, or documents which are saved in a Shared Google Drive? Alkso, I have hidden tabs in the GooglE Sheets, can we proptect the sheets from people unhiding the hidden sheets hen they down load the sheet?

**Cursor Response:**

**1. Google Drive Filename Length Restrictions:**
-   **Limit:** Google Drive allows filenames up to **255 characters** (bytes).
-   **Risk:** If the address is extremely long (e.g., very long street name + lot + unit + "CF spreadsheet " prefix), it *could* theoretically exceed this, but it is rare for typical addresses.
-   **Mitigation:** We can add a simple check: if `filename.length > 250`, truncate or alert.

**2. Protecting Hidden Sheets:**
-   **Can we prevent unhiding?**
    -   **Native Google Sheets:** No. Anyone with "Editor" access (which they need to download/edit the file) can Right Click -> Unhide.
    -   **Sheet Protection:** You can "Protect" the hidden sheets (Lock them) so that even if unhidden, they cannot be edited by unauthorized users.
    -   **Scripting:** You can use Google Apps Script to make sheets "Very Hidden" (`SheetVisibility.VERY_HIDDEN`), which makes them harder to find (requires script to unhide), but this requires running a script within the sheet itself, which might trigger warnings for users downloading it.
-   **Download Scenario:** When a user "downloads" (exports to Excel), hidden sheets remain hidden but can be unhidden in Excel. "Very Hidden" sheets usually transfer to Excel as `xlSheetVeryHidden`, which requires VBA to unhide.
-   **Recommendation:** Use standard "Hidden" + "Protection" (Lock cells with password or specific account) to prevent tampering. Preventing *viewing* entirely is difficult if they have the file.

**User Clarification:**

Pasting again, see my comments: Google Drive Filename Length Restrictions:
•	Limit: Google Drive allows filenames up to 255 characters (bytes).
•	Risk: If the address is extremely long (e.g., very long street name + lot + unit + "CF spreadsheet " prefix), it could theoretically exceed this, but it is rare for typical addresses.
•	Mitigation: We can add a simple check: if filename.length > 250, truncate or alert. **FRIENDLY MESSAGE WHICH STATES THERE IS A MAX 250 CHARACTER LENGTH FOR FILE / FOLDER NAMES SO THE POST CODE AND STATE WILL BE REMOVED TO FX THE ISSUE AND ALLOW YOU TO PROGRESS**

2. Protecting Hidden Sheets:
[...details...]
Logic Confirmation:Does this answer your question regarding restrictions and protection? Yes/No? **YEAH LETS NOT WORRY ABOUT IT**

**Cursor Understanding:**

**Final Confirmed Plan Items:**
1.  **Filename Length Check:** Implement friendly warning if > 250 chars ("Removing State & Postcode to fit...").
2.  **Hidden Sheets:** No action required (we will not worry about extra protection).

**Confirmation:** ✅ Approved

---

## Summary

### Address Construction

**Format:** `Lot [X], Unit [Y], [Street Address]`

**Order:** Lot first, then Unit, then Street Address

**Reuse:** Existing logic from form's address header display

**Uses:**
1. Folder name in Google Drive
2. Cashflow spreadsheet filename: `CF spreadsheet [Address]`
3. Photos document filename: `Photos [Address].docx`
4. Cell B2 in Autofill data tab

### Filename Length

**Limit:** 250 characters (safety margin below Google's 255)

**Action if exceeded:** Remove State and Postcode with friendly message

**Message:** "There is a max 250 character length for file/folder names so the post code and state will be removed to fix the issue and allow you to progress"

### Duplicate Folder Check

**Trigger:** Page 2 onwards

**Action:** Check Google Drive for existing folder with same name

**Feedback:** Friendly informative message with advice on what to do

### Contract Type Sheet Deletion

**Logic:**
- If "Single Contract" → Delete "Split Contract" sheet
- If "Split Contract" → Delete "Single Contract" sheet

**Status:** Already proven in test module

---
