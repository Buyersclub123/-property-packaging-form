# Dwelling Type & Summary Line — Master Plan

## Overview
Move email subject line logic from Make.com 02A into the property form. Add a "Dwelling Type" field. Store the computed subject line (minus prefix) as an editable `subject_line` in GHL. Make.com only prepends the prefix.

## Key Decisions
- **Dwelling Type** is a new field, separate from "Is this single or dual occupancy?"
- **Occupancy dropdown** gains a third option: "Tri-plus" (for Multi-dwelling, Block of Units)
- Dwelling Type values are filtered by occupancy selection:
  - Single → Unit, Townhouse, Villa, House
  - Dual → Dual-key, Duplex
  - Tri-plus → Multi-dwelling, Block of Units
- **"SMSF"** is replaced by **"Single Part Contract"** in the summary line display only
- **Subject line** is computed for ALL property types (Established, H&L, SMSF, Project)
- **Make.com** reads `subject_line` and prepends prefix only; legacy fallback for old records without `subject_line`
- **Edit form** must handle new fields so existing records get `subject_line` populated when edited

## Summary Line Formats
| Scenario | Format |
|---|---|
| Established | `Property Review: {ADDRESS}` |
| H&L individual | `Property Review (H&L {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}` |
| SMSF individual | `Property Review (Single Part Contract {totalBeds}-bed {dwellingType}): {LOT + ADDRESS}` |
| Project H&L | `Property Review (H&L Project): {PROJECT ADDRESS}` |
| Project SMSF | `Property Review (Single Part Contract Project): {PROJECT ADDRESS}` |

## Dwelling Type Values
Unit, Townhouse, Villa, House, Dual-key, Duplex, Multi-dwelling, Block of Units

## Activities

| # | Activity | Status | Agent | Handover Doc | Agent Plan Doc |
|---|---|---|---|---|---|
| 1 | GHL: Create `dwelling_type` (dropdown) and `subject_line` (text) fields | ✅ DONE | — | `handovers/01-ghl-fields.md` | — |
| 2 | Types & Store: Add DwellingType type, update DualOccupancy, add subjectLine to FormData | ✅ DONE | — | `handovers/02-types-and-store.md` | `agent-plans/02-types-and-store-plan.md` |
| 3 | Step1 UI: Add Tri-plus to occupancy, add Dwelling Type dropdown (filtered) | ✅ DONE | — | `handovers/03-step1-ui.md` | `agent-plans/03-step1-ui-plan.md` |
| 4 | Summary Line Computation: useEffect/hook to compute summary line from form data | ✅ DONE | — | `handovers/04-summary-line-computation.md` | `agent-plans/04-summary-line-computation-plan.md` |
| 5 | API Submit: Add dwelling_type and subject_line to submit-property route | ✅ DONE | — | `handovers/05-api-submit.md` | `agent-plans/05-api-submit-plan.md` |
| 6 | API Edit (GET + PUT): Add field mappings to properties/[recordId] route | ✅ DONE | — | `handovers/06-api-edit.md` | `agent-plans/06-api-edit-plan.md` |
| 7 | Make.com 02A: Read subject_line, prepend prefix, legacy fallback | ✅ DONE | — | `handovers/07-makecom-02a.md` | `agent-plans/07-makecom-02a-plan.md` |
| 8 | Testing & Retrospective: Ensure edit form populates subject_line for existing records | ✅ DONE | — | `handovers/08-testing-retrospective.md` | `agent-plans/08-testing-retrospective-plan.md` |
| 9A | Tri-plus Form UI: Per-dwelling/unit entry collection, types, store | ✅ DONE | — | `handovers/09a-tri-plus-form-ui.md` | `agent-plans/09a-tri-plus-form-ui-plan.md` |
| 9A2 | Tri-plus Step 3: Per-dwelling Property Description + Rental Assessment fields, auto-sum totals, auto-yield, address sync, validation | ✅ DONE | — | `handovers/09a2-tri-plus-step3-fields.md` | — |
| 9B | Tri-plus Subject Line: Update useSubjectLine hook for Tri-plus (Established format) | NOT STARTED | — | `handovers/09b-tri-plus-subject-line.md` | — |
| 9C | Tri-plus Step 7: Display per-dwelling data in Cashflow Review | NOT NEEDED — totals already sufficient | — | `handovers/09c-tri-plus-step7.md` | — |
| 9D | Tri-plus API Routes: Send/receive dwelling_details JSON | SUPERSEDED by 9D2 | — | `handovers/09d-tri-plus-api.md` | — |
| 9D2 | Tri-plus API Routes: dwelling_details submit/edit, occupancy_primary fix + Tri-plus derivation, edit GET inference | ✅ DONE | — | `handovers/09d2-tri-plus-api-and-validation.md` | `agent-plans/09d2-tri-plus-api-plan.md` |
| 9EF | Tri-plus Make.com: 02b payload + 02a email rendering | ✅ DONE | — | `handovers/09ef-tri-plus-makecom.md` | `agent-plans/09ef-tri-plus-makecom-plan.md` |
| 9G | Tri-plus GHL Webhook: Add dwelling_details to webhook body | NOT STARTED | — | `handovers/09g-tri-plus-ghl-webhook.md` | — |

## Workflow per Activity

1. **Planning agent** (me) creates a handover doc in `docs/planning/handovers/`
2. User copies the initial prompt to the **implementing agent** (new chat), telling them to read the handover doc
3. Implementing agent reads the handover doc, creates their plan in `docs/planning/agent-plans/` using naming convention `{NN}-{slug}-plan.md`
4. User notifies planning agent that the plan doc is ready
5. Planning agent reviews, updates handover doc with feedback if needed
6. Loop until approach is approved
7. Implementing agent executes the change
8. Planning agent updates master plan status

## Prompt to copy to implementing agent
Copy this to each new agent chat, replacing `{NN}` and `{SLUG}` with the activity number and slug from the table above.

```
Read the following files in order:
1. docs/planning/00-MASTER-PLAN.md (master plan — read the full thing)
2. docs/planning/handovers/{NN}-{SLUG}.md (your specific handover)

Then create your implementation plan at: docs/planning/agent-plans/{NN}-{SLUG}-plan.md

Do not start coding. Only create the plan document. Include:
- What files you will modify
- What changes you will make (be specific)
- Any risks or questions
- How you will verify the change

After creating the plan, stop and wait for review.
```

Example for Activity 2: replace `{NN}` with `02` and `{SLUG}` with `types-and-store`.

## Environment Constraints
- **Dev (can do now):** Activities 2, 3, 4, 5, 6 — all form code / API routes in Next.js codebase
- **Out-of-hours / weekend:** Activity 7 (Make.com 02A change) — live system
- **After all code deployed:** Activity 8 (end-to-end testing with GHL + Make.com)
- **Later:** Activity 9 (Tri-plus UI — decoupled)

## Dependencies
- Activity 1 (GHL fields) must be done first — ✅ DONE
- Activity 2 (Types & Store) must be done before 3, 4, 5, 6
- Activity 3 (Step1 UI) and 4 (Subject Line Computation) can run in parallel after 2
- Activity 5 and 6 (API routes) can run in parallel after 2
- Activity 7 (Make.com) can run independently but must be deployed out-of-hours
- Activity 8 (Testing) runs after 2–7 are all deployed
- Activity 9 (Tri-plus UI) is decoupled — can be done anytime after 2 and 3
