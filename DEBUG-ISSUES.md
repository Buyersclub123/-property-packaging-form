# Debug Issues - Fixed

## Issues Reported:
1. Zoning and overlays not populating
2. Separate address fields not populating  
3. No suburb field showing on main screen

## Fixes Applied:

### 1. Zoning and Overlays Population ✓
- **Added:** Better logging in `handleGeocode` and `useEffect`
- **Fixed:** useEffect now properly triggers when stashData changes
- **Fixed:** ZoningDisplay component now checks multiple sources (zoning, zone, zoneDesc)
- **Fixed:** Auto-population now handles both `zoning` and `zone` fields from Stash

### 2. Address Fields Population ✓
- **Added:** `parseAndPopulateAddress` function with improved parsing logic
- **Fixed:** Function is called after Stash check completes
- **Added:** Multiple parsing strategies:
  - Comma-separated: "123 Main St, Suburb State 1234"
  - Comma-separated: "123 Main St, Suburb, State 1234"
  - Space-separated: "123 Main St Suburb State 1234"
- **Added:** Console logging to debug parsing

### 3. Suburb Field Visibility ✓
- **Verified:** Suburb field IS in the code (line 410-416)
- **Fixed:** Added LGA display to address grid (was in separate section)
- **Fixed:** Made Suburb and State fields required (*)
- **Layout:** Address grid now shows:
  - Row 1: Street Number | Street Name
  - Row 2: Suburb | State
  - Row 3: Post Code | LGA

## Testing Steps:

1. **Open browser console** (F12)
2. **Enter address** and click "Check Stash"
3. **Check console logs** - you should see:
   - "Stash Response:" with full response
   - "Updating flood to:" / "Updating bushfire to:" / "Updating zoning to:"
   - "Parsing address:" with parsing details
   - "useEffect: Auto-populating from Stash data:"
4. **Verify fields populate:**
   - Zoning field should show value
   - Flood dropdown should show Yes/No from Stash
   - Bushfire dropdown should show Yes/No from Stash
   - Address components should populate (Street Number, Street Name, Suburb, State, Post Code)
   - LGA should appear in address grid

## If Still Not Working:

Check console logs to see:
- What Stash response format is
- If parsing is working
- If useEffect is triggering

Share console output if issues persist!







