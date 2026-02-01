# Proximity API Analysis Request

**Date:** 2025-01-26  
**Priority:** CRITICAL  
**Status:** Broken - Was working before redesign

---

## Problem

Proximity API is failing with 401 and 400 errors. This was working before the Investment Highlights redesign.

**Errors:**
- 401 Unauthorized (first call)
- 400 Bad Request (second call)

---

## What You Need To Do

**Review Issues 1, 2 & 3 Together:**

1. **Security Context:**
   - Security changes were made earlier requiring `userEmail` for API
   - API requires email authentication
   - This is a security requirement, not optional

2. **Possible Root Cause:**
   - When Page 2 (Step1A) was deleted, did you use old code from Page 5?
   - Instead of using new code on Page 6?
   - Old code might not have `userEmail` requirement

3. **Compare old code vs new code:**
   - What was MultiStepForm.tsx doing before (line 860-890 area)?
   - What is it doing now?
   - What changed in the early processing call?
   - Did you copy old code that doesn't include `userEmail`?

4. **Check production code:**
   - How does proximity work in production?
   - What does the working code look like?
   - What parameters does it send?
   - Does production code include `userEmail`?

5. **Identify the break:**
   - Why is `userEmail` missing from early processing call (line 863)?
   - Why is the API call flow different?
   - Did you use old code that predates security changes?
   - What did you change that broke it?

---

## Specific Code Issues Found

1. **Line 863 (MultiStepForm.tsx):**
   ```typescript
   body: JSON.stringify({ propertyAddress: address?.propertyAddress }),
   ```
   - Missing `userEmail` parameter
   - Should include `userEmail` like ProximityField.tsx does (line 97)

2. **Early processing vs component:**
   - Both calling API (duplicate calls)
   - One fails with 401, one fails with 400
   - Need to understand the intended flow

---

## Questions To Answer

1. Did you intentionally change proximity code?
2. If yes, why? (It wasn't in the plan)
3. If no, what did you change that accidentally broke it?
4. What was the old code doing that worked?
5. How should it work now?

---

## What To Do

1. **Investigate and document:**
   - Compare old code vs new code
   - Check production code
   - Identify what broke
   - Document your findings

2. **Propose solution:**
   - Explain what needs to change
   - Show code changes needed
   - Explain why it will work

3. **DO NOT FIX YET:**
   - Wait for review and approval
   - Planning chat will review your findings
   - Get approval before making changes

---

## Critical Rules

- **NEVER use cached data** - API must always be called
- **NEVER skip API calls** - Security requirement
- **Proximity is address-specific** - Cannot reuse data

---

**Investigate and report findings. Do not fix until approved.**
