# GHL Webhook Fields Required for Email Template

**Date:** 2026-01-12
**Purpose:** List of fields that need to be included in GHL workflow webhook payload for email template generation

---

## Address Section
- `property_address` - Full property address (includes Lot/Unit if applicable)
- `google_map` - Google Maps link

**Note:** Individual address component fields (street_number, street_name, suburb_name, state, post_code, unit__lot) are NOT needed for email - they're only used to build property_address in the form.

---

## Dialogue Fields for Email Template

### Property Overlays Section
**Inline dialogue fields (appears as "Risk: Yes/No – dialogue text"):**
- `flood_dialogue`
- `bushfire_dialogue`
- `mining_dialogie` (note: typo in field name)
- `other_overlay_dialogue`
- `special_infrastructure_dialogue`

### Additional Dialogue Fields (appears at bottom of section, not bulleted)
- `property_description_additional_dialogue` - Property Description section
- `purchase_price_additional_dialogue` - Purchase Price section
- `rental_assessment_additional_dialogue` - Rental Assessment section
- `market_performance_additional_dialogue` - Market Performance section
- `attachments_additional_dialogue` - Attachments section

---

## Sections That Do NOT Have Dialogue Fields
- Why This Property - no dialogue field
- Proximity - no dialogue field
- Investment Highlights - no dialogue field
- Address - no dialogue field

---

## Formatting Rules

### Property Overlays Dialogue Format
- Format: `Risk Name: Yes/No – [dialogue text]` (inline on same line)
- If no dialogue: `Risk Name: Yes/No`
- Due Diligence Acceptance appears on separate line below (no dialogue field)

### Additional Dialogue Fields Format
- Appears at bottom of section
- Not bulleted (plain text in `<p>` tag)
- Example: Rental Assessment dialogue appears below all rental fields
