# Market Performance Data Collection Forms - Updates Needed

## Changes Required

### 1. URL Confirmation - Change to Yes/No Checkbox
- **Current:** URL input field requiring user to paste URL
- **New:** Yes/No checkbox asking "Did you get this data from smartpropertyinvestment.com.au?"
- **If Yes:** No URL needed
- **If No:** Show URL input field (for cases where data came from elsewhere)
- **URL Storage:** Store URL in "Notes" column of the log (not a separate field)

### 2. Auto-Remove % Signs from Percentage Fields
- **Issue:** Users copy-paste from websites, which includes % signs
- **Solution:** Automatically strip % signs from all percentage input fields
- **Fields Affected:**
  - Median price change - 3 months
  - Median price change - 1 year
  - Median price change - 3 year
  - Median price change - 5 year
  - Median yield
  - Median rent change - 1 year
  - Rental Population
  - Vacancy Rate
- **Implementation:** Add input handler that removes % on paste/input

### 3. Apply to Both Forms
- **Form A:** Smart Property Investment (SPI) form
- **Form B:** Real Estate Investar (REI) form
- Both forms need the Yes/No checkbox and % removal

## Implementation Notes
- Replace URL input with Yes/No checkbox
- Conditionally show URL field only if "No" is selected
- Add % removal logic to all percentage fields in data collection forms
- Store URL in Notes column of log entry if provided
- Update API to handle Yes/No instead of URL requirement

## Status
**TODO**: Implement before form completion





