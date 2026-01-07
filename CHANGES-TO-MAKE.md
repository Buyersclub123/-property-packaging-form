# Changes to Make - Summary

## 🎯 Priority Order

### 1. Fix Stash API Response Error (CRITICAL)
**Error:** "Invalid response format - received module reference instead of data"
**File:** `src/lib/stash.ts`
**Issue:** Response is returning "7" (module reference) instead of actual data
**Fix:** Need to handle Make.com webhook response format - might need to check Make.com execution logs to see actual response structure

---

### 2. Reorder Steps (HIGH PRIORITY)
**Current:** Step 0 = Decision Tree, Step 1 = Address
**New:** Step 0 = Address + Stash + Risk Overlays, Step 1 = Decision Tree

---

### 3. Fix Decision Tree Values (HIGH PRIORITY)
**Contract Type:** Change to:
- 01 H&L Comms
- 02 Single Comms
- 03 Internal with Comms
- 04 Internal No-Comms
- 05 Established

**Add Missing Questions:**
- "Is this single or dual occupancy?" (Yes/No)
- "What status to open it in?" (Dropdown: 01 Available, 02 EOI, 03 Contr' Exchanged, 05 Remove no interest, 06 Remove lost)

---

### 4. Combine Address + Risk Overlays (HIGH PRIORITY)
**New Step 0 should include:**
- Address field
- Stash check button
- Stash data output
- LGA confirmation
- Risk Overlays (all of them)
- "Continue with packaging" button (creates folder, enables next steps)

---

### 5. Fix Dialogue Boxes (MEDIUM PRIORITY)
**Change:** Input fields → Textarea (multiline)
**Behavior:** Grow with text
**Validation:** 
- Yes/No = Mandatory
- Dialogue = Not mandatory BUT warning if Yes but no dialogue (can be passed)

---

### 6. Remove/Simplify Comparables (LOW PRIORITY)
**Option A:** Remove page entirely
**Option B:** Show discreet message when folder created: "Please save CMI reports in the created folder"

---

### 7. Combine Market Performance + Data Collection (MEDIUM PRIORITY)
**GoogleSheet:** Property Review Static Data
**Link:** https://docs.google.com/spreadsheets/d/1M_en0zLhJK6bQMNfZDGzEmPDMwtb3BksvgOsm8N3tlY/edit?usp=sharing
**Tab:** Market Performance
**Columns:** A-L (see FEEDBACK-AND-CHANGES.md for details)

---

## 📝 Status Options (for Decision Tree)

**Status Dropdown Values:**
- 01 Available
- 02 EOI
- 03 Contr' Exchanged
- 05 Remove no interest
- 06 Remove lost

---

## 🔧 Files to Update

1. `src/components/steps/Step0DecisionTree.tsx` - Fix Contract Type, add questions
2. `src/components/steps/Step1Address.tsx` - Combine with Risk Overlays
3. `src/components/steps/Step2StashCheck.tsx` - Merge into Step 0
4. `src/components/MultiStepForm.tsx` - Reorder steps
5. `src/lib/stash.ts` - Fix response parsing
6. `src/types/form.ts` - Update types for new fields
7. `src/store/formStore.ts` - Add new fields to state

---

## ✅ Ready for Next Session

All feedback documented. When you're ready to continue, we'll:
1. Fix the Stash API error first
2. Reorder and combine steps
3. Fix all dropdown values
4. Add missing questions
5. Update dialogue boxes to textareas

**Great feedback! We'll get it 100% correct! 🎯**







