# Agent Plan: Activity 5 — API Submit Route

## Summary
Add `dwelling_type` and `subject_line` field mappings to the GHL submit-property API route so these new fields are included when a property review is created.

## File to modify
`src/app/api/ghl/submit-property/route.ts` — **only this file**.

## Changes

### 1. Add two lines to the `ghlRecord` object (around line 89)
Insert immediately after the `contract_type` mapping (line 89), alongside the other decision-tree fields:

```typescript
dwelling_type: formData.decisionTree?.dwellingType || '',
subject_line: formData.subjectLine || '',
```

This follows the exact same `fieldName: formData.path?.field || ''` pattern used by every other mapping in the object (e.g., `deal_type`, `contract_type`).

### Why this placement
- `contract_type` (line 89) and `deal_type` (line 88) are the existing decision-tree fields.
- `dwelling_type` is logically a decision-tree field → place it adjacent.
- `subject_line` is a top-level `formData` field (not nested under `decisionTree`), but it is derived from the decision tree, so keeping it nearby makes sense.

## No other changes
- No imports to add.
- No other field mappings to modify.
- No other files to touch.

## Risks & questions
- **None identified.** The change is two additive lines with no side effects on existing mappings.
- If `dwellingType` or `subjectLine` are undefined/empty (e.g., for older form submissions or edge cases), the `|| ''` fallback sends an empty string to GHL, which is consistent with all other fields.

## Verification
1. **Type check:** `npx tsc --noEmit` — must pass with no errors.
2. **Visual inspection:** Confirm the two new lines are inside the `ghlRecord` object, follow the existing pattern, and no other lines have changed.
