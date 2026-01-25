# Google API Unexpected Usage Investigation Report

**Date:** January 24, 2026  
**Issue:** Unexpected Google Cloud API calls in production  
**Status:** 🔴 CRITICAL - Immediate Action Required

---

## 📊 Issue Summary

### Observed API Usage (Today - No Production Activity Expected)
- **Distance Matrix API:** 114 requests
- **Places API:** 14 requests  
- **Geocoding API:** 1 request
- **Analytics Hub API:** Listed but no usage shown

### Expected Usage
- **Test Environment:** Only 2 manual tests performed
- **Production:** No one working today
- **Discrepancy:** 128 total requests vs 2 expected = **126 unexplained requests**

---

## 🔍 Investigation Findings

### 1. API Usage Points Identified

#### A. Distance Matrix API (114 requests)
**Primary Usage Locations:**
1. **Proximity/Amenity Calculations** (`form-app/src/app/api/geoapify/proximity/route.ts`)
   - Called for airports (lines 85-130)
   - Called for capital cities (lines 85-130)
   - Called for all Geoapify place results (hospitals, schools, supermarkets, etc.)
   - **Trigger:** User clicks "Auto-Fetch Proximity Data" in Step 5

2. **Test Endpoints:**
   - `/api/geoapify/test-airports/route.ts`
   - `/api/geoapify/test-capital-cities/route.ts`
   - `/api/geoapify/test-hospitals/route.ts`
   - **Trigger:** Accessed via test pages

3. **Amenity Distance Apps (3 deployments):**
   - `amenity-distance-app.vercel.app`
   - `amenity-distance-app-a22o.vercel.app`
   - `amenity-distance-app-8m3d.vercel.app`
   - **Backend:** `https://amenity-distance-backend.onrender.com/api/distance`
   - **Trigger:** User enters address and clicks "Generate Summary"

#### B. Places API (14 requests)
**Primary Usage Locations:**
1. **Geoapify Places Search** (uses Google Places as fallback in some scenarios)
2. **Proximity endpoint** searching for:
   - Train stations
   - Bus stops
   - Beaches
   - Schools
   - Supermarkets
   - Hospitals
   - Kindergartens
   - Childcare centers

#### C. Geocoding API (1 request)
**Usage Location:**
- Geoscape API is primary geocoder
- Google Geocoding used as fallback
- May be called from Make.com scenarios

---

### 2. Potential Sources of Unexpected Calls

#### 🔴 HIGH PROBABILITY SOURCES:

**A. Publicly Accessible Amenity Apps**
- **URLs:** 
  - https://amenity-distance-app.vercel.app
  - https://amenity-distance-app-a22o.vercel.app  
  - https://amenity-distance-app-8m3d.vercel.app
- **Issue:** These are PUBLIC websites with NO authentication
- **Risk:** Anyone can access and use them
- **API Key:** Hardcoded in backend service at `amenity-distance-backend.onrender.com`
- **Impact:** Each user submission triggers multiple Distance Matrix API calls

**B. Form App Test Pages**
- **URLs:**
  - `/test-proximity` page
  - `/test-all-categories` page
  - Individual test endpoints for airports, cities, hospitals
- **Issue:** If deployed to production Vercel, these are publicly accessible
- **Risk:** Could be accessed by bots, crawlers, or unauthorized users

**C. Backend Service on Render.com**
- **Service:** `amenity-distance-backend.onrender.com`
- **Issue:** Publicly accessible API endpoint
- **Risk:** Direct API calls bypass any frontend controls
- **API Key Storage:** Likely stored in Render.com environment variables

#### 🟡 MEDIUM PROBABILITY SOURCES:

**D. Make.com Scenarios**
- **Scenario:** "GHL Property Review Submitted"
- **Possible Issue:** Scenario may be calling Google APIs for geocoding
- **Webhook:** `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- **Risk:** If webhook is triggered by test data or duplicate submissions

**E. Vercel Deployment Health Checks**
- **Issue:** Vercel may run health checks on API routes
- **Risk:** If health checks call API routes that trigger Google APIs

#### 🟢 LOW PROBABILITY SOURCES:

**F. Browser Caching/Prefetching**
- Modern browsers may prefetch API routes
- Unlikely to cause 100+ requests

**G. Development/Staging Environments**
- If staging environment shares same API key
- Could be triggered by automated tests

---

### 3. API Key Configuration Analysis

#### Current API Key Setup:
```
GOOGLE_MAPS_API_KEY=AIzaSyBGG3lvfqiErl8DdIh2eEgr9kA1EJrn2EU
```

#### Where This Key Is Used:
1. **Form App (Vercel):** `property-packaging-form.vercel.app`
   - Environment variable in Vercel project settings
   - Used by `/api/geoapify/proximity/route.ts`
   - Used by test endpoints

2. **Amenity Backend (Render.com):** `amenity-distance-backend.onrender.com`
   - Likely stored in Render.com environment variables
   - Used for all amenity distance calculations

3. **Possibly in Make.com:**
   - May be stored in Make.com scenario variables
   - Used for geocoding operations

#### 🔴 CRITICAL SECURITY ISSUE:
**The API key is exposed in multiple locations and used by PUBLIC applications without authentication or rate limiting.**

---

### 4. API Key Restrictions Analysis

#### Current Restrictions (Need to Verify in Google Cloud Console):
- [ ] HTTP referrer restrictions?
- [ ] IP address restrictions?
- [ ] API restrictions (which APIs can use this key)?
- [ ] Request quotas per day/minute?

#### Recommended Restrictions:
1. **HTTP Referrers (for frontend apps):**
   - `property-packaging-form.vercel.app/*`
   - `amenity-distance-app*.vercel.app/*` (if keeping these)

2. **IP Restrictions (for backend services):**
   - Render.com IP addresses (if static)
   - Vercel serverless function IPs (if possible)

3. **API Restrictions:**
   - Enable ONLY: Distance Matrix API, Places API, Geocoding API
   - Disable all other APIs

4. **Usage Quotas:**
   - Set daily quota limit (e.g., 500 requests/day)
   - Set per-minute rate limit (e.g., 10 requests/minute)
   - Enable quota alerts at 50%, 80%, 90%

---

## 🚨 Immediate Actions Required

### PRIORITY 1: Stop Unauthorized Usage (Today)

#### Action 1.1: Restrict API Key Immediately
```
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find API key: AIzaSyBGG3lvfqiErl8DdIh2eEgr9kA1EJrn2EU
3. Click Edit
4. Add Application Restrictions:
   - Select "HTTP referrers"
   - Add: property-packaging-form.vercel.app/*
5. Add API Restrictions:
   - Select "Restrict key"
   - Enable ONLY: Distance Matrix API, Places API, Geocoding API
6. Save changes
```

#### Action 1.2: Check Current API Usage in Google Cloud
```
1. Go to Google Cloud Console → APIs & Services → Dashboard
2. Select Distance Matrix API
3. View "Metrics" tab
4. Check:
   - Traffic by referer (which websites are calling it)
   - Traffic by credential (confirm it's this key)
   - Traffic over time (when did calls happen)
   - Geographic distribution (where calls came from)
```

#### Action 1.3: Disable Public Amenity Apps (Temporary)
```
Option A: Remove from Vercel (safest)
1. Go to Vercel dashboard
2. Find projects: amenity-distance-app, amenity-distance-app-a22o, amenity-distance-app-8m3d
3. Settings → General → Delete Project (or pause deployment)

Option B: Add Authentication
1. Add password protection to these apps
2. Use Vercel's password protection feature
3. Or implement basic auth in the apps

Option C: Disable Backend Service
1. Go to Render.com dashboard
2. Find service: amenity-distance-backend
3. Suspend service temporarily
```

### PRIORITY 2: Investigate Usage Patterns (Today)

#### Action 2.1: Review Google Cloud Logs
```
1. Google Cloud Console → Logging → Logs Explorer
2. Filter by:
   - Resource: Distance Matrix API
   - Time: Last 24 hours
3. Check for:
   - Request origins (IP addresses, referrers)
   - Request patterns (bursts, regular intervals)
   - Request parameters (which addresses were queried)
```

#### Action 2.2: Check Vercel Deployment Logs
```
1. Vercel Dashboard → property-packaging-form → Logs
2. Filter by: Last 24 hours
3. Search for: "/api/geoapify" or "Distance Matrix"
4. Check: Were there any API route calls today?
```

#### Action 2.3: Check Render.com Logs
```
1. Render.com Dashboard → amenity-distance-backend → Logs
2. Check: Were there any requests today?
3. Look for: IP addresses, request patterns
```

### PRIORITY 3: Implement Monitoring (This Week)

#### Action 3.1: Set Up Google Cloud Alerts
```
1. Google Cloud Console → Monitoring → Alerting
2. Create alerts for:
   - Distance Matrix API > 50 requests/hour
   - Places API > 20 requests/hour
   - Daily quota > 80% threshold
3. Send alerts to: your email
```

#### Action 3.2: Implement Rate Limiting in Form App
```
File: form-app/src/lib/rateLimit.ts (already exists)
- Review current rate limits
- Ensure they're applied to all API routes
- Add IP-based rate limiting
- Add user-based rate limiting (if auth exists)
```

#### Action 3.3: Add Request Logging
```
File: form-app/src/lib/requestLogger.ts (already exists)
- Log all Google API calls
- Include: timestamp, IP, user, endpoint, response
- Store in Google Sheets or database
- Review logs weekly
```

---

## 📋 Long-Term Recommendations

### 1. Architecture Changes

#### A. Separate API Keys by Environment
```
Development:   GOOGLE_MAPS_API_KEY_DEV   (restricted to localhost)
Staging:       GOOGLE_MAPS_API_KEY_STAGE (restricted to staging domain)
Production:    GOOGLE_MAPS_API_KEY_PROD  (restricted to production domain)
```

#### B. Implement Backend Proxy
```
Instead of calling Google APIs directly from frontend:
Frontend → Your Backend API → Google APIs

Benefits:
- Single point of control
- Better rate limiting
- API key never exposed to browser
- Can cache results
- Can implement authentication
```

#### C. Add Authentication to All Apps
```
- Form app: Already has user email tracking
- Amenity apps: Add password protection or remove public access
- Test pages: Move to separate staging deployment or add auth
```

### 2. Cost Optimization

#### A. Implement Caching
```
- Cache Distance Matrix results (addresses don't change)
- Cache Places API results (amenities don't change often)
- Use Redis or similar for distributed cache
- Set TTL: 7-30 days for static data
```

#### B. Batch API Requests
```
- Distance Matrix API supports up to 25 destinations per request
- Combine multiple destination queries into single request
- Current code already does this (good!)
```

#### C. Use Cheaper Alternatives Where Possible
```
- Haversine formula for initial filtering (free)
- Only use Distance Matrix for final results
- Consider alternative APIs for some use cases
```

### 3. Security Improvements

#### A. API Key Rotation Schedule
```
- Rotate Google API keys every 90 days
- Document rotation process
- Update all services simultaneously
- Test after rotation
```

#### B. Implement API Gateway
```
- Use service like Kong, AWS API Gateway, or Google Cloud API Gateway
- Centralize authentication, rate limiting, logging
- Better visibility into API usage
```

#### C. Regular Security Audits
```
- Monthly: Review API usage in Google Cloud Console
- Quarterly: Audit all API keys and credentials
- Annually: Full security assessment
```

---

## 📊 Cost Analysis

### Current Pricing (Google Maps Platform)
- **Distance Matrix API:** $0.005 per element (origin-destination pair)
- **Places API:** $0.017 per request (Text Search)
- **Geocoding API:** $0.005 per request

### Today's Estimated Cost
```
Distance Matrix: 114 requests × $0.005 = $0.57
Places API:      14 requests × $0.017  = $0.24
Geocoding:       1 request × $0.005    = $0.005
                                Total:  $0.81
```

### If This Continues Daily
```
Daily:    $0.81
Weekly:   $5.67
Monthly:  $24.30
Yearly:   $295.65
```

### Worst Case Scenario (If Publicly Abused)
```
If bots discover the public amenity apps:
- 1,000 requests/day × $0.005 = $5/day = $1,825/year
- 10,000 requests/day × $0.005 = $50/day = $18,250/year
```

---

## ✅ Action Checklist

### Immediate (Today)
- [ ] Check Google Cloud Console for API usage details (referrers, IPs, times)
- [ ] Add HTTP referrer restrictions to API key
- [ ] Add API restrictions (limit to only needed APIs)
- [ ] Set up usage quota limits
- [ ] Disable or password-protect public amenity apps
- [ ] Review Vercel deployment logs
- [ ] Review Render.com backend logs

### This Week
- [ ] Set up Google Cloud monitoring alerts
- [ ] Review and strengthen rate limiting in form app
- [ ] Implement request logging for all Google API calls
- [ ] Create separate API keys for dev/staging/production
- [ ] Document API key rotation process

### This Month
- [ ] Implement caching for API results
- [ ] Consider backend proxy architecture
- [ ] Add authentication to all public-facing apps
- [ ] Conduct full security audit of all credentials
- [ ] Review and optimize API usage patterns

---

## 📞 Next Steps

1. **Review this report** with your team
2. **Execute Priority 1 actions** immediately (today)
3. **Monitor API usage** for next 24-48 hours to confirm issue is resolved
4. **Schedule follow-up** to implement long-term recommendations

---

## 📝 Notes

### Questions to Answer
1. Are the amenity distance apps still needed in production?
2. Should test pages be removed from production deployment?
3. Is there a legitimate use case for the high API usage?
4. Are there any automated processes we haven't discovered?

### Additional Investigation Needed
1. Check Make.com scenarios for any scheduled runs
2. Verify Vercel deployment settings (preview deployments, etc.)
3. Check if there are any webhooks triggering the form app
4. Review Google Cloud Console for any other unexpected API usage

---

**Report Prepared By:** AI Assistant  
**Date:** January 24, 2026  
**Status:** Ready for Review and Action
