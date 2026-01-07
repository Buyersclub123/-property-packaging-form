# Stash Zoning Information Issue

## Problem
When clicking "Check Stash" on Step 0 (Address & Risk), the zoning field is not being populated even though flood and bushfire risk fields are populated correctly.

## Expected Behavior
- When Stash returns zoning data: Populate the zoning field automatically
- When Stash does NOT return zoning data: Highlight/indicate that Stash did not provide zoning information (similar to how other missing data is handled)

## Current Behavior
- Zoning field remains blank/empty
- No indication that Stash was checked but didn't have zoning data
- User is left wondering if:
  1. Stash wasn't checked yet
  2. Stash was checked but has no zoning data
  3. There's an error with the Stash integration

## Action Needed
1. Investigate why zoning is not being populated from Stash response
2. Add visual indicator when Stash is checked but zoning is missing
3. Consider adding a note/alert similar to: "⚠️ Stash did not return zoning information for this address"

## Related Files
- `src/components/steps/Step0AddressAndRisk.tsx` - Stash integration and data population
- Stash API response structure - check if zoning field exists in response

