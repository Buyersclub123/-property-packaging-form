# Existing GHL Form Feed

## Overview

**URL:** https://link.buyersclub.com.au/widget/form/7vV032j3Twosb39dpW4C

**Status:** ⚠️ **TO BE REPLACED** - This form will be replaced by the new standalone web application

**Purpose:** Current property submission form in GHL

---

## Form Structure

### Section: Package Info

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Property Address | ✅ Yes | Text | Full address input |
| Packager | ✅ Yes | Dropdown | Select option |
| Sourcer | ✅ Yes | Dropdown | Select option |
| Status | ❌ No | Dropdown | Select option |
| Deal Type | ✅ Yes | Dropdown | Select option |

---

### Section: Property Description

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Bed (Primary) | ❌ No | Dropdown | Select option |
| Bed (Secondary) | ❌ No | Dropdown | Select option |
| Bath (Primary) | ❌ No | Dropdown | Select option |
| Bath (Secondary) | ❌ No | Dropdown | Select option |
| Garage (Primary) | ❌ No | Dropdown | Select option |
| Garage (Secondary) | ❌ No | Dropdown | Select option |
| Car-space (Primary) | ❌ No | Dropdown | Select option |
| Car-space (Secondary) | ❌ No | Dropdown | Select option |
| Car-port (Primary) | ❌ No | Dropdown | Select option |
| Car-port (Secondary) | ❌ No | Dropdown | Select option |
| Year Built | ❌ No | Text | Free text input |
| Land Size | ❌ No | Text | Free text input |
| Title | ❌ No | Dropdown | Select option |

---

### Section: Property Overlays

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Zoning | ❌ No | Text | Free text input |
| Flood | ❌ No | Dropdown | Select option (Yes/No) |
| Flood Dialogue | ❌ No | Text | Free text input |
| Bushfire | ❌ No | Dropdown | Select option (Yes/No) |
| Bushfire Dialogue | ❌ No | Text | Free text input |
| Mining | ❌ No | Dropdown | Select option (Yes/No) |
| Mining Dialogie | ❌ No | Text | **NOTE: Typo in field name** - Free text input |
| Other (Overlay) | ❌ No | Dropdown | Select option (Yes/No) |
| Other (Overlay) Dialogue | ❌ No | Text | Free text input |
| Special Infrastructure | ❌ No | Dropdown | Select option (Yes/No) |
| Special Infrastructure Dialogue | ❌ No | Text | Free text input |
| Due Diligence Acceptance | ❌ No | Dropdown | Select option (Yes/No) |

---

### Section: Purchase Price

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Asking | ❌ No | Dropdown | Select option |
| Asking Text | ❌ No | Text | Free text input |
| Comparable Sales | ❌ No | Text | Free text input |
| Acceptable Acquisition $ From | ❌ No | Text | Numeric input |
| Acceptable Acquisition $ To | ❌ No | Text | Numeric input |

---

### Section: Rental Assessment

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Occupancy | ❌ No | Dropdown | Select option |
| Current Rent (Primary) $ per week | ❌ No | Text | Numeric input |
| Current Rent (Secondary) $ per week | ❌ No | Text | Numeric input |
| Expiry (Primary) | ❌ No | Text | Date input |
| Rent Appraisal (Secondary) | ❌ No | Text | Numeric input |
| Yield | ❌ No | Text | Numeric input (auto-calculated?) |
| Rent Appraisal (Primary) | ❌ No | Text | Numeric input |
| Expiry (Secondary) | ❌ No | Text | Date input |
| Appraised Yield | ❌ No | Text | Numeric input (auto-calculated?) |

---

### Section: Market Performance

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Median price change - 3 months | ❌ No | Text | Numeric input (percentage) |
| Median price change - 1 year | ❌ No | Text | Numeric input (percentage) |
| Median price change - 3 year | ❌ No | Text | Numeric input (percentage) |
| Median price change - 5 year | ❌ No | Text | Numeric input (percentage) |
| Median yield | ❌ No | Text | Numeric input (percentage) |
| Median rent change - 1 year | ❌ No | Text | Numeric input (percentage) |
| Rental Population | ❌ No | Text | Numeric input (percentage) |
| Vacancy Rate | ❌ No | Text | Numeric input (percentage) |

---

### Section: Why this property

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Why this property? | ❌ No | Text | Multi-line free text |

---

### Section: Proximity

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Proximity | ❌ No | Text | Multi-line free text |

---

### Section: Investment Highlights

| Field Name | Required | Type | Notes |
|------------|----------|------|-------|
| Investment Highlights | ❌ No | Text | Multi-line free text |

---

### Submit Button

- Submits form data to GHL
- Triggers GHL workflow/webhook

---

## Mapping to GHL Custom Object Fields

All form fields map to corresponding GHL custom object fields (see `EXISTING-GHL-INFRASTRUCTURE.md` for complete mapping).

**Key Differences from New Requirements:**
- No multi-step workflow
- No Stash integration
- No Google Sheets Market Performance lookup
- No ChatGPT automation
- No decision tree (Step 0)
- No workflow states/editing
- No Deal Sheet integration
- No attachment management
- No project/lot repeater boxes
- No live previews

---

## Migration Notes

**What to Preserve:**
- All field mappings to GHL custom objects
- Field names and data types
- Dropdown options (where applicable)

**What's Being Replaced:**
- Single-page form → Multi-step workflow
- Manual data entry → Automated data population (Stash, ChatGPT, Google Sheets)
- Basic validation → Advanced conditional logic and validation
- Static form → Dynamic form based on property type
- No workflow management → Full workflow state management

**Migration Strategy:**
- New form will write to same GHL custom object fields
- Existing Make.com scenarios should continue to work
- Gradual cutover: Test new form, then switch URL when ready

---

## Notes

- Form is currently functional and in use
- Portal exists (user confirmed already aware of this)
- Form feeds directly into GHL custom objects
- Make.com scenario "GHL Property Review Submitted" processes submissions from this form







