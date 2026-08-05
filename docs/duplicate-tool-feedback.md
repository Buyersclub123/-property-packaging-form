# Duplicate Tool — UI Review Feedback Log

## Feedback from JT review session — 9 July 2026

### 1. Lot Number behaviour
- Should NOT be "blocked" (no "use existing") — sometimes the same lot is used (e.g. dual vs single occupancy on same land)
- Remove "Must enter new value" red text
- User must manually type the value (no "use existing" checkbox)
- After entering, a verification prompt appears asking them to confirm the value
- Show "N/A" in the Action column (like current blocked behaviour, but without the red label)

### 2. Street Number behaviour
- Same as Lot Number — must be manually typed, no "use existing" checkbox
- Show "N/A" in Action column
- After entering, a verification prompt appears asking them to confirm
- Rationale: same lot + street number could legitimately be duplicated (dual vs single on same plot), but the user must consciously enter it

### 3. Duplicate address check (future consideration)
- System should ideally check if another property record already exists with the same lot + street number
- This is a Phase 2/3 concern — noted for later

### 4. Market Performance — three-column layout missing
- Agreed design was THREE columns: Source values | Fresh backend values (from Google Sheets) | New record field
- Current UI only shows two columns (source + new record) — missing the fresh backend data column
- User should be able to pick from source OR fresh backend data, or enter manually
- Fresh data pull will be wired up in Phase 3, but the UI column should be present now (can show placeholder/mock values)

### 5. Sub-section visual grouping within sections
- Property Address & Risk Assessment is fine in principle
- But visually separate the sub-groups within each section (e.g. address fields grouped, then a divider, then risk fields grouped)
- Apply same sub-grouping approach to subsequent sections too
- Don't change the overall section structure, just add visual separation between logical field groups

### 6. Market Performance onwards — use existing property form UI, two-page layout
- Current vertical scroll is fine for the comparison fields (Address, Decision Tree, Property Details, Purchase Price, Rental)
- For Market Performance onwards, switch to a second "page" (think left-to-right navigation, not just vertical scroll)
- Page 1 = side-by-side comparison scroll (the current fields)
- Page 2 = familiar property form UI for Market Performance, Insurance, Depreciation, Cashflow, Content, Agent
- Reuse the existing step components and layout to keep familiarity for packagers

---

**Review session 1 complete.** Further iterations expected.
