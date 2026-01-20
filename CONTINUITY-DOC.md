# Property Review System - Where We Left Off

**Last Updated:** 2026-01-01  
**What We're Working On:** Step 0 - Address & Risk Check Form

---

## 🎯 What's Working Right Now

### The Address Form
- You can enter an address and click "Check Stash" to get risk overlays
- The system validates the address and fixes spelling/capitalization automatically
- It populates all the individual address fields (street number, street name, suburb, state, postcode)
- It gets LGA (Local Government Area) from Stash
- It shows risk overlays: Flood, Bushfire, Zoning

### New Development Feature
- There's a checkbox "New Development / Project Site"
- When ticked, it shows TWO address sections:
  1. **Project Address** - Used for risk overlays and email template (can be approximate)
  2. **Property Address for GHL Records** - The actual property address (not shown to clients)
- The Project Address auto-combines into a single field showing how it appears in emails
- There's a "Lookup LGA" button that finds the LGA and also fills in missing postcodes
- **Important:** Shows a message that lot numbers will be detailed in Property Details step (Step 2)
- **Note:** Lot Number field is NOT in Property Address for GHL section - lots will be handled in Step 2

### Field Protection
- Address fields are locked by default (read-only) to keep data quality
- You can unlock them by:
  - Ticking the "New Development" checkbox, OR
  - Clicking "Edit Address Fields" button
- When fields are locked and verified, you see a "✓ Verified" badge

### Clearing & Resetting
- "Clear Form" button clears everything (with confirmation)
- Unticking the "New Development" checkbox clears the Property Address section
- Lot numbers clear properly when clearing or unticking

---

## 📍 Where We Are

**Current Step:** Step 0 - Address & Risk Check  
**Status:** Working well, ready for testing

**What's Done:**
- ✅ Address validation and geocoding
- ✅ Stash API integration for risk overlays
- ✅ Two-address system for new developments
- ✅ LGA lookup with postcode population
- ✅ Field editing controls
- ✅ Form clearing functionality

**What's Next:**
- Test everything end-to-end
- Move to next form steps (Property Details, Market Performance, etc.)
- **Property Details Step (Step 2):** Implement multi-lot functionality where users can add multiple lots, each with:
  - Lot Number
  - Land Size
  - Build Size
  - Format
  - Land Cost
  - Build Cost
  - Each lot becomes its own Custom Object entry and Google Sheet row
  - All lots can appear in one email

---

## 🔄 How It Works

### When You Click "Check Stash":
1. System validates your address
2. Fixes capitalization (e.g., "maroochydore" → "Maroochydore")
3. Gets risk overlays from Stash
4. Populates LGA, State, Zoning, Flood, Bushfire
5. Creates Google Maps link
6. Locks the fields (shows "✓ Verified")

### When You Tick "New Development":
1. Shows Project Address section (in a box)
2. Shows Property Address for GHL section (below)
3. Unlocks all fields for editing
4. Shows warning about manually checking overlays
5. Shows info message: "Since this is a project, it is assumed there are multiple Lot numbers. The various Lot numbers will be detailed in subsequent steps (Property Details)."
6. **Note:** Lot Number field is NOT shown - lots will be collected in Property Details step

### When You Click "Lookup LGA":
1. Tries to find LGA from Stash (if you already ran "Check Stash")
2. If not found, calls Stash API with suburb/state
3. If still not found, tries Geoscape API
4. Also fills in missing postcode automatically
5. Fixes suburb capitalization

---

## 🐛 Issues We Fixed

- ✅ Postcode wasn't populating when clicking "Lookup LGA" → Fixed (now tries multiple sources)
- ✅ Lot numbers weren't clearing → Fixed (clears on form clear and checkbox untick)
- ✅ Fields were editable when they shouldn't be → Fixed (read-only by default)

---

## 📝 Important Decisions We Made

1. **Single Project Address Field**
   - The form shows individual fields for editing/validation
   - But stores it as one `projectAddress` field (how it appears in emails)
   - This avoids duplicate field names in the data

2. **One Shared LGA Field**
   - There's only one LGA field (not duplicated)
   - Used for both Project Address and Property Address

3. **Read-Only by Default**
   - Fields lock after verification to keep data quality
   - You can unlock them when needed (new development or edit button)

---

## 🚀 When You Come Back

### First, Test What We Built:
1. Enter an address → Click "Check Stash" → See if everything populates
2. Tick "New Development" → See if both address sections appear
3. Enter suburb/state → Click "Lookup LGA" → See if postcode fills in
4. Click "Clear Form" → See if everything clears
5. Tick/untick checkbox → See if sections show/hide and data clears

### Then We Can:
- Fix any issues you find
- Move to the next form steps
- Add features for multiple lots
- Create a testing checklist

---

## 💡 Things to Remember

- **Geoscape API** doesn't return LGA for suburb-only queries - we use Stash API for that
- **Project Address** can be approximate (for risk overlays)
- **Property Address** must be accurate (for GHL records)
- **Fields lock after verification** - click "Edit Address Fields" to unlock

---

## 📞 If Something Goes Wrong

1. Check this document to see where we left off
2. Test the form to see what's working
3. Check the browser console (F12) for any errors
4. Look at the code comments - we added version notes

---

**Bottom Line:** The address form is working well. We've got the two-address system, LGA lookup, field protection, and clearing all sorted. Ready to test and move forward!
