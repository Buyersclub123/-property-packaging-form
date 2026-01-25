# Full Decision Tree Matrix

**Date:** 2026-01-15  
**Purpose:** Comprehensive matrix showing how Property Type, Lot Type, Contract Type, and Dual Occupancy combine to determine field display and behavior.

**Based on:** Form logic in `Step2PropertyDetails.tsx` and `Step1DecisionTree.tsx`

---

## Decision Tree Structure

The form uses a hierarchical decision tree:

1. **Property Type** (New vs Established)
2. **If New:** Lot Type (Individual/H&L vs Multiple/Project)
3. **If New + Individual OR Established:** Dual Occupancy (Yes/No)
4. **Contract Type** (01-05, affects Purchase Price structure)

---

## Key Relationships

### Property Type + Lot Type
- **New + Individual** = H&L (House & Land)
- **New + Multiple** = Project (Multiple lots)
- **Established** = No lot type (single property)

### Dual Occupancy
- **Shown for:** H&L (New + Individual) OR Established
- **NOT shown for:** Projects (each lot has its own `singleOrDual` field)
- **Affects:** Property Description (secondary fields), Rental Assessment (per unit display)

### Contract Type
- **01_hl_comms, 03_internal_with_comms, 04_internal_nocomms:** Use Land + Build Price structure
- **02_single_comms:** Uses Total Price structure
- **01, 02, 03:** Show Cashback/Rebate fields
- **04, 05:** Hide Cashback/Rebate fields
- **05_established:** Only for Established properties

---

## Property Description Matrix

| Property Type | Lot Type | Contract Type | Dual Occupancy | Secondary Fields | Built Field | Land Registration |
|---------------|----------|---------------|----------------|------------------|-------------|-------------------|
| New | Individual | 01/02/03/04 | No | ❌ | `build_size` | ❌ |
| New | Individual | 01/02/03/04 | Yes | ✅ | `build_size` | ❌ |
| New | Multiple | 01/02/03/04 | N/A* | Per Lot | `build_size` | ❌ |
| Established | N/A | 05 | No | ❌ | `year_built` | ✅ |
| Established | N/A | 05 | Yes | ✅ | `year_built` | ✅ |

\* Projects: Each lot has its own `singleOrDual` field, not a project-level dual occupancy

**Secondary Fields:** `bedsSecondary`, `bathSecondary`, `garageSecondary`, `carportSecondary`, `carspaceSecondary`

---

## Purchase Price Matrix

| Property Type | Lot Type | Contract Type | Land + Build | Total Price | Cashback/Rebate | Net Price | Acceptable Acquisition |
|---------------|----------|---------------|--------------|-------------|-----------------|-----------|------------------------|
| New | Individual | 01_hl_comms | ✅ | ❌ (calc) | ✅ | ✅ (if Cashback) | ❌ |
| New | Individual | 02_single_comms | ❌ | ✅ | ✅ | ✅ (if Cashback) | ❌ |
| New | Individual | 03_internal_with_comms | ✅ | ❌ (calc) | ✅ | ✅ (if Cashback) | ❌ |
| New | Individual | 04_internal_nocomms | ✅ | ❌ (calc) | ❌ | ❌ | ❌ |
| New | Multiple | 01/02/03/04 | Per Lot | Per Lot | Per Lot | Per Lot | ❌ |
| Established | N/A | 05_established | ❌ | ❌ | ❌ | ❌ | ✅ |

**Notes:**
- **Land + Build:** Shown for Contract Types 01, 03, 04 (H&L structure)
- **Total Price:** Shown for Contract Type 02 (Single Contract)
- **Cashback/Rebate:** Shown for Contract Types 01, 02, 03
- **Net Price:** Calculated only if Cashback type selected (not Rebate)
- **Projects:** Each lot has its own purchase price structure

---

## Rental Assessment Matrix

| Property Type | Lot Type | Contract Type | Dual Occupancy | Occupancy | Current Rent | Expiry | Current Yield | Appraisal | Appraised Yield |
|---------------|----------|---------------|----------------|-----------|--------------|--------|---------------|-----------|-----------------|
| New | Individual | 01/02/03/04 | No | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| New | Individual | 01/02/03/04 | Yes | ❌ | ❌ | ❌ | ❌ | ✅ (both) | ✅ |
| New | Multiple | 01/02/03/04 | N/A* | ❌ | ❌ | ❌ | ❌ | Per Lot | Per Lot |
| Established | N/A | 05 | No | ✅ | ✅ (if tenanted) | ✅ (if tenanted) | ✅ (if tenanted) | ✅ | ✅ |
| Established | N/A | 05 | Yes | ✅ (both) | ✅ (if tenanted) | ✅ (if tenanted) | ✅ (if tenanted) | ✅ (both) | ✅ |

\* Projects: Each lot has its own `singleOrDual` field

**Key Rules:**
- **New Properties:** Never show Occupancy, Current Rent, Expiry, Current Yield (no tenants)
- **Established Properties:** Show Occupancy always, Current Rent/Expiry/Yield only if tenanted
- **Dual Occupancy:** Shows per-unit breakdown for all fields

---

## Other Fields to Consider

### Status (`status`)
- **Values:** `01_available`, `02_eoi`, `03_contr_exchanged`, `05_remove_no_interest`, `06_remove_lost`
- **Affects:** Deal Sheet workflow, not email template display
- **Recommendation:** Include in decision matrix if it affects email content

### Address Fields
- **Property Address:** Always shown
- **Project Address:** Only for Projects (New + Multiple)
- **Lot Number/Unit Number:** Only for H&L/Established with specific addressing

### Risk Overlays
- **Independent of decision tree:** Always shown regardless of property type
- **Dialogue fields:** Conditional on overlay value (Yes/No)

### Market Performance
- **Independent of decision tree:** Always shown if data exists

### Content Sections (Why this Property, Proximity, Investment Highlights)
- **Independent of decision tree:** Always shown

---

## Recommendations

1. **Status Field:** Should we include `status` in the decision matrix? It may affect email subject line prefixes but not field display.

2. **Project-Specific Logic:** Projects have unique behavior:
   - Each lot has its own `singleOrDual` field
   - Each lot has its own Property Description, Purchase Price, Rental Assessment
   - Project-level fields: Project Name, Project Address

3. **Email Template Mapping:**
   - Current `MODULE-3-COMPLETE-FOR-MAKE.js` uses `property_type`, `deal_type`, `template_type`, `is_parent_record`
   - Need to map form's decision tree to these GHL fields
   - Contract Type (`contractType`) maps to `deal_type` in GHL

4. **Missing Logic in Email Template:**
   - Cashback/Rebate display (not currently shown)
   - Land + Build vs Total Price differentiation (not currently shown)
   - Net Price calculation (not currently shown)

---

## Form Logic References

**Key Variables:**
```typescript
const isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple';
const isHAndL = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Individual';
const isEstablished = decisionTree.propertyType === 'Established';
const isDualOccupancy = decisionTree.dualOccupancy === 'Yes';
const hasCashbackRebate = decisionTree.contractType === '01_hl_comms' || 
                          decisionTree.contractType === '02_single_comms' || 
                          decisionTree.contractType === '03_internal_with_comms';
const isSingleContract = decisionTree.contractType === '02_single_comms';
```

**Location:** `Step2PropertyDetails.tsx` lines 101-112
