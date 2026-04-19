# Handover: Activity 5 — API Submit Route

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Depends on Activity 2 (types & store) being complete.

## File to modify
`src/app/api/ghl/submit-property/route.ts`

## Changes required
Add two field mappings to the `ghlRecord` object (around line 79–192):

```typescript
dwelling_type: formData.decisionTree?.dwellingType || '',
subject_line: formData.subjectLine || '',
```

Place them logically near the other decision tree fields (e.g., near `contract_type`, `deal_type`).

## GHL field names
- `dwelling_type` — maps to `formData.decisionTree.dwellingType`
- `subject_line` — maps to `formData.subjectLine`

## Important constraints
- Do NOT modify any other field mappings.
- Do NOT modify any other files.
- Follow the exact same pattern as existing field mappings in the file.

## Verification
Run `npx tsc --noEmit` to confirm no type errors.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/05-api-submit-plan.md`
