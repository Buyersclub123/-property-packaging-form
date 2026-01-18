# Fix Google Sheets JWT Signature Error

## The Problem

**Error:** "Google is rejecting the JWT signature. The private key format is correct, but when Google validates the signature against the service account, it fails."

**Cause:** The private key in your credentials doesn't match the service account email. This happens when:
- The key was regenerated
- The service account was deleted/recreated
- The credentials JSON is outdated
- Wrong credentials file was used

## How to Fix

### Step 1: Find Your Service Account

1. Go to: **https://console.cloud.google.com/iam-admin/serviceaccounts**
2. Select the correct project (same one where your Google Sheet is)
3. Find the service account email (it should match what's in your `.env.local` file)

### Step 2: Create a New Key

1. Click on the service account email
2. Go to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **"JSON"** format
5. Click **"Create"**
6. A JSON file will download automatically

### Step 3: Update Your .env.local

1. Open the downloaded JSON file
2. Copy the **entire contents** (it should look like this):
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

3. Open `property-review-system/form-app/.env.local`
4. Find the line: `GOOGLE_SHEETS_CREDENTIALS='...'`
5. Replace everything between the single quotes with the JSON content
6. **Important:** Keep it as a single line, with `\n` for newlines in the private_key

Example format:
```bash
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMBs3jS2IkIT2d\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com",...}'
```

### Step 4: Restart Dev Server

1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. Test Google Sheets access

## Verify It Works

1. Try accessing a Google Sheet through your app
2. If you still get JWT errors, check:
   - Service account email matches exactly
   - Private key has `\n` (escaped newlines), not actual newlines
   - JSON is valid (no syntax errors)
   - Credentials are wrapped in single quotes in `.env.local`

## Common Mistakes

❌ **Wrong:** Using actual newlines in private_key
✅ **Correct:** Using `\n` (escaped newlines)

❌ **Wrong:** Missing quotes around JSON in .env.local
✅ **Correct:** `GOOGLE_SHEETS_CREDENTIALS='{...}'`

❌ **Wrong:** Using credentials from a different project
✅ **Correct:** Use credentials from the same project as your Google Sheet

❌ **Wrong:** Service account doesn't have access to the Sheet
✅ **Correct:** Share the Google Sheet with the service account email

## Still Not Working?

1. **Check service account permissions:**
   - Go to your Google Sheet
   - Click "Share"
   - Add the service account email (from credentials)
   - Give it "Editor" access

2. **Verify the service account exists:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Make sure the email matches exactly

3. **Check the project:**
   - Make sure you're using credentials from the same Google Cloud project
   - The project_id in credentials should match your project

---

**Note:** This is separate from the Google Maps API key. They use different authentication methods!
