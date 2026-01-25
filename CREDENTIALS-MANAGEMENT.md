# Credentials Management Guide

## ⚠️ IMPORTANT SECURITY NOTES

- **NEVER commit credentials to git**
- **NEVER share credentials in chat/email**
- Store credentials securely in `.env.local` (already in `.gitignore`)
- This document contains **instructions only**, not actual credentials

---

## Environment Variables Required

### Local Development (`.env.local`)

Location: `property-review-system/form-app/.env.local`

**Required Variables:**

1. **GOOGLE_SHEETS_CREDENTIALS**
   - Type: JSON string (service account credentials)
   - Purpose: Google Sheets API access
   - Where to get: Google Cloud Console → Service Accounts
   - Format: `GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'`

2. **VERCEL_API_TOKEN**
   - Type: String (personal access token)
   - Purpose: Vercel API access for deployments
   - Where to get: Vercel Dashboard → Profile → Settings → Tokens
   - Format: `VERCEL_API_TOKEN=your_token_here`

**Optional Variables (have fallbacks):**

3. **NEXT_PUBLIC_STASH_WEBHOOK_URL**
   - Type: URL string
   - Purpose: Stash API webhook endpoint
   - Default: `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`
   - Format: `NEXT_PUBLIC_STASH_WEBHOOK_URL=https://...`

4. **NEXT_PUBLIC_GEOSCAPE_API_KEY**
   - Type: String
   - Purpose: Geoscape API for address validation
   - Default: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
   - Format: `NEXT_PUBLIC_GEOSCAPE_API_KEY=your_key_here`

---

## Where Credentials Are Stored

### Local Development
- **File:** `property-review-system/form-app/.env.local`
- **Status:** ✅ In `.gitignore` (not committed to git)
- **Access:** Only on your local machine

### Vercel Production
- **Location:** Vercel Dashboard → Project → Settings → Environment Variables
- **Access:** Only via Vercel dashboard (requires login)
- **Sync:** Should match local `.env.local` for consistency

---

## How to Sync Local with Vercel

1. **Get values from Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Copy each variable value

2. **Update local `.env.local`:**
   - Open `property-review-system/form-app/.env.local`
   - Update values to match Vercel
   - Save file
   - Restart dev server (`npm run dev`)

3. **Verify sync:**
   - Check that both environments have the same values
   - Test locally to ensure everything works

---

## How to Get/Regenerate Credentials

### VERCEL_API_TOKEN
1. Go to https://vercel.com
2. Click Profile → Settings → Tokens
3. Create new token or view existing (names only, values hidden)
4. Copy token immediately (shown only once)

### GOOGLE_SHEETS_CREDENTIALS
1. Go to Google Cloud Console
2. Navigate to Service Accounts
3. Create/download JSON credentials
4. Copy entire JSON as string value

---

## Security Best Practices

✅ **DO:**
- Store credentials in `.env.local` (gitignored)
- Use different tokens for dev/prod if possible
- Rotate tokens periodically
- Keep this document updated with locations (not values)

❌ **DON'T:**
- Commit `.env.local` to git
- Share credentials in chat/email/documents
- Store credentials in code files
- Use production tokens in development

---

## Backup Strategy

If you need to backup credentials:
1. Store in password manager (1Password, LastPass, etc.)
2. Store in secure cloud storage (encrypted)
3. **Never** store in git repository
4. Document where credentials are stored (this file)

---

## Last Updated
- Date: 2025-01-09
- Status: Local and Vercel synced
- Verified: GOOGLE_SHEETS_CREDENTIALS ✅ | VERCEL_API_TOKEN ✅
