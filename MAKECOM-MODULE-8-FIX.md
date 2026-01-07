# Make.com Module 8 Fix - CRITICAL

## The Problem

**Module 8 (Webhook Response)** is likely returning just the module number "7" instead of the actual data from Module 7.

## What Needs to Be Fixed in Make.com

### Step 1: Open Make.com Scenario
1. Go to Make.com
2. Open scenario: **"Test Stashproperty AP"**
3. Find **Module 8** (Webhook Response - the last module)

### Step 2: Check Module 8 Configuration

**Current (WRONG):**
- Status: 200
- Body: `7` (just the number - this is wrong!)

**Should be (CORRECT):**
- Status: 200
- Body: Use the mapping tool to select **Module 7's output fields**

### Step 3: Fix Module 8 Body

**Option A: Use Mapping Tool (RECOMMENDED)**
1. Click on Module 8
2. Click in the "Body" field
3. Click the mapping icon (or press Ctrl+Space)
4. Select **Module 7** from the dropdown
5. Map these fields:
   - `floodRisk` → `{{7.floodRisk}}`
   - `bushfireRisk` → `{{7.bushfireRisk}}`
   - `zoning` → `{{7.zoning}}`
   - `zone` → `{{7.zone}}`
   - `zoneDesc` → `{{7.zoneDesc}}`
   - `lga` → `{{7.lga}}`
   - `state` → `{{7.state}}`
   - `latitude` → `{{9.latitude}}` (from Module 9)
   - `longitude` → `{{9.longitude}}` (from Module 9)
   - And any other fields you need

**Option B: Return Full Module 7 Output**
1. In Module 8 Body field, use: `{{7}}` (this returns the entire Module 7 output object)
2. This is simpler but returns everything

**Option C: Return as JSON Object**
```json
{
  "floodRisk": "{{7.floodRisk}}",
  "bushfireRisk": "{{7.bushfireRisk}}",
  "zoning": "{{7.zoning}}",
  "zone": "{{7.zone}}",
  "zoneDesc": "{{7.zoneDesc}}",
  "lga": "{{7.lga}}",
  "state": "{{7.state}}",
  "latitude": "{{9.latitude}}",
  "longitude": "{{9.longitude}}",
  "flooding": "{{7.flooding}}",
  "bushfire": "{{7.bushfire}}"
}
```

### Step 4: Test the Webhook

After fixing Module 8:

1. **Save the scenario**
2. **Test it:**
   - Click "Run once" OR
   - Call the webhook directly:
   ```powershell
   $body = @{property_address = "4 Osborne Circuit Maroochydore QLD 4558"} | ConvertTo-Json
   Invoke-RestMethod -Uri "https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885" -Method Post -Body $body -ContentType "application/json"
   ```
3. **Check the response** - it should return JSON with floodRisk, bushfireRisk, zoning, lga, etc.

### Step 5: Verify Module 7 Output

Before fixing Module 8, check what Module 7 is actually outputting:

1. In Make.com, click on **Module 7** (Make Code - Parse Stashproperty)
2. Look at the "Output" section
3. You should see fields like:
   - `floodRisk`: "Yes" or "No"
   - `bushfireRisk`: "Yes" or "No"
   - `zoning`: "R2 (Low Density Residential)"
   - `lga`: "Sunshine Coast Regional Council"
   - etc.

4. If Module 7 output looks correct, then Module 8 is the problem
5. If Module 7 output is wrong, we need to fix Module 7

## Quick Test

After fixing Module 8, test in the form:
1. Refresh browser
2. Enter address: "4 Osborne Circuit Maroochydore QLD 4558"
3. Click "Check Stash"
4. Check browser console (F12) - you should see the full response with all fields
5. Fields should populate automatically

## Expected Response Format

After fixing, the webhook should return:
```json
{
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "zoning": "R2 (Low Density Residential)",
  "zone": "R2",
  "zoneDesc": "Low Density Residential",
  "lga": "Sunshine Coast Regional Council",
  "state": "QLD",
  "latitude": -26.6543,
  "longitude": 153.0892,
  ...
}
```

---

**Please check Module 8 in Make.com and let me know what you find!** 🔍







