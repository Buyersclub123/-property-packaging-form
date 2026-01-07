# Module 8 Body Field - EXACT FIX

## The Problem
Module 8 Body is currently set incorrectly, returning `[null]` instead of Module 7's data.

## The Fix

### Step 1: Open Module 8
1. Go to Make.com → "Test Stashproperty AP"
2. Click on **Module 8** (Webhook Response)

### Step 2: Change Body Field
1. Click inside the **Body** field (where it shows `> 7. Make Code – Run code [bundle]`)
2. **Delete everything** in that field
3. Type exactly: `{{7.result}}`
   - This returns just the `result` object from Module 7
   - Not wrapped in an array

### Step 3: Save
1. Click **"Save"** button (purple button)

### Step 4: Test
1. Click **"Run once"** on the scenario
2. OR call the webhook:
   ```powershell
   $body = @{property_address = "4 Osborne Circuit Maroochydore QLD 4558"} | ConvertTo-Json
   Invoke-RestMethod -Uri "https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885" -Method Post -Body $body -ContentType "application/json"
   ```
3. **Expected response:**
   ```json
   {
     "floodRisk": "Yes",
     "bushfireRisk": "No",
     "zoning": "Emerging Community Zone (Emerging Community Zone)",
     "lga": "Sunshine Coast Regional",
     "state": "QLD",
     ...
   }
   ```
   **NOT:** `[null]` or `[{result: {...}}]`

---

## Alternative: If `{{7.result}}` doesn't work

Try: `{{7}}` (returns full Module 7 output, frontend will handle it)

---

## What Should Happen

**Before:** `[null]`

**After:** 
```json
{
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "zoning": "...",
  "lga": "...",
  ...
}
```

---

**Change Module 8 Body to `{{7.result}}` and test again!** 🔧







