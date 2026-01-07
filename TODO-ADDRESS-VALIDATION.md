# TODO: Address Validation with Suggestions

## Status: Deferred

Address validation with spelling correction suggestions has been temporarily removed to focus on testing other functionality.

## What Was Removed

- Geocoding validation before Stash check
- Address suggestion modal
- Address comparison logic
- Geoscape API integration for address validation

## What Needs to Be Added Later

### Requirements
1. **Address Validation:**
   - Check address spelling before/after Stash check
   - Show suggestions if address doesn't match exactly
   - Allow user to select corrected address

2. **User Experience:**
   - Modal showing: "Address not found, are you ok to progress using this address: [address]"
   - List possible reasons below
   - Show suggested corrected addresses
   - "Yes, use this address" button for suggestions
   - "Proceed with this address" button for original

3. **Implementation Notes:**
   - Use Geoscape API for address validation
   - Compare entered address with geocoded result
   - Only show modal if not exact match
   - Don't block Stash check - make validation optional/non-blocking

## Files to Update When Implementing

- `src/components/steps/Step0AddressAndRisk.tsx` - Add validation logic
- `src/lib/geocoder.ts` - Already created, needs to be re-integrated
- `src/components/AddressSuggestionModal.tsx` - Already created, needs to be re-integrated

## Current Behavior

- Form calls Stash API directly
- No address validation
- User can enter any address (including misspellings)
- Stash data populates if available
- Form continues even if Stash fails

---

**Note:** Address validation will be added back after other testing is complete.

---

# TODO: Multi-Lot Projects

## Status: To Be Implemented in Property Details Step (Step 2)

### Decision Made (2026-01-01)
- **Lot numbers are NOT collected in Step 0 (Address & Risk Check)**
- Lot numbers will be handled in **Property Details step (Step 2)**
- Step 0 only collects the base Project Address (for overlays/email) and Property Address (base address for GHL records)

### Why This Approach
- Step 0 focuses on address validation and risk overlays (one address per project)
- Property Details step is where lot-specific information belongs:
  - Multiple lot numbers
  - Each lot's land size
  - Each lot's build size
  - Each lot's format
  - Each lot's land cost
  - Each lot's build cost

### What Needs to Be Implemented in Step 2

1. **Multi-Lot Collection:**
   - Add/remove lot functionality
   - For each lot, collect:
     - Lot Number
     - Land Size
     - Build Size
     - Format
     - Land Cost
     - Build Cost
     - Other lot-specific details

2. **Data Structure:**
   - Each lot becomes its own entry in:
     - Custom Object (GHL)
     - Google Sheet Deal Sheet
   - All lots can appear in one email

3. **User Experience:**
   - "Add Lot" button
   - List of lots with edit/delete options
   - Form validation for each lot

### Files to Create/Update
- `src/components/steps/Step2PropertyDetails.tsx` - Add multi-lot functionality
- `src/types/form.ts` - Add lot data structure
- `src/store/formStore.ts` - Add lot management functions

### Current Behavior
- Step 0 shows message: "Since this is a project, it is assumed there are multiple Lot numbers. The various Lot numbers will be detailed in subsequent steps (Property Details)."
- Property Address for GHL section does NOT include Lot Number field
- Lot numbers will be added in Property Details step

---

**Note:** Multi-lot functionality is planned for Property Details step, not Address & Risk Check step.
