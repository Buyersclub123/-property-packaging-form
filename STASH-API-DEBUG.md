# Stash API Debugging Guide

## Issue
**Error:** "Invalid response format - received module reference instead of data"
**Symptom:** Response is just "7" instead of actual data

## Root Cause
Make.com Module 8 (Webhook Response) is configured to return "7" (module reference) instead of the actual data from Module 7.

## Solution Options

### Option 1: Fix Make.com Module 8 Configuration (RECOMMENDED)
**In Make.com Scenario "Test Stashproperty AP":**
1. Open Module 8 (Webhook Response)
2. Check the "Body" field
3. **Current:** Body = "7" (module reference)
4. **Should be:** Body = "7. result" or the actual data structure
5. **OR:** Body should be configured to return the full JSON from Module 7

**Make.com Webhook Response Module should return:**
```json
{
  "zone": "...",
  "zoning": "...",
  "lga": "...",
  "state": "...",
  "floodRisk": "Yes",
  "bushfireRisk": "No",
  ...
}
```

### Option 2: Handle Response in Code (TEMPORARY)
We've added better error handling and logging. The code will now:
- Log the full response for debugging
- Show a clearer error message
- Still allow the form to continue with manual entry

## Testing Steps

1. **Open browser console** (F12)
2. **Enter address** in Step 1
3. **Click "Check Stash"**
4. **Check console logs** - you'll see:
   - Raw response
   - Response type
   - Full response object

5. **Check Make.com execution:**
   - Go to Make.com
   - Find "Test Stashproperty AP" scenario
   - Check latest execution
   - Look at Module 8 output
   - See what it's actually returning

## Expected Response Format

Based on Module 7 output, we expect:
```json
{
  "zone": "R2",
  "zoneDesc": "Low Density Residential",
  "zoning": "R2 (Low Density Residential)",
  "lga": "Sunshine Coast Regional Council",
  "state": "QLD",
  "floodRisk": "Yes",
  "floodingRisk": "Yes",
  "bushfireRisk": "No",
  "latitude": -26.6543,
  "longitude": 153.0892,
  ...
}
```

## Next Steps

1. **Check Make.com Module 8** - Verify it's returning actual data, not "7"
2. **Test with console open** - See what we're actually receiving
3. **Update code** - Once we know the actual format, update parsing logic

## Debugging Commands

In browser console after clicking "Check Stash":
```javascript
// Check what was logged
// Look for "Stash API Raw Response" in console
```

## Make.com Fix

**Module 8 Configuration:**
- **Status:** 200
- **Body:** Should be `{{7.result}}` or `{{7}}` (with proper data mapping)
- **NOT:** Just "7" as a string

If Module 8 Body is set to "7", it's returning the module number instead of the data. It should be configured to return the actual output from Module 7.







