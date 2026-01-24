# Phase 5 - Step 6: Washington Brown Calculator - Implementation Handoff

**Date:** January 21, 2026  
**Assignee:** Chat [To Be Assigned]  
**Estimated Time:** 1-2 hours  
**Priority:** High  
**Dependencies:** None (can start immediately)

---

## 🎯 **Objective**

Create a new Step 6 that allows users to paste Washington Brown depreciation report data and automatically parse it into 10 yearly values.

---

## 📋 **What to Build**

### **UI Components:**

1. **Large Textarea** for pasting Washington Brown report
   - Placeholder: "Paste Washington Brown depreciation report here..."
   - Min height: 200px
   - Auto-growing

2. **Parse Button**
   - Label: "Parse Depreciation Values"
   - Triggers parsing logic
   - Shows loading state during parse

3. **Results Table** (appears after parsing)
   - 2 columns: Year | Diminishing Value
   - 10 rows (Year 1 through Year 10)
   - Editable cells (user can correct if needed)

4. **Validation Message**
   - Error if parsing fails
   - Success message when all 10 values found

5. **Navigation Buttons**
   - Previous (goes to Step 5)
   - Next (goes to Step 7, disabled until all 10 values populated)

---

## 🔧 **Implementation Details**

### **File to Create:**
`form-app/src/components/steps/Step6WashingtonBrown.tsx`

### **Component Structure:**

```typescript
'use client';

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step6WashingtonBrown() {
  const { formData, updateFormData } = useFormStore();
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depreciation, setDepreciation] = useState<Record<string, string>>(
    formData.propertyDescription?.depreciation || {}
  );

  const handleParse = () => {
    // Parsing logic here
  };

  const handleYearChange = (year: string, value: string) => {
    // Update individual year value
  };

  const handleSave = () => {
    // Save to form store
    updateFormData({
      propertyDescription: {
        ...formData.propertyDescription,
        depreciation: depreciation
      }
    });
  };

  return (
    <div>
      <h2>Washington Brown Calculator</h2>
      {/* UI components here */}
    </div>
  );
}
```

---

## 🧮 **Parsing Logic**

### **Input Format (from Washington Brown report):**

The report contains lines like:
```
Year 1: $12,345
Year 2: $11,234
...
Year 10: $5,678
```

OR

```
1. $12,345
2. $11,234
...
10. $5,678
```

### **Parsing Algorithm:**

```typescript
const handleParse = () => {
  setParsing(true);
  setError(null);
  
  try {
    const lines = pastedText.split('\n');
    const parsed: Record<string, string> = {};
    
    for (const line of lines) {
      // Match patterns like "Year 1: $12,345" or "1. $12,345"
      const match = line.match(/(?:Year\s*)?(\d+)[\s:.\-]+\$?([\d,]+)/i);
      
      if (match) {
        const year = parseInt(match[1]);
        const value = match[2].replace(/,/g, ''); // Remove commas
        
        if (year >= 1 && year <= 10) {
          parsed[`year${year}`] = value;
        }
      }
    }
    
    // Validate: must have all 10 years
    const missingYears = [];
    for (let i = 1; i <= 10; i++) {
      if (!parsed[`year${i}`]) {
        missingYears.push(i);
      }
    }
    
    if (missingYears.length > 0) {
      setError(`Missing values for Year ${missingYears.join(', ')}`);
    } else {
      setDepreciation(parsed);
      setError(null);
    }
  } catch (err) {
    setError('Failed to parse. Please check the format and try again.');
  } finally {
    setParsing(false);
  }
};
```

---

## 📊 **Data Structure**

### **Form Store Field:**

```typescript
// In form-app/src/types/form.ts
export interface PropertyDescription {
  // ... existing fields ...
  depreciation?: {
    year1: string;
    year2: string;
    year3: string;
    year4: string;
    year5: string;
    year6: string;
    year7: string;
    year8: string;
    year9: string;
    year10: string;
  };
}
```

**Note:** This field should already exist from Phase 2. Verify in `form-app/src/types/form.ts`.

---

## ✅ **Validation Rules**

1. All 10 years must have values before proceeding to Step 7
2. Values must be numeric (can contain commas)
3. Values must be positive numbers

### **Validation Function:**

```typescript
const isValid = () => {
  if (!depreciation) return false;
  
  for (let i = 1; i <= 10; i++) {
    const value = depreciation[`year${i}`];
    if (!value || value.trim() === '') return false;
    
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (isNaN(numValue) || numValue < 0) return false;
  }
  
  return true;
};
```

---

## 🎨 **UI/UX Requirements**

1. **Textarea:**
   - Full width
   - Min height: 200px
   - Border: light gray
   - Placeholder text

2. **Parse Button:**
   - Primary color (blue)
   - Disabled during parsing
   - Show spinner icon when parsing

3. **Results Table:**
   - Clean, minimal design
   - Alternating row colors for readability
   - Input fields for each year (editable)
   - Right-align numbers

4. **Error Messages:**
   - Red background
   - Clear, actionable text

5. **Success State:**
   - Green checkmark
   - "All 10 years parsed successfully"

---

## 🔗 **Integration Points**

### **1. Update MultiStepForm.tsx:**

Add Step 6 to the STEPS array:

```typescript
const STEPS = [
  { id: 1, name: 'Address & Risk Check', component: Step0AddressAndRisk },
  { id: 2, name: 'Decision Tree', component: Step2StashCheck },
  { id: 3, name: 'Property Details', component: Step3PropertyDetails },
  { id: 4, name: 'Market Performance', component: Step2MarketPerformance },
  { id: 5, name: 'Proximity & Content', component: Step5Proximity },
  { id: 6, name: 'Washington Brown', component: Step6WashingtonBrown }, // NEW
  { id: 7, name: 'Folder Creation', component: Step7FolderCreation }, // To be created
];
```

### **2. Add Validation:**

In `MultiStepForm.tsx`, add validation for Step 6:

```typescript
case 6: // Washington Brown
  const { depreciation } = formData.propertyDescription || {};
  
  if (!depreciation) {
    setValidationError('Please parse the Washington Brown report.');
    return false;
  }
  
  // Check all 10 years
  for (let i = 1; i <= 10; i++) {
    if (!depreciation[`year${i}`] || depreciation[`year${i}`].trim() === '') {
      setValidationError(`Missing depreciation value for Year ${i}.`);
      return false;
    }
  }
  
  return true;
```

---

## 🧪 **Testing**

### **Test Cases:**

1. **Happy Path:**
   - Paste valid Washington Brown data
   - Click "Parse"
   - Verify all 10 years populate
   - Click "Next"
   - Verify data saved to form store

2. **Missing Years:**
   - Paste data with only 8 years
   - Click "Parse"
   - Verify error message shows missing years

3. **Invalid Format:**
   - Paste random text
   - Click "Parse"
   - Verify error message

4. **Manual Edit:**
   - Parse data successfully
   - Edit Year 5 value manually
   - Click "Next"
   - Verify edited value is saved

5. **Navigation:**
   - Click "Previous" - should go to Step 5
   - Click "Next" without parsing - should show validation error

---

## 📚 **Reference Documents**

1. **`planning_docs/06_new_page_flow_developer_build_spec.md`** - Section 3 (Washington Brown Calculator)
2. **`planning_docs/04_google_sheets_mapping_new_fields_developer_build_spec.md`** - Depreciation field spec (Rows 18-27)

---

## ✅ **Success Criteria**

- [ ] User can paste Washington Brown report
- [ ] Parse button extracts all 10 years correctly
- [ ] Results display in editable table
- [ ] User can manually edit any year value
- [ ] Validation prevents proceeding without all 10 years
- [ ] Data saves to `formData.propertyDescription.depreciation`
- [ ] Navigation works (Previous/Next)
- [ ] Build passes with no errors
- [ ] No linter errors

---

## 🚀 **Ready to Implement!**

All specs are provided above. Start by creating the component file, then add it to MultiStepForm.tsx, then test thoroughly.

**Estimated Time:** 1-2 hours

**Questions?** Refer back to Coordinator Chat for clarification.
