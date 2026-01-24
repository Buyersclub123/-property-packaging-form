# Security Fix Implementation Plan
**Date:** January 26, 2026  
**Time Required:** 30 minutes  
**Goal:** Stop unauthorized API calls to `/api/geoapify/proximity`

---

## What We're Doing

### 1. Server-Side Authentication (20 min)
**File to edit:** `form-app/src/app/api/geoapify/proximity/route.ts`

**Change:** Add email validation at the top of the route handler
- Check if request includes a valid email
- Allow only: `@buyersclub.com.au` domain + `johntruscott1971@gmail.com`
- Reject all other requests with 401 Unauthorized

**Code location:** Add validation before any Google API calls are made

---

### 2. Environment Variable Setup (5 min)
**Where:** Vercel Dashboard → Project Settings → Environment Variables

**Add new variable:**
- Name: `AUTHORIZED_SERVICE_EMAIL`
- Value: `system@buyersclub.com.au` (or existing service email)
- Environment: Production, Preview, Development

**Purpose:** Backend uses this email for Google API calls (not user's email)

---

### 3. Deploy & Test (5 min)
**Deploy:** Push to Git → Vercel auto-deploys

**Test:**
1. Valid email test: Submit form with `john@buyersclub.com.au` → should work
2. Invalid email test: Try API call without email → should get 401 error
3. Check Google Cloud usage → should only see legitimate calls

---

## Knock-On Effects

### Files That Need Changes
1. ✅ `form-app/src/app/api/geoapify/proximity/route.ts` (add auth logic)
2. ✅ Vercel env vars (add `AUTHORIZED_SERVICE_EMAIL`)

### Files That DON'T Need Changes
- ❌ Frontend form (already collects email)
- ❌ Other API routes (separate task)
- ❌ `.env.local` (only if testing locally)

### Environment Variables
**Existing (no changes needed):**
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_MAPS_API_BASE_URL`
- All other existing vars

**New variable to add:**
- `AUTHORIZED_SERVICE_EMAIL` (Vercel dashboard only)

---

## Testing Plan

### Test 1: Valid User (Should Work)
1. Go to production form
2. Enter email: `john@buyersclub.com.au`
3. Fill out property form
4. Submit
5. **Expected:** Proximity data loads, form submits successfully

### Test 2: Invalid Email (Should Fail)
1. Use Postman or curl to call API directly
2. Send request without email header
3. **Expected:** 401 Unauthorized error, no Google API calls made

### Test 3: Monitor Usage
1. Go to Google Cloud Console
2. Check Distance Matrix API usage
3. **Expected:** Only 2 calls per legitimate form submission (26 API calls each = 52 total per submission)

---

## Rollback Plan (If Something Breaks)

**If production breaks:**
1. Revert Git commit
2. Vercel auto-deploys previous version
3. Takes 2-3 minutes

**If only auth breaks:**
1. Comment out auth check in route.ts
2. Push to Git
3. Deploy takes 2-3 minutes

---

## Success Criteria

✅ Legitimate users can submit forms  
✅ Direct API calls without valid email are blocked  
✅ Google Cloud usage drops to only legitimate calls  
✅ Daily spending stays under $10  

---

## Next Steps After This Fix

1. Monitor Google Cloud usage for 7 days
2. Secure amenity distance app: https://amenity-distance-app-a22o.vercel.app/
3. Fix duplicate call issue (Step 4 + Step 5)
4. Add auth to other API routes (low priority)
