# Codebase Cleanup Audit Plan

**Date:** 2025-01-26  
**Purpose:** Identify and remove dead/redundant code, prevent using old code

---

## Phase 1: Identification

### Step 1: Index All Files and Map Dependency Graph

**Tasks:**
- List all files in the codebase
- Map import/export relationships
- Identify entry points (main components, API routes)
- Find orphaned files (not imported by any entry point)
- Find unused functions (not called anywhere)

**Deliverable:** Dependency graph showing what's connected and what's orphaned

---

### Step 2: Compare Old vs New Pages

**Known Changes:**
- **Old Page 2:** Step1AInvestmentHighlightsCheck (DELETED)
- **New Page 6:** InvestmentHighlightsField (ACTIVE)
- **Old Page 5:** May have old proximity/investment highlights code
- **New Page 5:** Step5Proximity with InvestmentHighlightsField (ACTIVE)

**Tasks:**
- Identify all "old" pages/components
- Identify all "new" pages/components
- Compare logic between old and new
- Find duplicated logic
- Find logic that should have been migrated but wasn't
- Find logic that was migrated incorrectly

**Deliverable:** Comparison table: Old vs New, what's duplicated, what's missing

---

### Step 3: Mark Deprecated/Unused Items

**Categories:**
- **DEPRECATED:** Old code that has been replaced (should be removed)
- **UNUSED:** Code that's never called (should be removed)
- **ORPHANED:** Files with no imports (should be removed)
- **DUPLICATED:** Logic that exists in both old and new (remove old)

**Tasks:**
- Mark each file/function as: ACTIVE, DEPRECATED, UNUSED, ORPHANED, DUPLICATED
- List all deprecated items
- List all unused items
- List all orphaned items
- List all duplicated items

**Deliverable:** Markdown list of all items by category

---

## Phase 2: Execution

### Step 1: Verify Dependencies (DO NOT DELETE YET)

**For each DEPRECATED/UNUSED/ORPHANED item:**
- Check if any active code still imports it
- Check if any active code still calls it
- Check if it's referenced in comments/docs
- Verify it's truly not needed

**Deliverable:** Verified list - items safe to delete vs items that need updates first

---

### Step 2: Remove Redundant Code

**For each verified redundant item:**
- Remove the code
- Update all import references to point to current working versions
- Remove commented-out code
- Remove unused imports

**Deliverable:** List of changes made, files deleted, imports updated

---

### Step 3: Clean Up Leftovers

**Tasks:**
- Remove commented-out code blocks
- Remove unused imports
- Remove unused variables
- Remove dead code paths
- Clean up TODO comments that are no longer relevant

**Deliverable:** List of cleanup changes

---

## Phase 3: Verification

### Step 1: Build/Lint Check

**Tasks:**
- Run `npm run build` (or `next build`)
- Run `npm run lint` (or `next lint`)
- Check for TypeScript errors
- Check for import errors
- Check for unused variables

**Deliverable:** Build/lint results, list of any errors found

---

### Step 2: Functionality Verification

**Tasks:**
- Verify all functionality still works
- Test critical paths
- Confirm no breaking changes
- Confirm functionality is served by new modules only

**Deliverable:** Test results, confirmation that everything works

---

## Files to Focus On

### Known Old/Deprecated:
- `src/components/steps/Step1AInvestmentHighlightsCheck.tsx` - DELETED from flow, file may still exist

### Known Active:
- `src/components/steps/step5/InvestmentHighlightsField.tsx` - NEW active code
- `src/components/steps/step5/ProximityField.tsx` - Active code
- `src/components/MultiStepForm.tsx` - Active, but may reference old code

### Need Investigation:
- Any files importing Step1AInvestmentHighlightsCheck
- Any old proximity code in step5 folder
- Any old investment highlights code in other locations

---

## Deliverables Summary

1. **Dependency Graph** - What's connected, what's orphaned
2. **Old vs New Comparison** - What changed, what's duplicated
3. **Deprecated/Unused List** - Items to remove
4. **Verified Safe-to-Delete List** - After dependency check
5. **Cleanup Changes** - What was removed/updated
6. **Build/Lint Results** - Verification
7. **Test Results** - Functionality confirmation

---

## Critical Rules

- **DO NOT DELETE** until dependencies verified
- **UPDATE IMPORTS** when removing files
- **VERIFY** with build/lint before finishing
- **TEST** functionality after cleanup

---

**Status:** Ready for execution  
**Mode:** Plan Mode - Audit first, then execute after approval
