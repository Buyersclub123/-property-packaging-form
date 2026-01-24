# 🚨 EMERGENCY SHUTDOWN PROCEDURE - $190 in 3 Days

**CRITICAL:** You're being charged $45/day = ~9,000 API requests/day  
**Tuesday:** $100 = ~20,000 requests  
**ACTION REQUIRED:** Complete these steps in the next 15 minutes

---

## ⚡ IMMEDIATE ACTIONS (DO NOW - 15 MINUTES)

### Step 1: DISABLE THE API KEY (2 minutes) ⚠️ MOST IMPORTANT

**This will stop ALL charges immediately but will break your apps temporarily**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find API key: `AIzaSyBGG3lvfqiErl8DdIh2eEgr9kA1EJrn2EU`
3. Click the **three dots** (⋮) on the right
4. Click: **Disable API key**
5. Confirm: Yes

**Result:** All API calls will fail immediately. Charges stop.

---

### Step 2: CREATE NEW RESTRICTED API KEY (5 minutes)

1. Still in: https://console.cloud.google.com/apis/credentials
2. Click: **+ CREATE CREDENTIALS** → API key
3. Copy the new key (save it somewhere safe)
4. Click: **RESTRICT KEY** immediately
5. Add Application Restrictions:
   - Select: **HTTP referrers (web sites)**
   - Add: `property-packaging-form.vercel.app/*`
   - Add: `property-packaging-form-*.vercel.app/*` (for preview deployments)
6. Add API Restrictions:
   - Select: **Restrict key**
   - Enable ONLY: Distance Matrix API, Places API, Geocoding API
7. Set name: `Google Maps - Production - Restricted`
8. Click: **SAVE**

---

### Step 3: UPDATE VERCEL ENVIRONMENT VARIABLE (3 minutes)

1. Go to: https://vercel.com/dashboard
2. Select: `property-packaging-form` project
3. Go to: Settings → Environment Variables
4. Find: `GOOGLE_MAPS_API_KEY`
5. Click: **Edit**
6. Replace with: [NEW API KEY from Step 2]
7. Select: Production, Preview, Development (all three)
8. Click: **Save**

---

### Step 4: REDEPLOY TO APPLY NEW KEY (2 minutes)

1. Still in Vercel Dashboard → `property-packaging-form`
2. Go to: Deployments tab
3. Find: Latest production deployment
4. Click: **⋯** (three dots) → **Redeploy**
5. Confirm: **Redeploy**
6. Wait: ~2 minutes for deployment to complete

---

### Step 5: DISABLE PUBLIC AMENITY APPS (3 minutes)

These are likely the source of the abuse:

#### For each of these 3 projects:
- `amenity-distance-app`
- `amenity-distance-app-a22o`
- `amenity-distance-app-8m3d`

**Do this:**
1. Go to: https://vercel.com/dashboard
2. Select: Project
3. Go to: Settings → General
4. Scroll to: **Delete Project** section
5. Click: **Delete**
6. Type project name to confirm
7. Click: **Delete**

**OR if you want to keep them:**
1. Settings → Deployment Protection
2. Enable: **Password Protection**
3. Set a strong password
4. Save

---

## 🔍 INVESTIGATE THE SOURCE (After shutdown)

### Check Google Cloud Logs (10 minutes)

1. Go to: https://console.cloud.google.com/logs
2. Click: **Log name** dropdown
3. Select: **API logs**
4. Add filter:
   ```
   resource.type="api"
   protoPayload.serviceName="maps-backend.googleapis.com"
   ```
5. Set time range: Last 3 days
6. Look for:
   - **HTTP Referer:** Which website is calling?
   - **IP Address:** Where are calls coming from?
   - **Request rate:** How many per minute?
   - **Patterns:** Same addresses being queried repeatedly?

**Take screenshots of:**
- Top referrers
- Request volume over time
- Any suspicious patterns

---

### Check Render.com Backend (5 minutes)

The backend service might be the culprit:

1. Go to: https://dashboard.render.com
2. Find: `amenity-distance-backend` service
3. Check: Logs (last 3 days)
4. Look for: Request volume, IP addresses
5. **SUSPEND SERVICE** if you see high volume:
   - Click service → Settings
   - Click: **Suspend Service**

---

## 📊 COST ANALYSIS

### What Happened:
```
Tuesday:    $100 ÷ $0.005 = 20,000 Distance Matrix requests
Wednesday:  $45 ÷ $0.005  = 9,000 requests
Thursday:   $45 ÷ $0.005  = 9,000 requests
Total:      $190         = 38,000 requests in 3 days
```

### Normal Usage Should Be:
```
Expected:   ~10-50 requests per day
Actual:     9,000-20,000 requests per day
Multiplier: 180-2000x normal usage
```

### This Indicates:
- ❌ **NOT normal user activity**
- ✅ **Bot/crawler hitting public endpoints**
- ✅ **Runaway loop or automated process**
- ✅ **Public app being abused**

---

## 🎯 MOST LIKELY CAUSES (Based on Evidence)

### 1. Public Amenity Apps Being Scraped/Abused (90% probability)
- **Why:** No authentication, publicly accessible
- **How:** Bots or users repeatedly calling the service
- **Evidence:** 3 public apps × high request volume
- **Solution:** Delete or password-protect immediately

### 2. Render.com Backend Being Called Directly (70% probability)
- **Why:** Public API endpoint with no rate limiting
- **How:** Direct API calls bypassing frontend
- **Evidence:** Backend URL is publicly known
- **Solution:** Suspend service or add authentication

### 3. Test Pages in Production (30% probability)
- **Why:** Test endpoints accessible in production
- **How:** Bots crawling and hitting test routes
- **Evidence:** Test pages exist in codebase
- **Solution:** Remove from production build

### 4. Make.com Scenario Loop (10% probability)
- **Why:** Scenario might be running repeatedly
- **How:** Webhook triggered multiple times or scheduled
- **Evidence:** Less likely but possible
- **Solution:** Check Make.com for scheduled runs

---

## ✅ VERIFICATION CHECKLIST

After completing emergency shutdown:

- [ ] Old API key is DISABLED in Google Cloud Console
- [ ] New RESTRICTED API key is created
- [ ] New API key is added to Vercel environment variables
- [ ] Vercel project is redeployed with new key
- [ ] All 3 amenity apps are deleted or password-protected
- [ ] Render.com backend is suspended or secured
- [ ] Google Cloud logs are reviewed for source
- [ ] Monitoring alerts are set up for new key

---

## 📊 MONITORING (Next 24 Hours)

### Check Every Hour:
1. Google Cloud Console → Distance Matrix API → Metrics
2. Look for: Request count should be ZERO or very low
3. If still seeing high volume:
   - Check which referrer
   - Add more restrictions
   - Consider disabling new key temporarily

### Set Up Alerts:
1. Google Cloud Console → Monitoring → Alerting
2. Create alert:
   - Metric: Distance Matrix API requests
   - Condition: > 50 requests per hour
   - Notification: Your email
3. Create budget alert:
   - Billing → Budgets & alerts
   - Set budget: $10/day
   - Alert at: 50%, 80%, 100%

---

## 💰 COST RECOVERY

### Request Refund from Google:
1. Google Cloud Console → Billing → Transactions
2. Find: Charges from last 3 days
3. Click: **Report a problem**
4. Explain:
   - "Unauthorized API usage due to unsecured public endpoint"
   - "Immediately disabled API key upon discovery"
   - "Implemented security restrictions"
5. Request: Partial or full refund

**Note:** Google may grant refunds for first-time incidents, especially if you can prove it was abuse.

---

## 🔒 LONG-TERM PREVENTION

### After Emergency is Resolved:

1. **Never use API keys in public apps without authentication**
2. **Always restrict API keys by domain and API type**
3. **Set up billing alerts at $5, $10, $20 thresholds**
4. **Monitor API usage weekly**
5. **Implement rate limiting on all API routes**
6. **Use backend proxy for all external API calls**
7. **Add authentication to all apps**

---

## 📞 NEED HELP?

### If you can't complete these steps:

**Google Cloud Support:**
- Phone: 1-877-355-5787 (US)
- Chat: https://cloud.google.com/support
- Say: "Emergency - unexpected API charges"

**Priority:** Request immediate API key disabling if you can't do it yourself

---

## ⏱️ TIME TRACKING

**Started:** ___________  
**Step 1 Complete (Key Disabled):** ___________  
**Step 2 Complete (New Key):** ___________  
**Step 3 Complete (Vercel Updated):** ___________  
**Step 4 Complete (Redeployed):** ___________  
**Step 5 Complete (Apps Secured):** ___________  
**Total Time:** ___________  

**Charges Stopped:** ☐ Yes ☐ No  
**Source Identified:** ☐ Yes ☐ No  

---

## 📝 WHAT TO DOCUMENT

After resolving:
1. Which source caused the high usage (from logs)
2. What time charges stopped
3. Total cost incurred
4. Actions taken
5. Lessons learned

---

**REMEMBER:** Every minute you wait costs more money. Complete Step 1 (disable API key) FIRST, then do the rest.
