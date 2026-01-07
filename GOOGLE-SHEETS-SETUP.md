# Google Sheets API Setup Guide

## Step 1: Get Your JSON Credentials File

You should have downloaded a JSON file when creating the service account. It should be named something like:
`property-packaging-xxxxx-xxxxx.json`

## Step 2: Store Credentials Securely

You have two options:

### Option A: Environment Variable (Recommended)

1. Create a file named `.env.local` in the `form-app` directory (if it doesn't exist)
2. Open the JSON file you downloaded
3. Copy the entire contents of the JSON file
4. In `.env.local`, add this line:
   ```
   GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```
   **Important:** Replace the `...` with the actual JSON content from your file, keeping it as a single line string.

### Option B: File Path (Alternative)

1. Copy the JSON file to `form-app/credentials/google-sheets-credentials.json`
2. Create the `credentials` directory if it doesn't exist
3. Update `src/lib/googleSheets.ts` to read from file instead of environment variable

## Step 3: Verify Setup

1. Make sure `.env.local` is in `.gitignore` (it should be already)
2. Restart your dev server after adding credentials
3. Test the Market Performance lookup

## Important Notes

- Never commit the JSON credentials file to git
- The `.env.local` file is already in `.gitignore` and won't be committed
- If deploying to production, add the environment variable to your hosting platform (Vercel, etc.)





