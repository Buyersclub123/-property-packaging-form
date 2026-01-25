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
Verified: Name: 02b Form App Property Submission to GHL once approved, this is working. This ceates the record in the Deal Sheet
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
THIS CODE I BEKIEVE IS IN THE PROPRTY FORM CODE WHICH IS NOT A SCENARIO BUT IS IMPORTANT
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
VERIFIED NAME: 98 GHL Check Address Webhook, I dont think this is needed but will keep in cse we wsnt to reuse or learn from
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
VERIFIED NAME = 01 Test Stashproperty AP, this is used and is working. This checks Stash and GeoScape info
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
VERIED: Name: 03 Property Review Approval Webhook, this is working
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
VERIFIED: Name: 02a GHL Property Review Submitted approval & email processing, this is working. This gets aproval  for property to be written to GHL and the processes emails
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
Could not see it so no
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
Could not see it so no
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
THIS IS DELETED AS NOT BEING USED
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
WE SHOULD ROTATE WHEN READY its called New GHL/Make.com Privste Itegratio
There is 2nd connection which I Dont think we use anymore which has a key ending *e554 called Pipeline and pipeline stag

## Additional Items to Check in GHL

### Item 11: Location ID - `UJWYn4mrgGodB7KZUcHt`
**Source Platform:** GHL  
**Found In Code:** Multiple files (documentation and code)  
**Action for User:**
- Go to GHL Dashboard → Settings → Locations
- Verify Location ID matches: `UJWYn4mrgGodB7KZUcHt`
- Confirm this is the correct location
**Goal:** Verify Location ID is correct
VERIFIED AS CORRECT
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
VERIFIED AS CORRECT
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
 02a GHL Property Review Submitted approval & email processing - uses '4b331dd
02b Form App Property Submission to GHL once approved - uses the same in 4 HTTP modules---
03 Property Review Approval Webhook uses it
98 GHL Check Address Webhook uses it (despite not being used)
99 Stash Integration not currently being used is bit of a test bed uses iksnt configred to connect

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
For scenario "01 Test Stashproperty AP" this calls Stash and I want to say GeoScape but the URL says this https://api.psma.com.au/v2/addresses/geocoder?address=https://api.psma.com.au/v2/addresses/geocoder?address= - Stashhas password / username, API, PSMA has authorisatiopn header with value that looks like a string
04 Opportunity SNAPSHOT does not have an HTTP module, this logged in with user password hich is hidden from the code / settings
04 Realtime opportunity tracker- this does not use HTTP module. google sheets use user password which is hidden from code / settings

## Notes

- Webhook URLs are not secrets (they're endpoints), but they should be consistent and documented
- Bearer tokens ARE secrets and must be protected
- Location IDs and Object IDs are not secrets, but should be verified for correctness
- Any discrepancies found should be documented for resolution

---

**Status:** Ready for manual verification  
**Next Step:** User performs manual audit and reports findings


ADDITIONALLY IN GHL THERE Are custom workflows: 
PR  - Opportunity Pipeline stage change capture - using https://hooks.zapier.com/hooks/catch/15778686/ufcdq5p/
PR - Opportunity Pipeline stage change capture Make - using https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt
PR Opportunity update Make.com - using https://hook.eu1.make.com/plrqpv4s5kxw9p7y425s6xhyn54xbxci

SADDTIONALY GOOGLE SHEETS
https://docs.google.com/spreadsheets/d/1qiQpeyBVBwMa4rDmGNbCR2bSTylTAldu2fgsh5uqjX8/edit?gid=0#gid=0 - This is the new deal sheet named "Deal Sheet" 
https://docs.google.com/spreadsheets/d/1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ/edit?gid=0#gid=0 - this the admin sheet where we can store users emails with friendly name for use in dropdowns named "Property Review System - Admin"
https://docs.google.com/spreadsheets/d/1VkKVnxbcd1l33z9MrTBzdROskeyaMVV_MyVggiolj0U/edit?pli=1&gid=0#gid=0 - this is a log to capture what the form send to be pproved / GHL - I dont think we completed it ie set it up named "Property Review System Logs"
https://docs.google.com/spreadsheets/d/1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q/edit?gid=0#gid=0 - this is to capture the pipeline stage changes for the suitsle clients portsal we may habve freated more than one so we had one for testing, is this is wired to the client select portl its live (I know it works) named "Pipeline Stage changes via Make.com"
https://docs.google.com/spreadsheets/d/1V2yc9mnFasfIc7mVqyE2xTA6QHUxMu9XBbk6FzBbQTM/edit?gid=0#gid=0 - this is the test opportunity list mentioned immediately above, not sure if this is plugged into the client select portal or not named "GHL Opportunities Test"
https://docs.google.com/spreadsheets/d/1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY/edit?gid=0#gid=0- this is for storing the msrket performance - named "Property Review Static Data - Market Performance"
https://docs.google.com/spreadsheets/d/1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI/edit?gid=0#gid=0this is for storing investment highlights named "Property Review Static Data - Investment Highlights"not really finisged finessing this

https://drive.google.com/drive/u/1/folders/0AFVxBPJiTmjPUk9PVA is a shard Google Drive wihtin which we have a folder "https://drive.google.com/drive/u/1/folders/1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ" Properties within wich we have a template folder https://drive.google.com/drive/u/1/folders/1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5 which has he 2 Googlesheets for cashflow, its this folder that is needed to be copied, renamed, and have the google sheets written to

IN THE CAHFLOWSPREADSHEETS COULD BE API details - if tghere are youy need to tell me how to get them
