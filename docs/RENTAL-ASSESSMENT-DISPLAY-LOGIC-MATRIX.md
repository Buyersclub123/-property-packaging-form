# Rental Assessment Display Logic Matrix

**Date:** 2026-01-12  
**Purpose:** Document the logic for displaying Rental Assessment fields in email templates based on form behavior  
**Source:** Analysis of `Step2PropertyDetails.tsx` and `MultiStepForm.tsx` validation logic

---

## Form Logic Analysis

### Occupancy Values (from form)
Based on `Step2PropertyDetails.tsx` lines 1249-1252, 1279-1282, 1311-1314:
- `"owner_occupied"` - Owner Occupied
- `"tenanted"` - Tenanted  
- `"vacant"` - Vacant
- `"tbc"` - TBC

### Form Behavior (from code analysis)

**Key Findings:**
1. **Current Rent & Expiry fields** (lines 1321-1673):
   - Only displayed/required when `occupancyPrimary === 'tenanted'` (line 1588, 1474, 1598, 1484)
   - When occupancy changes away from 'tenanted', these fields are cleared (lines 1234-1240, 1294-1302)

2. **Current Yield** (lines 258-351):
   - Only calculated/displayed when at least one unit is 'tenanted'
   - Cleared when no units are 'tenanted'

3. **Validation** (from `MultiStepForm.tsx` lines 588-604):
   - If `occupancyPrimary === 'tenanted'`, then `currentRentPrimary` and `expiryPrimary` are REQUIRED
   - If occupancy is NOT 'tenanted', these fields are not required

---

## Display Logic Matrix for Email Templates

### Single Occupancy Properties

| Occupancy Value | Show Occupancy? | Show Current Rent? | Show Expiry? | Show Current Yield? | Show Appraisal? | Show Appraised Yield? |
|----------------|-----------------|-------------------|--------------|---------------------|-----------------|----------------------|
| `"owner_occupied"` | ✅ **YES** | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |
| `"tenanted"` | ✅ **YES** | ✅ **YES** (if value exists) | ✅ **YES** (if value exists) | ✅ **YES** (if value exists) | ✅ **YES** | ✅ **YES** |
| `"vacant"` | ✅ **YES** | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |
| `"tbc"` | ✅ **YES** | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |

### Dual Occupancy Properties

| Unit A Occupancy | Unit B Occupancy | Show Occupancy? | Show Current Rent? | Show Expiry? | Show Current Yield? | Show Appraisal? | Show Appraised Yield? |
|-----------------|------------------|-----------------|-------------------|--------------|---------------------|-----------------|----------------------|
| `"owner_occupied"` | `"owner_occupied"` | ✅ **YES** (both) | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |
| `"owner_occupied"` | `"tenanted"` | ✅ **YES** (both) | ✅ **YES** (Unit B only) | ✅ **YES** (Unit B only) | ✅ **YES** (if Unit B has rent) | ✅ **YES** | ✅ **YES** |
| `"owner_occupied"` | `"vacant"` | ✅ **YES** (both) | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |
| `"tenanted"` | `"tenanted"` | ✅ **YES** (both) | ✅ **YES** (both units) | ✅ **YES** (both units) | ✅ **YES** (combined) | ✅ **YES** | ✅ **YES** |
| `"tenanted"` | `"vacant"` | ✅ **YES** (both) | ✅ **YES** (Unit A only) | ✅ **YES** (Unit A only) | ✅ **YES** (Unit A only) | ✅ **YES** | ✅ **YES** |
| `"vacant"` | `"vacant"` | ✅ **YES** (both) | ❌ **NO** | ❌ **NO** | ❌ **NO** | ✅ **YES** | ✅ **YES** |

---

## Implementation Rules for Make.com Module 3

### Detection Logic

```javascript
// Read occupancy value
const occupancy = v("occupancy"); // For single occupancy
const occupancyPrimary = v("occupancy_primary"); // For dual occupancy
const occupancySecondary = v("occupancy_secondary"); // For dual occupancy

// Normalize to lowercase for comparison
const occLower = occupancy ? occupancy.toLowerCase() : "";
const occPrimaryLower = occupancyPrimary ? occupancyPrimary.toLowerCase() : "";
const occSecondaryLower = occupancySecondary ? occupancySecondary.toLowerCase() : "";

// Determine status
const isTenanted = occLower === "tenanted";
const isOwnerOccupied = occLower === "owner_occupied" || occLower.includes("owner");
const isVacant = occLower === "vacant" || occLower.includes("vacant");
const isTBC = occLower === "tbc";
```

### Display Rules

#### For Single Occupancy:

1. **Occupancy**: Always show if `occupancy` field exists
2. **Current Rent**: Show ONLY if `occupancy === "tenanted"` AND `currentRentPrimary` exists
3. **Expiry**: Show ONLY if `occupancy === "tenanted"` AND `expiryPrimary` exists
4. **Current Yield**: Show ONLY if `occupancy === "tenanted"` AND `yield` exists
5. **Appraisal**: Always show if `rentAppraisalPrimaryFrom/To` exist
6. **Appraised Yield**: Always show if `appraisedYield` exists

#### For Dual Occupancy:

1. **Occupancy**: Always show both units if `occupancyPrimary` and `occupancySecondary` exist
2. **Current Rent**: 
   - Show Unit A ONLY if `occupancyPrimary === "tenanted"` AND `currentRentPrimary` exists
   - Show Unit B ONLY if `occupancySecondary === "tenanted"` AND `currentRentSecondary` exists
   - Show Total if at least one unit is tenanted
3. **Expiry**:
   - Show Unit A ONLY if `occupancyPrimary === "tenanted"` AND `expiryPrimary` exists
   - Show Unit B ONLY if `occupancySecondary === "tenanted"` AND `expirySecondary` exists
4. **Current Yield**: Show ONLY if at least one unit is `"tenanted"` AND `yield` exists
5. **Appraisal**: Always show (both units + total)
6. **Appraised Yield**: Always show if `appraisedYield` exists

---

## Current Issue

**Problem:** Email template is showing "Current Rent: $0 per week" for owner-occupied properties.

**Root Cause:** The code is checking `if (currentRentPrimary && !isVacant && !isOwnerOccupied)` but:
1. `currentRentPrimary` might be "0" (which is truthy)
2. The check `occLower.includes("owner")` might not match exact value `"owner_occupied"`

**Solution:** 
1. Check for exact match: `occupancy === "tenanted"` (not just "not vacant and not owner")
2. Don't show Current Rent if value is "0" or empty
3. Always show Occupancy field

---

## Recommended Code Changes

### For Single Occupancy:

```javascript
// Always show Occupancy
if (occupancy) {
  rentalHtml += htmlLine("Occupancy", occupancy);
}

// Only show Current Rent, Expiry, Current Yield if tenanted
const isTenanted = occupancy && occupancy.toLowerCase() === "tenanted";
if (isTenanted && currentRentPrimary && currentRentPrimary !== "0") {
  rentalHtml += htmlLine("Current Rent", formatCurrentRent(currentRentPrimary));
}
if (isTenanted && expiryPrimary) {
  rentalHtml += htmlLine("Expiry", expiryPrimary);
}
if (isTenanted && yieldPct) {
  rentalHtml += htmlLine("Current Yield", yieldPct);
}

// Always show Appraisal and Appraised Yield
if (appraisalRange) {
  rentalHtml += htmlLine("Appraisal", appraisalRange);
}
if (appraisedYield) {
  rentalHtml += htmlLine("Appraised Yield", appraisedYield);
}
```

---

## Notes

- The form uses exact string matching: `occupancyPrimary === 'tenanted'`
- The form clears Current Rent/Expiry when occupancy changes away from 'tenanted'
- Current Yield is only calculated when at least one unit is 'tenanted'
- Appraisal and Appraised Yield are always shown regardless of occupancy status
