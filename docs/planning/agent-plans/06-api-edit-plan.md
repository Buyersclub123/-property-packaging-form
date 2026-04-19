# Agent Plan: Activity 6 — API Edit Route (GET + PUT)

## File to modify

`src/app/api/properties/[recordId]/route.ts` — this is the only file touched.

## Changes

### 1. GET handler — reverse mapping (around line 324–336)

**Add `dwellingType` inside the `decisionTree` object** (after `dualOccupancy` on line 333):

```typescript
dwellingType: props.dwelling_type || null,
```

**Add `subjectLine` at the top level of the returned `formData` object** (e.g. after the `depreciation` block, before the closing `};` on line 626):

```typescript
subjectLine: props.subject_line || '',
```

### 2. PUT handler — forward mapping (around line 869–876)

**Add two field mappings** next to the existing decision-tree block (after line 875, `ghlRecord.status`):

```typescript
if (includeIfProvided(formData.decisionTree?.dwellingType)) ghlRecord.dwelling_type = formData.decisionTree.dwellingType;
if (includeIfProvided(formData.subjectLine)) ghlRecord.subject_line = formData.subjectLine;
```

These follow the identical `includeIfProvided` pattern used by every other field in the PUT handler. No new helper functions are needed.

## What is NOT changed

- No other field mappings are modified.
- No other files are touched (types, store, UI, submit route — those are handled by Activities 2–5).
- No new imports, no new helper functions.

## Risks / Questions

| # | Item | Mitigation |
|---|---|---|
| 1 | **GHL field names must be exact.** The handover specifies `dwelling_type` and `subject_line`. These match the confirmed GHL unique keys (`custom_objects.property_reviews.dwelling_type` and `custom_objects.property_reviews.subject_line`) from Activity 1. | Confirmed in master plan and Activity 1 handover. |
| 2 | **`dwelling_type` is a dropdown in GHL.** The GET returns the option key string (e.g. `"house"`). The form stores the same key. No conversion needed — same pattern as other dropdowns like `single_or_dual_occupancy`. | No action required. |
| 3 | **Existing records without these fields.** GET uses `|| null` / `|| ''` fallbacks, so missing fields return safe defaults. PUT uses `includeIfProvided`, so empty/null values are not sent — no risk of clobbering. | Built into existing pattern. |
| 4 | **Activity 2 (types & store) must be complete** so that `dwellingType` and `subjectLine` exist in the TypeScript types. If not merged yet, `npx tsc --noEmit` will fail on type checking but the runtime code is correct. | Verify Activity 2 is merged before running type check. |

## Verification

1. **Type check:** `npx tsc --noEmit` — confirms no compile errors.
2. **Manual GET test:** Fetch an existing record via `/api/properties/[recordId]` — confirm `decisionTree.dwellingType` and `subjectLine` appear in the response (will be `null` / `''` for old records).
3. **Manual PUT test:** Update a record with `dwellingType` and `subjectLine` values — confirm they persist in GHL and round-trip correctly on the next GET.

## Summary

Four lines of code total: one in GET (`dwellingType`), one in GET (`subjectLine`), two in PUT (`dwelling_type`, `subject_line`). All follow existing patterns exactly.
