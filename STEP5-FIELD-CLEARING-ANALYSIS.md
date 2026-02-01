# Step 5 Field Clearing Issue - Root Cause Analysis

**Date:** 2026-01-22  
**Issue:** Investment Highlights and Why This Property fields clear when Proximity loads  
**Status:** Root cause identified

---

## Executive Summary

**Root Cause:** Object replacement instead of object merging in `updateFormData` calls.

When `ProximityField` calls `onChange`, it passes a NEW `contentSections` object that only contains the `proximity` property. This REPLACES the entire `contentSections` object in the store, wiping out `investmentHighlights` and `whyThisProperty` values.

**Impact:** Users lose their data when any field updates, requiring navigation back/forward to see it again (due to React re-render and state rehydration).

**Solution:** Ensure all `onChange` handlers properly merge the existing `contentSections` object before updating.

---

## Detailed Root Cause Analysis

### The Problem Code Pattern

In `Step5Proximity.tsx`, each field's `onChange` handler follows this pattern:

```typescript
// ProximityField onChange (lines 32-36)
onChange={(value) => updateFormData({
  contentSections: {
    ...contentSections,
    proximity: value
  }
})}
```

At first glance, this looks correct - it's using the spread operator `...contentSections` to preserve existing values.

### Why It Still Fails

**The Critical Issue:** The `contentSections` variable comes from this line:

```typescript
const { contentSections, address, proximityData } = formData;
```

This destructuring happens ONCE when the component renders. The `contentSections` reference is captured in the closure of the `onChange` callback.

**The Race Condition:**

1. User fills **Investment Highlights** field
   - Calls `onChange` with new `contentSections` object
   - Store updates: `{ investmentHighlights: "..." }`
   - Component re-renders with new `contentSections`

2. User fills **Why This Property** field
   - Calls `onChange` with new `contentSections` object
   - Store updates: `{ investmentHighlights: "...", whyThisProperty: "..." }`
   - Component re-renders with new `contentSections`

3. **ProximityField** auto-runs (useEffect triggers)
   - BUT: The `onChange` callback was created during the FIRST render
   - The `contentSections` in its closure is STALE (from step 1 or earlier)
   - It spreads the OLD `contentSections` which might be empty or missing recent updates
   - Calls: `updateFormData({ contentSections: { ...OLD_contentSections, proximity: "..." } })`
   - Result: **investmentHighlights** and **whyThisProperty** are LOST

### Why This Happens Specifically with ProximityField

The `ProximityField` component has a `useEffect` that auto-runs:

```typescript
useEffect(() => {
  if (hasAutoRun) return;
  
  if (address && !calculatedFor) {
    calculateProximity(address);
    setHasAutoRun(true);
  }
}, [address, value, preFetchedData]);
```

When `calculateProximity` completes, it calls:

```typescript
onChange(data.proximity);  // Line 98 in ProximityField.tsx
```

This `onChange` is the callback from the parent, which has a STALE `contentSections` reference in its closure.

### Why Users See Data "Come Back"

When users navigate back/forward:
- The component unmounts and remounts
- The `contentSections` is re-read from the Zustand store
- The store STILL has the old values (because localStorage persists them)
- So the data "reappears" - but it was never truly lost from the store, just from the UI

---

## Technical Deep Dive

### Zustand Store Behavior

The `updateFormData` function in `formStore.ts` (line 102-105):

```typescript
updateFormData: (data) =>
  set((state) => ({
    formData: { ...state.formData, ...data },
  })),
```

This does a SHALLOW merge of the top-level `formData` properties. When you pass:

```typescript
updateFormData({
  contentSections: {
    proximity: "new value"
  }
})
```

It REPLACES the entire `contentSections` object, not merging it.

### React Closure Problem

The `onChange` callbacks are created during render and capture the current `contentSections` value:

```typescript
// This closure captures contentSections at render time
onChange={(value) => updateFormData({
  contentSections: {
    ...contentSections,  // ← This is the captured value, not current
    proximity: value
  }
})}
```

If another field updates `contentSections` AFTER this callback is created, the callback still has the OLD value.

### Why InvestmentHighlights and WhyThisProperty Are Affected

Both fields also have auto-run logic:
- `InvestmentHighlightsField`: Auto-lookup on mount (line 89-95)
- `WhyThisPropertyField`: Auto-generate on mount (line 52-57)

The timing sequence:
1. Step5Proximity renders
2. All three fields mount simultaneously
3. All three `useEffect` hooks trigger
4. Race condition: Whoever calls `onChange` LAST wins, overwriting others

---

## Proposed Solution

### Solution 1: Use Functional Updates (RECOMMENDED)

Modify `updateFormData` in `formStore.ts` to support functional updates for nested objects:

**Conceptual approach:**

```typescript
// Add a new action: updateContentSections
updateContentSections: (sections: Partial<ContentSections>) =>
  set((state) => ({
    formData: {
      ...state.formData,
      contentSections: {
        ...state.formData.contentSections,  // ← Always get CURRENT state
        ...sections,
      },
    },
  })),
```

Then update `Step5Proximity.tsx` to use this new action:

```typescript
// Instead of:
onChange={(value) => updateFormData({
  contentSections: {
    ...contentSections,
    proximity: value
  }
})}

// Use:
onChange={(value) => updateContentSections({ proximity: value })}
```

**Why this works:**
- The `set` function in Zustand ALWAYS receives the current state
- No stale closures - the spread happens inside the store action
- All updates are properly merged

### Solution 2: Use Zustand Selectors (ALTERNATIVE)

Keep the current `updateFormData` but change how we read state:

```typescript
// Instead of destructuring
const { contentSections } = formData;

// Use a selector that reads fresh state each time
const updateProximity = (value: string) => {
  const currentSections = useFormStore.getState().formData.contentSections;
  updateFormData({
    contentSections: {
      ...currentSections,  // ← Always fresh
      proximity: value
    }
  });
};
```

**Why this works:**
- `useFormStore.getState()` always returns the current state
- No stale closures

**Downside:**
- More verbose
- Requires wrapping every `onChange` handler

### Solution 3: Deep Merge in updateFormData (NOT RECOMMENDED)

Modify `updateFormData` to do deep merging:

**Why NOT recommended:**
- Deep merging is complex and error-prone
- Can cause unintended side effects in other parts of the form
- Performance overhead
- Harder to reason about state updates

---

## Files That Need Changes

### 1. `src/store/formStore.ts`
**Changes:**
- Add new action: `updateContentSections`
- Add to interface: `updateContentSections: (sections: Partial<ContentSections>) => void`
- Implement the action (see Solution 1 above)

### 2. `src/components/steps/Step5Proximity.tsx`
**Changes:**
- Import `updateContentSections` from store
- Update all three `onChange` handlers to use `updateContentSections`
- Remove destructuring of `contentSections` (no longer needed)

**Specific lines to change:**
- Line 21: Add `updateContentSections` to destructured imports
- Lines 32-36: ProximityField onChange
- Lines 45-49: WhyThisPropertyField onChange
- Lines 58-62: InvestmentHighlightsField onChange

### 3. Any Other Components Using contentSections
**Need to audit:**
- Search for all uses of `updateFormData` with `contentSections`
- Replace with `updateContentSections`

---

## Testing Strategy

### Steps to Reproduce the Bug

1. Navigate to Step 5
2. Fill in "Investment Highlights" field with test text (e.g., "Test highlights")
3. Fill in "Why This Property" field with test text (e.g., "Test property")
4. Wait for "Proximity & Amenities" to auto-load (or trigger manually)
5. **BUG:** Observe that Investment Highlights and Why This Property fields are now empty
6. Navigate to Step 4, then back to Step 5
7. **WORKAROUND:** Observe that the data reappears

### Steps to Verify the Fix

1. Apply the fix (Solution 1: Add `updateContentSections` action)
2. Clear browser localStorage: `localStorage.removeItem('property-form-storage')`
3. Refresh the page and start a new form
4. Navigate to Step 5
5. Fill in "Investment Highlights" field with "Test highlights 123"
6. Fill in "Why This Property" field with "Test property 456"
7. Trigger Proximity auto-load (or fill manually with "Test proximity 789")
8. **VERIFY:** All three fields should retain their values
9. Open browser DevTools → Application → Local Storage
10. **VERIFY:** Check that `property-form-storage` contains all three values in `contentSections`

### Edge Cases to Test

#### Test Case 1: Rapid Sequential Updates
- Fill all three fields rapidly (within 1 second)
- Verify all values are preserved

#### Test Case 2: Auto-run on Mount
- Navigate to Step 5 with address already filled
- All three fields should auto-populate without clearing each other

#### Test Case 3: Manual Regenerate
- Fill all three fields
- Click "Regenerate" button on Why This Property
- Verify Investment Highlights and Proximity are NOT cleared

#### Test Case 4: Error Handling
- Simulate API error for Proximity
- Fill other fields manually
- Retry Proximity
- Verify other fields are NOT cleared

#### Test Case 5: Navigation
- Fill all fields
- Navigate to Step 4, then back to Step 5
- Verify all fields are preserved

#### Test Case 6: Browser Refresh
- Fill all fields
- Refresh the browser
- Navigate back to Step 5
- Verify all fields are loaded from localStorage

### Automated Testing (Future)

**Unit Test Example:**

```typescript
describe('Step5Proximity - Field Clearing Bug', () => {
  it('should preserve all contentSections fields when updating one field', () => {
    // Setup
    const { result } = renderHook(() => useFormStore());
    
    // Fill all three fields
    act(() => {
      result.current.updateContentSections({ investmentHighlights: 'Test 1' });
      result.current.updateContentSections({ whyThisProperty: 'Test 2' });
      result.current.updateContentSections({ proximity: 'Test 3' });
    });
    
    // Verify all fields are present
    expect(result.current.formData.contentSections).toEqual({
      investmentHighlights: 'Test 1',
      whyThisProperty: 'Test 2',
      proximity: 'Test 3',
    });
  });
});
```

---

## Prevention Recommendations

### 1. Use Granular Update Actions

**Principle:** Create specific update actions for nested objects instead of relying on spread operators in components.

**Example:**
```typescript
// GOOD: Granular action
updateContentSections: (sections) => set((state) => ({
  formData: {
    ...state.formData,
    contentSections: { ...state.formData.contentSections, ...sections }
  }
}))

// BAD: Generic action requiring manual spreading
updateFormData: (data) => set((state) => ({
  formData: { ...state.formData, ...data }
}))
```

### 2. Avoid Destructuring State in Closures

**Principle:** Don't capture state values in closures that will be used in async callbacks.

**Example:**
```typescript
// BAD: Captures stale contentSections
const { contentSections } = formData;
onChange={(value) => updateFormData({
  contentSections: { ...contentSections, proximity: value }
})}

// GOOD: Reads fresh state each time
onChange={(value) => {
  const current = useFormStore.getState().formData.contentSections;
  updateFormData({ contentSections: { ...current, proximity: value } });
}}

// BEST: Use granular action
onChange={(value) => updateContentSections({ proximity: value })}
```

### 3. Use Zustand's Immer Middleware (OPTIONAL)

**Principle:** Use Immer for immutable updates to avoid manual spreading.

**Example:**
```typescript
import { immer } from 'zustand/middleware/immer';

export const useFormStore = create<FormStore>()(
  immer((set) => ({
    updateContentSections: (sections) => set((state) => {
      // Immer allows "mutating" the draft
      Object.assign(state.formData.contentSections, sections);
    }),
  }))
);
```

**Pros:**
- Cleaner syntax
- Harder to make mistakes

**Cons:**
- Additional dependency
- Slightly larger bundle size

### 4. Add TypeScript Strict Checks

**Principle:** Use TypeScript to catch potential issues at compile time.

**Example:**
```typescript
// Add utility type to ensure all fields are updated atomically
type AtomicUpdate<T> = {
  [K in keyof T]: (value: T[K]) => void;
};

// Generate update functions for each field
const contentSectionUpdaters: AtomicUpdate<ContentSections> = {
  proximity: (value) => updateContentSections({ proximity: value }),
  whyThisProperty: (value) => updateContentSections({ whyThisProperty: value }),
  investmentHighlights: (value) => updateContentSections({ investmentHighlights: value }),
};
```

### 5. Add Logging and Monitoring

**Principle:** Log state updates to catch issues early.

**Example:**
```typescript
updateContentSections: (sections) =>
  set((state) => {
    const before = state.formData.contentSections;
    const after = { ...before, ...sections };
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContentSections Update]', {
        before,
        update: sections,
        after,
      });
    }
    
    return {
      formData: {
        ...state.formData,
        contentSections: after,
      },
    };
  }),
```

### 6. Document State Update Patterns

**Principle:** Create a coding standard document for the team.

**Example documentation:**

```markdown
## State Update Best Practices

### ✅ DO: Use granular update actions
updateContentSections({ proximity: value })

### ❌ DON'T: Spread state in component closures
const { contentSections } = formData;
onChange={(value) => updateFormData({
  contentSections: { ...contentSections, proximity: value }
})}

### ✅ DO: Read fresh state in callbacks
onChange={(value) => {
  const current = useFormStore.getState().formData.contentSections;
  updateFormData({ contentSections: { ...current, proximity: value } });
}}
```

---

## Risk Assessment

### High Risk Areas

1. **Other nested objects in formData:**
   - `propertyDescription`
   - `purchasePrice`
   - `rentalAssessment`
   - `marketPerformance`
   - `agentInfo`

   **Action:** Audit all uses of `updateFormData` with these objects.

2. **Lot-based updates:**
   - `updateLotPropertyDescription`
   - `updateLotPurchasePrice`
   - `updateLotRentalAssessment`

   **Status:** These already use granular actions, so they're likely safe.

3. **Step 3 Market Performance:**
   - Multiple fields updating `marketPerformance`
   - Check for similar race conditions

### Medium Risk Areas

1. **Step 2 Property Details:**
   - Many fields updating `propertyDescription`, `purchasePrice`, `rentalAssessment`
   - Check if any have auto-run logic that could cause race conditions

2. **Step 0 Address & Risk:**
   - Updates `address` and `riskOverlays`
   - Check for similar patterns

### Low Risk Areas

1. **Step 1 Decision Tree:**
   - Uses `updateDecisionTree` which is already granular
   - No auto-run logic

2. **Step 6-8:**
   - Mostly read-only or single-field updates
   - Lower risk of race conditions

---

## Implementation Priority

### Phase 1: Critical Fix (IMMEDIATE)
1. Add `updateContentSections` action to `formStore.ts`
2. Update `Step5Proximity.tsx` to use new action
3. Test thoroughly (all test cases above)
4. Deploy to production

### Phase 2: Audit and Fix (NEXT SPRINT)
1. Search codebase for all uses of `updateFormData` with nested objects
2. Create similar granular actions for other nested objects:
   - `updatePropertyDescription` (already exists, verify usage)
   - `updatePurchasePrice` (already exists, verify usage)
   - `updateRentalAssessment` (already exists, verify usage)
   - `updateMarketPerformance` (create if needed)
   - `updateAgentInfo` (create if needed)
3. Update all components to use granular actions

### Phase 3: Prevention (FUTURE)
1. Add automated tests for race conditions
2. Add development-mode logging
3. Document best practices
4. Consider Immer middleware

---

## Conclusion

The field clearing issue is caused by **stale closures capturing outdated state** combined with **shallow object replacement** in the Zustand store. The fix is straightforward: create granular update actions that always read the current state when merging.

**Recommended Solution:** Solution 1 (Add `updateContentSections` action)

**Estimated Effort:**
- Implementation: 30 minutes
- Testing: 1 hour
- Total: 1.5 hours

**Risk Level:** Low (isolated change, easy to test)

**Impact:** High (fixes critical user-facing bug)

---

## Appendix: Code Snippets

### A. Current Problematic Code

**Step5Proximity.tsx (lines 30-40):**
```typescript
<ProximityField
  value={contentSections?.proximity || proximityData || ''}
  onChange={(value) => updateFormData({
    contentSections: {
      ...contentSections,  // ← STALE CLOSURE
      proximity: value
    }
  })}
  address={address?.propertyAddress}
  preFetchedData={proximityData}
/>
```

### B. Proposed Fixed Code

**formStore.ts (add to interface and implementation):**
```typescript
// Interface
interface FormStore extends FormState {
  // ... existing actions ...
  updateContentSections: (sections: Partial<ContentSections>) => void;
}

// Implementation
updateContentSections: (sections) =>
  set((state) => ({
    formData: {
      ...state.formData,
      contentSections: {
        ...state.formData.contentSections,  // ← ALWAYS FRESH
        ...sections,
      },
    },
  })),
```

**Step5Proximity.tsx (updated):**
```typescript
export function Step5Proximity() {
  const { formData, updateContentSections } = useFormStore();  // ← Import new action
  const { address, proximityData } = formData;
  const contentSections = formData.contentSections || {};  // ← Still read for display

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Property Content & Proximity</h2>
      
      <div className="space-y-8">
        <ProximityField
          value={contentSections.proximity || proximityData || ''}
          onChange={(value) => updateContentSections({ proximity: value })}  // ← FIXED
          address={address?.propertyAddress}
          preFetchedData={proximityData}
        />

        <WhyThisPropertyField
          value={contentSections.whyThisProperty || ''}
          onChange={(value) => updateContentSections({ whyThisProperty: value })}  // ← FIXED
          suburb={address?.suburbName}
          lga={address?.lga}
        />

        <InvestmentHighlightsField
          value={contentSections.investmentHighlights || ''}
          onChange={(value) => updateContentSections({ investmentHighlights: value })}  // ← FIXED
          lga={address?.lga}
          suburb={address?.suburbName}
          state={address?.state}
          streetAddress={address?.propertyAddress}
          userEmail="unknown"
        />
      </div>
    </div>
  );
}
```

---

**End of Analysis**
