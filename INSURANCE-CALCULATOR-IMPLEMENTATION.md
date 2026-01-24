# Insurance Calculator Implementation

## Overview
Added a new **Step 6: Insurance Calculator** before the Washington Brown Calculator step. This embeds the Terri Scheer insurance calculator and captures the insurance value for use in the Cashflow Review.

## Changes Made

### 1. New Component: `Step6InsuranceCalculator.tsx`
**Location:** `src/components/steps/Step6InsuranceCalculator.tsx`

**Features:**
- Embeds Terri Scheer calculator (`https://online.terrischeer.com.au/`)
- Iframe sized at **100% width × 2400px height** (3x taller than Washington Brown)
- Input field for annual insurance cost
- Auto-saves insurance value to form store
- Validation for numeric values
- Success indicator when value is saved
- Property details summary (address, property type)

**Validation:**
- Insurance value is required
- Must be a valid positive number

---

### 2. Updated Form Data Type
**Location:** `src/types/form.ts`

**Added field:**
```typescript
export interface FormData {
  // ... existing fields ...
  
  // Insurance (Step 6)
  insurance?: string; // Annual insurance cost from Terri Scheer calculator
  
  // ... rest of fields ...
}
```

---

### 3. Updated MultiStepForm
**Location:** `src/components/MultiStepForm.tsx`

**Changes:**
- **Imported** `Step6InsuranceCalculator` component
- **Inserted** Insurance Calculator as Step 6
- **Renumbered** all subsequent steps:
  - Washington Brown: Step 6 → Step 7
  - Cashflow Review: Step 7 → Step 8
  - Submission: Step 8 → Step 9

**Updated STEPS array:**
```typescript
const STEPS = [
  { number: 1, title: 'Address & Risk Check', component: Step0AddressAndRisk },
  { number: 2, title: 'Decision Tree', component: Step1DecisionTree },
  { number: 3, title: 'Property Details', component: Step2PropertyDetails },
  { number: 4, title: 'Market Performance', component: Step3MarketPerformance },
  { number: 5, title: 'Proximity & Content', component: Step5Proximity },
  { number: 6, title: 'Insurance Calculator', component: Step6InsuranceCalculator }, // NEW
  { number: 7, title: 'Washington Brown', component: Step6WashingtonBrown },
  { number: 8, title: 'Cashflow Review', component: Step7CashflowReview },
  { number: 9, title: 'Submission', component: Step8Submission },
];
```

**Added validation for Step 6:**
```typescript
case 6: // Insurance Calculator
  const { insurance } = formData;
  
  if (!insurance || insurance.trim() === '') {
    setValidationError('Please enter the annual insurance cost from the Terri Scheer calculator.');
    return false;
  }
  
  // Validate that it's a valid number
  const insuranceValue = parseFloat(insurance.replace(/,/g, ''));
  if (isNaN(insuranceValue) || insuranceValue < 0) {
    setValidationError('Insurance value must be a valid positive number.');
    return false;
  }
  
  return true;
```

**Updated validation case numbers:**
- Washington Brown: `case 6` → `case 7`
- Cashflow Review: `case 7` → `case 8`
- Submission: `case 8` → `case 9`

---

### 4. Updated Step7CashflowReview (Now Step 8)
**Location:** `src/components/steps/Step7CashflowReview.tsx`

**Changes:**
- **Pre-populates** `insuranceAmount` field with value from `formData.insurance` (Step 6)
- Falls back to existing `formData.insuranceAmount` if Step 6 value not available

**Updated code:**
```typescript
// Pre-populate insurance from Step 6 Insurance Calculator, fallback to saved insuranceAmount
const [insuranceAmount, setInsuranceAmount] = useState(formData.insurance || formData.insuranceAmount || '');
```

---

## Data Flow

1. **Step 6 (Insurance Calculator)**
   - User completes Terri Scheer calculator
   - User enters insurance value in input field
   - Value is saved to `formData.insurance`

2. **Step 8 (Cashflow Review)**
   - Reads `formData.insurance` from Step 6
   - Pre-populates the insurance field
   - User can edit if needed
   - Value is used in cashflow calculations

---

## User Experience

### Step 6: Insurance Calculator
1. User sees property details summary
2. User interacts with Terri Scheer calculator (spans 2 pages)
3. User enters annual insurance cost in the input field
4. Green checkmark appears when value is saved
5. User clicks "Next" to proceed to Washington Brown

### Step 8: Cashflow Review
1. Insurance field is automatically populated with value from Step 6
2. User can verify or edit the value
3. Value is used in cashflow calculations

---

## Testing Checklist

- [ ] Step 6 displays correctly with Terri Scheer iframe
- [ ] Iframe is properly sized (wider and 3x taller than Washington Brown)
- [ ] Insurance input field accepts numeric values
- [ ] Insurance input field validates correctly (rejects non-numeric, negative values)
- [ ] Insurance value is saved to form store
- [ ] Cannot proceed to Step 7 without entering insurance value
- [ ] Step 8 (Cashflow Review) receives and displays insurance value
- [ ] Insurance value can be edited in Step 8
- [ ] Step numbers are correct in UI (1-9)
- [ ] Navigation works correctly between all steps

---

## Files Modified

1. ✅ `src/components/steps/Step6InsuranceCalculator.tsx` (NEW)
2. ✅ `src/types/form.ts` (Added `insurance` field)
3. ✅ `src/components/MultiStepForm.tsx` (Inserted step, renumbered validation)
4. ✅ `src/components/steps/Step7CashflowReview.tsx` (Pre-populate insurance)

---

## Next Steps

1. **Test locally** - Verify all functionality works as expected
2. **Deploy to Dev** - Test in development environment
3. **User Acceptance Testing** - Get user feedback
4. **Deploy to Production** - Roll out to production when approved

---

## Notes

- The component follows the same pattern as `Step6WashingtonBrown.tsx`
- Insurance value is stored separately from `insuranceAmount` in cashflow
- The iframe height (2400px) accommodates the 2-page Terri Scheer calculator
- Validation ensures users cannot skip this step without entering a value
