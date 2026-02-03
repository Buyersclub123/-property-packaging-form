# Portal Fixes Applied - 2026-02-03

## Changes Made to `portal/index.html`

### Issue #1: BA Email Address Lookup - FIXED ✅

**Problem:** Portal was sending BA name ("John Truscott") instead of email address in both `baEmail` and `sendFromEmail` fields.

**Solution:**

1. **Added helper function `convertBAIdentifierToEmail()`** (before `collectSelections()` function):
   - Checks if identifier is already an email (contains '@')
   - Tries direct lookup in `baEmailMap` (for short names like "john.t")
   - Tries case-insensitive lookup
   - Tries constructing email from short name + "@buyersclub.com.au"
   - Returns `null` if no match found

2. **Updated `sendEmailsToClients()` function**:
   - Calls `convertBAIdentifierToEmail()` to get `baEmailAddress`
   - Uses `baEmailAddress` as default for `sendFromEmail`
   - Added validation: Shows error message if BA identifier cannot be matched to email:
     > "Your name '[identifier]' is not matched to an email address to allow you to send emails to clients from this portal. Please contact support before attempting to send email from here."
   - Added validation: Shows error if `sendFromEmail` is invalid
   - Payload now sends:
     - `baEmail`: Always an email address (converted from identifier)
     - `sendFromEmail`: Always an email address (from BA or "send on behalf" selection)

**Result:** Portal now sends email addresses in both fields, not names.

---

### Issue #2: BA Friendly Message Saving - IMPROVED ✅

**Problem:** Portal showed "saved" confirmation but Admin Sheet remained empty. Root cause was missing GHL user ID in some cases.

**Solution:**

1. **Enhanced `saveGenericMessage()` function**:
   - Added case-insensitive lookup for `ghlUserId` when exact match not found
   - This handles cases where `saveKey` case doesn't match `baGhlUserIdMap` keys
   - Added warning message when save to API fails due to missing GHL user ID:
     > "Warning: Could not save to Admin Sheet (missing GHL user ID for '[name]'). Saved locally only."
   - Still saves to localStorage as fallback
   - Better console logging with `saveKey` included for debugging

**Result:** 
- Improved matching of BA names to GHL user IDs
- Clear feedback when API save fails
- Still provides local caching as fallback

---

### Issue #3: BA Email Lookup Verification - CONFIRMED ✅

**Status:** The `loadBAEmailMap()` function is working correctly:
- Calls `/api/bas` endpoint
- Populates `baEmailMap` (name → email)
- Populates `baGhlUserIdMap` (name → GHL user ID)
- Console logs confirm data loaded

**Admin Sheet Structure Confirmed:**
- Tab: "Packagers & Sourcers"
- Column A: `Enter BC email below` (email address)
- Column B: `Friendly Name` (short name like "john.t", "mohit.n")
- Column C: `GHL user ID` (UUID)

**Result:** Lookup is working. Issue #1 fix now uses this data correctly.

---

## Testing Checklist

### Test Issue #1 Fix:
1. Open portal with URL parameter: `?baEmail=john.t`
2. Select clients and click "Action the Above"
3. Check Make.com webhook receives:
   - `baEmail`: "john.t@buyersclub.com.au" (email, not name)
   - `sendFromEmail`: "john.t@buyersclub.com.au" (email, not name)

### Test Issue #1 Error Handling:
1. Open portal with URL parameter: `?baEmail=InvalidName`
2. Try to send emails
3. Should see error: "Your name 'InvalidName' is not matched to an email address..."

### Test Issue #2 Fix:
1. Open portal with URL parameter: `?baEmail=john.t`
2. Enter a message in "Your Standard Client Message"
3. Click "Save Message"
4. Check Admin Sheet tab "BA friendly message for portal"
5. Should see new row with:
   - Friendly Name: "john.t"
   - GHL user ID: "ivq1rs3PIhzalIlnGXLr"
   - Generic Message: [your message text]

### Test Issue #2 Warning:
1. If GHL user ID is missing from Admin Sheet for a BA
2. Try to save message
3. Should see warning: "Warning: Could not save to Admin Sheet (missing GHL user ID for '[name]'). Saved locally only."

---

## Files Changed

- `property-review-system/portal/index.html` - All fixes applied

---

## Next Steps

1. **Test locally** - Open `portal/index.html` in browser with test parameters
2. **Verify fixes work** - Check console logs and test all scenarios
3. **Commit to Git** - Push to main branch (single repo)
4. **Deploy to Vercel** - Vercel auto-deploys from main branch

---

## Security Check ✅

- ✅ No hardcoded webhook URLs (uses URL parameters)
- ✅ No API keys or tokens
- ✅ No secrets
- ✅ Google Sheet ID is public data (OK)

**Safe to deploy.**

---

## Remaining Issues (Not Fixed Yet)

- **Issue #4:** UI improvements (remove Status column, add sent indicator)
- **Issue #5:** Send history logging to Admin Sheet "Sent" tab
- **Issue #6:** Test "Send on behalf" feature (blocked until Issue #1 tested)
- **Issue #7:** Deal Sheet link generation

---

**Fixes completed by:** AI Assistant  
**Date:** 2026-02-03  
**Ready for testing:** YES  
**Ready for deployment:** After local testing
