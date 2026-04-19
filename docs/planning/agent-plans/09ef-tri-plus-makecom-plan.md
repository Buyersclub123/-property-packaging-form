# Plan: Activity 9EF — Tri-plus Make.com Changes

## Source Files Read
1. `docs/planning/00-MASTER-PLAN.md` — master plan (97 lines)
2. `docs/planning/handovers/09ef-tri-plus-makecom.md` — handover doc (283 lines)
3. `make-com-scenarios/module-3-current.js` — 02a Module 3 email builder (3,964 lines)
4. `make-com-scenarios/module-21-current.js` — 02b Module 21 payload builder (205 lines)
5. `src/types/form.ts` — DwellingDetails interface (468 lines)

---

## Files I Will Modify

| File | What |
|------|------|
| `make-com-scenarios/module-21-current.js` | Add `dwelling_details` field + Tri-plus `occupancy_primary` derivation |
| `make-com-scenarios/module-3-current.js` | Add Tri-plus detection, dwelling parsing, Property Description branch, Rental Assessment branch (both Portal + Normal paths) |

No other files will be modified.

---

## Change 1: Module 21 — Add `dwelling_details` to payload

**File**: `make-com-scenarios/module-21-current.js`
**Location**: Line 200, after `project_brief`, before closing `}`

Add:
```javascript
    dwelling_details: nullIfEmpty(formData.dwellingDetails),
```

This passes the JSON string through from `formData` to GHL. The form's submit route already serializes the dwellings array to a JSON string as `dwellingDetails`.

## Change 2: Module 21 — Tri-plus `occupancy_primary` derivation

**File**: `make-com-scenarios/module-21-current.js`
**Location**: Line 152 — replace the existing `occupancy_primary` line

Replace:
```javascript
    occupancy_primary: nullIfEmpty(formData.rentalAssessment?.occupancyPrimary),
```

With the IIFE from the handover doc (lines 78–93):
```javascript
    occupancy_primary: (() => {
      const dt = formData.decisionTree;
      if (dt?.dualOccupancy === 'Tri-plus' && formData.dwellings && formData.dwellings.length > 0) {
        const allOccupancies = [];
        formData.dwellings.forEach(d => {
          if (d.rentalAssessment?.occupancyPrimary) allOccupancies.push(d.rentalAssessment.occupancyPrimary);
          if (d.singleOrDual === 'Yes' && d.rentalAssessment?.occupancySecondary) allOccupancies.push(d.rentalAssessment.occupancySecondary);
        });
        const unique = [...new Set(allOccupancies)];
        if (unique.length === 1 && unique[0] === 'tenanted') return 'tenanted';
        if (unique.length === 1 && unique[0] === 'vacant') return 'vacant';
        if (unique.length > 0) return 'partially_tenanted';
        return null;
      }
      return nullIfEmpty(formData.rentalAssessment?.occupancyPrimary);
    })(),
```

**Why**: For Tri-plus, `formData.rentalAssessment.occupancyPrimary` is empty (occupancy is per-dwelling). This derives the property-level value. Non-Tri-plus falls through to existing behaviour.

---

## Change 3: Module 3 — Tri-plus detection + dwelling parsing (both paths)

**File**: `make-com-scenarios/module-3-current.js`

### Portal path
**Insert after line 609** (after `isNewPropertyPortal` definition, before the lots parsing block at line 612):

```javascript
// Tri-plus detection
const dwellingTypePortal = vPortal("dwelling_type");
const isTriPlusPortal = (dwellingTypePortal === 'multidwelling' || dwellingTypePortal === 'block_of_units');

let dwellingsParsedPortal = [];
if (isTriPlusPortal) {
  try {
    const rawDwellings = vPortal("dwelling_details");
    if (rawDwellings && typeof rawDwellings === 'string') {
      dwellingsParsedPortal = JSON.parse(rawDwellings);
    }
  } catch (e) {
    console.log("Module 3 Portal - Failed to parse dwelling_details:", e);
  }
}
const dwellingLabelPortal = dwellingTypePortal === 'block_of_units' ? 'Unit' : 'Dwelling';
```

### Normal path
**Insert after line 2131** (after `isDual` definition, before line 2133 `// 4) Subject line`):

```javascript
// Tri-plus detection
const dwellingTypeNormal = v("dwelling_type");
const isTriPlus = (dwellingTypeNormal === 'multidwelling' || dwellingTypeNormal === 'block_of_units');

let dwellingsParsed = [];
if (isTriPlus) {
  try {
    const rawDwellings = v("dwelling_details");
    if (rawDwellings && typeof rawDwellings === 'string') {
      dwellingsParsed = JSON.parse(rawDwellings);
    }
  } catch (e) {
    console.log("Module 3 - Failed to parse dwelling_details:", e);
  }
}
const dwellingLabel = dwellingTypeNormal === 'block_of_units' ? 'Unit' : 'Dwelling';
```

---

## Change 4: Module 3 — Tri-plus Property Description branch (both paths)

**File**: `make-com-scenarios/module-3-current.js`

### Portal path
**Insert between line 753** (end of Project lot-loop closing `}`) **and line 754** (the `else if (hasAnyPortal(...)` block).

Convert existing `} else if (hasAnyPortal(...))` to `} else if (isTriPlusPortal && dwellingsParsedPortal.length > 0) { ... } else if (hasAnyPortal(...))`.

### Normal path
**Insert between line 2518** (end of Project lot-loop closing `});`) **and line 2519** (the `} else if (hasAny(...)` block).

Convert `} else if (hasAny(...))` to `} else if (isTriPlus && dwellingsParsed.length > 0) { ... } else if (hasAny(...))`.

### Branch structure (same for both paths, using appropriate variable suffixes):

**1. Summary totals** (from property-level GHL fields — `beds_primary`, `bath_primary`, etc.):
- Bed, Bath, Garage — always show (using same formatting as existing single/dual code)
- Car-port, Car-space — only show if total > 0
- Built: `year_built` for established, `build_size` for new (same logic as existing code line 848/2636)
- Land Size, Title, Body Corp (strata titles only — same logic as existing code lines 877-893 / 2664-2686)
- Additional Dialogue — property-level, after summary

**2. Per-dwelling breakdown** — loop over `dwellingsParsed`:
- Heading: use `dwelling.label` (e.g. "Unit 1", "Dwelling 2"); append `(dual)` if `dwelling.singleOrDual === 'Yes'`
- For each dwelling, read `dwelling.propertyDescription`:
  - If **single** (`singleOrDual !== 'Yes'`): show `bedsPrimary`, `bathPrimary`, `garagePrimary`
  - If **dual** (`singleOrDual === 'Yes'`): show `bedsPrimary + bedsSecondary`, `bathPrimary + bathSecondary`, etc.
  - Car-port / Car-space: only show if total across primary+secondary ≥ 1
- Reuse the `formatBathValue`/`formatBathValuePortal` helper already in the existing code
- Reuse the same `toNum`/`toNumPortal` and `hasValue`/`hasValuePortal` helpers for garage/carport/carspace display logic

**3. Text version** — follows same structure, using `textLine()` calls

---

## Change 5: Module 3 — Tri-plus Rental Assessment branch (both paths)

**File**: `make-com-scenarios/module-3-current.js`

### Portal path
**Insert between line 1310** (end of Project lot-loop rental block) **and line 1311** (the `} else {` which starts the single/dual block).

Convert `} else {` to `} else if (isTriPlusPortal && dwellingsParsedPortal.length > 0) { ... } else {`.

### Normal path
**Insert between line 3252** (end of Project lot-loop closing `});`) **and line 3254** (the `} else if (!isDual) {` block).

Convert `} else if (!isDual) {` to `} else if (isTriPlus && dwellingsParsed.length > 0) { ... } else if (!isDual) {`.

### Branch structure (same for both paths):

**1. Summary totals** (from property-level GHL fields):
- Occupancy: `formatOccupancy(occupancyPrimary)` — the derived value (Tenanted / Vacant / Partially Tenanted)
- Current Rent: total from `current_rent_primary__per_week` — only if occupancy is tenanted/partially_tenanted
- Current Yield: from `yield` — only if tenanted/partially_tenanted
- Appraisal: total range from `rent_appraisal_primary_from`/`to`
- Appraised Yield: from `appraised_yield`

**2. Per-dwelling breakdown** — loop over `dwellingsParsed`:
- Heading: use `dwelling.label`; append `(dual)` if dual
- For each dwelling, read `dwelling.rentalAssessment`:
  - If **single dwelling**:
    - Occupancy: `formatOccupancy(dwelling.rentalAssessment.occupancyPrimary)`
    - Current Rent: only if tenanted
    - Expiry: only if tenanted
    - Appraisal: range from `rentAppraisalPrimaryFrom`/`To`
  - If **dual dwelling** (`singleOrDual === 'Yes'`):
    - Occupancy: heading, then "Unit A: ..." / "Unit B: ..." indented (reuse existing dual format from lines 1379-1386 / 3315-3325)
    - Current Rent: Total + Unit A / Unit B indented (reuse existing dual format from lines 1389-1408 / 3334-3353)
    - Expiry: Unit A / Unit B indented (reuse existing dual format from lines 1412-1426 / 3357-3371)
    - Appraisal: Total + Unit A / Unit B indented (reuse existing dual format from lines 1434-1451 / 3379-3396)

**3. Additional Dialogue** — property-level, after all dwellings (same as existing — `rental_assessment_additional_dialogue`)

**4. Text version** — follows same structure

---

## Purchase Price — NO CHANGE

Per handover: Purchase Price is property-level only. No per-dwelling breakdown needed.

---

## Risks and Questions

### Risks
1. **Large file edits**: Module 3 is 3,964 lines. Each Tri-plus branch (Property Description + Rental Assessment × 2 paths) will add ~400-600 lines total. I will use targeted edits, not rewrite the file.
2. **dwelling_details JSON parsing**: If the GHL multi-line text field mangles the JSON (e.g. truncation, encoding), `JSON.parse` will fail. The `try/catch` handles this gracefully — the Tri-plus branch won't render and the email falls through to the existing single/dual logic (which would show property-level totals only).
3. **Existing code not broken**: The new `isTriPlus` branches sit alongside existing branches using `else if`. If `isTriPlus` is false, existing code runs unchanged.

### Questions
1. **Occupancy display for Tri-plus summary**: The handover says to show the derived occupancy value. For "partially_tenanted", should the display text be "Partially Tenanted" (via `formatOccupancy`)? The existing `formatOccupancy` function (line 135) already handles this via the generic capitalise-and-replace-underscores fallback — it would produce "Partially tenanted". **Plan**: I'll rely on the existing `formatOccupancy` function; if a different display is needed, it can be adjusted post-review.
2. **Tri-plus is always Established property type**: The handover says Tri-plus uses Established format for subject line (Activity 9B). For email rendering, should occupancy/rent/expiry show for Tri-plus the same way as Established (i.e. always show occupancy, show rent/expiry only if tenanted)? **Plan**: Yes — Tri-plus properties are Established, so the same occupancy/rent display rules apply.
3. **Bath "point" formatting**: Dwelling details come from the form as camelCase (e.g. `bathPrimary: "2.5"`), not the GHL "2point5" format. So `formatBathValue` (which converts "point" → ".") is not needed for per-dwelling values — they already have decimal notation. **Plan**: Apply `formatBathValue` anyway (it's a no-op on values that already have dots, and defensive in case GHL round-trips them).

---

## Verification

1. **Manual review of email HTML**: After implementing, I can produce sample HTML snippets showing what each section would render for a test Tri-plus property with 3 dwellings (mix of single and dual).
2. **Non-Tri-plus regression**: The changes are additive `else if` branches. Existing test cases (Established, H&L, Project) cannot hit the Tri-plus branch because `isTriPlus` / `isTriPlusPortal` will be false.
3. **End-to-end testing** (from handover):
   - Submit Tri-plus with 3 dwellings (mix of single + dual) → verify summary + per-dwelling sections
   - Submit Tri-plus all tenanted → verify "Tenanted" at property level
   - Submit Tri-plus mixed tenanted/vacant → verify "Partially Tenanted"
   - Submit normal Established → verify email unchanged
   - Submit Project → verify email unchanged

---

## Implementation Order

| Step | Change | Est. Lines Added |
|------|--------|-----------------|
| 1 | Module 21: `dwelling_details` field | 1 line |
| 2 | Module 21: `occupancy_primary` IIFE | ~15 lines (replacing 1) |
| 3 | Module 3: Tri-plus detection (Portal path) | ~15 lines |
| 4 | Module 3: Tri-plus detection (Normal path) | ~15 lines |
| 5 | Module 3: Property Description branch (Portal path) | ~120 lines |
| 6 | Module 3: Property Description branch (Normal path) | ~120 lines |
| 7 | Module 3: Rental Assessment branch (Portal path) | ~150 lines |
| 8 | Module 3: Rental Assessment branch (Normal path) | ~150 lines |
| **Total** | | **~585 lines** |
