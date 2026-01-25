# Step 6: Washington Brown Calculator - Iframe Fix

**Date:** January 21, 2026  
**Issue:** Step 6 was missing the Washington Brown calculator iframe  
**Status:** ✅ Fixed

---

## 🐛 **Problem**

Chat F implemented Step 6 with only text parsing functionality, but was missing:
- Property details summary at the top
- Washington Brown calculator iframe (embedded website)

The test page (`/test-sheets-population`) had the correct implementation with the iframe.

---

## ✅ **Solution**

Updated `Step6WashingtonBrown.tsx` to include:

1. **Property Details Summary** (top of page)
   - Address
   - Total Cost
   - Year Built
   - Land Registration

2. **Washington Brown Calculator Iframe** (embedded)
   - Full calculator website embedded
   - 800px height
   - Responsive width

3. **Manual Entry Section** (below iframe)
   - Textarea for pasting report
   - Parse button
   - Editable table for 10 years

---

## 📁 **File Modified**

- `form-app/src/components/steps/Step6WashingtonBrown.tsx`

---

## 🧪 **Testing**

1. Navigate to Step 6
2. Verify property details display at top
3. Verify Washington Brown calculator loads in iframe
4. Use calculator or paste report manually
5. Verify depreciation values populate table
6. Click "Next" to proceed to Step 7

---

## ✅ **Status**

Fixed and ready for testing. The page now matches the test page design with the iframe embedded.

---

**Fixed by:** Coordinator Chat  
**Time:** ~5 minutes  
**Resources Used:** Minimal (simple copy-paste from test page)
