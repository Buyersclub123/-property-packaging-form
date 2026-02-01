# Investment Highlights Phase 1 - Test Checklist

**Date:** January 22, 2026  
**Tester:** ___________  
**Dev Server:** http://localhost:3000

---

## Pre-Test Setup

- [ ] Dev server running (`npm run dev`)
- [ ] Navigate to form: http://localhost:3000
- [ ] Start new property review

---

## Test 1: Auto-Match Found (Existing Suburb)

**Goal:** Verify auto-lookup works and shows date status

**Steps:**
1. [ ] Enter property details on Step 1-4
2. [ ] Use a suburb that EXISTS in Google Sheet (e.g., "Petersham, NSW" or "Point Vernon, QLD")
3. [ ] Navigate to Step 5 (Investment Highlights)

**Expected Results:**
- [ ] Green "Match Found!" box appears
- [ ] Report name displayed (e.g., "INNER WEST LGA")
- [ ] Valid Period displayed (e.g., "SEPTEMBER - DECEMBER 2025")
- [ ] Date status shown (Current / Expiring Soon / Expired)
- [ ] Investment Highlights field auto-populated with content

**Notes:**
_______________________________________________________________

---

## Test 2: No Match - Dropdown Appears

**Goal:** Verify dropdown appears when no match found

**Steps:**
1. [ ] Enter property details on Step 1-4
2. [ ] Use a suburb that DOES NOT exist in Google Sheet (e.g., "Fake Suburb, NSW")
3. [ ] Navigate to Step 5 (Investment Highlights)

**Expected Results:**
- [ ] Yellow "No Match Found" box appears
- [ ] Message: "No existing report for [Suburb], [State]"
- [ ] Searchable dropdown visible below message
- [ ] Placeholder text: "Search for a Hotspotting report..."

**Notes:**
_______________________________________________________________

---

## Test 3: Search Dropdown by Report Name

**Goal:** Verify search functionality works

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Click into dropdown search box
3. [ ] Type "Inner West" (or another report name)

**Expected Results:**
- [ ] Dropdown opens showing filtered results
- [ ] Only reports matching "Inner West" shown
- [ ] Reports grouped by state (NSW, QLD, etc.)
- [ ] Each report shows:
  - [ ] Display name
  - [ ] Valid period
  - [ ] Covered suburbs (first 3)
  - [ ] Status badge (Current/Expiring/Expired)

**Notes:**
_______________________________________________________________

---

## Test 4: Search Dropdown by State

**Goal:** Verify state filtering works

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Clear search box
3. [ ] Type "NSW" or "QLD"

**Expected Results:**
- [ ] Only reports from that state shown
- [ ] State header visible (e.g., "NSW")
- [ ] Reports sorted alphabetically

**Notes:**
_______________________________________________________________

---

## Test 5: Search Dropdown by Suburb

**Goal:** Verify suburb filtering works

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Clear search box
3. [ ] Type a suburb name (e.g., "Petersham" or "Maroochydore")

**Expected Results:**
- [ ] Reports covering that suburb shown
- [ ] Suburb visible in "Covers: ..." text
- [ ] Other reports filtered out

**Notes:**
_______________________________________________________________

---

## Test 6: Select Report from Dropdown

**Goal:** Verify report selection populates fields

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Search for a report (e.g., "Inner West")
3. [ ] Click on a report in the dropdown

**Expected Results:**
- [ ] Dropdown closes
- [ ] Green "Match Found!" box appears
- [ ] Report name displayed
- [ ] Valid Period displayed
- [ ] Investment Highlights field populated with content
- [ ] Date status shown (if applicable)

**Notes:**
_______________________________________________________________

---

## Test 7: Keyboard Navigation

**Goal:** Verify keyboard controls work

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Click into dropdown search box
3. [ ] Press Arrow Down key multiple times

**Expected Results:**
- [ ] Highlighted report changes (blue background)
- [ ] Arrow Up moves selection up
- [ ] Arrow Down moves selection down
- [ ] Enter key selects highlighted report
- [ ] Escape key closes dropdown

**Notes:**
_______________________________________________________________

---

## Test 8: Date Status - Current Report

**Goal:** Verify "Current" status displays correctly

**Steps:**
1. [ ] Find a report with Valid Period in the future (e.g., "DECEMBER 2025" or later)
2. [ ] Select it from dropdown or auto-match

**Expected Results:**
- [ ] Green "Match Found!" box
- [ ] NO warning message (report is current)
- [ ] Date status shows: "Valid until [DATE] (X months remaining)"

**Notes:**
_______________________________________________________________

---

## Test 9: Date Status - Expired Report

**Goal:** Verify "Expired" warning displays

**Steps:**
1. [ ] Find a report with Valid Period in the past (e.g., "SEPTEMBER 2024")
2. [ ] Select it from dropdown or auto-match

**Expected Results:**
- [ ] Green "Match Found!" box appears
- [ ] Red "Report Out of Date" warning box appears below
- [ ] Warning icon visible
- [ ] Message: "Expired X days ago"
- [ ] Link to Hotspotting Membership visible

**Notes:**
_______________________________________________________________

---

## Test 10: Date Status - Expiring Soon

**Goal:** Verify "Expiring Soon" warning displays

**Steps:**
1. [ ] Find a report expiring within 30 days
2. [ ] Select it from dropdown or auto-match

**Expected Results:**
- [ ] Green "Match Found!" box appears
- [ ] Yellow "Report Expiring Soon" warning box appears below
- [ ] Clock icon visible
- [ ] Message: "Expires in X days"

**Notes:**
_______________________________________________________________

---

## Test 11: API Direct Test (Optional)

**Goal:** Verify API endpoint works directly

**Steps:**
1. [ ] Open browser to: http://localhost:3000/api/investment-highlights/list-reports
2. [ ] Review JSON response

**Expected Results:**
- [ ] JSON response with `success: true`
- [ ] `reports` object with states as keys
- [ ] Each report has: fileId, displayName, reportName, state, validPeriod, suburbs, dateStatus
- [ ] `states` array with sorted state codes
- [ ] `totalReports` count

**Notes:**
_______________________________________________________________

---

## Test 12: Click Outside to Close

**Goal:** Verify dropdown closes when clicking outside

**Steps:**
1. [ ] From Test 2 (no match scenario)
2. [ ] Click into dropdown (opens)
3. [ ] Click anywhere outside the dropdown

**Expected Results:**
- [ ] Dropdown closes
- [ ] Search text remains in input

**Notes:**
_______________________________________________________________

---

## Test 13: Loading States

**Goal:** Verify loading indicators work

**Steps:**
1. [ ] Navigate to Step 5
2. [ ] Watch for loading indicators during auto-lookup

**Expected Results:**
- [ ] "Checking..." or loading indicator visible during lookup
- [ ] Dropdown disabled while loading
- [ ] Loading completes and shows result

**Notes:**
_______________________________________________________________

---

## Test 14: Error Handling

**Goal:** Verify error messages display

**Steps:**
1. [ ] Stop dev server (simulate API failure)
2. [ ] Try to use dropdown

**Expected Results:**
- [ ] Error message displayed
- [ ] "Try again" button visible
- [ ] Clicking "Try again" retries API call

**Notes:**
_______________________________________________________________

---

## Summary

**Total Tests:** 14  
**Passed:** ___  
**Failed:** ___  
**Blocked:** ___

**Critical Issues Found:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Minor Issues Found:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Overall Status:** ✅ PASS / ❌ FAIL / ⚠️ NEEDS WORK

---

**Tester Signature:** ___________  
**Date Completed:** ___________
