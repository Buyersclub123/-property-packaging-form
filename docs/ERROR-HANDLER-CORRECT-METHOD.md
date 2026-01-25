# Error Handler Setup - Correct Method

## How to Add Error Handler in Make.com

**Error handlers are added per module, not from scenario settings.**

### Step-by-Step:

1. **Open your Make.com scenario**

2. **Right-click on Module 1** (Webhook module) or any critical module
   - **Right-click** = Click with right mouse button (or Ctrl+Click on Mac)
   - A context menu will appear

3. **Select "Add error handler"** from the menu
   - This creates a new error handling route (shown with transparent/dashed lines)

4. **In the error handler route:**
   - Click the **"+"** button
   - Add **Google Sheets** → **"Add a row"** module
   - Select your sheet → **"Errors"** tab
   - Map the fields (see below)

5. **Add "Resume" card** (important!):
   - At the end of error handler route, click **"+"**
   - Search for **"Resume"** card
   - Add it as the last module
   - Configure: Choose whether to continue or stop scenario

6. **Map error fields:**

   | Field Name | Value |
   |------------|-------|
   | **Timestamp** | `{{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}` |
   | **Scenario Name** | `{{scenario.name}}` |
   | **Execution ID** | `{{execution.id}}` |
   | **Module Name** | `{{error.moduleName}}` |
   | **Error Type** | `{{error.type}}` |
   | **Error Message** | `{{error.message}}` |
   | **Record ID** | `{{error.inputData.id}}` or `{{error.inputData.recordId}}` |
   | **Property Address** | `{{error.inputData.propertyAddress}}` |
   | **BA Email** | `{{error.inputData.baEmail}}` |
   | **Input Data (JSON)** | `{{json(error.inputData)}}` |

## Which Modules to Add Error Handlers To?

**Recommended:** Add error handlers to critical modules:

1. **Module 1 (Webhook)** - Catches webhook errors
2. **Module 13 (GHL API)** - Catches GHL fetch errors
3. **Module 14 (Gmail)** - Catches email send errors

**Or:** Add to Module 1 only - it will catch errors from all downstream modules if they fail.

## Visual Guide

```
Module 1 (Webhook)
    │
    ├─→ [Normal flow continues...]
    │
    └─→ [Error Handler Route] (right-click → Add error handler)
         │
         ├─→ Google Sheets (Log to Errors tab)
         │
         └─→ Resume Card (continue or stop)
```

## Alternative: Global Error Handler

If you want ONE error handler for the whole scenario:

1. **Right-click Module 1** (first module)
2. **Add error handler**
3. This will catch errors from Module 1 and all downstream modules

## Troubleshooting

**If "Add error handler" doesn't appear:**
- Make sure you're right-clicking on the module itself (not empty space)
- Try right-clicking on different modules
- Check if your Make.com plan includes error handlers

**If error handler route doesn't appear:**
- It should show as a separate branch with transparent/dashed lines
- If not visible, try refreshing the page

## Next Steps

1. ✅ Right-click Module 1 → Add error handler
2. ✅ Add Google Sheets module → Log to "Errors" tab
3. ✅ Add Resume card → Configure behavior
4. ✅ Test by intentionally breaking something

