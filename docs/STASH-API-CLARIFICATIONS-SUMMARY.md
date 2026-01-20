# Stash API Clarifications - Summary

## ✅ Clarifications Received

### 1. Risk Overlay Fields
**Status:** ✅ RESOLVED

- **Flood** ✅ - Auto-populated from Stash (`floodRisk`)
- **Bushfire** ✅ - Auto-populated from Stash (`bushfireRisk`)
- **Mining** ⚠️ - **MANUAL** (user identifies, not from Stash)
- **Other (Overlay)** ⚠️ - **MANUAL** (user identifies, not from Stash)
- **Special Infrastructure** ⚠️ - **MANUAL** (user identifies, not from Stash)
- **Heritage** ❌ - Ignored (not used)
- **Biodiversity** ❌ - Ignored (not used)

**Conclusion:** Module 7 is correct - only extracts Flood and Bushfire. Mining, Other Overlay, and Special Infrastructure are manual fields.

---

### 2. Field Value Format
**Status:** ✅ VERIFIED

- Module 7 returns: `"Yes"` or `"No"` (capital Y, capital N)
- Form dropdowns: `"Yes"` / `"No"` (capital Y, capital N)
- **Match:** ✅ Perfect match

---

### 3. Coordinates
**Status:** ⚠️ NEEDS UPDATE

**User Requirement:**
- Coordinates used to query GeoScape to get property name
- Google Sheet uses coordinates to match addresses

**Current Issue:**
- Module 9 extracts coordinates (`longitude`, `latitude`)
- Module 7 doesn't include coordinates in output
- Module 8 returns Module 7 output (no coordinates)

**Action Required:**
- [ ] **UPDATE Module 7** to include coordinates from Module 9
- [ ] Add `longitude` and `latitude` to Module 7 output
- [ ] Or pass coordinates through from Module 9 to Module 7

---

### 4. LGA Format
**Status:** ⚠️ NEW FIELD - NEEDS MAPPING

**User Notes:**
- LGA is NEW - haven't pulled this before
- Need to map how to use the data
- Keep sight of other data for future use

**Module 7 Output:**
- `lga`: "<LGA name>" (e.g., "Sunshine Coast Regional Council")
- `lgaPid`: "<LGA PID>"
- `state`: "<state>" (e.g., "QLD")

**Action Required:**
- [ ] **TEST** with sample address to see LGA format
- [ ] **MAP** LGA format to Google Sheet "Investment Highlights" format
- [ ] **DOCUMENT** other available data fields for future use

---

### 5. Error Handling
**Status:** ⚠️ NEEDS IMPLEMENTATION

**User Requirement:**
- Best practice error handling
- Ensure records are not lost
- Need to work this out

**Error Scenarios:**
- Geocoding fails (Module 4)
- Login fails (Module 5)
- Planning info API fails (Module 1)
- No planning data found (Module 7)

**Action Required:**
- [ ] Implement error handling in form
- [ ] Log errors to Google Sheet "Errors" tab
- [ ] Allow user to retry or continue manually
- [ ] Save form state even if API fails
- [ ] Show user-friendly error messages

---

### 6. Testing
**Status:** ⚠️ IN PROGRESS

**Test Address:** `4 Osborne Circuit Maroochydore QLD 4558`

**Test Webhook:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`

**Test Result:** Response was "7" (likely module reference, not actual data)

**Next Steps:**
- [ ] Check Make.com execution logs for full response
- [ ] Create Google Sheet to capture test results
- [ ] Document all available fields
- [ ] Map LGA format

---

## 📋 Action Items

### Immediate (Before Form Development)

1. **Test Webhook Properly**
   - Check Make.com execution logs for full response
   - Capture complete JSON response structure
   - Document all fields

2. **Create Google Sheet**
   - Use structure from `GOOGLE-SHEET-STASH-TEST-STRUCTURE.md`
   - Capture test results
   - Analyze LGA format

3. **Update Module 7 (if needed)**
   - Add coordinates to output
   - Verify all fields are extracted correctly

### During Form Development

4. **Error Handling**
   - Implement graceful error handling
   - Log errors to Google Sheet
   - Don't lose form data

5. **Field Mapping**
   - Map Stash API fields to form fields
   - Handle manual fields (Mining, Other Overlay, Special Infrastructure)
   - Map LGA for Investment Highlights lookup

---

## 📊 Field Mapping Summary

| Stash API Field | Form Field | Type | Notes |
|----------------|------------|------|-------|
| `floodRisk` | `flood` | Auto-populated | Can override |
| `bushfireRisk` | `bushfire` | Auto-populated | Can override |
| `zoning` | `zoning` | Auto-populated | Full format: "CODE (Description)" |
| `lga` | `lga` | Auto-populated | For Investment Highlights lookup |
| `state` | `state` | Auto-populated | State code |
| `longitude` | (coordinates) | Auto-populated | For GeoScape lookup |
| `latitude` | (coordinates) | Auto-populated | For GeoScape lookup |
| `mining` | `mining` | **MANUAL** | User identifies |
| `other_overlay` | `other_overlay` | **MANUAL** | User identifies |
| `special_infrastructure` | `special_infrastructure` | **MANUAL** | User identifies |

---

## 🔗 Related Documents

- `TEST-STASHPROPERTY-AP-COMPLETE.md` - Complete module flow
- `TEST-STASHPROPERTY-AP-MODULE-DETAILS.md` - Detailed module breakdown
- `GOOGLE-SHEET-STASH-TEST-STRUCTURE.md` - Google Sheet structure for testing
- `STASH-API-TEST-PLAN.md` - Test plan

---

## ✅ Ready to Proceed

**Status:** Ready to start form development with these clarifications

**Blockers Resolved:**
- ✅ Risk overlay fields clarified (Mining, Other Overlay, Special Infrastructure are manual)
- ✅ Field value format verified (Yes/No matches)
- ⚠️ Coordinates need to be added to Module 7 output
- ⚠️ LGA format needs mapping (can do during development)
- ⚠️ Error handling needs implementation (can do during development)

**Next Step:** Test webhook properly and capture full response structure







