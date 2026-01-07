# How to Fix Stash API Error

## The Problem

**Error:** "Invalid response format - received module reference instead of data"
**What's happening:** Make.com is returning "7" (module reference) instead of actual data

## Quick Fix - Check Make.com

### Step 1: Open Make.com Scenario
1. Go to Make.com
2. Open scenario: **"Test Stashproperty AP"**
3. Find **Module 8** (Webhook Response)

### Step 2: Check Module 8 Configuration
**Current (WRONG):**
- Body: `7` (just the number)

**Should be (CORRECT):**
- Body: `{{7.result}}` or `{{7}}` (with data mapping)

### Step 3: Fix Module 8
1. Click on Module 8 (Webhook Response)
2. In the "Body" field, change from `7` to `{{7.result}}`
3. OR use the mapping tool to select Module 7's output
4. Save the scenario

### Step 4: Test Again
1. Go back to the form
2. Enter address: "4 Osborne Circuit Maroochydore QLD 4558"
3. Click "Check Stash"
4. Should now return actual data!

## Alternative: Check Make.com Execution Logs

If you're not sure how to fix Module 8:

1. **Trigger the scenario manually:**
   - In Make.com, click "Run once" on "Test Stashproperty AP"
   - Or call the webhook directly

2. **Check execution:**
   - Look at the execution history
   - Click on the latest execution
   - Check Module 8 output
   - See what it's actually returning

3. **Copy the actual response format**
   - Share it with me
   - I'll update the code to handle it correctly

## What I've Added to Code

✅ **Better logging** - Check browser console (F12) to see full response
✅ **Better error messages** - More helpful error text
✅ **Graceful fallback** - Form still works without Stash data

## Test It Now

1. **Open browser console** (F12 → Console tab)
2. **Go to form:** http://localhost:3000
3. **Enter address** and click "Check Stash"
4. **Check console** - You'll see:
   ```
   Stash API Raw Response: [whatever we received]
   Response Type: [type]
   Response String: [JSON string]
   ```

5. **Share the console output** - This will help us fix it!

## Expected vs Actual

**Expected Response:**
```json
{
  "zone": "R2",
  "zoning": "R2 (Low Density Residential)",
  "lga": "Sunshine Coast Regional Council",
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  ...
}
```

**Actual Response (Current):**
```
"7"
```

Once we see what Make.com is actually returning, we can fix the parsing!

---

**Next Step:** Check Make.com Module 8 configuration OR test and share console output! 🔍







