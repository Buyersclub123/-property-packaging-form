# API Cost Investigation - Summary
**Date:** January 24, 2026

---

## The Facts

### Your Usage (Legitimate)
- **Tests performed:** 2-3 property submissions
- **API calls made:** 4-6 calls (2 calls per submission)
- **Expected cost:** ~$0.03

### Actual Bill
- **Total API calls:** 38,000+ calls over 3 days (Jan 21-23)
- **Total cost:** $190
- **Unauthorized calls:** 37,994 calls

---

## Root Cause Analysis

### The Vulnerable Route
**File:** `form-app/src/app/api/geoapify/proximity/route.ts`
**URL:** `https://property-packaging-form.vercel.app/api/geoapify/proximity`

**What it does:**
- Makes ~26 Google Maps Distance Matrix API calls per request
- Calculates proximity to airports, cities, schools, hospitals, etc.
- Costs $0.13 per request

**The vulnerability:**
- Route is publicly accessible (no authentication)
- Anyone with the URL can call it
- Each call costs you money

### The Form Security Issue
**Current "security":**
- Email prompt (client-side only)
- Can be bypassed by anyone
- Not real authentication

**What happened:**
- Form URL is public (possibly indexed by Google or shared)
- Bots or unauthorized users found it
- They submitted the form ~19,000 times over 3 days
- Each submission triggered 2 proximity API calls (Step 4 + Step 5)
- Total: 38,000 calls = $190

---

## Secondary Issue: Duplicate Calls

### The Problem
The proximity API is called TWICE per legitimate form submission:

1. **Step 4 (Early Processing):** `MultiStepForm.tsx` line 880
   - Runs in background when user completes Step 4
   - Pre-fetches proximity data

2. **Step 5 (Field Load):** `ProximityField.tsx` line 92
   - Runs when ProximityField component loads
   - Fetches proximity data again

**Impact:**
- Doubles your API costs even for legitimate use
- Your 2-3 tests should have cost $0.015 but cost $0.03 instead

---

## What We Need to Confirm

### Questions for Vercel Dashboard
1. **How many requests to `/api/geoapify/proximity` on Jan 21-23?**
   - Should show ~19,000 requests if our theory is correct

2. **What IP addresses made the requests?**
   - One IP = single bot attack
   - Many IPs = distributed bots or URL was shared publicly

3. **What user agents (browsers)?**
   - Real browsers = humans using the form
   - Bot user agents = automated attacks

4. **How many unique visitors to the form on Jan 21-23?**
   - If 19,000+ visitors = form was publicly accessed
   - If 2-3 visitors = API was called directly (bypassing form)

---

## Recommended Actions

### IMMEDIATE (Today)
1. **Add server-side authentication to proximity API route**
   - Require API key in request header
   - Or restrict to specific Vercel deployment URLs
   - Or add password protection

2. **Check Vercel logs to confirm who made the calls**
   - Vercel Dashboard → Analytics/Logs
   - Look for suspicious IP patterns

3. **Set Google Cloud API daily spending limit**
   - Prevent future surprise bills
   - Set alert at $10/day

### SHORT-TERM (This Week)
4. **Fix duplicate call issue**
   - Remove API call from either Step 4 OR Step 5
   - Use pre-fetched data instead of calling twice
   - Cuts legitimate costs in half

5. **Add rate limiting (already implemented but verify)**
   - Current limits: 20/hour per IP, 10/5min burst
   - Verify it's working in production

6. **Remove hardcoded credentials from docs**
   - Multiple doc files contain passwords/API keys
   - Security risk if repo becomes public

### LONG-TERM (Next Month)
7. **Move Google Maps calls to frontend**
   - Use HTTP referrer restrictions
   - Prevents server-side abuse
   - More secure and scalable

---

## Cost Breakdown

### Per Request Cost
- 1 proximity request = 26 Google Maps API calls
- 26 calls × ($5/1,000) = **$0.13 per request**

### The $190 Bill
- 38,000 API calls ÷ 26 calls per request = ~1,460 requests
- 1,460 requests × $0.13 = **$190**

### If Duplicate Call Issue is Fixed
- 1 proximity request = 26 Google Maps API calls (same)
- But only called ONCE per submission instead of TWICE
- Cuts costs in half for legitimate use

---

## Next Steps

**Choose what to investigate first:**

A. Check Vercel logs to see who made the 38,000 calls
B. Add authentication to block unauthorized access immediately
C. Fix the duplicate call issue to reduce future costs
D. All of the above

---

## Questions to Discuss

1. Is the form URL public? Can you find it on Google search?
2. Have you shared the form URL anywhere (email, Slack, social media)?
3. Do you have any automated processes that submit to this form?
4. What authentication method do you prefer? (API key, password, whitelist)
5. Should we keep both Step 4 and Step 5 proximity calls, or remove one?
