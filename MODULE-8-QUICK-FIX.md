# Module 8 Quick Fix - EXACT STEPS

## What You're Seeing
- **Body field:** `7. Result` (module reference - WRONG)
- **Response:** `[null]` (empty/null)

## The Fix

### Step 1: Click on the Body Field
Click inside the "Body" input field (where it says "7. Result")

### Step 2: Clear It
Delete `7. Result` completely

### Step 3: Use Mapping Tool
1. Click the **mapping icon** (or press **Ctrl+Space** or click the purple tag)
2. Select **Module 7** from the dropdown
3. You'll see all Module 7's output fields

### Step 4: Map the Fields
**Option A: Return Everything (EASIEST)**
- Just type: `{{7}}`
- This returns ALL fields from Module 7

**Option B: Return Specific Fields (RECOMMENDED)**
Click the mapping tool and select these fields one by one, or type this JSON:

```json
{
  "floodRisk": {{7.floodRisk}},
  "bushfireRisk": {{7.bushfireRisk}},
  "zoning": {{7.zoning}},
  "zone": {{7.zone}},
  "zoneDesc": {{7.zoneDesc}},
  "lga": {{7.lga}},
  "state": {{7.state}},
  "flooding": {{7.flooding}},
  "bushfire": {{7.bushfire}},
  "latitude": {{9.latitude}},
  "longitude": {{9.longitude}}
}
```

### Step 5: Save
Click **"Save"** button (purple button bottom right)

### Step 6: Test
1. Click **"Run once"** on the scenario
2. OR call the webhook directly
3. Check the response - should now have actual data!

---

## What Should Happen

**Before:** `[null]` or `"7"`

**After:** 
```json
{
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "zoning": "R2 (Low Density Residential)",
  "lga": "Sunshine Coast Regional Council",
  "state": "QLD",
  ...
}
```

---

## Quick Test Command

After fixing, test with:
```powershell
$body = @{property_address = "4 Osborne Circuit Maroochydore QLD 4558"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885" -Method Post -Body $body -ContentType "application/json"
```

You should see actual data, not `[null]`!







