# Production Test Logs Analysis

**Date:** 2026-01-26  
**Environment:** Production (property-packaging-form.vercel.app)  
**Test Property:** 5 ACACIA ST, POINT VERNON QLD 4655  
**Status:** Multiple Critical Issues Identified

---

## Executive Summary

**IMPORTANT NOTE:** Investment Highlights Redesign was intended for **Dev testing first** and is **NOT expected in Production yet**. Issues #2, #3, and #4 below are **EXPECTED** since the redesign hasn't been deployed to Production.

Analysis of Production test logs reveals **5 issues**:

1. **Proximity API 401 Unauthorized** - Missing `userEmail` in early processing call ⚠️ **UNEXPECTED - NEEDS FIX**
2. **Extract Metadata 500 Internal Server Error** - GOOGLE_SHEETS_CREDENTIALS parsing failure ✅ **EXPECTED** (Redesign not in Prod)
3. **AI Generate Content 400 Bad Request** - Missing `rawText` for investmentHighlights type ✅ **EXPECTED** (Redesign not in Prod)
4. **Save to Google Sheet 400 Bad Request** - Likely validation error ✅ **EXPECTED** (Redesign not in Prod)
5. **GHL Address Check JSON Parse Error** - Make.com returning plain text instead of JSON ⚠️ **UNEXPECTED - NEEDS FIX**

---

## Issue 1: Proximity API 401 Unauthorized

### Error Details
```
POST https://property-packaging-form.vercel.app/api/geoapify/proximity 401 (Unauthorized)
```

### Root Cause
**Location:** `src/components/MultiStepForm.tsx` line 863

The early processing call for Proximity is missing the `userEmail` parameter:

```typescript
// CURRENT CODE (BROKEN):
body: JSON.stringify({ propertyAddress: address?.propertyAddress }),

// SHOULD BE:
body: JSON.stringify({ 
  propertyAddress: address?.propertyAddress,
  userEmail: userEmail 
}),
```

### Evidence from Logs
- Log shows: `🚀 Triggering early processing for Proximity & Why This Property...`
- Log shows: `📍 Starting Proximity processing...`
- API returns 401 immediately

### API Route Requirements
**File:** `src/app/api/geoapify/proximity/route.ts` lines 458-493

The API route requires `userEmail` and validates it:
```typescript
const { propertyAddress, latitude, longitude, userEmail } = body;

if (!userEmail) {
  return NextResponse.json(
    { success: false, error: 'User email is required' },
    { status: 401 }
  );
}
```

### Impact
- Proximity data cannot be pre-fetched
- User must manually trigger proximity lookup on Step 5
- Degrades user experience

### Related Issue
This matches the issue documented in `PROXIMITY-ANALYSIS-REQUEST.md` - the early processing call was not updated when security changes were made.

---

## Issue 2: Extract Metadata 500 Internal Server Error

### Error Details
```
POST https://property-packaging-form.vercel.app/api/investment-highlights/extract-metadata 500 (Internal Server Error)
PDF upload error: Error: Failed to parse GOOGLE_SHEETS_CREDENTIALS
```

### Root Cause
**Location:** `src/app/api/investment-highlights/extract-metadata/route.ts` lines 21-31

The route attempts to parse `GOOGLE_SHEETS_CREDENTIALS` environment variable but fails:

```typescript
const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
if (!credentialsJson) {
  throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
}

let credentials;
try {
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  throw new Error('Failed to parse GOOGLE_SHEETS_CREDENTIALS');
}
```

### Possible Causes
1. **Environment Variable Not Set in Production**
   - `GOOGLE_SHEETS_CREDENTIALS` may not be configured in Vercel
   - Or configured incorrectly (wrong format)

2. **JSON Parsing Failure**
   - Credentials may be double-encoded
   - May have extra quotes or escaping issues
   - May be missing entirely

3. **Format Mismatch**
   - Production may have different format than dev
   - May need the same parsing logic as `googleSheets.ts` (lines 78-99)

### Comparison with Working Code
**File:** `src/lib/googleSheets.ts` lines 78-99

The working code has more robust parsing:
```typescript
// Remove single quotes if present at start/end (from .env file)
credentialsJson = credentialsJson.trim();
if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
  credentialsJson = credentialsJson.slice(1, -1);
}
if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
  credentialsJson = credentialsJson.slice(1, -1);
}

// Parse JSON - handle multi-line format
let credentials;
try {
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  // If parsing fails, try to clean up newlines and parse again
  try {
    const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    credentials = JSON.parse(cleanedJson);
  } catch (parseError) {
    throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
  }
}
```

### Impact
- Cannot extract report name and valid period from PDF
- Investment Highlights workflow broken
- User cannot process hotspotting reports

### Retry Behavior
Logs show 3 retry attempts:
- `⏳ Retry 1/3 in 3s...`
- `⏳ Retry 2/3 in 6s...`
- All fail with same error

---

## Issue 3: AI Generate Content 400 Bad Request

### Error Details
```
POST https://property-packaging-form.vercel.app/api/ai/generate-content 400 (Bad Request)
AI formatting failed, using raw text. Error: {"error":"rawText is required for investmentHighlights type"}
```

### Root Cause
**Location:** `src/app/api/ai/generate-content/route.ts` lines 80-87

The API requires `rawText` for `investmentHighlights` type:

```typescript
if (type === 'investmentHighlights') {
  if (!rawText) {
    console.error('❌ Missing rawText for investmentHighlights');
    return NextResponse.json(
      { error: 'rawText is required for investmentHighlights type' },
      { status: 400 }
    );
  }
}
```

### Evidence from Logs
```
📝 Preparing AI request: {hasMainBody: false, mainBodyLength: undefined, suburb: 'Point Vernon', state: 'QLD'}
📤 Sending to AI: {type: 'investmentHighlights', rawTextLength: 0, hasRawText: false}
```

### Root Cause Analysis
The Investment Highlights component is calling the AI API without `rawText` because:
1. Extract metadata failed (Issue 2) - so `mainBody` is not available
2. Component is trying to format empty/invalid data
3. The call should not happen if `rawText` is not available

### Impact
- Investment Highlights cannot be auto-formatted
- Falls back to raw text (which is empty)
- User must manually format content

---

## Issue 4: Save to Google Sheet 400 Bad Request

### Error Details
```
POST https://property-packaging-form.vercel.app/api/investment-highlights/save 400 (Bad Request)
Failed to save to Google Sheet, but continuing...
```

### Root Cause
Likely validation error in the save endpoint. Need to check:
- What data is being sent?
- What validation is failing?
- Is it related to missing report name or valid period?

### Impact
- Investment Highlights not saved to repository
- Data not available for future use
- Manual entry required each time

---

## Issue 5: GHL Address Check JSON Parse Error

### Error Details
```
GHL check result: {success: true, exists: false, error: `Unexpected token 'A', "Accepted" is not valid JSON`}
```

### Root Cause
**Location:** `src/components/steps/Step0AddressAndRisk.tsx` lines 773-786

The Make.com webhook is returning plain text "Accepted" instead of JSON:

```typescript
const checkResponse = await fetch('/api/ghl/check-address', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ propertyAddress: verifiedAddress }),
});

// ...

const result = await response.json(); // FAILS HERE - response is "Accepted" not JSON
```

### API Route Code
**File:** `src/app/api/ghl/check-address/route.ts` lines 33-51

The route calls Make.com webhook and expects JSON:
```typescript
const response = await fetch(CHECK_ADDRESS_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ propertyAddress }),
});

if (!response.ok) {
  // ...
}

const result = await response.json(); // Make.com returns "Accepted" instead of JSON
```

### Make.com Webhook Issue
The Make.com scenario is likely:
1. Returning HTTP 200 with plain text "Accepted" instead of JSON
2. Or returning a non-JSON response format
3. Or the webhook is misconfigured

### Impact
- Address duplicate check fails silently
- Error logged but not shown to user
- System proceeds with folder creation (fail-open behavior)

---

## Additional Observations

### Excessive Component Re-renders
Logs show Investment Highlights component rendering 20+ times:
```
[InvestmentHighlights] Component render # 1
[InvestmentHighlights] Component render # 2
...
[InvestmentHighlights] Component render # 20
```

This suggests:
- State updates causing unnecessary re-renders
- Possible infinite loop or dependency issue
- Performance concern

### Step 2 Component Re-renders
Step 2 (Property Details) also shows excessive re-renders during data entry. This is normal for controlled inputs but worth monitoring.

---

## Priority Ranking

### Production Issues (Need Fixing Now)

1. **CRITICAL - Issue 1: Proximity API 401** ⚠️
   - Blocks early processing
   - User experience impact
   - Easy fix (add userEmail parameter)
   - **Status:** Unexpected Production issue - needs fixing

2. **MEDIUM - Issue 5: GHL Address Check** ⚠️
   - Fail-open behavior acceptable
   - Make.com webhook needs fixing
   - Not blocking workflow
   - **Status:** Unexpected Production issue - needs fixing

### Investment Highlights Issues (Expected - Not in Prod Yet)

3. **Issue 2: Extract Metadata 500** ✅
   - **Status:** EXPECTED - Investment Highlights Redesign not deployed to Production
   - Will be tested in Dev first
   - Fix needed when deploying to Production

4. **Issue 3: AI Generate Content 400** ✅
   - **Status:** EXPECTED - Investment Highlights Redesign not deployed to Production
   - Will be tested in Dev first
   - Fix needed when deploying to Production

5. **Issue 4: Save to Google Sheet 400** ✅
   - **Status:** EXPECTED - Investment Highlights Redesign not deployed to Production
   - Will be tested in Dev first
   - Fix needed when deploying to Production

---

## Recommended Fixes

### Fix 1: Add userEmail to Proximity Early Processing
**File:** `src/components/MultiStepForm.tsx` line 863

```typescript
const res = await fetch('/api/geoapify/proximity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    propertyAddress: address?.propertyAddress,
    userEmail: userEmail  // ADD THIS
  }),
});
```

### Fix 2: Use Robust Credentials Parsing
**File:** `src/app/api/investment-highlights/extract-metadata/route.ts` lines 21-31

Replace with the same parsing logic from `googleSheets.ts`:
```typescript
let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
if (!credentialsJson) {
  throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
}

// Remove quotes and handle multi-line format (same as googleSheets.ts)
credentialsJson = credentialsJson.trim();
if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
  credentialsJson = credentialsJson.slice(1, -1);
}
if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
  credentialsJson = credentialsJson.slice(1, -1);
}

let credentials;
try {
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  try {
    const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    credentials = JSON.parse(cleanedJson);
  } catch (parseError) {
    throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
  }
}
```

### Fix 3: Guard AI Call When rawText Unavailable
**File:** Investment Highlights component (need to locate exact file)

Add check before calling AI API:
```typescript
if (type === 'investmentHighlights' && !rawText) {
  // Don't call API, use raw text as-is
  return;
}
```

### Fix 4: Improve GHL Address Check Error Handling
**File:** `src/app/api/ghl/check-address/route.ts` lines 41-51

Add better error handling:
```typescript
if (!response.ok) {
  // ...
}

// Check if response is JSON before parsing
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await response.text();
  console.error('Make.com returned non-JSON:', text);
  return NextResponse.json({
    success: true,
    exists: false,
    error: 'Invalid response format from Make.com webhook',
  });
}

const result = await response.json();
```

---

## Testing Checklist

After fixes are applied, test:

- [ ] Proximity early processing works (no 401 error)
- [ ] PDF metadata extraction works (no 500 error)
- [ ] AI formatting only called when rawText available
- [ ] Investment Highlights saves to Google Sheet
- [ ] GHL address check handles non-JSON responses gracefully

---

## Comparison with Dev Environment

**Next Steps:**
1. Run same test in dev environment
2. Compare logs side-by-side
3. Identify differences
4. Determine if issues are:
   - Production-only (environment/config)
   - Code issues (affect both)
   - Dev-specific (different code version)

---

**Analysis Complete - Ready for Dev Test Comparison**
