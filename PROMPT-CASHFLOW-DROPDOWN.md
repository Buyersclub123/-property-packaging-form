# Cashflow Spreadsheet Dropdown Calc - Analysis Prompt

**FOR EXTERNAL AI CHAT (Sonnet 4.5)**

---

## The Problem

The **Cashflow Spreadsheet Dropdown** calculation is not working correctly.

**User Report:** "Fix Cashflow Spreadsheet Dropdown Calc - Drawdown sheet not fully working"

---

## Current System Context

### Step 8: Cashflow Review (formerly Step 7)

**File:** `src/components/steps/Step7CashflowReview.tsx` (now Step 8)

This step displays:
1. Property details summary
2. Financial inputs (purchase price, deposit, loan amount, etc.)
3. **Cashflow Calculator** - Embedded Google Sheets iframe
4. Fields to capture calculated values from the spreadsheet

### The Cashflow Calculator

**Spreadsheet URL:** Embedded as iframe (Google Sheets)
**Purpose:** Calculate property cashflow based on user inputs

**Known Issue:** The "Drawdown sheet" dropdown or calculation is not working as expected.

---

## What We Know

1. **Recent Changes:**
   - Step 7 became Step 8 (Insurance Calculator added as new Step 6)
   - Insurance field added and made read-only on Step 8
   - Step renumbering may have affected references

2. **Related Documentation:**
   - `CASHFLOW-SPREADSHEET-FIELD-MAPPING.md` exists (241 lines)
   - May contain field mapping details

3. **User Feedback:**
   - "Drawdown sheet not fully working"
   - No specific error message provided
   - Likely a calculation or dropdown selection issue

---

## Your Task

**Analyze the Cashflow Spreadsheet issue and provide a solution plan.**

### Questions to Answer:

1. **What is the "Drawdown sheet"?**
   - Is it a dropdown in the Google Sheets iframe?
   - Is it a field on the Step 8 form?
   - What calculation should it perform?

2. **What does "not fully working" mean?**
   - Does the dropdown not appear?
   - Does it not calculate correctly?
   - Does it not save the value?

3. **Could the step renumbering have caused this?**
   - Are there hardcoded step numbers in the code?
   - Are there references to "Step 7" that should now be "Step 8"?

4. **Is this a Google Sheets issue or a form integration issue?**
   - Does the spreadsheet itself work correctly?
   - Is the issue with capturing values from the spreadsheet?
   - Is the issue with passing values to the spreadsheet?

5. **What fields are involved?**
   - Review `CASHFLOW-SPREADSHEET-FIELD-MAPPING.md` for context
   - Identify which fields should be populated from the dropdown

---

## Files to Review

1. **`src/components/steps/Step7CashflowReview.tsx`** (now Step 8)
   - Main component for Cashflow Review
   - Contains iframe and form fields

2. **`CASHFLOW-SPREADSHEET-FIELD-MAPPING.md`**
   - Field mapping documentation
   - May explain expected behavior

3. **`src/components/MultiStepForm.tsx`**
   - Check for hardcoded step references
   - Verify step validation logic

4. **`src/types/form.ts`**
   - Check FormData interface for cashflow fields

---

## Deliverables

1. **Root Cause Analysis**
   - What is the "Drawdown sheet"?
   - Why is it not working?
   - Is it related to recent changes (step renumbering)?

2. **Solution Plan**
   - Files to modify
   - Changes needed (conceptual, no code)
   - How to fix the dropdown/calculation

3. **Testing Strategy**
   - Steps to reproduce the issue
   - Steps to verify the fix
   - What to test after fixing

4. **Recommendations**
   - How to prevent similar issues in the future
   - Should we add validation or error handling?

---

## Critical Rules

❌ DO NOT WRITE ANY CODE  
❌ DO NOT CREATE HELPER SCRIPTS  
✅ Analysis and planning ONLY  
✅ Save your analysis as: `property-review-system/form-app/CASHFLOW-DROPDOWN-ANALYSIS.md`

---

## Additional Context

**If you need more information:**
- Read `CASHFLOW-SPREADSHEET-FIELD-MAPPING.md` for field details
- Review `Step7CashflowReview.tsx` for current implementation
- Check `MultiStepForm.tsx` for step validation logic

**Focus on:**
- Understanding what "Drawdown sheet" means
- Identifying the specific calculation that's broken
- Providing a clear fix plan

---

**End of Prompt**
