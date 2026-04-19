# Activity 9b: Tri-plus Yield Calculations Implementation

## Goal
Implement yield calculation logic for Tri-plus properties that handles multiple dwellings and dual occupancy.

## Context
- Tri-plus properties have multiple dwellings (up to 25)
- Each dwelling can be single or dual occupancy
- Yields must be calculated from all dwelling data combined
- Use existing yield calculation patterns from the codebase

## Requirements

### 1. Appraised Yield Calculation
**Formula:** Sum of all rent appraisal "from" values ÷ Acceptable Acquisition To × 52 × 100

**Logic:**
- Sum all `rentAppraisalFromPrimary` values across all dwellings
- Sum all `rentAppraisalFromSecondary` values across dual occupancy dwellings
- Total appraisal = sum of primary + secondary values
- Divide by `acceptableAcquisitionTo` (from Purchase Price section)
- Multiply by 52 (weeks per year)
- Multiply by 100 (to get percentage)
- Store in `appraisedYield` field

### 2. Current Yield Calculation
**Formula:** Sum of all current rents from tenanted units ÷ Acceptable Acquisition To × 52 × 100

**Logic:**
- Sum all `currentRentPrimary` values where occupancy is "tenanted"
- Sum all `currentRentSecondary` values where occupancy is "tenanted" (dual occupancy only)
- Total current rent = sum of all tenanted rents
- Divide by `acceptableAcquisitionTo`
- Multiply by 52 (weeks per year)
- Multiply by 100 (to get percentage)
- Store in `currentYield` field

### 3. Price Group Calculation
**Logic:** Use existing price group logic based on `acceptableAcquisitionTo` value
- No changes needed - reuse existing implementation

### 4. Calculation Triggers
Recalculate yields when any of these values change:
- Any rent appraisal "from" value (primary or secondary)
- Any current rent value (primary or secondary)
- Any occupancy status change (affects which rents are included in Current Yield)
- Acceptable Acquisition To value changes

### 5. Validation and Edge Cases
- If no rent appraisals are entered: Appraised Yield = 0
- If no current rents (all vacant): Current Yield = 0
- If Acceptable Acquisition To is empty or 0: yields = 0
- Handle TBC values appropriately (exclude from calculations)
- Round yields to 1 decimal place (existing pattern)

### 6. Data Sources
All data comes from the `dwelling_details` JSON array:
```json
[
  {
    "unitNumber": "1",
    "isDualOccupancy": true,
    "rentAppraisalFromPrimary": "380",
    "rentAppraisalFromSecondary": "320",
    "currentRentPrimary": "350",
    "currentRentSecondary": "",
    "occupancyPrimary": "tenanted",
    "occupancySecondary": "vacant"
  }
]
```

## Implementation Notes

### Files to Modify
- May need to create new yield calculation hook or utility functions
- Update existing yield calculation logic to handle Tri-plus data structure

### State Management
- Use existing form store patterns
- Ensure calculations run efficiently (debounce if needed)
- Store results in existing yield fields

### Testing Scenarios
- Single occupancy dwellings only
- Mixed single and dual occupancy dwellings
- All vacant units (Current Yield = 0)
- No rent appraisals entered (Appraised Yield = 0)
- Partial data (some dwellings complete, some incomplete)
- Changing occupancy from tenanted to vacant (Current Yield updates)

### Performance Considerations
- With up to 25 dwellings, calculations involve summing up to 50 values
- Ensure calculations don't cause UI lag
- Consider memoization if needed

## Deliverables
1. Appraised Yield calculation function
2. Current Yield calculation function
3. Integration with form state updates
4. Proper calculation triggers
5. Validation and edge case handling
6. Testing coverage

## References
- Existing yield calculation logic in the codebase
- Field definitions from `09-tri-plus-field-analysis-v2.csv`
- JSON structure from design discussions
