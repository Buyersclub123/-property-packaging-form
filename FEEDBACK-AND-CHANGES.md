# Feedback and Required Changes

## ✅ What's Correct

1. **Property Type:** New or Established - CORRECT ✓
2. **Individual or Multiple Lots:** Individual or Multiple - CORRECT ✓
3. **Due Diligence Warning:** "⚠️ Submission will be blocked if Due Diligence Acceptance is No" - GREAT ✓

---

## 🔴 Critical Changes Needed

### 1. Decision Tree (Step 0) - FIX VALUES

**Contract Type:** Should be dropdown with these EXACT values:
- 01 H&L Comms
- 02 Single Comms
- 03 Internal with Comms
- 04 Internal No-Comms
- 05 Established

**MISSING Questions:**
- "Is this single or dual occupancy?" (Yes/No dropdown)
- "What status to open it in?" (Dropdown with status options)

---

### 2. Address Page - REORDER TO FIRST PAGE

**Should be FIRST page** (before Decision Tree)

**Content:**
- Address field (for Stash check)
- Output of Stash data received (may stop person from packaging)
- Confirm LGA on this page
- **ERROR TO FIX:** "Invalid response format - received module reference instead of data"
  - Need to fix Stash API response parsing

---

### 3. Property Risk Overlays - COMBINE WITH ADDRESS PAGE

**Should go on FIRST page** (combine with Address)

**Changes:**
- "Continue with packaging" button
  - Enables other pages
  - Creates folder for documents
- Dialogue boxes:
  - Need to be **multiline** (textarea)
  - Should **grow with text**
- Yes/No questions: **Mandatory**
- Dialogue boxes: **Not mandatory** BUT warning if Yes but no dialogue (can be passed)

---

### 4. Comparables Check - REMOVE OR SIMPLIFY

**Options:**
- Remove page entirely, OR
- Discreet message when folder created: "Please save CMI reports in the created folder"

---

### 5. Market Performance - COMBINE WITH DATA COLLECTION

**GoogleSheet Details:**
- Name: Property Review Static Data - Market Performance
- Link: https://docs.google.com/spreadsheets/d/1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY/edit?usp=sharing
- Tab: Market Performance
- Headers: A-L

**Column Mapping:**
- A: Suburb Name
- B: State
- C: Data Source
- D: Date Collected / Checked
- E: Median price change - 3 months
- F: Median price change - 1 year
- G: Median price change - 3 year
- H: Median price change - 5 year
- I: Median yield
- J: Median rent change - 1 year
- K: Rental Population
- L: Vacancy Rate

**Data Collection:** Combine with Market Performance page (not separate step)

---

## 📋 New Form Flow

**Step 0:** Address + Stash Check + Risk Overlays + LGA Confirmation + "Continue with packaging" button
**Step 1:** Decision Tree (Property Type, Contract Type, Individual/Multiple, Single/Dual Occupancy, Status)
**Step 2:** Market Performance (with data collection if needed)
**Step 3:** Property Details
**Step 4:** Review & Submit

---

## 🐛 Bugs to Fix

1. **Stash API Error:** "Invalid response format - received module reference instead of data"
   - Fix response parsing in `src/lib/stash.ts`
   - Handle case where response is just "7" (module reference)

2. **Dialogue Boxes:** Change from input to textarea (multiline, grows with text)

3. **Validation:** Yes/No mandatory, dialogue warning if Yes but no dialogue

---

## ✅ Next Steps

1. Fix Contract Type dropdown values
2. Add missing questions (Single/Dual Occupancy, Status)
3. Reorder steps (Address first)
4. Combine Address + Risk Overlays on first page
5. Fix Stash API response parsing
6. Change dialogue inputs to textareas
7. Add "Continue with packaging" button
8. Remove/simplify Comparables page
9. Combine Market Performance with Data Collection
10. Add Google Sheets integration for Market Performance







