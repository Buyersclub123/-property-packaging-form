# Stash Property AP - Verification Questions

## 🔴 Critical - Need to Verify

### 1. Missing Risk Overlay Fields ⚠️ CRITICAL
**Issue:** Module 7 extracts:
- `floodRisk` ✅ → Maps to form field `flood`
- `bushfireRisk` ✅ → Maps to form field `bushfire`
- `heritageRisk` ✅ → **NOT CLEAR WHERE THIS MAPS**
- `biodiversityRisk` ✅ → **NOT CLEAR WHERE THIS MAPS**

**But form requires (from requirements doc):**
- `flood` ✅ (maps from `floodRisk`)
- `bushfire` ✅ (maps from `bushfireRisk`)
- `mining` ❌ **NOT EXTRACTED - REQUIRED BY FORM**
- `other_overlay` ❌ **NOT EXTRACTED - REQUIRED BY FORM**
- `special_infrastructure` ❌ **NOT EXTRACTED - REQUIRED BY FORM**

**From Requirements Doc:**
- All overlays should be **AUTO-POPULATED from Stash API (Yes/No)**
- Form has dropdowns for: Flood, Bushfire, Mining, Other (Overlay), Special Infrastructure
- All can be overridden by user

**Questions:**
- [ ] **CRITICAL:** Does Stash Property API return `mining` data? If yes, where in the response? (Check `rawStashData` or `rawHazards`)
- [ ] **CRITICAL:** Does Stash Property API return `special_infrastructure` data? If yes, where in the response?
- [ ] **CRITICAL:** Does Stash Property API return `other_overlay` data? Or should `heritageRisk` and `biodiversityRisk` map to `other_overlay`?
- [ ] Should we check `rawStashData` or `rawHazards` for these missing fields?
- [ ] **ACTION REQUIRED:** Module 7 code needs to be updated to extract these 3 missing fields

---

### 2. Field Value Format ✅ VERIFIED
**Status:** Module 7 returns `"Yes"` or `"No"` (capital Y, capital N)

**Form Requirements (from requirements doc):**
- Dropdown options: "Yes" / "No" ✅ **MATCHES**
- Format confirmed: Capital Y, capital N

**Verified:** ✅ Format matches exactly

---

### 3. Coordinates Not in Final Response ✅ CLARIFIED
**Status:** Need to add coordinates to response

**User Requirement:**
- Coordinates are used to query GeoScape to get property name
- Google Sheet uses coordinates to match addresses

**Current Flow:**
- Module 9 → extracts coordinates (`longitude`, `latitude`)
- Module 7 → doesn't include coordinates
- Module 8 → returns Module 7 output (no coordinates)

**Action Required:**
- [ ] **UPDATE Module 7** to include coordinates from Module 9
- [ ] Add `longitude` and `latitude` to Module 7 output
- [ ] Or pass coordinates through from Module 9 to Module 7

**Solution:** Module 7 should receive coordinates from Module 9 and include them in output

---

### 4. Zoning Format
**Module 7 Output:** `zoning: "CODE (Description)"` (e.g., "R2 (Low Density Residential)")

**Form Requirements:**
- Field type: Text (free text)
- Email format: Just the code or full format?

**Questions:**
- [ ] Does the form need just the code (`zone`), or the full format (`zoning`)?
- [ ] What format does the email template expect?

---

### 5. LGA Format for Investment Highlights Lookup ✅ CLARIFIED
**Status:** New field - need to map usage

**Module 7 Output:** 
- `lga: "<LGA name>"`
- `lgaPid: "<LGA PID>"`
- `state: "<state>"`

**User Notes:**
- LGA is NEW - haven't pulled this before
- Need to map how to use the data
- Keep sight of other data for future use

**Form Requirements:**
- Used to lookup Investment Highlights from Google Sheet
- Lookup by: LGA + State

**Action Required:**
- [ ] **TEST** with sample address to see LGA format
- [ ] **MAP** LGA format to Google Sheet format
- [ ] **DOCUMENT** other available data fields for future use

---

## 🟡 Important - Should Verify

### 6. Error Handling ✅ CLARIFIED
**Status:** Need best practice implementation

**User Requirement:**
- Best practice error handling
- Ensure records are not lost
- Need to work this out

**Current:** Module 7 returns error object if no planning data found:
```json
{
  "error": true,
  "errorMessage": "No planning data found in Stashproperty API response",
  "rawResponse": {...}
}
```

**Error Scenarios:**
- [ ] Geocoding fails (Module 4) - What happens?
- [ ] Login fails (Module 5) - What happens?
- [ ] Planning info API fails (Module 1) - What happens?
- [ ] Form should handle errors gracefully
- [ ] Show error messages to users
- [ ] **CRITICAL:** Don't lose form data if API fails

**Action Required:**
- [ ] Implement error handling in form
- [ ] Log errors to Google Sheet "Errors" tab
- [ ] Allow user to retry or continue manually
- [ ] Save form state even if API fails

---

### 7. Response Time / Timeouts
**Current Flow:** 3 API calls (geocode + login + planning info)

**Questions:**
- [ ] What's the typical response time? (5 seconds? 10 seconds? 30 seconds?)
- [ ] Should the form show a loading indicator?
- [ ] Should we set a timeout? (e.g., 30 seconds max)
- [ ] What happens if it times out?

---

### 8. Authentication Credentials
**Module 5:** Hardcoded email/password:
```json
{
  "email": "ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**Questions:**
- [ ] Are these credentials secure in Make.com? (stored securely?)
- [ ] Should we use Make.com data store or environment variables?
- [ ] What if credentials expire or change?

---

### 9. Geocoding API Authorization
**Module 4:** Uses authorization token:
```
Authorization: VfqDRW796v5jGTfXcHgJXDdoGi7DENZA
```

**Questions:**
- [ ] Is this token secure in Make.com?
- [ ] Does it expire?
- [ ] What if it stops working?

---

## 🟢 Nice to Have - Can Verify Later

### 10. Additional Data Available
**Module 7 Output Includes:**
- `lotSizeMin` / `lotSizeAvg`
- `planningLinks` (array of links)
- `rawStashData` (full response)
- `rawHazards` (hazards object)
- `rawSources` (sources array)

**Questions:**
- [ ] Should we use `lotSizeMin` to auto-populate `Land Size` field?
- [ ] Should we display `planningLinks` in the form?
- [ ] Should we store `rawStashData` for reference?

---

### 11. Testing
**Questions:**
- [ ] Do you have a test address we can use to verify the webhook?
- [ ] Should we test with different address formats?
- [ ] Should we test error scenarios (invalid address, API failures)?

---

## Summary - Most Critical Questions

**Must Answer Before Building Form:**

1. **🔴 CRITICAL - Missing fields:** `mining`, `other_overlay`, `special_infrastructure` - where are they in Stash response?
   - Form requires all 5 overlays: Flood ✅, Bushfire ✅, Mining ❌, Other (Overlay) ❌, Special Infrastructure ❌
   - Module 7 only extracts 4: floodRisk ✅, bushfireRisk ✅, heritageRisk ✅, biodiversityRisk ✅
   - **ACTION:** Need to check Stash API response structure for missing fields OR update Module 7 code

2. **Field mapping:** Does `heritageRisk` / `biodiversityRisk` map to `other_overlay`, or are they separate fields?
   - Form has separate field: `other_overlay`
   - Module 7 extracts: `heritageRisk` and `biodiversityRisk` separately
   - **QUESTION:** Are these the same thing, or different?

3. **Coordinates:** Do we need them in the response for Google Maps?
   - Module 9 extracts coordinates but they're not in final response
   - Form may need them for Google Maps link generation

4. **LGA format:** Exact format for Investment Highlights lookup?
   - Requirements doc says: "Uses LGA level, not suburb level"
   - Example: "Campaspe Shire"
   - Module 7 returns: `lga` field - need to verify format matches Google Sheet

**Can Answer During Development:**

5. Error handling strategy
6. Response time / timeouts
7. Testing addresses

---

## Recommended Next Steps

1. **Test the webhook** with a sample address to see actual response structure
2. **Check `rawStashData`** for missing fields (`mining`, `special_infrastructure`)
3. **Verify LGA format** in Google Sheet "Investment Highlights" tab
4. **Confirm field value formats** match form dropdowns exactly

