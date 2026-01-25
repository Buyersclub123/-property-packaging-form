# GHL Field Value Mappings

## Fields that need value mapping (Form → GHL)

### asking
- **Form sends:** `"On-market"`, `"Off-market"`, `"Pre-launch"`, `"Coming Soon"`, `"TBC"`, `"N/A"`
- **GHL expects:** 
  - `"on-market"` or `"onmarket"`
  - `"off-market"` or `"offmarket"`
  - `"pre-launch opportunity"` or `"prelaunch_opportunity"`
  - `"coming soon"` or `"coming_soon"`
- **Mapping required:**
  - `"On-market"` → `"on-market"`
  - `"Off-market"` → `"off-market"`
  - `"Pre-launch"` → `"pre-launch opportunity"`
  - `"Coming Soon"` → `"coming soon"`
  - `"TBC"` → `null` (or check if GHL accepts this)
  - `"N/A"` → `null` (or check if GHL accepts this)
- **Status:** ❌ Needs mapping function in Module 21
- **Action needed:** Add mapping function in Module 21

---

## Fields with errors

### acceptable_acquisition__from
- **Error:** `"Invalid field value '768000' for 'acceptable_acquisition__from'"`
- **Form sends:** `"768000"` (string from form)
- **Module 21 converts:** Number `768000` (correct - returns object with number)
- **Module 14 config:** `"inputMethod": "jsonString"` + `"jsonStringBodyContent": "{{21.result}}"`
- **Problem:** Using `"jsonString"` input method causes Make.com to re-stringify, converting numbers to strings
- **GHL receives:** `'768000'` (quoted in error = string)
- **Status:** ❌ Root cause identified - Module 14 configuration
- **Fix needed:** Change Module 14 `inputMethod` from `"jsonString"` to `"dataStructure"` and map `{{21.result}}` directly

---

## Fields that are working correctly
- Numeric fields now sending `0` instead of `null` ✅

---

## Notes
- Form sends values like "Pre-launch", "On-market" etc.
- GHL expects lowercase with underscores or dashes: "pre-launch opportunity", "on-market"
- Need to create mapping function in Module 21 to convert form values to GHL values
