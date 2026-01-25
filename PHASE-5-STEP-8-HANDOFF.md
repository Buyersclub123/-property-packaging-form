# Phase 5 - Step 8: Pre-Submission Checklist & Final Submission - Implementation Handoff

**Date:** January 21, 2026  
**Assignee:** Chat [To Be Assigned]  
**Estimated Time:** 1-2 hours  
**Priority:** High  
**Dependencies:** Step 7 (folder creation) must be complete

---

## 🎯 **Objective**

Create Step 8 that displays a dynamic checklist based on property type, validates all items are checked, and submits the property to GHL (Go High Level) and sends an email notification.

---

## 📋 **What to Build**

### **UI Components:**

1. **Checklist Section**
   - Dynamic checklist items based on property type
   - Checkboxes for each item
   - Visual indicator when all items checked

2. **Validation Message**
   - Error if not all items checked
   - Success message when ready to submit

3. **Submit Button**
   - Disabled until all items checked
   - Shows loading state during submission
   - Primary color (green)

4. **Success State** (after submission)
   - Green checkmark
   - Success message
   - Folder link (clickable)
   - "Create Another Property" button (resets form)

5. **Navigation Buttons**
   - Previous (goes to Step 7)
   - Submit (final submission)

---

## 🔧 **Implementation Details**

### **File to Create:**
`form-app/src/components/steps/Step8Submission.tsx`

### **Component Structure:**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step8Submission() {
  const { formData, resetForm } = useFormStore();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate dynamic checklist based on property type
  const checklistItems = useMemo(() => {
    return generateChecklist(formData);
  }, [formData]);

  const allChecked = useMemo(() => {
    return Object.keys(checklistItems).every(key => checklist[key]);
  }, [checklist, checklistItems]);

  const handleSubmit = async () => {
    if (!allChecked) {
      setError('Please check all items before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit to GHL
      await submitToGHL(formData);
      
      // Send email
      await sendEmail(formData);
      
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    resetForm();
    // Navigate to Step 1
  };

  return (
    <div>
      <h2>Pre-Submission Checklist</h2>
      {/* Checklist */}
      {/* Submit button */}
      {/* Success state */}
    </div>
  );
}
```

---

## ✅ **Dynamic Checklist Logic**

### **Base Items (Always Included):**

1. ✅ Cashflow spreadsheet created and populated
2. ✅ Property photos uploaded
3. ✅ Market performance data reviewed
4. ✅ Proximity/amenities data added
5. ✅ "Why This Property" content generated
6. ✅ Investment highlights reviewed

### **Conditional Items (Based on Property Type):**

**For Established Properties:**
- ✅ P&B (Pest & Building) report uploaded

**For New/Off-Plan Properties:**
- ✅ PCI (Practical Completion Inspection) report uploaded

**For Dual Occupancy:**
- ✅ Dual occupancy details confirmed (2 sets of bed/bath/garage)

**For Split Contracts:**
- ✅ Land cost and build cost confirmed

### **Checklist Generation Function:**

```typescript
function generateChecklist(formData: FormData): Record<string, string> {
  const items: Record<string, string> = {
    cashflow: 'Cashflow spreadsheet created and populated',
    photos: 'Property photos uploaded',
    marketPerformance: 'Market performance data reviewed',
    proximity: 'Proximity/amenities data added',
    whyThisProperty: '"Why This Property" content generated',
    investmentHighlights: 'Investment highlights reviewed',
  };

  // Conditional items based on property type
  const propertyType = formData.propertyDescription?.propertyType;
  
  if (propertyType === 'Established') {
    items.pbReport = 'P&B (Pest & Building) report uploaded';
  } else if (propertyType === 'New' || propertyType === 'Off-Plan') {
    items.pciReport = 'PCI (Practical Completion Inspection) report uploaded';
  }

  // Dual occupancy
  if (formData.propertyDescription?.isDualOccupancy) {
    items.dualOccupancy = 'Dual occupancy details confirmed';
  }

  // Split contract
  if (formData.financials?.contractTypeSimplified === 'Split Contract') {
    items.splitContract = 'Land cost and build cost confirmed';
  }

  return items;
}
```

---

## 📤 **GHL Submission Logic**

### **API Endpoint:**
Create or use existing: `form-app/src/app/api/ghl/submit/route.ts`

### **GHL Payload:**

```typescript
async function submitToGHL(formData: FormData) {
  const payload = {
    contact: {
      firstName: formData.contact?.firstName,
      lastName: formData.contact?.lastName,
      email: formData.contact?.email,
      phone: formData.contact?.phone,
    },
    property: {
      address: formData.address?.fullAddress,
      suburb: formData.address?.suburbName,
      state: formData.address?.state,
      postcode: formData.address?.postcode,
      propertyType: formData.propertyDescription?.propertyType,
      bedrooms: formData.propertyDescription?.bedrooms,
      bathrooms: formData.propertyDescription?.bathrooms,
      carSpaces: formData.propertyDescription?.carSpaces,
    },
    financials: {
      purchasePrice: formData.financials?.purchasePrice,
      rentalIncome: formData.financials?.rentalIncome,
    },
    folderLink: formData.folderLink,
  };

  const response = await fetch('/api/ghl/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to submit to GHL');
  }

  return await response.json();
}
```

⚠️ **Note:** Check if GHL submission logic already exists in the current `Step6FolderCreation.tsx` and migrate it.

---

## 📧 **Email Notification Logic**

### **API Endpoint:**
Create or use existing: `form-app/src/app/api/email/send/route.ts`

### **Email Content:**

**To:** Property manager or admin email (from env var)  
**Subject:** New Property Submitted - [Address]  
**Body:**

```
New property has been submitted for review:

Property: [Full Address]
Type: [Property Type]
Bedrooms: [X] | Bathrooms: [X] | Car Spaces: [X]

Purchase Price: $[X]
Rental Income: $[X]/week

Folder Link: [Clickable Link]

Submitted by: [Contact Name]
Email: [Contact Email]
Phone: [Contact Phone]

---
This is an automated notification from the Property Review System.
```

### **Email Function:**

```typescript
async function sendEmail(formData: FormData) {
  const emailPayload = {
    to: process.env.ADMIN_EMAIL,
    subject: `New Property Submitted - ${formData.address?.fullAddress}`,
    body: `
      New property has been submitted for review:
      
      Property: ${formData.address?.fullAddress}
      Type: ${formData.propertyDescription?.propertyType}
      Bedrooms: ${formData.propertyDescription?.bedrooms} | Bathrooms: ${formData.propertyDescription?.bathrooms} | Car Spaces: ${formData.propertyDescription?.carSpaces}
      
      Purchase Price: $${formData.financials?.purchasePrice}
      Rental Income: $${formData.financials?.rentalIncome}/week
      
      Folder Link: ${formData.folderLink}
      
      Submitted by: ${formData.contact?.firstName} ${formData.contact?.lastName}
      Email: ${formData.contact?.email}
      Phone: ${formData.contact?.phone}
      
      ---
      This is an automated notification from the Property Review System.
    `,
  };

  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    throw new Error('Failed to send email notification');
  }

  return await response.json();
}
```

⚠️ **Note:** Check if email sending logic already exists and migrate it.

---

## 🔄 **Form Reset Logic**

After successful submission, provide a "Create Another Property" button:

```typescript
const handleReset = () => {
  // Reset form store
  resetForm();
  
  // Navigate to Step 1
  router.push('/'); // or however navigation is handled
};
```

---

## 🔗 **Integration Points**

### **1. Update MultiStepForm.tsx:**

Add Step 8 to the STEPS array:

```typescript
const STEPS = [
  { id: 1, name: 'Address & Risk Check', component: Step0AddressAndRisk },
  { id: 2, name: 'Decision Tree', component: Step2StashCheck },
  { id: 3, name: 'Property Details', component: Step3PropertyDetails },
  { id: 4, name: 'Market Performance', component: Step2MarketPerformance },
  { id: 5, name: 'Proximity & Content', component: Step5Proximity },
  { id: 6, name: 'Washington Brown', component: Step6WashingtonBrown },
  { id: 7, name: 'Cashflow Review', component: Step7CashflowReview },
  { id: 8, name: 'Submission', component: Step8Submission }, // NEW
];
```

### **2. Update Progress Bar:**

Ensure the progress bar shows 8 steps total.

### **3. Environment Variables:**

Add to `.env.local`:

```
ADMIN_EMAIL=admin@example.com
GHL_API_KEY=your_ghl_api_key
GHL_API_URL=https://api.gohighlevel.com/v1
```

---

## 🧪 **Testing**

### **Test Cases:**

1. **Checklist Display:**
   - Navigate to Step 8
   - Verify base items display
   - Verify conditional items display based on property type

2. **Validation:**
   - Try to submit without checking all items
   - Verify error message
   - Check all items
   - Verify submit button enables

3. **Submission (Happy Path):**
   - Check all items
   - Click "Submit"
   - Wait for loading state
   - Verify success message
   - Verify folder link is clickable
   - Check GHL for new record
   - Check admin email for notification

4. **Submission (Error):**
   - Temporarily break GHL API key
   - Try to submit
   - Verify error message
   - Verify retry option

5. **Form Reset:**
   - After successful submission
   - Click "Create Another Property"
   - Verify form resets to Step 1
   - Verify all fields are empty

6. **Navigation:**
   - Click "Previous" - should go to Step 7

---

## 📚 **Reference Documents**

1. **`planning_docs/06_new_page_flow_developer_build_spec.md`** - Section 5 (Pre-Submission Checklist)
2. **Current `Step6FolderCreation.tsx`** - May contain existing GHL/email logic to migrate

---

## ⚠️ **Migration Notes**

The current `Step6FolderCreation.tsx` likely contains:
- Checklist logic
- GHL submission logic
- Email sending logic

**You should:**
1. Review the current file
2. Extract the relevant logic
3. Adapt it for Step 8
4. Ensure it works with the new 3-step flow

---

## ✅ **Success Criteria**

- [ ] Dynamic checklist displays correct items based on property type
- [ ] All checkboxes must be checked before submission
- [ ] Submit button disabled until all items checked
- [ ] GHL submission works correctly
- [ ] Email notification sent to admin
- [ ] Success message displays with folder link
- [ ] "Create Another Property" button resets form
- [ ] Navigation works (Previous)
- [ ] Build passes with no errors
- [ ] No linter errors

---

## 🚀 **Ready to Implement!**

This step involves migrating existing logic from the old Step 6. Review the current implementation first, then adapt it for the new flow.

**Estimated Time:** 1-2 hours

**Questions?** Refer back to Coordinator Chat for clarification.
