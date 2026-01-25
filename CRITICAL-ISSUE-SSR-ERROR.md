# CRITICAL ISSUE: Internal Server Error / Blank Screen

## Date: Current Session
## Status: BLOCKING - Form not loading

---

## What Was Working Before

**Last Known Working State:**
- Form was loading and displaying correctly
- Step 0 (Address & Risk Check) was working
- Step 1 (Decision Tree) was displaying (though pre-populated with values from localStorage)
- User could navigate between steps
- "Check Stash" button was working
- Address validation via Geoscape was working
- Risk overlays were populating from Stash

**Key Working Configuration:**
- Zustand store with persist middleware (localStorage)
- Dynamic import with `ssr: false` on MultiStepForm
- All components marked with `'use client'`
- Form data persisted between refreshes

---

## What Broke It

**Initial Issue:**
- User reported Step 2 (Decision Tree) was pre-populated with values
- User wanted Decision Tree fields to start blank when starting a new form

**Attempted Fix:**
- Modified "Clear Form" button to use `resetForm()` to clear Decision Tree fields
- This introduced SSR/hydration errors

**Cascade of Issues:**
1. Internal Server Error started appearing
2. Attempted to fix by removing persist middleware
3. Attempted to fix by adding client-side checks
4. Attempted to fix by modifying store initialization
5. Created error.tsx component
6. Multiple attempts to make store SSR-safe
7. Result: Form sometimes loads, sometimes shows blank screen, sometimes shows Internal Server Error

---

## What We've Tried (Failed Attempts)

1. **Removed persist middleware** - Still getting errors
2. **Added `'use client'` to store** - Didn't help
3. **Added client-side mount checks** - Still errors
4. **Created error.tsx** - Required component, but didn't fix the issue
5. **Modified store initialization** - Multiple attempts, none worked
6. **Cleared build cache** - Temporary fixes, errors return
7. **Simplified page component** - Still getting 500 errors

---

## Current State

**Build Status:** ✅ Build passes successfully
**Runtime Status:** ❌ Internal Server Error (500) on page load/refresh
**Symptoms:**
- Sometimes form appears briefly then disappears
- Sometimes blank screen
- Sometimes "Internal Server Error" message
- Network tab shows: `localhost 500 document`

**Current Configuration:**
- Store: Simple Zustand store WITHOUT persist middleware
- Page: Uses dynamic import with `ssr: false`
- Components: All marked `'use client'`
- Error component: Created at `/src/app/error.tsx`

---

## Root Cause Analysis

**Suspected Issue:**
Even though:
- Build passes
- Using `ssr: false` on dynamic import
- All components marked `'use client'`
- Store has no persist middleware

Next.js is STILL trying to execute something on the server during:
- Static page generation (build time)
- Or initial page load (runtime SSR)

**Possible Causes:**
1. Store is being imported/evaluated during SSR despite `ssr: false`
2. One of the step components has code that executes during module evaluation
3. Next.js 14 App Router is evaluating the page component during static generation
4. There's a circular dependency or import issue

---

## What Needs to Happen Next

### Option 1: Revert to Last Known Working State
1. Use git to revert to commit before "Clear Form" changes
2. OR manually restore the store to have persist middleware
3. Keep Decision Tree pre-population issue (lesser of two evils)

### Option 2: Fix SSR Issue Properly
1. **Get actual error message** from terminal running `npm run dev`
2. Identify what's being executed on server
3. Make that specific thing client-only
4. Test incrementally

### Option 3: Complete Rewrite of SSR Handling
1. Move store initialization to a client-only hook
2. Use React Suspense boundaries
3. Ensure nothing executes during SSR

---

## Files Modified (That May Need Reverting)

1. `src/store/formStore.ts` - Removed persist middleware
2. `src/app/page.tsx` - Added client-side checks, modified dynamic import
3. `src/app/error.tsx` - Created (this is correct, keep it)
4. `src/app/layout.tsx` - Modified metadata export
5. `src/components/MultiStepForm.tsx` - Added error handling

---

## Recommendation

**START FRESH WITH NEW CHAT:**
1. Share this document
2. Ask to revert to last working commit OR restore persist middleware
3. Address Decision Tree pre-population issue separately with minimal changes
4. Test each change incrementally before moving forward

---

## Key Lesson Learned

**DO NOT:**
- Make multiple changes without testing
- Remove working features (like persist) to fix unrelated issues
- Continue making changes when errors persist without understanding root cause

**DO:**
- Revert to working state when introducing errors
- Make one small change at a time
- Test after each change
- Ask user what they're seeing before making changes
- Get actual error messages before attempting fixes

---

## Next Steps for New Chat

1. **First:** Revert store to have persist middleware (restore working state)
2. **Then:** Address Decision Tree pre-population with minimal change
3. **Test:** Verify form works after each change
4. **Only then:** Make additional improvements

