# Developer Build Spec: Unit Number Persistence Bug Fix

## 1. Overview

**Component:** `Step1DecisionTree.tsx` (Page 2 - Decision Tree)  
**Issue:** Unit Number question resets on every visit to Page 2, losing user's previous selection  
**Objective:** Persist user's "Has Unit Numbers" selection across page navigation

---

## 2. Required Behavior

### 2.1 First Visit to Page 2
- Question "Does this property have a unit number?" **must appear** and be **mandatory**
- User must select "Yes" or "No" before proceeding

### 2.2 Subsequent Visits to Page 2
- If user previously answered "Yes" or "No", **display that selection**
- **Do not re-prompt** the question
- User can still change their answer if needed

### 2.3 Dual Occupancy Auto-Set Logic
- When `dualOccupancy` = "Yes" → auto-set `hasUnitNumbers` = `true`
- When `dualOccupancy` changes from "Yes" to "No"/"null" → clear `hasUnitNumbers` to `undefined` **only if**:
  - Previous value was "Yes" (from auto-set)
  - AND no unit number was entered yet

---

## 3. Technical Implementation

### 3.1 File to Modify
- **Path:** `form-app/src/components/steps/Step1DecisionTree.tsx`

### 3.2 State Management
- **Persisted Field:** `formData.address.hasUnitNumbers`
- **Local State:** `hasUnitNumbers` (must initialize from persisted value on mount)

### 3.3 Code Changes

**Add Import:**
```typescript
import { useState, useEffect, useRef } from 'react';
```

**Add Ref to Track Previous Value:**
```typescript
const prevDualOccupancy = useRef<DualOccupancy | null>(decisionTree.dualOccupancy);
```

**Update useEffect Logic:**
```typescript
useEffect(() => {
  if (decisionTree.dualOccupancy === 'Yes') {
    // Dual Occupancy always requires unit numbers
    if (hasUnitNumbers !== true) {
      setHasUnitNumbers(true);
      updateAddress({ hasUnitNumbers: true });
    }
  } else if (decisionTree.dualOccupancy === 'No' || decisionTree.dualOccupancy === null) {
    // Only reset if we just switched FROM 'Yes' to 'No'/'null'
    if (prevDualOccupancy.current === 'Yes' && hasUnitNumbers === true && !address?.unitNumber) {
      setHasUnitNumbers(undefined);
      updateAddress({ hasUnitNumbers: undefined });
    }
  }
  prevDualOccupancy.current = decisionTree.dualOccupancy;
}, [decisionTree.dualOccupancy]);
```

### 3.4 Key Logic Change

**Before (Buggy):**
- Cleared `hasUnitNumbers` on every mount when `dualOccupancy` was "No"/"null"

**After (Fixed):**
- Only clear `hasUnitNumbers` when user **actively changes** `dualOccupancy` from "Yes" to "No"/"null"
- Use `useRef` to track previous value and detect actual transitions vs. re-renders

---

## 4. Business Rules

| Scenario | Condition | Action |
|----------|-----------|--------|
| **Auto-set** | Dual Occupancy = "Yes" | Set `hasUnitNumbers` = `true` |
| **Auto-clear** | Dual Occupancy changes from "Yes" → "No"/"null" AND no unit number entered | Clear `hasUnitNumbers` to `undefined` |
| **Persist** | User has answered question | Retain selection on navigation back to Page 2 |
| **Protect** | User entered unit number | Never auto-clear `hasUnitNumbers` |

---

## 5. Test Cases

### Test 1: First Visit
1. Navigate to Page 2
2. **Expected:** Question "Does this property have a unit number?" appears
3. Select "Yes"
4. **Expected:** Selection saved

### Test 2: Navigation Persistence
1. Complete Page 2 with "Yes" selected
2. Navigate to Page 3
3. Navigate back to Page 2
4. **Expected:** "Yes" still selected, no re-prompt

### Test 3: Dual Occupancy Auto-Set
1. Navigate to Page 2
2. Select Dual Occupancy = "Yes"
3. **Expected:** `hasUnitNumbers` auto-sets to "Yes"
4. Change Dual Occupancy to "No"
5. **Expected:** `hasUnitNumbers` clears to `undefined` (if no unit number entered)

### Test 4: Manual Entry Protection
1. Navigate to Page 2
2. Select `hasUnitNumbers` = "Yes"
3. Enter a unit number
4. Navigate away and back
5. **Expected:** Both selection and unit number persist

---

## 6. Root Cause Summary

**Problem:** `useEffect` with `decisionTree.dualOccupancy` dependency ran on every mount, clearing `hasUnitNumbers` when conditions matched, regardless of whether user actively changed the value or just navigated back.

**Solution:** Track previous `dualOccupancy` value with `useRef` to distinguish between:
- Active user change (should trigger clear)
- Component re-mount/navigation (should NOT trigger clear)

---

## 7. Unresolved/Ambiguous Logic

✅ **None** - All logic is clearly defined and implemented.

---

**Status:** ✅ Implemented  
**Files Modified:** `form-app/src/components/steps/Step1DecisionTree.tsx`
