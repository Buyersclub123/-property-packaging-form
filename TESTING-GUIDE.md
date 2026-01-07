# Testing Guide - Step by Step

## Setup

1. **Install dependencies:**
   ```bash
   cd property-review-system/form-app
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   Navigate to http://localhost:3000

## Test Checklist

### ✅ Step 0: Decision Tree

**Test:**
1. Select "New" for Property Type
2. Select "H&L" for Contract Type
3. Select "Multiple" for Lot Type
4. **Expected:** Subject line preview shows: "New H&L Project - [Suburb] - [Lots Available]"

**Test different combinations:**
- New + H&L + Individual → "New H&L - [Suburb] - [Price]"
- New + Single + Individual → "New Build - [Suburb] - [Price]"
- Established + Any + Individual → "Established Property - [Suburb] - [Price]"

**Verify:**
- ✅ All dropdowns work
- ✅ Subject line updates correctly
- ✅ Can proceed to next step

---

### ✅ Step 1: Address Entry

**Test Basic Functionality:**
1. Enter address: "4 Osborne Circuit Maroochydore QLD 4558"
2. Click "Check Stash" button
3. **Expected:** Loading indicator appears, then either:
   - Success: Address fields auto-populate
   - Error: Error message shown, but form still works

**Test Manual Entry:**
1. Enter address manually
2. Fill in Street Number, Street Name, Suburb, State, Post Code
3. **Expected:** All fields save correctly

**Test Persistence:**
1. Fill in address
2. Refresh page (F5)
3. **Expected:** Address data is still there

**Verify:**
- ✅ Address input works
- ✅ "Check Stash" button calls API
- ✅ Loading state shows
- ✅ Error handling works (form continues if API fails)
- ✅ Google Maps link generates
- ✅ Data persists on refresh

---

### ✅ Step 2: Risk Overlays

**Test Auto-Population (if Stash worked):**
1. If Step 1 got Stash data, verify:
   - Zoning field auto-populated
   - Flood dropdown shows Stash value
   - Bushfire dropdown shows Stash value

**Test Manual Overrides:**
1. Change Flood from "No" to "Yes"
2. **Expected:** Dialogue text field appears
3. Enter dialogue text
4. **Expected:** Text saves

**Test All Overlays:**
1. Set each overlay to "Yes" one by one
2. **Expected:** Dialogue field appears for each
3. Enter text in each dialogue
4. **Expected:** All text saves

**Test "Set All Overlays to No" Button:**
1. Set some overlays to "Yes"
2. Click "Set All Overlays to No"
3. **Expected:** All overlays reset to "No"

**Test Due Diligence Acceptance:**
1. Set to "No"
2. **Expected:** Warning message appears
3. Set to "Yes"
4. **Expected:** Warning disappears

**Verify:**
- ✅ Auto-population works (if Stash data available)
- ✅ Manual override works
- ✅ Dialogue fields appear/disappear correctly
- ✅ Bulk action button works
- ✅ Due Diligence warning shows
- ✅ Data persists on refresh

---

### ✅ Navigation & State Management

**Test Step Navigation:**
1. Go through all steps using "Next" and "Previous" buttons
2. **Expected:** Steps change correctly
3. **Expected:** Step indicators update (active/completed)

**Test Data Persistence:**
1. Fill in data in Step 0, 1, 2
2. Refresh page
3. **Expected:** All data still there
4. **Expected:** Current step remembered

**Test Browser Back/Forward:**
1. Navigate through steps
2. Use browser back button
3. **Expected:** Form state maintained (might need to handle this)

**Verify:**
- ✅ Step navigation works smoothly
- ✅ Step indicators show correct state
- ✅ Data persists across refreshes
- ✅ Can go back and edit previous steps

---

## Known Issues to Check

1. **Stash API Response:**
   - If response is just "7" (module reference), error should show
   - Form should continue working without Stash data

2. **TypeScript Errors:**
   - Check browser console for any TypeScript errors
   - Check terminal for build errors

3. **Styling:**
   - Check if Tailwind CSS is working
   - Check if buttons/styles look correct

## What to Report

If you find any issues, note:
1. **What step** you were on
2. **What you did**
3. **What you expected**
4. **What actually happened**
5. **Browser console errors** (if any)
6. **Terminal errors** (if any)

## Next Steps After Testing

Once Step 0-2 are 100% working:
- We'll move to Step 4 (Market Performance)
- Then Step 6 (Property Details)
- Then Step 7 (Review & Submit)







