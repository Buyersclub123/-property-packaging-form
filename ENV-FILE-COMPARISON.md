# Environment Variables Comparison

**Date:** 2026-01-XX  
**Purpose:** Compare current .env file with required values from audit

---

## ✅ You Have (Correct)

1. ✅ `PSMA_API_ENDPOINT` = `https://api.psma.com.au/v2/addresses/geocoder`
2. ✅ `PSMA_API_KEY` = (set in .env.local)
3. ✅ All GHL tokens and IDs
4. ✅ All Make.com webhooks
5. ✅ All Google Sheets IDs
6. ✅ All Google Drive folder IDs
7. ✅ `GEOAPIFY_API_KEY`
8. ✅ `GOOGLE_MAPS_API_KEY`
9. ✅ `NEXT_PUBLIC_GEOSCAPE_API_KEY`

---

## ❌ Missing - CRITICAL (Must Add)

### 1. GHL Base URL
**Add to .env:**
```env
GHL_BASE_URL=https://services.leadconnectorhq.com
```

### 2. GHL API Version
**Add to .env:**
```env
GHL_API_VERSION=2021-07-28
```

### 3. OpenAI API Key
**Add to .env:**
```env
OPENAI_API_KEY=your_openai_api_key_here
```
**Note:** Code uses this in `src/app/api/chatgpt/property-summary/route.ts`

---

## ⚠️ Missing - MEDIUM PRIORITY (Should Add)

### 4. Geoapify API Base URL
**Add to .env:**
```env
GEOAPIFY_API_BASE_URL=https://api.geoapify.com/v2/places
```

### 5. Google Maps API Base URL
**Add to .env:**
```env
GOOGLE_MAPS_API_BASE_URL=https://maps.googleapis.com/maps/api/distancematrix/json
```

### 6. OpenAI API Base URL
**Add to .env:**
```env
OPENAI_API_BASE_URL=https://api.openai.com/v1/chat/completions
```

### 7. Vercel API Base URL
**Add to .env:**
```env
VERCEL_API_BASE_URL=https://api.vercel.com
```

---

## 📋 Complete Missing Section to Add

Add this section to your `.env` file:

```env
# ---------------------------------------------------------
# 6. API BASE URLs - Configuration
# ---------------------------------------------------------
# GHL API Configuration
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_API_VERSION=2021-07-28

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1/chat/completions

# Geoapify API
GEOAPIFY_API_BASE_URL=https://api.geoapify.com/v2/places

# Google Maps API
GOOGLE_MAPS_API_BASE_URL=https://maps.googleapis.com/maps/api/distancematrix/json

# Vercel API
VERCEL_API_BASE_URL=https://api.vercel.com
```

---

## 🎯 Summary

**Total Missing:** 7 environment variables

**Critical (Must Add):** 3
- GHL_BASE_URL
- GHL_API_VERSION
- OPENAI_API_KEY

**Medium Priority (Should Add):** 4
- GEOAPIFY_API_BASE_URL
- GOOGLE_MAPS_API_BASE_URL
- OPENAI_API_BASE_URL
- VERCEL_API_BASE_URL

---

## ✅ Next Steps

1. Add the missing variables to your `.env.local` file
2. Add the same variables to Vercel (Production, Preview, Development)
3. Then I can update all the code to use these environment variables instead of hardcoded values

---

**Note:** For `OPENAI_API_KEY`, you'll need to get this from OpenAI if you don't have it yet. The other base URLs are standard endpoints that rarely change, but should still be in env vars for consistency.
