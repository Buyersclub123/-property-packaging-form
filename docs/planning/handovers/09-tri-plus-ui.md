# Handover: Activity 9 — Tri-plus / Multi-dwelling / Block of Units UI

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Activities 1-8 are complete. This is the final activity.

## Goal
When the user selects **"Tri-plus"** as the occupancy type AND selects either **"Multi-dwelling"** or **"Block of Units"** as the dwelling type, present a Projects-style UI that collects per-dwelling/unit details. These details are stored as JSON in the GHL `dwelling_details` field and rendered in the Make.com emails.

---

## Confirmed Decisions (JT, Apr 15-18)

1. **Max dwellings/units**: 25
2. **Labels**: Use single label convention for both types — "Unit/Dwelling 1", "Unit/Dwelling 2", etc.
   - If `dwellingType === 'multidwelling'` → "Dwelling 1", "Dwelling 2"
   - If `dwellingType === 'block_of_units'` → "Unit 1", "Unit 2"
3. **Per-dwelling dual occupancy**: Each dwelling/unit can independently be single or dual occupancy
4. **Form validation**: Fields must be populated — follow existing validation rules for those fields
5. **GHL field**: `dwelling_details` (multi-line text, stores JSON) — field key: `custom_objects.property_reviews.dwelling_details`

### Email Structure (Make.com 02A)
6. **Property Description section**: Summary totals at top (total beds/bath/garage), then per-dwelling breakdowns below
7. **Purchase Price section**: Property-level only — **no** per-dwelling breakdown
8. **Rental Assessment section**: Total current rent/appraisal at top, then per-dwelling breakdowns below
9. **Dual occupancy display**: "3 + 2" format for dual dwellings, single value for single dwellings
10. **Carport/Car Space**: Only show if total across primary+secondary is ≥ 1

---

## Trigger Conditions

Tri-plus UI activates when ALL of:
- `decisionTree.propertyType === 'Established'`
- `decisionTree.dualOccupancy === 'Tri-plus'`
- `decisionTree.dwellingType === 'multidwelling' || 'block_of_units'`

This is **Established only**. New properties with multiple dwellings use the Projects path (`lotType === 'Multiple'`) instead.

---

## Scope — What to Build

### 9A. Form UI: Per-dwelling entry collection
**Files**: `src/components/steps/Step1DecisionTree.tsx`, `src/types/form.ts`, `src/store/formStore.ts`

- When Tri-plus is active, show a number input: "How many dwellings/units?" (1-25)
- Render per-dwelling/unit cards with fields matching `PropertyDescription`, `RentalAssessment`
- Each dwelling/unit gets its own single/dual occupancy toggle (independent)
- Include a **Replicate** button to copy values from Dwelling/Unit 1 to all others
- Labels: "Dwelling N" for Multi-dwelling, "Unit N" for Block of Units

**Data model**: Create a `DwellingDetails` interface (or extend/reuse `LotDetails`). Store in `formData.dwellings[]` (new array) or reuse `formData.lots[]` if the structure is identical.

### 9B. Subject line for Tri-plus
**File**: `src/hooks/useSubjectLine.ts`

Format: `Property Review: ADDRESS` (standard Established format)
- Tri-plus properties are always Established, so no H&L/SMSF/Project prefix needed
- Same subject line as any other Established property

### 9C. Step 7 (Cashflow Review): Display per-dwelling data
**File**: `src/components/steps/Step7CashflowReview.tsx`

Show summarised dwelling data in the cashflow review step.

### 9D. API Routes: Send/receive `dwelling_details` JSON
**Files**: `src/app/api/ghl/submit-property/route.ts`, `src/app/api/properties/[recordId]/route.ts`

- Submit: Serialize dwellings array to JSON string, send as `dwelling_details`
- Edit GET: Parse `dwelling_details` JSON from GHL back into form state
- Edit PUT: Re-serialize on save

### 9E. Make.com 02b: Map `dwelling_details` field
Add `dwelling_details` to the Module 21 properties mapping (same as we did for `dwelling_type` and `subject_line`).

### 9F. Make.com 02A Module 3: Render per-dwelling sections in emails
This is the email template work. Parse `dwelling_details` JSON and render:
- Property Description: Totals + per-dwelling breakdowns
- Rental Assessment: Totals + per-dwelling breakdowns
- Both portal (client) and internal (packager/QA/BA) email templates

### 9G. GHL Webhook: Add `dwelling_details` to webhook body
Same as we did for `dwelling_type` and `subject_line` — add to the GHL workflow webhook JSON body.

---

## Existing Code to Reference

- **Projects/lots pattern**: `Step1DecisionTree.tsx` — `lots` array, `addLot`/`removeLot`/`updateLot` functions
- **LotDetails interface**: `src/types/form.ts` lines 91-119 — per-lot fields (reusable pattern)
- **Subject line hook**: `src/hooks/useSubjectLine.ts` — add Tri-plus case
- **Dwelling type dropdown**: Already in `Step1DecisionTree.tsx` (Activity 3) — filters by occupancy
- **02b Module 21**: Just needs one more field mapping line for `dwelling_details`
- **02A Module 3** (`jotter 1804.md`): Email template code — will need new rendering sections

---

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/09-tri-plus-ui-plan.md`
