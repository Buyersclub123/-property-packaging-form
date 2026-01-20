# Make.com Error Logging Setup Guide

## Understanding the Flow

```
Module 1 (Webhook) → Router → [Paths 1, 2, 3, 4]
                              ↓
                         Module 18 (Skipped webhooks)
```

**Module 18** is for webhooks that don't match any Router condition (skipped/filtered out).

**But errors can happen at ANY point:**
- Module 13 (GHL fetch fails)
- Module 6 (preprocessing fails)
- Module 3 (email generation fails)
- Module 14 (Gmail send fails)

## Solution: Two-Level Tracking

### Level 1: Make.com Built-in Error Handler (Catches Everything)

**This catches ALL errors automatically, no matter where they occur.**

**Setup Steps:**

1. **Enable Error Handler:**
   - In Make.com scenario, click the **"Settings"** icon (gear ⚙️)
   - Scroll to **"Error Handler"** section
   - Click **"Add error handler"**
   - This creates a separate flow that runs when ANY module fails

2. **Add Google Sheets Module in Error Handler:**
   - Add "Add a row" module
   - Select your Google Sheet
   - Tab name: `Error Log`
   - Map these fields:

| Column | Make.com Field |
|--------|----------------|
| Timestamp | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
| Scenario Name | `{{scenario.name}}` |
| Execution ID | `{{execution.id}}` |
| Module Name | `{{error.moduleName}}` |
| Error Type | `{{error.type}}` |
| Error Message | `{{error.message}}` |
| Record ID | `{{error.inputData.id}}` or `{{error.inputData.recordId}}` |
| Property Address | `{{error.inputData.propertyAddress}}` |
| BA Email | `{{error.inputData.baEmail}}` |
| Input Data (JSON) | `{{json(error.inputData)}}` |

3. **Test:**
   - Intentionally break a module (e.g., invalid GHL API key)
   - Run scenario
   - Check Error Log sheet - should see the error

### Level 2: Success Logging (After Module 14)

**This logs successful email sends.**

**Setup:**
- Add Google Sheets module after Module 14 (Gmail) in Path 4
- Log to `Email Log` sheet (as already planned)

## Google Sheet Structure

### Tab 1: "Email Log" (Success)
Columns:
- Timestamp
- Property Address
- Opportunity Name
- Email Addresses Sent To
- BA / Sender
- Send From Email
- Message Type

### Tab 2: "Error Log" (Failures)
Columns:
- Timestamp
- Scenario Name
- Execution ID
- Module Name
- Error Type
- Error Message
- Record ID
- Property Address
- BA Email
- Input Data (JSON)

## Monitoring in Make.com

**Check Execution History:**
1. Go to scenario
2. Click "Executions" tab
3. Red entries = errors
4. Click execution to see details

**What to Look For:**
- **Red executions** = errors occurred
- **Click red execution** = see which module failed and why
- **Compare Error Log sheet** = see patterns (e.g., "Module 13 fails often" = GHL API issue)

## Module 18 (Skipped Webhooks)

**Module 18** logs webhooks that don't match Router conditions (e.g., `packager_approved` is empty, wrong `source`, etc.).

**This is NOT an error** - it's expected filtering.

**If you want to track these:**
- Add Google Sheets module after Module 18
- Log to "Skipped Log" sheet
- Fields: Timestamp, Record ID, Reason (why it was skipped)

## Recommended Approach

**Use Make.com Error Handler** - it's the simplest and catches everything:

1. ✅ Enable Error Handler in scenario settings
2. ✅ Add Google Sheets module to log errors
3. ✅ Add success logging after Module 14
4. ✅ Check Error Log sheet regularly
5. ✅ Check Make.com execution history for details

**No code changes needed** - Make.com handles it automatically!

## Questions?

- **"Where do I check errors?"** → Make.com execution history + Error Log sheet
- **"Do I need Module 18?"** → Only if you want to track filtered/skipped webhooks
- **"What if Module 3 fails?"** → Error Handler catches it automatically
- **"What if Gmail fails?"** → Error Handler catches it automatically










