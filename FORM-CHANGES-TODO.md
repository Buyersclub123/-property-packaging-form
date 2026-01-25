# Form Code Changes - TODO

**Date:** January 11, 2026

---

## Pending Changes

### 1. Attachments Additional Dialogue Field
**Location:** Step 6 of 6 (Step6FolderCreation component)
**Action:** Add "Attachments Additional Dialogue" field
**File:** `form-app/src/components/steps/Step6FolderCreation.tsx`
**Details:** 
- Field should be added to the form
- Should map to `formData.attachmentsAdditionalDialogue`
- Should be sent in submission data

**Status:** ⏳ TODO

---

### 2. Unit / Lot Field Name (GHL - Not Code Change)
**Location:** GHL Custom Object Fields
**Action:** Rename field names in GHL:
- "Unit / Lot (Primary)" → "Unit Number" 
- "Unit / Lot (Secondary)" → "Unit Number (Secondary)" (or similar)

**Note:** This is a GHL field rename, not a code change. Code already uses correct field names (`unit__lot`, `unit__lot_secondary`).

**Status:** ⏳ TODO (GHL configuration)

---

### 3. Save Calculated totalPrice to Lot Data
**Location:** Step2PropertyDetails.tsx - LotPurchasePriceFields component
**Action:** Save calculated `totalPrice` (landPrice + buildPrice) to `lot.purchasePrice.totalPrice` when landPrice or buildPrice changes

**File:** `form-app/src/components/steps/Step2PropertyDetails.tsx`
**Function:** `LotPurchasePriceFields`
**Details:**
- Currently calculates `totalPrice` for display only (lines 3407-3430)
- Needs to save calculated value to lot purchasePrice object
- Should update when landPrice or buildPrice changes

**Status:** ⏳ TODO

---

### 4. Price Group Calculation
**Location:** Form submission/calculation logic
**Action:** Auto-generate/calculate `price_group` field
**Details:**
- Currently: Code expects `shared_data.purchasePrice?.priceGroup` but form doesn't send it
- Need to determine calculation logic for price_group
- From NEW-FIELDS-FOR-GHL.md: "Can this be auto-generated? Need to discuss how"
- Status: ⚠️ NEED TO VERIFY/CREATE
- Priority: MEDIUM (discuss auto-generation approach)

**Note:** Need to determine:
- What is price_group? (Price grouping/category)
- How should it be calculated/auto-generated?
- Based on what fields? (totalPrice? price ranges?)

**Status:** ⏳ TODO - Need clarification on calculation logic

---

### 5. Remove CMI Reports Notice from Page 1
**Location:** Step 1 of 6 (Step0AddressAndRisk component - Page 1)
**Action:** Remove CMI Reports notice message
**File:** `form-app/src/components/steps/Step0AddressAndRisk.tsx`
**Details:**
- Remove the CMI Reports notice section (lines 1835-1842)
- Text to remove: "📁 CMI Reports: Please save CMI reports in the property folder. The folder will be created when you submit the form at the end."
- This notice appears when `packagingEnabled` is true (after "Continue with Packaging" is clicked)

**Status:** ⏳ TODO

---

### 6. Fix Project Address Overwriting Property Address (Route 2)
**Location:** Module 22 (Route 2) - ROUTE-2-MODULE-22-COMPLETE-CODE.js
**Action:** Fix property_address calculation - should not use projectAddress
**File:** `ROUTE-2-MODULE-22-COMPLETE-CODE.js`
**Details:**
- Currently: `property_address` is constructed from `projectAddress` (line 73: `const propertyAddress = `Lot ${lotNumber}, ${projectAddress}`;`)
- Issue: Project Address is overwriting Property Address - they should be separate fields
- `property_address` should be the actual property address (from form data)
- `project_address` should remain as `shared_data.address?.projectAddress` (separate field)
- Need to determine what property_address should map to for Route 2 (probably lot-specific address or form's property address field)

**Status:** ⏳ TODO - Need to determine correct property_address source for Route 2

---

**Last Updated:** January 11, 2026
