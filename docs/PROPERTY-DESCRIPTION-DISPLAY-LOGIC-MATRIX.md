# Property Description Display Logic Matrix

**Date:** 2026-01-15  
**Purpose:** Document display logic for Property Description section fields based on single vs dual occupancy and data availability.

---

## Field Display Rules

### Core Fields (Always Shown if Data Exists)

1. **Bed**
   - **Single Occupancy:** `"[beds_primary]"`
   - **Dual Occupancy:** `"[beds_primary] + [beds_secondary]"`
   - **Show if:** `beds_primary` has value

2. **Bath**
   - **Single Occupancy:** `"[bath_primary]"` (converts "point" to "." - e.g., "2point5" → "2.5")
   - **Dual Occupancy:** `"[bath_primary] + [bath_secondary]"`
   - **Show if:** `bath_primary` has value

3. **Garage**
   - **Single Occupancy Logic:**
     - Show if: `garage_primary` has value OR (no `carport_primary` AND no `carspace_primary`)
     - Format: `"[garage_primary]"` (even if "0")
     - **Exception:** If `garage_primary = 0` AND (`carport_primary` OR `carspace_primary` exists), don't show Garage
   - **Dual Occupancy Logic:**
     - Show if: `garage_primary > 0` OR `garage_secondary > 0` OR (no carport/carspace on either side)
     - Format: `"[garage_primary] + [garage_secondary]"` (shows 0s if either side has garage)
     - **Exception:** If both sides = 0 AND carport/carspace exists on either side, don't show Garage

4. **Car-port**
   - **Single Occupancy:** Show if `carport_primary` has value
   - **Dual Occupancy:** Show if `carport_primary` OR `carport_secondary` has value
   - Format: `"[carport_primary]"` (single) or `"[carport_primary] + [carport_secondary]"` (dual)

5. **Car-space**
   - **Single Occupancy:** Show if `carspace_primary` has value
   - **Dual Occupancy:** Show if `carspace_primary` OR `carspace_secondary` has value
   - Format: `"[carspace_primary]"` (single) or `"[carspace_primary] + [carspace_secondary]"` (dual)

6. **Registration**
   - Show if: `land_registration` has value
   - Format: `"[land_registration]"` (as-is)

7. **Built**
   - Show if: `build_size` OR `year_built` has value
   - Format:
     - If `build_size` exists: `"[build_size] sqm approx."` (for H&L/Projects)
     - If `year_built` exists: `"[year_built] approx."` (for Established)
     - Priority: `build_size` over `year_built`

8. **Land Size**
   - Show if: `land_size` has value
   - Format: `"[land_size] sqm approx."`

9. **Title**
   - Show if: `title` has value
   - Format: Capitalized (first letter uppercase, rest lowercase)

10. **Body corp.**
    - Show if: `body_corp__per_quarter` has value
    - Format: `"Approx. $[value] per quarter"`
    - **Styling:** Indented with `margin-left: 20px`

11. **Property Description Additional Dialogue**
    - Show if: `property_description_additional_dialogue` has value
    - Format: `"*[dialogue text]"`
    - **Position:** Appears on a new line (with `<br>`) after all other Property Description fields
    - **Styling:** Not indented (same as Market Performance dialogue)

---

## Dual Occupancy Detection

A property is considered **dual occupancy** if:
- `does_this_property_have_2_dwellings` contains "yes" (case-insensitive), OR
- `beds_secondary` exists AND is not "0" AND is not empty, OR
- `current_rent_secondary` exists AND is not "0" AND is not empty

---

## Garage/Carport/Car-space Logic Matrix

### Single Occupancy

| Garage Primary | Carport Primary | Carspace Primary | Shows Garage | Shows Carport | Shows Carspace |
|----------------|-----------------|------------------|--------------|---------------|----------------|
| 0              | No              | No               | Yes ("0")    | No            | No             |
| 1              | No              | No               | Yes ("1")    | No            | No             |
| 0              | Yes             | No               | No           | Yes           | No             |
| 0              | No              | Yes              | No           | No            | Yes            |
| 1              | Yes             | No               | Yes ("1")    | Yes           | No             |
| 2              | No              | Yes              | Yes ("2")    | No            | Yes            |

### Dual Occupancy

| Garage Primary | Garage Secondary | Carport Either Side | Carspace Either Side | Shows Garage | Shows Carport | Shows Carspace |
|----------------|------------------|---------------------|----------------------|--------------|---------------|----------------|
| 0              | 0                | No                  | No                   | Yes ("0 + 0") | No            | No             |
| 1              | 0                | No                  | No                   | Yes ("1 + 0") | No            | No             |
| 0              | 1                | No                  | No                   | Yes ("0 + 1") | No            | No             |
| 0              | 0                | Yes                 | No                   | No           | Yes           | No             |
| 0              | 0                | No                  | Yes                  | No           | No            | Yes            |
| 1              | 0                | Yes                 | No                   | Yes ("1 + 0") | Yes           | No             |

---

## Field Name Variations (Handled in Code)

- `beds_secondary` OR `beds_additional__secondary__dual_key`
- `bath_secondary` OR `baths_additional__secondary__dual_key`
- `garage_secondary` OR `garage_additional__secondary__dual_key`
- `carport_secondary` OR `carport_additional__secondary__dual_key`
- `carspace_secondary` OR `carspace_additional__secondary__dual_key`

---

## Display Order

1. **Bed**
2. **Bath**
3. **Garage**
4. **Car-port**
5. **Car-space**
6. **Registration** (if exists)
7. **Built** (if exists)
8. **Land Size** (if exists)
9. **Title** (if exists)
10. **Body corp.** (if exists, indented)
11. **Property Description Additional Dialogue** (if exists, with line break before)

---

## Helper Functions Used

- `toNum(val)` - Converts value to number (defaults to 0 if null/undefined/empty)
- `hasValue(val)` - Checks if value exists (not null/undefined/empty, but 0 is considered existing)
- `formatBathValue(val)` - Converts "point" to "." (e.g., "2point5" → "2.5")
- `htmlLine(label, value)` - Formats HTML line: `<p><strong>Label:</strong> Value</p>`
- `textLine(label, value)` - Formats text line: `Label: Value\n`

---

## Special Notes

- **Single Occupancy:** Garage shows "0" if no carport/carspace exists, even if garage value is 0
- **Dual Occupancy:** Garage shows "0 + 0" if neither side has garage AND no carport/carspace exists
- **Carport/Car-space:** Only shown if primary (single) or either side (dual) has a value
- **Body corp.:** Always indented with `margin-left: 20px`
- **Dialogue:** Always appears last, with line break before, not indented
- **Bath values:** Automatically converts "point" to "." (handles GHL storage format)

---

## Complete Display Matrix (Single Occupancy Example)

| Beds | Baths | Garage | Carport | Carspace | Year Built | Land Size | Title | Body Corp | Dialogue | Shows All Fields? |
|------|-------|--------|---------|----------|------------|-----------|-------|-----------|----------|-------------------|
| 3    | 2     | 2      | No      | No       | 1975       | 500       | Freehold | $500    | Yes      | Yes               |
| 4    | 2.5   | 0      | No      | No       | 1980       | 600       | Freehold | No      | No       | Yes (Garage="0")  |
| 3    | 2     | 0      | 1       | No       | 1975       | 500       | Freehold | $500    | Yes      | No Garage         |
| 4    | 2.5   | 2      | 1       | No       | 1980       | 600       | Freehold | No      | No       | Yes (all shown)   |

---

## Complete Display Matrix (Dual Occupancy Example)

| Beds Primary | Beds Secondary | Garage Primary | Garage Secondary | Carport Either | Carspace Either | Shows Format |
|--------------|----------------|----------------|------------------|----------------|-----------------|--------------|
| 3            | 2              | 1              | 0                | No             | No              | "3 + 2", "1 + 0" |
| 4            | 3              | 0              | 0                | No             | No              | "4 + 3", "0 + 0" |
| 3            | 2              | 0              | 0                | Yes            | No              | "3 + 2", no Garage, Carport shown |
| 4            | 3              | 1              | 0                | Yes            | No              | "4 + 3", "1 + 0", Carport shown |
