# Environment Variable Setup - Phase 4B
## OpenAI GPT-4 Configuration

**Date:** January 21, 2026  
**Phase:** Phase 4B - AI Content Generation  
**Status:** Required for production use

---

## 🔑 Required Environment Variables

Phase 4B requires OpenAI API credentials to generate "Why This Property" content automatically.

### Variables to Add

Add these to your `.env.local` file in the `form-app` directory:

```env
# ---------------------------------------------------------
# 6. AI & Language Models (Phase 4B)
# ---------------------------------------------------------
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1/chat/completions
```

---

## 📍 File Location

**Path:** `form-app/.env.local`

**Note:** This file is gitignored and will not be committed to version control.

---

## 🔧 How to Get Your OpenAI API Key

### Step 1: Sign Up / Log In
1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up for an account or log in if you already have one

### Step 2: Navigate to API Keys
1. Click on your profile icon (top right)
2. Select "API Keys" from the dropdown
3. Or go directly to: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Step 3: Create New API Key
1. Click "Create new secret key"
2. Give it a name (e.g., "Property Review System - Production")
3. Copy the key immediately (it won't be shown again!)
4. Store it securely

### Step 4: Add to .env.local
1. Open `form-app/.env.local`
2. Add the line:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Save the file
4. Restart your development server

---

## 💰 OpenAI Pricing Information

### GPT-4 Pricing (as of Jan 2026)
- **Input:** ~$0.03 per 1K tokens
- **Output:** ~$0.06 per 1K tokens

### Estimated Cost Per Generation
- **Average prompt:** ~200 tokens
- **Average response:** ~500 tokens
- **Cost per generation:** ~$0.036 (3.6 cents)

### Monthly Estimates
- **10 properties/day:** ~$11/month
- **50 properties/day:** ~$54/month
- **100 properties/day:** ~$108/month

**Note:** Prices may vary. Check [OpenAI Pricing](https://openai.com/pricing) for current rates.

---

## 🔒 Security Best Practices

### DO ✅
- ✅ Store API keys in `.env.local` only
- ✅ Add `.env.local` to `.gitignore`
- ✅ Use different keys for development and production
- ✅ Rotate keys periodically
- ✅ Set usage limits in OpenAI dashboard
- ✅ Monitor API usage regularly

### DON'T ❌
- ❌ Commit API keys to Git
- ❌ Share API keys in chat/email
- ❌ Use production keys in development
- ❌ Hardcode keys in source code
- ❌ Expose keys in client-side code
- ❌ Share keys across multiple projects

---

## 🧪 Testing Your Configuration

### Step 1: Verify Environment Variables

Create a test script to verify your setup:

```typescript
// form-app/test-openai-config.ts
const apiKey = process.env.OPENAI_API_KEY;
const apiBaseUrl = process.env.OPENAI_API_BASE_URL;

console.log('API Key:', apiKey ? '✅ Set' : '❌ Missing');
console.log('API Base URL:', apiBaseUrl || '✅ Using default');

if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('✅ Configuration looks good!');
```

Run with:
```bash
cd form-app
npx ts-node test-openai-config.ts
```

### Step 2: Test API Endpoint

Start your development server:
```bash
cd form-app
npm run dev
```

Test the endpoint with curl:
```bash
curl -X POST http://localhost:3000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "suburb": "Lewisham",
    "lga": "Inner West",
    "type": "why-property"
  }'
```

**Expected Response:**
```json
{
  "content": "**Strong Capital Growth** - Lewisham has experienced..."
}
```

**If API Key is Missing:**
```json
{
  "error": "API key not configured"
}
```

### Step 3: Test in Application

1. Navigate to Step 5 in the form
2. Enter a property with suburb and LGA
3. Watch for auto-generation to trigger
4. Verify content appears in textarea

**Success Indicators:**
- ✅ Loading spinner appears
- ✅ "Generating content..." message shows
- ✅ Content populates after 3-5 seconds
- ✅ Success message: "Content generated for [Suburb]"
- ✅ Textarea auto-expands with content

---

## 🚨 Troubleshooting

### Error: "API key not configured"

**Cause:** `OPENAI_API_KEY` not found in environment variables

**Solution:**
1. Check `.env.local` file exists in `form-app` directory
2. Verify the variable is named exactly `OPENAI_API_KEY`
3. Restart your development server
4. Clear Next.js cache: `rm -rf .next`

### Error: "OpenAI API request failed"

**Cause:** Invalid API key or API error

**Solution:**
1. Verify API key is correct (no extra spaces)
2. Check API key is active in OpenAI dashboard
3. Verify you have credits/billing set up
4. Check OpenAI status: [https://status.openai.com/](https://status.openai.com/)

### Error: "Rate limit exceeded"

**Cause:** Too many requests in short time

**Solution:**
1. Wait a few minutes and try again
2. Upgrade your OpenAI plan for higher limits
3. Implement request throttling in application

### Content Not Generating

**Possible Causes:**
1. Suburb or LGA not provided
2. Field already has content (won't auto-generate)
3. Network error
4. API timeout

**Solution:**
1. Check browser console for errors
2. Check network tab for API call
3. Verify suburb and LGA are populated
4. Try clicking "Regenerate" button manually

---

## 📊 Monitoring API Usage

### OpenAI Dashboard
1. Go to [https://platform.openai.com/usage](https://platform.openai.com/usage)
2. View daily/monthly usage
3. Set usage limits to prevent overages
4. Monitor costs in real-time

### Recommended Limits
- **Development:** $10/month
- **Production:** Based on expected volume
- **Set alerts:** Email notifications at 50%, 75%, 90%

---

## 🔄 Environment Variable Checklist

Before deploying Phase 4B, verify:

- [ ] `.env.local` file exists in `form-app` directory
- [ ] `OPENAI_API_KEY` is set with valid key
- [ ] `OPENAI_API_BASE_URL` is set (or using default)
- [ ] API key is active in OpenAI dashboard
- [ ] Billing is set up in OpenAI account
- [ ] Usage limits are configured
- [ ] Development server restarted after adding keys
- [ ] Test API call successful
- [ ] Test auto-generation in application
- [ ] `.env.local` is in `.gitignore`

---

## 🚀 Production Deployment

### Vercel Environment Variables

If deploying to Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-xxxxx...` | Production |
| `OPENAI_API_BASE_URL` | `https://api.openai.com/v1/chat/completions` | Production |

4. Redeploy your application

**Note:** Use a separate API key for production!

### Other Hosting Platforms

**Netlify:**
- Settings → Build & Deploy → Environment Variables

**AWS Amplify:**
- App Settings → Environment Variables

**Railway:**
- Variables tab in project settings

**General:**
- Most platforms have an "Environment Variables" or "Secrets" section
- Add the same variables as in `.env.local`
- Redeploy after adding variables

---

## 📝 Example .env.local File

Here's a complete example of what your `.env.local` should look like:

```env
# ---------------------------------------------------------
# 1. Google APIs (Existing)
# ---------------------------------------------------------
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ---------------------------------------------------------
# 2. GoHighLevel (Existing)
# ---------------------------------------------------------
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# ---------------------------------------------------------
# 3. Geoapify (Existing)
# ---------------------------------------------------------
GEOAPIFY_API_KEY=your_geoapify_key

# ---------------------------------------------------------
# 4. Make.com Webhooks (Existing)
# ---------------------------------------------------------
MAKE_WEBHOOK_URL=https://hook.us1.make.com/xxxxx

# ---------------------------------------------------------
# 5. Application Settings (Existing)
# ---------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ---------------------------------------------------------
# 6. AI & Language Models (Phase 4B - NEW)
# ---------------------------------------------------------
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_BASE_URL=https://api.openai.com/v1/chat/completions
```

---

## ✅ Verification Steps

After setting up environment variables:

1. **Restart Development Server:**
   ```bash
   cd form-app
   npm run dev
   ```

2. **Check Server Logs:**
   - Look for any environment variable errors
   - Verify no "API key not configured" messages

3. **Test API Endpoint:**
   - Use curl or Postman
   - Verify 200 OK response with content

4. **Test in Application:**
   - Navigate to Step 5
   - Verify auto-generation works
   - Check loading states
   - Verify error handling (temporarily break API key)

5. **Monitor First Few Generations:**
   - Check OpenAI dashboard for usage
   - Verify costs are as expected
   - Check response times

---

## 📞 Support

### OpenAI Support
- Documentation: [https://platform.openai.com/docs](https://platform.openai.com/docs)
- Community: [https://community.openai.com/](https://community.openai.com/)
- Status: [https://status.openai.com/](https://status.openai.com/)

### Application Support
- Check `PHASE-4B-IMPLEMENTATION-SUMMARY.md` for implementation details
- Review `IMPLEMENTATION-TRACKER.md` for project status
- Contact development team for assistance

---

**Last Updated:** January 21, 2026  
**Phase:** 4B - AI Content Generation  
**Status:** Ready for production use
