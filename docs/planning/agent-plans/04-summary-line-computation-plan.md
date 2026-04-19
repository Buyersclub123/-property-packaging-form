# Implementation Plan: Activity 4 — Summary Line Computation

## Overview
Create a custom hook `useSubjectLine()` that reactively computes the `subjectLine` value from form data and writes it to the form store. Display the computed subject line below the Property Address bar on all steps, and as a read-only field on Step 8 (Cashflow Review).

---

## Files to Create

### 1. `src/hooks/useSubjectLine.ts` (NEW)
Custom hook that:
- Reads from the form store: `decisionTree`, `address`, `propertyDescription`
- Computes the subject line based on property type (see logic below)
- Writes the result back via `updateFormData({ subjectLine: computed })`
- Returns the computed value for direct use by components

**Dwelling type display mapping** (GHL option key → display name):
| Key | Display |
|---|---|
| `unit` | Unit |
| `townhouse` | Townhouse |
| `villa` | Villa |
| `house` | House |
| `dualkey` | Dual-key |
| `duplex` | Duplex |
| `multidwelling` | Multi-dwelling |
| `block_of_units` | Block of Units |

**Computation logic** (in priority order):
1. **Established** (`propertyType === 'Established'`):
   → `Property Review: {ADDRESS}`

2. **Project H&L** (`propertyType === 'New'`, `lotType === 'Multiple'`, `contractTypeSimplified === 'Split Contract'`):
   → `Property Review (H&L Project): {PROJECT ADDRESS}`

3. **Project SMSF** (`propertyType === 'New'`, `lotType === 'Multiple'`, `contractTypeSimplified === 'Single Contract'`):
   → `Property Review (Single Part Contract Project): {PROJECT ADDRESS}`

4. **H&L Individual** (`propertyType === 'New'`, `lotType === 'Individual'`, `contractTypeSimplified === 'Split Contract'`):
   → `Property Review (H&L {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}`

5. **SMSF Individual** (`propertyType === 'New'`, `lotType === 'Individual'`, `contractTypeSimplified === 'Single Contract'`):
   → `Property Review (Single Part Contract {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}`

6. **Fallback** (any other combination, or insufficient data):
   → `Property Review: {ADDRESS}` (if address exists), or empty string

**Field sources:**
- **ADDRESS**: `address.propertyAddress` uppercased
- **PROJECT ADDRESS**: `address.projectAddress` (or `address.propertyAddress` if not set), stripped of lot/unit prefix, uppercased
- **totalBeds**: `parseInt(propertyDescription.bedsPrimary || '0') + parseInt(propertyDescription.bedsSecondary || '0')`
- **dwellingType**: `decisionTree.dwellingType` mapped via display table above
- **LOT + ADDRESS**: If `address.lotNumber` exists and the address doesn't already contain "LOT" (case-insensitive), prepend `LOT {lotNumber}` to ADDRESS. Otherwise just ADDRESS.

**Reactivity:**
- `useEffect` watching: `decisionTree.propertyType`, `decisionTree.contractTypeSimplified`, `decisionTree.lotType`, `decisionTree.dwellingType`, `address.propertyAddress`, `address.projectAddress`, `address.lotNumber`, `propertyDescription.bedsPrimary`, `propertyDescription.bedsSecondary`
- Only call `updateFormData` if computed value differs from current `formData.subjectLine` (prevent infinite loops)

---

## Files to Modify

### 2. `src/components/MultiStepForm.tsx`
**What:** Import and call `useSubjectLine()` in the main form component. Display the subject line below the Property Address bar.

**Specific changes:**
- Add import: `import { useSubjectLine } from '@/hooks/useSubjectLine';`
- Call `const subjectLine = useSubjectLine();` inside the `MultiStepForm` component body
- After the existing Property Address `<div>` block (~line 1636–1646), add a conditional line:
  ```
  {subjectLine && (
    <div className="mb-6 -mt-4 pb-4 border-b">
      <span className="text-xs font-semibold text-gray-500">Subject Line: </span>
      <span className="text-xs text-gray-700">{subjectLine}</span>
    </div>
  )}
  ```
- The `-mt-4` pulls it up to sit snugly under the address bar. Styling will be muted/secondary to avoid visual clutter.

### 3. `src/components/steps/Step7CashflowReview.tsx`
**What:** Display the subject line as a read-only `<Field>` in the Cashflow Review step (Step 8 in the UI).

**Specific changes:**
- Read `formData.subjectLine` from the store (already destructured via `formData`)
- Add a `<Field label="Subject Line" value={formData.subjectLine || 'Not yet computed'} />` in the summary section, near the top of the fields list alongside other summary values like address, property type, etc.

---

### 4. `src/components/steps/Step8Submission.tsx`
**What:** Display the subject line as a read-only field on the Submission step (Step 10 in the UI) so the packager sees it before final send.

**Specific changes:**
- Read `formData.subjectLine` from the store (already destructured via `formData`)
- Add a read-only display of the subject line in the pre-submission summary area.

---

## Files NOT Modified (per handover constraints)
- `src/components/steps/Step1DecisionTree.tsx` — Activity 3 (UI changes)
- `src/app/api/` routes — Activities 5 and 6
- `src/types/form.ts` — `subjectLine` and `dwellingType` already exist (Activity 2 done)
- `src/store/formStore.ts` — `subjectLine` already in `initialFormData` (Activity 2 done)

---

## Risks & Questions

### Risks
1. **Infinite render loop**: If `useSubjectLine` writes to the store on every render, it could cause an infinite loop. Mitigation: compare computed value to current `formData.subjectLine` before calling `updateFormData`.
2. **Stale reads**: Zustand selector stability — using `useFormStore()` without selectors pulls the entire store. Consider using selectors for the specific fields to minimize re-renders. However, this hook needs many fields, so full-store access may be simpler and acceptable.
3. **Missing data gracefully**: Some fields (beds, dwellingType) may not be filled yet. The hook must handle `null`/`undefined`/empty gracefully — either produce a partial subject line or return empty string.
4. **Timing of `projectAddress`**: For projects, `projectAddress` is computed from individual address fields. Need to confirm it's populated by the time this hook runs. If not set, fall back to `propertyAddress`.

### Questions (RESOLVED)
1. **Partial subject lines**: ✅ APPROVED — show the fallback format (`Property Review: {ADDRESS}`) until enough data exists for the full format. The packager always sees something building up.
2. **Step 10 (Submission)**: ✅ APPROVED — also show on Step8Submission.tsx. That's the final confirmation before sending.

---

## Verification Plan

1. **Manual testing — Established property**:
   - Fill address → verify subject line shows: `Property Review: {ADDRESS}`
   - Confirm address is uppercased

2. **Manual testing — H&L Individual**:
   - Set propertyType=New, lotType=Individual, contractTypeSimplified=Split Contract
   - Set dwellingType=townhouse, bedsPrimary=3, bedsSecondary=1
   - Set lotNumber=42
   - Verify: `Property Review (H&L 4-bed Townhouse): LOT 42 {ADDRESS}`

3. **Manual testing — SMSF Individual**:
   - Set contractTypeSimplified=Single Contract (propertyType=New, lotType=Individual)
   - Verify "Single Part Contract" appears (not "SMSF")

4. **Manual testing — Project H&L**:
   - Set propertyType=New, lotType=Multiple, contractTypeSimplified=Split Contract
   - Verify: `Property Review (H&L Project): {PROJECT ADDRESS}`

5. **Manual testing — Project SMSF**:
   - Same as above but Single Contract
   - Verify: `Property Review (Single Part Contract Project): {PROJECT ADDRESS}`

6. **Reactivity check**:
   - Change dwelling type → verify subject line updates immediately
   - Change bed count → verify subject line updates immediately
   - Clear address → verify subject line hides

7. **Display check**:
   - Verify subject line appears below address bar on all steps (1–10)
   - Verify subject line appears as read-only field on Step 8 (Cashflow Review)
   - Verify it does not appear when no address is entered

8. **Persistence check**:
   - Fill form partially, refresh page → verify subject line recomputes from persisted store data

9. **No infinite loops**:
   - Open browser console, confirm no rapid-fire `[formStore] updateFormData` logs
