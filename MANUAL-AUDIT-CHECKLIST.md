# Manual Audit Checklist - Make.com & GHL Verification

**Date:** 2026-01-XX  
**Purpose:** Manual verification of all webhook URLs and API tokens found in codebase  
**Status:** Ready for User Verification

---

## Instructions

For each item below:
1. Log into the source platform (Make.com or GHL)
2. Search for the URL/Token ID
3. Document what you find (active, deprecated, function, etc.)
4. Report back with findings

---

## Make.com Webhook URLs (7 Unique URLs)

### Item 1: `https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h`
**Source Platform:** Make.com  
**Found In Code:** `form-app/src/components/steps/Step6FolderCreation.tsx` (Line 265)  
**Action for User:** 
- Go to Make.com → Scenarios
- Search for webhook URL: `2xbtucntvnp3wfmkjk0ecuxj4q4c500h`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 2: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
**Source Platform:** Make.com  
**Found In Code:** 
- `form-app/src/components/steps/Step6FolderCreation.tsx` (Line 306)
- Multiple documentation files
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 3: `https://hook.eu1.make.com/u63eqhdemilc7wsaw3ub4mjxwbc6da75`
**Source Platform:** Make.com  
**Found In Code:** `form-app/src/app/api/ghl/check-address/route.ts` (Line 6)  
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `u63eqhdemilc7wsaw3ub4mjxwbc6da75`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 4: `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`
**Source Platform:** Make.com  
**Found In Code:** 
- `form-app/next.config.js` (Line 5 - fallback value)
- `form-app/src/lib/stash.ts` (Line 9 - fallback value)
- Multiple documentation files
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `gsova3xd6kwrckiw3j5js2twfgu1i885`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 5: `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`
**Source Platform:** Make.com  
**Found In Code:** 
- `code/MODULE-3-COMPLETE-FOR-MAKE.js` (Line 1771)
- `portal/index.html` (Line 510)
- Multiple documentation files
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `q85flukqhepku5rudd6bc1qbl9mqtlxk`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 6: `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
**Source Platform:** Make.com  
**Found In Code:** 
- `portal/index.html` (Line 509)
- Multiple documentation files
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `bkq23g13n4ae6spskdbwpru7hleol6sl`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is active, identify its function, determine if it needs environment variable

---

### Item 7: `https://hook.eu1.make.com/phqgvu4i3knw9p7y42i5d6dhyw54xbaci`
**Source Platform:** Make.com  
**Found In Code:** Documentation files only (not in active code)  
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `phqgvu4i3knw9p7y42i5d6dhyw54xbaci`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is still in use or deprecated

---

### Item 8: `https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt`
**Source Platform:** Make.com  
**Found In Code:** Documentation files only (not in active code)  
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `swugj2vzbspklynea8n1q0zh7dq2pztt`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is still in use or deprecated

---

### Item 9: `https://hook.eu1.make.com/fcjabbpzv88sya6twvn2pa8whalj2vei`
**Source Platform:** Make.com  
**Found In Code:** Documentation files only (not in active code)  
**Action for User:**
- Go to Make.com → Scenarios
- Search for webhook URL: `fcjabbpzv88sya6twvn2pa8whalj2vei`
- Identify which scenario uses this webhook
- Check if scenario is active or inactive
- Document the scenario name and purpose
**Goal:** Verify if this webhook is still in use or deprecated

---

## GHL API Bearer Token

### Item 10: `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
**Source Platform:** GHL (GoHighLevel)  
**Found In Code:** 
- Backup JSON files (`BLUEPRINT-BACKUP-*.json`)
- Multiple documentation files
- Currently used in Make.com scenarios (verified from screenshot)
**Action for User:**
- Go to GHL Dashboard → Settings → Integrations → API
- Check Personal Access Tokens / API Keys section
- Verify if token `pit-d375efb5-f445-458d-af06-3cbbb4b331dd` exists and is active
- Check creation date and expiration (if any)
- Verify permissions/scope of this token
- Check if there are other active tokens that should be used instead
**Goal:** Verify this is the correct active token, check if it needs rotation, confirm permissions

---

## Additional Items to Check in GHL

### Item 11: Location ID - `UJWYn4mrgGodB7KZUcHt`
**Source Platform:** GHL  
**Found In Code:** Multiple files (documentation and code)  
**Action for User:**
- Go to GHL Dashboard → Settings → Locations
- Verify Location ID matches: `UJWYn4mrgGodB7KZUcHt`
- Confirm this is the correct location
**Goal:** Verify Location ID is correct

---

### Item 12: Object ID - `692d04e3662599ed0c29edfa`
**Source Platform:** GHL  
**Found In Code:** Multiple files (documentation and code)  
**Action for User:**
- Go to GHL Dashboard → Settings → Custom Objects
- Find "Property Review" custom object
- Verify Object ID matches: `692d04e3662599ed0c29edfa`
- Confirm this is the correct custom object
**Goal:** Verify Object ID is correct

---

## Additional Items to Check in Make.com

### Item 13: All GHL API HTTP Modules
**Source Platform:** Make.com  
**Action for User:**
- Go through ALL Make.com scenarios
- For each scenario, check ALL HTTP modules that call GHL API
- Document:
  - Scenario name
  - Module number/name
  - Bearer token used in Authorization header
  - Location ID used
  - Object ID used
- Compare with token `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- Check if any modules use different tokens
**Goal:** Verify all Make.com scenarios use the correct GHL bearer token

---

### Item 14: All Webhook Modules
**Source Platform:** Make.com  
**Action for User:**
- Go through ALL Make.com scenarios
- For each scenario, check ALL Custom Webhook modules
- Document:
  - Scenario name
  - Webhook URL
  - Purpose/function
  - Whether it's active or inactive
- Compare with the 9 webhook URLs listed above
- Check if there are any additional webhook URLs not in the list
**Goal:** Complete inventory of all Make.com webhooks

---

## Notes

- Webhook URLs are not secrets (they're endpoints), but they should be consistent and documented
- Bearer tokens ARE secrets and must be protected
- Location IDs and Object IDs are not secrets, but should be verified for correctness
- Any discrepancies found should be documented for resolution

---

**Status:** Ready for manual verification  
**Next Step:** User performs manual audit and reports findings
