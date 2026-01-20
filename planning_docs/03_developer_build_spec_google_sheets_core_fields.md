# 03 - Developer Build Spec: Google Sheets Field Mapping - Core Fields (Rows 1-13)

_Extracted from planning session document: 03_google_sheets_mapping_core_fields.md_

This document provides the final agreed logic for mapping property form data to the Google Sheets cashflow spreadsheet "Autofill data" tab (Column B, rows 1-13).

---

## **Overview**

This spec defines the logic for mapping property form data to the Google Sheets cashflow spreadsheet "Autofill data" tab (Column B, rows 1-13).

---

## **Field Mapping Logic**

### **1. Address (Row B2)**

**Source:** 
- Page 1: `formData.address`
- Page 2: `formData.lotNumber`, `formData.unitNumber` (if applicable)

**Logic:**
- Combine Lot + Unit + Street Address into single string
- This same address value is used for:
  - Naming the folder
  - Renaming the photos document
  - Renaming the cashflow spreadsheet

**Destination:** Cell B2, "Autofill data" tab

---

### **2. State**

**Source:** Page 1: `formData.address.state`

**Logic:**
Transform full state name to 3-letter uppercase code:
- "Queensland" → "QLD"
- "New South Wales" → "NSW"
- "Victoria" → "VIC"
- "South Australia" → "SA"
- "Western Australia" → "WA"
- "Tasmania" → "TAS"
- "Northern Territory" → "NT"
- "Australian Capital Territory" → "ACT"

**Destination:** "Address State" row in sheet

**Rationale:** Sheet formulas (e.g., Stamp Duty calculations) require 3-letter codes

---

### **3. Land Cost**

**Source:** Page 3: `formData.purchasePrice.landPrice`

**Logic:**
```
IF contract type = "H&L (Split Contract)":
    Use formData.purchasePrice.landPrice
ELSE (Single Contract - Established or New):
    Write 0 or empty
```

**Destination:** "Land Cost" row in sheet

---

### **4. Build Cost**

**Source:** Page 3: `formData.purchasePrice.buildPrice`

**Logic:**
```
IF contract type = "H&L (Split Contract)":
    Use formData.purchasePrice.buildPrice
ELSE (Single Contract):
    Write 0 or empty
```

**Destination:** "Build Cost" row in sheet

---

### **5. Total Cost**

**Source:** Page 3: `formData.purchasePrice.totalPrice`

**Logic:**
- **Always use the Total Price field value directly from the form**
- For Single Contracts: This is a direct user input
- For Split Contracts (H&L): This is auto-calculated in the form (Land + Build)
- **Do NOT recalculate** - use the value the human has already seen

**Technical Requirement:** 
The form must save the auto-calculated total into `formData.purchasePrice.totalPrice` even for Split Contracts

**Destination:** "Total Cost" row in sheet

**Rationale:** Reuse human-verified values rather than introducing additional calculation points

---

### **6. Cashback Value**

**Source:** Page 3: `formData.purchasePrice.cashbackRebateValue` and `formData.purchasePrice.cashbackRebateType`

**Logic:**
```
IF formData.purchasePrice.cashbackRebateType = "Cashback":
    Use formData.purchasePrice.cashbackRebateValue
ELSE (Type = "Rebate" or "None" or empty):
    Write 0 or empty
```

**Destination:** "Cashback Value (not rebate)" row in sheet

**Note:** Value is editable in the form (not hardcoded)

---

### **7. Total Bed**

**Source:** Page 3: `formData.propertyDescription.bedsPrimary` and `formData.propertyDescription.bedsSecondary`

**Logic:**
```
IF Dual Occupancy:
    Output string: "bedsPrimary + bedsSecondary"
    Example: bedsPrimary=3, bedsSecondary=2 → "3 + 2"
ELSE (Single Occupancy):
    Output: bedsPrimary value only
```

**Destination:** "Total Beds" row in sheet

**Important:** Display as string format "X + Y", **NOT** mathematical sum

---

### **8. Total Bath**

**Source:** Page 3: `formData.propertyDescription.bathsPrimary` and `formData.propertyDescription.bathsSecondary`

**Logic:**
```
IF Dual Occupancy:
    Output string: "bathsPrimary + bathsSecondary"
ELSE (Single Occupancy):
    Output: bathsPrimary value only
```

**Destination:** "Total Bath" row in sheet

**Important:** Display as string format "X + Y", **NOT** mathematical sum

---

### **9. Total Garage**

**Source:** Page 3: `formData.propertyDescription.garagePrimary` and `formData.propertyDescription.garageSecondary`

**Logic:**
```
IF Dual Occupancy:
    Output string: "garagePrimary + garageSecondary"
ELSE (Single Occupancy):
    Output: garagePrimary value only
```

**Destination:** "Total Garage" row in sheet

**Important:** Display as string format "X + Y", **NOT** mathematical sum

---

### **10. Low Rent**

**Source:** Page 3: `formData.rentalAssessment.rentAppraisalPrimaryFrom` and `formData.rentalAssessment.rentAppraisalSecondaryFrom`

**Logic:**
```
IF Dual Occupancy:
    Calculate: rentAppraisalPrimaryFrom + rentAppraisalSecondaryFrom
    Example: Primary=450, Secondary=300 → 750 (numeric sum)
ELSE (Single Occupancy):
    Use: rentAppraisalPrimaryFrom
```

**Destination:** "Low Rent" row in sheet

**Note:** This is a calculated value (not currently stored in formData)

---

### **11. High Rent**

**Source:** Page 3: `formData.rentalAssessment.rentAppraisalPrimaryTo` and `formData.rentalAssessment.rentAppraisalSecondaryTo`

**Logic:**
```
IF Dual Occupancy:
    Calculate: rentAppraisalPrimaryTo + rentAppraisalSecondaryTo
    Example: Primary=500, Secondary=350 → 850 (numeric sum)
ELSE (Single Occupancy):
    Use: rentAppraisalPrimaryTo
```

**Destination:** "High Rent" row in sheet

**Note:** This is a calculated value (not currently stored in formData)

---

### **12. Average Rent**

**Logic:** Auto-calculated within the Google Sheet itself (average of Low Rent and High Rent)

**Action Required:** None - do not push any value from form

---

## **UI Requirements**

### **Review Page**
A review page must be created that displays **all** values that will be pushed to the cashflow spreadsheet before folder creation.

**Field Display Rules:**
- **Read-only fields:** Values auto-calculated from other form inputs (e.g., Total Cost for H&L, Low/High Rent totals)
- **Editable fields:** Values that can still be modified by the user
- **Presentation for Rent:** Display as "Total Low Rent Estimate: $750" and "Total High Rent Estimate: $850"

**Purpose:** Allow human verification of all data before it's written to Google Sheets

---

## **Technical Implementation Notes**

1. **Sheet Writing Method:** Scan Column A of "Autofill data" tab for matching field names, write values to corresponding Column B cells

2. **Dual Occupancy Detection:** Check `formData.decisionTree.dualOccupancy` or existence of secondary fields (e.g., `bedsSecondary`)

3. **Contract Type Detection:** Required to determine Land/Build cost logic and Total Cost handling

4. **On-the-fly Calculations:** Low Rent and High Rent sums are calculated during the write operation (not pre-stored in formData)

---

## **Unresolved/Ambiguous Items**

None - all logic for fields 1-13 has been confirmed and approved.

---

## **Status Summary**

| Field | Status |
|-------|--------|
| Address | ✅ Approved |
| State | ✅ Approved |
| Land Cost | ✅ Approved |
| Build Cost | ✅ Approved |
| Total Cost | ✅ Approved |
| Cashback Value | ✅ Approved |
| Total Bed | ✅ Approved |
| Total Bath | ✅ Approved |
| Total Garage | ✅ Approved |
| Low Rent | ✅ Approved |
| High Rent | ✅ Approved |
| Average Rent | ✅ No action needed |

---

**End of Spec**
