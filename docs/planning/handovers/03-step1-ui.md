# Handover: Activity 3 — Step1 Decision Tree UI Changes

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Depends on Activity 2 (types & store) being complete.

## File to modify
`src/components/steps/Step1DecisionTree.tsx`

## Changes required

### 1. Update the "Is this single or dual occupancy?" dropdown
Add a third option: **Tri-plus**.

Current options:
- Single Occupancy (value: `No`)
- Dual Occupancy (value: `Yes`)

Add:
- Tri-plus (value: `Tri-plus`)

This dropdown is currently shown for: `propertyType === 'Established'` OR `(propertyType === 'New' && lotType === 'Individual')`. Keep this visibility rule unchanged.

### 2. Add a "Dwelling Type" dropdown
Add a new dropdown **after** the occupancy dropdown, visible under the same conditions (Established or H&L individual — NOT Projects).

The dropdown values must be **filtered by the occupancy selection**. Use option keys as values, display names as labels:
- If `dualOccupancy === 'No'` (Single): `unit`/Unit, `townhouse`/Townhouse, `villa`/Villa, `house`/House
- If `dualOccupancy === 'Yes'` (Dual): `dualkey`/Dual-key, `duplex`/Duplex
- If `dualOccupancy === 'Tri-plus'`: `multidwelling`/Multi-dwelling, `block_of_units`/Block of Units

When occupancy changes, **clear the dwelling type** if the current value is no longer valid for the new occupancy.

Store the value via `updateDecisionTree({ dwellingType: value })`.

### 3. Clear dwelling type when occupancy or property type changes
If the user changes property type, lot type, or occupancy, clear dwelling type to null. Follow the same pattern used for clearing other dependent fields (see the existing `clearDependentAddressFields` calls and the useEffect that clears contract type).

## Styling
Use the same `label-field`, `input-field` CSS classes and layout pattern as the existing dropdowns.

## Important constraints
- Do NOT modify the summary line computation — that's Activity 4.
- Do NOT modify API routes — that's Activities 5 and 6.
- Import `DwellingType` from `@/types/form` if needed.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/03-step1-ui-plan.md`
