# Step 5 Field Clearing Issue - Analysis Prompt

**FOR EXTERNAL AI CHAT (Sonnet 4.5)**

---

## The Problem

When a user is on Step 5 of the property review form:
1. User fills **Investment Highlights** field
2. User fills **Why This Property** field
3. **Proximity & Amenities** field loads (auto or manual trigger)
4. ❌ **Investment Highlights** and **Why This Property** fields **clear/disappear**
5. User has to navigate back/forward to see their data again

---

## Current System Context

### Files Involved

**`src/components/steps/step5/ProximityField.tsx`**
- Contains `useEffect` that fetches proximity data from API
- Updates `formData.contentSections.proximity` via Zustand store
- Has `hasAutoRun` flag to prevent infinite loops

**`src/components/steps/step5/InvestmentHighlightsField.tsx`**
- Displays Investment Highlights content
- Uses `formData.contentSections.investmentHighlights`
- Recently fixed: Removed `internalValue` state bug

**`src/components/steps/step5/WhyThisPropertyField.tsx`**
- Displays Why This Property content
- Uses `formData.contentSections.whyThisProperty`
- Recently fixed: Removed `internalValue` state bug

**`src/lib/formStore.ts`** (Zustand store)
- Manages form state
- Has `contentSections` object with: `proximity`, `investmentHighlights`, `whyThisProperty`

---

## Technical Context

- **Framework:** Next.js 14, React 18, TypeScript
- **State Management:** Zustand (`useFormStore`)
- **Recent Fix:** Removed `internalValue` state pattern from Investment Highlights and Why This Property fields (they are now fully controlled components)

---

## Suspected Root Cause

When `ProximityField` updates `formData.contentSections.proximity`, it may be:
1. **Replacing the entire `contentSections` object** (instead of merging)
2. **Triggering a re-render** that causes other fields to lose their values
3. **Race condition** between field updates

---

## Your Task

**Analyze the root cause and provide a solution plan.**

### Questions to Answer:

1. **Why do the other fields clear when Proximity loads?**
   - Is it a Zustand store update issue?
   - Is it a React re-render issue?
   - Is it a timing/race condition?

2. **What is the correct way to update `contentSections.proximity` without affecting other fields?**
   - Should we use spread operator to merge?
   - Should we use Zustand's `set` function differently?
   - Should we add defensive checks?

3. **How to prevent this from happening in the future?**
   - Should we refactor how `contentSections` is updated?
   - Should we add validation/tests?

4. **Are there any other fields at risk of this same issue?**

---

## Deliverables

1. **Root Cause Analysis**
   - Explain exactly why this happens
   - Identify the problematic code pattern

2. **Solution Plan**
   - How to fix ProximityField.tsx
   - Specific code changes needed (conceptual, no actual code)
   - How to preserve existing values when updating

3. **Testing Strategy**
   - Steps to reproduce the bug
   - Steps to verify the fix
   - Edge cases to test

4. **Prevention Recommendations**
   - How to avoid this pattern in other fields
   - Best practices for updating nested Zustand state

---

## Critical Rules

❌ DO NOT WRITE ANY CODE  
❌ DO NOT CREATE HELPER SCRIPTS  
✅ Analysis and planning ONLY  
✅ Save your analysis as: `property-review-system/form-app/STEP5-FIELD-CLEARING-ANALYSIS.md`

---

**End of Prompt**
