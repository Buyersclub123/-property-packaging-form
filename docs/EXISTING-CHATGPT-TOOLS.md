# Existing ChatGPT Custom Tools & UI Tools

## Overview

The system uses ChatGPT custom tools (GPTs) and UI tools for automating text generation in property reviews.

---

## ChatGPT Custom GPTs

**Location:** ChatGPT interface (list of GPTs available)

**Available GPTs:**
- ✅ **Property Summary Tool** - For generating property summaries
- ✅ **Infrastructure Details Tool** - For generating infrastructure details
- ✅ **Test Proximity** - For testing proximity information generation
- ✅ **Build & Pest Report Tool** - For build & pest report analysis
- ✅ **Rates & Insurance Calc** - For rates and insurance calculations
- ✅ **New Build Depreciation Esti...** (truncated) - For depreciation estimates
- ✅ **Deal Sheet work** - For deal sheet related tasks
- ✅ **Offset vs Property Investme...** (truncated) - For investment calculations
- ✅ **Explore GPTs** - General GPT explorer

**Status:** Active and available for use

**Integration Method:** Via ChatGPT API (custom tools accessible programmatically)

---

## UI Tools (Web Applications)

### 1. Property Summary Tool / Project Summary Tool for Proximity

**URL:** https://amenity-distance-app-a22o.vercel.app/  
**Alternative URL (from image):** https://amenity-distance-app-a220.vercel.app/

**Purpose:** Generate formatted property summaries and proximity information

**Functionality:**
- Takes a full property address as input
- Takes an amenity list as input
- Generates formatted summary (Address + Amenities block)
- Output is ready for UI integration

**UI Elements:**
- Input text area: "Enter address and amenity list here..."
- Buttons: "Generate Summary", "Copy", "Clear"
- Output text area: "Formatted results will appear here..."

**Use Cases:**
- **"Why this property?"** field automation
- **"Proximity"** field automation
- **"Investment Highlights"** field automation (potentially)

**Integration:**
- Can be called via API/webhook from Make.com
- Can be integrated into new form system
- Returns formatted text ready for GHL custom object fields

---

## Integration Points

### Make.com Scenarios
- **"GHL Property Review Submitted":** Can call ChatGPT tools to auto-populate:
  - "Why this property?"
  - "Proximity"
  - "Investment Highlights"

### New Form System
- Can call ChatGPT tools during form workflow
- Can pre-populate fields based on address input
- Can allow users to regenerate/edit generated content

---

## API Access

**Questions to Answer:**
- [ ] Are these GPTs accessible via ChatGPT API?
- [ ] What's the API endpoint/authentication method?
- [ ] Do we have API keys/credentials?
- [ ] Can the UI tools be called programmatically (API/webhook)?
- [ ] What's the request/response format?

**Note:** Need to determine if these are:
- ChatGPT API calls (using custom GPTs)
- Direct webhook calls to the Vercel app
- Both (UI tool wraps ChatGPT API)

---

## Field Mapping

| Form Field | ChatGPT Tool | Status |
|------------|--------------|--------|
| Why this property? | Property Summary Tool | ✅ Available |
| Proximity | Project Summary Tool / Test Proximity | ✅ Available |
| Investment Highlights | Property Summary Tool (potentially) | ✅ Available |

---

## Zapier Note

**Status:** ⚠️ **RETIRED**

- Previous automation was in Zapier
- Functionality moved to Make.com
- Zapier workflows are no longer active
- Can be ignored for new system development

---

## Pre-Production Checklist

- [ ] Confirm ChatGPT API access and credentials
- [ ] Test API calls to Property Summary Tool
- [ ] Test API calls to Proximity tool
- [ ] Determine exact request/response format
- [ ] Test integration from Make.com scenarios
- [ ] Test integration from new form system
- [ ] Verify output format matches email template requirements
- [ ] Test error handling (API failures, timeouts)

---

## Notes

- UI tools are hosted on Vercel (serverless platform)
- Tools generate formatted text ready for direct use in forms/emails
- Integration should allow for user review/editing of generated content
- May need rate limiting/throttling for API calls
- Consider caching generated content to avoid redundant API calls







