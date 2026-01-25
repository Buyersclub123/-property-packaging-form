# Existing Google Sheets

## Overview

The system uses multiple Google Sheets for data storage, logging, and configuration. All sheets need to be accessible via Google Sheets API (Service Account recommended).

---

## 1. "Pipeline Stage changes via Make.com"

**Purpose:** Snapshot view of opportunities in pipeline stages being monitored

**Key Functions:**
- Tracks opportunities across pipeline stages
- Allows "Realtime opportunity tracker" to write to this sheet (when working)
- Contains Stage IDs mapping
- Contains User IDs to names mapping

**Structure:**
- Columns include Stage IDs and User ID → Name mappings
- Used by Make.com scenarios to track pipeline changes

**Access:** Read/Write via Make.com scenarios

---

## 2. "Property Review System Logs"

**Purpose:** Track property submissions, errors, and filtered records

**Tabs:**

### Tab: "Sent"
- **Purpose:** Log properties sent to recipients
- **Columns:** Property details, recipient, timestamp, etc.
- **Status:** ⚠️ **NOT CURRENTLY SET UP** - needs to be configured before production

### Tab: "Errors"
- **Purpose:** Log errors that occur during processing
- **Columns:** Error details, timestamp, property info, etc.
- **Status:** ⚠️ **NOT CURRENTLY SET UP** - needs to be configured before production

### Tab: "Filtered"
- **Purpose:** Log records filtered out from "GHL Property Review Submitted" scenario
- **Columns:** Property details, filter reason, timestamp, etc.
- **Status:** ⚠️ **NOT CURRENTLY SET UP** - needs to be configured before production

**Integration:**
- Connected to Make.com scenario: "GHL Property Review Submitted"
- **Action Required:** Set up logging before production cutover

---

## 3. "Stash Auto Lookup"

**Purpose:** Previous Stash query tool (now replaced in Make.com)

**Status:** 
- ⚠️ **REPLACED** - Functionality moved to Make.com scenario "Test Stashproperty AP"
- May still exist for historical reference
- Can be deprecated/archived

**Note:** This was the old way of querying Stash Property API. New system uses Make.com webhook.

---

## 4. "Property Review Static Data - Market Performance"

**Purpose:** Repository for static/reference data used across the system

**Tabs:**

### Tab: "Market Performance"
**Status:** ✅ Created, contains mock data

**Headers:**
- Suburb Name
- State
- Data Source
- Date Collected / Checked
- Median price change - 3 months
- Median price change - 1 year
- Median price change - 3 year
- Median price change - 5 year
- Median yield
- Median rent change - 1 year
- Rental Population
- Vacancy Rate

**Current State:**
- All rows contain "Mock Data" in "Data Source" column
- All rows have placeholder timestamps in "Date Collected / Checked"
- **Action Required:** System will prompt users to collect real data when processing properties

**Data Sources:**
- **3-year/5-year data:** https://www.smartpropertyinvestment.com.au
- **Other metrics:** https://info.realestateinvestar.com.au/

**Integration:**
- Read by form to check if suburb/state data exists
- Updated by form when users collect new data
- Used to populate Market Performance section in emails

---

## 5. "Property Review Static Data - Investment Highlights"

**Purpose:** Repository for Investment Highlights data by LGA/State

**Status:** ✅ Created

**Sheet ID:** `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI`

**Tab:** "Investment Highlights"

**Headers:**
- LGA (Column A)
- State (Column B)
- Investment Highlights Content (Column C)
- Data Source (Column D)
- Date Collected/Checked (Column E)
- Source Document (Column F)

**Integration:**
- Read by form to check if LGA/state data exists
- Updated by form when users enter new data
- Used to auto-populate Investment Highlights field in Step 5

### Tab: "Config" (Planned)
**Status:** ⚠️ **TO BE CREATED**

**Purpose:** Store configuration values editable without code changes

**Potential Config Values:**
- Data freshness threshold (e.g., 30 days)
- URLs for data sources
- Email template settings
- Other system settings

---

## Google Sheets API Access

**Method:** Service Account (recommended for automation)

**Requirements:**
- Service account created in Google Cloud Console
- Service account email shared with all relevant sheets
- Credentials JSON file for API authentication
- API access enabled in Google Cloud project

**Actions Needed:**
- [ ] Confirm service account exists
- [ ] Get service account email
- [ ] Share all sheets with service account
- [ ] Get credentials JSON (or confirm location)
- [ ] Test API access to all sheets

---

## Integration Points

### Make.com Scenarios
- **"GHL Property Review Submitted":** Reads Market Performance, writes to Logs
- **"Realtime opportunity tracker":** Writes to Pipeline Stage changes sheet
- **Pipeline stage change scenarios:** Read/write Pipeline Stage changes sheet

### New Form System
- **Market Performance Check:** Query "Property Review Static Data - Market Performance" → "Market Performance" tab
- **Data Collection:** Update "Property Review Static Data - Market Performance" → "Market Performance" tab
- **Logging:** Write to "Property Review System Logs" → "Sent", "Errors", "Filtered" tabs
- **Investment Highlights:** Read from "Property Review Static Data - Market Performance" → "Investment Highlights" tab (when created)

---

## Pre-Production Checklist

- [ ] Set up "Property Review System Logs" tabs (Sent, Errors, Filtered)
- [ ] Configure Make.com scenario "GHL Property Review Submitted" to write to logs
- [ ] Create "Investment Highlights" tab in "Property Review Static Data - Market Performance"
- [ ] Create "Config" tab in "Property Review Static Data - Market Performance"
- [ ] Test Google Sheets API access for all sheets
- [ ] Verify service account has access to all sheets
- [ ] Test read/write operations from Make.com
- [ ] Test read/write operations from new form system

---

## Notes

- All sheets should be accessible via API for automation
- Service account is preferred method for reliable automation
- Logging is critical for production - must be set up before launch
- Market Performance data collection workflow is a key feature of the new system







