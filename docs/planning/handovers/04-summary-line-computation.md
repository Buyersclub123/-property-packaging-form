# Handover: Activity 4 — Summary Line Computation

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Depends on Activity 2 (types & store) being complete.

## Goal
Add a `useEffect` (or shared hook) that reactively computes the `subjectLine` value from form data and writes it to the form store. The summary line is the email subject line WITHOUT the prefix (PACKAGER TO CONFIRM / QA TO VERIFY / BA AUTO SEND — Make.com adds those).

## Summary Line Formats

| Property Type | Format |
|---|---|
| Established | `Property Review: {ADDRESS}` |
| H&L individual | `Property Review (H&L {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}` |
| SMSF individual | `Property Review (Single Part Contract {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}` |
| Project H&L | `Property Review (H&L Project): {PROJECT ADDRESS}` |
| Project SMSF | `Property Review (Single Part Contract Project): {PROJECT ADDRESS}` |
| Fallback | `Property Review: {ADDRESS}` |

## How to determine property type
Use the same logic as the existing 02A Module 3 code (documented in master plan). Key fields from the form store:
- `decisionTree.propertyType`: 'New' or 'Established'
- `decisionTree.lotType`: 'Individual' (H&L) or 'Multiple' (Project)
- `decisionTree.contractType`: '01_hl_comms' = H&L, '02_single_comms' = SMSF individual
- `decisionTree.contractTypeSimplified`: 'Split Contract' = H&L, 'Single Contract' = SMSF
- `decisionTree.dwellingType`: the new dwelling type field value

## Field sources for computation
- **ADDRESS**: `address.propertyAddress` (uppercased)
- **PROJECT ADDRESS**: `address.projectAddress` or `address.propertyAddress`, stripped of lot/unit prefix (uppercased)
- **totalBeds**: `propertyDescription.bedsPrimary` + `propertyDescription.bedsSecondary` (parse as integers, sum them)
- **dwellingType**: `decisionTree.dwellingType` — this is the GHL option key (e.g. `dualkey`). Map to display name for the summary line:
  - `unit` → Unit, `townhouse` → Townhouse, `villa` → Villa, `house` → House
  - `dualkey` → Dual-key, `duplex` → Duplex
  - `multidwelling` → Multi-dwelling, `block_of_units` → Block of Units
- **LOT**: If `address.lotNumber` exists and address doesn't already contain "LOT", prepend `LOT {lotNumber}` to address

## "SMSF" → "Single Part Contract"
When the property is SMSF (contractTypeSimplified === 'Single Contract' AND propertyType === 'New'), use "Single Part Contract" instead of "SMSF" in the summary line.

## Where to put the computation
Option A: A `useEffect` in `Step1DecisionTree.tsx` that watches all relevant fields from the form store. However, some fields (beds) come from other steps, so this effect would need to watch those too.

Option B (preferred): A custom hook `useSubjectLine()` in `src/hooks/useSubjectLine.ts` that reads from the form store, computes the subject line, and writes it back. This hook can be called from any component. Import and call it from `Step1DecisionTree.tsx` (or from the form layout component if one exists).

The computation should run whenever any dependency changes. Use `updateFormData({ subjectLine: computed })` to persist it.

## Display

### Global display (all steps)
Display the computed subject line **directly below the Property Address bar** that appears at the top of every step. This way the packager can see it building up as they fill in the form. Style it as a secondary/muted text line beneath the address — not a full input field. Label it something like "Subject Line:" followed by the value. If `subjectLine` is empty (not enough data yet), hide it or show a placeholder.

The Property Address bar is rendered in the form layout component that wraps all steps — find where the address is displayed and add the subject line below it.

### Step 8 display
Also show the subject line on Step 8 (Cashflow Review / final review) as a read-only field alongside other summary values. This confirms to the packager what the email subject will be before submission.

## Important constraints
- Do NOT modify the Step1 dropdown UI — that's Activity 3.
- Do NOT modify API routes — that's Activities 5 and 6.
- The summary line must update reactively, not just at submit time.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/04-summary-line-computation-plan.md`
