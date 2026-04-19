# Handover: Activity 8 — Testing & Retrospective Population

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Depends on Activities 2–7 being complete.

## Goal
1. Test the full flow end-to-end for all property types
2. Ensure existing records get `subject_line` populated when opened in the edit form

## Test cases

### New record creation
For each property type, create a test record and verify:
- `dwelling_type` is saved to GHL
- `subject_line` is computed correctly and saved to GHL
- Make.com 02A reads `subject_line` and uses it (with prefix) as the email subject

| Test | Property Type | Occupancy | Dwelling Type | Expected Summary Line |
|---|---|---|---|---|
| T1 | Established | Single | House | `Property Review: {ADDRESS}` |
| T2 | New / H&L | Single | Townhouse | `Property Review (H&L {beds}-bed Townhouse): LOT {ADDRESS}` |
| T3 | New / H&L | Dual | Dual-key | `Property Review (H&L {beds}-bed Dual-key): LOT {ADDRESS}` |
| T4 | New / SMSF | Single | Villa | `Property Review (Single Part Contract {beds}-bed Villa): LOT {ADDRESS}` |
| T5 | New / Project H&L | — | — | `Property Review (H&L Project): {PROJECT ADDRESS}` |
| T6 | New / Project SMSF | — | — | `Property Review (Single Part Contract Project): {PROJECT ADDRESS}` |
| T7 | New / H&L | Tri-plus | Multi-dwelling | `Property Review (H&L {beds}-bed Multi-dwelling): LOT {ADDRESS}` |

### Edit existing record (retrospective)
1. Open an existing record (created before this change) in the edit form
2. Verify the subject line is computed on load (since the record won't have one)
3. Save the record
4. Verify `subject_line` is now stored in GHL
5. Verify `dwelling_type` can be selected and saved

### Editable in GHL
1. After a record has `subject_line`, edit it directly in GHL
2. Trigger Make.com 02A
3. Verify the email uses the manually edited summary line (with prefix)

### Legacy fallback
1. Find/create a record with no `subject_line` in GHL
2. Trigger Make.com 02A
3. Verify it falls back to the old subject line logic

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/08-testing-retrospective-plan.md`
