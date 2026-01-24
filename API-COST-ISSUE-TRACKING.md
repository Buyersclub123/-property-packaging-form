# API Cost Issue - Tracking Document
**Date Started:** January 24, 2026  
**Issue:** $190 unexpected Google Maps API charges

---

## Problem Summary

**What happened:** 38,000 Google Maps API calls over 3 days (Jan 21-23)

**Cost:** $190

**Root cause:** `/api/geoapify/proximity` route is publicly accessible, bots or unauthorized users accessed it ~730 times

---

## Findings

### Confirmed Facts

1. **Production route:** `/api/geoapify/proximity`
   - Makes 26 Google Maps API calls per request
   - Called twice per form submission (Step 4 + Step 5)
   - Publicly accessible (no authentication)
   - Has rate limiting (20/hour, 10/5min burst)

2. **Test routes:** 10 separate test routes + 2 test pages
   - Only used in development
   - Not the cause of the charges
   - Can be safely deleted

3. **Legitimate usage:** 2-3 tests = 4-6 API calls = $0.03
   - Actual usage: 38,000 calls = $190
   - Difference: 37,994 unauthorized calls

4. **Security issues found:**
   - No authentication on production API route
   - Email validation bypasses domain check (anyone can enter any email)
   - Hardcoded credentials in 15+ documentation files
   - All API routes publicly accessible
   - Rate limiting is in-memory only (resets on restart)

---

## Actions Taken

### ✅ Completed

- [x] Security audit completed
- [x] Root cause identified
- [x] Documentation created (EXECUTIVE-SUMMARY.md, SECURITY-AUDIT-REPORT.md, API-COST-INVESTIGATION-SUMMARY.md)
- [x] Identified 12 test files for deletion
- [x] Deleted 10 test routes (all test-* API routes removed)
- [x] Deleted 2 test pages (test-proximity and test-all-categories removed)
- [x] Set Google Cloud API daily spending limit ($10/day with alerts at 50%, 90%, 100%)

### ⏳ In Progress

- [x] Add server-side authentication to `/api/geoapify/proximity` route (TESTED IN DEV - WORKING)
- [x] Configure AUTHORIZED_SERVICE_EMAIL environment variable in Vercel (ADDED TO .env.local)
- [ ] Deploy to production (push to Git → Vercel)

### 📋 Pending

**Immediate (Tomorrow Morning - 30 min total):**
- [ ] Add server-side authentication to `/api/geoapify/proximity` route (20 min)
- [ ] Configure AUTHORIZED_SERVICE_EMAIL environment variable in Vercel (for backend Google API calls) (5 min)
- [ ] Deploy and test (5 min)
- [x] Set Google Cloud API daily spending limit ($10/day) - COMPLETED

**Short-term (This Week):**
- [ ] Secure amenity distance app: https://amenity-distance-app-a22o.vercel.app/
- [ ] Monitor Google Cloud API usage daily for next 7 days to confirm charges stop
- [ ] Add email domain validation to form (allow @buyersclub.com.au and johntruscott1971@gmail.com only)

**Short-term (This Week):**
- [ ] Fix duplicate call issue (Step 4 + Step 5 calling same API)
- [ ] Verify rate limiting is working in production

**Low Priority (When Time Permits):**
- [ ] Add email validation to all other API routes (Google Sheets, Drive, GHL access routes)
- [ ] Implement persistent rate limiting using Redis/database (currently resets on server restart)
- [ ] Delete or redact credentials from 52 documentation files (see CREDENTIALS-IN-DOCS-LIST.md)
- [ ] Note: Files are NOT in Git, only on local machine - no immediate security risk

**Long-term (Next Month):**
- [ ] Move Google Maps calls to frontend (proper redesign)
- [ ] Implement persistent rate limiting (Redis/database)
- [ ] Add API usage dashboard
- [ ] Security audit of Git history

---

## Files Deleted ✅

### Test Routes (10 files) - DELETED:
1. ~~`form-app/src/app/api/geoapify/test-airports/route.ts`~~
2. ~~`form-app/src/app/api/geoapify/test-beach/route.ts`~~
3. ~~`form-app/src/app/api/geoapify/test-capital-cities/route.ts`~~
4. ~~`form-app/src/app/api/geoapify/test-bus-stops/route.ts`~~
5. ~~`form-app/src/app/api/geoapify/test-childcare/route.ts`~~
6. ~~`form-app/src/app/api/geoapify/test-hospitals/route.ts`~~
7. ~~`form-app/src/app/api/geoapify/test-kindergarten/route.ts`~~
8. ~~`form-app/src/app/api/geoapify/test-schools/route.ts`~~
9. ~~`form-app/src/app/api/geoapify/test-supermarkets/route.ts`~~
10. ~~`form-app/src/app/api/geoapify/test-train-stations/route.ts`~~

### Test Pages (2 files) - DELETED:
11. ~~`form-app/src/app/test-proximity/page.tsx`~~
12. ~~`form-app/src/app/test-all-categories/page.tsx`~~

---

## Questions to Answer

1. **Vercel logs:** Who made the 38,000 API calls? (IP addresses, user agents)
2. **Form URL:** Is it indexed by Google? Publicly shared?
3. **Authentication:** Which method to implement? (API key, password, website restriction)
4. **Duplicate calls:** Keep Step 4 or Step 5 proximity call? (Not both)

---

## Cost Analysis

**Per request cost:** $0.13 (26 Google Maps API calls)

**Current risk:** Unlimited (anyone can access)

**After fixes:**
- Authentication: Only authorized users = $0-5/day
- Fix duplicate calls: Cut legitimate costs in half
- Frontend migration: Impossible to abuse

---

## Next Steps

1. ~~Manually delete 12 test files listed above~~ ✅ DONE
2. Check Vercel logs for unauthorized access patterns
3. **Implement email domain validation:**
   - Frontend: Validate email is @buyersclub.com.au or johntruscott1971@gmail.com
   - Backend: Verify user email is valid, then use AUTHORIZED_SERVICE_EMAIL env var for Google API calls
   - Add AUTHORIZED_SERVICE_EMAIL to Vercel environment variables (e.g., system@buyersclub.com.au)
4. Set Google Cloud API daily spending limit ($10/day)
5. Monitor costs daily for next week

---

## Notes

- Production route `/api/geoapify/proximity` must NOT be deleted
- Rate limiting is already implemented but not sufficient
- The $190 bill was from unauthorized access, not legitimate testing
