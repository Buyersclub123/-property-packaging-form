# Immediate Fixes - Requirements & Current Behavior

**Created:** Jan 23, 2026  
**Last Updated:** Jan 23, 2026  
**Status:** 🔄 IN PROGRESS  
**Total Items:** 11 (from original list)

---

## 📊 PROGRESS TRACKER

### Batch 1: Hotspotting Fixes (3-4 hours)
- [ ] Item 1: Hotspotting File Naming - **STATUS:** Not Started
- [ ] Item 2: Hotspotting Valid Period Extraction - **STATUS:** Not Started
- [ ] Batch 1 Testing Complete
- [ ] Batch 1 Deployed

### Batch 2: Page 6 Output & Formatting (6-8 hours)
- [ ] ChatGPT Analysis Complete - **STATUS:** In Progress ⏳ (Investment Highlights prompt ready)
- [ ] Item 3: Investment Highlights "Regional" - **STATUS:** Awaiting ChatGPT analysis
- [ ] Item 4: Investment Highlights 7 Edit Fields - **STATUS:** Not Started
- [ ] Item 5: Email Formatting - **STATUS:** Not Started
- [ ] Item 6: Investment Highlights Output - **STATUS:** Awaiting ChatGPT analysis
- [ ] Item 7: Why This Property Output - **STATUS:** Not Started
- [ ] Batch 2 Testing Complete
- [ ] Batch 2 Deployed

### Batch 3: UI/UX Polish (2-3 hours)
- [ ] Item 8: Page 6 Checkbox Retention - **STATUS:** Not Started
- [ ] Item 9: Hide Proximity Error - **STATUS:** Not Started
- [ ] Item 10: Add PDF to Folder - **STATUS:** Not Started
- [ ] Item 11: Fix Test Page Syntax - **STATUS:** Not Started
- [ ] Batch 3 Testing Complete
- [ ] Batch 3 Deployed

### New Issues Found During Implementation
*(Issues discovered while working will be added here)*

---

## 🔥 HIGH PRIORITY BUGS (P1)

### 1. Page 6 (Proximity & Content) - Checkbox Not Retained

**Current Behavior:**
- Review checkbox doesn't retain when navigating back/forth between pages
- User can skip content review without system catching it - 

**Expected Behavior:**
- Checkbox state should persist across navigation
- Validation should work reliably

**Solution:**
- Add carriage return instead of just space to ensure validation never fails
- Ensure checkbox state is properly saved to form store

**Effort:** 1 hour  
**Impact:** Users can skip content review (data quality issue)
LETS TRY IT. WHEN DOES THE CARRIAGE RETURN GET ADDED? IT NEEDS TO BE AFTER THE FIELDS HAVE POPULATED, SHOULD BE WHEN WE CLICK THE TICK BOX (TELL ME IDS S BETTER SOLUTION AVAILABLE)
---

### 2. Hotspotting Report - Valid Period Extraction

**Current Behavior:**
- When system can't extract Valid Period from PDF, it puts "could not obtain" in the spreadsheet
- User has no way to manually provide this data
- Results in incomplete data

**Expected Behavior:**
- If extraction fails, show friendly message to user
- Provide input field for user to manually paste Valid Period from front page of report
- Save manually entered data to spreadsheet

**Solution:**
- Add error handling for extraction failure
- Create UI component with message + input field
- Update spreadsheet logic to accept manual input

**Effort:** 2-3 hours  
**Impact:** Better UX, complete data
WHAT OTHER THINGS GET ENTERED INTOO THE GOOGLE SHEET IF THERE IS AN ERROR OR DATA NOT AVAILABKE AS WE SHOJLD REVIEW THEM, WE SHOLD CONSIDER IF THERE IS AN ERRO IN ONE OF THE FIELDS FOR HOTPOSTTING REPORT ALL THE VALUES ARE DELETED SO IT CANNOT GIVE POOOR DATA TO THE NEXT USER WHO ENTERS A SUBURB FOR THAT HOTSPOTTING REPORT< THE SYSTEM SHOULD FORCE THE CURRENT USER TO PASTE IN THE VALULES NEEDED>
---

### 3. Hotspotting Report - File Naming

**Current Behavior:**
- Files are named with suburb prefix (e.g., "Point Vernon Fraser Coast")
- Inconsistent naming convention

**Expected Behavior:**
- Remove suburb prefix from file names
- Use only report name (e.g., "Fraser Coast")
- Consistent, cleaner naming

**Solution:**
- Update file naming logic in hotspotting upload/processing
- Strip suburb prefix before saving

**Effort:** 1 hour  
**Impact:** Cleaner file naming, better organization
ITS ALSO ADDING A DATE AT THE END OF THE NAME "Point Vernon-QLD-Fraser Coast (6)-2026-01-22" AND RETAININ THE (x) value shown when multiples of the same document have been downloaded, Can easily stripe this? 
---

### 4. Investment Highlights - Missing 7 Edit Fields

**Current Behavior:**
- 7 individual section edit fields are not showing on the page
- User cannot edit individual sections of Investment Highlights
- Only bulk edit available

**Expected Behavior:**
- Each of the 7 sections should have its own edit field
- User can edit sections individually
- Changes save properly

**User Note:** "I understand the confusion with this now"

**Solution:**
- Add 7 individual edit fields for each Investment Highlights section
- Ensure proper state management for each field
- Test save/load functionality

**Effort:** 3-4 hours  
**Impact:** Can't edit individual sections 
IN THE GOOGLE SHEET THERE ARE 7 COLUMNS, 1 FOR EACH OF THE 7 CSTEGORIES THIS WERE MEAN TO RETSIN THE ADDITIONAL DIALOGUE WE WANTED TO BE ABLE TO ADD TO ANY SECTION. THERE SHOULD BE 7 FIELDS UNDERNEATH THE INVETMENT HIGHLHTS FIELD ON PAGE 6 - ALLOWING SOMEONE TO ADD EXTRA DIALOGE / SENTENCE TO THAT SECTION AND IT WOUJLD BE SAVED IN THE CORRESPONDING COLUMN IN THE GOOGLE SHEET CURRENTLY THE GOOOGLE SHEET IS SPLITTING OUT THE COMBINED OUTPUT INTO SECTIONS IN THE GOGOLESHEET. THIS MEANS NEXT TIME IS PACKAGHING A PROPERTY WHICH HAS THE SAME HOTSPOTTING REPORT -THEY CAN SEE THE ADDITIONAL COMMENTARY ALLOWING THEM TO EDIT. DELETE. OR ADD ADDITIONAL DIALOGUE (WOULD NEED TO IDENTIFY HOW TO IDENTIFY A 2ND SENTENC CSRRIOAGE RETURN MAKES MOST SENSE) 

### 5. Investment Highlights - "Regional" in Heading

**Current Behavior:**
- Heading shows "Fraser Coast Regional" instead of "Fraser Coast"
- "Regional" is being added somewhere in the extraction logic
- Incorrect/unwanted text in heading

**Expected Behavior:**
- Heading should show only the LGA name without "Regional"
- Example: "Fraser Coast" not "Fraser Coast Regional"

**Solution:**
- Check extraction logic in Investment Highlights processing
- Remove or strip "Regional" suffix
- Test with multiple LGAs

**Effort:** 1-2 hours  
**Impact:** Incorrect heading (looks unprofessional)
LETS GIVE THE LOGIC WE ARE USING TO CREATE THE OUTPUT ALONG WITH AN EXMAPLE OF THE OUTPUT TO THE CHATGOT TOOL WE CURRENTLY USE AND ASK WHAT WE ARE DOING WRONG
---

### 6. Email Formatting Breaking

**Current Behavior:**
- Form sends data to Make.com that breaks email formatting
- Emails are not displaying correctly
- Possibly related to special characters, line breaks, or data structure

**Expected Behavior:**
- Data sent to Make.com should maintain proper formatting
- Emails should display correctly with proper structure
- No broken formatting in client-facing emails

**Solution:**
- Investigate what form does to data before sending
- Check for special characters, escape sequences, line breaks
- Test email output with various data inputs
- Fix data transformation/sanitization

**Effort:** 4-6 hours  
**Impact:** Broken email formatting (client-facing issue)
LETS GIVE THE LOGIC WE ARE USING TO CREATE THE OUTPUT ON PAGE 6 ALONG WITH AN EXMAPLE OF THE OUTPUT TO THE CHATGOT TOOL WE CURRENTLY USE AND ASK WHAT WE ARE DOING WRONG
WE CAN ALSO LOOK AT THE LOGIC WE HAVE IN THE MAKE.COM SCENARIOS TO SEE HOW IT DEALS WITH THE DATA AND HOW IT LOSELY EXPECTS TO RECEIVE IT
---

### 7. Add Hotspotting PDF to Property Folder

**Current Behavior:**
- When property folder is created, Hotspotting PDF is not added
- Users have to manually add the PDF to the folder
- Extra manual work, potential for forgetting

**Expected Behavior:**
- When folder is created, automatically add Hotspotting PDF link/shortcut
- PDF should be accessible from property folder
- No manual intervention needed

**Solution:**
- Update folder creation logic
- Add PDF link/shortcut when folder is created
- Test with various folder structures

**Effort:** 2-3 hours  
**Impact:** Users have to manually add PDF (inefficient workflow)
LETS TO THIS TOWARDS THE END OF THIS BODY OR WORK AS NEED TO ADRRESSS THE NAMING FIRST
---

## 🔧 MEDIUM PRIORITY FIXES (P2)

### 8. Hide Proximity Error if Pre-fetched Data Exists

**Current Behavior:**
- Error message shows even when pre-fetched data exists and field works
- Confusing to users - they see error but everything works fine

**Expected Behavior:**
- If pre-fetched data exists and field is working, hide error message
- Only show error if there's an actual problem
- Clear, accurate status indicators

**Solution:**
- Add conditional logic to check if pre-fetched data exists
- Hide error message when data is valid
- Keep error for genuine failures

**Effort:** 30 minutes  
**Impact:** Better UX, less user confusion
LETS REVIEW CURRENT RULES AND WHY IT IS DOIG IT - WHEN WE CLCK RETRY IT HAS ALWAYS THE WORKED SO PERHAPS WE JUST NEED A MORE FRIENDLY BUTTON SHOULDL IT HAPPEN THER USER HAS A CALM " JUST CLICK HERE TO TRY AGAIN" MESSAGE
---

### 9. Fix Test Page Syntax Error

**Current Behavior:**
- `/test-proximity` page has JSX syntax error
- Can't test proximity automation
- Development/testing blocked

**Expected Behavior:**
- Test page should load without errors
- Can test proximity functionality
- Development tools work properly

**User Note:** "I THINK THIS IS CLOSED, THE P1 ISSUE FOR KNOCKING THE DATA OUT OF INVESTMENT HIGHLIGHTS IS IN PLAY NOW> OR IS THIS THE TIMING ISSUE WHEN YOU ENTER THAT PAGE?"

**Solution:**
- Fix JSX syntax error on test page
- Verify test page functionality
- Ensure no related timing issues

**Effort:** 30 minutes  
**Impact:** Can't test proximity automation
LETS TAKE NOTICE AS WE GO TEST THE CHANGESD WE MAMKE ABOVE TO SEE WHAT HAPPENS 
---

## 📊 ANALYSIS & OUTPUT IMPROVEMENTS (P3)

### 10. Investment Highlights Output Analysis

**Current Behavior:**
- Investment Highlights output format may not be optimal
- Need to verify formatting meets requirements

**Expected Behavior:**
- Output should be properly formatted
- Consistent with business requirements
- Professional appearance

**Solution:**
- Run current output through ChatGPT analysis tool
- Identify formatting issues
- Dial in format based on analysis
- Implement improvements

**Effort:** 2-3 hours  
**Impact:** Better formatted output (quality improvement)

---IMMEDIATE ACTION IS TO GIVE CHATgot CURRENT CODE/LOGIC WITH AN EXAMPLE OF THE OUTPUT TO SEE WHAT IT SAYS 

### 11. Why This Property Output Analysis

**Current Behavior:**
- "Why This Property" output formatting "seems weird"
- May not be displaying as intended

**Expected Behavior:**
- Output should be properly formatted
- Clear, professional presentation
- Consistent formatting

**Solution:**
- Run current output through ChatGPT analysis tool
- Identify what's "weird" about formatting
- Fix formatting issues
- Test with various inputs

**Effort:** 2-3 hours  
**Impact:** Better formatted output (quality improvement)
IMMEDIATE ACTION IS TO GIVE CHATgot CURRENT CODE/LOGIC WITH AN EXAMPLE OF THE OUTPUT TO SEE WHAT IT SAYS 
---

## 🚀 NEW FEATURES (P3)

### 12. Photo Document Generator

**Current Behavior:**
- No automated photo document generation
- Manual process for creating photo documents

**Expected Behavior:**
- Drag photos into upload box (similar to hotspotting report upload)
- System auto-generates photo document
- Saves to property folder

**Solution:**
- Research photo document format requirements
- Design drag/drop interface (similar to hotspotting)
- Implement photo processing logic
- Create document generation functionality
- Test with various photo formats/sizes

**Effort:** 12-16 hours (research + implementation)  
**Impact:** Automated photo document creation (major workflow improvement)
LETS GIVE ANTHER CHAT THIS ACTIVITY TO DO
---

## ✅ ITEMS CLOSED (Moved to Archive)

1. ✅ **Fix Step 5 field clearing issue** - Tentatively fixed, on test checklist
2. ✅ **Remove CMI Reports Notice from Page 1** - Complete
3. ✅ **Phase 5: 3-Step Flow** - Complete

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Quick Wins (2-4 hours total)
1. Hotspotting Report - File Naming (1 hour)
2. Hide Proximity Error (30 min)
3. Fix Test Page Syntax Error (30 min)
4. Page 6 Checkbox Retention (1 hour)

### Phase 2: Medium Complexity (8-12 hours total)
5. Hotspotting Report - Valid Period Extraction (2-3 hours)
6. Investment Highlights - "Regional" in Heading (1-2 hours)
7. Add Hotspotting PDF to Property Folder (2-3 hours)
8. Investment Highlights - Missing 7 Edit Fields (3-4 hours)

### Phase 3: Complex Issues (6-8 hours total)
9. Email Formatting Breaking (4-6 hours)
10. Investment Highlights Output Analysis (2-3 hours)
11. Why This Property Output Analysis (2-3 hours)

### Phase 4: New Features (12-16 hours)
12. Photo Document Generator (12-16 hours)

---

## ✅ TESTING CHECKLIST

Items to test after fixes:
- [ ] Step 5 field clearing issue (tentatively fixed)
- [ ] Market Performance check buttons (especially with no pre-existing data)
- [ ] Body corp fields (pages 6-9)
- [ ] Owner Corp dropdown and field display
- [ ] Price group calculation for multi-lot
- [ ] Module 9 parent record behavior
- [ ] Project address vs property address (Route 2 Module 22)

---

---

## 📝 UPDATED REQUIREMENTS & NOTES

### Item 1: Page 6 Checkbox
**Question:** When does the carriage return get added? It needs to be after the fields have populated, should be when we click the tick box (tell me if a better solution is available)

### Item 2: Hotspotting Valid Period
**Additional Requirements:**
- Review ALL fields that get "error" or "not available" values in Google Sheet
- If ANY field has an error, DELETE all values for that Hotspotting report from sheet
- Force current user to paste in all required values
- Prevents poor data being used by next user for that suburb/report

### Item 3: Hotspotting File Naming
**Additional Issues:**
- Also adding date at end: "Point Vernon-QLD-Fraser Coast (6)-2026-01-22"
- Retaining (x) value from multiple downloads
- Can we easily strip these?

### Item 4: Investment Highlights - 7 Edit Fields
**Detailed Explanation:**
- Google Sheet has 7 columns (1 per category) to retain additional dialogue
- 7 fields should appear UNDERNEATH Investment Highlights field on Page 6
- Allows adding extra dialogue/sentence to each section
- Saves to corresponding column in Google Sheet
- Currently: System splits combined output into sections in Google Sheet
- Purpose: Next time packaging property with same Hotspotting report, they can see additional commentary and edit/delete/add more
- Need to identify 2nd sentence (carriage return makes most sense)

### Item 5: Investment Highlights "Regional"
**Action:** Give ChatGPT tool the logic we use to create output + example output, ask what we're doing wrong

### Item 6: Email Formatting Breaking
**Actions:**
1. Give ChatGPT tool the logic from Page 6 + example output, ask what we're doing wrong
2. Review Make.com scenario logic to see how it deals with data and how it expects to receive it

### Item 7: Hotspotting PDF to Folder
**Note:** Do this towards the END of this body of work (need to address naming first)

### Item 8: Hide Proximity Error
**Action:** Review current rules and why it's doing it. When we click retry it always works, so perhaps just need friendlier button/message: "Just click here to try again"

### Item 9: Test Page Syntax Error
**Note:** Take notice as we test the changes we make above to see what happens

### Items 10 & 11: Output Analysis
**Immediate Action:** Give ChatGPT current code/logic with example output to see what it says

### Item 12: Photo Document Generator
**Note:** Give another chat this activity to do

---

## 🔄 WORKFLOW

### As We Complete Each Item:
1. ✅ Mark item as complete in Progress Tracker above
2. ✅ Update status from "Not Started" → "In Progress" → "Complete"
3. ✅ Document any issues found
4. ✅ Add new issues to "New Issues Found" section

### As We Complete Each Batch:
1. ✅ Mark batch testing complete
2. ✅ Mark batch deployed
3. ✅ Move to next batch

### When All Batches Complete:
1. ✅ Mark this document status as "COMPLETE"
2. ✅ Review PRIORITY-CHECKLIST.md for remaining items
3. ✅ Create new IMMEDIATE-FIXES-REQUIREMENTS-02.md for next batch
4. ✅ Repeat process

---

## 📝 TEMPLATE FOR NEW ISSUES

When we find new issues during implementation, add them here:

```
### NEW ISSUE: [Short Description]
**Discovered:** [Date]
**During:** [Which item/batch we were working on]
**Problem:** [What's wrong]
**Impact:** [How it affects users]
**Priority:** [P1/P2/P3]
**Estimated Effort:** [Time estimate]
**Action:** [Add to current batch / Add to next batch / Add to Priority Checklist]
```

---

**Next Steps:**
1. ✅ Clean up document (DONE)
2. ✅ Update PRIORITY-CHECKLIST.md (DONE)
3. ✅ Get ChatGPT prompts for Page 6 output review (DONE)
4. ✅ Get prompt for Photo Document Generator planning (DONE)
5. ✅ Create implementation plan (DONE)
6. 🔄 START BATCH 1 IMPLEMENTATION
