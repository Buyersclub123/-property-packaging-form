# Implementation Handover - Investment Highlights Redesign

## Your Role
You are the **Implementation Agent** for the Investment Highlights Redesign. Your job is to:
1. Review the plan
2. Ask questions if anything is unclear
3. Write the code
4. Create documentation for review (if needed)
5. Play back what you've created and get confirmation
6. Deploy to dev ONLY after explicit approval

## Plan Location
**Review the plan here:**
`c:\Users\User\.cursor\plans\investment_highlights_redesign_bac2bade.plan.md`

Read the entire plan before starting any work.

## Documentation Location
**If you create any documentation for review, save it here:**
`property-review-system/form-app/analysis/`

Use clear, descriptive filenames like:
- `code-review-summary.md`
- `api-changes-explained.md`
- `testing-notes.md`

## Critical Workflow Rules

### DO NOT ASSUME ANYTHING
- **Never assume** code works without testing
- **Never assume** deployment succeeded without verification
- **Never assume** you understand requirements - ask questions
- **Verify everything** before reporting completion

### Before You Start Coding
1. **Read the plan completely** - Understand all 14 steps
2. **Ask questions** - If anything is unclear, ask BEFORE coding
3. **Re-read affected files** - If files were moved or changed, explicitly re-read them to ensure your context is updated
4. **Verify current code** - Check the actual files mentioned in the plan to ensure they match what's described
5. **Check for superseded code** - Verify if a file has been superseded by a newer version before suggesting changes
6. **Never reference old code** - Never reference code in folders marked as old/, legacy/, or deprecated/

### While Coding
1. **Work piecemeal** - Complete one todo at a time
2. **Use @ symbols** - When prompting, manually tag current working files using @filename to force attention to correct versions
3. **Incremental changes** - Refactor one module or class at a time rather than broad, project-wide changes
4. **Test as you go** - Don't wait until the end
5. **Document decisions** - If you make any changes from the plan, document why
6. **Verify file versions** - Always verify you're editing the ACTIVE version, not old/deprecated code

### Before Deploying
1. **Create review summary** - Document what you've built
2. **Play back to user** - Explain what you created, show code snippets if helpful
3. **Get explicit confirmation** - User must approve before you deploy to dev
4. **NO deployment without approval** - Never deploy without explicit "yes"

## Key Requirements to Remember

### Verification UI (CRITICAL)
- User must verify Report Name and Valid Period BEFORE ChatGPT processing
- Both fields must be editable
- Both checkboxes required before Confirm button works
- Editing a field unchecks its checkbox

### File Naming
- Format: `[Report Name] - [Valid Period].pdf`
- Must strip: suburb prefix, download counter, date suffix
- Example: `Fraser Coast - September - December 2025.pdf`

### Suburb Appending
- Never overwrite existing suburbs
- Always append new suburb to comma-separated list
- Check if suburb already exists before adding

### Google Sheet Structure
- Only 7 columns: A (Suburbs), B (State), C (Report Name), D (Valid Period), E (Main Body), F (PDF Drive Link), G (PDF File ID)
- Remove old columns F-M (Extra Info and 7 section columns)

### PDF Storage
- Save PDF to Hotspotting Reports folder
- Store PDF link and file ID in form state
- Add PDF shortcut to property folder when created

## Questions to Ask (If Needed)

Before starting, ask if unclear:
- Which files should I modify first?
- Should I test each change individually or batch them?
- Do you want me to create a testing checklist?
- Any specific error handling requirements?

## Your First Steps

1. Read the plan: `c:\Users\User\.cursor\plans\investment_highlights_redesign_bac2bade.plan.md`
2. Review the current code files mentioned in the plan
3. Ask any clarifying questions
4. Start with the first todo item
5. Work through todos one at a time
6. Create review documentation when ready
7. Play back what you've built
8. Get confirmation before deploying

## Critical Prevention Rules (Prevent Using Old Code)

### Prioritize New Context
- **Always verify** if a file has been superseded by a newer version in a different directory before suggesting changes
- **Never reference** code in folders marked as old/, legacy/, or deprecated/
- **Check production code** to see what's actually being used

### Re-Read Files
- **If files were moved or changed**, explicitly re-read the affected files before generating new code
- **Update your context** - Don't rely on old context from previous conversations
- **Start fresh chat** if context seems "stuck" on old versions

### Plan First
- **For any refactoring or migration**, always generate a plan in markdown and wait for approval before modifying files
- **Show which files** you're planning to change
- **Show current vs new** code comparison

### Use Current Working Files
- **Use @ symbols** to tag current working files: @filename
- **Verify file paths** - Make sure you're editing the right file
- **Check imports** - Make sure imports point to current versions, not old ones

### Incremental Moves
- **Refactor one module at a time** rather than broad, project-wide changes
- **Maintain context accuracy** by working on small, focused changes
- **Verify each change** before moving to the next

## Important Notes

- **User is tired and mistrusting** - Be careful, methodical, and clear
- **No assumptions** - Ask if unsure
- **Baby steps** - Small changes, verify, move on
- **Test thoroughly** - Don't rush deployment
- **Use current code** - Never use old/deprecated code

## Environment

- **Dev server:** http://localhost:3001 (or 3002 if 3001 in use)
- **Prod:** https://property-packaging-form.vercel.app
- **Deploy to dev:** Restart dev server after changes
- **Clear cache:** Delete `.next` folder if dev shows old code

---

**Ready to start?** Read the plan, ask questions, then begin implementation.
