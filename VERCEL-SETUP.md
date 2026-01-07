# Vercel Setup Instructions

## Step 1: Connect GitHub Repo to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your GitHub repository: `property-review-system`
5. Select the `form-app` folder as the root directory

## Step 2: Configure Build Settings

Vercel should auto-detect Next.js, but verify:
- **Framework Preset:** Next.js
- **Root Directory:** `form-app`
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

## Step 3: Add Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add:

```
GOOGLE_SHEETS_CREDENTIALS
```
(Paste the full JSON credentials string - same as in your `.env.local`)

## Step 4: Deploy

Click "Deploy" - Vercel will:
1. Install dependencies
2. Build the project
3. Deploy to production URL

## Step 5: Get Vercel API Token (Optional - for automation)

1. Go to Vercel → Settings → Tokens
2. Create new token
3. Copy token
4. Add to `.env.local`: `VERCEL_API_TOKEN=your_token_here`

## After Deployment

- Production URL: `https://your-project.vercel.app`
- Preview URLs: Created for each commit/PR
- Environment variables: Set in dashboard (not in code)

## Troubleshooting

**Build fails:**
- Check environment variables are set
- Check Node version (should be 18+)
- Check build logs in Vercel dashboard

**API routes don't work:**
- Ensure environment variables are set
- Check serverless function logs in Vercel dashboard

