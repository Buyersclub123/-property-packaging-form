# **Structured Developer Build Spec**
## New Page Flow & UI Structure (Steps 6-8 Restructure)

---

## **1. Overview**

The form has been restructured to accommodate Washington Brown Calculator and Cashflow Review functionality. Steps 6-8 have been redefined with a **two-phase process**: folder creation (Step 7) followed by final submission (Step 8).

---

## **2. Page Flow Structure**

### **Step 6: Washington Brown Calculator**
**Purpose:** Parse and capture 10-year depreciation values from Washington Brown website output

### **Step 7: Cashflow Spreadsheet Review & Folder Creation**
**Purpose:** Display all cashflow fields, allow editing, and create the Google Drive folder

### **Step 8: Pre-Submission Checklist & Final Submission**
**Purpose:** Complete checklist, add attachments, and submit to GHL/Make.com

---

## **3. Step 6: Washington Brown Calculator**

### **UI Components:**
1. **Large Textarea** - For pasting Washington Brown output
2. **Parse Button** - Triggers parsing of pasted text
3. **Results Display** - Shows parsed values
4. **10 Editable Fields** - Year 1 through Year 10 depreciation values

### **Parsing Logic:**
- Parse pasted text looking for "Year X" rows
- Extract **DIMINISHING VALUE** column (preferred over Prime Cost)
- Auto-populate 10 editable fields
- Allow manual editing of auto-populated values

### **Expected Input Format:**
```
YEARS	DIMINISHING VALUE	PRIME COST
Year 1	$11,000	$7,000
Year 2	$8,000	$7,000
[...etc...]
```

### **Technical Note:**
Reuse existing logic from `http://localhost:3000/test-sheets-population` Washington Brown Calculator tab

---

## **4. Step 7: Cashflow Spreadsheet Review & Folder Creation**

### **UI Components:**

#### **4.1 Field Display Grid**
Display ALL fields in the **same order as the cashflow spreadsheet mapping list**

#### **4.2 Read-Only Fields (Auto-calculated from earlier steps):**
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

#### **4.3 Editable Fields:**
- **Council/Water Rates $** (currency input)
- **Insurance $** (currency input) - *conditional display, see 4.4*
- **Depreciation Year 1-10** (from Step 6)
- **Build Window** (dropdown: 09/12/15/18 months)
- **Cashback 1 month** (dropdown: 1-18)
- **Cashback 2 month** (dropdown: 1-18)

#### **4.4 Insurance Section (Conditional UI):**

**If Title Type is NOT Strata:**
- Single editable field: "Insurance $"

**If Title Type IS Strata:**
- "Annualized Body Corp" (read-only, calculated)
- "Insurance $" (editable)
- "Total" (read-only, sum of Annualized Body Corp + Insurance)

#### **4.5 Action Button:**
- **"Create Folder" button**
- Executes folder creation in Google Drive
- Populates cashflow spreadsheet with all field values
- User can review folder contents before proceeding to Step 8

### **Technical Note:**
Adapt from `http://localhost:3000/test-sheets-population` Sheets Population tab

---

## **5. Step 8: Pre-Submission Checklist & Final Submission**

### **UI Components:**

1. **Pre-Submission Checklist**
   - Display existing checklist items
   - User must check off items before submitting

2. **Attachments**
   - File upload or attachment management
   - (Use existing functionality)

3. **Additional Dialogue (Optional)**
   - Optional text field for additional notes

4. **Message for BA (Optional)**
   - Optional text field for message to Business Analyst

5. **"Submit Property" Button**
   - Triggers GHL webhook
   - Triggers Make.com integration
   - Sends packager email

6. **Success Screen**
   - Display after successful submission
   - Message: *"Property Submitted Successfully. Please check your email to approve the property submission."* (or similar friendly instruction)

### **Technical Note:**
Restructure existing Step 6 functionality as Step 8

---

## **6. Workflow Sequence**

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

## **7. Critical Business Rules**

### **7.1 Two-Phase Process:**
- **Phase 1 (Step 7):** Create & populate Google Drive folder
- **Phase 2 (Step 8):** Submit to GHL/Make.com

### **7.2 Folder Creation is Independent:**
✅ **CONFIRMED:** Folder creation (Step 7) happens **separately** from final submission (Step 8)
- User creates folder first
- User reviews folder contents in Google Drive
- User then proceeds to Step 8 for final submission
- **Reason:** Users must review folder contents before submitting

### **7.3 Field Order:**
Step 7 must display fields in the **exact same order** as the cashflow spreadsheet mapping list

### **7.4 Depreciation Value Priority:**
When parsing Washington Brown output, use **DIMINISHING VALUE** column (not Prime Cost)

---

## **8. UI Behaviors**

### **8.1 Step 6 Behaviors:**
- Textarea accepts multi-line paste
- Parse button only enabled when textarea has content
- Parsed values populate editable fields
- User can manually override any parsed value
- Navigation to Step 7 requires all 10 year fields to have values

### **8.2 Step 7 Behaviors:**
- Read-only fields are visually distinct (grayed out or labeled)
- Editable fields are clearly marked
- Insurance section changes based on Title Type (from earlier step)
- "Create Folder" button triggers folder creation
- User receives confirmation when folder is created
- User can navigate to Step 8 only after folder creation succeeds

### **8.3 Step 8 Behaviors:**
- "Submit Property" button disabled until checklist items are checked
- Success screen replaces form after successful submission
- Success message provides clear next steps for user

---

## **9. Technical Implementation Notes**

1. **Reuse Existing Components:**
   - Washington Brown Calculator logic from test page
   - Sheets Population logic from test page
   - Existing Step 6 submission logic (move to Step 8)

2. **Field Mapping:**
   - Maintain exact order from cashflow spreadsheet mapping list
   - Ensure all auto-calculated fields flow from Steps 1-5

3. **State Management:**
   - Step 6 depreciation values must persist to Step 7
   - Step 7 folder creation status must persist to Step 8

---

## **10. Unresolved / Ambiguous Logic**

### **No unresolved items identified** ✅

All logic has been confirmed by the user:
- Folder creation is separate from submission ✅
- Field order matches spreadsheet mapping ✅
- Insurance conditional logic is defined ✅
- Success messaging is specified ✅

---

## **Summary for Developers**

This spec restructures the final three form steps to support:
1. Depreciation value capture (Step 6)
2. Cashflow review with folder creation (Step 7)
3. Final submission with checklist (Step 8)

**Key Implementation Point:** The folder creation in Step 7 is a **separate user action** that must complete successfully before the user can proceed to Step 8 for final submission. This allows users to review the created folder contents before committing to submission.
