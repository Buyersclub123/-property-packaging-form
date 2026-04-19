# 09D2: Tri-plus API Routes — Implementation Plan

## Summary

7 deliverables across 3 files. Purely additive except for the `occupancy` → `occupancy_primary` bug fix on line 149 of the submit route.

---

## Change 1: Add `dwelling_details` to Submit Route

**File**: `src/app/api/ghl/submit-property/route.ts`  
**Location**: Inside the `ghlRecord` object (after line ~135, near `does_this_property_have_2_dwellings`)

**What**: Add a new field that serialises `formData.dwellings` to JSON:
```typescript
dwelling_details: formData.dwellings && formData.dwellings.length > 0 
  ? JSON.stringify(formData.dwellings) 
  : '',
```

**Risk**: None — new field, no existing fields affected.

---

## Change 2: Add `dwelling_details` to Edit GET Route

**File**: `src/app/api/properties/[recordId]/route.ts`  
**Location**: Inside the `formData` object returned to the client (near line 627, alongside `subjectLine`)

**What**: Parse the JSON string back into the `dwellings` array:
```typescript
dwellings: (() => {
  try {
    const raw = props.dwelling_details;
    if (raw && typeof raw === 'string') return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse dwelling_details:', e);
  }
  return [];
})(),
```

**Risk**: Low — `try/catch` ensures malformed JSON falls back to empty array.

---

## Change 3: Add `dwelling_details` to Edit PUT Route

**File**: `src/app/api/properties/[recordId]/route.ts`  
**Location**: Inside the PUT handler's `ghlRecord` building section (after the depreciation block, around line 1090)

**What**: Add conditional inclusion of `dwelling_details`:
```typescript
// Dwelling details (Tri-plus)
if (formData.dwellings && formData.dwellings.length > 0) {
  ghlRecord.dwelling_details = JSON.stringify(formData.dwellings);
} else if (formData.dwellings && formData.dwellings.length === 0) {
  ghlRecord.dwelling_details = '';
}
```

Note: Uses the same conditional pattern as the PUT route — only include if provided. If `formData.dwellings` is undefined (non-Tri-plus edit), the field is not sent at all.

**Risk**: None — new field, no existing fields affected.

---

## Change 4: Fix `occupancy` → `occupancy_primary` bug in Submit Route

**File**: `src/app/api/ghl/submit-property/route.ts`  
**Location**: Line 149

**Current code** (buggy):
```typescript
occupancy: formData.rentalAssessment?.occupancy || '',
```

**Replace with** (fixes bug + adds Tri-plus derivation):
```typescript
occupancy_primary: (() => {
  const dt = formData.decisionTree;
  if (dt?.dualOccupancy === 'Tri-plus' && formData.dwellings && formData.dwellings.length > 0) {
    const allOccupancies: string[] = [];
    formData.dwellings.forEach((d: any) => {
      if (d.rentalAssessment?.occupancyPrimary) allOccupancies.push(d.rentalAssessment.occupancyPrimary);
      if (d.singleOrDual === 'Yes' && d.rentalAssessment?.occupancySecondary) allOccupancies.push(d.rentalAssessment.occupancySecondary);
    });
    const unique = [...new Set(allOccupancies)];
    if (unique.length === 1 && unique[0] === 'tenanted') return 'tenanted';
    if (unique.length === 1 && unique[0] === 'vacant') return 'vacant';
    if (unique.length > 0) return 'partially_tenanted';
    return '';
  }
  return formData.rentalAssessment?.occupancyPrimary || formData.rentalAssessment?.occupancy || '';
})(),
```

**Risk**: This is the only non-additive change. The bug fix means Established/H&L properties will now correctly store `occupancy_primary` on initial submit (previously it wrote to a non-existent `occupancy` key). The fallback chain `occupancyPrimary || occupancy` ensures backwards compatibility with any form code that still uses the old field name.

---

## Change 5: Add `'partially_tenanted'` to `OccupancyType`

**File**: `src/types/form.ts`  
**Location**: Line 12

**Current**:
```typescript
export type OccupancyType = 'owner_occupied' | 'tenanted' | 'vacant' | 'tbc';
```

**Replace with**:
```typescript
export type OccupancyType = 'owner_occupied' | 'tenanted' | 'vacant' | 'tbc' | 'partially_tenanted';
```

**Risk**: None — additive union type expansion.

---

## Change 6: Infer `dualOccupancy = 'Tri-plus'` from `dwelling_type` on Edit GET Route

**File**: `src/app/api/properties/[recordId]/route.ts`  
**Location**: Lines 317-322 (the `dualOccupancy` reverse mapping)

The current code only maps `single_or_dual_occupancy` to `'Yes'` or `'No'`. For Tri-plus, `dwelling_type` already contains `'multidwelling'` or `'block_of_units'` — use that to infer Tri-plus.

**Current** (lines 317-322):
```typescript
let dualOccupancy: 'Yes' | 'No' | null = null;
if (singleOrDualOccupancy) {
  const lower = String(singleOrDualOccupancy).toLowerCase();
  if (lower.includes('dual')) dualOccupancy = 'Yes';
  else if (lower.includes('single')) dualOccupancy = 'No';
}
```

**Replace with**:
```typescript
let dualOccupancy: 'Yes' | 'No' | 'Tri-plus' | null = null;
const dwellingTypeValue = props.dwelling_type;
if (dwellingTypeValue === 'multidwelling' || dwellingTypeValue === 'block_of_units') {
  dualOccupancy = 'Tri-plus';
} else if (singleOrDualOccupancy) {
  const lower = String(singleOrDualOccupancy).toLowerCase();
  if (lower.includes('dual')) dualOccupancy = 'Yes';
  else if (lower.includes('single')) dualOccupancy = 'No';
}
```

**Why this works**: `dwelling_type` is already sent on submit (line 90) and returned by GHL on GET. No GHL field changes needed.

**Risk**: Low — adds a check before the existing logic. Non-Tri-plus properties won't have `multidwelling`/`block_of_units` so they fall through to the existing `single_or_dual_occupancy` mapping unchanged.

---

## No change: `does_this_property_have_2_dwellings`

Per handover: legacy field, submits as empty string. No change required.

---

## Implementation Order

1. Change 5 — `OccupancyType` (types first)
2. Change 4 — Fix `occupancy` → `occupancy_primary` + Tri-plus derivation (submit route)
3. Change 1 — Add `dwelling_details` to submit route
4. Change 6 — Infer `dualOccupancy = 'Tri-plus'` from `dwelling_type` (GET route)
5. Change 2 — Add `dwelling_details` parsing to GET route
6. Change 3 — Add `dwelling_details` to PUT route

---

## Testing (from handover)

1. Submit a new Tri-plus property → verify `dwelling_details` appears in GHL as JSON
2. Submit a new Tri-plus property → verify `occupancy_primary` is set correctly
3. Edit the same property → verify dwelling cards repopulate from stored JSON
4. Submit a normal Established property → verify `occupancy_primary` is now correctly populated
5. Submit/edit a Project → verify nothing changed
6. Check GHL character limit (~10,000 chars) — 25-dwelling property with full data should fit
