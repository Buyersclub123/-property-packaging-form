# Security Audit Plan - Credentials & Configuration Review

**Date:** 2026-01-XX  
**Purpose:** Comprehensive audit of all credentials, API keys, webhooks, and configurations across all systems  
**Status:** DRAFT - Awaiting Approval

---

## 🎯 Objective

Identify all credentials, API keys, webhooks, and configuration values across:
- Git repository (check for exposed credentials in history)
- Make.com scenarios (all webhooks, API keys, tokens)
- GHL workflows (webhook URLs, location IDs, bearer tokens)
- Vercel environment variables (all API keys and secrets)
- Google APIs (Sheets, Maps, Drive credentials)
- Other external services

---

## Phase 1: Git History Audit

### 1.1 Check Git History for Exposed Credentials
**Action:** Search Git commit history for hardcoded credentials

**Check for:**
- `pit-090b5645-cb9e-47b0-a729-4d6ded3b0c04` (old GHL bearer token)
- `pit-d375efb5-f445-458d-af06-3cbbb4b331dd` (current GHL bearer token)
- `pit-15ce...e554` (second GHL bearer token)
- Any other `pit-` tokens
- Google API keys
- Vercel API tokens
- Other API keys/tokens

**Commands to run:**
```bash
# Search Git history for old bearer token
git log -p --all -S "pit-090b5645-cb9e-47b0-a729-4d6ded3b0c04"

# Search for any pit- tokens
git log -p --all -S "pit-"

# Search for API keys
git log -p --all -S "API_KEY" | grep -E "(pit-|sk-|AIza|ghp_)"
```

**Outcome:** 
- List all commits that exposed credentials
- Determine if credentials need rotation
- Document which credentials were exposed

---

## Phase 2: Make.com Scenarios Audit

### 2.1 List All Make.com Scenarios
**Action:** Document all active Make.com scenarios and their configurations

**Scenarios to audit:**
1. **GHL Property Review Submitted** (Main scenario)
   - Webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
   - Check all HTTP modules for:
     - GHL API bearer tokens
     - Location IDs
     - Object IDs
     - Other API keys

2. **Property Review Approval Webhook - by Ahmad**
   - Webhook URL: Check in Make.com
   - Check GHL API calls for bearer tokens

3. **Test Stashproperty AP**
   - Webhook URL: Check in Make.com
   - Check Stash API credentials
   - Check Geoscape API keys

4. **Other scenarios** (list all active scenarios)

**For each scenario, document:**
- Webhook URLs (incoming)
- HTTP request URLs (outgoing)
- Bearer tokens / API keys in headers
- Location IDs / Object IDs
- Any hardcoded credentials

---

## Phase 3: GHL Workflows Audit

### 3.1 List All GHL Workflows
**Action:** Document all GHL workflows that send webhooks to Make.com

**Workflows to audit:**
1. **PR → Property Review Created**
   - Webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d`
   - Check: Is this URL correct? Is it active?

2. **PR Opportunity update Make.com**
   - Webhook URL: `https://hook.eu1.make.com/phqgvu4i3knw9p7y42i5d6dhyw54xbaci`
   - Check: Is this URL correct? Is it active?

3. **PR - Opportunity Pipeline stage change capture Make**
   - Webhook URL: `https://hook.eu1.make.com/swugj2vzbspklynea8n1q0zh7dq2pztt`
   - Check: Is this URL correct? Is it active?

**For each workflow, verify:**
- Webhook URL matches Make.com scenario
- Workflow is active
- Triggers are correct

---

## Phase 4: GHL API Configuration Audit

### 4.1 Check All GHL API Configurations
**Action:** Verify GHL API credentials across all systems

**Check in:**
- Make.com scenarios (HTTP modules)
- Form app code (now uses env vars - verify correct)
- Vercel environment variables
- `.env.local` file

**Values to verify:**
- **Bearer Token:** `pit-d375efb5-f445-458d-af06-3cbbb4b331dd` (current)
- **Old Bearer Token:** `pit-090b5645-cb9e-47b0-a729-4d6ded3b0c04` (check if still active)
- **Location ID:** `UJWYn4mrgGodB7KZUcHt`
- **Object ID:** `692d04e3662599ed0c29edfa`
- **API Version:** `2021-07-28`

**Actions:**
1. Check GHL dashboard - verify which bearer tokens are active
2. If old token (`pit-090b5645...`) is still active, decide: revoke or keep?
3. Verify all systems use the correct current token
4. Document any discrepancies

---

## Phase 5: Vercel Environment Variables Audit

### 5.1 List All Vercel Environment Variables
**Action:** Check Vercel dashboard for all environment variables

**Project:** `property-packaging-form`  
**Team:** `HCICkgEtqpNH4cacsrTLXLC9`  
**Dashboard:** https://vercel.com/team_HCICkgEtqpNH4cacsrTLXLC9/property-packaging-form/settings/environment-variables

**Variables to check:**
- `GOOGLE_SHEETS_CREDENTIALS` ✅ (already exists)
- `GEOAPIFY_API_KEY` ✅ (already exists)
- `NEXT_PUBLIC_GEOSCAPE_API_KEY` ✅ (already exists)
- `GOOGLE_MAPS_API_KEY` ⚠️ (needs verification)
- `OPENAI_API_KEY` ⚠️ (needs verification)
- `GHL_BEARER_TOKEN` ❌ (missing - needs to be added)
- `GHL_LOCATION_ID` ❌ (missing - needs to be added)
- `GHL_OBJECT_ID` ❌ (missing - needs to be added)
- `NEXT_PUBLIC_GHL_LOCATION_ID` ❌ (missing - needs to be added)
- `NEXT_PUBLIC_GHL_OBJECT_ID` ❌ (missing - needs to be added)
- `VERCEL_API_TOKEN` ⚠️ (check if exists)
- `NEXT_PUBLIC_STASH_WEBHOOK_URL` ⚠️ (check if exists)

**For each variable:**
- Check if it exists in Production
- Check if it exists in Preview
- Check if it exists in Development
- Verify value matches `.env.local`
- Document any missing variables

---

## Phase 6: Google APIs Audit

### 6.1 Google Sheets API
**Action:** Verify Google Sheets credentials

**Check:**
- Service account credentials in `.env.local`
- Service account credentials in Vercel
- Service account email
- Permissions/access

**Values:**
- `GOOGLE_SHEETS_CREDENTIALS` (JSON string)

### 6.2 Google Maps API
**Action:** Verify Google Maps API key

**Check:**
- API key in `.env.local`
- API key in Vercel
- API restrictions (domains, IPs)
- Usage/quota limits

**Values:**
- `GOOGLE_MAPS_API_KEY`

### 6.3 Google Drive API
**Action:** Verify Google Drive access (uses same credentials as Sheets)

**Check:**
- Same as Google Sheets (shared service account)
- Drive folder permissions
- Template folder IDs

---

## Phase 7: Other External APIs Audit

### 7.1 Geoapify API
**Action:** Verify Geoapify API key

**Check:**
- API key in `.env.local`
- API key in Vercel
- Usage/quota

**Values:**
- `GEOAPIFY_API_KEY`

### 7.2 Geoscape API
**Action:** Verify Geoscape API key

**Check:**
- API key in `.env.local`
- API key in Vercel
- Authorization header format

**Values:**
- `NEXT_PUBLIC_GEOSCAPE_API_KEY`

### 7.3 OpenAI API (ChatGPT)
**Action:** Verify OpenAI API key

**Check:**
- API key in `.env.local`
- API key in Vercel
- Usage/quota

**Values:**
- `OPENAI_API_KEY`

### 7.4 Stashproperty API
**Action:** Verify Stashproperty webhook/API

**Check:**
- Webhook URL in Make.com
- Webhook URL in `.env.local` / Vercel
- Login credentials (if used)

**Values:**
- `NEXT_PUBLIC_STASH_WEBHOOK_URL`
- Stash login credentials (if hardcoded in Make.com)

---

## Phase 8: Code Audit

### 8.1 Check Code for Hardcoded Credentials
**Action:** Search all code files for hardcoded credentials

**Search for patterns:**
- `pit-` (GHL bearer tokens)
- `sk-` (OpenAI keys)
- `AIza` (Google API keys)
- `ghp_` (GitHub tokens)
- `Authorization: Bearer` (any hardcoded tokens)
- `UJWYn4mrgGodB7KZUcHt` (location ID)
- `692d04e3662599ed0c29edfa` (object ID)

**Files to check:**
- All `.ts` / `.tsx` files in `form-app/src`
- All `.js` files in `code/`
- All `.json` files (blueprint backups)
- Configuration files

**Outcome:**
- List all files with hardcoded credentials
- Replace with environment variables
- Update documentation

---

## Phase 9: Documentation Audit

### 9.1 Update Documentation with Correct Values
**Action:** Ensure all documentation reflects current, correct values

**Files to update:**
- `CONFIG.md` ✅ (already updated)
- `README.md` ✅ (already updated)
- `STATUS.md` ✅ (already updated)
- `HANDOVER-COMPLETE-2026-01-15.md` ✅ (already updated)
- All other docs with credentials

**Check:**
- Bearer tokens match current active token
- Location IDs are correct
- Object IDs are correct
- Webhook URLs are correct
- Remove outdated credentials

---

## Phase 10: Security Actions

### 10.1 Credential Rotation (if needed)
**Action:** Rotate credentials that were exposed in Git

**If old bearer token (`pit-090b5645...`) was exposed:**
1. Check if it's still active in GHL
2. If active, decide: revoke or keep?
3. If revoking, create new token in GHL
4. Update all systems with new token
5. Document rotation date

### 10.2 Remove Exposed Credentials from Git History
**Action:** Clean Git history if credentials were exposed

**Options:**
- Use `git filter-branch` or `git filter-repo`
- Consider if repository is public/private
- May require force push (coordinate with team)

**⚠️ WARNING:** This rewrites Git history - coordinate before doing this

---

## Phase 11: Verification & Testing

### 11.1 Verify All Systems Work
**Action:** Test each system after updates

**Test:**
1. Form app local dev (uses `.env.local`)
2. Form app production (uses Vercel env vars)
3. Make.com scenarios (test webhooks)
4. GHL workflows (test triggers)
5. Google Sheets integration
6. Google Maps integration
7. All API integrations

### 11.2 Document Final State
**Action:** Create final documentation of all credentials

**Create:**
- Master credentials list (stored securely, not in Git)
- Environment variables checklist
- Webhook URLs list
- API keys list (without actual values)

---

## 📋 Execution Checklist

- [ ] Phase 1: Git History Audit
- [ ] Phase 2: Make.com Scenarios Audit
- [ ] Phase 3: GHL Workflows Audit
- [ ] Phase 4: GHL API Configuration Audit
- [ ] Phase 5: Vercel Environment Variables Audit
- [ ] Phase 6: Google APIs Audit
- [ ] Phase 7: Other External APIs Audit
- [ ] Phase 8: Code Audit
- [ ] Phase 9: Documentation Audit
- [ ] Phase 10: Security Actions (if needed)
- [ ] Phase 11: Verification & Testing

---

## 🎯 Expected Outcomes

1. **Complete inventory** of all credentials, API keys, webhooks
2. **Security assessment** of exposed credentials
3. **Action plan** for credential rotation (if needed)
4. **Updated documentation** with correct values
5. **Verified working state** of all systems
6. **Best practices** implemented (no hardcoded credentials)

---

## ⚠️ Important Notes

- **Do NOT commit credentials** to Git going forward
- **Use environment variables** for all credentials
- **Document webhook URLs** (these are not secrets, but need to be correct)
- **Location IDs and Object IDs** are not secrets, but should be consistent
- **Bearer tokens** are secrets - must be protected
- **API keys** are secrets - must be protected

---

**Status:** Ready for review  
**Next Step:** Get approval to proceed with audit
