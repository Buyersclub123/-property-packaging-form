# Known Issues

**Last Updated:** 2026-02-02  
**Status:** Active tracking of known bugs and issues

---

## Issue #1: New Portal Sends Both `id` and `recordId` Fields

**Status:** 🔴 Under Investigation  
**Priority:** High  
**Date Reported:** 2026-02-02  
**Updated:** 2026-02-02 - Analysis completed, resolution pending full review

### Description
The new portal (`form-app/public/portal/index.html`) sends both `id` and `recordId` fields in the payload to Make.com Scenario 02a, while the old portal (that worked before Christmas) only sent `id`.

### Current Behavior
- **New Portal Payload:**
  ```json
  {
    "source": "portal",
    "id": "697f607ce97e948260a9db77",
    "recordId": "697f607ce97e948260a9db77",  // ← Extra field
    "propertyId": "...",
    "propertyAddress": "...",
    ...
  }
  ```

- **Old Portal Payload (Working):**
  ```json
  {
    "source": "portal",
    "id": "697f607ce97e948260a9db77",  // ← Only this field
    "propertyId": "...",
    "propertyAddress": "...",
    ...
  }
  ```

### Impact
- Portal requests may not be processed correctly by Module 2a in Scenario 02a
- Module 2a may be filtering out portal requests due to unexpected payload structure

### Location
- **File:** `form-app/public/portal/index.html`
- **Lines:** 1555-1556

---

## ⚠️ ANALYSIS SECTION (Preliminary - Do Not Implement Yet)

**Note:** This analysis is preliminary. All identified resolutions must be revisited once all analysis is completed.

### Analysis: Portal Payload Structure

**Code Location:** `form-app/public/portal/index.html` lines 1553-1565

**Current Portal Payload:**
```javascript
const payload = {
  source: "portal",
  id: propertyInfo.recordId, // Property record ID (as Module 2a expects)
  recordId: propertyInfo.recordId, // Property record ID for Module 13 to fetch GHL property data
  propertyId: propertyInfo.propertyId,
  propertyAddress: propertyInfo.propertyAddress,
  baEmail: baIdentifier,
  baName: currentBAFilter || baIdentifier,
  sendFromEmail: sendFromEmail,
  selectedClients: selectedClients,
  action: action,
  timestamp: new Date().toISOString()
};
```

**Old Portal Payload (from `portal/index.html` line 1418):**
```javascript
const payload = {
  source: "portal",
  id: propertyInfo.recordId,  // Only this field
  propertyId: propertyInfo.propertyId,
  propertyAddress: propertyInfo.propertyAddress,
  baEmail: baIdentifier,
  baName: currentBAFilter || baIdentifier,
  sendFromEmail: sendFromEmail,
  selectedClients: selectedClients,
  action: action,
  timestamp: new Date().toISOString()
};
```

**Difference:**
- New portal sends: `id` AND `recordId` (both with same value)
- Old portal sent: `id` only

**Identified Resolution (Preliminary - Do Not Implement Yet):**
- Remove line 1556: `recordId: propertyInfo.recordId,` to match old portal exactly
- **Note:** Need to verify if Module 13 (Get Record) requires `recordId` field. If Module 13 uses `id` instead, removing `recordId` should be safe.

### Analysis: Module 3 in Scenario 02a

**Status:** ✅ Already Updated Correctly

**Code Location:** Module 3, Scenario 02a (Email Template Builder)

**Findings:**
1. ✅ Portal URL: Uses new URL `https://property-packaging-form.vercel.app/portal` (line 1771)
2. ✅ Review URL Construction: Includes all required parameters:
   - `webhookUrl` (Scenario 5 webhook)
   - `module1Webhook` (Scenario 02a webhook: `bkq23g13n4ae6spskdbwpru7hleol6sl`)
   - `apiUrl` (`https://property-review-form.vercel.app`)
   - `recordId`
   - `propertyId`
   - `propertyAddress`

**Conclusion:** Module 3 in Scenario 02a is correctly configured for the new portal. No changes needed.

### Analysis: Portal Code (Production)

**File:** `form-app/public/portal/index.html`  
**Status:** ✅ In Production (deployed to Vercel)

**How Portal Works:**

1. **URL Parameter Extraction (Lines 569-577):**
   ```javascript
   function getURLParams() {
     const params = new URLSearchParams(window.location.search);
     return {
       recordId: params.get('recordId') || '',
       propertyId: params.get('propertyId') || '',
       propertyAddress: params.get('propertyAddress') || '',
       baEmail: params.get('baEmail') || ''
     };
   }
   ```
   - Portal extracts `recordId`, `propertyId`, `propertyAddress`, `baEmail` from URL query parameters

2. **Property Info Storage (Lines 592-598):**
   ```javascript
   function updatePropertyInfo() {
     const params = getURLParams();
     propertyInfo = params;  // Stores all URL params in propertyInfo object
     baEmail = params.baEmail || '';
     // ...
   }
   ```
   - URL parameters stored in `propertyInfo` object
   - `propertyInfo.recordId` contains the record ID from URL

3. **Webhook URL Configuration (Lines 535-545):**
   ```javascript
   function getModule1Webhook() {
     const params = new URLSearchParams(window.location.search);
     const urlParam = params.get('module1Webhook');
     if (urlParam) return urlParam;
     // ...
   }
   ```
   - Portal gets `module1Webhook` from URL parameter (not hardcoded)
   - This is the Scenario 02a webhook URL

4. **Payload Construction (Lines 1553-1565):**
   ```javascript
   const payload = {
     source: "portal",
     id: propertyInfo.recordId, // Property record ID (as Module 2a expects)
     recordId: propertyInfo.recordId, // Property record ID for Module 13 to fetch GHL property data
     propertyId: propertyInfo.propertyId,
     propertyAddress: propertyInfo.propertyAddress,
     baEmail: baIdentifier,
     baName: currentBAFilter || baIdentifier,
     sendFromEmail: sendFromEmail,
     selectedClients: selectedClients,
     action: action,
     timestamp: new Date().toISOString()
   };
   ```
   - Portal sends both `id` and `recordId` with same value (`propertyInfo.recordId`)
   - Comment on line 1556 says: "Property record ID for Module 13 to fetch GHL property data"
   - This suggests `recordId` was intentionally added for Module 13

5. **Sending to Make.com (Lines 1577-1581):**
   ```javascript
   const response = await fetch(getModule1Webhook(), {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
   });
   ```
   - Sends payload to `module1Webhook` URL (Scenario 02a webhook)

**Key Observations:**
- Portal requires `recordId` in URL parameters to function
- Portal sends `id` field (required by Module 2a)
- Portal also sends `recordId` field (comment suggests for Module 13)
- Old portal only sent `id`, not `recordId`

**Verified:** Module 13 (Get Record) in Scenario 02a uses `{{1.id}}` in the URL path to fetch the GHL record. The blueprint shows:
- Module 13 URL: `https://services.leadconnectorhq.com/objects/.../records/{{1.id}}`
- Filter: "Has ID" checks if `{{1.id}}` exists
- **Conclusion:** Module 13 uses `id` field, NOT `recordId`. The portal comment saying `recordId` is "for Module 13" is incorrect.

---

### Resolution Applied

**Change Made:** Removed `recordId` field from portal payload (line 1556)

**File Changed:** `form-app/public/portal/index.html`

**Deployment:**
- Portal is part of form-app, deployed via Vercel
- Location: `form-app/public/portal/index.html`
- Deploy URL: `https://property-packaging-form.vercel.app/portal`
- **Note:** Manual deployment required (auto-deploy is disabled)

### Testing (After Deployment)
- [ ] Test portal submission with Scenario 02a
- [ ] Verify Module 13 (Get Record) still works with only `id` field
- [ ] Confirm emails are sent successfully
- [ ] Verify property details appear correctly in client emails

---

## Issue #2: Deal Sheet Portal Links Not Working

**Status:** 🔴 Under Investigation  
**Priority:** High  
**Date Reported:** 2026-02-02  
**Updated:** 2026-02-02 - Analysis completed, resolution pending full review

### Description
Portal links in the Deal Sheet Property Address column are not working. This affects multiple properties, including the test record. Links may exist but don't open the portal correctly, or links may be missing entirely.

### Current Behavior
- Portal links in Deal Sheet either don't work or are missing
- When clicked, links may not open portal correctly
- Some properties have links, some don't

### Location
- **Make.com Scenario:** Scenario 3 "Property Review Approval Webhook"
- **Module:** Module 18 (Make Code - Field mapping and formatting)
- **Deal Sheet:** `1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8`
- **Column:** Property Address (HYPERLINK formula)

---

## ⚠️ ANALYSIS SECTION (Preliminary - Do Not Implement Yet)

**Note:** This analysis is preliminary. All identified resolutions must be revisited once all analysis is completed.

### Analysis: Module 18 Code Review

**Code Location:** Lines 48-49 in Module 18

**Current Code:**
```javascript
let propertyAddressLink = propertyAddress;  // Line 48: Outer variable initialized
if (recordId && propertyAddress) {
  const encodedAddress = encodeURIComponent(propertyAddress);
  const encodedWebhookUrl = encodeURIComponent(WEBHOOK_URL);
  const encodedModule1Webhook = encodeURIComponent(MODULE_1_WEBHOOK);
  const encodedApiUrl = encodeURIComponent(API_URL);
  const portalUrl = `https://property-packaging-form.vercel.app/portal?webhookUrl=${encodedWebhookUrl}&module1Webhook=${encodedModule1Webhook}&apiUrl=${encodedApiUrl}&recordId=${encodeURIComponent(recordId)}&propertyId=${encodedAddress}&propertyAddress=${encodedAddress}`;
  const propertyAddressLink = `=HYPERLINK("${portalUrl}", "${propertyAddress}")`;  // Line 49: BUG - creates new variable
}
```

**Findings:**

1. ✅ **Portal URL Format:** CORRECT
   - Uses new portal URL: `https://property-packaging-form.vercel.app/portal`
   - Includes all required parameters: `webhookUrl`, `module1Webhook`, `apiUrl`, `recordId`, `propertyId`, `propertyAddress`
   - URL encoding is correct

2. ✅ **Webhook URLs:** CORRECT
   - `WEBHOOK_URL = 'https://hook.eu1.make.com/g9pcjs2imabfea3viiy6213ejgrdprn1'` (Scenario 5)
   - `MODULE_1_WEBHOOK = 'https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl'` (Scenario 02a)
   - `API_URL = 'https://property-review-form.vercel.app'`

3. ❌ **Variable Scoping Bug:** IDENTIFIED
   - **Problem:** Line 49 uses `const propertyAddressLink = ...` which creates a NEW variable that shadows the outer `let propertyAddressLink` from line 48
   - **Impact:** The HYPERLINK formula is never assigned to the outer variable that gets returned
   - **Result:** The return statement uses the outer variable, which remains as plain text (`propertyAddress`) instead of the HYPERLINK formula

**Identified Resolution (Preliminary - Do Not Implement Yet):**
- Change line 49 from `const propertyAddressLink = ...` to `propertyAddressLink = ...` (remove `const` to update the outer variable)

---

### Impact
- Users cannot access portal from Deal Sheet
- Portal links are broken or missing
- Workflow disruption

### Testing (After Resolution)
- [ ] Fix variable scoping bug in Module 18
- [ ] Test portal link generation for new properties
- [ ] Verify links open portal correctly
- [ ] Test with multiple properties
- [ ] Update existing Deal Sheet entries if needed

---

## Issue Tracking

### Status Legend
- 🔴 **Under Investigation** - Issue identified, root cause being investigated
- 🟡 **Fix In Progress** - Root cause identified, fix being implemented
- 🟢 **Resolved** - Fix implemented and verified
- ⚪ **Won't Fix** - Issue acknowledged but not planned for fix

### Priority Levels
- **High** - Blocks core functionality or affects production users
- **Medium** - Impacts workflow but has workarounds
- **Low** - Minor inconvenience or edge case

---

## Notes

- Issues are added as they are discovered
- Each issue should be updated with investigation findings and resolution steps
- When an issue is resolved, move it to a "Resolved Issues" section or mark as resolved with date
