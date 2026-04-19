# Handover: Activity 7 — Make.com 02A Module 3 Changes

## Context
Read the master plan first: `docs/planning/00-MASTER-PLAN.md`

The property form now computes and stores a `subject_line` field in GHL. Make.com 02A Module 3 currently builds the entire subject line from scratch. It needs to be changed to:
1. Read `subject_line` from the GHL record
2. If it has a value: `subject = subjectPrefix + subject_line`
3. If empty (legacy records): fall back to the existing subject line construction logic

## File reference
Blueprint: `make-com-scenarios/02a GHL Property Review Submitted approval & email processing.blueprint (34).json`

The subject line logic is in the Module 3 JavaScript code block (path: `.flow[1].routes[0].flow[6].mapper.codeEditorJavascript`), approximately lines 2091–2193 of the JS code.

## Current logic (lines 2091–2193)
1. Lines 2091–2100: Build `subjectPrefix` from approval status (PACKAGER TO CONFIRM / QA TO VERIFY / BA AUTO SEND)
2. Lines 2102–2128: Read fields, determine occupancy type (Dual-key / Single Family)
3. Lines 2130–2191: Build `reviewRule` based on property type (Established / H&L / SMSF / Project)
4. Line 2193: `const subject = subjectPrefix + reviewRule`

## Required change
After the prefix logic (line 2100), add:

```javascript
// Check for pre-computed subject line from the form
const subjectLine = v("subject_line");
if (subjectLine && subjectLine.trim() !== "") {
  // Use the pre-computed subject line — form handles the logic now
  const subject = `${subjectPrefix}${subjectLine}`;
  // Skip the legacy subject line construction below
} else {
  // Legacy fallback for old records without subject_line
  // ... existing logic stays as-is ...
}
```

The exact implementation depends on how the JS is structured (the `subject` variable needs to be accessible later). The simplest approach: wrap the existing logic (lines 2102–2191) in an `else` block.

## Prefix logic stays
The prefix logic (lines 2091–2100) is UNCHANGED. Make.com still determines the prefix from approval status.

## Important constraints
- Do NOT change any other modules in the blueprint.
- Do NOT remove the existing subject line logic — it's the fallback for old records.
- The `v("subject_line")` call reads the GHL field value the same way other fields are read (check how `v()` is defined earlier in the code).

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/07-makecom-02a-plan.md`
