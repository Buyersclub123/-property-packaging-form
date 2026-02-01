# Project Cashflow Review - Planning Document

**Date:** 2026-01-28  
**Issue:** Page 8 (Cashflow Review) shows N/A values for projects because it doesn't know which lot to use for the data.

---

## Current Problem

When viewing Page 8 (Cashflow Review) for a **Project** (Multiple lots):
- **Total Cost**: Shows N/A
- **Total Bed**: Shows N/A
- **Total Bath**: Shows N/A
- **Total Garage**: Shows N/A
- **Rental Income (Low/High)**: Shows N/A
- **Other fields**: May also show N/A

**Root Cause:** 
- Page 8 currently reads from `formData.propertyDescription`, `formData.purchasePrice`, `formData.rentalAssessment`
- For projects, this data is stored per-lot in `formData.lots[]` array
- Each lot has its own `propertyDescription`, `purchasePrice`, and `rentalAssessment`
- Page 8 doesn't check if it's a project and doesn't aggregate or select lot data

---

## Current Code Structure

**Step7CashflowReview.tsx:**
- Line 43: Reads from `formData.propertyDescription`, `formData.purchasePrice`, `formData.rentalAssessment`
- Line 17: `isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple'`
- **No project detection or lot handling currently implemented**

**Data Structure:**
```typescript
// For projects, data is in:
formData.lots = [
  {
    lotNumber: "Lot 17",
    singleOrDual: "Yes",
    propertyDescription: { beds, bath, garage, landSize, buildSize, ... },
    purchasePrice: { landPrice, buildPrice, totalPrice, ... },
    rentalAssessment: { rentAppraisalFrom, rentAppraisalTo, ... }
  },
  {
    lotNumber: "Lot 18",
    singleOrDual: "No",
    propertyDescription: { ... },
    purchasePrice: { ... },
    rentalAssessment: { ... }
  }
]
```

---

## Options for Handling Projects on Page 8

### Option 1: Show Summary/Aggregate View (RECOMMENDED)
**Display aggregated data across all lots:**
- **Total Cost**: Sum of all lot costs, or show range (e.g., "$450,000 - $550,000")
- **Total Bed**: Sum of all beds across all lots, or show range
- **Total Bath**: Sum of all baths across all lots, or show range
- **Total Garage**: Sum of all garages across all lots, or show range
- **Rental Income**: Sum of all lot rents (low + high), or show range

**Pros:**
- Shows overall project picture
- Useful for project-level cashflow analysis
- Single view for all lots

**Cons:**
- May not be accurate if lots vary significantly
- Doesn't show individual lot details

---

### Option 2: Show First Lot Only
**Display data from the first lot in the array:**
- Use `formData.lots[0]` for all calculations
- Show a message: "Showing data for [Lot Number] (first lot in project)"

**Pros:**
- Simple implementation
- Shows actual values (not N/A)

**Cons:**
- Arbitrary selection (first lot may not be representative)
- Misleading if lots are different
- Doesn't reflect project as a whole

---

### Option 3: Lot Selector Dropdown
**Allow user to select which lot to view:**
- Add dropdown: "Select Lot to Review"
- Show cashflow data for selected lot only
- Allow switching between lots

**Pros:**
- Shows accurate data for specific lot
- User can review each lot individually
- Flexible

**Cons:**
- More complex UI
- Requires multiple reviews (one per lot)
- May not be needed if cashflow is project-level

---

### Option 4: Per-Lot Cashflow Review (Multiple Sections)
**Show separate cashflow section for each lot:**
- Collapsible sections: "Lot 17 Cashflow", "Lot 18 Cashflow", etc.
- Each section shows that lot's data
- All sections visible/expandable

**Pros:**
- Complete view of all lots
- Accurate per-lot data
- No data loss

**Cons:**
- Very long page for many lots
- More complex UI
- May be overwhelming

---

### Option 5: Project-Level Summary + Per-Lot Details
**Hybrid approach:**
- Top section: Project-level summary (aggregated or representative)
- Below: Collapsible per-lot sections for detailed review
- User can expand/collapse individual lots

**Pros:**
- Best of both worlds
- Overview + detail available
- Flexible viewing

**Cons:**
- Most complex to implement
- Longer page

---

## Recommendation

**Option 1: Show Summary/Aggregate View** with the following approach:

1. **Detect if project:** `isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple'`

2. **Aggregate lot data:**
   - **Total Cost**: Sum all lot costs (landPrice + buildPrice for split, or totalPrice for single)
   - **Total Bed**: Sum all beds across all lots
   - **Total Bath**: Sum all baths across all lots
   - **Total Garage**: Sum all garages across all lots
   - **Rental Income**: Sum all lot rents (low and high separately)

3. **Show project indicator:**
   - Add message: "Project Summary - Data aggregated across all [X] lots"
   - Or: "Showing aggregate data for [X] lots in this project"

4. **Keep editable fields:**
   - Council/Water Rates: Still editable (project-level)
   - Insurance Amount: Still editable (project-level)
   - Split Contract fields: Still editable if applicable

---

## Implementation Notes

**Files to Modify:**
- `src/components/steps/Step7CashflowReview.tsx`

**Key Changes:**
1. Add project detection: `const isProject = decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Multiple';`
2. Add aggregation functions for lot data
3. Update `calculateTotalCost()`, `calculateRent()`, etc. to handle projects
4. Update display to show aggregated values instead of N/A

**Data Access:**
- `formData.lots` - array of lot objects
- Each lot: `lot.propertyDescription`, `lot.purchasePrice`, `lot.rentalAssessment`

---

## Known Issues

### Make.com Scenario 02b Error
**Error:** Projects cause an error in Make.com scenario 02b:
```
Bad Request
- {"message":"Invalid field value '\"760000\"' for 'net_price'","error":"Bad Request","statusCode":400,"traceId":"8cab0a8d-6284-492c-806c-88b0757a0890"}
```

**Root Cause:** 
- The `net_price` field is being sent as a string `"760000"` (with quotes) instead of a number `760000`
- Make.com expects numeric values, not string values

**Impact:**
- Project submissions fail when sending to Make.com
- Need to ensure numeric fields are sent as numbers, not strings

**Fix Required:**
- Check API endpoint that sends form data to Make.com
- Ensure numeric fields (net_price, totalPrice, landPrice, buildPrice, etc.) are converted to numbers before sending
- May need to parse/convert string values to numbers in the API payload

---

## Questions to Resolve

1. **Should cashflow be project-level or per-lot?**
   - If project-level: Use aggregate/sum approach
   - If per-lot: Need lot selector or per-lot sections

2. **How should split contract fields work for projects?**
   - Same build window for all lots?
   - Per-lot cashback months?

3. **Should folder creation be per-lot or project-level?**
   - Currently creates one folder - is this correct?

4. **Should the cashflow spreadsheet be per-lot or project-level?**
   - One spreadsheet with all lots?
   - Separate spreadsheet per lot?

5. **Make.com API Data Format:**
   - Fix numeric field formatting (net_price and other numeric fields)
   - Ensure all numeric values are sent as numbers, not strings
   - Test with project submissions

---

## Next Steps

1. ✅ Document current issue and options
2. ⏳ User to test and provide feedback
3. ⏳ Decide on approach (Option 1 recommended)
4. ⏳ Implement solution
5. ⏳ Test with real project data
