# Duplicate Tool — Test Findings (10 Jul 2026)

Source record tested: Lot 415, Bloom Estate, Nikenbah QLD 4655 (Fraser Coast Regional)

## Bug 1: State dropdown not populated from source
- **Page:** Page 1, Address section
- **Issue:** "Use existing" is ticked, source shows "qld", but New Record dropdown remains on "Select..."
- **Root cause:** Source returns lowercase "qld", dropdown options are uppercase "QLD" — case-sensitive mismatch

## Bug 2: Contract Type not populated from source
- **Page:** Page 1, Decision Tree section
- **Issue:** "Use existing" ticked, source shows "–", New Record dropdown stays on "Select..."
- **Note:** May be genuinely empty in the source record — needs confirmation

## Bug 3: Deal Type — display labels vs option keys mismatch
- **Page:** Page 1, Decision Tree section
- **Issue:** Source displays "Single with Comms" (display label) but dropdown options use prefixed keys like "02_single_comms"
- **Impact:** If submitted, would write display label instead of option key to GHL

## Bug 4: Status — display labels vs option keys mismatch
- **Page:** Page 1, Decision Tree section
- **Issue:** Same as Deal Type. Source displays "Available" but dropdown expects "01_available"
- **Impact:** If submitted, would write display label instead of option key to GHL

## Bug 5: Proximity data source unclear
- **Page:** Page 2, Content section
- **Action:** Verify where Proximity data is coming from (source record? API? hardcoded?)

## Bug 6: Content review checkbox not enforced
- **Page:** Page 2, Content section
- **Issue:** The checkbox "I have reviewed all content sections above..." allows progression to next page without being ticked
- **Expected:** Should block navigation until ticked

## Bug 7: Washington Brown depreciation values not displayed
- **Page:** Page 2, Cashflow section
- **Issue:** Existing depreciation values from source record are not shown in the UI
- **Note:** Calculator itself is present (correct), but saved values should be pre-populated
- **Note:** Values ARE in the formStore and would submit correctly — this is a display-only issue

## Bug 8: Subject line — verify if being computed
- **Page:** Page 2, Cashflow Spreadsheet Review
- **Question:** Is the subject line being created during this step?
- **Note:** Handoff doc lists "Subject line is not computed" as a known gap — confirm if intentional

## Bug 9: Agent Information fields not pre-populated
- **Page:** Page 2, Agent Information section
- **Issue:** None of the agent fields (name, mobile, email) display source record values
- **Expected:** Should show source values so user can review/confirm

## Submit Risk Assessment

**Recommendation: Do NOT submit yet.**

Key issues that would cause bad data in GHL:
- Deal Type would write "Single with Comms" instead of "02_single_comms"
- Status would write "Available" instead of "01_available"
- Agent fields would submit as empty strings
- State would submit "qld" (may or may not be accepted by GHL)
