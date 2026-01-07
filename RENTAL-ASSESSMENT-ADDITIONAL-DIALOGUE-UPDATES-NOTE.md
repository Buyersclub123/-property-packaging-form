# Rental Assessment Additional Dialogue - Spell Check, Label Update & Collapsible

## Issues to Fix

### 1. Spell Check Missing
- **Field:** Rental Assessment Additional Dialogue
- **Location:** Page 3/5 (Step 2 - Property Details)
- **Issue:** Spell check not working on this textarea field
- **Action:** Add `spellCheck="true"` attribute

### 2. Label Update Needed
- **Current Label:** "Rental Assessment Additional Dialogue"
- **New Label:** "Rental Assessment Additional Dialogue (Text will appear exactly as typed in email template)"
- **Reason:** Same message as we added to other dialogue fields
- **Location:** Update label text in the form

### 3. Make Collapsible
- **Request:** Make field collapsible with discreet arrow icon (same style as Lot info sections)
- **Default State:** Collapsed (hidden by default)
- **Reason:** It's an optional field, so don't need it visible by default
- **UI Style:** Use same collapsible pattern as Lot sections (accordion style with small arrow icon)

## Implementation Notes
- Find all instances of "Rental Assessment Additional Dialogue" field (H&L, Established, Project)
- Add spellCheck="true" to textarea
- Update label text to include the email template message
- Make field collapsible, collapsed by default
- Use same arrow toggle style as Lot info sections
- Verify it works in all property types

## Status
**TODO**: Implement before form completion





