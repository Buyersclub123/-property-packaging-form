# Page 4 Fix Verification - Step-by-Step Flow Analysis

## Problem Statement
User clicks "Check data" → "Update both SPI & REI" → fills forms → saves → clicks "Next" → **BLOCKED** because `isVerified` remains `false` even though data was saved.

## Solution
When user saves data after clicking "Check data" and updating, set `isVerified: true` to allow progression.

## Complete Flow Trace

### Step 1: User clicks "Check data" button
**Location:** Line 1116-1122 in Step3MarketPerformance.tsx

**Actions:**
- Sets `showStaleDataLinks = true`
- Updates store: `isVerified: false`

**State after:**
- `marketPerformance.isVerified = false`
- `marketPerformance.isSaved = true` (data exists in sheet)
- `showStaleDataLinks = true`

---

### Step 2: User clicks "Update both SPI & REI" button
**Location:** Line 1150-1181 in Step3MarketPerformance.tsx

**Actions:**
- Clears all data fields (sets to empty strings)
- Sets `isSaved: false`
- **Explicitly preserves `isVerified: false`** (line 1164)
- Shows forms: `showDataCollection = true`, `showSPIForm = true`, `showREIForm = true`
- Hides links: `showStaleDataLinks = false`

**State after:**
- `marketPerformance.isVerified = false` ✓ (preserved)
- `marketPerformance.isSaved = false`
- `showDataCollection = true`
- Forms are visible

---

### Step 3: User fills forms and clicks "Confirm data is loaded and progress to step 5"
**Location:** Line 1551-1562 (button) → Line 450-664 (handler)

**Button click triggers:** `handleSaveMarketPerformanceData()`

**At function start (Line 451-452):**
```typescript
const currentFormData = useFormStore.getState().formData;
const wasVerificationRequired = currentFormData.marketPerformance?.isVerified === false;
```
- Gets latest state from store (ensures we have current value, not stale prop)
- `wasVerificationRequired = true` ✓ (because isVerified is false)

**After saving (Line 595-614):**
```typescript
updateFormData({
  marketPerformance: {
    ...marketPerformance,
    // ... data fields updated ...
    isSaved: savedToSheet, // true if saved successfully
    isVerified: wasVerificationRequired ? true : marketPerformance?.isVerified,
  },
});
```
- `isSaved = true` ✓
- `isVerified = wasVerificationRequired ? true : ...` → `isVerified = true` ✓

**State after save:**
- `marketPerformance.isVerified = true` ✓
- `marketPerformance.isSaved = true` ✓
- Forms hidden: `showDataCollection = false`, `showStaleDataLinks = false`

**If refresh happens (Line 633-660):**
- Gets `currentFormData` from store (should have `isVerified: true` from previous update)
- Updates with: `isVerified: wasVerificationRequired ? true : currentFormData.marketPerformance?.isVerified`
- Since `wasVerificationRequired = true`, sets `isVerified: true` ✓

---

### Step 4: User clicks "Next" button
**Location:** MultiStepForm.tsx → `handleNext()` → `validateStep(4)`

**Validation check (Line 775 in MultiStepForm.tsx):**
```typescript
if (marketPerformance.isSaved !== false && marketPerformance.isVerified === false) {
  setValidationErrorWithRef('You need to either confirm the data is fine or update it...');
  return false;
}
```

**Evaluation:**
- `marketPerformance.isSaved !== false` → `true !== false` → `true` ✓
- `marketPerformance.isVerified === false` → `true === false` → `false` ✓
- Overall: `true && false` → `false` → **DOES NOT BLOCK** ✓

**Result:** Validation passes, user can proceed to step 5 ✓

---

## Additional Validation Check (Line 811)
```typescript
if (!marketPerformance?.isSaved && marketPerformance?.isVerified === false) {
  setValidationError('Please click "Save Market Performance Data" button...');
  return false;
}
```

**Evaluation:**
- `!marketPerformance?.isSaved` → `!true` → `false` ✓
- `marketPerformance?.isVerified === false` → `true === false` → `false` ✓
- Overall: `false && false` → `false` → **DOES NOT BLOCK** ✓

---

## Key Fixes Applied

1. **Line 451-452:** Get latest state from store (not stale prop) to check `isVerified`
2. **Line 613:** Set `isVerified: true` when `wasVerificationRequired` is true
3. **Line 659:** Preserve `isVerified: true` during data refresh
4. **Line 1164:** Explicitly preserve `isVerified` when clearing data
5. **Line 1556:** Updated button text to "Confirm data is loaded and progress to step 5"

## Verification Checklist

- [x] `isVerified: false` is set when "Check data" is clicked
- [x] `isVerified: false` is preserved when "Update both SPI & REI" is clicked
- [x] `wasVerificationRequired` correctly detects `isVerified === false`
- [x] `isVerified: true` is set after saving when verification was required
- [x] `isVerified: true` is preserved during data refresh
- [x] Validation check at line 775 will pass (doesn't block)
- [x] Validation check at line 811 will pass (doesn't block)
- [x] Button text updated as requested

## Expected Behavior

**Before fix:**
1. Click "Check data" → `isVerified: false`
2. Click "Update both SPI & REI" → forms shown
3. Fill forms and save → `isSaved: true`, `isVerified: false` (still!)
4. Click "Next" → **BLOCKED** ❌

**After fix:**
1. Click "Check data" → `isVerified: false`
2. Click "Update both SPI & REI" → forms shown, `isVerified: false` preserved
3. Fill forms and save → `isSaved: true`, `isVerified: true` ✓
4. Click "Next" → **ALLOWED** ✓

## Conclusion

The fix should work correctly. The key changes ensure that:
1. We detect when verification was required (user clicked "Check data")
2. We set `isVerified: true` after saving in that scenario
3. We preserve `isVerified: true` through any data refreshes
4. Validation checks will pass because `isVerified` is now `true`
