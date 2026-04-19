# Handover: Activity 9A2 — Tri-plus Per-Dwelling Fields in Step 3

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Read the parent handover: `docs/planning/handovers/09-tri-plus-ui.md`
Activity 9A is complete — Step 1 now collects dwelling count and single/dual per dwelling.

## Problem
Step 3 (Property Details) currently shows standard single-property fields when Tri-plus is selected. It needs to show **per-dwelling cards** — each with its own Property Description and Rental Assessment fields — similar to how Projects shows per-lot cards.

Also: **remove the Replicate button** from Step 1 — it's not needed for Tri-plus (fewer fields per dwelling than Projects).

---

## Critical Constraint

**This activity is purely additive to Step 3.** Do NOT modify any existing code paths for Established single/dual, H&L, or Projects. The only change to Step 1 is removing the replicate button and its function.

---

## What to Build

### 1. Remove replicate button from Step 1
**File**: `src/components/steps/Step1DecisionTree.tsx`

- Remove the `replicateDwellingFromFirst` function (lines ~409-417)
- Remove the replicate button JSX from the dwellings section (the `{dwellings.length >= 2 && ...}` block)
- Keep everything else (add/remove buttons, dwelling cards, single/dual dropdown)

### 2. Add per-dwelling view to Step 3
**File**: `src/components/steps/Step2PropertyDetails.tsx` (this is the actual Step 3 / Property Details component)

**Pattern to follow**: The existing `ProjectLotsView` component (line ~2090) renders per-lot accordions with Property Description, Purchase Price, and Rental Assessment. Create a similar `TriPlusDwellingsView` component.

**Key differences from Projects**:
- Triggered by `isTriPlus` (not `isProject`)
- Reads `formData.dwellings[]` (not `formData.lots[]`)
- Uses `updateDwellingPropertyDescription` and `updateDwellingRentalAssessment` from the store
- **No Purchase Price per dwelling** — Purchase Price is property-level only (show once at the top, same as current Established)
- **No lot number / unit number fields** per dwelling
- **No replicate button**
- **No Project Brief / Project Address sections**
- Labels: "Dwelling N" or "Unit N" based on `decisionTree.dwellingType`

**Per-dwelling card fields — Property Description**:
Each dwelling card should have the same property description fields as a standard Established property:
- Beds (primary) *
- Beds (secondary) — only if dwelling's `singleOrDual === 'Yes'`
- Bath (primary) *
- Bath (secondary) — only if dual
- Garage (primary) *
- Garage (secondary) — only if dual
- Carport (primary)
- Carport (secondary) — only if dual
- Car Spaces (primary)
- Car Spaces (secondary) — only if dual
- Year Built *
- Land Size *
- Title *
- Property Description Additional Dialogue (expandable, per-dwelling)

**Property-level fields (shown once at the top, NOT per-dwelling)**:
- Body Corp per Quarter
- Body Corp Description
- Purchase Price (full section: Asking, Comparable Sales, Acceptable Acquisition, Total Price, Cashback/Rebate, etc.)

**Per-dwelling card fields — Rental Assessment**:
- Occupancy (primary) *
- Occupancy (secondary) — only if dual
- Current Rent Primary *
- Current Rent Secondary — only if dual
- Expiry Primary
- Expiry Secondary — only if dual
- Rent Appraisal Primary From / To *
- Rent Appraisal Secondary From / To — only if dual
- Rental Assessment Additional Dialogue (expandable, per-dwelling)

**Property-level Rental fields (shown once)**:
- Yield (auto-calculated or manual)
- Appraised Yield

### 3. Routing logic in Step 3
At the top of `Step2PropertyDetails`, after the existing `isProject` check (line ~375):

```typescript
if (isProject) {
  return <ProjectLotsView />;
}

// Add this:
if (isTriPlus) {
  return <TriPlusDwellingsView />;
}
```

Add `isTriPlus` computed the same way as in Step 1:
```typescript
const isTriPlus = decisionTree.propertyType === 'Established' && decisionTree.dualOccupancy === 'Tri-plus' && (decisionTree.dwellingType === 'multidwelling' || decisionTree.dwellingType === 'block_of_units');
```

### 4. Store imports
Add `updateDwellingPropertyDescription`, `updateDwellingRentalAssessment`, `updateDwellings` to the store destructuring in the new component.

---

## UI Layout

```
┌─ Property Details ──────────────────────────────────┐
│                                                      │
│  ── Property-Level Fields ──                         │
│  Body Corp per Quarter: [input]                      │
│  Body Corp Description: [expandable]                 │
│                                                      │
│  ── Purchase Price ── (property-level, shown once)   │
│  Asking: [dropdown]                                  │
│  ... (all purchase price fields)                     │
│                                                      │
│  ── Dwelling 1 ─────────────────────── [collapse] ── │
│  │  Property Description                             │
│  │  Beds: [4]  Bath: [2]  Garage: [1]  ...          │
│  │  Rental Assessment                                │
│  │  Occupancy: [tenanted]  Rent: [$450]  ...         │
│  ├────────────────────────────────────────────────── │
│  ── Dwelling 2 ─────────────────────── [collapse] ── │
│  │  Property Description                             │
│  │  Beds: [3]  Bath: [1]  Garage: [1]  ...          │
│  │  Rental Assessment                                │
│  │  Occupancy: [vacant]  Rent Appraisal: ...         │
│  ├────────────────────────────────────────────────── │
│  ... (Dwelling N)                                    │
│                                                      │
│  ── Property-Level Rental ──                         │
│  Yield: [auto]  Appraised Yield: [auto]              │
│  Rental Assessment Additional Dialogue: [expandable] │
└──────────────────────────────────────────────────────┘
```

---

## Existing Code to Reference

- **ProjectLotsView**: `Step2PropertyDetails.tsx` line ~2090 — the per-lot accordion pattern
- **Standard Established fields**: `Step2PropertyDetails.tsx` lines ~379-2087 — the single-property form
- **Store functions**: `formStore.ts` — `updateDwellingPropertyDescription`, `updateDwellingRentalAssessment`
- **DwellingDetails interface**: `src/types/form.ts` lines 121-127

---

## Testing

1. Select Established → Tri-plus → Multi-dwelling → enter 4 dwellings (all Single Occupancy)
2. Step 3 shows property-level fields at top, then 4 dwelling cards each with Property Description + Rental Assessment
3. Set Dwelling 2 to Dual Occupancy → secondary fields appear for that dwelling only
4. Purchase Price section appears once (property-level), not per-dwelling
5. Fill in all fields → verify `formData.dwellings[].propertyDescription` and `formData.dwellings[].rentalAssessment` are populated in store
6. Switch from Tri-plus to Single Occupancy → Step 3 reverts to standard Established view
7. Verify standard Established, H&L, and Projects flows are completely unaffected

---

## Plan doc
After reviewing this handover:
1. Create your plan at: `docs/planning/agent-plans/09a2-tri-plus-step3-fields-plan.md`
2. **STOP and wait** — do NOT implement until the planning agent (separate chat) has reviewed and approved your plan
3. The user will tell you when the plan is approved and you can proceed with implementation
