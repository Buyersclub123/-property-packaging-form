# Stash Auto Lookup Excel Analysis

## Overview

This Excel workbook automates property data lookup from Stashproperty backend, eliminating manual copy-paste from multiple websites.

## Structure

### Sheet 1: "Lookup" (Main Sheet)
**Purpose:** Property data lookup and display

**Columns (47 total):**
- **Address** (Col 2) - Property address input/output
- **Lat/Lon** (Col 3-4) - Coordinates
- **Zoning Code/Description** (Col 5-6) - Zoning information
- **LGA** (Col 7) - Local Government Area
- **State** (Col 8) - State
- **Heritage Summary/Risk** (Col 9-10)
- **Biodiversity Summary/Risk** (Col 11-12)
- **Flooding Summary/Risk** (Col 13-14)
- **Bushfire Summary/Risk** (Col 15-16)
- **Minimum/Average Lot Size** (Col 17-18)
- **Open Space Summary** (Col 19)
- **Planning Scheme Links** (Col 20-21)
- **Hazard Dataset List** (Col 22)
- **Demographics:**
  - Owned/Rented/Social Housing Ratios (Col 23-25)
  - Median Household Income (Col 26)
  - SEIFA indexes (Col 27-34) - Multiple socioeconomic indicators
- **Disclaimers** (Col 35-36)
- **WMS (Web Map Service) Links:**
  - Flood, Easement, Infrastructure, Biodiversity (Col 37-40)
  - DGI (Demographic & Geographic Intelligence) overlays (Col 41-44)
  - SA1 Heatmap (Col 45)
- **Raw JSON** (Col 46) - Raw API response
- **Token Status** (Col 47) - Authentication status

**Sample Data:**
- Address: "15 Barker Street Lewisham NSW"
- Lat: -33.8916312
- Lon: 151.14701086
- Zoning: R2 (Low Density Residential)
- LGA: Inner West Council
- State: NSW

---

### Sheet 2: "SPI Data" (Market Data)
**Purpose:** Suburb-level market performance data

**Columns:**
- **Suburb** (Col 1)
- **State** (Col 2)
- **Post Code** (Col 3)
- **Median 3yr (House)** (Col 4)
- **Median 5yr (House)** (Col 5)
- **Median 3yr (Unit)** (Col 6)
- **Median 5yr (Unit)** (Col 7)

**Formulas Found:**
- `=C8*0.2` (20% calculation)
- `=SUM(C9:C13)` (Sum calculation)

**Sample Data:**
- Suburb: Penrith
- State: NSW
- Post Code: 2750

---

### Sheet 3: "Config" (Configuration)
**Purpose:** Stores authentication credentials

**Data:**
- Email: Ali.h@buyersclub.com.au
- Password: Buyersclub313!

**⚠️ Security Note:** Credentials are stored in plain text in Excel file.

---

## How It Works (Inferred)

### Likely Process:

1. **User enters property address** in "Lookup" sheet (Col 2)
2. **Apps Script or custom function** triggers API call to Stashproperty backend
3. **API returns JSON data** with all property information
4. **Data is parsed and populated** into respective columns:
   - Zoning, overlays (flood, bushfire, heritage, biodiversity)
   - Demographics (SEIFA, income, housing ratios)
   - Planning scheme links
   - WMS map links
5. **Raw JSON stored** in Col 46 for reference
6. **Token status** tracked in Col 47 (authentication)

### API Integration:

- **Backend:** Stashproperty.com.au
- **Authentication:** Email/password from Config sheet
- **Response Format:** JSON (stored in Raw JSON column)
- **Data Points:** ~45+ fields extracted from API response

---

## Key Features

### ✅ What It Does:

1. **Automates Property Lookup**
   - Single address input → comprehensive property data
   - Eliminates manual copy-paste from multiple websites

2. **Extracts Critical Information:**
   - Zoning codes and descriptions
   - Risk overlays (flood, bushfire, heritage, biodiversity)
   - Planning scheme links
   - Demographics and socioeconomic data
   - Map service links (WMS)

3. **Stores Raw Data:**
   - Raw JSON response preserved for reference
   - Token status tracking

### 🔍 What It Could Do Better:

1. **Security:**
   - Credentials stored in plain text (should use secure storage)
   - Consider using OAuth or API keys instead of password

2. **Integration:**
   - Could integrate directly with GHL (GoHighLevel) via Make.com
   - Could populate GHL fields automatically when property is created

3. **Automation:**
   - Could trigger automatically when new property added to GHL
   - Could update existing properties when data changes

---

## Potential Integration with Make.com

### Opportunity:

This Excel sheet could be replaced or enhanced with a Make.com scenario that:

1. **Triggers when property created in GHL:**
   - Webhook from GHL → Make.com
   - Extract property address

2. **Calls Stashproperty API:**
   - Use Make.com HTTP module
   - Authenticate with stored credentials (securely)
   - Fetch property data

3. **Updates GHL Record:**
   - Map Stashproperty data to GHL custom fields
   - Update property record automatically

4. **Benefits:**
   - No manual Excel work
   - Real-time data updates
   - Consistent data entry
   - Audit trail in Make.com

### Fields That Could Auto-Populate in GHL:

- Zoning Code/Description
- LGA
- State
- Heritage Risk
- Biodiversity Risk
- Flooding Risk
- Bushfire Risk
- Minimum Lot Size
- Average Lot Size
- Planning Scheme Links
- Demographics (SEIFA, income, ratios)

---

## Questions for Further Analysis:

1. **How is the API currently called?**
   - Apps Script custom function?
   - Manual trigger?
   - Automatic on address entry?

2. **What's the API endpoint?**
   - Need to identify the exact Stashproperty API endpoint
   - Authentication method (basic auth, token, etc.)

3. **Rate Limits?**
   - How many calls per minute/hour?
   - Any API usage restrictions?

4. **Data Refresh:**
   - How often does data change?
   - Need to refresh existing lookups?

---

## Next Steps:

1. **Identify API Endpoint:**
   - Check Apps Script code (if exists)
   - Check network requests in browser
   - Contact Stashproperty for API documentation

2. **Create Make.com Integration:**
   - Build scenario to call Stashproperty API
   - Map response to GHL fields
   - Test with sample property

3. **Enhance Current Excel (Optional):**
   - Add more error handling
   - Improve security (move credentials)
   - Add data validation

---

## Notes:

- Excel file has 1000 rows capacity (likely for batch processing)
- Formulas not detected in Lookup sheet (likely uses Apps Script)
- Config sheet contains credentials (security concern)
- Raw JSON column suggests API returns structured data

**Created:** [Current Date]
**File Analyzed:** Stash Auto Lookup.xlsx










