# Phase 5 Testing Issues - January 21, 2026

**Tester:** User  
**Date:** January 21, 2026  
**Status:** Issues Found - Needs Resolution

---

## 🐛 **Issues Found During Testing**

### **Step 5: Proximity & Content**

#### Issue #1: "Why This Property" Regenerates on Re-visit
- **Severity:** MEDIUM
- **Description:** If you go to Step 5, then forward, then back to Step 5 again, the "Why This Property" content regenerates itself
- **Impact:** Clunky user experience, wastes AI API calls
- **Status:** ⏳ Needs Fix
- **Note:** User says "it's a bit clunky this page but let's come back to that"

#### Issue #2: Validation Blocks Progress Despite All Fields Filled
- **Severity:** HIGH - BLOCKER
- **Description:** Form says "Please fill in all required fields" even though all fields are populated
- **Workaround:** Adding a space to "Why This Property" allows proceeding
- **Impact:** Users cannot proceed to Step 6
- **Status:** ⏳ Needs Fix

#### Issue #3: Investment Highlights Wrong Match
- **Severity:** HIGH
- **Description:** Property in Point Vernon (Harvey Bay) matched with SUNSHINE COAST report instead
- **Google Sheet:** Shows "SUNSHINE COAST" under REPORT NAME column
- **Question:** Did something else write to this sheet? Wrong lookup logic?
- **Status:** ⏳ Needs Investigation
- **Action:** Google search for help on this issue

#### Issue #4: Investment Highlights - Missing 7 Section Fields
- **Severity:** HIGH
- **Description:** The 7 individual section fields for editing are not visible on Step 5
- **Expected:** Should see fields for:
  1. Population Growth Context
  2. Residential
  3. Industrial
  4. Commercial and Civic
  5. Health and Education
  6. Transport
  7. Job Implications
- **Impact:** Cannot add/edit/delete additional lines for each section
- **Status:** ⏳ Needs Fix
- **Note:** This is Phase 4C-2 feature that's missing

#### Issue #5: Investment Highlights Value Transient
- **Severity:** HIGH
- **Description:** If you click "Next" without putting a value at the end of Investment Highlights, it won't let you proceed
- **Impact:** The big Investment Highlights text seems transient (disappears?)
- **Status:** ⏳ Needs Investigation
- **Action:** Google search for help on this issue

---

### **Step 6: Washington Brown Calculator**

#### Issue #6: Missing Price Indication
- **Severity:** MEDIUM
- **Description:** Should see a price indication for the property on Step 6
- **Expected:** Property price should be displayed prominently
- **Status:** ⏳ Needs Fix
- **Note:** Test page shows this correctly

#### ✅ Working: Parse Depreciation Values
- Parse button works correctly
- Populates Years 1-10 fields
- Can click "Next" to proceed to Step 7

---

### **Step 7: Cashflow Review & Folder Creation**

#### Issue #7: Too Many Editable Fields
- **Severity:** LOW
- **Description:** Too many fields are editable on the review page
- **Expected:** This is a review page, most fields should be read-only
- **Impact:** User might accidentally change values
- **Status:** ⏳ Needs Discussion
- **Note:** User says "ignoring that for the moment"

#### Issue #8: Folder Renamed, Files Not Renamed
- **Severity:** HIGH
- **Description:** 
  - Folder is renamed correctly (NEW naming convention working)
  - BUT files inside folder are NOT renamed
  - One of the cashflow spreadsheets was DELETED
- **Impact:** Files don't match folder name, missing spreadsheet
- **Status:** ⏳ Needs Fix

#### Issue #9: No Values Pasted to Spreadsheet
- **Severity:** CRITICAL - BLOCKER
- **Description:** When looking at values in the spreadsheet, NONE of the values were pasted to it
- **Impact:** All the form data is lost, spreadsheet is empty
- **Status:** ⏳ Needs Urgent Fix
- **Note:** This is the core functionality of Step 7

#### Issue #10: "Create Folder" Button Required Before Next
- **Severity:** INFO
- **Description:** User can only press "Next" after pressing "Create Folder and Populate Spreadsheet"
- **Status:** ✅ Working as designed
- **Note:** This is correct behavior

---

## 📊 **Summary by Severity**

### **CRITICAL (Blocks Core Functionality):**
1. Issue #9: No values pasted to spreadsheet

### **HIGH (Blocks User Progress):**
1. Issue #2: Validation blocks progress on Step 5
2. Issue #3: Investment Highlights wrong match (Sunshine Coast vs Point Vernon)
3. Issue #4: Missing 7 section fields for Investment Highlights
4. Issue #5: Investment Highlights value transient
5. Issue #8: Files not renamed, spreadsheet deleted

### **MEDIUM (Usability Issues):**
1. Issue #1: "Why This Property" regenerates on re-visit
2. Issue #6: Missing price indication on Step 6

### **LOW (Minor Issues):**
1. Issue #7: Too many editable fields on Step 7

---

## 🎯 **User's Request**

> "I think we should create requirements for each page (again as I spent hours doing this yesterday) so we can make a plan to resolve things"

**Action Items:**
1. Create detailed requirements document for each page (Steps 5, 6, 7, 8)
2. Document expected behavior vs actual behavior
3. Create a prioritized fix plan
4. Google search for help on Investment Highlights issues (#3, #5)

---

## 📝 **Next Steps**

1. **Immediate:** Create requirements documents for Steps 5-8
2. **High Priority:** Fix critical Issue #9 (spreadsheet population)
3. **High Priority:** Fix validation Issue #2 (Step 5 blocking)
4. **High Priority:** Fix Investment Highlights issues (#3, #4, #5)
5. **Medium Priority:** Fix Step 6 price indication
6. **Low Priority:** Fix "Why This Property" regeneration

---

## 🔍 **Questions for Investigation**

1. **Investment Highlights Match:** Why did Point Vernon match with Sunshine Coast report?
2. **Investment Highlights Transient:** Why does the value disappear?
3. **Spreadsheet Population:** Why are no values being pasted?
4. **File Renaming:** Why are files not renamed when folder is renamed?
5. **Spreadsheet Deletion:** Why was one cashflow spreadsheet deleted?

---

**Testing Session:** January 21, 2026  
**Tester:** User  
**Coordinator:** AI Assistant  
**Status:** Issues documented, awaiting requirements and fix plan
