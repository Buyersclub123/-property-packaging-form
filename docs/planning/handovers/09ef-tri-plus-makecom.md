# Activity 9EF: Tri-plus Make.com — 02b Payload + 02a Email Rendering

## Context

The form now submits `dwelling_details` as a JSON string to GHL (Activity 9D2 — DONE). GHL stores the full per-dwelling data. Make.com needs two changes:

1. **02b** (Module 21): Include `dwelling_details` in the GHL create payload so it's stored on initial submission
2. **02a** (Module 3): Parse `dwelling_details` from GHL and render per-dwelling sections in the approval/review email

## Confirmed GHL Fields

| Field | Key | Type |
|---|---|---|
| `dwelling_details` | `custom_objects.property_reviews.dwelling_details` | Multi-line text (JSON string) |
| `dwelling_type` | `custom_objects.property_reviews.dwelling_type` | Dropdown |
| `occupancy_primary` | `custom_objects.property_reviews.occupancy_primary` | Dropdown |

## Data Shape

`dwelling_details` is a JSON string containing an array of dwelling objects. Each dwelling has:

```typescript
{
  label: string;           // "Unit 1", "Dwelling 2", etc.
  unitNumber: string;      // "1", "A", etc.
  singleOrDual: 'Yes' | 'No';  // Whether this dwelling is dual occupancy
  propertyDescription: {
    bedsPrimary: string;
    bedsSecondary: string;   // Only if singleOrDual === 'Yes'
    bathPrimary: string;
    bathSecondary: string;
    garagePrimary: string;
    garageSecondary: string;
    carportPrimary: string;
    carportSecondary: string;
    carspacePrimary: string;
    carspaceSecondary: string;
  };
  rentalAssessment: {
    occupancyPrimary: string;    // 'tenanted' | 'vacant' | 'tbc'
    occupancySecondary: string;  // Only if singleOrDual === 'Yes'
    currentRentPrimary: string;
    currentRentSecondary: string;
    expiryPrimary: string;
    expirySecondary: string;
    rentAppraisalPrimaryFrom: string;
    rentAppraisalPrimaryTo: string;
    rentAppraisalSecondaryFrom: string;
    rentAppraisalSecondaryTo: string;
  };
}
```

Property-level summary fields (`beds_primary`, `current_rent_primary__per_week`, `yield`, `appraised_yield`, etc.) are auto-summed from per-dwelling data and already stored in GHL — these are the totals.

---

## Change 1: 02b Module 21 — Add `dwelling_details` to payload

**File**: `02b Form App Property Submission to GHL once approved.blueprint`
**Module**: 21 (code module that builds the GHL `properties` payload)

Add to the `properties` object:

```javascript
dwelling_details: nullIfEmpty(formData.dwellingDetails),
```

The form's submit route already sends `dwelling_details` as a JSON string via `formData.dwellingDetails`. 02b just needs to pass it through to GHL.

**Note**: Also needs the Tri-plus derived `occupancy_primary` logic. Currently 02b sends:
```javascript
occupancy_primary: nullIfEmpty(formData.rentalAssessment?.occupancyPrimary),
```

This needs wrapping with the same derivation logic used in the form's submit route:
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

02b receives raw `formData` from the form app webhook. Module 21 reads `formData.rentalAssessment?.occupancyPrimary` — this is the raw form field, which is empty for Tri-plus (occupancy is per-dwelling, not property-level). So 02b **does** need the derivation IIFE above to compute the property-level value from per-dwelling data.

---

## Change 2: 02a Module 3 — Render Tri-plus per-dwelling email sections

**File**: `02a GHL Property Review Submitted approval & email processing.blueprint`
**Module**: 3 (code module that builds the email HTML/text)

Module 3 reads GHL property data and builds email HTML. It currently handles:
- **Projects**: Loops over lots (from Module 86 `input.lots`)
- **Dual**: Shows Unit A / Unit B with primary/secondary fields
- **Single**: Standard single-dwelling rendering

For Tri-plus, add a new branch that parses `dwelling_details` JSON and renders per-dwelling sections.

**IMPORTANT**: Module 3 has **two separate code paths** — one for portal requests (`isPortalRequest === true`) and one for normal GHL webhook requests. Both paths have their own variable extraction, property type detection, and section rendering. The Tri-plus detection, dwelling parsing, and rendering branches must be added to **both paths**. The examples below show the portal path (using `vPortal()`); replicate the same pattern in the normal path using its equivalent variable accessors.

### Detection

Add after the existing property type detection (around the `isDualPortal` / `isProjectPortal` checks):

```javascript
const dwellingTypePortal = vPortal("dwelling_type");
const isTriPlusPortal = (dwellingTypePortal === 'multidwelling' || dwellingTypePortal === 'block_of_units');

// Parse dwelling_details for Tri-plus
let dwellingsParsed = [];
if (isTriPlusPortal) {
  try {
    const rawDwellings = vPortal("dwelling_details");
    if (rawDwellings && typeof rawDwellings === 'string') {
      dwellingsParsed = JSON.parse(rawDwellings);
    }
  } catch (e) {
    console.log("Module 3 - Failed to parse dwelling_details:", e);
  }
}

const dwellingLabel = dwellingTypePortal === 'block_of_units' ? 'Unit' : 'Dwelling';
```

### Property Description — Tri-plus branch

Insert a new `else if (isTriPlusPortal && dwellingsParsed.length > 0)` branch before the existing single/dual property description rendering. Structure:

**Summary totals first** (from property-level fields already in GHL):
```
Property Description
  Bed: {total beds}
  Bath: {total bath}
  Garage: {total garage}
  Car-port: {total carport}     ← only if > 0
  Car-space: {total carspace}   ← only if > 0
  Built: {year_built} approx.
  Land Size: {land_size} sqm approx.
  Title: {title}
  Body corp.: {value}           ← only for strata titles
```

**Then per-dwelling breakdown**:
```
{Unit/Dwelling} 1
  Bed: 3
  Bath: 2
  Garage: 1

{Unit/Dwelling} 2 (dual)
  Bed: 3 + 2
  Bath: 2 + 1
  Garage: 1 + 1
```

For each dwelling:
- Use `dwelling.label` or construct from `dwellingLabel + " " + index`
- If `dwelling.singleOrDual === 'Yes'`, show "primary + secondary" format (same as existing dual logic)
- If single, show just the primary value
- Apply same car-port/car-space display rules as existing code (only show if total ≥ 1)

**Additional Dialogue**: Property-level, after all dwellings (same as current — `property_description_additional_dialogue`)

### Purchase Price — NO CHANGE

Purchase Price is property-level only. The existing rendering already works — it uses `total_price`, `asking`, etc. from property-level GHL fields. No per-dwelling breakdown needed.

### Rental Assessment — Tri-plus branch

Insert a new `else if (isTriPlusPortal && dwellingsParsed.length > 0)` branch in the rental section. Structure:

**Summary totals first** (from property-level fields):
```
Rental Assessment
  Occupancy: {derived value — Tenanted / Vacant / Partially Tenanted}
  Current Rent: {total} per week    ← only if any dwelling tenanted
  Current Yield: {yield}%           ← only if any dwelling tenanted
  Appraisal: ${from} - ${to} per week
  Appraised Yield: {appraised_yield}%
```

**Then per-dwelling breakdown**:
```
{Unit/Dwelling} 1
  Occupancy: Tenanted
  Current Rent: $450 per week
  Expiry: 01/01/2027
  Appraisal: $450 - $480 per week

{Unit/Dwelling} 2 (dual)
  Occupancy:
    Unit A: Tenanted
    Unit B: Vacant
  Current Rent:
    Total: $700 per week
    Unit A: $400 per week
    Unit B: N/A
  Expiry:
    Unit A: 01/01/2027
    Unit B: N/A
  Appraisal:
    Total: $700 - $750 per week
    Unit A: $400 - $430 per week
    Unit B: $300 - $320 per week
```

For each dwelling:
- If `dwelling.singleOrDual === 'Yes'`, use the existing dual occupancy email format (Unit A/B indented)
- If single, use single occupancy format
- Only show Current Rent / Expiry / Yield if that dwelling is tenanted (same rules as existing code)

**Additional Dialogue**: Property-level, after all dwellings (same as current — `rental_assessment_additional_dialogue`)

---

## Critical Constraint

**Do NOT modify any existing rendering logic** for Established, H&L, SMSF, or Projects. Only add new `isTriPlusPortal` branches that sit alongside the existing code paths.

---

## Files to Reference

- **02a Module 3 code**: Pasted in `jotter 1804.md` (complete Module 3 email builder)
- **02b Module 21 code**: In blueprint file, builds the GHL payload from `formData`
- **Projects lot-loop pattern**: Lines ~1241-1310 in jotter (closest model for per-dwelling iteration)
- **Dual occupancy rendering**: Lines ~1369-1521 in jotter (reuse for dual dwellings within Tri-plus)
- **DwellingDetails interface**: `src/types/form.ts` — defines the dwelling object structure

---

## Testing

1. Submit a Tri-plus property with 3 dwellings (mix of single and dual) → verify email renders summary totals + per-dwelling sections
2. Submit a Tri-plus property where all dwellings are tenanted → verify "Tenanted" at property level
3. Submit a Tri-plus property with mix of tenanted/vacant → verify "Partially Tenanted" at property level
4. Submit a normal Established property → verify email unchanged
5. Submit a Project → verify email unchanged

---

## Deliverables

1. 02b Module 21: Add `dwelling_details` to GHL payload
2. 02b Module 21: Add Tri-plus `occupancy_primary` derivation
3. 02a Module 3: Detect Tri-plus via `dwelling_type`
4. 02a Module 3: Parse `dwelling_details` JSON
5. 02a Module 3: Render Tri-plus Property Description (summary totals + per-dwelling)
6. 02a Module 3: Render Tri-plus Rental Assessment (summary totals + per-dwelling)

---

## Agent Instructions

1. Read this handover doc fully
2. Read `make-com-scenarios/module-3-current.js` (02a Module 3 — email builder)
3. Read `make-com-scenarios/module-21-current.js` (02b Module 21 — payload builder)
4. Read `src/types/form.ts` for the DwellingDetails interface
5. Create your plan in `docs/planning/agent-plans/09ef-tri-plus-makecom-plan.md`
6. **STOP and wait for review** before implementing

## Output Format

These are Make.com code modules extracted into local `.js` files. The current code is at:

- **Module 21** (02b payload builder): `make-com-scenarios/module-21-current.js` (11,431 chars)
- **Module 3** (02a email builder): `make-com-scenarios/module-3-current.js` (191,133 chars)

**Edit these files directly** using the normal edit tools. The user will copy-paste the final file contents into the corresponding Make.com code module. Since these are large files, use targeted edits — do NOT rewrite the entire file.
