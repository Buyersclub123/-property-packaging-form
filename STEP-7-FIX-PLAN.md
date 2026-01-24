# Step 7 - Comprehensive Fix Plan

**Date:** January 21, 2026  
**Purpose:** Detailed plan to fix Step 7 UI and cashflow population logic

---

## 🔍 **Current State Analysis**

### **Step 7 Component (Step7CashflowReview.tsx):**
**Current Sections:**
1. Property Details (beds/baths/garage/land size/etc.)
2. Financial Summary (land/build/total price/rental income)
3. Proximity & Amenities (textarea)
4. Why This Property (textarea)
5. Investment Highlights (textarea)
6. Washington Brown Depreciation (table)
7. Folder Creation Button

**❌ PROBLEM:** These are NOT the 29 fields being mapped to the cashflow spreadsheet!

---

## 🎯 **Required Changes**

### **Step 7 Should Display:**
**ONLY the 29 fields that get written to the cashflow spreadsheet**, in this exact order:

1. Address (read-only)
2. State (read-only)
3. Land Cost (read-only)
4. Build Cost (read-only)
5. Total Cost (read-only, calculated)
6. Cashback Value (read-only)
7. Total Bed (read-only)
8. Total Bath (read-only)
9. Total Garage (read-only)
10. Low Rent (read-only)
11. High Rent (read-only)
12. Council/Water Rates $ (EDITABLE - NEW)
13. Insurance or Insurance & Strata Field (read-only, label)
14. Insurance or Insurance & Strata $ (read-only, conditional 1 or 3 fields)
15. P&B / PCI (read-only, label)
16-25. Depreciation Years 1-10 (read-only)
26. Build Window (EDITABLE if Split Contract)
27. Cashback 1 month (EDITABLE if Split Contract)
28. Cashback 2 month (EDITABLE if Split Contract)

---

## 📋 **Implementation Plan**

### **Phase 1: Update Step 7 UI Component**

#### **1.1 Remove Current Sections**
- ❌ Remove "Property Details" section (beds/baths shown elsewhere)
- ❌ Remove "Financial Summary" section (too broad)
- ❌ Remove "Proximity & Amenities" section (not in cashflow)
- ❌ Remove "Why This Property" section (not in cashflow)
- ❌ Remove "Investment Highlights" section (not in cashflow)
- ✅ Keep "Washington Brown Depreciation" section (but simplify to just show values)

#### **1.2 Create New "Cashflow Spreadsheet Fields" Section**
Replace all sections with ONE comprehensive section showing the 29 fields.

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Cashflow Spreadsheet Review                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Collapsible] Property Information                  │
│   • Address: 13 ACACIA ST, POINT VERNON QLD 4655    │
│   • State: QLD                                       │
│                                                      │
│ [Collapsible] Financial Details                     │
│   • Land Cost: $450,000 (Split Contract only)       │
│   • Build Cost: $150,000 (Split Contract only)      │
│   • Total Cost: $600,000                            │
│   • Cashback Value: $15,000                         │
│                                                      │
│ [Collapsible] Property Features                     │
│   • Total Bed: 3 + 2                                │
│   • Total Bath: 2 + 1                               │
│   • Total Garage: 1 + 0                             │
│                                                      │
│ [Collapsible] Rental Income                         │
│   • Low Rent: $750                                  │
│   • High Rent: $850                                 │
│                                                      │
│ [Collapsible] Costs & Reports (EDITABLE)            │
│   • Council/Water Rates $: [INPUT] (mandatory)      │
│   • Insurance Type: Insurance & Strata              │
│   • Insurance Breakdown:                            │
│       - Annualised Body Corp: $1,000                │
│       - Insurance: $2,500                           │
│       - Total: $3,500                               │
│   • P&B / PCI: P&B + PCI Reports                    │
│                                                      │
│ [Collapsible] Depreciation Schedule                 │
│   • Year 1: $18,500                                 │
│   • Year 2: $17,200                                 │
│   ... (Years 3-10)                                  │
│                                                      │
│ [Collapsible] Split Contract Fields (EDITABLE)      │
│   • Build Window: [DROPDOWN] (mandatory)            │
│   • Cashback 1 month: [DROPDOWN] (mandatory)        │
│   • Cashback 2 month: [DROPDOWN] (mandatory)        │
│                                                      │
│ [Create Folder Button]                              │
└─────────────────────────────────────────────────────┘
```

#### **1.3 Add Editable Fields**
- Council/Water Rates $ (numeric input, always mandatory)
- Build Window (dropdown: 09 mo, 12 mo, 15 mo, 18 mo - mandatory if Split Contract)
- Cashback 1 month (dropdown: 1-18 - mandatory if Split Contract)
- Cashback 2 month (dropdown: 1-18 - mandatory if Split Contract)

#### **1.4 Add Validation**
Before allowing "Create Folder" button to be clicked:
- Validate Council/Water Rates $ is filled
- If Split Contract: Validate Build Window, Cashback 1 month, Cashback 2 month are filled

---

### **Phase 2: Fix Spreadsheet Population Logic**

#### **2.1 Remove Direct Cell Writes**
**File:** `form-app/src/lib/googleDrive.ts` (lines 924-989)

**Action:** Delete all direct writes to B14-B27

#### **2.2 Add Missing Field Handlers**
Add to `calculateValue()` function:

**A. Council/Water Rates $ (Row 13)**
```typescript
if (fieldLower.includes('council') && fieldLower.includes('water') && fieldLower.includes('rates')) {
  return formData.councilWaterRates || '';
}
```

**B. Insurance or Insurance & Strata Field (Row 14)**
```typescript
if (fieldLower.includes('insurance') && fieldLower.includes('strata') && fieldLower.includes('field')) {
  const title = formData.propertyDescription?.title?.toLowerCase() || '';
  const strataTypes = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'];
  const isStrata = strataTypes.some(type => title.includes(type));
  return isStrata ? 'Insurance & Strata' : 'Insurance';
}
```

**C. Insurance or Insurance & Strata $ (Row 15)**
```typescript
if (fieldLower.includes('insurance') && fieldLower.includes('strata') && fieldLower.includes('$')) {
  const title = formData.propertyDescription?.title?.toLowerCase() || '';
  const strataTypes = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'];
  const isStrata = strataTypes.some(type => title.includes(type));
  
  if (isStrata) {
    // Mode 2: Calculate total
    const bodyCorpPerQuarter = parseFloat(formData.propertyDescription?.bodyCorpPerQuarter || '0');
    const annualisedBodyCorp = bodyCorpPerQuarter * 4;
    const insurance = parseFloat(formData.insuranceAmount || '0');
    return String(annualisedBodyCorp + insurance);
  } else {
    // Mode 1: Just insurance
    return formData.insuranceAmount || '';
  }
}
```

**D. P&B / PCI (Row 16)**
```typescript
if (fieldLower.includes('p&b') || fieldLower.includes('pci')) {
  const propertyType = formData.decisionTree?.propertyType;
  if (propertyType === 'New') {
    return 'P&B + PCI Reports';
  } else {
    return 'Pest & Build (P&B) report';
  }
}
```

**E. Build Window (Row 27)**
```typescript
if (fieldLower.includes('build window')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.buildWindow || '';
  }
  return '';
}
```

**F. Cashback 1 month (Row 28)**
```typescript
if (fieldLower.includes('cashback 1 month')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.cashback1Month || '';
  }
  return '';
}
```

**G. Cashback 2 month (Row 29)**
```typescript
if (fieldLower.includes('cashback 2 month')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.cashback2Month || '';
  }
  return '';
}
```

#### **2.3 Fix Total Cost Logic**
**Current code (line 773-785):**
```typescript
if (fieldLower.includes('total cost')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    const land = parseFloat(formData.purchasePrice?.landPrice || '0');
    const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
    if (land && build) {
      return String(land + build);
    }
  }
  return formData.purchasePrice?.totalPrice || '';
}
```

**Replace with:**
```typescript
if (fieldLower.includes('total cost')) {
  const contractType = formData.decisionTree?.contractTypeSimplified;
  const propertyType = formData.decisionTree?.propertyType;
  
  if (contractType === 'Split Contract') {
    // Calculate: landPrice + buildPrice (both mandatory)
    const land = parseFloat(formData.purchasePrice?.landPrice || '0');
    const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
    return String(land + build);
  } else if (propertyType === 'New') {
    // Use totalPrice
    return formData.purchasePrice?.totalPrice || '';
  } else {
    // Established - use acceptedAcquisitionPriceTo
    return formData.purchasePrice?.acceptedAcquisitionPriceTo || '';
  }
}
```

---

### **Phase 3: Update FormData Types**

#### **3.1 Add New Fields to FormData Interface**
**File:** `form-app/src/types/form.ts`

Add to FormData interface:
```typescript
councilWaterRates?: string;
buildWindow?: string;
cashback1Month?: string;
cashback2Month?: string;
```

---

### **Phase 4: File Renaming**

#### **4.1 Add Photos.docx Renaming**
**File:** `form-app/src/app/api/create-property-folder/route.ts`

After folder creation, find and rename Photos.docx:

```typescript
// Find Photos.docx
const photosDoc = files.find(f => 
  f.name.toLowerCase().includes('photos') && 
  f.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
);

if (photosDoc) {
  const newPhotosName = `Photos ${addressString}.docx`;
  await renameFile(photosDoc.id, newPhotosName, SHARED_DRIVE_ID);
  console.log(`✓ Renamed Photos document to: ${newPhotosName}`);
}
```

#### **4.2 Fix CF Spreadsheet Renaming**
**Current code (line 164):**
```typescript
const newName = `CF HL spreadsheet (${addressString})`;
```

**Replace with:**
```typescript
const newName = `CF spreadsheet ${addressString}`;
```

---

## 📊 **Testing Checklist**

### **Step 7 UI:**
- [ ] Shows all 29 fields in correct order
- [ ] Read-only fields are not editable
- [ ] Editable fields (Council/Water Rates, Build Window, Cashback months) are editable
- [ ] Insurance breakdown shows 1 field for non-strata, 3 fields for strata
- [ ] Split Contract fields only show if Split Contract
- [ ] Validation prevents folder creation if mandatory fields empty
- [ ] "Edit" buttons navigate to correct steps

### **Spreadsheet Population:**
- [ ] All 29 fields write to correct rows via keyword matching
- [ ] No direct cell writes (B14-B27 removed)
- [ ] Total Cost uses correct logic (Split/New/Established)
- [ ] Insurance $ calculates correctly for strata properties
- [ ] P&B/PCI text matches requirements
- [ ] Build Window, Cashback months only populate for Split Contract
- [ ] Depreciation values populate correctly

### **File Renaming:**
- [ ] Folder renamed to address
- [ ] Photos.docx renamed to `Photos {ADDRESS}.docx`
- [ ] CF spreadsheet renamed to `CF spreadsheet {ADDRESS}`
- [ ] Irrelevant contract spreadsheet deleted

---

## 🚀 **Implementation Order**

1. ✅ Update FormData types (add new fields)
2. ✅ Fix googleDrive.ts (remove direct writes, add missing handlers, fix Total Cost)
3. ✅ Fix file renaming logic
4. ✅ Rewrite Step7CashflowReview.tsx component
5. ✅ Test with real data

---

**Estimated Time:** 2-3 hours  
**Priority:** HIGH - Blocking folder creation functionality

**Document by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready to implement
