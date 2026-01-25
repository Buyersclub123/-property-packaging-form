# Master Environment Variable Mapping Table

**Date:** 2026-01-XX  
**Purpose:** Complete mapping of all hardcoded IDs, URLs, and tokens to environment variables  
**Status:** Ready for Implementation

---

## Summary

This document maps all hardcoded values found in the codebase to environment variables, grouped by service. Each entry shows:
- **Current Location**: Where the value is hardcoded
- **Proposed Env Var**: Suggested environment variable name
- **Client/Server**: Whether it needs `NEXT_PUBLIC_` prefix (client-side) or not (server-side)
- **Status**: Current state (hardcoded vs. already using env var)

---

## 1. GHL (GoHighLevel) Integration

| Value | Current Location | Proposed Env Var | Client/Server | Status | Notes |
|-------|-----------------|------------------|---------------|--------|-------|
| `pit-d375efb5-f445-458d-af06-3cbbb4b331dd` | Documentation only | `GHL_BEARER_TOKEN` | Server | ✅ Already migrated | Used in `submit-property/route.ts` |
| `UJWYn4mrgGodB7KZUcHt` | Multiple files | `GHL_LOCATION_ID` | Both | ✅ Already migrated | Server: `submit-property/route.ts`, Client: `Step6FolderCreation.tsx` |
| `692d04e3662599ed0c29edfa` | Multiple files | `GHL_OBJECT_ID` | Both | ✅ Already migrated | Server: `submit-property/route.ts`, Client: `Step6FolderCreation.tsx` |

**Client-side variables needed:**
- `NEXT_PUBLIC_GHL_LOCATION_ID`
- `NEXT_PUBLIC_GHL_OBJECT_ID`

**Server-side variables needed:**
- `GHL_BEARER_TOKEN`
- `GHL_LOCATION_ID`
- `GHL_OBJECT_ID`

---

## 2. Make.com Webhook URLs

| Webhook ID | Scenario Name | Current Location | Proposed Env Var | Client/Server | Status | Notes |
|------------|---------------|------------------|-------------------|---------------|--------|-------|
| `2xbtucntvnp3wfmkjk0ecuxj4q4c500h` | 02b Form App Property Submission | `Step6FolderCreation.tsx:265` | `NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION` | Client | ❌ Hardcoded | Creates record in Deal Sheet |
| `bkq23g13n4ae6qpkdbdwpnu7h1ac16d` | Property Form Code (not scenario) | `Step6FolderCreation.tsx:306` | `NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL` | Client | ❌ Hardcoded | Used for resending emails |
| `u63eqhdemilc7wsaw3ub4mjxwbc6da75` | 98 GHL Check Address | `check-address/route.ts:6` | `MAKE_WEBHOOK_CHECK_ADDRESS` | Server | ❌ Hardcoded | May not be needed, keep for reference |
| `gsova3xd6kwrckiw3j5js2twfgu1i885` | 01 Test Stashproperty AP | `next.config.js:5`, `stash.ts:9` | `NEXT_PUBLIC_STASH_WEBHOOK_URL` | Client | ⚠️ Partial | Has fallback, should be env var only |
| `q85flukqhepku5rudd6bc1qbl9mqtlxk` | 03 Property Review Approval | `portal/index.html:510`, `MODULE-3-COMPLETE-FOR-MAKE.js:1771` | `NEXT_PUBLIC_MAKE_WEBHOOK_APPROVAL` | Client | ❌ Hardcoded | Portal uses this |
| `bkq23g13n4ae6spskdbwpru7hleol6sl` | 02a GHL Property Review Submitted | `portal/index.html:509` | `NEXT_PUBLIC_MAKE_WEBHOOK_MODULE_1` | Client | ❌ Hardcoded | Portal uses this |
| `swugj2vzbspklynea8n1q0zh7dq2pztt` | PR Opportunity Pipeline (GHL) | Documentation only | `MAKE_WEBHOOK_PIPELINE_CHANGE` | Server | ❌ Not in code | Used in GHL custom workflows |
| `plrqpv4s5kxw9p7y425s6xhyn54xbxci` | PR Opportunity Update | Documentation only | `MAKE_WEBHOOK_OPPORTUNITY_UPDATE` | Server | ❌ Not in code | Used in GHL custom workflows |

**Client-side variables needed:**
- `NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION`
- `NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL`
- `NEXT_PUBLIC_STASH_WEBHOOK_URL` (already exists, remove fallback)
- `NEXT_PUBLIC_MAKE_WEBHOOK_APPROVAL`
- `NEXT_PUBLIC_MAKE_WEBHOOK_MODULE_1`

**Server-side variables needed:**
- `MAKE_WEBHOOK_CHECK_ADDRESS`
- `MAKE_WEBHOOK_PIPELINE_CHANGE` (for future GHL integration)
- `MAKE_WEBHOOK_OPPORTUNITY_UPDATE` (for future GHL integration)

---

## 3. Google Sheets IDs

| Sheet ID | Sheet Name | Current Location | Proposed Env Var | Client/Server | Status | Notes |
|----------|------------|------------------|-------------------|---------------|--------|-------|
| `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8` | Deal Sheet | Documentation only | `GOOGLE_SHEET_ID_DEAL_SHEET` | Server | ❌ Not in code | Used by Make.com scenarios |
| `1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ` | Property Review System - Admin | `sourcers/route.ts:4` | `GOOGLE_SHEET_ID_ADMIN` | Server | ❌ Hardcoded | Stores user emails for dropdowns |
| `1VkKVnxbcd1l33z9MrTBzdROskeyaMVV_MyVggiolj0U` | Property Review System Logs | Documentation only | `GOOGLE_SHEET_ID_LOGS` | Server | ❌ Not in code | Not fully set up |
| `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q` | Pipeline Stage changes | `portal/index.html:506` | `NEXT_PUBLIC_GOOGLE_SHEET_ID_OPPORTUNITIES` | Client | ❌ Hardcoded | Portal uses this |
| `1V2yc9mnFasfIc7mVqyE2xTA6QHUxMu9XBbk6FzBbQTM` | GHL Opportunities Test | Documentation only | `GOOGLE_SHEET_ID_OPPORTUNITIES_TEST` | Server | ❌ Not in code | Test sheet, may not be connected |
| `1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY` | Market Performance | `googleSheets.ts:6` | `GOOGLE_SHEET_ID_MARKET_PERFORMANCE` | Server | ❌ Hardcoded | Static data lookup |
| `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI` | Investment Highlights | `googleSheets.ts:11` | `GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS` | Server | ❌ Hardcoded | Static data lookup |

**Client-side variables needed:**
- `NEXT_PUBLIC_GOOGLE_SHEET_ID_OPPORTUNITIES`

**Server-side variables needed:**
- `GOOGLE_SHEET_ID_ADMIN`
- `GOOGLE_SHEET_ID_MARKET_PERFORMANCE`
- `GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS`
- `GOOGLE_SHEET_ID_DEAL_SHEET` (for Make.com reference)
- `GOOGLE_SHEET_ID_LOGS` (for future use)
- `GOOGLE_SHEET_ID_OPPORTUNITIES_TEST` (for testing)

---

## 4. Google Drive Folder IDs

| Folder ID | Folder Name | Current Location | Proposed Env Var | Client/Server | Status | Notes |
|-----------|-------------|------------------|-------------------|---------------|--------|-------|
| `0AFVxBPJiTmjPUk9PVA` | Shared Drive | `create-property-folder/route.ts:28` | `GOOGLE_DRIVE_SHARED_DRIVE_ID` | Server | ❌ Hardcoded | Main shared drive |
| `1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ` | Properties Folder | `create-property-folder/route.ts:34` | `GOOGLE_DRIVE_PROPERTIES_FOLDER_ID` | Server | ❌ Hardcoded | Where property folders are created |
| `1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5` | Master Template Folder | `create-property-folder/route.ts:31` | `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID` | Server | ❌ Hardcoded | Template to copy for new properties |

**Server-side variables needed:**
- `GOOGLE_DRIVE_SHARED_DRIVE_ID`
- `GOOGLE_DRIVE_PROPERTIES_FOLDER_ID`
- `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`

---

## 5. PSMA/Geoscape API

| API Endpoint | Purpose | Current Location | Proposed Env Var | Client/Server | Status | Notes |
|--------------|---------|------------------|-------------------|---------------|--------|-------|
| `https://api.psma.com.au/v2/addresses/geocoder` | Geocoding API | Multiple files (`geocoder.ts`, test files) | `PSMA_API_ENDPOINT` | Server | ❌ Hardcoded | Base URL only, auth header handled separately |
| Authorization header value | API Key | Make.com scenarios | `PSMA_API_KEY` | Server | ❌ Not in code | Stored in Make.com, needs env var if used directly |

**Server-side variables needed:**
- `PSMA_API_ENDPOINT` (optional - base URL)
- `PSMA_API_KEY` (if we need direct API access outside Make.com)

**Note:** Currently PSMA API is only called via Make.com webhook, so API key is managed in Make.com. Only need env vars if we add direct API calls.

---

## 7. Other Services

### Geoapify API
- **Status:** ✅ Already using `GEOAPIFY_API_KEY` environment variable
- **Location:** Various proximity test files

### Google Maps API
- **Status:** ✅ Already using `GOOGLE_MAPS_API_KEY` environment variable
- **Location:** Various files

### OpenAI API
- **Status:** ✅ Already using `OPENAI_API_KEY` environment variable
- **Location:** Proximity tool

### Google Sheets Credentials
- **Status:** ✅ Already using `GOOGLE_SHEETS_CREDENTIALS` environment variable
- **Location:** `googleSheets.ts`, `sourcers/route.ts`, `create-property-folder/route.ts`

---

## Implementation Priority

### Phase 1: Critical (Security Risk - Secrets)
1. ✅ GHL Bearer Token (already done)
2. ✅ GHL Location/Object IDs (already done)

### Phase 2: High Priority (Active Code)
1. Make.com webhook URLs in `Step6FolderCreation.tsx` (2 URLs)
2. Make.com webhook URL in `check-address/route.ts`
3. Google Sheets IDs in `googleSheets.ts` (2 IDs)
4. Google Sheets ID in `sourcers/route.ts`
5. Google Drive folder IDs in `create-property-folder/route.ts` (3 IDs)
6. Portal webhook URLs in `portal/index.html` (2 URLs)
7. Portal Google Sheet ID in `portal/index.html`

### Phase 3: Medium Priority (Fallback Values)
1. Remove fallback from `next.config.js` for `NEXT_PUBLIC_STASH_WEBHOOK_URL`
2. Remove fallback from `stash.ts` for `NEXT_PUBLIC_STASH_WEBHOOK_URL`

### Phase 4: Low Priority (Documentation/Reference)
1. Make.com webhooks used only in GHL custom workflows
2. Google Sheets IDs only in documentation

---

## Environment Variable Template

### Client-Side Variables (NEXT_PUBLIC_*)
```env
# Make.com Webhooks
NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION=https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h
NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL=https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d
NEXT_PUBLIC_STASH_WEBHOOK_URL=https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885
NEXT_PUBLIC_MAKE_WEBHOOK_APPROVAL=https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk
NEXT_PUBLIC_MAKE_WEBHOOK_MODULE_1=https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl

# GHL (Client-side)
NEXT_PUBLIC_GHL_LOCATION_ID=UJWYn4mrgGodB7KZUcHt
NEXT_PUBLIC_GHL_OBJECT_ID=692d04e3662599ed0c29edfa

# Google Sheets (Client-side)
NEXT_PUBLIC_GOOGLE_SHEET_ID_OPPORTUNITIES=1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q
```

### Server-Side Variables
```env
# GHL API
GHL_BEARER_TOKEN=pit-d375efb5-f445-458d-af06-3cbbb4b331dd
GHL_LOCATION_ID=UJWYn4mrgGodB7KZUcHt
GHL_OBJECT_ID=692d04e3662599ed0c29edfa

# Make.com Webhooks (Server-side)
MAKE_WEBHOOK_CHECK_ADDRESS=https://hook.eu1.make.com/u63eqhdemilc7wsaw3ub4mjxwbc6da75
MAKE_WEBHOOK_PIPELINE_CHANGE=https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt
MAKE_WEBHOOK_OPPORTUNITY_UPDATE=https://hook.eu1.make.com/plrqpv4s5kxw9p7y425s6xhyn54xbxci

# Google Sheets IDs
GOOGLE_SHEET_ID_ADMIN=1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ
GOOGLE_SHEET_ID_MARKET_PERFORMANCE=1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY
GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS=1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI
GOOGLE_SHEET_ID_DEAL_SHEET=1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8
GOOGLE_SHEET_ID_LOGS=1VkKVnxbcd1l33z9MrTBzdROskeyaMVV_MyVggiolj0U
GOOGLE_SHEET_ID_OPPORTUNITIES_TEST=1V2yc9mnFasfIc7mVqyE2xTA6QHUxMu9XBbk6FzBbQTM

# Google Drive Folder IDs
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AFVxBPJiTmjPUk9PVA
GOOGLE_DRIVE_PROPERTIES_FOLDER_ID=1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ
GOOGLE_DRIVE_TEMPLATE_FOLDER_ID=1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5

# PSMA/Geoscape API (if needed for direct calls)
PSMA_API_ENDPOINT=https://api.psma.com.au/v2/addresses/geocoder
PSMA_API_KEY=YOUR_PSMA_API_KEY_HERE
```

---

## Files Requiring Updates

### Form App (Next.js)
1. `form-app/src/components/steps/Step6FolderCreation.tsx` - 2 webhook URLs
2. `form-app/src/app/api/ghl/check-address/route.ts` - 1 webhook URL
3. `form-app/src/lib/googleSheets.ts` - 2 sheet IDs
4. `form-app/src/app/api/sourcers/route.ts` - 1 sheet ID
5. `form-app/src/app/api/create-property-folder/route.ts` - 3 folder IDs
6. `form-app/src/lib/stash.ts` - Remove fallback for webhook URL
7. `form-app/next.config.js` - Remove fallback for webhook URL

### Portal (Static HTML) - ⚠️ REQUIRES API PROXY
1. `portal/index.html` - 2 webhook URLs, 1 sheet ID
   - **Status:** NOT MODIFIED - Flagged as requiring API proxy solution
   - **Reason:** Cannot put secrets/URLs in public HTML files (they would be exposed to browser)
   - **Hardcoded values found:**
     - Line 506: `GOOGLE_SHEET_ID = '1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q'`
     - Line 509: `MODULE_1_WEBHOOK = 'https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl'`
     - Line 510: `NON_SUITABLE_WEBHOOK = 'https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk'`
   - **Recommended Solution:** Create Next.js API proxy routes to handle these calls server-side, then update portal HTML to call the proxy endpoints instead

### Legacy Code (Make.com Module Reference)
1. `code/MODULE-3-COMPLETE-FOR-MAKE.js` - 1 webhook URL
   - **Status:** NOT MODIFIED - Reference code only
   - **Reason:** This is Make.com module code stored for reference, not executed by Next.js server
   - **Note:** Webhook URL should be configured in Make.com scenario settings, not in this file
   - **Hardcoded value:** Line 1771: `APPROVAL_WEBHOOK = "https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk"`

---

## Notes

1. **Webhook URLs are not secrets** - They're endpoints, but should still be in env vars for consistency and easy updates
2. **Bearer tokens ARE secrets** - Must be protected (already done for GHL)
3. **Sheet IDs and Folder IDs are not secrets** - But should be in env vars for maintainability
4. **Portal (`portal/index.html`)** - Static HTML file, will need to inject env vars at build time or use a config file
5. **Legacy code** - `MODULE-3-COMPLETE-FOR-MAKE.js` may not be actively used, verify before updating

---

**Next Step:** Review this mapping table, then proceed with Phase 2 implementation (updating code to use environment variables).
