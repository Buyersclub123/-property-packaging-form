# Hardcoded Values Audit - Complete List

**Date:** 2026-01-XX  
**Purpose:** Comprehensive list of ALL hardcoded URLs, endpoints, IDs, and configuration values found in codebase  
**Status:** Complete Audit

---

## 🔴 CRITICAL - Must Be Environment Variables

### 1. PSMA/Geoscape API Endpoint
**Current Value:** `https://api.psma.com.au/v2/addresses/geocoder`  
**Found In:** 13 files
- `src/lib/geocoder.ts` (line 12)
- `src/app/api/geoapify/proximity/route.ts` (lines 66, 146)
- `src/app/api/geoapify/test-airports/route.ts` (line 167)
- `src/app/api/geoapify/test-bus-stops/route.ts` (line 44)
- `src/app/api/geoapify/test-childcare/route.ts` (line 42)
- `src/app/api/geoapify/test-hospitals/route.ts` (line 43)
- `src/app/api/geoapify/test-kindergarten/route.ts` (line 42)
- `src/app/api/geoapify/test-schools/route.ts` (line 42)
- `src/app/api/geoapify/test-supermarkets/route.ts` (line 42)
- `src/app/api/geoapify/test-train-stations/route.ts` (line 44)
- `src/app/api/geoapify/test-beach/route.ts` (line 43)
- `src/app/api/geoapify/test-capital-cities/route.ts` (line 172)

**Proposed Env Var:** `PSMA_API_ENDPOINT` (server-side) or `NEXT_PUBLIC_PSMA_API_ENDPOINT` (if used client-side)

---

### 2. GHL Base URL
**Current Value:** `https://services.leadconnectorhq.com`  
**Found In:** 
- `src/app/api/ghl/submit-property/route.ts` (line 6)

**Proposed Env Var:** `GHL_BASE_URL`

---

### 3. GHL API Version
**Current Value:** `'2021-07-28'`  
**Found In:**
- `src/app/api/ghl/submit-property/route.ts` (line 10)

**Proposed Env Var:** `GHL_API_VERSION`

---

## 🟡 MEDIUM PRIORITY - Should Be Environment Variables

### 4. Geoapify API Base URL
**Current Value:** `https://api.geoapify.com/v2/places`  
**Found In:** Multiple test files
- `src/app/api/geoapify/proximity/route.ts` (lines 101, 119, 318)
- `src/app/api/geoapify/test-childcare/route.ts` (line 73)
- `src/app/api/geoapify/test-bus-stops/route.ts` (line 75)
- `src/app/api/geoapify/test-train-stations/route.ts` (lines 82, 130)
- `src/app/api/geoapify/test-schools/route.ts` (line 72)
- `src/app/api/geoapify/test-hospitals/route.ts` (line 73)
- `src/app/api/geoapify/test-kindergarten/route.ts` (line 72)
- `src/app/api/geoapify/test-supermarkets/route.ts` (line 72)
- `src/app/api/geoapify/test-beach/route.ts` (line 74)

**Proposed Env Var:** `GEOAPIFY_API_BASE_URL`

---

### 5. Google Maps API Base URL
**Current Value:** `https://maps.googleapis.com/maps/api/distancematrix/json`  
**Found In:**
- `src/app/api/geoapify/test-airports/route.ts` (line 102)
- `src/app/api/geoapify/test-capital-cities/route.ts` (line 112)

**Proposed Env Var:** `GOOGLE_MAPS_API_BASE_URL`

---

### 6. OpenAI API Base URL
**Current Value:** `https://api.openai.com/v1/chat/completions`  
**Found In:**
- `src/app/api/chatgpt/property-summary/route.ts` (line 48)

**Proposed Env Var:** `OPENAI_API_BASE_URL`

---

### 7. Vercel API Base URL
**Current Value:** `https://api.vercel.com`  
**Found In:**
- `src/lib/vercel.ts` (line 3)
- `src/app/api/vercel/fix-google-credentials/route.ts` (line 6)

**Proposed Env Var:** `VERCEL_API_BASE_URL`

---

## 🟢 LOW PRIORITY - Probably OK to Keep Hardcoded

### 8. Google OAuth Scopes
**Current Values:**
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/drive`

**Found In:**
- `src/lib/googleSheets.ts`
- `src/lib/googleDrive.ts`
- `src/app/api/sourcers/route.ts`

**Reason:** Standard OAuth scopes, unlikely to change

---

### 9. Public Website URLs
**Current Values:**
- `https://www.washingtonbrown.com.au`
- `https://www.smartpropertyinvestment.com.au`
- `https://info.realestateinvestar.com.au`
- `https://rpp.corelogic.com.au`
- `https://www.google.com/maps/...`
- `https://app.gohighlevel.com/location/...`

**Found In:** Various component files

**Reason:** Public URLs, unlikely to change

---

## 📋 Summary

**Total Hardcoded Values Found:** 9 categories

**Critical (Must Fix):** 3
- PSMA API Endpoint (13 files)
- GHL Base URL (1 file)
- GHL API Version (1 file)

**Medium Priority (Should Fix):** 4
- Geoapify API Base URL (9 files)
- Google Maps API Base URL (2 files)
- OpenAI API Base URL (1 file)
- Vercel API Base URL (2 files)

**Low Priority (OK to Keep):** 2
- Google OAuth Scopes (standard)
- Public Website URLs (public URLs)

---

## ✅ Action Plan

1. **Immediate:** Fix PSMA API Endpoint (13 files)
2. **Immediate:** Fix GHL Base URL and API Version (1 file)
3. **Next:** Fix Geoapify, Google Maps, OpenAI, Vercel API base URLs
4. **Document:** Keep OAuth scopes and public URLs as-is

---

**Next Step:** Update code to use environment variables for all Critical and Medium Priority items.
