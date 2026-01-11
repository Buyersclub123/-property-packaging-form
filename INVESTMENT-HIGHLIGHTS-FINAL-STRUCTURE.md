# Investment Highlights - Final Column Structure & Implementation Plan

## Google Sheet Column Structure

**Sheet:** "Property Review Static Data - Investment Highlights"  
**Sheet ID:** `1i9ZNOFNkEy3KT0BJCJoxhVPnKkksqSi7A9TpAVpcqcI`  
**Tab:** "Investment Highlights"

### Column Headers (Row 1)

| Column | Header Name | Description |
|--------|-------------|-------------|
| **A** | `LGA` | Local Government Area |
| **B** | `State` | State code (QLD, NSW, VIC, etc.) |
| **C** | `Source Document (File name)` | Source document filename |
| **D** | `Date Collected/Checked` | Date when data was collected/updated |
| **E** | `Population Growth Context Additional info` | Additional bullet points for Population Growth Context section |
| **F** | `Residential Additional info` | Additional bullet points for Residential section |
| **G** | `Industrial Additional info` | Additional bullet points for Industrial section |
| **H** | `Commercial and Civic Additional info` | Additional bullet points for Commercial and Civic section |
| **I** | `Health and Education Additional info` | Additional bullet points for Health and Education section |
| **J** | `Transport Additional info` | Additional bullet points for Transport section |
| **K** | `Job Implications Additional info` | Additional bullet points for Job Implications section |
| **L** | `Investment Highlights Content` | Main Investment Highlights content (base template/report) |

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
| **G** | `Section` | Which section was updated (for appends: "Population Growth Context", "Residential", etc., or "Main Content" for full updates) |
| **H** | `Previous Content` | Previous content (truncated if >500 chars) |
| **I** | `New/Appended Content` | New or appended content (truncated if >500 chars) |

## Investment Highlights Sections

The main content (Column L) typically contains these sections:

1. **Population Growth Context** - Population growth forecasts and trends
2. **Residential** - Major residential developments, estates, lot deliveries
3. **Industrial** - Industrial facilities, operations, major projects
4. **Commercial and Civic** - Community centers, civic upgrades, public facilities
5. **Health and Education** - Hospital upgrades, school facilities, educational infrastructure
6. **Transport** - Road upgrades, rail improvements, airport developments
7. **Job Implications** - Construction jobs + ongoing operational jobs

## Functions Needed

### 1. `lookupInvestmentHighlights(lga, state)`
- ✅ Exists but needs column update
- Reads from columns A-L
- Returns main content (Column L) + all additional info columns (E-K)
- Merges for display: Main content + Additional info sections

### 2. `saveInvestmentHighlightsData(lga, state, data, changedBy)`
- ✅ Exists but needs column update
- Updates main content (Column L) and/or additional info columns (E-K)
- Updates Date Collected/Checked (Column D)
- Logs changes to Log tab

### 3. `appendInvestmentHighlightsAdditionalInfo(lga, state, section, additionalInfo, changedBy)`
- ⏳ To be created
- Appends bullet points to specific section's "Additional info" column (E-K)
- Preserves existing content in that column
- Logs the append action

### 4. `logInvestmentHighlightsUpdate(entry)`
- ⏳ To be created
- Writes to "Investment Highlights Log" tab
- Tracks: timestamp, LGA, state, action type, changed by, section, previous/new content

## Implementation Notes

- **Display Logic:** When showing Investment Highlights in form, merge:
  - Main content (Column L)
  - All additional info sections (E-K) appended to their respective sections
  
- **Append Logic:** When appending to a section:
  - Read existing content from that section's "Additional info" column
  - Append new bullet point(s) at the end
  - Preserve existing bullet points
  - Update Date Collected/Checked
  
- **Preservation:** When updating main content (Column L):
  - Preserve all "Additional info" columns (E-K)
  - Only update the main content column

## Next Steps (When Ready)

1. Update `lookupInvestmentHighlights()` to read columns A-L
2. Update `saveInvestmentHighlightsData()` to handle new column structure
3. Create `appendInvestmentHighlightsAdditionalInfo()` function
4. Create `logInvestmentHighlightsUpdate()` function
5. Update API routes to support append functionality
6. Update form component to allow section-specific appends
7. Test lookup, save, and append workflows
