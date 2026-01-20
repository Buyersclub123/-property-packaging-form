# Contract Type Simplified - Implementation Guide

**Date:** 2026-01-15  
**Status:** Form code complete, GHL/Webhook/Make.com setup pending  
**Purpose:** Implement inferred "Contract Type" field ("Single Contract" or "Split Contract") for cleaner email template logic

---

## Overview

A new computed field `contractTypeSimplified` has been added to the form that automatically determines whether an H&L property is "Single Contract" or "Split Contract" based on the existing `lotType` and `contractType` fields.

**Logic:**
- If `propertyType = "New"` AND `lotType = "Individual"` (H&L):
  - If `contractType = "01_hl_comms"` → `contractTypeSimplified = "Split Contract"`
  - If `contractType = "02_single_comms"` → `contractTypeSimplified = "Single Contract"`
- For all other property types: `contractTypeSimplified = null`

---

## ✅ COMPLETED (Form Code)

### 1. Type Definition
**File:** `form-app/src/types/form.ts`
- Added `ContractTypeSimplified` type: `'Single Contract' | 'Split Contract'`
- Added `contractTypeSimplified?: ContractTypeSimplified | null` to `DecisionTree` interface

### 2. Computation Logic
**File:** `form-app/src/components/steps/Step1DecisionTree.tsx`
- Added `useEffect` hook that automatically computes `contractTypeSimplified` whenever `propertyType`, `lotType`, or `contractType` changes
- Field is computed in real-time as user selects options

### 3. Initial State
**File:** `form-app/src/store/formStore.ts`
- Added `contractTypeSimplified: null` to initial `DecisionTree` state

### 4. GHL Submission
**File:** `form-app/src/app/api/ghl/submit-property/route.ts`
- Added `contract_type: formData.decisionTree?.contractTypeSimplified || ''` to GHL record mapping

---

## 🔄 PENDING (GHL & Make.com Setup)

### Step 1: Create Field in GHL Custom Object
**Action Required:**
1. Log into GHL
2. Go to Custom Objects → Property Reviews object
3. Create a new field:
   - **Field Name:** `contract_type` (internal name in GHL)
   - **Field Type:** Text (or Dropdown with options: "Single Contract", "Split Contract")
   - **Description:** "Computed field indicating Single Contract or Split Contract for H&L properties"

**Note:** Field will be empty/null for non-H&L properties (Established, Projects).

---

### Step 2: Verify Form Submission Includes Field
**Status:** ✅ Already implemented in code  
**File:** `form-app/src/app/api/ghl/submit-property/route.ts` (line 39)

The form already sends `contract_type` to GHL when a property is submitted. Once the GHL field is created, it will automatically populate.

---

### Step 3: Update GHL Webhook to Include Field
**Status:** ✅ Automatic (no manual action needed)

**GHL Workflow:** "PR → Property Review Created (Trigger)"  
**Make.com Webhook URL:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`  
**Reference:** See `docs/MAKECOM-SCENARIOS-AND-GHL-WEBHOOKS.md` for details

**Important:** The GHL workflow sends **ALL custom object fields** to Make.com automatically. Once you create the `contract_type_simplified` field in GHL, it will automatically be included in the webhook payload - **no manual webhook configuration needed**.

**Field Name in Webhook:** `contract_type`  
**Possible Values:** `"Single Contract"`, `"Split Contract"`, or `""` (empty string for non-H&L properties)

**Verification:**
- After creating the field in GHL, test by submitting a property from the form
- Check the webhook payload in Make.com to confirm `contract_type` is present
- The field should appear automatically in the webhook data

---

### Step 4: Update Make.com Module 3 Email Template
**File:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`

#### 4.1. Read Field from Webhook
**Location:** Near the top of the module (where other fields are read)

Add field reading logic (similar to existing field reads):
```javascript
const contractTypeSimplified = v("contract_type") || "";
```

**Note:** This field will be available for:
- H&L properties (will have "Single Contract" or "Split Contract")
- Established/Project properties (will be empty string)

#### 4.2. Use Field in Email Template Logic

**A. Subject Line Logic (Section 4.1 from CONTRADICTIONS-FINDINGS.md)**
- Currently uses `contractType` field with values like `"01_hl_comms"`, `"02_single_comms"`
- Can be simplified to use `contractTypeSimplified` for cleaner logic
- Example: Instead of checking `contractType === "01_hl_comms"`, check `contractTypeSimplified === "Split Contract"`

**B. Purchase Price Formatting (Section 1.5 from CONTRADICTIONS-FINDINGS.md)**
- Currently determines Single vs Split Contract by checking `contractType === "02_single_comms"`
- Can use `contractTypeSimplified === "Single Contract"` instead
- This simplifies the logic for determining price structure (Total Price vs Land+Build)

**C. Other Email Template Sections**
- Review other sections that check `contractType` values to see if `contractTypeSimplified` would simplify logic
- Priority: Subject Line and Purchase Price sections

#### 4.3. Code Changes Needed

**Location:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`

**Changes:**
1. **Add field read** (near top, with other field reads):
   ```javascript
   const contractTypeSimplified = v("contract_type") || "";
   ```

2. **Update subject line logic** (around line 1306-1376):
   - Replace checks like `contractType === "01_hl_comms"` with `contractTypeSimplified === "Split Contract"`
   - Replace checks like `contractType === "02_single_comms"` with `contractTypeSimplified === "Single Contract"`

3. **Update Purchase Price logic** (around line 1368-1385 and related sections):
   - Use `contractTypeSimplified === "Single Contract"` instead of `contractType === "02_single_comms"`
   - Use `contractTypeSimplified === "Split Contract"` instead of `contractType === "01_hl_comms"`

4. **Apply to Portal version** (if applicable):
   - Apply same changes to Portal version sections

**Note:** Keep existing `contractType` field reads for backward compatibility during transition, but prioritize using `contractTypeSimplified` for new logic.

---

## Testing Checklist

### Form Testing
- [ ] Create H&L property with `contractType = "01_hl_comms"` → Verify `contractTypeSimplified = "Split Contract"`
- [ ] Create H&L property with `contractType = "02_single_comms"` → Verify `contractTypeSimplified = "Single Contract"`
- [ ] Create Established property → Verify `contractTypeSimplified = null`
- [ ] Create Project property → Verify `contractTypeSimplified = null`
- [ ] Submit property → Verify field appears in GHL record

### GHL Testing
- [ ] Verify field exists in GHL Custom Object
- [ ] Verify field populates correctly when property is submitted
- [ ] Verify webhook includes field in payload

### Make.com Testing
- [ ] Verify field is readable in Module 3
- [ ] Verify subject line logic works correctly with new field
- [ ] Verify Purchase Price formatting works correctly with new field
- [ ] Test email generation for H&L Single Contract properties
- [ ] Test email generation for H&L Split Contract properties
- [ ] Test email generation for Established properties (field should be empty)
- [ ] Test Portal version email generation

---

## Benefits

1. **Cleaner Logic:** Email template can use "Single Contract" / "Split Contract" instead of checking multiple `contractType` codes
2. **Future-Ready:** Field is computed in form, making it easy to expose as user-selectable field in future if needed
3. **Simplified Maintenance:** Less complex conditional logic in email template
4. **Better Readability:** Code is more self-documenting ("Single Contract" is clearer than "02_single_comms")

---

## Reference Documents

- **Contradictions Document:** `code/CONTRADICTIONS-FINDINGS.md` (Section 4.1 Notes)
- **TODO List:** `TODO-LIST.md`
- **Email Template Code:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`

---

## Notes

- The field is **computed automatically** in the form - users never see or interact with it directly
- Field is **optional** in the interface (`contractTypeSimplified?:`) - can be null/undefined
- For **backward compatibility**, existing `contractType` field should still be used if `contractTypeSimplified` is empty
- This field is **primarily for H&L properties** - will be null/empty for Established and Project properties
