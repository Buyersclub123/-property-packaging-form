# Tri-plus Field Analysis

## Context
- Tri-plus is for **Established properties only** (Projects already covers New)
- Dwelling Type: Multi-dwelling or Block of Units
- One GHL record, one email
- Per-dwelling data stored as **JSON in a GHL text field**

## Field Inventory

| # | Field | Current Level (Established) | Tri-plus Level | Status | Notes |
|---|---|---|---|---|---|
| **PROPERTY DESCRIPTION** | | | | | |
| 1 | Beds (Primary) | Property | Per-dwelling | IN | |
| 2 | Beds (Secondary) | Property (if dual) | OUT | OUT | No dual occupancy within a dwelling for Tri-plus |
| 3 | Bath (Primary) | Property | Per-dwelling | IN | |
| 4 | Bath (Secondary) | Property (if dual) | OUT | OUT | Same as Beds Secondary |
| 5 | Garage (Primary) | Property | Per-dwelling | IN | |
| 6 | Garage (Secondary) | Property (if dual) | OUT | OUT | Same as above |
| 7 | Carport (Primary) | Property | Per-dwelling | IN | |
| 8 | Carport (Secondary) | Property (if dual) | OUT | OUT | Same as above |
| 9 | Car Spaces (Primary) | Property | Per-dwelling | IN | |
| 10 | Car Spaces (Secondary) | Property (if dual) | OUT | OUT | Same as above |
| 11 | Unit Number | N/A (new) | Per-dwelling | IN | Replaces Lot Number from Projects |
| 12 | Year Built | Property | Property | IN | Shared across all dwellings |
| 13 | Land Size (m²) | Property | Property | IN | One land parcel |
| 14 | Build Size (m²) | H&L only | N/A | OUT | Not relevant for Established |
| 15 | Title | Property | Property | IN | One title for the property |
| 16 | Body Corp Per Quarter ($) | Property (if strata) | Property (if strata) | IN | Block of Units will likely be strata |
| 17 | Body Corp Description | Property (if strata) | Property (if strata) | IN | |
| 18 | Land Registration | H&L/Project only | N/A | OUT | Not relevant for Established |
| 19 | Property Description Additional Dialogue | Property | Property | IN | Shared |
| **PURCHASE PRICE** | | | | | |
| 20 | Asking | Property | Property | IN | Established-only field |
| 21 | Asking Text | Property | Property | IN | Established-only field |
| 22 | Comparable Sales | Property | Property | IN | Shared |
| 23 | Acceptable Acquisition From ($) | Property | Property | IN | One price range for whole property |
| 24 | Acceptable Acquisition To ($) | Property | Property | IN | One price range for whole property |
| 25 | Cashback/Rebate Type | Property (if 03) | Property (if 03) | IN | |
| 26 | Cashback/Rebate Value ($) | Property (if 03) | Property (if 03) | IN | |
| 27 | Net Price | Property (auto-calc) | N/A | OUT | Only for H&L with cashback |
| 28 | Land Price ($) | H&L only | N/A | OUT | Not relevant for Established |
| 29 | Build Price ($) | H&L only | N/A | OUT | Not relevant for Established |
| 30 | Total Price ($) | H&L (Single Contract) | N/A | OUT | Not relevant for Established |
| 31 | Purchase Price Additional Dialogue | Property | Property | IN | Shared |
| **RENTAL ASSESSMENT** | | | | | |
| 32 | Occupancy (Tenanted/Vacant/etc.) | Property (Primary/Secondary) | Per-dwelling | RECOMMENDATION | Each dwelling could have different occupancy |
| 33 | Current Rent ($ per week) | Property (if tenanted) | Per-dwelling | RECOMMENDATION | Follows occupancy per dwelling |
| 34 | Expiry | Property (if tenanted) | Per-dwelling | RECOMMENDATION | Each lease has its own expiry |
| 35 | Rent Appraisal From ($ per week) | Property (Primary/Secondary) | Per-dwelling | IN | |
| 36 | Rent Appraisal To ($ per week) | Property (Primary/Secondary) | Per-dwelling | IN | |
| 37 | Appraised Yield (%) | Property (auto-calc) | Property (auto-calc) | IN | Combined rent across dwellings vs property price |
| 38 | Current Yield (%) | Property (auto-calc) | Property (auto-calc) | IN | Combined current rent vs property price |
| 39 | Price Group | Property (auto-calc) | Property (auto-calc) | IN | Based on Acceptable Acquisition To |
| 40 | Rental Assessment Additional Dialogue | Property | Property | IN | Shared |
| **NEW FIELDS** | | | | | |
| 41 | How many units/dwellings? | N/A (new) | Property | IN | Selector like "How many Lots?" for Projects |

## Summary

- **IN (property-level)**: 19 fields — shared across all dwellings
- **IN (per-dwelling)**: 8 fields — Beds, Bath, Garage, Carport, Car Space, Unit Number, Rent Appraisal From, Rent Appraisal To
- **RECOMMENDATION (per-dwelling)**: 3 fields — Occupancy, Current Rent, Expiry (each dwelling may differ)
- **OUT**: 11 fields — Secondary fields (replaced by per-dwelling), H&L-only fields, not applicable
