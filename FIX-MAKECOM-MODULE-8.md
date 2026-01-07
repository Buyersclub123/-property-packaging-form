# Fix Make.com Module 8 - Returning "Accepted" Instead of Data

## Problem
Make.com Module 8 (Webhook Response) is returning the string `"Accepted"` instead of the actual property data from Module 7.

## Console Shows:
```
=== STASH API RESPONSE ===
Status: 200
Data Type: string
Is Array: false
Raw Data: "Accepted"
```

## Solution

### Step 1: Open Make.com Scenario "Test Stashproperty AP"

### Step 2: Find Module 8 (Webhook Response)
- It should be the last module in the scenario
- It's the module that sends data back to the webhook caller

### Step 3: Check the Body Field
- Click on Module 8
- Look for the "Body" field (or "Response Body" field)
- **Current value:** Probably says `"Accepted"` or `{{7}}` or `7. Result`
- **Should be:** `{{7.result}}`

### Step 4: Update Module 8 Body Field
1. Click in the Body field
2. Delete whatever is there
3. Type exactly: `{{7.result}}`
4. Save the module
5. Save the scenario

### Step 5: Test
1. Go back to the form
2. Refresh the page
3. Enter address: `4 Osborne Circuit Maroochydore QLD 4558`
4. Click "Check Stash"
5. Check console - should now show actual data instead of "Accepted"

## Expected Response After Fix
The console should show something like:
```
=== STASH API RESPONSE ===
Status: 200
Data Type: object
Is Array: false
Raw Data: {
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  "zoning": "R1 (Residential)",
  "lga": "Sunshine Coast",
  ...
}
```

## Why This Happens
- Make.com webhook modules can return simple strings like "Accepted" by default
- We need to explicitly tell it to return Module 7's result data
- `{{7.result}}` tells Make.com to return the output object from Module 7

## Verification
After fixing, Module 8 should return an object with fields like:
- `floodRisk`
- `bushfireRisk`
- `zoning`
- `lga`
- `state`
- `latitude`
- `longitude`
- etc.

---

**Note:** If Module 8 still returns "Accepted" after this fix, check:
1. Module 7 is executing successfully (check execution logs)
2. Module 7 output has data (check Module 7's output in execution history)
3. Module 8 is connected to Module 7 (check the connection/flow)







