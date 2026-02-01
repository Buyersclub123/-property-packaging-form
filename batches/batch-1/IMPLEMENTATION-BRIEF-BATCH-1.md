# Implementation Brief - Batch 1: Hotspotting Fixes

**Created:** Jan 23, 2026  
**For:** Implementation Chat  
**Estimated Effort:** 10-12 hours  
**Priority:** HIGH (P1)

---

## 🎯 OBJECTIVE

Fix 6 issues related to the Investment Highlights/Hotspotting functionality on Page 6 (Proximity & Content).

---

## 📋 ITEMS TO FIX

### **Item 1: Valid Period Extraction**
**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Current Behavior:**
- When system can't extract Valid Period from PDF metadata, it puts "could not obtain" in Google Sheet
- User sees unhelpful error message

**Expected Behavior:**
- Show friendly message: "We couldn't automatically extract the Valid Period"
- Provide input field with placeholder: "Please copy from front page (e.g., October 2025 - January 2026)"
- User can paste/type the correct value
- Save to Google Sheet with user-provided value

**Solution Requirements:**
- Update PDF metadata extraction error handling
- Add conditional UI: if extraction fails, show message + input field
- Validate format (optional but nice: check for month/year pattern)
- Pass user-provided value to save API

**Effort:** 2-3 hours

---

### **Item 2: File Naming (Remove Suburb Prefix)**
**Files:** 
- `src/app/api/investment-highlights/organize-pdf/route.ts`
- Any file naming logic

**Current Behavior:**
- Files named with suburb prefix: "Point Vernon Fraser Coast"
- Inconsistent naming

**Expected Behavior:**
- Files named with report name only: "Fraser Coast"
- Clean, consistent naming

**Solution Requirements:**
- Find where PDF files are renamed/organized
- Remove suburb prefix from filename
- Keep only report name (from metadata or user input)
- Ensure no duplicate names (add counter if needed: "Fraser Coast (2)")

**Effort:** 1 hour

---

### **Item 3: "Regional" in Heading**
**Context:** User reported seeing "Fraser Coast Regional" in email heading instead of just "Fraser Coast"

**Current Status:**
- This is a **Make.com issue**, NOT a form issue
- The form correctly sends "Fraser Coast Regional" (the LGA name from GHL)
- Make.com's `formatInvestmentHighlightsHtml()` function uses the first line as the region heading
- The LGA field contains "Fraser Coast Regional" (correct data)

**Expected Behavior:**
- Email should show "Fraser Coast" (without "Regional")

**Solution Requirements:**
- **DO NOT FIX IN FORM** - this is correct behavior
- **DOCUMENT ONLY**: Add note to this brief that the fix belongs in Make.com
- The fix is: Strip "Regional" from first line in Make.com's `MODULE-3-COMPLETE-FOR-MAKE.js`
- This item should be **CLOSED** in this batch (no form changes needed)

**Effort:** 0 hours (documentation only)

---

### **Item 4: Missing 7 Edit Fields**
**File:** `src/components/steps/step5/InvestmentHighlightsField.tsx`

**Current Behavior:**
- 7 individual section edit fields not showing
- User can't edit sections individually
- Fields should appear after AI summary generation

**Expected Behavior:**
- After PDF upload + AI summary generation, show 7 editable sections:
  1. Population Growth Context
  2. Residential
  3. Industrial
  4. Commercial and Civic
  5. Health and Education
  6. Transport
  7. Job Implications
- Each section has its own textarea
- Changes to sections auto-update the main body display
- "Save All Sections" button saves to Google Sheet

**Investigation Needed:**
- Check if `showSectionEditor` state is being set correctly
- Check if `handleGenerateSummary` is working
- Check if sections are being populated from AI response
- Verify the section editor UI is rendering (lines 859-989)

**Solution Requirements:**
- Debug why section editor isn't showing
- Ensure `showSectionEditor` state triggers after AI summary
- Verify all 7 textareas render correctly
- Test section changes update main body
- Test save functionality

**Effort:** 3-4 hours

---

### **Item 5: Auto-populate PDF Link**
**Files:**
- `src/components/steps/step5/InvestmentHighlightsField.tsx`
- `src/app/api/investment-highlights/organize-pdf/route.ts`

**Current Behavior:**
- PDF uploaded to Google Drive
- Link not automatically added to "Supporting Documents" folder link field

**Expected Behavior:**
- After PDF upload + organization, automatically populate the folder link field
- User doesn't have to manually add PDF link

**Solution Requirements:**
- After PDF is organized in Google Drive, get the folder URL
- Update form state to populate `folderLink` field
- Ensure link persists when form is submitted
- Link should go to the property's Google Drive folder (not just the PDF)

**Effort:** 2-3 hours

---

### **Item 6: Checkbox Retention (Page 6)**
**File:** `src/components/steps/Step5Proximity.tsx`

**Current Behavior:**
- "I have reviewed the content" checkbox doesn't retain when navigating back/forth
- User can skip content review

**Expected Behavior:**
- Checkbox state persists across navigation
- State saved in form store
- Validation works correctly

**Solution Requirements:**
- Verify checkbox is connected to form store (currently using local state)
- Check if `contentReviewed` is in formData schema
- Ensure state persists when navigating away and back
- Test validation on form submission

**Effort:** 1 hour

---

## 🔍 INVESTIGATION AREAS

### Files to Review:
1. `src/components/steps/step5/InvestmentHighlightsField.tsx` (main component)
2. `src/components/steps/Step5Proximity.tsx` (parent component)
3. `src/app/api/investment-highlights/organize-pdf/route.ts` (PDF organization)
4. `src/app/api/investment-highlights/generate-summary/route.ts` (AI summary)
5. `src/app/api/investment-highlights/save/route.ts` (Save to Google Sheet)
6. `src/store/formStore.ts` (form state management)

### Key Functions to Check:
- `handlePdfUpload()` - PDF upload flow
- `handleConfirmMetadata()` - Metadata confirmation
- `handleGenerateSummary()` - AI summary generation
- `handleSectionChange()` - Section editing
- `handleSaveSections()` - Save sections to sheet

---

## ✅ IMPLEMENTATION PROCESS

### Step 1: Propose Solution
- Read this brief thoroughly
- Review all files listed above
- Propose a solution for each item
- **STOP** - wait for Planning Agent approval

### Step 2: Get Approval
- Planning Agent will review your proposed solution
- May ask questions or request changes
- **DO NOT START CODING** until approved

### Step 3: Execute
- Implement approved solution
- Test each fix individually
- Test all fixes together
- Document any new issues found

### Step 4: Report Back
- Mark each item as complete
- Report any new issues discovered
- Provide testing notes

---

## 🚫 OUT OF SCOPE

These items are **NOT** part of this batch:
- Make.com email formatting (separate batch)
- Why This Property formatting (separate batch)
- Proximity formatting (separate batch)
- Photo Generator (separate project)

---

## 📝 NOTES FOR IMPLEMENTATION CHAT

1. **Item 3 (Regional in Heading)** is a Make.com issue, not a form issue. Just document this and close it.
2. **Item 4 (7 Edit Fields)** may require the most investigation - the code looks correct but isn't working.
3. **Item 5 (Auto-populate PDF)** needs coordination between PDF upload and form state.
4. **Item 6 (Checkbox)** is likely a simple state management fix.

---

## 🎯 SUCCESS CRITERIA

- [ ] Valid Period extraction shows friendly message + input field when extraction fails
- [ ] PDF files named with report name only (no suburb prefix)
- [ ] Item 3 documented as Make.com issue (no form changes)
- [ ] 7 section edit fields visible after AI summary generation
- [ ] PDF link auto-populates in folder link field after upload
- [ ] Checkbox state persists across navigation
- [ ] All fixes tested individually and together
- [ ] No new bugs introduced

---

**Ready to start? Read this brief, review the files, and propose your solution!**
