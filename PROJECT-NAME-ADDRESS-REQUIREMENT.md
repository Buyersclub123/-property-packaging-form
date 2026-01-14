# Project Name and Address Requirement - TODO

**Date:** 2026-01-12  
**Status:** ⏳ **PENDING** - Needs implementation

---

## Requirement

For **Project** property types (New → Multiple lots):

1. **Project Name must be mandatory**
   - Currently: Project Name is optional (no validation)
   - Required: Add validation to require Project Name
   - Location: `MultiStepForm.tsx` - Step 3 validation (around line 405-410)

2. **Project Name should prefix the address in the form**
   - Display format: `[Project Name] - [Project Address]`
   - Or: Show Project Name above/before Project Address field
   - Location: `Step2PropertyDetails.tsx` - Project Address section (around line 2406-2433)

---

## Current Implementation

### Project Name Field
- **Location:** `Step2PropertyDetails.tsx` lines 2406-2433
- **Current Status:** Optional (no `required` attribute)
- **Label:** "Project Name"
- **Placeholder:** "To enter project name - should it have one"

### Project Address Field
- **Location:** `Step2PropertyDetails.tsx` lines 2365-2404
- **Current Status:** ✅ Mandatory (validated in `MultiStepForm.tsx` line 407-410)
- **Label:** "Project Address *"

---

## Implementation Tasks

### Task 1: Make Project Name Mandatory
**File:** `property-review-system/form-app/src/components/MultiStepForm.tsx`

Add validation in Step 3 validation (around line 405-410):
```typescript
if (isProject) {
  // Project Name is required
  if (isEmpty(address?.projectName)) {
    setValidationErrorWithRef('Project Name is required.');
    return false;
  }
  
  // Project Address is required at project level
  if (isEmpty(address?.projectAddress)) {
    setValidationErrorWithRef('Project Address is required.');
    return false;
  }
  // ... rest of validation
}
```

### Task 2: Add `required` attribute to Project Name field
**File:** `property-review-system/form-app/src/components/steps/Step2PropertyDetails.tsx`

Update line 2408-2432:
- Change label from `"Project Name"` to `"Project Name *"`
- Add `required` attribute to the input field

### Task 3: Prefix Project Name to Address Display
**File:** `property-review-system/form-app/src/components/steps/Step2PropertyDetails.tsx`

Update the Project Address display to show:
- Option A: Show as combined field `"[Project Name] - [Project Address]"`
- Option B: Show Project Name label above Project Address field
- Option C: Display Project Name as prefix in the address input field

**Decide with user which approach they prefer.**

---

## Related Files
- `property-review-system/form-app/src/components/MultiStepForm.tsx` - Validation logic
- `property-review-system/form-app/src/components/steps/Step2PropertyDetails.tsx` - Project Name/Address fields
- `property-review-system/form-app/src/types/form.ts` - Type definitions (line 39-41)

---

## Notes
- Project Name is stored in `formData.address.projectName`
- Project Address is stored in `formData.address.projectAddress`
- Both fields are already part of the form data structure
- This requirement only applies to Projects (propertyType === 'New' && lotType === 'Multiple')
