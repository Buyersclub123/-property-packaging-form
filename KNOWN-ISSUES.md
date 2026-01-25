# Known Issues - Property Review System

**Last Updated:** January 21, 2026  
**Purpose:** Track issues identified during testing that need to be fixed later

---

## 🐛 Active Issues

### Issue #1: Early Proximity Loading Not Working
**Date Identified:** January 21, 2026  
**Severity:** Medium (UX improvement, not critical)  
**Status:** Deferred for later fix

**Description:**
- Enhancement 2 of Phase 4A was supposed to start proximity calculation on Step 2
- User testing shows it still doesn't start until Page 5 (Step 5)
- Enhancement 1 (auto-growing textarea) IS working correctly

**Expected Behavior:**
- When user reaches Step 2, proximity API call should trigger in background
- Data should be stored in `formData.proximityData`
- When user reaches Step 5, data should already be populated (instant load)

**Actual Behavior:**
- No API call on Step 2
- Proximity calculation still starts when user reaches Step 5
- User experiences same wait time as before enhancement

**Possible Causes:**
1. Step 2 component may not have access to full address yet
2. `updateFormData()` may not be persisting `proximityData` field
3. `useEffect` dependency array may be preventing trigger
4. ProximityField may not be checking for pre-fetched data correctly
5. Form state may be resetting between steps

**Files Involved:**
- `form-app/src/components/steps/Step2StashCheck.tsx` (early fetch logic)
- `form-app/src/components/steps/step5/ProximityField.tsx` (check for pre-fetched data)
- `form-app/src/types/form.ts` (proximityData field definition)
- `form-app/src/components/steps/Step5Proximity.tsx` (pass data to ProximityField)

**Debugging Steps:**
1. Add console.log in Step2StashCheck to verify useEffect triggers
2. Check if `formData.propertyAddress` is available on Step 2
3. Verify API call is made (check network tab when on Step 2)
4. Check if `formData.proximityData` is being stored
5. Check if ProximityField receives pre-fetched data as prop

**Priority:** Medium  
**Estimated Fix Time:** 1-2 hours  
**Assigned To:** TBD (Chat C to debug later)

**User Impact:**
- User still waits 2-3 seconds on Step 5 for proximity calculation
- Enhancement 1 (auto-grow) is working, so some UX improvement achieved
- Not a blocker for Phase 4B/4C

**Workaround:**
- None needed - existing functionality works as before enhancement attempt

---

## 📋 Issue Tracking

| Issue # | Title | Severity | Status | Date | Assigned |
|---------|-------|----------|--------|------|----------|
| #1 | Early Proximity Loading Not Working | Medium | Deferred | 2026-01-21 | TBD |

---

## ✅ Resolved Issues

None yet.

---

**Maintained By:** Coordinator Chat  
**Review Frequency:** After each phase completion
