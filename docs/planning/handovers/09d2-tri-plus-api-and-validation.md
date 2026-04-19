# Activity 9D2: Tri-plus API Routes

## Context — What's Already Done

The Tri-plus form UI is fully functional:

- **Step 1**: Dwelling cards with unit numbers, single/dual per dwelling, duplicate detection, address sync (range/comma format)
- **Step 2 (form Step 3)**: Per-dwelling Property Description + Rental Assessment, property-level Year Built/Land Size/Title/Body Corp, Purchase Price, property-level Additional Dialogue boxes
- **Auto-sum**: Per-dwelling values automatically write to property-level fields (`propertyDescription.bedsPrimary`, `rentalAssessment.currentRentPrimary`, etc.)
- **Auto-yield**: Current Yield and Appraised Yield auto-calculated from dwelling totals
- **Validation**: Step 1 and Step 3 validations exclude Tri-plus from property-level occupancy/unit-number checks

Because of auto-sum, the existing GHL field mappings (`beds_primary`, `bath_primary`, `current_rent_primary__per_week`, `yield`, etc.) **already receive correct totals** on submit. No changes needed for those.

## Confirmed GHL Fields

| Field Name | Unique Key | Type | Notes |
|---|---|---|---|
| `occupancy_primary` | `custom_objects.property_reviews.occupancy_primary` | Dropdown (Single) | Options: `owner_occupied`, `tenanted`, `vacant`, `tbc`, `partially_tenanted` |
| `occupancy_secondary` | `custom_objects.property_reviews.occupancy_secondary` | Dropdown (Single) | Same options as primary |
| `dwelling_details` | `custom_objects.property_reviews.dwelling_details` | Multi-line text | Stores JSON array of dwelling data |

## What This Activity Must Do

### 1. Add `dwelling_details` to Submit Route

**File**: `src/app/api/ghl/submit-property/route.ts`

Add to the `ghlRecord` object (after line ~135):
```typescript
dwelling_details: formData.dwellings && formData.dwellings.length > 0 
  ? JSON.stringify(formData.dwellings) 
  : '',
```

### 2. Add `dwelling_details` to Edit GET Route

**File**: `src/app/api/properties/[recordId]/route.ts`

When mapping GHL record → form data, parse the JSON string back into the dwellings array:
```typescript
dwellings: (() => {
  try {
    const raw = record.dwelling_details;
    if (raw && typeof raw === 'string') return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse dwelling_details:', e);
  }
  return [];
})(),
```

### 3. Add `dwelling_details` to Edit PUT Route

Same file, same pattern as submit:
```typescript
dwelling_details: formData.dwellings && formData.dwellings.length > 0 
  ? JSON.stringify(formData.dwellings) 
  : '',
```

### 4. Fix existing bug + derive `occupancy_primary` for Tri-plus

**Existing bug**: The submit route (line 149) sends to a key called `occupancy` — but GHL has no field with that name. The correct key is `occupancy_primary`. This means occupancy has never been stored on initial submit for any property type (only on edit, where the PUT route correctly uses `occupancy_primary`).

**Fix**: Rename `occupancy` → `occupancy_primary` on line 149 of the submit route.

**Tri-plus logic**: For Tri-plus, property-level occupancy is not set directly — each dwelling has its own. Derive it:

- **All tenanted** → `"tenanted"`
- **All vacant** → `"vacant"`
- **Mix** → `"partially_tenanted"`

Combined fix + Tri-plus logic — replace line 149 in submit route:
```typescript
occupancy_primary: (() => {
  const dt = formData.decisionTree;
  if (dt?.dualOccupancy === 'Tri-plus' && formData.dwellings && formData.dwellings.length > 0) {
    const allOccupancies: string[] = [];
    formData.dwellings.forEach(d => {
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

### 5. Add `'partially_tenanted'` to OccupancyType

**File**: `src/types/form.ts`

```typescript
export type OccupancyType = 'owner_occupied' | 'tenanted' | 'vacant' | 'tbc' | 'partially_tenanted';
```

### 6. Infer Tri-plus from `dwelling_type` on Edit GET Route

**File**: `src/app/api/properties/[recordId]/route.ts`  
**Location**: Lines 317-322, the `dualOccupancy` reverse mapping

The current code only maps `single_or_dual_occupancy` to `'Yes'` or `'No'`. For Tri-plus, `dwelling_type` already contains `'multidwelling'` or `'block_of_units'` — use that to infer `dualOccupancy = 'Tri-plus'`.

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

No changes needed to `single_or_dual_occupancy` in the submit route or GHL. The `dwelling_type` field is already sent on submit and available in the GET response.

### 7. `does_this_property_have_2_dwellings` — IGNORE

Legacy field. No UI sets it. Submits as empty string for all property types. No change required.

---

## Critical Constraint

**This is purely additive** except for the `occupancy` → `occupancy_primary` bug fix on line 149 of the submit route. Do NOT modify any other existing field mappings or logic for Established, H&L, or Projects.

---

## Existing Code to Reference

- **Submit route**: `src/app/api/ghl/submit-property/route.ts` — study the entire `ghlRecord` object (lines 79-194)
- **Edit route**: `src/app/api/properties/[recordId]/route.ts` — study the GET and PUT handlers
- **DwellingDetails interface**: `src/types/form.ts` — the `DwellingDetails` interface defines what's in each dwelling object
- **FormData.dwellings**: `src/types/form.ts` — `dwellings?: DwellingDetails[]`

---

## Testing

1. Submit a new Tri-plus property → verify `dwelling_details` appears in GHL as JSON
2. Submit a new Tri-plus property → verify `occupancy_primary` is set correctly (tenanted/vacant/partially_tenanted)
3. Edit the same property → verify dwelling cards repopulate from the stored JSON
4. Submit a normal Established property → verify `occupancy_primary` is now correctly populated (bug fix)
5. Submit/edit a Project → verify nothing changed
6. Check GHL character limit (~10,000 chars) — a 25-dwelling property with full data should fit

---

## Pre-requisites — DONE

- ✅ `partially_tenanted` option added to GHL `occupancy_primary` dropdown. Label: "Partially Tenanted", key: `partially_tenanted`

## Deliverables

1. `dwelling_details` JSON in submit route
2. `dwelling_details` JSON in edit GET (parse JSON → dwellings array)
3. `dwelling_details` JSON in edit PUT
4. Fix `occupancy` → `occupancy_primary` in submit route (existing bug)
5. Derive `occupancy_primary` from per-dwelling data for Tri-plus
6. Add `'partially_tenanted'` to `OccupancyType` in `src/types/form.ts`
7. Infer `dualOccupancy = 'Tri-plus'` from `dwelling_type` on edit GET route

---

## Agent Instructions

1. Read this handover doc fully
2. Read the files listed in "Existing Code to Reference"
3. Create your plan in `docs/planning/agent-plans/09d2-tri-plus-api-plan.md`
4. **STOP and wait for review** before implementing
