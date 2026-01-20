# Structured Developer Build Spec
## Google Sheets Field Mapping Logic - New Fields (Rows 14-27)

---

## 1. CORE TECHNICAL DECISION

### Mapping Method
**Rule:** Use **Keyword Matching** for all fields (consistent across entire system)
- Search for keyword text in Column A
- Write value to Column B of matching row
- **Never use direct cell addressing** (e.g., B14) - breaks when rows change
- This applies to both existing (rows 1-13) and new fields (rows 14-27)

---

## 2. FIELD SPECIFICATIONS

### Field 13: Council/Water Rates $
- **UI Label:** "Council/Water Rates $"
- **UI Type:** Editable numeric input
- **Storage:** `formData.rates`
- **Sheet Mapping:** Search Column A for "Council/Water Rates $" → Write value to Column B
- **GHL Sync:** ❌ None (Form only)

---

### Field 14: Insurance or Insurance & Strata Field (Label)
- **UI Type:** Read-only label (dynamically set)
- **Source Data:** `formData.propertyDescription.title` (from Page 3)
- **Logic:**
  ```
  IF title IN ['strata', 'owners_corp_community', 'survey_strata', 'built_strata']:
      label = "Insurance & Strata"
  ELSE:
      label = "Insurance"
  ```
- **Title Dropdown Values (for reference):**
  - `individual` → "Individual"
  - `torrens` → "Torrens"
  - `green` → "Green"
  - `strata` → "Strata"
  - `owners_corp_community` → "Owners Corp (Community)"
  - `survey_strata` → "Survey Strata"
  - `built_strata` → "Built Strata"
  - `tbc` → "TBC"
- **Sheet Mapping:** Search Column A for "Insurance or Insurance & Strata Field" → Write label to Column B
- **GHL Sync:** ❌ None

---

### Field 15: Insurance or Insurance & Strata $ (Value)
**Complex conditional UI with calculation logic**

#### UI Behavior - Mode 1: "Insurance Only"
**When:** Title is NOT strata-related
- **Display:** Single editable field labeled "Insurance $"
- **Output to Sheet:** Value from "Insurance $" field

#### UI Behavior - Mode 2: "Insurance & Strata"
**When:** Title is strata-related (strata, owners_corp_community, survey_strata, built_strata)
- **Display:** Three fields in sequence:
  1. **"Annualised Body Corp"** - Read-only, calculated as `bodyCorpPerQuarter × 4`
  2. **"Insurance $"** - Editable numeric input
  3. **"Total"** - Read-only, calculated as `Annualised Body Corp + Insurance $`
- **Output to Sheet:** Value from "Total" field

#### Technical Details
- **Source Data:** 
  - `formData.propertyDescription.bodyCorpPerQuarter`
  - User-entered insurance amount
- **Sheet Mapping:** Search Column A for "Insurance or Insurance & Strata $" → Write output value to Column B
- **GHL Sync:** ❌ None

---

### Field 16: P&B / PCI
- **UI Type:** Read-only label (dynamically set)
- **Source Data:** `formData.decisionTree.propertyType` (from Page 2)
- **Logic:**
  ```
  IF propertyType == "New":
      value = "P&B + PCI Reports"
  ELSE IF propertyType == "Established":
      value = "Pest & Build (P&B) report"
  ```
- **Sheet Mapping:** Search Column A for "P&B / PCI" → Write text string to Column B
- **GHL Sync:** ❌ None
- **Note:** This is a text label field, not a numeric value

---

### Fields 17-26: Depreciation Year 1-10
**Washington Brown Integration with paste & parse functionality**

#### UI Components
1. **Paste Area:** Multi-line textarea labeled "Paste Results Table"
2. **10 Editable Fields:** "Depreciation Year 1" through "Depreciation Year 10" (numeric inputs)

#### Paste & Parse Logic
- **Input:** User pastes Washington Brown calculator output (full text block)
- **Parse Rules:**
  - Search for lines containing "Year 1" through "Year 10"
  - Extract values from **DIMINISHING VALUE column** (2nd column in table)
  - If Diminishing Value column exists, use those values (preferred)
  - Auto-populate the 10 editable fields
- **Example Input Format:**
  ```
  YEARS    DIMINISHING VALUE    PRIME COST
  Year 1   $11,000             $7,000
  Year 2   $8,000              $7,000
  ...
  Year 10  $5,000              $5,000
  ```

#### Storage & Mapping
- **Storage:** `formData.depreciation.year1` through `formData.depreciation.year10`
- **Sheet Mapping:** For each year (1-10):
  - Search Column A for "Depreciation Year X" (where X = 1-10)
  - Write corresponding value to Column B
- **Editability:** All 10 fields remain editable after auto-population (calculator may not always provide values)
- **GHL Sync:** ❌ None

---

### Field 27: Build Window
- **UI Type:** Dropdown select
- **Dropdown Options:** `09 mo`, `12 mo`, `15 mo`, `18 mo`
- **Storage:** `formData.buildWindow`
- **Sheet Mapping:** Search Column A for "Build Window" → Write selected value to Column B
- **GHL Sync:** ❌ None
- **Note:** NOT derived from `landRegistration` field (manual selection only)

---

### Field 28: Cashback 1 month
- **UI Type:** Dropdown select
- **Dropdown Options:** `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`
- **Storage:** `formData.cashback1Month`
- **Sheet Mapping:** Search Column A for "Cashback 1 month" → Write selected value to Column B
- **GHL Sync:** ❌ None

---

### Field 29: Cashback 2 month
- **UI Type:** Dropdown select
- **Dropdown Options:** `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`
- **Storage:** `formData.cashback2Month`
- **Sheet Mapping:** Search Column A for "Cashback 2 month" → Write selected value to Column B
- **GHL Sync:** ❌ None

---

## 3. SUMMARY TABLE

| Row | Field Name | UI Type | Data Source | Conditional Logic | GHL Sync |
|-----|------------|---------|-------------|-------------------|----------|
| 13 | Council/Water Rates $ | Editable numeric | User input | None | ❌ |
| 14 | Insurance or Insurance & Strata Field | Read-only label | Title type | Yes (strata check) | ❌ |
| 15 | Insurance or Insurance & Strata $ | Conditional UI | Title + Body Corp + Insurance | Yes (complex) | ❌ |
| 16 | P&B / PCI | Read-only label | Property type | Yes (New vs Established) | ❌ |
| 17-26 | Depreciation Year 1-10 | Editable numeric (×10) + paste area | Washington Brown parser | Parse logic | ❌ |
| 27 | Build Window | Dropdown | User selection | None | ❌ |
| 28 | Cashback 1 month | Dropdown | User selection | None | ❌ |
| 29 | Cashback 2 month | Dropdown | User selection | None | ❌ |

---

## 4. KEY BUSINESS RULES

1. **No GHL Sync:** All new fields (13-29) are form-only and do NOT sync to GoHighLevel
2. **Strata Title Types:** The following title types trigger "Insurance & Strata" mode:
   - `strata`
   - `owners_corp_community`
   - `survey_strata`
   - `built_strata`
3. **Washington Brown Priority:** When parsing depreciation data, prefer DIMINISHING VALUE column over PRIME COST
4. **Field Editability:** Even auto-populated fields (depreciation) must remain editable for manual override

---

## 5. UNRESOLVED / AMBIGUOUS ITEMS

⚠️ **UI Design Discussion Pending:**
- User mentioned: "we definitely need to talk about UI" regarding depreciation fields
- Specific layout/positioning of paste area vs. 10 editable fields not finalized

⚠️ **Two Additional Fields Mentioned:**
- User stated: "There are 2 more fields we need to add as well" (context: after depreciation discussion)
- These fields were not specified in the provided document

---

## 6. IMPLEMENTATION NOTES

### Keyword Matching Implementation
```
For each field:
  1. Search Column A for exact keyword text
  2. Find matching row index
  3. Write value to Column B at that row index
  4. Handle case where keyword not found (error/warning)
```

### Insurance & Strata Calculation
```
annualisedBodyCorp = formData.propertyDescription.bodyCorpPerQuarter × 4
insuranceAmount = [user input]
totalOutput = annualisedBodyCorp + insuranceAmount
```

### Washington Brown Parser Requirements
- Must handle currency formatting ($X,XXX)
- Must extract numeric values only
- Must handle missing/incomplete data gracefully
- Must identify "DIMINISHING VALUE" column header
- Must match "Year X" patterns (X = 1-10)
