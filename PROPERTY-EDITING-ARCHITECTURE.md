# Property Editing Architecture

## Overview
This document outlines the architecture for editing properties after they've been entered, with special consideration for calculated/derived fields.

## Calculated Fields Identified

### 1. **Current Yield** (`rentalAssessment.yield`)
- **Formula:** `(Current Rent × 52 / Property Price) × 100`
- **Dependencies:**
  - `rentalAssessment.currentRentPrimary` (required)
  - `rentalAssessment.currentRentSecondary` (if dual occupancy)
  - `purchasePrice.acceptableAcquisitionTo` (for Property Price)
  - `rentalAssessment.occupancy` (must be "Tenanted")
- **Stored Format:** `~ X.XX%` (e.g., `~ 5.20%`)
- **Location:** `Step2PropertyDetails.tsx` lines 111-139

### 2. **Appraised Yield** (`rentalAssessment.appraisedYield`)
- **Formula:** `(Rent Appraisal To × 52 / Property Price) × 100`
- **Dependencies:**
  - `rentalAssessment.rentAppraisalPrimaryTo` (required)
  - `rentalAssessment.rentAppraisalSecondaryTo` (if dual occupancy)
  - `purchasePrice.acceptableAcquisitionTo` (for Property Price)
- **Stored Format:** `~ X.XX%` (e.g., `~ 10.40%`)
- **Location:** `Step2PropertyDetails.tsx` lines 142-169

### 3. **Property Price** (derived, not stored)
- **For Established:** Uses `purchasePrice.acceptableAcquisitionTo`
- **For H&L:** Uses `purchasePrice.landPrice + purchasePrice.buildPrice`
- **Dependencies:**
  - `decisionTree.propertyType` (determines calculation method)
  - `purchasePrice.acceptableAcquisitionTo` OR
  - `purchasePrice.landPrice` + `purchasePrice.buildPrice`
- **Location:** `Step2PropertyDetails.tsx` lines 98-106

## Recommended Architecture

### Option 1: Edit Mode in Same Form (Recommended)
**Pros:**
- Reuse existing form components
- Calculations automatically work
- Single codebase to maintain

**Implementation:**
1. Add `editMode: boolean` and `propertyId: string | null` to form store
2. Add API endpoint to fetch existing property data from GHL
3. Load property data into form store when in edit mode
4. Calculations will automatically recalculate when dependencies change
5. Submit updates existing property instead of creating new

**File Structure:**
```
src/
  app/
    properties/
      [id]/
        edit/
          page.tsx          # Edit route
    page.tsx                # New property route
  components/
    MultiStepForm.tsx        # Add editMode prop
    steps/
      Step2PropertyDetails.tsx  # Calculations already handle changes
  lib/
    ghl.ts                  # GHL API client (new)
      - getProperty(id)
      - updateProperty(id, data)
      - createProperty(data)
```

### Option 2: Separate Edit Interface
**Pros:**
- Clear separation of concerns
- Can optimize for editing workflow

**Cons:**
- Code duplication
- Must maintain calculation logic in two places

## Handling Calculated Fields

### Strategy 1: Always Recalculate (Recommended)
**Approach:** Never store calculated values in GHL. Always recalculate on form load and when dependencies change.

**Benefits:**
- Single source of truth (formula)
- Always accurate
- No sync issues

**Implementation:**
```typescript
// In Step2PropertyDetails.tsx - already implemented
const currentYield = useMemo(() => {
  // Recalculates automatically when dependencies change
}, [dependencies]);

// When loading from GHL in edit mode:
// 1. Load raw data (rent, price, etc.)
// 2. Don't load yield values
// 3. Calculations will automatically compute them
```

### Strategy 2: Store Calculated Values
**Approach:** Store calculated values in GHL, but mark them as "calculated" and provide recalculate button.

**Benefits:**
- Can see values even if calculation fails
- Faster display (no calculation needed)

**Cons:**
- Risk of stale data
- Must handle recalculation manually

**Implementation:**
```typescript
// Add to form store
interface FormStore {
  // ... existing fields
  calculatedFields: {
    currentYield: string | null;
    appraisedYield: string | null;
    lastCalculated: Date | null;
  };
  recalculateYields: () => void;
}

// Add "Recalculate" button in UI
<button onClick={recalculateYields}>
  Recalculate Yields
</button>
```

## Recommended Approach: Hybrid

1. **In Form:** Always recalculate (already implemented)
2. **In GHL:** Store calculated values for display/search, but mark as "auto-calculated"
3. **On Edit Load:** 
   - Load raw data from GHL
   - Ignore stored yield values
   - Let form recalculate automatically
4. **On Submit:** Send both raw data AND calculated values to GHL

## Fields Requiring Special Consideration

### 1. **Decision Tree Fields**
- Changing `propertyType` affects which fields are shown
- Changing `lotType` affects lot details
- Changing `dualOccupancy` affects secondary fields

**Handling:** Form already handles conditional rendering. In edit mode, ensure all relevant fields load correctly.

### 2. **Address Fields**
- Address verification state
- Parsed address components
- Google Maps coordinates

**Handling:** When editing, allow re-verification or manual editing.

### 3. **Currency Fields**
- Stored as formatted strings (`$640,000`) or raw numbers?
- Need consistent parsing/formatting

**Handling:** Store raw values in GHL, format in UI (already implemented).

### 4. **Date/Expiry Fields**
- Stored as "October 2025" or separate month/year?
- TBC checkbox state

**Handling:** Store formatted string in GHL, parse on load (already implemented).

### 5. **Conditional Fields**
- Body Corp fields (only if Title contains "strata" or "owners corp")
- Secondary fields (only if dual occupancy)
- Lot details (only if Multiple lots)

**Handling:** Form already handles conditional rendering. Ensure edit mode loads all relevant data.

## Implementation Steps

### Phase 1: Prepare Form Store
```typescript
// Add to formStore.ts
interface FormStore {
  // ... existing fields
  editMode: boolean;
  propertyId: string | null;
  loadPropertyData: (id: string) => Promise<void>;
  setEditMode: (mode: boolean, id?: string) => void;
}
```

### Phase 2: Create GHL API Client
```typescript
// src/lib/ghl.ts
export const ghlApi = {
  async getProperty(id: string): Promise<FormData> {
    // Fetch from GHL API
    // Parse and return FormData structure
  },
  
  async updateProperty(id: string, data: FormData): Promise<void> {
    // Update property in GHL
    // Include calculated fields in payload
  },
  
  async createProperty(data: FormData): Promise<string> {
    // Create new property in GHL
    // Return property ID
  }
};
```

### Phase 3: Add Edit Route
```typescript
// src/app/properties/[id]/edit/page.tsx
export default function EditPropertyPage({ params }: { params: { id: string } }) {
  const { loadPropertyData, setEditMode } = useFormStore();
  
  useEffect(() => {
    setEditMode(true, params.id);
    loadPropertyData(params.id);
  }, [params.id]);
  
  return <MultiStepForm />;
}
```

### Phase 4: Update Submit Logic
```typescript
// In Step4Review.tsx or form submission handler
const handleSubmit = async () => {
  const { formData, editMode, propertyId } = useFormStore.getState();
  
  // Recalculate yields before submit (ensure latest)
  // ... calculation logic ...
  
  if (editMode && propertyId) {
    await ghlApi.updateProperty(propertyId, formData);
  } else {
    await ghlApi.createProperty(formData);
  }
};
```

## Best Practices

1. **Never Trust Stored Calculated Values**
   - Always recalculate on form load
   - Recalculate when dependencies change
   - Store calculated values for reference, but don't rely on them

2. **Handle Missing Dependencies Gracefully**
   - If Property Price is missing, show placeholder
   - If rent is missing, don't calculate yield
   - Show helpful error messages

3. **Maintain Calculation Logic in One Place**
   - Keep all calculations in `Step2PropertyDetails.tsx`
   - Use `useMemo` for performance
   - Use `useEffect` to sync to store

4. **Document Dependencies**
   - Comment calculation formulas
   - List all dependencies
   - Document edge cases (TBC, dual occupancy, etc.)

5. **Test Edge Cases**
   - Missing Property Price
   - TBC values
   - Dual occupancy calculations
   - Currency formatting
   - Navigation away and back

## Future Considerations

1. **Audit Trail:** Track when calculated fields change and why
2. **Manual Override:** Allow manual entry of yields with "lock" option
3. **Bulk Updates:** Recalculate yields for multiple properties
4. **Validation:** Warn if calculated yield differs significantly from stored value
5. **History:** Show yield history over time






