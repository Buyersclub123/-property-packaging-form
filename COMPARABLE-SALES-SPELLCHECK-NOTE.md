# Comparable Sales Field - Spell Check & Label Update

## Issues to Fix

### 1. Spell Check Missing
- **Field:** Comparable Sales * (mandatory field)
- **Location:** Page 3/5 (Step 2 - Property Details)
- **Issue:** Spell check not working on this textarea field
- **Action:** Add `spellCheck="true"` attribute

### 2. Label Update Needed
- **Current Label:** "Comparable Sales *"
- **New Label:** "Comparable Sales (Text will appear exactly as typed in email template) *"
- **Reason:** Same message as we added to Project Brief and Comparable Sales in Project view
- **Location:** Update label text in the form

## Implementation Notes
- Find all instances of "Comparable Sales" field (H&L, Established, Project)
- Add spellCheck="true" to textarea
- Update label text to include the email template message
- Verify it works in all property types

## Status
**TODO**: Implement before form completion





