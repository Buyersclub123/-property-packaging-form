# Security Audit Report - Property Review System
**Date:** January 24, 2026  
**Focus:** Dev Environment (Pre-Production Deployment)

---

## Executive Summary

**ROOT CAUSE OF $190 GOOGLE API CHARGES:**
- Your Vercel form app's `/api/geoapify/proximity` route is **publicly accessible without authentication**
- This route makes **~26 Google Distance Matrix API calls per request** (airports, cities, amenities)
- Bots or repeated usage triggered **38,000+ API calls** over 3 days (Jan 21-23)
- **Rate limiting was added** which reduced usage, but the route is still vulnerable

---

## Critical Vulnerabilities

### 1. **PUBLICLY ACCESSIBLE API ROUTE** ⚠️ CRITICAL
**File:** `form-app/src/app/api/geoapify/proximity/route.ts`

**Issue:**
- No authentication required to call this endpoint
- Makes expensive Google Maps API calls (~$0.13 per request)
- Anyone with the URL can trigger unlimited API calls

**Evidence:**
- Google Cloud Console shows "Unspecified" domain (backend calls)
- Massive spikes on Jan 20-21 ($100), Jan 22-23 ($45/day)
- You're the only user, yet thousands of calls were made

**Current Mitigation:**
- Rate limiting added (20 requests/hour per IP, 10 requests/5min burst)
- Request logging implemented
- Email alerts configured

**Risk Level:** HIGH - Still exploitable by distributed bots or IP rotation

---

### 2. **HARDCODED CREDENTIALS IN DOCUMENTATION** ⚠️ HIGH

**Files with Exposed Secrets:**
1. `docs/STASHPROPERTY-LOGIN-AND-API-SETUP.md`
   - Email: `Ali.h@buyersclub.com.au`
   - Password: `Buyersclub313!`
   - API Key: `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

2. `CONFIG.md`
   - GHL Bearer Token: `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
   - Webhook URLs (publicly accessible)

3. Multiple doc files contain API keys and credentials

**Risk:** If your Git repository is public or becomes compromised, all credentials are exposed.

---

### 3. **NO AUTHENTICATION ON OTHER API ROUTES** ⚠️ MEDIUM

**Vulnerable Routes (No Auth):**
- `/api/geoapify/proximity` - Google Maps API calls
- `/api/geoapify/test-*` - Test endpoints (11 routes)
- `/api/market-performance/lookup` - Google Sheets access
- `/api/investment-highlights/lookup` - Google Sheets access
- `/api/ghl/check-address` - GHL API access
- `/api/create-property-folder` - Google Drive access

**All routes are publicly accessible** - anyone with the URL can:
- Trigger Google API calls (costs money)
- Access your Google Sheets data
- Create folders in your Google Drive
- Query your GHL database

---

### 4. **ENVIRONMENT VARIABLES IN DOCUMENTATION** ⚠️ MEDIUM

**Files:**
- `form-app/GOOGLE-SHEETS-SETUP.md` - Contains env variable names and structure
- `form-app/env-local-template.txt` - Template with variable names
- Multiple docs reference API keys and tokens

**Risk:** If combined with exposed credentials, attackers know exactly which env vars to target.

---

### 5. **CORS CONFIGURATION** ⚠️ LOW

**File:** `form-app/src/app/api/geoapify/proximity/route.ts` (lines 405-409)

**Current CORS Origins:**
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://property-packaging-form.vercel.app',
];
```

**Issue:** CORS only restricts browser requests, not direct API calls (which is what bots use).

**Note:** This is NOT the cause of your charges (bots bypass CORS), but should be tightened.

---

## Other Security Findings

### 6. **RATE LIMITING IS IN-MEMORY** ⚠️ LOW
**File:** `form-app/src/lib/rateLimit.ts`

**Issue:**
- Rate limits reset on server restart (Vercel serverless functions)
- No persistent storage (Redis/database)
- Attackers can bypass by triggering cold starts

**Current Limits:**
- 20 requests/hour per IP
- 10 requests/5min burst per IP
- 100 requests/day global

**Recommendation:** Use Redis or database for persistent rate limiting.

---

### 7. **NO API KEY ROTATION POLICY** ⚠️ LOW

**Issue:**
- Stashproperty API key hardcoded in docs (never rotated)
- GHL Bearer token hardcoded in docs
- No expiration or rotation schedule

**Recommendation:** Implement quarterly API key rotation.

---

### 8. **GOOGLE SHEETS CREDENTIALS HANDLING** ⚠️ MEDIUM

**Files:**
- `form-app/src/lib/googleSheets.ts`
- `form-app/src/lib/googleDrive.ts`

**Current Implementation:**
- Reads from `GOOGLE_SHEETS_CREDENTIALS` env var (GOOD)
- Falls back to reading from file system `credentials/google-sheets-credentials.json` (BAD)
- Credentials file could be accidentally committed to Git

**Recommendation:** Remove file fallback, use env vars only.

---

## What's NOT a Vulnerability

### ✅ Make.com Scenarios
**Status:** SECURE
- All scenarios use webhooks (not publicly crawlable)
- No Google Maps API calls in Make.com
- Properly configured with authentication

### ✅ Vercel Deployment
**Status:** SECURE
- Environment variables properly stored in Vercel
- Not exposed in Git repository
- Deployment logs are private

### ✅ Google Cloud API Key Restrictions
**Status:** PARTIALLY IMPLEMENTED
- API key is used server-side (backend)
- Cannot use HTTP referrer restrictions (would break server-side calls)
- IP restrictions not feasible (Vercel uses dynamic IPs)

---

## Recommendations (Priority Order)

### IMMEDIATE (Do Today)

1. **Add Authentication to Proximity API**
   - Option A: Require API key in request header
   - Option B: Use session-based auth (only logged-in users)
   - Option C: Move to frontend (browser-side calls with HTTP referrer restrictions)

2. **Remove Credentials from Documentation**
   - Delete or redact all passwords, API keys, tokens from `/docs` folder
   - Add `.md` files with credentials to `.gitignore`
   - Rotate exposed credentials (Stashproperty password, GHL token)

3. **Monitor Google Cloud Costs**
   - Set up budget alerts in Google Cloud Console
   - Set daily spending limit on Distance Matrix API
   - Review usage daily for next week

---

### SHORT-TERM (This Week)

4. **Add Authentication to All Public API Routes**
   - Implement middleware for API key validation
   - Or restrict to specific Vercel deployment URLs
   - Document which routes require auth

5. **Remove File-Based Credential Fallback**
   - Update `googleSheets.ts` and `googleDrive.ts`
   - Remove file system credential reading
   - Ensure all credentials come from env vars

6. **Implement Persistent Rate Limiting**
   - Use Vercel KV (Redis) or Upstash
   - Store rate limit counters persistently
   - Prevents bypass via cold starts

---

### MEDIUM-TERM (Next 2 Weeks)

7. **Move Google Maps Calls to Frontend**
   - Refactor proximity calculation to run in browser
   - Use HTTP referrer restrictions on Google Maps API key
   - Prevents server-side abuse

8. **Implement API Key Rotation**
   - Rotate Stashproperty API key
   - Rotate GHL Bearer token
   - Document rotation schedule (quarterly)

9. **Add Request Logging & Monitoring**
   - Already implemented in `requestLogger.ts` (GOOD)
   - Add dashboard to view logs
   - Set up anomaly detection alerts

---

### LONG-TERM (Next Month)

10. **Security Audit of Git History**
    - Check if credentials were ever committed to Git
    - Use tools like `git-secrets` or `truffleHog`
    - Rotate any exposed credentials

11. **Implement Proper Secrets Management**
    - Use Vercel's secret management
    - Consider HashiCorp Vault or AWS Secrets Manager
    - Never store secrets in code or docs

12. **Add API Usage Dashboard**
    - Track Google Maps API usage in real-time
    - Show cost estimates
    - Alert when approaching budget limits

---

## Cost Analysis

### Current Costs (Jan 21-24)
- **Tuesday (Jan 21):** $100
- **Wednesday (Jan 22):** $45
- **Thursday (Jan 23):** $45
- **Total:** $190

### Cost Breakdown
- **Google Distance Matrix API:** $5 per 1,000 calls
- **Estimated calls:** 38,000+ calls
- **Cost per proximity request:** ~$0.13 (26 API calls)

### Projected Costs (If Not Fixed)
- **Without rate limiting:** $100-200/day (unlimited bot access)
- **With current rate limiting:** $5-20/day (100 requests/day global limit)
- **With authentication:** $0-5/day (only legitimate users)

---

## Conclusion

**Root Cause:** Public API route without authentication + expensive Google Maps API calls = bot abuse

**Current Status:** Rate limiting reduces risk but doesn't eliminate it

**Required Action:** Add authentication to `/api/geoapify/proximity` route immediately

**Long-Term Solution:** Move Google Maps API calls to frontend with proper restrictions

---

## Next Steps

1. **Review this report** with your team
2. **Decide on authentication strategy** (API key, session-based, or frontend migration)
3. **Implement chosen solution** (I can help with this)
4. **Remove credentials from docs** (search and redact)
5. **Monitor costs daily** for next week to confirm fix

Would you like me to implement any of these recommendations now?
