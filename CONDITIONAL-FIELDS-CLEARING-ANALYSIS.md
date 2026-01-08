# Conditional Fields Clearing Analysis

**Date:** 2026-01-08  
**Issue:** Multiple conditional fields persist when parent field changes, potentially causing incorrect data in emails/Deal Sheets

---

## 🔴 CRITICAL: Fields That Need Clearing Logic

### 1. **Risk Overlay Dialogue Fields** (5 fields)
**Parent Field:** `flood`, `bushfire`, `mining`, `otherOverlay`, `specialInfrastructure`  
**Dependent Fields:** `floodDialogue`, `bushfireDialogue`, `miningDialogue`, `otherOverlayDialogue`, `specialInfrastructureDialogue`

**Current Behavior:**
- When overlay changes from "Yes" → "No", dialogue text remains ❌
- When overlay changes back to "Yes", stale dialogue text appears ❌

**Impact:** Email shows "Flood: No - [old dialogue text]" which is incorrect

**Location:** `src/components/steps/Step0AddressAndRisk.tsx` - `handleOverlayChange` function

---

### 2. **Secondary Property Fields** (5 fields)
**Parent Field:** `dualOccupancy`  
**Dependent Fields:** `bedsSecondary`, `bathSecondary`, `garageSecondary`, `carportSecondary`, `carspaceSecondary`

**Current Behavior:**
- When `dualOccupancy` changes from "Yes" → "No", secondary fields remain ❌
- Fields are hidden but data persists in form state

**Impact:** If user switches back to "Yes", old secondary values appear

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

**Note:** Also affects lot-level secondary fields in Project view

---

### 3. **Cashback/Rebate Fields** (2 fields)
**Parent Field:** `contractType`  
**Dependent Fields:** `cashbackRebateValue`, `cashbackRebateType`

**Current Behavior:**
- When `contractType` changes from "01/02/03" → "04/05", cashback fields remain ❌
- Fields are hidden but data persists

**Impact:** Old cashback values may appear if contract type changes back

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

**Note:** There's a `useEffect` that SETS defaults when contract type requires cashback, but no clearing when it doesn't

---

### 4. **Body Corp Fields** (2 fields) - PARTIALLY HANDLED
**Parent Field:** `title` (in `propertyDescription`)  
**Dependent Fields:** `bodyCorpPerQuarter`, `bodyCorpDescription`

**Current Behavior:**
- ✅ Clearing exists in Title `onChange` handler
- ⚠️ Only works when Title dropdown is changed directly
- ❌ If Title changes programmatically, fields may persist

**Location:** `src/components/steps/Step2PropertyDetails.tsx` lines 668-674 (main), 3137-3142 (lot-level)

---

### 5. **Build Size Field**
**Parent Field:** `propertyType` + `lotType` (must be H&L = New + Individual)  
**Dependent Field:** `buildSize`

**Current Behavior:**
- When property type changes from H&L → Project/Established, `buildSize` remains ❌

**Impact:** Old build size may appear if switching back to H&L

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

---

### 6. **Land Registration Field**
**Parent Field:** `propertyType` + `lotType` (must be Project = New + Multiple)  
**Dependent Field:** `landRegistration`

**Current Behavior:**
- When property type changes from Project → H&L/Established, `landRegistration` remains ❌

**Impact:** Old land registration may appear if switching back to Project

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

---

### 7. **Land Price / Build Price Fields** (2 fields)
**Parent Field:** `propertyType` + `lotType` (must be H&L = New + Individual)  
**Dependent Fields:** `landPrice`, `buildPrice`

**Current Behavior:**
- When property type changes from H&L → Project/Established, price fields remain ❌

**Impact:** Old prices may appear if switching back to H&L

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

**Note:** These are required fields for H&L, so they should be cleared when not applicable

---

### 8. **Total Price Field** (Single Contract)
**Parent Field:** `contractType` (must be "02 Single Comms")  
**Dependent Field:** `totalPrice`

**Current Behavior:**
- When `contractType` changes from "02 Single Comms" → other, `totalPrice` remains ❌

**Impact:** Old total price may appear if switching back to Single Contract

**Location:** `src/components/steps/Step2PropertyDetails.tsx` - No clearing logic exists

---

### 9. **Asking Text Field** - NEEDS VERIFICATION
**Parent Field:** `askingType` (if conditional)  
**Dependent Field:** `askingText`

**Status:** Need to verify if `askingType` controls visibility of `askingText`

**Location:** `src/components/steps/Step2PropertyDetails.tsx` line 814-824

---

## 🟡 MEDIUM PRIORITY: Property Type Changes

### 10. **Project vs H&L/Established Data Conflict**
**Parent Field:** `propertyType` + `lotType`  
**Dependent Data:** Entire `propertyDescription`, `purchasePrice`, `rentalAssessment` objects

**Current Behavior:**
- When switching from H&L/Established → Project, root-level data remains ❌
- When switching from Project → H&L/Established, `lots[]` array may remain ❌

**Impact:** Excel export includes both sets of data, confusing Make.com

**Location:** `src/lib/excelExport.ts` - Exports both regardless of property type

**Note:** This is documented in `DATA-PERSISTENCE-ANALYSIS.md` Fix 1

---

## 📊 Summary

| Field Group | Count | Priority | Status |
|------------|-------|----------|--------|
| Risk Overlay Dialogue | 5 | 🔴 HIGH | ❌ Not cleared |
| Secondary Fields | 5 | 🔴 HIGH | ❌ Not cleared |
| Cashback/Rebate | 2 | 🔴 HIGH | ❌ Not cleared |
| Body Corp | 2 | 🟡 MEDIUM | ⚠️ Partial (onChange only) |
| Build Size | 1 | 🟡 MEDIUM | ❌ Not cleared |
| Land Registration | 1 | 🟡 MEDIUM | ❌ Not cleared |
| Land/Build Price | 2 | 🟡 MEDIUM | ❌ Not cleared |
| Total Price | 1 | 🟡 MEDIUM | ❌ Not cleared |
| **TOTAL** | **19+ fields** | | |

---

## 🔧 Recommended Fix Strategy

### Option A: Fix All at Once (Comprehensive)
- Implement clearing logic for all 19+ fields
- Add `useEffect` hooks to watch parent field changes
- Clear dependent fields when parent changes to incompatible value

**Risk:** Higher chance of breaking existing functionality  
**Time:** Longer implementation  
**Benefit:** Complete solution

### Option B: Fix Critical First (Phased)
- Phase 1: Fix Risk Overlay Dialogue (5 fields) - HIGHEST IMPACT
- Phase 2: Fix Secondary Fields (5 fields) - HIGH IMPACT
- Phase 3: Fix Cashback/Rebate (2 fields) - HIGH IMPACT
- Phase 4: Fix remaining fields (9+ fields) - MEDIUM IMPACT

**Risk:** Lower risk, incremental fixes  
**Time:** Can deploy fixes incrementally  
**Benefit:** Can test each phase independently

---

## ⚠️ Risk Assessment for Fixing Now

**If we fix Risk Overlay Dialogue only:**
- ✅ Low risk - isolated change
- ✅ High impact - prevents incorrect email data
- ✅ Quick to implement and test

**If we fix all fields:**
- ⚠️ Medium risk - multiple changes across multiple files
- ✅ Complete solution
- ⚠️ Requires comprehensive testing

---

## Recommendation

**Start with Risk Overlay Dialogue fields (5 fields)** - This is the user's immediate concern and has the highest risk of incorrect email data.

Then proceed with Secondary Fields and Cashback/Rebate in subsequent phases.

---

**Status:** Analysis complete - Ready for decision on implementation approach


