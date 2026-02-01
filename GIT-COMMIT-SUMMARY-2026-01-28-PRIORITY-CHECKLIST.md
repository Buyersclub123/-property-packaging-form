# Git Commit Summary - 2026-01-28 - Priority Checklist Updates

## Changes Made

### ✅ Page 1 - Due Diligence Dropdown Order
**File Modified:** `src/components/steps/Step0AddressAndRisk.tsx`
- Changed dropdown option order from `--Select--`, `No`, `Yes` to `--Select--`, `Yes`, `No`
- Better UX: "Yes" option now appears first after default selection
- **Lines changed:** ~1730-1732

### ✅ Page 1 - Make Due Diligence Field More Obvious
**File Modified:** `src/components/steps/Step0AddressAndRisk.tsx`
- Added green border (border-2 border-green-400) around Due Diligence field
- Added light green background (bg-green-50) for visual emphasis
- Added rounded container with padding (p-4 rounded-lg)
- Enhanced label styling (text-green-800 font-semibold)
- Added green focus ring on select field
- **Lines changed:** ~1721-1739

### ✅ Page 1 - Make Selling Agent Fields Mandatory
**Files Modified:** 
- `src/components/steps/Step0AddressAndRisk.tsx`
- `src/components/MultiStepForm.tsx`
- `src/lib/phoneFormatter.ts` (NEW FILE)

**Changes:**
- Made Selling Agent Name, Email, and Mobile fields mandatory (required attribute + red asterisks)
- All fields accept "TBC" as valid input (case insensitive)
- **Mobile Field:**
  - Auto-formats phone numbers as user types: `0450 581 822` (4-3-3 format)
  - Converts to international format on blur: `+61 4 50 581 822`
  - Accepts "TBC" or Australian mobile numbers only
  - Input restricted to numbers, spaces, or T/B/C letters
- **Email Field:**
  - Validates email format or accepts "TBC"
  - Normalizes email to lowercase on blur (but preserves "TBC")
- **Name Field:**
  - Accepts any text or "TBC"
  - Normalizes "TBC" to uppercase on blur
- **Validation:**
  - Added validation to `handleProceedToStep2` function
  - Added validation to `MultiStepForm.tsx` validateStep function
  - Replaced alert() dialogs with inline error messages (red error box)
  - Auto-scrolls to relevant section when validation fails
- **UI Updates:**
  - Updated help text: "all fields required - use 'TBC' if information is not available"
  - Added red asterisks (*) to all field labels
  - Updated section label to "Selling Agent *"

### 📝 Documentation Updates
**File Modified:** `PRIORITY-CHECKLIST.md`
- Added "Page 1 - Smart Paste for Selling Agent Fields" to NICE TO HAVE section
- Moved completed items from ACTION LIST to FIXED section
- Updated status of completed items with implementation details

## Files Changed

1. `src/components/steps/Step0AddressAndRisk.tsx`
   - Due Diligence dropdown order updated
   - Due Diligence field visual styling enhanced
   - Selling Agent fields made mandatory with validation
   - Inline error messages added (replaced alerts)
   - Mobile field formatting and TBC support

2. `src/components/MultiStepForm.tsx`
   - Added Selling Agent fields validation to Step 1 validation

3. `src/lib/phoneFormatter.ts` (NEW FILE)
   - Phone number formatting utilities
   - Australian mobile number formatter (+61 format)
   - TBC support for mobile field
   - Input validation functions

4. `src/components/steps/step5/InvestmentHighlightsField.tsx`
   - Added state restoration on mount for navigation persistence
   - Added "Location Report" warning popup for report names
   - Increased warning message text size and styling

5. `PRIORITY-CHECKLIST.md`
   - Documentation updates
   - Status tracking updates

## Git Commit Message Suggestion

```
feat: Improve Page 1 and Page 6 UX - Multiple enhancements

Page 1 Changes:
- Change Due Diligence dropdown order: Yes appears before No
- Add green border and background highlight to Due Diligence field
- Make Selling Agent fields mandatory (Name, Email, Mobile)
- Add phone number formatting for mobile field (+61 4 50 581 822)
- Add TBC support for all Selling Agent fields
- Replace alert dialogs with inline error messages

Page 6 Changes:
- Restore Investment Highlights UI state after navigation
- Add "Location Report" instruction to warning message
- Increase warning message text size for better visibility

Fixes (from PRIORITY-CHECKLIST.md):
- Page 1 - Due Diligence Dropdown Order
- Page 1 - Make Due Diligence Field More Obvious
- Page 1 - Make Selling Agent Fields Mandatory
- Page 6 - Investment Highlights Reselection After Navigation
- Page 6 - Hotspotting Report Name - Instruction Message
- Page 6 - Investment Highlights Reselection After Navigation
- Page 6 - Hotspotting Report Name - Instruction Message (added to warning box)
```

## Testing Checklist

### Due Diligence Field
- [x] Verify Due Diligence dropdown shows "Yes" before "No"
- [x] Verify green border and background are visible
- [x] Verify field is more noticeable on the page
- [x] Test form validation still works correctly
- [x] Verify warning message still appears when "No" is selected

### Selling Agent Fields
- [x] Verify all three fields are marked as required (red asterisks)
- [x] Verify cannot proceed to Step 2 without filling all fields
- [x] Test Name field accepts "TBC" or any text
- [x] Test Email field accepts "TBC" or valid email format
- [x] Test Mobile field accepts "TBC" or phone numbers
- [x] Test Mobile field formats as user types: `0450 581 822`
- [x] Test Mobile field converts to `+61 4 50 581 822` on blur
- [x] Test inline error messages appear (not alert dialogs)
- [x] Test error messages clear when fields are filled
- [x] Test auto-scroll to relevant section on validation error

### Investment Highlights (Page 6)
- [x] Verify "Change Selection" button appears after selecting a report
- [x] Navigate away from Page 6 and return - button should still be visible
- [x] Test with all three selection methods (auto-match, dropdown, PDF upload)
- [x] Verify "Location Report" instruction is visible in warning message box
- [x] Verify warning message is larger and more readable (text-base instead of text-xs)
- [x] Verify instruction appears as bullet point in amber warning box
- [x] Verify instruction is always visible when verifying PDF report name

## Additional Changes

### ✅ Page 6 - Investment Highlights Reselection After Navigation
**File Modified:** `src/components/steps/step5/InvestmentHighlightsField.tsx`
- Added `useEffect` hook to restore UI state on component mount
- Checks `formData` for `hotspottingReportName` or `hotspottingPdfFileId`
- Restores `matchStatus` to `'found'` when data exists
- Restores `reportName` and `validPeriod` from formData
- Ensures "Change Selection or Enter Manually" button remains visible after navigation
- Matches pattern used by Proximity and Why This Property fields
- **Lines changed:** ~82-100

### ✅ Page 6 - Hotspotting Report Name - Instruction Message
**File Modified:** `src/components/steps/step5/InvestmentHighlightsField.tsx`
- Added instruction text to existing warning message box in PDF verification UI
- Message: "Remove the words 'Location Report' from the beginning of the name. The list is presented in alphabetical order so the report needs to start with the LGA name."
- Displayed as bullet point in amber warning box, always visible when users verify extracted report name
- No popup dialog - instruction is always visible for better UX
- **Lines changed:** ~984-986

### ✅ Page 6 - Investment Highlights Warning Message Size
**File Modified:** `src/components/steps/step5/InvestmentHighlightsField.tsx`
- Increased warning message text size from `text-xs` to `text-base`
- Changed text color from `text-gray-700` to `text-gray-800` for better contrast
- Added `font-medium` for emphasis
- Increased padding from `p-2` to `p-3`
- **Lines changed:** ~1002-1006

## Next Steps

Remaining Page 1 items in ACTION LIST (from PRIORITY-CHECKLIST.md):
- Page 1 - Make LGA Field Mandatory
