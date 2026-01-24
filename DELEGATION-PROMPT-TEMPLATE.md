# Delegation Prompt Template

**USE THIS TEMPLATE FOR ALL EXTERNAL AI CHAT DELEGATIONS**

---

## Standard Prompt Format

```
You are analyzing [TASK NAME] for a Next.js property review system.

READ THIS FILE:
`[FILE PATH TO READ]`

YOUR TASK:
[SPECIFIC TASK DESCRIPTION]

CRITICAL RULES:
❌ DO NOT WRITE ANY CODE
❌ DO NOT CREATE HELPER SCRIPTS
✅ Analysis and planning ONLY
✅ Save your analysis as: `[OUTPUT FILE PATH]`

DELIVERABLES:
1. [Deliverable 1]
2. [Deliverable 2]
3. [Deliverable 3]
```

---

## Example 1: Investment Highlights Workflow

```
You are analyzing Investment Highlights workflow for a Next.js property review system.

READ THIS FILE:
`property-review-system/form-app/PROMPT-INVESTMENT-HIGHLIGHTS-WORKFLOW.md`

YOUR TASK:
Analyze the workflow, answer all questions, provide implementation plan with phases.

CRITICAL RULES:
❌ DO NOT WRITE ANY CODE
✅ Analysis and planning ONLY
✅ Save your analysis as: `property-review-system/form-app/INVESTMENT-HIGHLIGHTS-ANALYSIS.md`

DELIVERABLES:
1. Architecture overview (components, data flow, APIs)
2. Implementation plan (Phase 1, 2, 3 with file changes)
3. Edge case analysis
4. Answers to all questions in requirements
5. Recommendations
```

---

## Example 2: Step 5 Field Clearing Issue

```
You are debugging a React state issue in a Next.js form.

READ THIS FILE:
`property-review-system/form-app/PROMPT-STEP5-FIELD-CLEARING.md`

YOUR TASK:
Identify why Investment Highlights and Why This Property fields clear when Proximity loads.

CRITICAL RULES:
❌ DO NOT WRITE ANY CODE
✅ Root cause analysis ONLY
✅ Save your analysis as: `property-review-system/form-app/STEP5-FIELD-CLEARING-ANALYSIS.md`

DELIVERABLES:
1. Root cause identification
2. Why it happens (React lifecycle, state management, useEffect)
3. Proposed solution (conceptual, no code)
4. Files that need changes
5. Testing strategy
```

---

## Example 3: Cashflow Spreadsheet Dropdown

```
You are debugging a spreadsheet calculation issue in a Next.js form.

READ THIS FILE:
`property-review-system/form-app/PROMPT-CASHFLOW-DROPDOWN.md`

YOUR TASK:
Identify why the drawdown sheet dropdown calculation is not working.

CRITICAL RULES:
❌ DO NOT WRITE ANY CODE
✅ Root cause analysis ONLY
✅ Save your analysis as: `property-review-system/form-app/CASHFLOW-DROPDOWN-ANALYSIS.md`

DELIVERABLES:
1. Root cause identification
2. Expected vs actual behavior
3. Proposed solution
4. Files that need changes
```

---

## Key Principles

### ✅ DO:
- Reference files to read (don't paste entire files in prompt)
- Specify exact output file path
- Be clear about deliverables
- Use ❌ and ✅ for visual clarity
- Keep prompt under 500 words

### ❌ DON'T:
- Let them write code
- Let them create helper scripts
- Paste entire files into prompt (reference them instead)
- Give vague instructions
- Forget to specify output file path

---

## Workflow

1. **Create requirements doc** (e.g., `PROMPT-[TASK-NAME].md`)
2. **Use template above** to create delegation prompt
3. **Copy prompt** into new Sonnet 4.5 chat
4. **Wait for analysis** (they save as `[TASK-NAME]-ANALYSIS.md`)
5. **Review analysis** with user
6. **Implement** based on their plan

---

## File Naming Convention

### Requirements (what to analyze):
`PROMPT-[TASK-NAME].md`

Examples:
- `PROMPT-INVESTMENT-HIGHLIGHTS-WORKFLOW.md`
- `PROMPT-STEP5-FIELD-CLEARING.md`
- `PROMPT-CASHFLOW-DROPDOWN.md`

### Analysis (their output):
`[TASK-NAME]-ANALYSIS.md`

Examples:
- `INVESTMENT-HIGHLIGHTS-ANALYSIS.md`
- `STEP5-FIELD-CLEARING-ANALYSIS.md`
- `CASHFLOW-DROPDOWN-ANALYSIS.md`

---

## All Files Go In:
`property-review-system/form-app/`

No subfolders, keep it simple.

---

**End of Template**
