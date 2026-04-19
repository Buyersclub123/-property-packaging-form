# Handover: Activity 2 — Types & Store Updates

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`

We are adding two new concepts to the property form:
1. **Dwelling Type** — what kind of building (Unit, Townhouse, etc.), selected by the packager
2. **Subject Line** — the computed email subject line (editable), stored in GHL

The existing "Is this single or dual occupancy?" dropdown gains a third option: **Tri-plus** (for properties with 3+ dwellings).

## Files to modify

### 1. `src/types/form.ts`

**Add a `DwellingType` union type:**
```typescript
export type DwellingType = 'unit' | 'townhouse' | 'villa' | 'house' | 'dualkey' | 'duplex' | 'multidwelling' | 'block_of_units';
```

These are the GHL option keys (backend values). Display names for UI:
- `unit` → Unit, `townhouse` → Townhouse, `villa` → Villa, `house` → House
- `dualkey` → Dual-key, `duplex` → Duplex
- `multidwelling` → Multi-dwelling, `block_of_units` → Block of Units

**Update `DualOccupancy` type** to include Tri-plus:
```typescript
// CURRENT:
export type DualOccupancy = 'Yes' | 'No' | 'Mixed' | 'TBC' | '';
// NEW:
export type DualOccupancy = 'Yes' | 'No' | 'Tri-plus' | 'Mixed' | 'TBC' | '';
```

**Add `dwellingType` to `DecisionTree` interface:**
```typescript
export interface DecisionTree {
  propertyType: PropertyType | null;
  contractType: ContractType | null;
  contractTypeSimplified?: ContractTypeSimplified | null;
  lotType: LotType | null;
  dualOccupancy: DualOccupancy | null;
  dwellingType?: DwellingType | null;  // NEW
  status: StatusType | null;
}
```

**Add `subjectLine` to `FormData` interface:**
Find the `FormData` interface and add `subjectLine?: string;` as a top-level field.

### 2. `src/store/formStore.ts`

Update `initialFormData` to include `dwellingType: null` in the decisionTree object and `subjectLine: ''` at the top level of FormData.

Ensure the `DwellingType` type is imported from `@/types/form`.

## Important constraints
- Do NOT change any existing field names or values — only add new ones.
- Do NOT modify any component files — that's Activity 3.
- Do NOT modify any API route files — that's Activities 5 and 6.
- The `DualOccupancy` type is used throughout the codebase. Adding 'Tri-plus' must not break existing `=== 'Yes'` or `=== 'No'` checks. Verify no switch statements or exhaustive checks would break.

## Verification
After making changes, run `npx tsc --noEmit` to confirm no type errors.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/02-types-and-store-plan.md`
