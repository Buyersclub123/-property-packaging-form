# 9A Tri-plus Form UI — Implementation Plan

## Steps

1. **Types** — Add `DwellingDetails` interface and `dwellings?: DwellingDetails[]` to `FormData` in `src/types/form.ts`
2. **Store** — Add `updateDwellings`, `updateDwellingPropertyDescription`, `updateDwellingRentalAssessment` to `src/store/formStore.ts`; initialise `dwellings: []` in `initialFormData`
3. **Step1 UI** — Add dwelling state, functions, cleanup effect, and UI section to `src/components/steps/Step1DecisionTree.tsx`

## Status
- [x] Step 1: Types
- [x] Step 2: Store
- [x] Step 3: Step1 UI

## Build check
All 4 TS errors are pre-existing (unrelated). No new errors from 9A changes.
