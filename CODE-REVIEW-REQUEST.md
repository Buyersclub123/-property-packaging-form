# Comprehensive Code Review Request

**Date:** 2025-01-26  
**Purpose:** Review working code before last deployment, identify what broke, find unused code

---

## Context

**What Happened:**
- Investment Highlights functionality moved from Page 2 to Page 6
- Pages were renumbered (Step1A removed, steps 3→2, 4→3, etc.)
- Multiple issues found in testing
- Hypothesis: Old code from Page 5 may have been used instead of new code from Page 6

**Current Problems:**
- Proximity API broken (401/400 errors)
- Report name extraction wrong
- File naming broken
- Google Sheets 50000 char error (regression)
- Missing fallback UI
- Field validation missing
- PDF shortcut not working

---

## What We Need

### 1. Review Working Code (Before Last Deployment)

**Check:**
- What code was working in production before last deployment?
- What code was working in dev before last deployment?
- How did proximity work?
- How did report name extraction work?
- How did file naming work?
- How did Google Sheets content handling work?
- How did error handling work?
- How did validation work?
- How did PDF shortcut creation work?

**Document:**
- What the working code looked like
- What it did
- How it worked

---

### 2. Identify What Broke

**Compare:**
- Working code (before) vs current code (after)
- What changed?
- What broke?
- Why did it break?

**For each issue:**
- What worked before
- What doesn't work now
- What changed that broke it

---

### 3. Identify Unused/Old Code

**Find:**
- Code that hasn't been used recently
- Old code paths that are no longer needed
- Dead code that can be removed
- Code from deleted pages (like Step1A) that's still referenced

**Check:**
- Are there old functions that aren't called?
- Are there old components that aren't used?
- Are there old API routes that aren't needed?
- Are there old imports that aren't used?

**Document:**
- List of unused/old code
- Where it is
- Why it's not needed
- Can it be safely removed?

---

### 4. Code Cleanup Recommendations

**Provide:**
- List of code that can be deleted
- List of code that should be updated
- List of code that should be restored (if it worked before)

---

## Files to Review

### Critical Files:
1. `src/components/MultiStepForm.tsx` - Early processing, step flow
2. `src/components/steps/step5/InvestmentHighlightsField.tsx` - Investment Highlights
3. `src/components/steps/step5/ProximityField.tsx` - Proximity
4. `src/app/api/investment-highlights/organize-pdf/route.ts` - PDF organization
5. `src/app/api/investment-highlights/get-reports/route.ts` - Reports API
6. `src/app/api/geoapify/proximity/route.ts` - Proximity API
7. `src/app/api/create-property-folder/route.ts` - Folder creation
8. `src/lib/googleSheets.ts` - Google Sheets functions
9. `src/lib/googleDrive.ts` - Google Drive functions

### Old/Unused Files to Check:
- `src/components/steps/Step1AInvestmentHighlightsCheck.tsx` - Should be deleted?
- Any other files referencing Step1A
- Any old API routes not being used

---

## Deliverables

1. **Working Code Documentation:**
   - What worked before
   - How it worked
   - Code snippets/examples

2. **Breakage Analysis:**
   - What broke
   - Why it broke
   - What changed

3. **Unused Code List:**
   - Files that can be deleted
   - Functions that can be removed
   - Imports that can be cleaned up

4. **Recommendations:**
   - What to restore
   - What to fix
   - What to delete
   - What to update

---

## Critical Rules

- **NEVER use cached data** - API must always be called
- **NEVER skip API calls** - Security requirement
- **Check actual code** - Don't assume
- **Compare before/after** - See what changed

---

## Questions to Answer

1. What code was working before last deployment?
2. What code broke after changes?
3. What old code is no longer needed?
4. What code should be restored?
5. What code should be deleted?
6. What code should be updated?

---

**This is a comprehensive review. Take your time. Be thorough. Check actual code.**
