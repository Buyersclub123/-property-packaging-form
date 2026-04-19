# 9A2 Tri-plus Step 3 Fields — Implementation Plan

## Steps

1. **Step1**: Remove `replicateDwellingFromFirst` function + replicate button JSX
2. **Step2 routing**: Add `isTriPlus` computed boolean + `if (isTriPlus) return <TriPlusDwellingsView />` before existing return
3. **Step2 component**: Add `TriPlusDwellingsView` function at end of file — property-level fields (body corp, purchase price, yield) + per-dwelling accordion cards (property description + rental assessment)

## Status
- [x] Step 1 — Removed replicateDwellingFromFirst + replicate button from Step1DecisionTree.tsx
- [x] Step 2 — Added isTriPlus boolean + routing check in Step2PropertyDetails.tsx
- [x] Step 3 — Added TriPlusDwellingsView function (lines 4154-5161) in Step2PropertyDetails.tsx
