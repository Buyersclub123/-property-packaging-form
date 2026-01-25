# 🚨 IMMEDIATE ACTION CHECKLIST - Google API Unexpected Usage

**Date:** January 24, 2026  
**Priority:** CRITICAL  
**Time to Complete:** 30-60 minutes

---

## ✅ Step-by-Step Actions (Do These NOW)

### Step 1: Check Google Cloud Console (5 minutes)

1. **Go to:** https://console.cloud.google.com
2. **Navigate to:** APIs & Services → Dashboard
3. **Click on:** Distance Matrix API
4. **Click:** Metrics tab
5. **Look for:**
   - Traffic by referer (which websites?)
   - Traffic by credential (which API key?)
   - Traffic over time (when did it spike?)
   - Geographic distribution (where from?)

**Take screenshots** of these metrics for your records.

---

### Step 2: Restrict API Key (10 minutes)

1. **Go to:** https://console.cloud.google.com
2. **Navigate to:** APIs & Services → Credentials
3. **Find:** API key `AIzaSyBGG3lvfqiErl8DdIh2eEgr9kA1EJrn2EU`
4. **Click:** Edit (pencil icon)

#### Add Application Restrictions:
- Select: **HTTP referrers (web sites)**
- Click: **Add an item**
- Enter: `property-packaging-form.vercel.app/*`
- Click: **Add an item**
- Enter: `*.vercel.app/*` (if you want to allow all Vercel deployments)
- Click: **Done**

#### Add API Restrictions:
- Select: **Restrict key**
- Check ONLY these APIs:
  - ✅ Distance Matrix API
  - ✅ Places API
  - ✅ Geocoding API
- Uncheck all others
- Click: **Save**

**Wait 5 minutes** for restrictions to take effect.

---

### Step 3: Set Usage Quotas (5 minutes)

1. **Still in Google Cloud Console**
2. **Navigate to:** APIs & Services → Distance Matrix API
3. **Click:** Quotas & System Limits
4. **Set:**
   - Requests per day: **500** (adjust based on your needs)
   - Requests per minute: **10** (adjust based on your needs)
5. **Click:** Save

---

### Step 4: Set Up Alerts (5 minutes)

1. **Navigate to:** Monitoring → Alerting
2. **Click:** Create Policy
3. **Configure:**
   - **Resource:** Distance Matrix API
   - **Metric:** Request count
   - **Condition:** Greater than 50 requests per hour
   - **Notification:** Your email address
4. **Click:** Save

Repeat for Places API (threshold: 20 requests per hour).

---

### Step 5: Disable Public Amenity Apps (10 minutes)

**Option A: Password Protect (Recommended)**

1. **Go to:** https://vercel.com/dashboard
2. **Find project:** `amenity-distance-app`
3. **Go to:** Settings → Deployment Protection
4. **Enable:** Password Protection
5. **Set password:** (choose a strong password)
6. **Save**

**Repeat for:**
- `amenity-distance-app-a22o`
- `amenity-distance-app-8m3d`

**Option B: Pause Deployments (More Drastic)**

1. **Go to:** https://vercel.com/dashboard
2. **Find project:** `amenity-distance-app`
3. **Go to:** Settings → General
4. **Scroll down:** Pause Deployment
5. **Click:** Pause

---

### Step 6: Check Render.com Backend (5 minutes)

1. **Go to:** https://dashboard.render.com
2. **Find service:** `amenity-distance-backend`
3. **Check logs:** Look for requests in last 24 hours
4. **Options:**
   - **Suspend service** (stops all requests)
   - **Add rate limiting** (if available)
   - **Change API key** (if needed)

---

### Step 7: Check Vercel Logs (5 minutes)

1. **Go to:** https://vercel.com/dashboard
2. **Select:** `property-packaging-form` project
3. **Click:** Logs
4. **Filter:** Last 24 hours
5. **Search for:** "Distance Matrix" or "/api/geoapify"
6. **Look for:** Any unexpected API calls

**Take note of:**
- How many calls?
- From which routes?
- Any error messages?

---

### Step 8: Monitor for Next Hour (Ongoing)

1. **Return to:** Google Cloud Console → Distance Matrix API → Metrics
2. **Refresh every 10-15 minutes**
3. **Verify:** Request count has stopped or significantly reduced
4. **If still seeing requests:**
   - Check which referrer is still calling
   - Add more restrictive rules
   - Consider regenerating API key

---

## 📊 Expected Results

### Before Actions:
- Distance Matrix API: ~114 requests today
- Places API: ~14 requests today
- No restrictions on API key

### After Actions:
- New requests should be blocked (unless from allowed referrers)
- You'll receive email alerts if usage spikes
- Public apps are protected or disabled
- API key is restricted to specific APIs only

---

## 🔍 If Issue Persists

### Check These Additional Sources:

1. **Make.com Scenarios:**
   - Go to: https://www.make.com
   - Check: "GHL Property Review Submitted" scenario
   - Look for: Any HTTP modules calling Google APIs
   - Verify: No scheduled runs or automated triggers

2. **Vercel Preview Deployments:**
   - Go to: Vercel Dashboard → Deployments
   - Check: Are there preview deployments running?
   - Consider: Disable automatic preview deployments

3. **Test Pages in Production:**
   - Check: Is `/test-proximity` accessible in production?
   - Consider: Remove test pages from production build

---

## 📞 Need Help?

### If you're stuck on any step:

1. **Google Cloud Console Issues:**
   - Google Cloud Support: https://cloud.google.com/support
   - Documentation: https://cloud.google.com/docs

2. **Vercel Issues:**
   - Vercel Support: https://vercel.com/support
   - Documentation: https://vercel.com/docs

3. **Render.com Issues:**
   - Render Support: https://render.com/support
   - Documentation: https://render.com/docs

---

## ✅ Completion Checklist

Mark each item as you complete it:

- [ ] Checked Google Cloud Console metrics
- [ ] Added HTTP referrer restrictions to API key
- [ ] Added API restrictions (only needed APIs)
- [ ] Set usage quotas
- [ ] Set up monitoring alerts
- [ ] Password-protected or paused amenity apps
- [ ] Checked Render.com backend logs
- [ ] Checked Vercel deployment logs
- [ ] Monitored for 1 hour to verify issue resolved

---

## 📝 After Completion

1. **Document what you found:**
   - Which source was causing the unexpected calls?
   - What time did calls stop after implementing restrictions?
   - Any other observations?

2. **Review the full investigation report:**
   - File: `GOOGLE-API-INVESTIGATION-REPORT.md`
   - Contains long-term recommendations
   - Schedule time to implement additional security measures

3. **Schedule follow-up:**
   - Check API usage again tomorrow
   - Review weekly for next month
   - Implement long-term recommendations from report

---

**Time Started:** ___________  
**Time Completed:** ___________  
**Issue Resolved:** ☐ Yes  ☐ No  ☐ Partially  

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
