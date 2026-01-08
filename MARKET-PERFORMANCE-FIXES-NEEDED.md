# Market Performance Fixes Needed

## Issue 1: N/A not allowed in input fields
**Status:** Need to fix input cleaning to allow typing "N/A"

## Issue 2: Market Performance Additional Dialogue missing
**Status:** Component exists but might be hidden - need to check visibility logic

## Issue 3: Unclear error message about saving data
**Status:** Need to improve error message to mention "Save Market Performance Data" button

## Issue 4: Data not refreshing from Google Sheet
**Status:** COMPLEX - When navigating back to Market Performance step, it preserves user-entered data instead of always fetching fresh data from Google Sheet. This means if user edits values in Google Sheet manually, the form doesn't pick them up.

**Note for later:** Need to implement logic to:
- Always fetch from Google Sheet when step is visited
- Compare fetched data with form state
- Prompt user if there's a conflict, or
- Always use Google Sheet data as source of truth
- Or provide a "Refresh from Google Sheet" button

## Current Behavior
The component preserves user-entered data when navigating between steps. This is good for form continuity but bad when data source (Google Sheet) is the source of truth.

## Proposed Solution (for later)
1. On component mount, always fetch from Google Sheet
2. Show a comparison if form data differs from Google Sheet
3. Give user option to:
   - Use form data (overwrite sheet)
   - Use Google Sheet data (discard form changes)
   - Merge intelligently (use sheet for empty form fields)



