# Investment Highlights Google Sheet Structure

## Column Structure (Investment Highlights Tab)

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| **A** | `LGA` | Local Government Area | "Sunshine Coast Regional" |
| **B** | `State` | State code | "QLD", "NSW", "VIC" |
| **C** | `Source Document (File name)` | Source document filename | "Hotspotting Report - QLD - Jan 2026.pdf" |
| **D** | `Date Collected/Checked & by whom` | Date and who collected it | "2026-01-11 by john.t" |
| **E** | `Investment Highlights Content` | Full investment highlights text | (Long text content) |

## Investment Highlights Log Tab

**Tab Name:** "Investment Highlights Log"

**Purpose:** Track all changes made to Investment Highlights data

**Column Structure:**

| Column | Header | Description |
|--------|--------|-------------|
| **A** | `Timestamp` | When the change was made (ISO format) |
| **B** | `LGA` | Local Government Area |
| **C** | `State` | State code |
| **D** | `Action Type` | "COLLECTED", "UPDATED", or "APPENDED" |
| **E** | `Changed By` | User email/name who made the change |
| **F** | `Source Document` | Source document filename (if applicable) |
| **G** | `Previous Content` | Previous content (truncated if >500 chars) |
| **H** | `New Content` | New content (for updates, truncated if >500 chars) |
| **I** | `Appended Content` | Additional information added (for appends) |

## Investment Highlights Content Sections

Based on Hotspotting Reports processed through ChatGPT Infrastructure Details Tool, Investment Highlights typically contains these sections:

1. **Population Growth Context**
   - Population growth forecasts and trends
   - Growth percentages and timeframes
   - Key growth areas within the LGA

2. **Residential**
   - Major residential developments
   - New estates and lot deliveries
   - House and land packages
   - Development values and timelines

3. **Industrial**
   - Industrial facilities and operations
   - Major industrial projects
   - Manufacturing and processing facilities
   - Job creation from industrial projects

4. **Commercial and Civic**
   - Community centers
   - Civic upgrades
   - Public facilities
   - Retail and commercial developments

5. **Health and Education**
   - Hospital upgrades and expansions
   - School facilities
   - Educational infrastructure
   - Health precincts

6. **Transport**
   - Road upgrades
   - Rail improvements
   - Airport developments
   - Public transport infrastructure

7. **Job Implications**
   - Construction jobs
   - Ongoing operational jobs
   - Employment growth projections

## Append Functionality

Users can append additional information to existing Investment Highlights content. The append function will:
- Preserve existing content
- Add new information at the end
- Log the appended content separately
- Update the "Date Collected/Checked & by whom" field

**Format for Appended Content:**
```
[Existing content...]

---

**Additional Information (Added [Date] by [Name]):**
[New information to append]
```

## Functions Needed

1. `lookupInvestmentHighlights(lga, state)` - ✅ Already exists (needs column update)
2. `saveInvestmentHighlightsData(lga, state, data, changedBy)` - ✅ Already exists (needs column update)
3. `appendInvestmentHighlightsData(lga, state, additionalInfo, changedBy)` - ⏳ To be created
4. `logInvestmentHighlightsUpdate(entry)` - ⏳ To be created
