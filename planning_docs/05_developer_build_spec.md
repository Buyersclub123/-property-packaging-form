# 05 - Developer Build Spec: Address Construction & Folder Naming

_Extracted from planning session document: 05_address_construction_folder_naming.md_

This document contains only the final agreed logic, behavior, and technical decisions for implementation.

---

## **1. Address Construction Logic**

### **1.1 Format & Order**
Construct the full property address in this exact order:

1. **Lot Number** (if exists and not "Not Applicable"): `"Lot [X], "`
2. **Unit Number** (if exists): `"Unit [Y], "`
3. **Street Address**: `[propertyAddress]`

**Final Format:** `"Lot [X], Unit [Y], [Street Address]"`

**Example:** `"Lot 5, Unit 2, 123 Smith St"`

### **1.2 Data Sources**
- **Street Address:** `formData.address.propertyAddress` (Page 1)
- **Unit Number:** `formData.address.unitNumber` (Page 2, if `hasUnitNumbers` is Yes)
- **Lot Number:** `formData.address.lotNumber` (Page 2, for H&L properties, unless "Not Applicable")

### **1.3 Implementation Note**
**Reuse existing code:** The logic that generates the "Property Address" header at the top of each page already exists in the codebase (likely in `MultiStepForm.tsx`). Locate and reuse this exact function rather than reimplementing.

### **1.4 Validation**
Ensure "Unit" and "Lot" labels are added only if the number doesn't already contain them (e.g., if user typed "Unit 2", don't duplicate the label).

---

## **2. Usage of Constructed Address**

The constructed address string is used in:

1. **Google Drive Folder Name:** Exact string
2. **Cashflow Spreadsheet Filename:** `"CF spreadsheet [Address]"`
3. **Photos Document Filename:** `"Photos [Address].docx"`
4. **Spreadsheet Cell B2:** Exact string (Autofill data tab)
5. **Page 6 "Folder Name" Field:** Non-editable display field (already exists, repurpose this code)

---

## **3. Filename Length Restriction**

### **3.1 Limit**
- **Maximum:** 250 characters (safety margin below Google Drive's 255 limit)

### **3.2 Behavior When Exceeded**
- **Action:** Remove State and Postcode from the address string
- **User Message:** Display friendly message:
  > "There is a max 250 character length for file/folder names so the post code and state will be removed to fix the issue and allow you to progress"

### **3.3 Implementation**
Check `filename.length > 250` before creating folders/files. If exceeded, truncate by removing state and postcode components.

---

## **4. Duplicate Folder Check**

### **4.1 Trigger Point**
- **When:** From Page 2 onwards (after Lot/Unit values are entered)

### **4.2 Action**
- Check Google Drive for existing folder with the same constructed address name

### **4.3 User Feedback**
- Display a **friendly, informative message** that:
  - Alerts user to the duplicate
  - Provides advice on what to do next

---

## **5. Contract Type Sheet Deletion**

### **5.1 Logic**
- **If Contract Type = "Single Contract":** Delete "Split Contract" sheet from template
- **If Contract Type = "Split Contract":** Delete "Single Contract" sheet from template

### **5.2 Status**
Already proven/tested in the test module.

---

## **6. Hidden Sheets Protection**

### **6.1 Decision**
**No action required.** Do not implement additional protection for hidden sheets in Google Sheets.

---

## **Unresolved/Ambiguous Items**

None. All logic has been confirmed and approved by the user.

---

## **Key Technical Notes for Developer**

1. **Code Reuse Priority:** Don't reimplement address construction logic—find and reuse the existing function that displays the address header across form pages
2. **Page 6 Field:** The "Folder Name" non-editable field already exists on the Review page—repurpose this existing code
3. **Duplicate Check Timing:** The check "could kick in from page 2" suggests implementing it as soon as the full address is available (after Lot/Unit entry)
4. **Friendly Messaging:** All user-facing messages should be informative and provide actionable guidance
