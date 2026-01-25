# 08 - Unit Number Persistence Bug Fix

_Section from planning session transcript: Lines 1790-4900_

This section documents the bug fix for the Unit Number field persistence issue on Page 2 (Decision Tree).

---

## Bug Description

**User Report:**

There is an annoying bug: curerntly gthe fork lets you travel forwards and backwards through the pages without losing any values, however if you go back to page 2 it always ask you if the property has a unit number, can we stop this from happening, Yes it needs to be mandatory when you first go to Page 2, but once you set a value it should retain it. I Will read your information above, but please add this current feature to be changed, play back the requirement

**Cursor Playback:**

**Requirement Playback: Fix Unit Number Persistence Bug (Page 2)**

**Issue:**
-   Currently, navigating back to Page 2 causes the "Does this property have a unit number?" question to reset or prompt unnecessarily, even if previously answered.

**Requirement:**
-   **First Visit:** The question "Does this property have a unit number?" must remain mandatory.
-   **Re-visit:** If the user has already answered "Yes" or "No", the form must **remember and display** that selection. It should not force the user to re-select it every time they navigate back.

**Fix Logic:**
-   Ensure `formData.address.hasUnitNumbers` is correctly persisted in the `formStore`.
-   Ensure the `Step1DecisionTree` component initializes its local state from this persisted value on mount.

**User:** Yes

**Confirmation:** ✅ Approved

---

## Root Cause Analysis

**Cursor Investigation:**

After reviewing `Step1DecisionTree.tsx`, I found the issue:

The component has a `useEffect` that runs when `decisionTree.dualOccupancy` changes:

```typescript
useEffect(() => {
  if (decisionTree.dualOccupancy === 'Yes') {
    // Auto-set hasUnitNumbers to true for Dual Occupancy
    if (hasUnitNumbers !== true) {
      setHasUnitNumbers(true);
      updateAddress({ hasUnitNumbers: true });
    }
  } else if (decisionTree.dualOccupancy === 'No' || decisionTree.dualOccupancy === null) {
    // If Dual Occupancy changes away from Yes, reset to undefined
    if (hasUnitNumbers === true && !address?.unitNumber) {
      setHasUnitNumbers(undefined);
      updateAddress({ hasUnitNumbers: undefined });
    }
  }
}, [decisionTree.dualOccupancy]);
```

**The Problem:**

When navigating back to Page 2:
1. Component mounts
2. `hasUnitNumbers` initializes from `address.hasUnitNumbers` (which is `true`)
3. The `useEffect` runs because `decisionTree.dualOccupancy` is in the dependency array
4. If `dualOccupancy` is "No" or `null`, and `hasUnitNumbers` is `true`, and `unitNumber` is empty, it resets to `undefined`
5. This causes the question to appear again

**The Issue:**

The effect doesn't distinguish between:
- User actively changing Dual Occupancy from Yes to No (should clear)
- User navigating back to page (should NOT clear)

---

## Solution

**Cursor Proposed Fix:**

Use a `useRef` to track the *previous* value of `dualOccupancy`. Only clear `hasUnitNumbers` if the user *just changed* from 'Yes' to 'No', not on every render.

```typescript
const prevDualOccupancy = useRef<DualOccupancy | null>(decisionTree.dualOccupancy);

useEffect(() => {
  if (decisionTree.dualOccupancy === 'Yes') {
    // Auto-set hasUnitNumbers to true for Dual Occupancy
    if (hasUnitNumbers !== true) {
      setHasUnitNumbers(true);
      updateAddress({ hasUnitNumbers: true });
    }
  } else if (decisionTree.dualOccupancy === 'No' || decisionTree.dualOccupancy === null) {
    // Only clear if we just switched FROM Yes
    if (prevDualOccupancy.current === 'Yes' && hasUnitNumbers === true && !address?.unitNumber) {
      setHasUnitNumbers(undefined);
      updateAddress({ hasUnitNumbers: undefined });
    }
  }
  prevDualOccupancy.current = decisionTree.dualOccupancy;
}, [decisionTree.dualOccupancy]);
```

**Key Change:**

```typescript
// OLD (buggy):
if (hasUnitNumbers === true && !address?.unitNumber) {
  setHasUnitNumbers(undefined);
}

// NEW (fixed):
if (prevDualOccupancy.current === 'Yes' && hasUnitNumbers === true && !address?.unitNumber) {
  setHasUnitNumbers(undefined);
}
```

This ensures the clear only happens when the user *actively changes* Dual Occupancy from Yes to No, not when they simply navigate back to the page.

---

## Implementation

**File Modified:** `form-app/src/components/steps/Step1DecisionTree.tsx`

**Changes:**

1. Added `useRef` import:
```typescript
import { useState, useEffect, useRef } from 'react';
```

2. Added ref to track previous Dual Occupancy value:
```typescript
const prevDualOccupancy = useRef<DualOccupancy | null>(decisionTree.dualOccupancy);
```

3. Updated the useEffect to only clear when transitioning from Yes to No:
```typescript
useEffect(() => {
  if (decisionTree.dualOccupancy === 'Yes') {
    // Dual Occupancy always requires unit numbers
    if (hasUnitNumbers !== true) {
      setHasUnitNumbers(true);
      updateAddress({ hasUnitNumbers: true });
    }
  } else if (decisionTree.dualOccupancy === 'No' || decisionTree.dualOccupancy === null) {
    // If Dual Occupancy changes away from Yes, reset to undefined (unless user explicitly set it)
    // Only reset if it was true (could have been auto-set) AND we effectively just switched from Yes
    if (prevDualOccupancy.current === 'Yes' && hasUnitNumbers === true && !address?.unitNumber) {
      // Only auto-clear if no unit number was entered (meaning it was just auto-set)
      setHasUnitNumbers(undefined);
      updateAddress({ hasUnitNumbers: undefined });
    }
  }
  prevDualOccupancy.current = decisionTree.dualOccupancy;
}, [decisionTree.dualOccupancy]);
```

**Status:** ✅ Implemented and saved to `Step1DecisionTree.tsx`

---

## Testing Verification

**Test Scenario 1: First Visit**
1. Navigate to Page 2
2. Question "Does this property have a unit number?" appears
3. Select "Yes"
4. ✅ Expected: Selection is saved

**Test Scenario 2: Navigate Away and Back**
1. Complete Page 2 with "Yes" selected
2. Navigate to Page 3
3. Navigate back to Page 2
4. ✅ Expected: "Yes" is still selected, question doesn't re-prompt

**Test Scenario 3: Dual Occupancy Auto-Set**
1. Navigate to Page 2
2. Select Dual Occupancy = "Yes"
3. ✅ Expected: "Has Unit Numbers" auto-sets to "Yes"
4. Change Dual Occupancy to "No"
5. ✅ Expected: "Has Unit Numbers" clears to undefined (if no unit number entered)

**Test Scenario 4: Manual Selection Persists**
1. Navigate to Page 2
2. Manually select "Has Unit Numbers" = "Yes"
3. Enter a unit number
4. Navigate away and back
5. ✅ Expected: Selection and unit number both persist

---

## Summary

**Problem:** Unit Number question re-prompted on every visit to Page 2

**Root Cause:** useEffect clearing hasUnitNumbers on mount when Dual Occupancy was No/null

**Solution:** Track previous Dual Occupancy value with useRef, only clear when actively changing from Yes to No

**Impact:** Users can now navigate back to Page 2 without losing their Unit Number selection

**Files Changed:** `form-app/src/components/steps/Step1DecisionTree.tsx`

---
