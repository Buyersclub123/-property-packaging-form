# Portal Production Testing Checklist

## Pre-Testing Setup

### 1. Get Required URLs

Before testing, collect these URLs:

- **Portal Base URL:** `https://buyersclub123.github.io/property-portal`
- **Scenario 5 Webhook URL:** (Get from Make.com Scenario 5, Module 8 - the webhook that returns opportunities)
- **Module 1 Webhook URL:** (Get from Make.com "GHL Property Review Submitted" scenario, Module 1 - the webhook that sends emails)
- **Form-App API URL:** `https://property-review-form.vercel.app`

### 2. Construct Test Portal URL

Build a test URL with all required parameters:

```
https://buyersclub123.github.io/property-portal?webhookUrl=YOUR_SCENARIO_5_WEBHOOK&module1Webhook=YOUR_MODULE_1_WEBHOOK&apiUrl=https://property-review-form.vercel.app&recordId=TEST_RECORD_ID&propertyId=TEST_PROPERTY_ID&propertyAddress=TEST_ADDRESS
```

**Replace:**
- `YOUR_SCENARIO_5_WEBHOOK` - Actual Scenario 5 webhook URL
- `YOUR_MODULE_1_WEBHOOK` - Actual Module 1 webhook URL
- `TEST_RECORD_ID` - A real GHL record ID for testing
- `TEST_PROPERTY_ID` - A real property ID for testing
- `TEST_ADDRESS` - A real property address for testing

---

## Testing Checklist

### ✅ Test 1: Portal Loads Correctly

**Steps:**
1. Open the portal URL in a browser
2. Check browser console for errors (F12 → Console tab)

**Expected Results:**
- [ ] Portal page loads without errors
- [ ] No JavaScript errors in console
- [ ] Logo and header display correctly
- [ ] Loading message appears: "We are just retrieving the Opportunities from GHL, thank you for your patience"

**If Issues:**
- Check URL parameters are correctly formatted (URL-encoded)
- Verify all webhook URLs are valid
- Check browser console for specific error messages

---

### ✅ Test 2: Opportunities Load from Scenario 5

**Steps:**
1. Wait for loading message to disappear
2. Check if opportunities table appears
3. Open browser console (F12 → Network tab)
4. Look for request to Scenario 5 webhook URL

**Expected Results:**
- [ ] Loading message disappears after data loads
- [ ] Opportunities table displays with data
- [ ] Network request to Scenario 5 webhook returns 200 status
- [ ] Response contains array of opportunity objects
- [ ] Each opportunity has: `id`, `name`, `stage`, `assignedBA`, `client`, `partner`, `emails`

**If Issues:**
- Check Make.com Scenario 5 is active and running
- Verify webhook URL is correct
- Check Scenario 5 execution logs in Make.com
- Verify response format matches expected structure

---

### ✅ Test 3: Lookup Functionality (BA Names & Stage Names)

**Steps:**
1. Check if BA names display correctly (not IDs)
2. Check if pipeline stage names display correctly (not UUIDs)
3. Open browser console (F12 → Network tab)
4. Look for request to `/api/lookups` endpoint

**Expected Results:**
- [ ] BA names show actual names (e.g., "John Truscott") not IDs
- [ ] Pipeline stages show names (e.g., "Property Review") not UUIDs
- [ ] "Unassigned" displays for opportunities without assigned BA
- [ ] Network request to `/api/lookups` returns 200 status
- [ ] Lookup response contains `bas` and `stages` objects

**If Issues:**
- Check form-app API is accessible
- Verify `/api/lookups` endpoint is working
- Check Admin Google Sheet has correct BA and stage data
- Check browser console for CORS errors (should not occur in production)

---

### ✅ Test 4: Filter Functionality

**Steps:**
1. Click "Filter by BA" dropdown
2. Select a BA from the list
3. Verify opportunities filter correctly
4. Click "Filter by Stage" dropdown
5. Select a stage from the list
6. Verify opportunities filter correctly
7. Check filter counts display (e.g., "John Truscott (2)")

**Expected Results:**
- [ ] BA filter dropdown opens and shows list of BAs
- [ ] Filter counts display next to each BA (e.g., "John Truscott (2)")
- [ ] Selecting a BA filters opportunities correctly
- [ ] Stage filter dropdown opens and shows list of stages
- [ ] Filter counts display next to each stage
- [ ] Selecting a stage filters opportunities correctly
- [ ] "Done" button closes filter dropdowns
- [ ] "Reset All" button clears all filters

**If Issues:**
- Check browser console for JavaScript errors
- Verify filter logic is working correctly
- Check that opportunities have valid BA and stage data

---

### ✅ Test 5: Checkbox Functionality

**Steps:**
1. Check if opportunities load with checkboxes unchecked
2. Click a checkbox to select an opportunity
3. Verify checkbox state changes

**Expected Results:**
- [ ] All opportunities load with checkboxes unchecked by default
- [ ] Clicking checkbox selects/deselects opportunity
- [ ] Selected opportunities are tracked correctly

**If Issues:**
- Check HTML structure for checkbox elements
- Verify JavaScript event listeners are attached

---

### ✅ Test 6: Standard Message Section

**Steps:**
1. Locate "Standard Message" section at top of page
2. Type a test message
3. Click "Save Message" button
4. Verify message saves

**Expected Results:**
- [ ] Standard message section displays correctly
- [ ] Textarea is editable
- [ ] "Save Message" button works
- [ ] Success message appears after saving
- [ ] Message persists (check if it loads saved message on refresh)

**If Issues:**
- Check form-app API `/api/ba-messages` endpoint
- Verify API request is sent correctly
- Check browser console for errors

---

### ✅ Test 7: "Action the Above" Button

**Steps:**
1. Select one or more opportunities (checkboxes)
2. Click "Action the Above" button (green button, left side)
3. Check browser console (F12 → Network tab)
4. Look for request to Module 1 webhook

**Expected Results:**
- [ ] Button is green and positioned on left side
- [ ] Button is full width (or matches other button size)
- [ ] Clicking button sends request to Module 1 webhook
- [ ] Request payload contains:
  - `source: "portal"`
  - `selectedClients` array with selected opportunities
  - Each client has: `id`, `emails`, `name`, `client`, `partner`, etc.
- [ ] Success message appears after sending
- [ ] Portal closes automatically after success (if configured)

**If Issues:**
- Check Module 1 webhook URL is correct
- Verify Make.com scenario is active
- Check Make.com execution logs
- Verify payload structure matches expected format
- Check browser console for errors

---

### ✅ Test 8: Button Layout and Styling

**Steps:**
1. Check button positions and sizes
2. Verify styling matches requirements

**Expected Results:**
- [ ] "Action the Above" button is green, on left, full width (or matching size)
- [ ] No "Non-Suitable" button (should be removed)
- [ ] No "Send to All with Standard Message" button (should be removed)
- [ ] Buttons are properly spaced and aligned

**If Issues:**
- Check CSS styles in portal HTML
- Verify button elements exist/removed correctly

---

### ✅ Test 9: Error Handling

**Steps:**
1. Test with invalid webhook URL (modify URL parameter)
2. Test with missing URL parameters
3. Test when Scenario 5 returns error
4. Test when form-app API is unavailable

**Expected Results:**
- [ ] Clear error message displays: "Unable to load opportunities. The connection to the server failed. Please try refreshing the page or contact support if the problem continues."
- [ ] Error message is user-friendly (not technical)
- [ ] No JavaScript errors break the page
- [ ] Portal remains functional for other features

**If Issues:**
- Check error handling code
- Verify error messages are user-friendly
- Test all error scenarios

---

### ✅ Test 10: Email Sending (End-to-End)

**Steps:**
1. Select one or more opportunities
2. Optionally edit standard message
3. Click "Action the Above" button
4. Check Make.com execution logs
5. Verify emails are sent to clients

**Expected Results:**
- [ ] Request reaches Make.com Module 1 webhook
- [ ] Make.com scenario executes successfully
- [ ] Emails are sent to client email addresses
- [ ] Email content includes property details
- [ ] Success message appears in portal
- [ ] Portal closes after success (if configured)

**If Issues:**
- Check Make.com scenario execution logs
- Verify email addresses are correct in opportunity data
- Check Make.com email module configuration
- Verify Gmail integration is working

---

## Production Readiness Checklist

Before going live, verify:

- [ ] All webhook URLs are production URLs (not test)
- [ ] Make.com scenarios are active and running
- [ ] Form-app API is deployed and accessible
- [ ] Admin Google Sheet has correct BA and stage data
- [ ] Email templates in Make.com are correct
- [ ] Portal links in Make.com email templates include all URL parameters
- [ ] Portal links in Google Sheets Deal Sheet include all URL parameters
- [ ] Security validation is added in Make.com scenarios (source check, auth token if used)
- [ ] Error messages are user-friendly
- [ ] All UI elements display correctly
- [ ] All functionality works as expected

---

## Common Issues and Solutions

### Issue: Portal shows "Unable to load opportunities" error

**Possible Causes:**
- Webhook URL is incorrect or missing
- Make.com Scenario 5 is not active
- CORS error (should not occur in production, only local file://)

**Solutions:**
- Verify webhook URL parameter is correct
- Check Make.com Scenario 5 is active
- Check Scenario 5 execution logs
- Verify response format matches expected structure

### Issue: BA names or stage names show as IDs/UUIDs

**Possible Causes:**
- Lookup API is not accessible
- Admin Google Sheet data is missing
- Lookup endpoint returns error

**Solutions:**
- Check form-app API is accessible
- Verify `/api/lookups` endpoint works
- Check Admin Google Sheet has correct data
- Check browser console for API errors

### Issue: "Action the Above" button doesn't work

**Possible Causes:**
- Module 1 webhook URL is incorrect
- Make.com scenario is not active
- Payload structure is incorrect

**Solutions:**
- Verify `module1Webhook` URL parameter is correct
- Check Make.com scenario is active
- Check Make.com execution logs
- Verify payload structure matches expected format

### Issue: Emails not being sent

**Possible Causes:**
- Make.com scenario execution fails
- Email addresses are incorrect
- Gmail integration not configured

**Solutions:**
- Check Make.com execution logs
- Verify email addresses in opportunity data
- Check Make.com Gmail module configuration
- Test Make.com scenario manually

---

## Testing Notes

**Date:** _______________

**Tester:** _______________

**Environment:** Production

**Test Results:**
- Test 1: Portal Loads: ☐ Pass ☐ Fail
- Test 2: Opportunities Load: ☐ Pass ☐ Fail
- Test 3: Lookup Functionality: ☐ Pass ☐ Fail
- Test 4: Filter Functionality: ☐ Pass ☐ Fail
- Test 5: Checkbox Functionality: ☐ Pass ☐ Fail
- Test 6: Standard Message: ☐ Pass ☐ Fail
- Test 7: Action Button: ☐ Pass ☐ Fail
- Test 8: Button Layout: ☐ Pass ☐ Fail
- Test 9: Error Handling: ☐ Pass ☐ Fail
- Test 10: Email Sending: ☐ Pass ☐ Fail

**Issues Found:**
1. 
2. 
3. 

**Resolution:**
1. 
2. 
3. 

---

## Next Steps After Testing

1. Document any issues found
2. Fix issues in development
3. Re-test fixes
4. Update documentation if needed
5. Deploy fixes to production
6. Verify fixes in production
