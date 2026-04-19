# Handover: Activity 6 — API Edit Route (GET + PUT)

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`
Depends on Activity 2 (types & store) being complete.

## File to modify
`src/app/api/properties/[recordId]/route.ts`

## Changes required

### GET (reverse mapping)
In the `formData` object returned by the GET handler (around line 324):

1. Add `dwellingType` to the `decisionTree` object:
```typescript
dwellingType: props.dwelling_type || null,
```

2. Add `subjectLine` at the top level of the returned formData:
```typescript
subjectLine: props.subject_line || '',
```

### PUT (update mapping)
In the PUT handler's `ghlRecord` construction (around line 857+):

Add two field mappings using the same `includeIfProvided` pattern:
```typescript
if (includeIfProvided(formData.decisionTree?.dwellingType)) ghlRecord.dwelling_type = formData.decisionTree.dwellingType;

if (includeIfProvided(formData.subjectLine)) ghlRecord.subject_line = formData.subjectLine;
```

Place them near the other decision tree field mappings.

## Important constraints
- Do NOT modify any other field mappings.
- Do NOT modify any other files.
- Follow the exact same patterns as existing mappings.
- The PUT route must handle partial updates (only send fields that are provided).

## Verification
Run `npx tsc --noEmit` to confirm no type errors.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/06-api-edit-plan.md`
