# Purchase Price Display Logic Matrix

**Date:** 2026-01-15  
**Purpose:** Document display logic for Purchase Price section fields based on data availability and property characteristics.

---

## Field Display Rules

### 1. **Asking**
- **Show if:** `asking` OR `asking_text` has value
- **Format:**
  - If both `asking` AND `asking_text` exist: `"[asking type] - [asking_text]"`
  - If only `asking` exists: `"[asking type]"` (e.g., "On-market", "Off-market", "Pre-launch opportunity", "Coming soon")
  - If only `asking_text` exists: `"[asking_text]"`
- **Examples:**
  - `"On-market - $475,000 - $480,000"`
  - `"Off-market - $490,000 - $520,000"`
  - `"Pre-launch opportunity - $730,000 - $800,000"`
  - `"Coming soon - Vendor expectation over $720,000"`

### 2. **Comparable Sales**
- **Show if:** `comparable_sales` has value
- **Format:** Multi-line text (preserves line breaks, normalizes newlines)
- **Display:** Bullet points or paragraphs as entered
- **Always shown** when value exists (no conditional logic)

### 3. **Accepted Acquisition Target**
- **Show if:** `acceptable_acquisition__from` OR `acceptable_acquisition_from` OR `acceptable_acquisition__to` OR `acceptable_acquisition_to` has value
- **Format:**
  - If both `from` AND `to` exist: `"$[from] - $[to]"` (with commas: `"$855,000 - $875,000"`)
  - If only `from` exists: `"$[from]"`
  - If only `to` exists: `"$[to]"`
- **Note:** Values are formatted with commas using `formatNumberWithCommas()` helper
- **Position:** Appears **after** "Comparable Sales" (not before)

### 4. **Purchase Price Additional Dialogue**
- **Show if:** `purchase_price_additional_dialogue` has value
- **Format:** `"*[dialogue text]"`
- **Position:** Appears on a new line (with `<br>`) **after** all other Purchase Price fields
- **Styling:** Not indented (same as Market Performance dialogue)

---

## Display Order

1. **Asking** (if exists)
2. **Comparable Sales** (if exists)
3. **Accepted Acquisition Target** (if exists)
4. **Purchase Price Additional Dialogue** (if exists, with line break before)

---

## Special Cases / Exceptions

### Cashback Scenarios (Not Currently Implemented)
Based on training doc, these scenarios exist but are not yet in code:
- **Off-market with cashback:** Show "Asking" with cashback note, then "Net Price" (indented), remove "Accepted Acquisition Target"
- **House & Land with cashback:** Show "House & Land Package", then "Price", then "Land" and "Build" (indented), then "Net Price", remove "Accepted Acquisition Target"

### Projects
- Projects may have different Purchase Price formatting (not covered in current code)

---

## Field Name Variations (Handled in Code)

- `acceptable_acquisition__from` (double underscore) OR `acceptable_acquisition_from` (single underscore)
- `acceptable_acquisition__to` (double underscore) OR `acceptable_acquisition_to` (single underscore)

---

## Helper Functions Used

- `formatNumberWithCommas(value)` - Formats numbers with comma separators (e.g., `855000` → `"855,000"`)
- `neatValue(value)` - Cleans/neatens field values
- `normaliseNewlines(text)` - Normalizes line breaks in Comparable Sales text
- `htmlLine(label, value)` - Formats HTML line: `<p><strong>Label:</strong> Value</p>`
- `textLine(label, value)` - Formats text line: `Label: Value\n`

---

## Matrix Table

| Asking Value | Asking Text Value | Comparable Sales Value | Acceptable From | Acceptable To | Shows Asking | Shows Comparable Sales | Shows Accepted Acquisition Target | Shows Dialogue |
|--------------|-------------------|----------------------|-----------------|---------------|--------------|------------------------|----------------------------------|----------------|
| Yes          | Yes               | Yes                  | Yes             | Yes           | Yes (combined)| Yes                    | Yes (range)                      | If exists      |
| Yes          | No                | Yes                  | Yes             | Yes           | Yes (type only)| Yes                    | Yes (range)                      | If exists      |
| No           | Yes               | Yes                  | Yes             | Yes           | Yes (text only)| Yes                    | Yes (range)                      | If exists      |
| Yes          | Yes               | No                   | Yes             | Yes           | Yes (combined)| No                     | Yes (range)                      | If exists      |
| No           | No                | Yes                  | Yes             | Yes           | No            | Yes                    | Yes (range)                      | If exists      |
| Yes          | Yes               | Yes                  | Yes             | No            | Yes (combined)| Yes                    | Yes (from only)                  | If exists      |
| Yes          | Yes               | Yes                  | No              | Yes           | Yes (combined)| Yes                    | Yes (to only)                    | If exists      |
| Yes          | Yes               | Yes                  | No              | No            | Yes (combined)| Yes                    | No                               | If exists      |
| No           | No                | No                   | No              | No            | No            | No                     | No                               | If exists      |

---

## Notes

- All fields are **optional** - section only appears if at least one field has a value
- Section heading: **"Purchase Price"**
- Dialogue always appears last, with a line break before it
- Accepted Acquisition Target formatting uses commas for readability
