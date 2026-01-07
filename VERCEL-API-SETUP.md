# Vercel API Token Setup

## Step 1: Get Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: "Property Packaging Form Automation"
4. Expiration: "No expiration" (or set a date)
5. Click "Create Token"
6. **Copy the token** (you'll only see it once!)

## Step 2: Add Token to .env.local

Add this line to your `.env.local` file:

```env
VERCEL_API_TOKEN=your_token_here
```

## Step 3: Get Your Project Name

After connecting GitHub repo to Vercel:
1. Go to your project in Vercel dashboard
2. Project name is in the URL: `vercel.com/your-username/project-name`
3. Or check Settings → General → Project Name

## Step 4: Get Team ID (if using team account)

If you're using a Vercel team:
1. Go to Team Settings
2. Team ID is in the URL or Settings

**If personal account:** Leave teamId empty/undefined

## Step 5: Test Connection

Once token is added, I can:
- ✅ Set environment variables via API
- ✅ Check deployment status
- ✅ Trigger deployments
- ✅ List environment variables

## Usage

After setup, I can help you:
- Set `GOOGLE_SHEETS_CREDENTIALS` automatically
- Set other environment variables
- Check if deployment succeeded
- Trigger new deployments

