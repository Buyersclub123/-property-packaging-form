# Email Template Formatting Structure & Logic

⚠️ **IMPORTANT REFERENCE DOCUMENT** ⚠️  
**This document contains ALL formatting logic for property review email templates.**

**Last Updated:** January 2025  
**Purpose:** Document the formatting logic and structure for property review email templates

**When to use this document:**
- Working on email template formatting
- Understanding subject line logic
- Implementing property type-specific formatting
- Debugging email output issues
- Adding new sections to emails

**Key File:** `code/MODULE-3-COMPLETE-FOR-MAKE.js` - Contains the email template builder code

---

## 📋 Overview

The email template builder (Module 3 in Make.com) generates HTML and text versions of property review emails. The template has **shared sections** (same for all property types) and **property-type-specific sections** (different logic per type).

---

## 🎯 Email Structure

### Shared Sections (All Property Types)
These sections use the same formatting logic regardless of property type:

1. **Why This Property** - Bulleted list with bold leading words
2. **Address** - Property address + Google Map link
3. **Property Overlays** - Risk overlays with conditional dialogue fields
4. **Proximity** - Bulleted list of nearby locations
5. **Market Performance** - 8 metrics with % formatting
6. **Investment Highlights** - Structured content with headings
7. **Supporting Documents** - Folder link with descriptive text and dialogue

### Property-Type-Specific Sections
These sections have different formatting logic based on property type:

1. **Property Description** - Different fields for Established vs H&L vs Project
2. **Purchase Price** - Different formats for Established vs H&L vs Project
3. **Rental Assessment** - Different structures for single vs dual occupancy

---

## 🔧 Formatting Functions & Logic

### Why This Property

**Function:** `formatWhyHtml(rawText)`

**Format:**
- Each line: `Leading words – Description text`
- Leading words are **bold**
- Uses `<p>` tags (not `<ul><li>`) for better email client compatibility
- Output: `<p><strong>Leading words</strong> – Description text</p>`

**Key Logic:**
- **Dash Character Handling:** Uses regex `/[\s]+[-–—][\s]+/` to handle:
  - Regular hyphen: `-`
  - En-dash: `–` (most common in input data)
  - Em-dash: `—`
- **Why:** Input data often contains en-dash or em-dash characters, not regular hyphens. The original `indexOf(" - ")` failed to find these, causing bold formatting to be skipped.
- **Bold Formatting:** Uses `<strong>` tags inside `<p>` tags (same pattern as `htmlLine` function which works reliably)

**Example Output:**
```html
<p><strong>Modern design</strong> – Four separate Torrens Title lots...</p>
<p><strong>Functional floorplans</strong> – Each dwelling provides...</p>
```

---

### Property Description

**Format:**
- Labels: "Bed:", "Bath:", "Built:", "Land Size:", "Title:", "Body corp.:"
- Bullet points (•) in display
- Suffixes: "sqm approx." for Land Size, "approx." for Built/Year Built
- Body Corp: Indented with "Approx. $xxx per quarter" format
- Dialogue: Indented when body corp exists, prefixed with `*`

**Key Logic:**
- **Built Field:** Uses `build_size` for H&L/Projects (format: "122 sqm approx."), `year_built` for Established (format: "1975 approx.")
- **Dual Occupancy:** Format "Bed: 3 +2, Bath: 2 + 1, Garage: 1 + 1"
- **Bath Values:** Converts "point" to "." (e.g., "1point5" → "1.5")
- **Title:** Capitalized (e.g., "torrens" → "Torrens")
- **Secondary Fields:** Checks both short field names (e.g., `beds_secondary`) and full GHL field names (e.g., `beds_additional__secondary__dual_key`)

---

### Purchase Price

**Format:**
- **Asking:** Combined format "Asking: [type] - [price range]" (e.g., "Asking: On-market - Offers over $800,000")
- **Comparable Sales:** Text starts immediately after colon (no line break)
- **Accepted Acquisition Target:** Combined format "Accepted Acquisition Target: $[from] - $[to]" with comma formatting (e.g., "$855,000 - $875,000")
- **Dialogue:** Line break before dialogue with asterisk prefix

**Order:**
1. Asking
2. Comparable Sales
3. Accepted Acquisition Target
4. [line break]
5. *[dialogue text]

**Key Logic:**
- **Asking Field:** Combines `asking` (type) + `asking_text` (price) into single line
- **Field Names:** Uses `acceptable_acquisition__from` and `acceptable_acquisition__to` (double underscores) - code checks both double and single underscore variants
- **Number Formatting:** Uses `formatNumberWithCommas()` helper to format numbers with commas (e.g., 855000 → 855,000)
- **Cashback Scenarios:** (To be implemented) Show "Asking: ... with $Xk cashback" and indented "Net Price: ... when considering the $Xk cashback", remove Acquisition Target
- **House & Land Packages:** (To be implemented) Show "House & Land package", "Price:", indented "Land:" and "Build:", "Net Price:" if cashback, remove Acquisition Target

---

### Property Overlays

**Format:**
- Risk Name: Yes/No – [dialogue text] (if dialogue exists, on same line)
- Risk Name: Yes/No (if no dialogue)
- "Due Diligence Acceptance" on separate line with line break before it

**Key Logic:**
- **Dialogue Fields:** Conditional - only show if risk = "Yes"
  - `flood_dialogue` (when `flood = "Yes"`)
  - `bushfire_dialogue` (when `bushfire = "Yes"`)
  - `mining_dialogue` OR `mining_dialogie` (when `mining = "Yes"`) - Note: GHL field has typo, code checks both
  - `other_overlay_dialogue` (when `other_overlay = "Yes"`)
  - `special_infrastructure_dialogue` (when `special_infrastructure = "Yes"`)
- **Formatting:** Dialogue appears on same line as status with " - " separator: "Flood: Yes - [dialogue text]"

---

### Market Performance

**Format:**
- All 8 fields always displayed (even if value is 0 or null)
- Format: `[Field Name]: [value]%` (2 decimal places)
- Null values display as "N/A" (not "0.00%")
- Dialogue: Prefixed with `*` and on new line with line break before it

**Key Logic:**
- **Function:** `formatMarketPerformanceValue(value)` converts null to "N/A", formats numbers to 2 decimal places with `%`
- **Display Functions:** `htmlLineMarket()` and `textLineMarket()` always display fields (unlike `htmlLine()` which skips falsy values)
- **Why:** Market performance fields must always be visible, even when value is 0 or N/A

**Fields:**
1. Median Price Change – 3 months
2. Median Price Change – 1 year
3. Median Price Change – 3 years
4. Median Price Change – 5 years
5. Median Yield
6. Median Rent Change – 1 year
7. Rental Population
8. Vacancy Rate

---

### Investment Highlights

**Format:**
- Structured with headings (bold) and bullet points
- Uses `<p class="highlight-heading"><strong>...</strong></p>` for headings
- Headings: "Population growth context", "Residential", "Industrial", "Commercial and civic", "Health and education", "Transport", "Job implications"

**Key Logic:**
- **Function:** `formatInvestmentHighlightsHtml(rawText)`
- **Bold Formatting:** Uses `<p class="highlight-heading"><strong>...</strong></p>` pattern
- **Why This Works:** The class-based approach with `<strong>` tags works reliably in email clients

---

### Supporting Documents

**Format:**
- Heading: "Supporting Documents" (replaces "Attachments")
- Link text: "**CLICK** this link to view supporting documents for this property:"
  - "CLICK" is bold and uppercase
  - Link appears on new line below the sentence
  - Link uses `folder_link` field with property address as link text
- Descriptive text (smaller, italic, lighter gray):
  - "Which might include: cashflows sheet, CMA market comparison reports, photos and LGA report."
  - "With additional documents for New properties such as: Site & stage plans, floor plans, inclusions and more."
- Dialogue: Optional `attachments_additional_dialogue` field with asterisk prefix and line break before it

**Key Logic:**
- Uses `folder_link` field (with fallback to `folderLink`)
- Property address used as link text (falls back to folder_link URL if address unavailable)
- Descriptive text styled with: `font-size: 14px; font-style: italic; color: #888;`
- "New properties" text always shown (not conditional)
- Dialogue has `<br>` before it and asterisk prefix

---

### Rental Assessment

**Format:**
- **Single Occupancy:** 
  - Occupancy
  - Current Rent: $[amount] per week (if not vacant)
  - Expiry: [month year] (if not vacant)
  - Current Yield: ~ [value]% (if not vacant)
  - Appraisal: $[from] - $[to] per week
  - Appraised Yield: ~ [value]%
  
- **Dual Occupancy:**
  - **Occupancy:** Unit A and Unit B (not indented, align with heading)
  - **Current Rent:** Total (not indented), Unit A and Unit B (indented 30px)
  - **Expiry:** Unit A and Unit B (not indented, align with heading)
  - **Current Yield:** ~ [value]%
  - **Appraisal:** Total (not indented), Unit A and Unit B (indented 30px)
  - **Appraised Yield:** ~ [value]%
  
- **Dialogue:** Line break before dialogue, prefixed with `*`

**Key Logic:**
- **Labels:** "Expiry" (not "Lease Expiry"), "Appraisal" (not "Rent Appraisal"), "Current Yield" (not "Yield")
- **Field Names:** Uses `occupancy_primary`, `occupancy_secondary`, `rent_appraisal_primary_from/to`, `rent_appraisal_secondary_from/to`
- **Helper Functions:** 
  - `formatRentAppraisalRange()` - Formats "$[from] - $[to] per week" with comma formatting
  - `formatCurrentRent()` - Formats "$[amount] per week" or "N/A"
- **Indentation:** 
  - Occupancy/Expiry: Unit A/B align with headings (no indent)
  - Current Rent/Appraisal: Total aligns with heading (no indent), Unit A/B indented (30px)
- **Expiry Field:** Supports "TBC", "Periodical", or "Month Year" format
- **N/A Handling:** Shows "N/A" for vacant units in Current Rent and Expiry
- **Yield Formatting:** Uses "~ " (circa symbol) before percentages (handled by GHL/data source)
- **Portal Version:** Same formatting logic, uses `vPortal()` functions (needs testing - see TODO)

---

## 🎨 Bold Formatting Strategy

### What Works in Email Clients

1. **`htmlLine()` function:** `<p><strong>Label:</strong> value</p>` ✅ Works
2. **Investment Highlights:** `<p class="highlight-heading"><strong>...</strong></p>` ✅ Works
3. **Why This Property:** `<p><strong>Leading words</strong> – Description</p>` ✅ Works (after dash fix)

### What Doesn't Work

1. **`<strong>` inside `<li>` tags:** Some email clients strip bold from list items ❌
2. **Inline CSS in list items:** `<li><span style="font-weight: bold;">...</span></li>` ❌
3. **`<b>` tags:** Less reliable than `<strong>` ❌

### Key Learnings

- **Use `<p>` tags with `<strong>`** for reliable bold formatting
- **Avoid `<ul><li>` structure** if bold is required (use `<p>` tags instead)
- **Dash character matching** is critical - handle multiple dash types (hyphen, en-dash, em-dash)

---

## 📝 Property Type Logic (To Be Implemented)

### Established Properties
- Property Description: Uses `year_built` (not `build_size`)
- Purchase Price: Full format with Asking, Comparable Sales, Acquisition Target
- Rental Assessment: Standard single/dual occupancy logic

### H&L (House & Land) Properties
- Property Description: Uses `build_size` (not `year_built`)
- Purchase Price: May show Land/Build breakdown
- Rental Assessment: Standard single/dual occupancy logic

### Project Properties
- Property Description: Per-lot descriptions
- Purchase Price: Per-lot prices
- Rental Assessment: Per-lot assessments
- **Email Structure:** One email per lot, or one email with all lots? (To be determined)

---

### Email Subject Line

**Format:**
- Prefix (based on approval status):
  - `baApproved === "approved"` → No prefix
  - `packagerApproved === "approved"` (but BA not approved) → `"BA AUTO SEND – "`
  - Neither approved → `"PACKAGER TO CONFIRM – "`

- Base format (varies by property type):

**1. Established Properties:**
- Format: `"Property Review: [ADDRESS]"`
- Uses `property_address` field (uppercased)

**2. H&L (House & Land) Properties:**
- Format: `"Property Review (H&L [X]-bed [Type]): [ADDRESS]"`
- Detection: `property_type === "New"` AND `deal_type === "01_hl_comms"` AND NOT Project
- Bed count: Total of `beds_primary + beds_secondary`
- Type: `single_or_dual_occupancy` → "Single Family" or "Dual-key"
- Address: Uses `property_address` as-is (already contains lot number if present, no duplication)
- Example: `"Property Review (H&L 4-bed Single Family): LOT 234, UNIT 1&2 4 OSBORNE CCT MAROOCHYDORE QLD 4558"`

**3. SMSF Properties:**
- Format: `"Property Review (SMSF [X]-bed [Type]): [ADDRESS]"`
- Detection: `property_type === "New"` AND (`deal_type === "02_single_comms"` OR `"03_internal_with_comms"` OR `"04_internal_nocomms"`)
- Bed count: Total of `beds_primary + beds_secondary`
- Type: `single_or_dual_occupancy` → "Single Family" or "Dual-key"
- Address: Uses `property_address` as-is (already contains lot number if present)

**4. Project Properties (H&L or SMSF):**
- Format: `"Property Review ([H&L/SMSF] Project): [PROJECT NAME], [SUBURB], [STATE] [POSTCODE]"`
- Detection: `template_type === "Project"` OR `is_parent_record === "Yes"`
- Project type: Determined by `deal_type` (H&L = "01_hl_comms", SMSF = "02/03/04")
- Address format: Uses `project_name`, `suburb_name`, `state`, `post_code` (comma-separated, uppercased)
- Example: `"Property Review (H&L Project): VIRGINIA PARK ESTATE, VIRGINIA, SA 5120"`

**Key Logic:**
- Property type detection uses `property_type`, `deal_type`, `template_type`, and `is_parent_record`
- Address field already contains lot/unit numbers, so we don't add "LOT X" prefix (avoids duplication)
- All addresses are uppercased
- Bed count uses total (primary + secondary) for dual-occupancy properties
- Occupancy type determined from `single_or_dual_occupancy` field

---

## 🔄 Data Flow

1. **Form App** → Submits form data to Make.com webhook
2. **Make.com Module 21/22** → Creates GHL record(s), maps form values to GHL fields
3. **GHL Webhook** → Triggers "GHL Property Review Submitted" scenario
4. **Make.com Module 6** → Parses GHL data
5. **Make.com Module 3** → Builds email template (this document)
6. **Make.com Gmail Module** → Sends email

---

## 📌 Key Decisions & Rationale

### Why `<p>` tags instead of `<ul><li>` for "Why This Property"?
- **Reason:** Email clients (especially Outlook) don't reliably render `<strong>` tags inside `<li>` elements
- **Solution:** Use `<p>` tags with `<strong>` tags (same pattern as `htmlLine` which works)

### Why regex for dash character matching?
- **Reason:** Input data uses various dash characters (hyphen `-`, en-dash `–`, em-dash `—`)
- **Solution:** Regex `/[\s]+[-–—][\s]+/` matches all three types
- **Impact:** Without this, `indexOf(" - ")` fails and bold formatting is skipped

### Why always display Market Performance fields?
- **Reason:** Business requirement - all 8 fields must be visible even if value is 0 or N/A
- **Solution:** `htmlLineMarket()` and `textLineMarket()` functions that don't filter out falsy values
- **Format:** `formatMarketPerformanceValue()` converts null to "N/A", formats numbers to 2 decimal places

### Why "Periodical" as a string value?
- **Reason:** GHL expiry field is a text field (not dropdown), so "Periodical" is stored as string
- **Solution:** `parseExpiry()` and `formatExpiry()` functions handle "Periodical" as a valid value
- **Validation:** Updated to accept "Periodical" alongside "TBC" and month/year formats

---

## 🚧 Future Work

### Purchase Price - Cashback Scenarios
- Show "Asking: ... with $Xk cashback"
- Indented "Net Price: ... when considering the $Xk cashback"
- Remove Acquisition Target when cashback present

### Purchase Price - House & Land Packages
- Show "House & Land package"
- Show "Price:", indented "Land:" and "Build:"
- Show "Net Price:" if cashback
- Remove Acquisition Target

### Property Type-Specific Logic
- Document different formatting rules for Established vs H&L vs Project
- Create separate formatting functions or conditional logic blocks
- Ensure shared sections remain consistent across all types

### Portal Version Testing
- Test portal version (used for "Send Again" button from Deal Sheet)
- Verify portal version uses same formatting logic as main version
- Confirm portal data source provides all required fields (occupancy_primary/secondary, rent_appraisal from/to ranges)

---

## 📚 Related Documents

- `docs/MAKECOM-SCENARIOS-AND-GHL-WEBHOOKS.md` - Make.com scenario structure
- `docs/EXISTING-GHL-INFRASTRUCTURE.md` - GHL field definitions
- `code/MODULE-3-COMPLETE-FOR-MAKE.js` - Email template builder code
- `MODULE-21-FIXED-CODE.js` - Single property data mapping
- `ROUTE-2-MODULE-22-COMPLETE-CODE.js` - Project data mapping

---

**Status:** Active documentation - updated as formatting logic evolves
