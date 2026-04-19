# Handover: Activity 9A — Tri-plus Form UI

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Read the parent handover for full context: `docs/planning/handovers/09-tri-plus-ui.md`
Activities 1-8 are complete. This is the first sub-activity of the Tri-plus feature.

## Goal
When the user selects **Tri-plus** occupancy + **Multi-dwelling** or **Block of Units** dwelling type on an **Established** property, show a per-dwelling/unit entry UI — similar to the existing Projects/lots UI but with different labels, fields, and trigger conditions.

---

## Confirmed Decisions

1. **Established only** — Tri-plus never applies to New properties (Projects handle that)
2. **Max 25** dwellings/units
3. **Labels**: "Dwelling 1, 2, ..." for Multi-dwelling; "Unit 1, 2, ..." for Block of Units
4. **Per-dwelling dual occupancy**: Each dwelling/unit independently selects single or dual occupancy
5. **Replicate button**: Copy Dwelling/Unit 1's values to all others
6. **Validation**: All fields must be populated (follow existing field validation rules)
7. **GHL field**: `dwelling_details` (multi-line text, stores JSON) — key: `custom_objects.property_reviews.dwelling_details`

---

## Trigger Conditions

Show the Tri-plus dwelling UI when ALL of:
- `decisionTree.propertyType === 'Established'`
- `decisionTree.dualOccupancy === 'Tri-plus'`
- `decisionTree.dwellingType === 'multidwelling'` OR `'block_of_units'`

---

## Critical Constraint

**This activity is purely additive.** Do NOT modify any existing code paths. All Established, H&L, Projects/lots, and single/dual occupancy flows must remain exactly as they are. You are only adding new code that activates when the Tri-plus + Multi-dwelling/Block of Units combination is selected.

---

## What to Build

### 1. Types: `DwellingDetails` interface
**File**: `src/types/form.ts`

Create a new `DwellingDetails` interface for per-dwelling data. Each dwelling needs:

```typescript
export interface DwellingDetails {
  label: string;                          // "Dwelling 1", "Unit 2", etc. (auto-generated)
  singleOrDual: DualOccupancy;            // Independent per-dwelling: 'Yes' | 'No'
  propertyDescription?: PropertyDescription;  // beds, baths, garage, carport, carspace, build size, etc.
  rentalAssessment?: RentalAssessment;        // occupancy, rent, appraisal, etc.
}
```

Also add `dwellings?: DwellingDetails[]` to the `FormData` interface (around line 309, near `lots`).

**Key difference from `LotDetails`**: No `lotNumber`, no `unitNumber`, no `hasUnitNumbers`, no `purchasePrice` (purchase price is property-level for Tri-plus), no `cashflowOverrides`. Does include `propertyDescription` and `rentalAssessment`.

### 2. Store: Dwelling management functions
**File**: `src/store/formStore.ts`

Add to the store interface and implementation:
- `updateDwellings: (dwellings: DwellingDetails[]) => void`
- `updateDwellingPropertyDescription: (index: number, desc: Partial<PropertyDescription>) => void`
- `updateDwellingRentalAssessment: (index: number, rental: Partial<RentalAssessment>) => void`

Pattern: Follow the existing `updateLots` / `updateLotPropertyDescription` / `updateLotRentalAssessment` pattern exactly.

Also initialise `dwellings: []` in the `initialFormData` (near `lots: []` on line 69).

### 3. Step1 UI: Dwelling entry cards
**File**: `src/components/steps/Step1DecisionTree.tsx`

Add a new section below the existing "Lots Section - Only for Projects" block (after line 1115). This section renders when `isTriPlus` is true (new computed boolean).

**UI Structure**:
```
┌─ How many dwellings/units? ─────────────────────────┐
│  [number input, 1-25]                                 │
├───────────────────────────────────────────────────────┤
│  Dwelling 1                               [Remove]    │
│  ┌── Single or Dual Occupancy? ──┐                    │
│  │ [dropdown: Single / Dual]      │                    │
│  └────────────────────────────────┘                    │
│                                                        │
│  Dwelling 2                               [Remove]    │
│  ┌── Single or Dual Occupancy? ──┐                    │
│  │ [dropdown: Single / Dual]      │                    │
│  └────────────────────────────────┘                    │
│                                                        │
│  [+ Add Another Dwelling/Unit]   [Replicate from #1]  │
└───────────────────────────────────────────────────────┘
```

**Details**:
- `isTriPlus` = `decisionTree.propertyType === 'Established' && decisionTree.dualOccupancy === 'Tri-plus' && (decisionTree.dwellingType === 'multidwelling' || decisionTree.dwellingType === 'block_of_units')`
- Label text: `dwellingType === 'multidwelling' ? 'Dwelling' : 'Unit'`
- Number input: min 1, max 25
- Each card shows only the **Single or Dual Occupancy** dropdown at this step (property description and rental fields are entered in later steps, same as Projects)
- **Replicate button**: Copies `singleOrDual` from dwelling 0 to all others
- Add local state: `const [numberOfDwellings, setNumberOfDwellings] = useState<string>('')`
- Add local state: `const [dwellings, setDwellings] = useState<DwellingDetails[]>(formData.dwellings || [])`
- Add `updateDwelling`, `addDwelling`, `removeDwelling` functions (mirror `updateLot`, `addLot`, `removeLot`)
- Add useEffect to clear dwellings when switching away from Tri-plus (mirror the lots cleanup effect)

**Import updates**: Add `DwellingDetails` to the imports from `@/types/form`. Add `updateDwellings` to the store destructuring.

### 4. Clear on occupancy/dwelling type change
When the user changes `dualOccupancy` away from `'Tri-plus'` or changes `dwellingType`, clear the dwellings array. This mirrors how changing away from Projects clears lots (lines 273-279).

---

## Existing Code to Reference

Study these patterns in the existing codebase — the Tri-plus implementation should follow the same conventions:

- **Lots state & functions**: `Step1DecisionTree.tsx` lines 11-12 (state), 281-298 (init effect), 301-331 (update/add/remove), 273-279 (cleanup effect)
- **Lots UI**: `Step1DecisionTree.tsx` lines 935-1115 (the `{isProject && ...}` block)
- **LotDetails interface**: `src/types/form.ts` lines 91-119
- **Store lot functions**: `src/store/formStore.ts` — `updateLots`, `updateLotPropertyDescription`, `updateLotRentalAssessment`

---

## What NOT to Build (handled in later sub-activities)

- Per-dwelling property description fields (Steps 3/4 — those steps will read `dwellings[]` and render per-dwelling fields)
- Per-dwelling rental assessment fields (Step 5)
- API routes for `dwelling_details` (9D)
- Make.com email rendering (9F)
- Step 7 cashflow review (9C)

This activity is **only** about:
1. The `DwellingDetails` type
2. The store functions
3. The Step 1 UI for creating/managing the dwelling entries (count + single/dual per dwelling)

---

## Testing

After implementation, verify:
1. Select Established → Tri-plus → Multi-dwelling → enter "3" → see 3 dwelling cards labelled "Dwelling 1", "Dwelling 2", "Dwelling 3"
2. Change to Block of Units → labels change to "Unit 1", "Unit 2", "Unit 3"
3. Each dwelling has independent single/dual dropdown
4. Replicate copies dwelling 1's selection to all others
5. Add/remove dwellings works, max capped at 25
6. Switching away from Tri-plus clears dwellings
7. Switching property type clears dwellings
8. `formData.dwellings` array is correctly populated in the store

---

## Plan doc
After reviewing this handover:
1. Create your plan at: `docs/planning/agent-plans/09a-tri-plus-form-ui-plan.md`
2. **STOP and wait** — do NOT implement until the planning agent (separate chat) has reviewed and approved your plan
3. The user will tell you when the plan is approved and you can proceed with implementation
