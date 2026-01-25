# Email Template Requirements - Consolidated Document

**Date:** 2025-01-13  
**Purpose:** Consolidated requirements for email template formatting in Make.com Module 3, including all testing confirmations and agreed-upon behavior

**Last Updated:** 2025-01-14 (Afternoon Testing Session)

---

## TABLE OF CONTENTS

1. [General Email Formatting Rules](#general-email-formatting-rules)
2. [Purchase Price Section](#purchase-price-section)
3. [Property Description Section](#property-description-section)
4. [Rental Assessment Section](#rental-assessment-section)
5. [Subject Line Formatting](#subject-line-formatting)
6. [Helper Functions & Formatting](#helper-functions--formatting)
7. [Testing Confirmations](#testing-confirmations)

---

## GENERAL EMAIL FORMATTING RULES

### General Formatting Guidelines

- **Paste as plain text in Gmail** (no formatting, fonts, or colors)
- **Always include a space after each colon** (e.g., `Bed: 3` not `Bed:3`)
- **Use dash-space format to separate key lines** (e.g., `Asking: On-market - $400,000 - $430,000`)
- **Bedroom numbers in dialogue:** hyphenate number and word (e.g., `Comparable 4-bed properties`)
- **Use bold formatting for important numbers/phrases**, with indentation as directed
- **Avoid:** ALL CAPS, bright colors, highlight backgrounds, italics
- **Abbreviations:** Use full text for months/years and "per week" (e.g., `Expiry: September 2025`, `Rent: $460 per week`)
- **Section headings:** Section headings like "Purchase Price" should NOT appear in email content (left sidebar navigation handles it)

### Value Formatting Rules

- **"Off-market" capitalization:** Always display as "Off-market" (capitalized O, hyphenated)
- **Title formatting:** Replace underscores with spaces and capitalize each word
  - Example: `owners_corp_community` → `Owners Corp Community`
- **Number formatting:** Use commas for readability (e.g., `$855,000`)
- **Cashback/Rebate amount formatting:** Can be formatted as "$20k" (shortened) OR "$20,000" (full) - both acceptable

---

## ADDRESS & GOOGLE MAP SECTION

### Display Logic Overview

**Structure:**
- **Address** and **Google Map** are displayed as separate sections (not combined)
- Each section has its own left column heading

### Address Section
- **Left Column Heading:** "Address"
- **Right Column Content:** Property address (uppercase)
- **Format:** Display address as entered in form, in uppercase

### Google Map Section
- **Left Column Heading:** "Google Map"
- **Right Column Content:** Clickable Google Maps link
- **Format:** Link text is the property address (clickable hyperlink)
- **Link URL:** Google Maps URL from `google_map` field
- **Position:** Appears as separate section row directly after Address section
- **Styling:** Link appears as blue, underlined text (standard hyperlink styling)

---

## PURCHASE PRICE SECTION

### Display Logic Overview

**For Established Properties:**
1. **Asking** (if exists)
2. **Comparable Sales** (if exists - always shown, mandatory field)
3. **Accepted Acquisition Target** (if exists)
4. **Cashback/Rebate** (if `dealType === "03_internal_with_comms"` AND has cashback/rebate value)
5. **Purchase Price Additional Dialogue** (if exists, with line break before)

**For New Properties (H&L, SMSF):**
1. **House & Land package** (hardcoded text, bold)
2. **Price** (Total Price, bold - both label and value)
3. **Land** (if Split Contract, indented 30px, label bold, value regular)
4. **Build** (if Split Contract, indented 30px, label bold, value regular)
5. **Net Price** (ONLY if `cashbackRebateType === "cashback"`, not for rebates)
6. **Rebate** (if `cashbackRebateType` includes "rebate", as separate line)
7. **Comparable Sales** (always shown, mandatory field)
8. **Purchase Price Additional Dialogue** (if exists, with line break before)

### Established Properties - Detailed Rules

#### Asking Field
- **Show if:** `asking` OR `asking_text` has value
- **Format:**
  - If both `asking` AND `asking_text` exist: `"[asking type] - [asking_text]"`
  - If only `asking` exists: `"[asking type]"` (e.g., "On-market", "Off-market", "Pre-launch opportunity", "Coming soon")
  - If only `asking_text` exists: `"[asking_text]"`
- **Market Position Options:**
  - **On-market:** Property is advertised on REA, Domain etc.
  - **Off-market:** Property is NOT advertised AND there is NO plan by agent to launch online campaign (display as "Off-market")
  - **Pre-launch opportunity:** Property is NOT advertised BUT there IS a plan by agent to launch online campaign
  - **Coming soon:** Agent creating awareness of property coming to market soon

#### Comparable Sales
- **Show if:** `comparable_sales` has value
- **Format:** Multi-line text (preserves line breaks, normalizes newlines)
- **Always shown** when value exists (mandatory field)
- **Wording Guidelines:** Use common real estate language (traded, sold, achieved, fetched, secured, commanded)
- **Numeral Formatting:** Use shortened numbers with "k's" (e.g., `mid 400k's to early 500k's`)

#### Accepted Acquisition Target
- **Show if:** `acceptable_acquisition__from` OR `acceptable_acquisition_from` OR `acceptable_acquisition__to` OR `acceptable_acquisition_to` has value
- **Format:**
  - If both `from` AND `to` exist: `"$[from] - $[to]"` (with commas: `"$855,000 - $875,000"`)
  - If only `from` exists: `"$[from]"`
  - If only `to` exists: `"$[to]"`
- **Position:** Appears **after** "Comparable Sales" (not before)
- **Do NOT show** for New properties

#### Cashback/Rebate (Established Properties)
- **Show if:** `dealType === "03_internal_with_comms"` AND `cashbackRebateValue` has value
- **Format:** `"[Cashback/Rebate]: $[Amount]"` (dynamic label based on `cashbackRebateType`)
- **Label logic:**
  - If `cashbackRebateType` includes "rebate" → `"Rebate:"`
  - Else → `"Cashback:"`
- **Styling:** Dollar amount has grey background (#808080) with white bold text
- **Shows:** Value only (NOT the Type field)
- **Position:** After "Accepted Acquisition Target", before "Purchase Price Additional Dialogue"
- **Important:** Never show Net Price for Established (even if cashback exists) - Established properties don't have fixed prices

### New Properties - Detailed Rules

#### House & Land Package Text
- **Display:** "House & Land package" (hardcoded text, bold)
- **Position:** First line of Purchase Price section for New properties
- **Do NOT show** for Established properties

#### Price (Total Price)
- **Display:** `"Price: $[Total]"` (bold - both label and value)
- **Shows:** Always for New properties

#### Land and Build (Split Contract Only)
- **Land:** `"Land: $[Amount]"` (indented 30px, label bold, value regular)
- **Build:** `"Build: $[Amount]"` (indented 30px, label bold, value regular)
- **Shows:** Only if Split Contract (NOT for Single Contract)
- **Important:** Only Total Price and Net Price values are bold. Land and Build values are regular text (labels are bold).

#### Net Price (New Properties)
- **Show if:** `cashbackRebateType === "cashback"` (NOT for rebates)
- **Format:** `"Net Price: $[Net Price] when considering the $[Amount]k [cashbackRebateType]"`
- **Uses:** `cashbackRebateType` field value (not hardcoded) - format for sentence (lowercase)
- **Styling:**
  - Net Price label and value are bold
  - Cashback amount has grey background (#808080) with white bold text
- **Position:** After Land/Build (if shown), before Comparable Sales
- **Do NOT show** if `cashbackRebateType` includes "rebate"

#### Rebate (New Properties)
- **Show if:** `cashbackRebateType` includes "rebate"
- **Format:** `"Rebate: $[Amount]"` (same styling as Established)
- **Styling:** Dollar amount has grey background (#808080) with white bold text
- **Position:** After Net Price (if shown), before Comparable Sales
- **Do NOT show:** Separate "Cashback/Rebate Value" or "Cashback/Rebate Type" fields - Net Price sentence or Rebate line provides this info

#### Comparable Sales (New Properties)
- **Same rules as Established** (always shown, mandatory field)

#### Additional Rules for New Properties
- **Do NOT show "Asking"** for New properties
- **Do NOT show "Accepted Acquisition Target"** for New properties
- **Do NOT show "Registration"** in Property Description section (only for New properties in Property Description)

---

## PROPERTY DESCRIPTION SECTION

### Display Order

1. **Bed**
2. **Bath**
3. **Garage**
4. **Car-port**
5. **Car-space**
6. **Registration** (only for New properties - NOT Established)
7. **Built**
8. **Land Size**
9. **Title**
10. **Body corp.** (if applicable title type)
11. **Property Description Additional Dialogue** (if exists, with line break before)

### Field-Specific Rules

#### Bed
- **Single Occupancy:** `"[beds_primary]"`
- **Dual Occupancy:** `"[beds_primary] + [beds_secondary]"`
- **Show if:** `beds_primary` has value

#### Bath
- **Single Occupancy:** `"[bath_primary]"` (converts "point" to "." - e.g., "2point5" → "2.5")
- **Dual Occupancy:** `"[bath_primary] + [bath_secondary]"`
- **Show if:** `bath_primary` has value

#### Garage/Car-port/Car-space
- **Logic:** Show only the applicable one (Garage first, then Car-port, then Car-space)
- **Single Occupancy:** Shows if `garage_primary` has value (or 0 if no carport/carspace)
- **Dual Occupancy:** Shows `"[garage_primary] + [garage_secondary]"`
- **Exception:** If `garage_primary = 0` AND (`carport_primary` OR `carspace_primary` exists), don't show Garage

#### Registration
- **Show if:** `land_registration` has value AND property is New (NOT Established)
- **Format:** `"[land_registration]"` (as-is)
- **Examples:** `"Registered"`, `"April 2026 approx."`, `"TBC"`

#### Built
- **Show if:** `build_size` OR `year_built` has value
- **Format:**
  - If `build_size` exists: `"[build_size] sqm approx."` (for H&L/Projects)
  - If `year_built` exists: `"[year_built] approx."` (for Established)
  - Priority: `build_size` over `year_built`

#### Land Size
- **Show if:** `land_size` has value
- **Format:** `"[land_size] sqm approx."`

#### Title
- **Show if:** `title` has value
- **Format:** Replace underscores with spaces and capitalize each word
  - Example: `"owners_corp_community"` → `"Owners Corp Community"`
  - Example: `"torrens"` → `"Torrens"`

#### Body corp.
- **Show if:** Title type is one of: STRATA, OWNERS CORP (COMMUNITY), SURVEY STRATA, BUILT STRATA
- **Always show** for applicable title types (even if value is empty - indicates data issue)
- **Format:** `"Approx. $[amount] per quarter"` OR empty string if value is null
- **Styling:** Indented with `margin-left: 20px`
- **Important:** Comparison logic replaces underscores in title before checking (handles "owners_corp_community" format)
- **Do NOT show** for: INDIVIDUAL, TORRENS, GREEN, TBC

#### Body Corp Description
- **Show if:** `bodyCorpQuarter` has a value (including "TBC") AND `bodyCorpDescription` has text
- **Format:** Heading "Body corp. Dialogue:" on its own line, description text on the next line(s)
- **Styling:** Same indentation as Body Corp amount (`margin-left: 20px`)
- **Position:** Appears immediately after the Body Corp amount line
- **Text formatting:** Uses `normaliseNewlines()` to handle line breaks in multi-line text
- **Optional:** Only shows when both fields have values

#### Property Description Additional Dialogue
- **Show if:** `property_description_additional_dialogue` has value
- **Format:** `"*[dialogue text]"`
- **Position:** Appears on a new line (with `<br>`) after all other Property Description fields
- **Styling:** Not indented

---

## RENTAL ASSESSMENT SECTION

### Display Logic Overview

**For Established Properties:**
- **Always show:** Occupancy, Appraisal, Appraised Yield
- **Show if tenanted:** Current Rent, Expiry, Current Yield (always show these fields for tenanted properties, even if values are null)

**For New Properties (H&L):**
- **Show:** Appraisal, Appraised Yield
- **Do NOT show:** Occupancy, Current Rent, Expiry, Current Yield (only for Established properties)

### Field-Specific Rules

#### Occupancy
- **Always show** if field exists
- **Format:** Display as entered (e.g., "Owner Occupied", "Tenanted", "Vacant")

#### Current Rent (Established Tenanted Only)
- **Show if:** `occupancy === "tenanted"` AND property is Established
- **Format:** `"Current Rent: $[Amount] per week"`
- **Always show field** for tenanted Established properties (even if value is null)
- **Do NOT show** for New properties

#### Expiry (Established Tenanted Only)
- **Show if:** `occupancy === "tenanted"` AND property is Established
- **Format:** `"Expiry: [Full Month Year]"` (e.g., "October 2025", "September 2026")
- **Always show field** for tenanted Established properties (even if value is null)
- **Do NOT show** for New properties

#### Current Yield (Established Tenanted Only)
- **Show if:** `occupancy === "tenanted"` AND property is Established AND `yield` exists
- **Format:** `"Current Yield: ~ [Percentage]%"`
- **Always show field** for tenanted Established properties (even if value is null)
- **Do NOT show** for New properties

#### Appraisal
- **Always show** if `rentAppraisalPrimaryFrom/To` exist
- **Format:** `"Appraisal: $[From] - $[To] per week"`
- **Shows for:** Both Established and New properties

#### Appraised Yield
- **Always show** if `appraisedYield` exists
- **Format:** `"Appraised Yield: ~ [Percentage]%"`
- **Shows for:** Both Established and New properties

### Dual Occupancy Rules

- **Occupancy:** Show both units (e.g., "Unit A: Tenanted, Unit B: Tenanted")
- **Current Rent:** Show total and individual units (if tenanted)
- **Expiry:** Show both units (if tenanted)
- **Appraisal:** Show total and individual units
- **Current Yield:** Show only if at least one unit is tenanted
- **Appraised Yield:** Always show if exists

---

## SUBJECT LINE FORMATTING

### Subject Line Format Rules

**For H&L Properties:**
- **Format:** `"Property Review (H&L [X]-bed Dual-key): LOT [NUMBER] [ADDRESS]"` OR `"Property Review (H&L [X]-bed Single Family): LOT [NUMBER] [ADDRESS]"`
- **LOT Prefix:** Add "LOT " prefix before lot number if lot number exists
- **Duplicate Prevention:** Check if address already contains "LOT" before adding prefix (prevents "LOT LOT 123 Main Street")

**For Established Properties:**
- **Format:** `"Property Review: [ADDRESS]"`

**For SMSF Properties:**
- **Format:** `"Property Review (SMSF): LOT [NUMBER] [ADDRESS]"` (if lot number exists)

### Contract Type Logic

- **Use `contract_type` field** to determine H&L vs SMSF distinction
- **H&L:** Uses `contract_type` to determine subject line format
- **SMSF:** Uses `contract_type === "smsf"` for SMSF format

---

## HELPER FUNCTIONS & FORMATTING

### neatValue(str)
- **Purpose:** Cleans/neatens field values
- **Rules:**
  - Returns "Yes" for "yes" (lowercase)
  - Returns "No" for "no" (lowercase)
  - Returns "On-market" for "onmarket" or "on market"
  - Returns "Off-market" for "offmarket" or "off-market" (capitalized O)
  - Returns original string trimmed for other values

### formatNumberWithCommas(value)
- **Purpose:** Formats numbers with comma separators
- **Example:** `855000` → `"855,000"`

### normaliseNewlines(text)
- **Purpose:** Normalizes line breaks in multi-line text fields
- **Used for:** Comparable Sales, Property Description Additional Dialogue, etc.

### Title Formatting
- **Replace underscores with spaces:** `"owners_corp_community"` → `"Owners Corp Community"`
- **Capitalize each word:** First letter uppercase, rest lowercase
- **Applied to:** Title field in Property Description section

### Cashback/Rebate Amount Styling
- **Background color:** `#808080` (grey)
- **Text color:** `#ffffff` (white)
- **Font weight:** Bold
- **Padding:** `2px 6px`
- **Border radius:** `3px`
- **Applied to:** Cashback/Rebate dollar amounts in Purchase Price section

---

## TESTING CONFIRMATIONS

### Verified in Testing (2025-01-13)

#### ✅ New Property (H&L Split Contract) with cashback
- House & Land package (bold) ✓
- Price: $850,000 (label bold, value bold) ✓
- Land: $360,000 (label bold, value regular) ✓
- Build: $490,000 (label bold, value regular) ✓
- Net Price: $830,000 when considering the $20k cashback (label bold, value bold) ✓
- Cashback amount "$20k cashback" has grey background (#808080) with white bold text ✓
- Comparable Sales shows ✓

#### ✅ Established Property (03_internal_with_comms) with cashback
- Asking shows ✓
- Comparable Sales shows ✓
- Accepted Acquisition Target shows ✓
- Cashback: $20,000 (dynamic label based on cashbackRebateType) ✓
- Cashback amount has grey background (#808080) with white bold text ✓
- Net Price does NOT show (correct - Established properties don't show Net Price) ✓

#### ✅ Title Formatting
- "owners_corp_community" formats as "Owners Corp Community" ✓
- Underscores replaced with spaces ✓
- Each word capitalized ✓

#### ✅ Body Corp Display
- Shows for STRATA title types ✓
- Shows for OWNERS CORP title types (even if value is empty) ✓
- Always shows for applicable title types (not value-based) ✓
- Does NOT show for TORRENS title types ✓

#### ✅ Subject Line LOT Prefix
- "LOT 123" prefix added correctly for H&L properties ✓
- Duplicate "LOT" prevented when address already contains "LOT" ✓

#### ✅ Off-market Capitalization
- "offmarket" displays as "Off-market" ✓
- Applied in neatValue() helper function ✓

#### ✅ Cashback/Rebate Label Logic
- "Cashback:" label when cashbackRebateType is "cashback" ✓
- "Rebate:" label when cashbackRebateType includes "rebate" ✓
- Default to "Cashback:" when cashbackRebateType is empty/null ✓

### Testing Checklist (Remaining)

- [x] New Property (H&L Split Contract) with rebate - Net Price does NOT show, Rebate shows ✅ VERIFIED 2025-01-14
- [x] New Property (Single Contract) with cashback - Net Price shows ✅ VERIFIED 2025-01-14
- [ ] New Property (Single Contract) with rebate - Net Price does NOT show, Rebate shows
- [ ] Established Property (03_internal_with_comms) with rebate - Rebate shows, Net Price does NOT show
- [ ] Body Corp shows for SURVEY STRATA title (even if value is empty)
- [ ] Body Corp shows for BUILT STRATA title (even if value is empty)
- [ ] Rental Assessment - Current Rent/Expiry/Yield always show for tenanted Established (even if null)
- [ ] Rental Assessment - Only Appraisal/Appraised Yield show for New H&L properties

---

## SPECIAL NOTES

### Registration Field
- **Only show for New properties** (NOT Established)
- **Position:** In Property Description section (after Car-space, before Built)

### Body Corp Field
- **Always show for applicable title types** (STRATA, OWNERS CORP, SURVEY STRATA, BUILT STRATA), even if value is empty
- **Reason:** If the form makes it mandatory, it will always appear in the email. Showing empty value indicates data issue.

### Net Price Logic
- **New Properties:** Shows ONLY if `cashbackRebateType === "cashback"` (NOT for rebates)
- **Established Properties:** Never shows Net Price (even if cashback exists)
- **Reason:** Established properties don't have fixed prices, so Net Price calculation doesn't apply

### Cashback/Rebate Field Mandatory Discussion
- **Note:** Consider making Cashback/Rebate fields mandatory for Contract Type (for Deal Sheet) 01, 02, 03, while keeping them pre-populated.
- **Status:** To be discussed after email template testing

---

## SUMMARY OF KEY RULES

### Purchase Price Section
1. **New Properties:** "House & Land package", Price, Land/Build (if Split), Net Price (if cashback), Rebate (if rebate), Comparable Sales
2. **Established Properties:** Asking, Comparable Sales, Accepted Acquisition Target, Cashback/Rebate (if 03 contract type)
3. **Never show Net Price for Established** (even if cashback exists)
4. **Net Price only for cashback** (not rebates) in New properties
5. **Cashback/Rebate styling:** Grey background (#808080) with white bold text

### Property Description Section
1. **Registration:** Only for New properties (NOT Established)
2. **Body Corp:** Always show for applicable title types (even if empty)
3. **Title formatting:** Replace underscores, capitalize each word
4. **Body Corp indentation:** 20px margin-left

### Rental Assessment Section
1. **New Properties:** Only show Appraisal, Appraised Yield (do NOT show Occupancy)
2. **Established Properties:** Always show Occupancy
3. **Established Tenanted:** Always show Current Rent, Expiry, Current Yield (even if null)
4. **Always show:** Appraisal and Appraised Yield for all property types

### Subject Line
1. **LOT prefix:** Add "LOT " before lot number for H&L/SMSF (check for duplicates)
2. **Contract type:** Use `contract_type` field for H&L vs SMSF distinction

---

**Document Status:** Consolidated requirements based on all documentation, testing confirmations, and agreed-upon behavior as of 2025-01-14.

## CHANGE LOG

### 2025-01-14 Updates
1. **Google Map Section:** Separated into its own section with "Google Map" as left column heading (previously combined with Address)
2. **Cashback/Rebate Type Options:** Simplified to "Cashback" and "Rebate" only (removed "Rebate on Land", "Rebate on Build", "Other")
3. **Purchase Price Additional Dialogue:** Made conditionally mandatory when Cashback/Rebate Type = "Rebate"
4. **Testing Confirmations:** Verified New Property (H&L Split Contract) with rebate, New Property (Single Contract) with cashback
