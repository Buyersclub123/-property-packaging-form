# Activity 9a: Tri-plus Replicate Button Implementation

## Goal
Implement "Replicate to All" functionality for Tri-plus dwellings, similar to the existing Projects feature.

## Context
- Tri-plus properties support up to 25 dwellings
- Each dwelling can be single or dual occupancy independently
- Users need to copy data from one dwelling to all other dwellings to save time

## Requirements

### 1. Replicate Button Location
- Add "Replicate to All" button in each dwelling's accordion header
- Position next to the expand/collapse controls (same as Projects)

### 2. What to Replicate
When user clicks "Replicate to All" from Dwelling X:

**Primary Fields (always copied):**
- Beds
- Bath  
- Garage
- Carport
- Car Space
- Unit Number (with increment logic: if Unit 1 replicates, Unit 2 gets "2", Unit 3 gets "3", etc.)
- Rent Appraisal From
- Rent Appraisal To

**Secondary Fields (only if dwelling is dual occupancy):**
- Beds Secondary
- Bath Secondary
- Garage Secondary
- Carport Secondary
- Car Space Secondary
- Rent Appraisal From Secondary
- Rent Appraisal To Secondary

**Occupancy Fields (conditional):**
- If source dwelling is dual: set all target dwellings to dual
- If source dwelling is single: set all target dwellings to single
- Copy occupancy status (tenanted/vacant/etc.) for each unit

**Current Rent & Expiry (only if tenanted):**
- Copy current rent values for tenanted units
- Copy expiry dates for tenanted units
- Set to empty for vacant units

### 3. Confirmation Dialog
- Show confirmation dialog: "This will replace all data in other dwellings with the data from Unit/Dwelling X. Continue?"
- Only proceed if user confirms

### 4. Smart Increment Logic for Unit Numbers
- If source is "Unit 1": target dwellings get sequential numbers (2, 3, 4...)
- If source is "Unit 5": target dwellings get sequential numbers (6, 7, 8...)
- If source has no unit number: leave target unit numbers unchanged
- For dual occupancy: Unit A and Unit B share the same unit number

### 5. Validation After Replication
- After replication, validate all required fields are populated
- Show any validation errors to user
- Don't allow form submission if validation fails

### 6. Edge Cases
- If only 1 dwelling exists: don't show replicate button
- If some dwellings are dual and some single: replicate the source dwelling's dual/single setting to all
- Preserve the "Is this single or dual occupancy?" toggle state from source

## Implementation Notes

### Files to Modify
- `src/components/steps/Step2PropertyDetails.tsx` (or new Tri-plus component)
- May need to create utility functions for replication logic

### State Management
- Use existing form store patterns
- Update all dwelling states atomically to avoid UI flicker

### Testing Scenarios
- Replicate from single occupancy dwelling
- Replicate from dual occupancy dwelling  
- Replicate with mixed occupancy types
- Replicate with vacant/tenanted units
- Replicate unit number increment logic

## Deliverables
1. Replicate button in each dwelling header
2. Confirmation dialog functionality
3. Replication logic for all fields
4. Unit number increment logic
5. Validation after replication
6. Handle edge cases appropriately

## References
- Existing Projects replicate functionality in `ProjectLotsView`
- Field definitions from `09-tri-plus-field-analysis-v2.csv`
- JSON structure from design discussions
