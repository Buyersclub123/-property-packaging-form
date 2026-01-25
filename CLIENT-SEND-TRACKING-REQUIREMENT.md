# Client Send Tracking Requirement

**Date:** 2026-01-15  
**Status:** Future Enhancement (after email formatting fixes)  
**Priority:** High (after current contradictions/fixes)

---

## Overview

When a BA sends a property to clients via the portal, we need to track which clients have already been sent each property to prevent duplicate sends and provide audit trail.

---

## Requirements

### 1. Tracking Storage
- **Field Name:** `clients_sent_to` (or similar)
- **Storage Location:** GHL Custom Object (property_reviews table)
- **Format:** JSON array or structured data containing:
  - Client ID/Email
  - Date/Timestamp of when sent
  - Sent by (BA name/email)

### 2. Portal Display Behavior

**For clients who have already been sent the property:**
- **Display:** VERY VISIBLE indication (e.g., highlighted background, icon, "Sent" badge)
- **Selection State:** Auto-disabled (checkbox cannot be checked)
- **Double Confirmation:** If BA attempts to send again (e.g., clicks "Send Again" button for that client), show warning message:
  - Warning: "This property has already been sent to [Client Name] on [Date]. Are you sure you want to send again?"
  - Requires explicit confirmation (e.g., "Yes, Send Again" button)
  - Only after confirmation can the checkbox be enabled/selected

### 3. Data to Track
- **Client ID/Email:** Which client received it
- **Date/Timestamp:** When it was sent (date and time)
- **Sent By:** BA name/email who sent it (optional but recommended for audit)

### 4. Features NOT in this version
- **Unsend option:** Not included in this version
- **Resend after unsend:** Not applicable (no unsend)

---

## Implementation Notes

1. Update GHL Custom Object to include tracking field(s)
2. Update Portal to read tracking data and display appropriately
3. Update Make.com scenario to record send events
4. Update Portal UI to show sent status and handle re-send confirmation
5. Update GHL webhook/data flow to include tracking information

---

## Questions to Resolve

1. Exact field structure (JSON array vs. separate fields?)
2. Should we track multiple sends to same client? (e.g., sent on Date1, sent again on Date2)
3. Should we track send status per BA? (e.g., BA1 sent to ClientA, BA2 also sends to ClientA)
4. Portal UI design for "sent" indication (exact styling/placement)

---

## Priority

**After completing:**
1. ✅ Contradictions review (DONE)
2. Create "Contract Type" inferred field
3. Map Contract Type through Make.com scenarios
4. Update GHL webhooks
5. Test email formatting
6. **Then:** Implement client tracking

---
