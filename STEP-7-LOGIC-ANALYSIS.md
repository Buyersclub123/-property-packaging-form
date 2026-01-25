# Step 7 - Cashflow Spreadsheet Population Logic Analysis

**Date:** January 21, 2026  
**Purpose:** Compare expected logic vs actual implementation

---

## 🔍 **CRITICAL FINDING**

The current code uses **TWO DIFFERENT METHODS** to write data:

### **Method 1: Keyword Matching (Rows 2-13)**
- Reads Column A field names
- Searches for keyword match
- Writes to Column B at matching row

### **Method 2: Direct Cell Writes (Rows 14-27)**
- Hardcoded cell addresses (B14, B15, B16, etc.)
- Does NOT check Column A field names
- Writes directly to specific cells

---

## ❌ **THE PROBLEM**

**Method 2 is WRONG!** All fields should use **Method 1 (Keyword Matching)**.

### **Why this matters:**
- If spreadsheet row order changes, Method 2 breaks
- Method 2 doesn't verify field names exist
- Inconsistent approach causes confusion

---

## 📋 **Field-by-Field Comparison**

| Row | Field Name | Expected Method | Actual Method | Status |
|-----|------------|-----------------|---------------|--------|
| 2 | Address | Keyword Match | Keyword Match | ✅ Correct |
| 3 | State | Keyword Match | Keyword Match | ✅ Correct |
| 4 | Land Cost | Keyword Match | Keyword Match | ✅ Correct |
| 5 | Build Cost | Keyword Match | Keyword Match | ✅ Correct |
| 6 | Total Cost | Keyword Match | Keyword Match | ⚠️ Logic needs update |
| 7 | Cashback Value | Keyword Match | Keyword Match | ✅ Correct |
| 8 | Total Bed | Keyword Match | Keyword Match | ✅ Correct |
| 9 | Total Bath | Keyword Match | Keyword Match | ✅ Correct |
| 10 | Total Garage | Keyword Match | Keyword Match | ✅ Correct |
| 11 | Low Rent | Keyword Match | Keyword Match | ✅ Correct |
| 12 | High Rent | Keyword Match | Keyword Match | ✅ Correct |
| 13 | Council/Water Rates $ | Keyword Match | ❌ **MISSING** | ❌ Not implemented |
| 14 | Insurance or Insurance & Strata Field | Keyword Match | ❌ Direct Write (B14) | ❌ Wrong method |
| 15 | Insurance or Insurance & Strata $ | Keyword Match | ❌ Direct Write (B15) | ❌ Wrong method + wrong logic |
| 16 | P&B / PCI | Keyword Match | ❌ Direct Write (B16) | ❌ Wrong method + wrong logic |
| 17 | Depreciation Year 1 | Keyword Match | ❌ Direct Write (B17) | ❌ Wrong method |
| 18 | Depreciation Year 2 | Keyword Match | ❌ Direct Write (B18) | ❌ Wrong method |
| 19 | Depreciation Year 3 | Keyword Match | ❌ Direct Write (B19) | ❌ Wrong method |
| 20 | Depreciation Year 4 | Keyword Match | ❌ Direct Write (B20) | ❌ Wrong method |
| 21 | Depreciation Year 5 | Keyword Match | ❌ Direct Write (B21) | ❌ Wrong method |
| 22 | Depreciation Year 6 | Keyword Match | ❌ Direct Write (B22) | ❌ Wrong method |
| 23 | Depreciation Year 7 | Keyword Match | ❌ Direct Write (B23) | ❌ Wrong method |
| 24 | Depreciation Year 8 | Keyword Match | ❌ Direct Write (B24) | ❌ Wrong method |
| 25 | Depreciation Year 9 | Keyword Match | ❌ Direct Write (B25) | ❌ Wrong method |
| 26 | Depreciation Year 10 | Keyword Match | ❌ Direct Write (B26) | ❌ Wrong method |
| 27 | Build Window | Keyword Match | ❌ **MISSING** | ❌ Not implemented |
| 28 | Cashback 1 month | Keyword Match | ❌ **MISSING** | ❌ Not implemented |
| 29 | Cashback 2 month | Keyword Match | ❌ **MISSING** | ❌ Not implemented |

---

## 🐛 **Specific Issues Found**

### **Issue 1: Total Cost Logic (Row 6)**
**Current Code:**
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
  // For single contracts or if calculation fails, use totalPrice
  return formData.purchasePrice?.totalPrice || '';
}
```

**Required Logic:**
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

### **Issue 2: Council/Water Rates $ (Row 13) - MISSING**
**Status:** Not implemented at all

**Required Logic:**
```typescript
if (fieldLower.includes('council') && fieldLower.includes('water') && fieldLower.includes('rates')) {
  return formData.councilWaterRates || '';
}
```

---

### **Issue 3: Insurance or Insurance & Strata Field (Row 14) - WRONG METHOD**
**Current Code:** Direct write to B14 (hardcoded)

**Required Logic:** Keyword matching with this logic:
```typescript
if (fieldLower.includes('insurance') && fieldLower.includes('strata') && fieldLower.includes('field')) {
  const title = formData.propertyDescription?.title?.toLowerCase() || '';
  const strataTypes = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'];
  const isStrata = strataTypes.includes(title);
  return isStrata ? 'Insurance & Strata' : 'Insurance';
}
```

---

### **Issue 4: Insurance or Insurance & Strata $ (Row 15) - WRONG METHOD + WRONG LOGIC**
**Current Code:** Direct write to B15, simple value

**Required Logic:** Keyword matching with complex calculation:
```typescript
if (fieldLower.includes('insurance') && fieldLower.includes('strata') && fieldLower.includes('$')) {
  const title = formData.propertyDescription?.title?.toLowerCase() || '';
  const strataTypes = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'];
  const isStrata = strataTypes.includes(title);
  
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

---

### **Issue 5: P&B / PCI (Row 16) - WRONG METHOD + WRONG LOGIC**
**Current Code:** Direct write to B16, simple logic

**Required Logic:** Keyword matching with correct text:
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

---

### **Issue 6: Depreciation Years 1-10 (Rows 17-26) - WRONG METHOD**
**Current Code:** Direct writes to B17-B26 (hardcoded)

**Required Logic:** Already implemented in keyword matching (lines 838-865), but being overridden by direct writes

**Fix:** Remove direct writes, rely on keyword matching

---

### **Issue 7: Build Window (Row 27) - MISSING**
**Status:** Not implemented at all

**Required Logic:**
```typescript
if (fieldLower.includes('build window')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.buildWindow || '';
  }
  return '';
}
```

---

### **Issue 8: Cashback 1 month (Row 28) - MISSING**
**Status:** Not implemented at all

**Required Logic:**
```typescript
if (fieldLower.includes('cashback 1 month')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.cashback1Month || '';
  }
  return '';
}
```

---

### **Issue 9: Cashback 2 month (Row 29) - MISSING**
**Status:** Not implemented at all

**Required Logic:**
```typescript
if (fieldLower.includes('cashback 2 month')) {
  const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
  if (isSplitContract) {
    return formData.cashback2Month || '';
  }
  return '';
}
```

---

## 📊 **Summary**

### **Issues Found:**
- ❌ 1 field with incorrect logic (Total Cost)
- ❌ 14 fields using wrong method (direct writes instead of keyword matching)
- ❌ 3 fields completely missing (Council/Water Rates, Build Window, Cashback months)
- ❌ 2 fields with wrong logic (Insurance $, P&B/PCI)

### **Total Defects:** 20 issues across 30 fields

### **Success Rate:** 10/30 fields correct (33%)

---

## 🔧 **Recommended Fix Approach**

1. **Remove all direct writes** (lines 924-989 in googleDrive.ts)
2. **Add missing field handlers** to `calculateValue()` function
3. **Fix Total Cost logic** for Established properties
4. **Fix Insurance $ calculation** for strata properties
5. **Fix P&B/PCI text** to match requirements
6. **Test with actual spreadsheet** to verify keyword matching works

---

**Document by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Analysis complete - Ready for fixes
