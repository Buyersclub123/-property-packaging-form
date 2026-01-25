# Production Cutover Checklist

## Overview
This document lists all tasks required before going live with the Property Review System.

**Date Created:** [Date]
**Target Go-Live Date:** [Date]
**Status:** 🟡 In Progress

---

## Quick Summary - Critical Items

### Must Do Before Go-Live:
1. ✅ **Path 1:** Configure packager email in Gmail module + BA email forwarding setup
2. ✅ **Path 2:** Update "To" field to `property@buyersclub.com.au`
3. ✅ **Path 4:** Configure "From" field + BA "Send mail as" setup
4. ✅ **Pipeline Stage:** Switch to production Google Sheet + Create change tracking
5. ✅ **Logging:** Set up Google Sheet logging (Sent/Errors/Filtered tabs)
6. ✅ **Testing:** Complete all testing scenarios

### BA Setup Required:
- **Email Forwarding:** All BAs (for Path 1 approvals)
- **Send Mail As:** All BAs (for Path 4 client emails)

---

## Scenario: "GHL Property Review Submitted"

### Path 1: Packager Email

**Status:** 🟡 Pending

#### Tasks:
- [ ] **Configure Gmail module in Path 1:**
  - [ ] Update "To" field to use packager email from GHL data
  - [ ] Verify "Subject" field is correct (should include "PACKAGER TO APPROVE")
  - [ ] Verify "Content" field uses Module 3 output (`{{3.html_body}}`)
  - [ ] Test with real packager email

- [ ] **BA Email Forwarding Setup:**
  - [ ] All BAs need to enable email forwarding in Gmail
  - [ ] Forward approval emails to Make.com webhook email
  - [ ] Document which BAs have completed setup
  - [ ] Create list of BAs who still need to set up forwarding

**Testing:**
- [ ] Send test property review from GHL
- [ ] Verify packager receives email
- [ ] Verify packager can click approval button
- [ ] Verify approval webhook is received by Make.com

---

### Path 2: BA Email (Auto-Send)

**Status:** 🟡 Pending

#### Tasks:
- [ ] **Update Gmail module "To" field:**
  - [ ] Change to: `property@buyersclub.com.au` (lowercase)
  - [ ] Verify "Subject" field is correct (should include "BA TO AUTOSEND")
  - [ ] Verify "Content" field uses Module 3 output (`{{3.html_body}}`)

**Testing:**
- [ ] Send test property review with `packager_approved = "yes"`
- [ ] Verify email is sent to property@buyersclub.com.au
- [ ] Verify email content is correct
- [ ] Verify BA can click "Review Suitable Clients" button

---

### Path 3: Manual Testing Path

**Status:** ✅ Complete (Non-production path)

**Note:** This path is for testing only, no production changes needed.

---

### Path 4: Client Emails

**Status:** 🟡 Pending

#### Tasks:
- [ ] **Configure Gmail module "From" field:**
  - [ ] Map "From" field to `{{7.sendFromEmail}}` or `{{19.sendFromEmail}}`
  - [ ] Ensure BAs have set up "Send mail as" in Gmail (see BA-SEND-MAIL-AS-SETUP-INSTRUCTIONS.md)
  - [ ] Document which BAs have completed "Send mail as" setup
  - [ ] Create list of BAs who still need to set up "Send mail as"

- [ ] **Verify other Gmail fields:**
  - [ ] "To" field: `{{14.to}}` or `{{7.to}}`
  - [ ] "Subject" field: `{{14.subject}}` or `{{7.subject}}`
  - [ ] "Content" field: `{{14.htmlBody}}` or `{{7.htmlBody}}`

**Testing:**
- [ ] Test portal with real BA email
- [ ] Test "Send From" functionality (if BA has set up "Send mail as")
- [ ] Verify client receives email with correct "From" address
- [ ] Test with multiple clients
- [ ] Test with personalized messages
- [ ] Test with standard messages

---

## Google Sheets Integration

### Pipeline Stage Tracking

**Status:** 🟡 Pending

#### Current Setup:
- [ ] **Verify production Google Sheet:**
  - [ ] Sheet ID: `[TO BE CONFIRMED]`
  - [ ] Tab name: `Opportunities` (or production tab name)
  - [ ] Sheet is accessible by Make.com
  - [ ] Sheet has correct column headers

#### Tasks:
- [ ] **Update Make.com scenario:**
  - [ ] Verify Module 15 (or relevant module) is reading from production sheet
  - [ ] Update Sheet ID to production sheet ID
  - [ ] Update tab name if different from test

- [ ] **Create Change Tracking Version:**
  - [ ] Current version: Pulls data from Google Sheet (exists)
  - [ ] New version needed: Tracks changes to Pipeline Stage
  - [ ] Determine: Should this be a separate scenario or same scenario?
  - [ ] Determine: What triggers the change tracking? (Webhook? Scheduled? Manual?)
  - [ ] Create new Make.com scenario/module to track changes
  - [ ] Create Google Sheet tab: "Pipeline Stage Changes" with columns:
    - Timestamp
    - Opportunity ID
    - Opportunity Name
    - Old Stage
    - New Stage
    - Changed By
    - Change Source

**Testing:**
- [ ] Test pulling data from production sheet
- [ ] Test change tracking (if implemented)
- [ ] Verify data accuracy

---

## Google Sheets: Logging

**Status:** 🟡 Pending

### Tasks:
- [ ] **Create logging sheet:**
  - [ ] Sheet name: "Property Review System Logs" (or as created)
  - [ ] Tabs: "Sent", "Errors", "Filtered"
  - [ ] Headers added to Row 1 in each tab
  - [ ] Sheet shared with Make.com Google account

- [ ] **Configure Make.com logging:**
  - [ ] Error Handler: Right-click Module 1 → Add error handler → Log to "Errors" tab
  - [ ] Success logging: After Module 14 → Log to "Sent" tab
  - [ ] Filtered logging: After Module 18 → Log to "Filtered" tab

**Testing:**
- [ ] Test error logging (intentionally break something)
- [ ] Test success logging (send test email)
- [ ] Test filtered logging (send webhook that doesn't match)

---

## Portal Configuration

**Status:** 🟡 Pending

### Tasks:
- [ ] **Verify portal URLs:**
  - [ ] Portal URL: `https://buyersclub123.github.io/property-portal`
  - [ ] Confirmation page URL: `https://buyersclub123.github.io/property-portal/Confirmation.html`
  - [ ] Module 1 webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
  - [ ] All URLs are correct in Module 3

- [ ] **Verify portal functionality:**
  - [ ] Portal loads correctly
  - [ ] Opportunities load from Google Sheet
  - [ ] Filters work correctly
  - [ ] "Send From" functionality works
  - [ ] Email sending works
  - [ ] Auto-close works after success
  - [ ] Error messages display correctly

**Testing:**
- [ ] Test portal with real BA email link
- [ ] Test portal with real property data
- [ ] Test sending emails to real clients (with test email addresses)
- [ ] Test error scenarios

---

## GHL Integration

**Status:** 🟡 Pending

### Tasks:
- [ ] **Verify GHL API credentials:**
  - [ ] API key is production key (not test)
  - [ ] API key has correct permissions
  - [ ] API endpoint is production endpoint

- [ ] **Verify GHL webhook:**
  - [ ] Webhook URL is correct
  - [ ] Webhook is active in GHL
  - [ ] Webhook triggers correctly

- [ ] **Verify GHL field mappings:**
  - [ ] All required fields are mapped correctly
  - [ ] Field names match GHL production fields
  - [ ] Test with real GHL record

**Testing:**
- [ ] Create test property review in GHL
- [ ] Verify webhook is received by Make.com
- [ ] Verify all data is correctly extracted
- [ ] Verify emails are generated correctly

---

## Code Modules

**Status:** 🟡 Pending

### Tasks:
- [ ] **Update all Make.com code modules:**
  - [ ] Module 3: Latest version deployed (includes Portal email template)
  - [ ] Module 6: Latest version deployed
  - [ ] Module 7: Latest version deployed
  - [ ] Module 16: Latest version deployed
  - [ ] Verify all modules are using production URLs

- [ ] **Verify Module 3 Email Templates:**
  - [ ] Main email template logic verified and tested
  - [ ] Portal email template logic verified and tested
  - [ ] Portal version has identical logic to main version (Purchase Price, Property Description, Rental Assessment, Subject Line, Body Corp, etc.)
  - [ ] Test Portal email template generates correctly with real property data
  - [ ] Verify both templates produce identical output for same property data

- [ ] **Verify module configurations:**
  - [ ] All Input Variables are mapped correctly
  - [ ] All Router conditions are correct
  - [ ] All Gmail modules are configured correctly

**Testing:**
- [ ] Run test execution for each path
- [ ] Verify module outputs are correct
- [ ] Check Make.com execution logs for errors

---

## BA Setup Requirements

**Status:** 🟡 Pending

### Email Forwarding (for Path 1 approvals)

**Required for:** All BAs who receive packager approval emails

**Tasks:**
- [ ] Send BA-SEND-MAIL-AS-SETUP-INSTRUCTIONS.md to all BAs
- [ ] Document which BAs have completed setup
- [ ] Follow up with BAs who haven't completed setup

**BA List:**
- [ ] BA 1: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] BA 2: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] BA 3: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] ... (add all BAs)

### "Send Mail As" Setup (for Path 4)

**Required for:** All BAs who send client emails

**Tasks:**
- [ ] Send BA-SEND-MAIL-AS-SETUP-INSTRUCTIONS.md to all BAs
- [ ] Document which BAs have completed setup
- [ ] Follow up with BAs who haven't completed setup

**BA List:**
- [ ] BA 1: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] BA 2: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] BA 3: [Name] - [Email] - Status: [ ] Complete [ ] Pending
- [ ] ... (add all BAs)

---

## Testing Checklist

### Pre-Production Testing

**Status:** 🟡 Pending

- [ ] **Path 1 Testing:**
  - [ ] Packager receives email
  - [ ] Approval button works
  - [ ] Rejection button works
  - [ ] Confirmation page displays correctly

- [ ] **Path 2 Testing:**
  - [ ] Email sent to property@buyersclub.com.au
  - [ ] "Review Suitable Clients" button works
  - [ ] Portal opens correctly

- [ ] **Path 4 Testing:**
  - [ ] Portal loads opportunities
  - [ ] Client selection works
  - [ ] Standard message sending works
  - [ ] Personalized message sending works
  - [ ] "Send From" functionality works
  - [ ] Emails sent with correct "From" address
  - [ ] Multiple clients receive emails
  - [ ] Auto-close works after success
  - [ ] Error handling works

- [ ] **Integration Testing:**
  - [ ] End-to-end flow: GHL → Make.com → Emails
  - [ ] All paths work correctly
  - [ ] Error scenarios handled correctly
  - [ ] Logging works correctly

### Production Testing (After Go-Live)

**Status:** ⬜ Not Started

- [ ] **Day 1 Monitoring:**
  - [ ] Monitor Make.com execution history
  - [ ] Check Error Log sheet for any errors
  - [ ] Check Sent Log sheet for successful sends
  - [ ] Verify all emails are being sent correctly

- [ ] **Week 1 Monitoring:**
  - [ ] Review error logs daily
  - [ ] Verify BA feedback
  - [ ] Check for any issues
  - [ ] Adjust as needed

---

## Rollback Plan

**Status:** 🟡 Pending

### If Issues Occur:

1. **Immediate Actions:**
   - [ ] Pause Make.com scenario
   - [ ] Investigate error logs
   - [ ] Notify team

2. **Rollback Steps:**
   - [ ] Revert to previous Make.com scenario version (if using version control)
   - [ ] Or disable scenario and use manual process
   - [ ] Document issues and fixes

---

## Sign-Off

**Prepared by:** [Name]
**Reviewed by:** [Name]
**Approved by:** [Name]

**Date:** [Date]

---

## Notes

- Add any additional requirements or notes here
- Track any issues discovered during testing
- Document any deviations from plan

