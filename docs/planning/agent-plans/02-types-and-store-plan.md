# Agent Plan: Activity 2 — Types & Store Updates

## Summary
Add `DwellingType` union type, update `DualOccupancy` to include `'Tri-plus'`, add `dwellingType` to `DecisionTree`, and add `subjectLine` to `FormData`. Update the Zustand store's initial data and persistence logic to match.

---

## Files to Modify

### 1. `src/types/form.ts`

**Change A — Add `DwellingType` type (after line 7)**
```typescript
export type DwellingType = 'unit' | 'townhouse' | 'villa' | 'house' | 'dualkey' | 'duplex' | 'multidwelling' | 'block_of_units';
```

**Change B — Update `DualOccupancy` (line 7)**
```typescript
// FROM:
export type DualOccupancy = 'Yes' | 'No' | 'Mixed' | 'TBC' | '';
// TO:
export type DualOccupancy = 'Yes' | 'No' | 'Tri-plus' | 'Mixed' | 'TBC' | '';
```

**Change C — Add `dwellingType` to `DecisionTree` interface (line 23, before `status`)**
```typescript
dwellingType?: DwellingType | null;  // NEW — Activity 2
```

**Change D — Add `subjectLine` to `FormData` interface (top-level, after `dealType` / near line 266)**
```typescript
subjectLine?: string;
```

### 2. `src/store/formStore.ts`

**Change E — Add `DwellingType` to import (line 6)**
Add `DwellingType` to the existing import from `@/types/form`. (Not strictly required since only `DecisionTree` references it, but keeps the import explicit for downstream activities.)

**Change F — Add `dwellingType: null` to `initialFormData.decisionTree` (line 46)**
```typescript
decisionTree: {
  propertyType: null,
  contractType: null,
  contractTypeSimplified: null,
  lotType: null,
  dualOccupancy: null,
  dwellingType: null,   // NEW
  status: null,
},
```

**Change G — Add `subjectLine: ''` to `initialFormData` top-level (after line 68, e.g. after `lots: []`)**
```typescript
subjectLine: '',
```

**Change H — Add `dwellingType: null` to `partialize` hardcoded decisionTree reset (lines 536-542)**
The `partialize` function hardcodes a reset shape for `decisionTree`. Must add `dwellingType: null`:
```typescript
decisionTree: hasEditData ? state.formData.decisionTree : {
  propertyType: null,
  contractType: null,
  contractTypeSimplified: null,
  lotType: null,
  dualOccupancy: null,
  dwellingType: null,   // NEW
  status: null,
},
```

---

## Files NOT Modified (out of scope)
- Component files (`Step1DecisionTree.tsx`, `Step2PropertyDetails.tsx`, etc.) — Activity 3
- API route files — Activities 5 & 6
- Summary line computation logic — Activity 4
- Make.com blueprints — Activity 7

---

## Risk Assessment

### Low Risk — Adding `'Tri-plus'` to `DualOccupancy`
Examined all 126 usages of `dualOccupancy` across 10 files. Every existing check uses simple equality (`=== 'Yes'`, `=== 'No'`). There are **zero** switch statements or exhaustive type checks. Adding `'Tri-plus'` will not match any existing branch — it will simply fall through to the else/default case, which is correct behavior (Tri-plus UI handling is deferred to Activity 3/9).

### Low Risk — `DecisionTree` optional field
`dwellingType` is optional (`dwellingType?: DwellingType | null`), so all existing code that spreads or reads `DecisionTree` will continue to work without modification.

### Low Risk — `subjectLine` optional field
`subjectLine?: string` is optional on `FormData`, so no existing code will break.

### Watch — `clearStep2Data` function (lines 405-439)
This function reconstructs `FormData` manually. It copies `decisionTree` from current state (`currentState.formData.decisionTree`), so `dwellingType` will be preserved automatically via the spread. `subjectLine` is not in the explicit reconstruction, but since it's a top-level field it won't be preserved through `clearStep2Data`. This is acceptable — `subjectLine` is a computed value (Activity 4) that gets recomputed, not user-entered data that needs preservation.

---

## Questions
None. The handover doc is clear and the changes are well-scoped.

---

## Verification

1. **TypeScript check**: Run `npx tsc --noEmit` — must pass with zero errors.
2. **Manual review**: Confirm new types are exported, `DecisionTree` has `dwellingType`, `FormData` has `subjectLine`, `initialFormData` has both defaults, and `partialize` includes `dwellingType: null`.
3. **Grep check**: `grep -r "DwellingType" src/` should show `form.ts` (type definition) and `formStore.ts` (import).
