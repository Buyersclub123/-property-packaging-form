# Testing Log - Investment Highlights Redesign

**Date:** 2025-01-26  
**Environment:** Dev (localhost:3004)  
**Tester:** User  
**Status:** In Progress

---

## Issues Found

### 1. Proximity API - 401 Unauthorized Error

**Error:**
```
/api/geoapify/proximity:1 Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

**Root Cause:**
- **Line 863 (MultiStepForm.tsx):** Early processing call missing `userEmail` parameter
- **Line 97 (ProximityField.tsx):** localStorage may return empty string `""` causing 401

**Impact:**
- API call fails with 401
- Proximity data not fetched via API
- Data shown is from form state (cached/previous session)

**Fix Required:**
- Add `userEmail` to early processing call in MultiStepForm.tsx
- Fix localStorage parsing to handle null/empty properly
- Ensure userEmail exists before calling API

---

### 2. Proximity API - 400 Bad Request Error

**Error:**
```
/api/geoapify/proximity:1 Failed to load resource: the server responded with a status of 400 (Bad Request)
```

**Root Cause:**
- Second API call missing required parameters (propertyAddress or coordinates)

**Impact:**
- API call fails with 400
- Proximity calculation fails

**Fix Required:**
- Ensure propertyAddress is passed correctly in all API calls

---

### 3. Duplicate Proximity API Calls

**Observation:**
- API called twice: Count 1 and Count 2
- First call: 401 error
- Second call: 400 error

**Root Cause:**
- Early processing (MultiStepForm.tsx line 860) calls API
- Component (ProximityField.tsx line 92) also calls API
- Both calls happening on page load

**Impact:**
- Unnecessary API calls
- Both calls failing

**Fix Required:**
- Prevent duplicate calls - use early processing data if available
- Or ensure only one call happens

---

### 4. InvestmentHighlightsField - Excessive Re-renders

**Observation:**
- Component rendering 132 times
- Log shows: "Component render # 1" through "# 132"
- Value length changing: 0 → 1 → 2 → 3 → 4 → 5 → 4 → 3 → 2 → 1 → 0

**Root Cause:**
- `useEffect` on line 119 has `value` in dependency array: `[lga, suburb, state, value]`
- When `value` changes, it triggers effect → state update → re-render → loop

**Impact:**
- Performance issue
- Potential infinite loop
- Component unstable

**Fix Required:**
- Remove `value` from useEffect dependencies
- Use ref to track if lookup already done
- Prevent re-render loop

---

### 5. Proximity Data Showing Despite API Errors

**Observation:**
- API calls fail (401, 400)
- But proximity data still displays in UI
- Data shows: "5 Acacia St Point Vernon QLD 4655" with amenities list

**Root Cause:**
- Data is from form state (cached/previous session)
- Not from successful API call
- No successful API call in logs

**Impact:**
- User sees data but it's stale/cached
- May not match current address
- Security concern - should always fetch fresh data

**Note:**
- User confirmed: MUST always call API (security requirement)
- Never skip API call based on cached data
- Proximity is address-specific, not suburb/state

---

## Other Observations

### React DevTools Warning
- Image with src "/logo.jpg" detected as LCP - should add priority property

### Favicon 404
- `/favicon.ico` returns 404 - not critical

### Extension Error
- "A listener indicated an asynchronous response by returning true, but the message channel closed" - browser extension issue, not app code

---

## Next Steps

1. Fix proximity API calls (add userEmail, fix localStorage parsing)
2. Fix InvestmentHighlightsField render loop (remove value from dependencies)
3. Prevent duplicate API calls
4. Ensure API always called (never use cached data)
5. Re-test after fixes

---

---

## PDF Upload & Verification Issues

### 6. Report Name Extraction - Incorrect Values

**Observation:**
- Extracted Report Name: "TODAY Location Report FRASER COAST Wide Bay Burnett Region"
- Front page of PDF shows: "FRASER COAST Wide Bay Burnett Region"
- "TODAY" and "LOCATION REPORT" should not be in extracted name

**Expected:**
- Report Name should be: "FRASER COAST" (or "FRASER COAST Wide Bay Burnett Region" if that's the actual report name)
- Should match what's on front page of PDF

**Root Cause:**
- Extraction logic picking up wrong text
- Not cleaning out "TODAY" and "LOCATION REPORT" prefixes

**Fix Required:**
- Review extraction logic
- Clean out "TODAY" and "LOCATION REPORT" from extracted name
- Match front page of PDF exactly

---

### 7. File Naming - Not Cleaned Properly

**Observation:**
- File saved as: `null-null-Fraser Coast (12)-2026-01-25.pdf`
- Should be: `Fraser Coast - January - April 2026.pdf`

**Issues:**
- "null-null-" prefix not removed
- Download counter "(12)" not removed
- Date suffix "-2026-01-25" not removed
- Valid Period not used in filename

**Root Cause:**
- `cleanReportNameForFilename()` function not working correctly
- File naming happens before verification (should use verified values)

**Fix Required:**
- Fix `cleanReportNameForFilename()` to strip "null-null-" prefix
- Use verified Report Name and Valid Period for filename
- File naming should happen AFTER user verification

---

### 8. UI Guidance Text - Too Small

**Observation:**
- "Report Name should match the name when downloaded from Hotspotting" - too small, not prominent
- Similar prompt needed for Valid Period (and larger)
- "Important" message too small

**Impact:**
- Users can't see critical instructions
- Instructions don't prompt user if they can't see them

**Fix Required:**
- Make guidance text much larger and more prominent
- Add similar prompt for Valid Period field
- Make "Important" message much larger
- Use visual emphasis (bold, larger font, color)

---

### 9. Google Sheets Error - 50000 Character Limit

**Error:**
```
"Your input contains more than the maximum of 50000 characters in a single cell."
```

**Observation:**
- Same report worked with old code
- New code doing something different with Main Body content
- Error occurs when clicking "Confirm and Continue"

**Root Cause:**
- Main Body content too large for Google Sheets cell limit
- Old code may have split content or handled differently
- Need to review how old code handled this

**Fix Required:**
- Review old code to see how it handled large content
- Either split content across cells or truncate
- Ensure Main Body fits within Google Sheets limits

---

### 10. Missing Fallback for ChatGPT Failure

**Observation:**
- When API fails, no prompt to user for manual process
- Should instruct user to use manual ChatGPT process and paste results

**Expected:**
- If ChatGPT API fails, show clear instructions:
  - "Please use the manual ChatGPT Infrastructure Details Tool"
  - "Copy the output and paste it into the field below"

**Fix Required:**
- Add fallback UI when ChatGPT fails
- Show instructions for manual process
- Provide textarea for manual paste

**Note:**
- Need to review production code to see how Proximity and report extraction are handled
- Learn from existing working code instead of assuming

---

### 11. Investment Highlights Field - Not Mandatory

**Observation:**
- Can progress to next page without Investment Highlights content
- User entered random text to test
- Should be mandatory to prevent progression

**Impact:**
- Users can skip critical field
- Incomplete data in property packages

**Fix Required:**
- Make Investment Highlights field mandatory
- Block "Next" button if field is empty
- Show validation error if user tries to proceed

---

### 12. PDF Not Added to Property Folder

**Observation:**
- Property folder created successfully
- PDF not added to folder (should be shortcut/link)
- Folder only contains: CF spreadsheet and Photos docx

**Expected:**
- PDF shortcut should appear in property folder after creation
- Should link to PDF in Hotspotting Reports folder

**Root Cause:**
- `createShortcut()` function may not be working
- Or `hotspottingPdfFileId` not in form data when folder created

**Fix Required:**
- Verify PDF file ID is stored in form state
- Check `createShortcut()` function works correctly
- Ensure shortcut created when property folder is created

---

## Summary of Critical Issues

1. **Report Name extraction** - Wrong values extracted
2. **File naming** - Not cleaned, wrong format
3. **UI guidance** - Too small, not visible
4. **Google Sheets error** - Content too large (worked before)
5. **Missing fallback** - No manual process instructions
6. **Field validation** - Not mandatory
7. **PDF shortcut** - Not added to property folder

---

## Status

**Current:** Testing complete - multiple critical issues found  
**Blockers:** 
- Report name extraction broken
- File naming broken
- Google Sheets error (regression from old code)
- Missing fallback UI
- Field validation missing
- PDF shortcut not working

**Priority:** 
1. Review old code to understand how it worked
2. Fix report name extraction
3. Fix file naming
4. Fix Google Sheets character limit issue
5. Add fallback UI
6. Add field validation
7. Fix PDF shortcut
