# Data Persistence Analysis - Critical Issues

**Date:** 2026-01-08  
**Issue:** Old form data may persist when users go back and change property types, causing conflicts in email/Deal Sheet population.

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### 1. **Project vs H&L/Established Data Conflict**

**Problem:**
The form stores data in TWO separate places:
- **For Projects (Multiple Lots):** Data stored in `formData.lots[]` array
  - Each lot has: `propertyDescription`, `purchasePrice`, `rentalAssessment`
- **For H&L/Established:** Data stored directly in `formData.propertyDescription`, `formData.purchasePrice`, `formData.rentalAssessment`

**Risk Scenario:**
1. User selects **Project (Multiple)** → fills `lots[0].propertyDescription`, `lots[0].purchasePrice`, etc.
2. User goes back to Step 1, changes to **H&L (Individual)**
3. `lots` array is cleared ✅ (via `updateLots([])`)
4. BUT old `propertyDescription`, `purchasePrice`, `rentalAssessment` at root level may still exist from a previous H&L entry
5. When submitting, BOTH sets of data might exist, causing confusion in email/Deal Sheet population

**Current Clearing Logic:**
- `clearStep2Data()` exists but is only called explicitly (via "Reset Form" button)
- `clearDependentAddressFields()` only clears address fields (lot/unit numbers), not Step 2 data
- NO automatic clearing when switching between Project ↔ H&L/Established

**Code Location:**
- Store: `src/store/formStore.ts` - `updatePropertyDescription`, `updatePurchasePrice`, `updateRentalAssessment` use spread operators (merge, don't replace)
- Clearing: `src/components/steps/Step1DecisionTree.tsx` - Only clears address fields, not Step 2 data

---

### 2. **Secondary Fields Persistence (Dual Occupancy)**

**Problem:**
When `dualOccupancy` changes from "Yes" → "No":
- Secondary fields (`bedsSecondary`, `bathSecondary`, etc.) are hidden but NOT cleared
- Data remains in `propertyDescription` object
- When exporting, old secondary field values may appear in email/Deal Sheet

**Current Clearing Logic:**
- Partial clearing exists in Title change (for bodyCorp fields) ✅
- NO clearing for secondary fields when dualOccupancy changes ❌

**Code Location:**
- `src/components/steps/Step2PropertyDetails.tsx` - Secondary fields conditionally rendered but not cleared

---

### 3. **Body Corp Fields Partial Clearing**

**Problem:**
When Title changes from Strata/Owners Corp → Other:
- `bodyCorpPerQuarter` is cleared ✅
- `bodyCorpDescription` is cleared ✅
- BUT this only happens in Title dropdown onChange handler
- If Title is changed programmatically or through other means, fields may persist

**Current Clearing Logic:**
- ✅ Clearing exists in Title onChange handlers
- ⚠️ Only works when Title dropdown is changed directly

**Code Location:**
- `src/components/steps/Step2PropertyDetails.tsx` lines 668-674 (main), 3137-3142 (lot-level)

---

### 4. **Conditional Field Persistence (Build Size, Land Registration, etc.)**

**Problem:**
Fields that are conditionally shown/hidden based on property type:
- **Build Size:** Only for H&L (New + Individual)
- **Land Registration:** Only for Projects
- **Cashback/Rebate:** Only for certain contract types
- **Land Price / Build Price:** Only for H&L

When property type changes, these fields are hidden but NOT cleared. Old values persist.

**Current Clearing Logic:**
- ❌ NO automatic clearing when property types change

---

### 5. **Excel Export Includes All Data (Both Sets)**

**Problem:**
The Excel export (`exportFormDataToExcel`) exports BOTH:
- `propertyDescription`, `purchasePrice`, `rentalAssessment` (root level)
- `lots[]` array (if exists)

If both exist, the export will show both, which could confuse Make.com/GHL/Deal Sheet population logic.

**Code Location:**
- `src/lib/excelExport.ts` lines 106-113
- Both sets exported regardless of property type

---

## 🟡 MEDIUM PRIORITY ISSUES

### 6. **Market Performance Data Retention**

**Problem:**
Market Performance data persists in `formData.marketPerformance`
- If user changes suburb/state, old market performance data may remain
- Currently has "data freshness" check but old data structure may persist

**Impact:** Less critical - Market Performance is typically re-fetched on step visit

---

### 7. **Content Sections Persistence**

**Problem:**
`contentSections` (Why This Property, Proximity, Investment Highlights) persists across property type changes
- If switching properties, old content may appear for new property
- No clearing logic when address changes

**Impact:** Medium - User should manually update, but old data shouldn't persist

---

## 🔧 RECOMMENDED FIXES

### Fix 1: Auto-Clear Step 2 Data When Property Type Changes

**Location:** `src/components/steps/Step1DecisionTree.tsx`

**Add to useEffect that handles propertyType/lotType changes:**

```typescript
// When property type changes, clear conflicting Step 2 data
useEffect(() => {
  const isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple';
  const isHAndLOrEstablished = decisionTree.propertyType !== null && 
                               !(decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple');
  
  // If switching TO Project, clear root-level propertyDescription/purchasePrice/rentalAssessment
  if (isProject) {
    updatePropertyDescription({});
    updatePurchasePrice({});
    updateRentalAssessment({});
  }
  
  // If switching FROM Project TO H&L/Established, clear lots array (already done, but ensure it's cleared)
  if (isHAndLOrEstablished && formData.lots && formData.lots.length > 0) {
    updateLots([]);
  }
}, [decisionTree.propertyType, decisionTree.lotType]);
```

---

### Fix 2: Clear Secondary Fields When Dual Occupancy Changes

**Location:** `src/components/steps/Step2PropertyDetails.tsx`

**Add to existing useEffect or create new one:**

```typescript
// Clear secondary fields when dualOccupancy changes from Yes to No
useEffect(() => {
  if (decisionTree.dualOccupancy !== 'Yes' && propertyDescription) {
    // Check if any secondary fields exist
    const hasSecondaryFields = 
      propertyDescription.bedsSecondary ||
      propertyDescription.bathSecondary ||
      propertyDescription.garageSecondary ||
      propertyDescription.carportSecondary ||
      propertyDescription.carspaceSecondary;
    
    if (hasSecondaryFields) {
      updatePropertyDescription({
        bedsSecondary: undefined,
        bathSecondary: undefined,
        garageSecondary: undefined,
        carportSecondary: undefined,
        carspaceSecondary: undefined,
      });
    }
  }
}, [decisionTree.dualOccupancy]);
```

---

### Fix 3: Clear Conditional Fields When Property Type Changes

**Location:** `src/components/steps/Step2PropertyDetails.tsx`

**Add comprehensive clearing logic:**

```typescript
useEffect(() => {
  const isProject = decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Multiple';
  const isHAndL = decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Individual';
  const isEstablished = decisionTree?.propertyType === 'Established';
  const isSingleContract = decisionTree?.contractType === '02 Single Comms';
  
  // Clear Build Size if not H&L
  if (!isHAndL && propertyDescription?.buildSize) {
    updatePropertyDescription({ buildSize: undefined });
  }
  
  // Clear Land Registration if not Project
  if (!isProject && propertyDescription?.landRegistration) {
    updatePropertyDescription({ landRegistration: undefined });
  }
  
  // Clear Cashback/Rebate if not applicable contract type
  const hasCashbackRebate = ['01', '02', '03'].includes(decisionTree?.contractType || '');
  if (!hasCashbackRebate && purchasePrice?.cashbackRebateValue) {
    updatePurchasePrice({
      cashbackRebateValue: undefined,
      cashbackRebateType: undefined,
    });
  }
}, [decisionTree?.propertyType, decisionTree?.lotType, decisionTree?.contractType]);
```

---

### Fix 4: Filter Excel Export by Property Type

**Location:** `src/lib/excelExport.ts`

**Only export relevant data based on property type:**

```typescript
// Determine property type
const isProject = formData.decisionTree?.propertyType === 'New' && 
                  formData.decisionTree?.lotType === 'Multiple';

// Sheet 3: Property Details - Export ONLY relevant data
if (isProject && formData.lots && formData.lots.length > 0) {
  // Export lot data
  formData.lots.forEach((lot, index) => {
    const lotData = flattenObject({
      lotNumber: index + 1,
      propertyDescription: lot.propertyDescription,
      purchasePrice: lot.purchasePrice,
      rentalAssessment: lot.rentalAssessment,
    });
    // ... export logic
  });
} else {
  // Export root-level data (for H&L/Established)
  const propertyDetailsData = flattenObject({
    propertyDescription: formData.propertyDescription,
    purchasePrice: formData.purchasePrice,
    rentalAssessment: formData.rentalAssessment,
  });
  // ... export logic
}
```

---

### Fix 5: Clear Content Sections When Address Changes

**Location:** `src/components/steps/Step0AddressAndRisk.tsx`

**Clear content sections when address is cleared/changed:**

```typescript
// In handleAddressChange or handleGeocode, when address changes significantly
if (addressChanged) {
  updateFormData({
    contentSections: {
      whyThisProperty: undefined,
      proximity: undefined,
      investmentHighlights: undefined,
    },
  });
}
```

---

## 📊 IMPACT ASSESSMENT

### High Risk Scenarios:
1. **Project → H&L Switch:** Old `lots[]` cleared, but old root-level data may exist
2. **H&L → Project Switch:** Root-level data persists while `lots[]` is used
3. **Dual Occupancy Toggle:** Secondary field data persists when hidden

### Medium Risk Scenarios:
1. **Contract Type Change:** Cashback/Rebate fields may persist
2. **Property Type Change:** Build Size, Land Registration may persist
3. **Address Change:** Content sections (Proximity, Investment Highlights) persist

### Low Risk Scenarios:
1. **Market Performance:** Has freshness check, typically re-fetched
2. **Risk Overlays:** Cleared when address changes ✅

---

## ✅ VALIDATION RECOMMENDATIONS

1. **Add Validation on Submit:**
   - Ensure only ONE set of data exists (either `lots[]` OR root-level `propertyDescription`, not both)
   - Validate property type matches data structure

2. **Add Data Sanitization:**
   - Before export/submit, remove undefined/null values
   - Remove fields that shouldn't exist for current property type

3. **Add Console Warnings:**
   - Log when old data is detected and cleared
   - Log when conflicting data structures are found

---

## 🎯 PRIORITY ACTIONS

1. **🔴 URGENT:** Implement Fix 1 (Auto-clear Step 2 data on property type change)
2. **🔴 URGENT:** Implement Fix 4 (Filter Excel export by property type)
3. **🟡 HIGH:** Implement Fix 2 (Clear secondary fields on dual occupancy change)
4. **🟡 HIGH:** Implement Fix 3 (Clear conditional fields on property type change)
5. **🟢 MEDIUM:** Implement Fix 5 (Clear content sections on address change)

---

**Last Updated:** 2026-01-08  
**Next Steps:** Review and implement priority fixes before next deployment


