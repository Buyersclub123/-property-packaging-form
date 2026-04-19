# Agent Plan: Activity 3 — Step1 Decision Tree UI Changes

## Summary
Add "Tri-plus" as a third occupancy option and add a new "Dwelling Type" dropdown filtered by the selected occupancy. Clear dwelling type when upstream selections change.

## Files to Modify

### 1. `src/components/steps/Step1DecisionTree.tsx`
This is the only file that needs code changes.

#### Change A: Add "Tri-plus" option to occupancy dropdown (line ~488)
Add a third `<option>` to the existing "Is this single or dual occupancy?" `<select>`:
```
<option value="Tri-plus">Tri-plus</option>
```
No changes to the visibility condition — it already shows for Established and H&L Individual.

#### Change B: Clear `dwellingType` when occupancy changes (line ~480-481)
In the occupancy dropdown's `onChange` handler, add `dwellingType: null` to the `updateDecisionTree` call:
```ts
updateDecisionTree({ dualOccupancy: e.target.value as DualOccupancy, dwellingType: null })
```

#### Change C: Clear `dwellingType` when property type changes (line ~432-436)
In the property type dropdown's `onChange`, add `dwellingType: null` to the existing `updateDecisionTree` call (alongside the existing `lotType: null, dualOccupancy: null`).

#### Change D: Clear `dwellingType` when lot type changes (line ~457-459)
In the H&L/Project dropdown's `onChange`, add `dwellingType: null` to the existing `updateDecisionTree` call (alongside the existing `dualOccupancy: null`).

#### Change E: Clear `dwellingType` in the "Clear Decision Tree Data" button (line ~379-385)
Add `dwellingType: null` to the `updateDecisionTree` call inside the clear button's onClick handler.

#### Change F: Add "Dwelling Type" dropdown after occupancy dropdown (after line ~491)
Insert a new `<div>` block immediately after the occupancy dropdown's closing `</div>`, inside the same visibility condition (Established or H&L Individual, not Projects). The dropdown:

- **Label:** `Dwelling Type *`
- **CSS classes:** `label-field` for label, `input-field` for select (matching existing pattern)
- **Value:** `decisionTree.dwellingType || ''`
- **onChange:** `updateDecisionTree({ dwellingType: e.target.value as DwellingType })`
- **Visibility:** Same condition as occupancy dropdown — shown when `propertyType === 'Established'` OR `(propertyType === 'New' && lotType === 'Individual')`
- **Additional condition:** Only show when `dualOccupancy` is set (not null/empty), since the options depend on the occupancy selection
- **Options filtered by occupancy:**
  - `dualOccupancy === 'No'` → `unit`/Unit, `townhouse`/Townhouse, `villa`/Villa, `house`/House
  - `dualOccupancy === 'Yes'` → `dualkey`/Dual-key, `duplex`/Duplex
  - `dualOccupancy === 'Tri-plus'` → `multidwelling`/Multi-dwelling, `block_of_units`/Block of Units

#### Change G: Import `DwellingType` (line 5)
`DwellingType` is already exported from `@/types/form` (confirmed in form.ts line 8). Add it to the existing import on line 5:
```ts
import { PropertyType, ContractType, LotType, DualOccupancy, DwellingType, StatusType, LotDetails, ContractTypeSimplified } from '@/types/form';
```

## Files NOT Modified
- `src/types/form.ts` — `DwellingType` type and `DecisionTree.dwellingType` field already exist (Activity 2 completed this).
- `src/store/formStore.ts` — `updateDecisionTree` already accepts `Partial<DecisionTree>`, so `dwellingType` is already supported.
- No API routes — that's Activities 5 and 6.
- No summary line computation — that's Activity 4.

## Risks & Questions

1. **Tri-plus + hasUnitNumbers auto-set:** The existing useEffect (lines 132-160) auto-sets `hasUnitNumbers: true` when `dualOccupancy === 'Yes'` and clears it when switching away from `'Yes'`. The `'Tri-plus'` value is not `'Yes'`, so it won't trigger auto-set — this seems correct (Tri-plus properties may or may not have unit numbers). **No action needed.**

2. **Existing `dualOccupancy` checks elsewhere:** The `DualOccupancy` type already includes `'Tri-plus'` (confirmed in form.ts line 7). However, there are several places in the file that check `dualOccupancy === 'Yes'` for unit number formatting (e.g., "Units" plural vs "Unit" singular). Tri-plus will fall through to the else branch and use "Unit" singular — this may need revisiting in Activity 9 but is acceptable for now.

3. **`required` attribute:** The dwelling type dropdown will use `required={!isEditMode}`, matching the occupancy dropdown pattern.

## Verification Plan

1. **Dev server:** Run `npm run dev`, navigate to the form, confirm:
   - Occupancy dropdown shows three options: Single Occupancy, Dual Occupancy, Tri-plus
   - Selecting an occupancy value reveals the Dwelling Type dropdown with the correct filtered options
   - Changing occupancy clears dwelling type and shows new options
   - Changing property type or lot type clears both occupancy and dwelling type
   - "Clear Decision Tree Data" button clears dwelling type
   - Dwelling Type dropdown is hidden for Projects (`lotType === 'Multiple'`)
   - Dwelling Type dropdown is hidden when no occupancy is selected

2. **Console check:** Verify `decisionTree` logged by the existing debug useEffect (lines 51-58) includes `dwellingType` with the correct value after selection.

3. **No regressions:** Existing occupancy-dependent behaviour (unit number auto-set for Dual, lot number section visibility) still works correctly.
