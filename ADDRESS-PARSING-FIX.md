# Address Parsing Fix

## The Problem
When user enters a misspelled address (e.g., "4 osbornce cricuit maroochydore"), the address parsing function splits the misspelled string and populates the address fields with misspelled values.

## Solution Options

### Option 1: Don't Auto-Populate (IMPLEMENTED)
**Status:** ✅ Done
- Address parsing disabled
- User must manually enter address components
- Prevents misspelling propagation

### Option 2: Use Geoscape Corrected Address (FUTURE)
**Requires:** 
- Geoscape API returns corrected address in response
- Need to check Module 4/9 output for corrected address
- Or call Geoscape API directly from frontend

**Implementation:**
1. Check if Geoscape API response includes corrected address components
2. If yes, populate from Geoscape response instead of parsing user input
3. If no, don't auto-populate

### Option 3: Address Validation Service
**Requires:**
- Integration with address validation API (e.g., Google Places Autocomplete)
- More complex but provides best user experience

## Current Implementation

**Status:** Auto-population DISABLED
- User enters full address
- Clicks "Check Stash"
- Stash data populates (zoning, LGA, flood, bushfire)
- Address components remain blank for manual entry
- User manually enters Street Number, Street Name, Suburb, State, Post Code

**Benefits:**
- No misspelling propagation
- User has control over address format
- Stash data still populates correctly

**Trade-offs:**
- User must manually enter address components
- More typing required

---

## Future Enhancement

If Geoscape API returns corrected address components, we can:
1. Extract corrected address from Geoscape response
2. Populate address fields automatically
3. User can still edit if needed

**Check:** Does Geoscape API response include formatted address components?







