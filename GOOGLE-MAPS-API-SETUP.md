# Google Maps API Key Setup Guide

## What You Need

A Google Maps API key with the **Distance Matrix API** enabled. This API is used to calculate:
- Road network distances from properties to airports
- Road network distances from properties to cities
- Travel times with traffic (Wednesday 9 AM)

## Step-by-Step Instructions

### Step 1: Go to Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com/**
2. Sign in with your Google account (or create one if needed)

### Step 2: Create or Select a Project

1. Click the project dropdown at the top (next to "Google Cloud")
2. Either:
   - **Select an existing project** (if you have one)
   - **Click "New Project"** to create a new one
     - Project name: `Property Review System` (or any name you like)
     - Click "Create"

### Step 3: Enable Distance Matrix API

1. In the search bar at the top, type: **"Distance Matrix API"**
2. Click on **"Distance Matrix API"** from the results
3. Click the **"Enable"** button (if it's not already enabled)
4. Wait for it to enable (usually takes a few seconds)

### Step 4: Create API Key

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Click the **"+ CREATE CREDENTIALS"** button at the top
3. Select **"API key"**
4. A popup will show your new API key - **COPY IT NOW** (you'll see it again, but it's easier to copy now)
5. Click **"Close"** (don't restrict it yet - we'll do that next)

### Step 5: (Optional but Recommended) Restrict the API Key

1. In the Credentials page, click on your newly created API key name
2. Under **"API restrictions"**, select **"Restrict key"**
3. Under **"Select APIs"**, check:
   - ✅ **Distance Matrix API**
   - ✅ **Geocoding API** (if you plan to use it later)
4. Under **"Application restrictions"**, you can:
   - Leave it as "None" (for testing)
   - Or set to "HTTP referrers" and add: `http://localhost:3000/*` (for local dev)
5. Click **"Save"**

### Step 6: Add API Key to Your Project

1. Open the file: `property-review-system/form-app/.env.local`
2. Find the line: `GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here`
3. Replace `your_google_maps_api_key_here` with your actual API key
4. Save the file

Example:
```bash
GOOGLE_MAPS_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 7: Restart Your Dev Server

1. Stop your dev server (Ctrl+C in the terminal where it's running)
2. Start it again: `npm run dev`
3. The new API key will be loaded

## Testing

Once you've added the API key:

1. Go to: **http://localhost:3000/test-all-categories**
2. Enter an address: `4 Osborne Circuit Maroochydore QLD`
3. Click **"Test Airport"** or **"Test Capital Cities"**
4. You should see results with distances and travel times!

## Important Notes

### Billing
- Google provides **$200/month free credit**
- Distance Matrix API costs: ~$0.005 per request
- Our usage: ~57 requests per property (26 airports + 31 cities)
- Cost per property: ~$0.29
- **You'll need to enable billing** to use the API (even with free credit)

### Enable Billing (Required)
1. In Google Cloud Console, go to **"Billing"**
2. Click **"Link a billing account"**
3. Add a payment method (credit card)
4. Don't worry - you get $200 free credit per month!

### API Quotas
- Default quota: 40,000 requests/day
- This is plenty for testing and normal use
- You can increase quotas if needed later

## Troubleshooting

### Error: "REQUEST_DENIED"
- **Cause:** API key is invalid or Distance Matrix API not enabled
- **Fix:** 
  1. Check that Distance Matrix API is enabled (Step 3)
  2. Verify API key is correct in `.env.local`
  3. Restart dev server

### Error: "This API project is not authorized"
- **Cause:** Distance Matrix API not enabled
- **Fix:** Go back to Step 3 and enable the API

### Error: "You must enable Billing"
- **Cause:** Billing not enabled
- **Fix:** Enable billing (see "Enable Billing" section above)

### No Results Returned
- **Cause:** API key might be restricted incorrectly
- **Fix:** Check API key restrictions (Step 5) - make sure Distance Matrix API is allowed

## Quick Checklist

- [ ] Google Cloud account created/signed in
- [ ] Project created or selected
- [ ] Distance Matrix API enabled
- [ ] API key created
- [ ] API key added to `.env.local` file
- [ ] Dev server restarted
- [ ] Test endpoint works!

## Need Help?

If you get stuck:
1. Check the error message in the browser console (F12)
2. Check the terminal where the dev server is running
3. Verify the API key is correct in `.env.local`
4. Make sure Distance Matrix API is enabled in Google Cloud Console

---

**Once you have the API key, paste it here and I'll add it to your `.env.local` file for you!**
