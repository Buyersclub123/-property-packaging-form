# Contract Type Behavior Analysis

**Date:** 2026-01-15  
**Purpose:** Document how Contract Type affects form behavior, field display, and calculations in the property review form.

---

## Contract Type Values

The form uses these Contract Type values (mapped to GHL `deal_type` field):

1. **`01_hl_comms`** - "01 H&L Comms" (House & Land with Commission)
2. **`02_single_comms`** - "02 Single Comms" (Single Contract with Commission)
3. **`03_internal_with_comms`** - "03 Internal with Comms" (Internal with Commission)
4. **`04_internal_nocomms`** - "04 Internal No-Comms" (Internal without Commission)
5. **`05_established`** - "05 Established" (Established Properties)

---

## Key Behaviors by Contract Type

### 1. **Cashback/Rebate Fields** (`cashbackRebateValue`, `cashbackRebateType`)

**Shown for:** `01_hl_comms`, `02_single_comms`, `03_internal_with_comms`

**Hidden for:** `04_internal_nocomms`, `05_established`

**Default Values:**
- `cashbackRebateValue`: Defaults to `"20000"` ($20,000) when contract type requires it
- `cashbackRebateType`: Defaults to `"cashback"` when contract type requires it

**Location:** `Step2PropertyDetails.tsx` lines 106-128, 1020-1070

---

### 2. **Purchase Price Fields Structure**

#### **Contract Type `01_hl_comms` (H&L Comms)**
- **Shows:** Land Price + Build Price fields
- **Hides:** Total Price field
- **Calculation:** Total Price = Land Price + Build Price (auto-calculated)
- **Net Price:** Total Price - Cashback Value (if Cashback type selected)
- **Hides:** Acceptable Acquisition From/To (only for Established)

**Location:** `Step2PropertyDetails.tsx` lines 958-1018

#### **Contract Type `02_single_comms` (Single Comms)**
- **Shows:** Total Price field (single field instead of Land + Build)
- **Hides:** Land Price and Build Price fields
- **Calculation:** Total Price = value entered directly
- **Net Price:** Total Price - Cashback Value (if Cashback type selected)
- **Hides:** Acceptable Acquisition From/To (only for Established)

**Location:** `Step2PropertyDetails.tsx` lines 926-956

#### **Contract Type `03_internal_with_comms`**
- **Behavior:** Same as `01_hl_comms` or `02_single_comms` depending on property structure
- **Shows:** Cashback/Rebate fields

#### **Contract Type `04_internal_nocomms`**
- **Behavior:** Same as `01_hl_comms` or `02_single_comms` depending on property structure
- **Hides:** Cashback/Rebate fields (no commission)

#### **Contract Type `05_established`**
- **Shows:** Acceptable Acquisition From + Acceptable Acquisition To fields
- **Hides:** Land Price, Build Price, Total Price, Cashback/Rebate, Net Price
- **Calculation:** Uses Acceptable Acquisition To for yield calculations

**Location:** `Step2PropertyDetails.tsx` lines 1112-1176

---

### 3. **Total Price Calculation Logic**

**For Single Contract (`02_single_comms`):**
```typescript
// Uses totalPrice field directly
if (isSingleContract && purchasePrice?.totalPrice) {
  const total = parseFloat(parseCurrency(purchasePrice.totalPrice));
  return isNaN(total) ? null : total;
}
```

**For H&L (`01_hl_comms`, `03_internal_with_comms`, `04_internal_nocomms`):**
```typescript
// Calculates Land + Build
const landPrice = parseFloat(parseCurrency(purchasePrice.landPrice));
const buildPrice = parseFloat(parseCurrency(purchasePrice.buildPrice));
return landPrice + buildPrice;
```

**Location:** `Step2PropertyDetails.tsx` lines 154-178

---

### 4. **Net Price Calculation**

**Only calculated for:**
- Contract Types: `01_hl_comms`, `02_single_comms`, `03_internal_with_comms`
- AND: `cashbackRebateType === 'cashback'` (not for Rebate types)

**Formula:** `Net Price = Total Price - Cashback Value`

**Location:** `Step2PropertyDetails.tsx` lines 180-194

**Note:** Net Price is **NOT** used for yield calculations - only Total Price or Acceptable Acquisition To is used.

---

### 5. **Cashflow Spreadsheet Links**

**Contract Type `01_hl_comms`:**
- **Shows:** House & Land Cashflow Spreadsheet link field
- **Hides:** General Cashflow Spreadsheet link field

**Contract Types `02_single_comms`, `03_internal_with_comms`, `04_internal_nocomms`, `05_established`:**
- **Shows:** General Cashflow Spreadsheet link field
- **Hides:** House & Land Cashflow Spreadsheet link field

**Location:** `CashflowLinksSection.tsx` lines 29-35

---

### 6. **Price Group Calculation**

**Uses:** Total Price (for H&L/New) OR Acceptable Acquisition To (for Established)

**NOT uses:** Net Price (even if calculated)

**Location:** `Step2PropertyDetails.tsx` lines 214-230

---

## Contract Type Detection in Code

```typescript
// Check if Contract Type has cashback/rebate
const hasCashbackRebate = decisionTree.contractType === '01_hl_comms' || 
                          decisionTree.contractType === '02_single_comms' || 
                          decisionTree.contractType === '03_internal_with_comms';

// Check if Contract Type is 02 Single Comms (uses Total Price instead of Land + Build)
const isSingleContract = decisionTree.contractType === '02_single_comms';
```

**Location:** `Step2PropertyDetails.tsx` lines 106-112

---

## Field Clearing Behavior

**Issue:** When Contract Type changes, cashback/rebate fields are NOT automatically cleared.

**Current Behavior:**
- Fields are hidden when contract type changes to `04_internal_nocomms` or `05_established`
- But values persist in form state
- If user switches back, old values reappear

**Location:** Documented in `CONDITIONAL-FIELDS-CLEARING-ANALYSIS.md` (lines 40-52)

---

## Projects (Multiple Lots)

For Projects, Contract Type behavior applies to **each lot individually**:

- Each lot can have its own purchase price structure (Land + Build OR Total Price)
- Cashback/Rebate defaults are auto-populated from project-level values
- Same calculation logic applies per lot

**Location:** `Step2PropertyDetails.tsx` lines 2265-2291 (lot-level logic)

---

## Summary Matrix

| Contract Type | Land + Build | Total Price | Cashback/Rebate | Net Price | Acceptable Acquisition | Cashflow Template |
|---------------|--------------|-------------|-----------------|-----------|------------------------|-------------------|
| `01_hl_comms` | ✅ | ❌ (calculated) | ✅ | ✅ (if Cashback) | ❌ | H&L Template |
| `02_single_comms` | ❌ | ✅ | ✅ | ✅ (if Cashback) | ❌ | General Template |
| `03_internal_with_comms` | ✅/❌* | ✅/❌* | ✅ | ✅ (if Cashback) | ❌ | General Template |
| `04_internal_nocomms` | ✅/❌* | ✅/❌* | ❌ | ❌ | ❌ | General Template |
| `05_established` | ❌ | ❌ | ❌ | ❌ | ✅ | General Template |

\* Depends on property structure (H&L vs Single Contract)

---

## Notes for Email Template (Make.com Module 3)

1. **Contract Type maps to `deal_type` field in GHL:**
   - `01_hl_comms` → `"01_hl_comms"`
   - `02_single_comms` → `"02_single_comms"`
   - etc.

2. **Purchase Price section should handle:**
   - H&L: Land Price + Build Price display
   - Single Contract: Total Price display
   - Cashback scenarios: Net Price calculation and display
   - Established: Acceptable Acquisition From/To display

3. **Current code in `MODULE-3-COMPLETE-FOR-MAKE.js`:**
   - Uses `deal_type` to determine property type (`isHAndL`, `isSMSF`, `isEstablished`)
   - Does NOT currently handle cashback/rebate scenarios in email template
   - Does NOT differentiate between H&L (Land + Build) vs Single Contract (Total Price) in email display

---

## Recommendations

1. **Email Template Enhancement:** Add logic to display Land + Build vs Total Price based on `deal_type`
2. **Cashback/Rebate Display:** Implement cashback/rebate display in email template (currently not shown)
3. **Field Clearing:** Add logic to clear cashback/rebate fields when contract type changes to non-cashback types
4. **Documentation:** Update email template documentation to reflect contract type behaviors
