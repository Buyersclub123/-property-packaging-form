# Asking Text Field - Spell Check & Label Update

## Issues to Fix

### 1. Spell Check Missing/Restore
- **Field:** Asking Text * (mandatory field)
- **Location:** Page 3/5 (Step 2 - Property Details)
- **Issue:** Spell check not working (may have been removed or not working)
- **Action:** Add/restore `spellCheck="true"` attribute

### 2. Label Update Needed
- **Current Label:** "Asking Text *"
- **New Label:** "Asking Text (Text will appear exactly as typed in email template) *"
- **Reason:** Same message as we added to Comparable Sales, Project Brief, and Purchase Price Additional Dialogue fields
- **Location:** Update label text in the form

## Implementation Notes
- Find "Asking Text" field in Step2PropertyDetails.tsx
- Verify/restore spellCheck="true" on textarea/input
- Update label text to include the email template message
- Verify it works

## Status
**TODO**: Implement before form completion





