# Cashflow Spreadsheet - Complete Field Mapping

**Date:** January 21, 2026  
**Purpose:** Document ALL fields being pushed to the cashflow spreadsheet

---

## 📊 **Tab: "Autofill data"**

All fields are written to Column B, with field names in Column A.

---

## 🗺️ **Field Mapping (Rows 1-27)**

### **Row 2: Address**
- **Cell:** B2
- **Tab:** Autofill data
- **Source:** `formData.address.propertyAddress`
- **Logic:** Simple - Direct copy
- **Example:** "13 ACACIA ST, POINT VERNON QLD 4655"

---

### **Row 3: State**
- **Cell:** B3
- **Tab:** Autofill data
- **Source:** `formData.address.state`
- **Logic:** **Transform to 3-letter uppercase code**
  - "Queensland" → "QLD"
  - "New South Wales" → "NSW"
  - "Victoria" → "VIC"
  - "South Australia" → "SA"
  - "Western Australia" → "WA"
  - "Tasmania" → "TAS"
  - "Northern Territory" → "NT"
  - "Australian Capital Territory" → "ACT"
- **Example:** "QLD"

---

### **Row 4: Land Cost**
- **Cell:** B4
- **Tab:** Autofill data
- **Source:** `formData.purchasePrice.landPrice`
- **Logic:** **Conditional**
  - IF `contractTypeSimplified === 'Split Contract'` → Use `landPrice`
  - ELSE → Empty (blank)
- **Example:** "450000" (Split Contract) or "" (Single Contract)

---

### **Row 5: Build Cost**
- **Cell:** B5
- **Tab:** Autofill data
- **Source:** `formData.purchasePrice.buildPrice`
- **Logic:** **Conditional**
  - IF `contractTypeSimplified === 'Split Contract'` → Use `buildPrice`
  - ELSE → Empty (blank)
- **Example:** "150000" (Split Contract) or "" (Single Contract)

---

### **Row 6: Total Cost**
- **Cell:** B6
- **Tab:** Autofill data
- **Source:** `formData.purchasePrice.totalPrice`
- **Logic:** **Conditional calculation**
  - IF `contractTypeSimplified === 'Split Contract'`:
    - Calculate: `landPrice + buildPrice` (if both exist)
    - Fallback: Use `totalPrice`
  - ELSE (Single Contract):
    - Use `totalPrice` directly
- **Example:** "600000"

---

### **Row 7: Cashback Value**
- **Cell:** B7
- **Tab:** Autofill data
- **Source:** `formData.purchasePrice.cashbackRebateValue` + `formData.purchasePrice.cashbackRebateType`
- **Logic:** **Conditional**
  - IF `cashbackRebateType === 'cashback'` → Use `cashbackRebateValue`
  - ELSE → Empty (blank)
- **Example:** "15000" (if cashback) or "" (if rebate/none)

---

### **Row 8: Total Bed**
- **Cell:** B8
- **Tab:** Autofill data
- **Source:** `formData.propertyDescription.bedsPrimary` + `formData.propertyDescription.bedsSecondary`
- **Logic:** **Dual Occupancy Check**
  - IF Dual Occupancy → Format: "Primary + Secondary" (e.g., "3 + 2")
  - ELSE → Just Primary (e.g., "3")
- **Dual Occupancy Check:**
  - `decisionTree.dualOccupancy === 'Yes'` OR
  - `bedsSecondary` exists OR
  - `bathSecondary` exists OR
  - `garageSecondary` exists
- **Example:** "3 + 2" (dual) or "3" (single)

---

### **Row 9: Total Bath**
- **Cell:** B9
- **Tab:** Autofill data
- **Source:** `formData.propertyDescription.bathPrimary` + `formData.propertyDescription.bathSecondary`
- **Logic:** **Dual Occupancy Check** (same as Bed)
  - IF Dual Occupancy → Format: "Primary + Secondary" (e.g., "2 + 1")
  - ELSE → Just Primary (e.g., "2")
- **Example:** "2 + 1" (dual) or "2" (single)

---

### **Row 10: Total Garage**
- **Cell:** B10
- **Tab:** Autofill data
- **Source:** `formData.propertyDescription.garagePrimary` + `formData.propertyDescription.garageSecondary`
- **Logic:** **Dual Occupancy Check** (same as Bed/Bath)
  - IF Dual Occupancy → Format: "Primary + Secondary" (e.g., "1 + 0")
  - ELSE → Just Primary (e.g., "1")
- **Example:** "1 + 0" (dual) or "1" (single)

---

### **Row 11: Low Rent**
- **Cell:** B11
- **Tab:** Autofill data
- **Source:** `formData.rentalAssessment.rentAppraisalPrimaryFrom` + `formData.rentalAssessment.rentAppraisalSecondaryFrom`
- **Logic:** **Dual Occupancy Calculation**
  - IF Dual Occupancy AND `secondaryFrom > 0`:
    - Calculate: `primaryFrom + secondaryFrom`
  - ELSE:
    - Use `primaryFrom` only
- **Example:** "750" (450 + 300 for dual) or "450" (single)

---

### **Row 12: High Rent**
- **Cell:** B12
- **Tab:** Autofill data
- **Source:** `formData.rentalAssessment.rentAppraisalPrimaryTo` + `formData.rentalAssessment.rentAppraisalSecondaryTo`
- **Logic:** **Dual Occupancy Calculation** (same as Low Rent)
  - IF Dual Occupancy AND `secondaryTo > 0`:
    - Calculate: `primaryTo + secondaryTo`
  - ELSE:
    - Use `primaryTo` only
- **Example:** "850" (500 + 350 for dual) or "500" (single)

---

### **Row 13: (Unknown - Need to check)**
- **Cell:** B13
- **Tab:** Autofill data
- **Source:** TBD
- **Logic:** TBD

---

### **Row 14: Rates**
- **Cell:** B14
- **Tab:** Autofill data
- **Source:** `formData.rates`
- **Logic:** Simple - Direct copy
- **Example:** "2500" (quarterly council rates)

---

### **Row 15: Insurance Type**
- **Cell:** B15
- **Tab:** Autofill data
- **Source:** `formData.insuranceType`
- **Logic:** **Auto-determined based on title**
  - IF title contains "strata" OR "owners corp" → "Insurance + Strata"
  - ELSE → "Insurance"
- **Example:** "Insurance" or "Insurance + Strata"

---

### **Row 16: Insurance Amount**
- **Cell:** B16
- **Tab:** Autofill data
- **Source:** `formData.insuranceAmount`
- **Logic:** Simple - Direct copy
- **Example:** "1500" (annual insurance cost)

---

### **Row 17: P&B/PCI Report**
- **Cell:** B17
- **Tab:** Autofill data
- **Source:** `formData.pbPciReport`
- **Logic:** **Auto-determined based on property type**
  - IF property type === "Established" → "P&B" (Pest & Building)
  - IF property type === "New" OR "Off-Plan" → "PCI" (Practical Completion Inspection)
- **Example:** "P&B" or "PCI"

---

### **Rows 18-27: Depreciation Years 1-10**
- **Cells:** B18-B27
- **Tab:** Autofill data
- **Source:** `formData.depreciation.year1` through `formData.depreciation.year10`
- **Logic:** Simple - Direct copy for each year
- **Field Name Patterns Recognized:**
  - "Depreciation Year 1" or "Year 1 Depreciation" or "Depreciation 1"
  - Matches years 1-10
- **Example:**
  - B18: "18500" (Year 1)
  - B19: "17200" (Year 2)
  - ...
  - B27: "6800" (Year 10)

---

## 📝 **Summary**

**Total Fields:** 26 fields (B2-B27)
- **Simple (Direct Copy):** 4 fields (Address, Rates, Insurance Amount, Depreciation Years)
- **Transform:** 1 field (State - to 3-letter code)
- **Conditional:** 4 fields (Land Cost, Build Cost, Cashback, P&B/PCI)
- **Calculation:** 1 field (Total Cost)
- **Dual Occupancy Logic:** 5 fields (Bed, Bath, Garage, Low Rent, High Rent)
- **Auto-Determined:** 1 field (Insurance Type)

---

## ❓ **Questions to Resolve:**

1. **Row 13:** What field goes here? (Between High Rent and Rates)
2. **Proximity Data:** Is this pushed to the spreadsheet? If so, which cell?
3. **AI Content ("Why This Property"):** Is this pushed? Which cell?
4. **Investment Highlights:** Is this pushed? Which cell?

---

**Document by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for review and validation
