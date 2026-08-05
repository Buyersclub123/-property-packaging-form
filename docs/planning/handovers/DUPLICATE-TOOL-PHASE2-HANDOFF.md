# Duplicate Tool — Phase 2 Handoff: Live GHL Integration

## Current State (Phase 1 — Complete)

The duplicate tool lives at `src/app/admin/duplicate/page.tsx` and currently uses **mock data** (`MOCK_SOURCE`). The UI is functional:

- **Page 1 (Step 0):** Side-by-side comparison for Property Details, Decision Tree, Purchase Price, Rental Assessment — each section has collapsible "Additional Dialogue" textarea pre-populated from source
- **Page 2 (Steps 1-5):** Uses actual existing property form components:
  1. **Market Performance** → `Step3MarketPerformance` (auto-fetches fresh backend data)
  2. **Proximity & Content** → `Step5Proximity` (investment highlights, why this property, proximity)
  3. **Insurance Calculator** → `Step6InsuranceCalculator` + `Step6WashingtonBrown`
  4. **Cashflow Review** → `Step7CashflowReview`
  5. **Agent Information** → custom fields + Message for BA + Attachments dialogue
- Each Page 2 section has a "Clear & Re-enter" button
- Form store (`useFormStore`) is populated from source data via `populateFormStore()`
- Dialogue values tracked in `dialogueValues` state (Page 1) and formStore (Page 2 components)
- Navigation: StepIndicator circles, Previous/Next buttons, progress bar

## What Phase 2 Must Do

### 1. Replace `handleLoad` — Fetch Real GHL Record

**Currently:** `handleLoad()` reads from `MOCK_SOURCE` constant.

**Target:** Fetch the real GHL record via the existing API endpoint.

```
GET /api/properties/{recordId}
```

This endpoint already exists at `src/app/api/properties/[recordId]/route.ts`. It:
- Fetches from GHL API: `GET {GHL_BASE_URL}/objects/{GHL_OBJECT_ID}/records/{recordId}?locationId={GHL_LOCATION_ID}`
- Returns `{ success: true, data: formData }` where `formData` is already mapped to the form's nested structure (decisionTree, address, propertyDescription, purchasePrice, rentalAssessment, marketPerformance, contentSections, etc.)

**Implementation:**
```typescript
const handleLoad = async () => {
  if (!recordId.trim()) return;
  setLoading(true);
  try {
    const response = await fetch(`/api/properties/${recordId.trim()}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    
    // result.data is already in FormData structure (same as edit mode)
    const ghlData = result.data;
    
    // Flatten to Record<string, string> for Page 1 comparison fields
    const flatSource = flattenGhlData(ghlData);
    setSourceData(flatSource);
    
    // Populate formStore for Page 2 components
    populateFormStoreFromGhl(ghlData);
    
    // Initialize field states, dialogue values, etc.
    // ... (same as current but using flatSource instead of MOCK_SOURCE)
    
    setSourceLoaded(true);
    setCurrentStep(0);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Key: `flattenGhlData()` function** — converts nested FormData back to flat key-value pairs for the comparison UI:
```typescript
const flattenGhlData = (data: any): Record<string, string> => ({
  lotNumber: data.address?.lotNumber || '',
  streetNumber: data.address?.streetNumber || '',
  streetName: data.address?.streetName || '',
  suburbName: data.address?.suburbName || '',
  state: data.address?.state || '',
  postCode: data.address?.postCode || '',
  lga: data.address?.lga || '',
  zoning: data.riskOverlays?.zoning || '',
  flood: data.riskOverlays?.flood || '',
  bushfire: data.riskOverlays?.bushfire || '',
  mining: data.riskOverlays?.mining || '',
  otherOverlay: data.riskOverlays?.otherOverlay || '',
  specialInfrastructure: data.riskOverlays?.specialInfrastructure || '',
  dueDiligenceAcceptance: data.riskOverlays?.dueDiligenceAcceptance || '',
  propertyType: data.decisionTree?.propertyType || '',
  contractType: data.decisionTree?.contractType || data.dealType || '',
  dualOccupancy: data.decisionTree?.dualOccupancy || '',
  dwellingType: data.decisionTree?.dwellingType || '',
  status: data.decisionTree?.status || data.status || '',
  bedsPrimary: data.propertyDescription?.bedsPrimary || '',
  bathPrimary: data.propertyDescription?.bathPrimary || '',
  garagePrimary: data.propertyDescription?.garagePrimary || '',
  yearBuilt: data.propertyDescription?.yearBuilt || '',
  landSize: data.propertyDescription?.landSize || '',
  buildSize: data.propertyDescription?.buildSize || '',
  title: data.propertyDescription?.title || '',
  bodyCorpPerQuarter: data.propertyDescription?.bodyCorpPerQuarter || '',
  landRegistration: data.propertyDescription?.landRegistration || '',
  asking: data.purchasePrice?.asking || '',
  landPrice: data.purchasePrice?.landPrice || '',
  buildPrice: data.purchasePrice?.buildPrice || '',
  totalPrice: data.purchasePrice?.totalPrice || '',
  cashbackRebateValue: data.purchasePrice?.cashbackRebateValue || '',
  cashbackRebateType: data.purchasePrice?.cashbackRebateType || '',
  comparableSales: data.purchasePrice?.comparableSales || '',
  occupancyPrimary: data.rentalAssessment?.occupancyPrimary || '',
  currentRentPrimary: data.rentalAssessment?.currentRentPrimary || '',
  rentAppraisalPrimaryFrom: data.rentalAssessment?.rentAppraisalPrimaryFrom || '',
  rentAppraisalPrimaryTo: data.rentalAssessment?.rentAppraisalPrimaryTo || '',
  yield: data.rentalAssessment?.yield || '',
  appraisedYield: data.rentalAssessment?.appraisedYield || '',
  // Market Performance
  medianPriceChange3Months: data.marketPerformance?.medianPriceChange3Months || '',
  medianPriceChange1Year: data.marketPerformance?.medianPriceChange1Year || '',
  medianPriceChange3Year: data.marketPerformance?.medianPriceChange3Year || '',
  medianPriceChange5Year: data.marketPerformance?.medianPriceChange5Year || '',
  medianYield: data.marketPerformance?.medianYield || '',
  medianRentChange1Year: data.marketPerformance?.medianRentChange1Year || '',
  rentalPopulation: data.marketPerformance?.rentalPopulation || '',
  vacancyRate: data.marketPerformance?.vacancyRate || '',
  // Content
  whyThisProperty: data.contentSections?.whyThisProperty || '',
  proximity: data.contentSections?.proximity || '',
  investmentHighlights: data.contentSections?.investmentHighlights || '',
  // Insurance/Depreciation
  insurance: data.insurance || '',
  councilWaterRates: data.councilWaterRates || '',
  depYear1: data.depreciation?.year1 || '',
  depYear2: data.depreciation?.year2 || '',
  // ... depYear3-depYear10
  // Agent
  agentName: data.sellingAgentName || data.agentInfo?.agentName || '',
  agentMobile: data.sellingAgentMobile || data.agentInfo?.agentMobile || '',
  agentEmail: data.sellingAgentEmail || data.agentInfo?.agentEmail || '',
  // Dialogue fields
  propertyDescriptionAdditionalDialogue: data.propertyDescription?.propertyDescriptionAdditionalDialogue || '',
  purchasePriceAdditionalDialogue: data.purchasePrice?.purchasePriceAdditionalDialogue || '',
  rentalAssessmentAdditionalDialogue: data.rentalAssessment?.rentalAssessmentAdditionalDialogue || '',
  marketPerformanceAdditionalDialogue: data.marketPerformance?.marketPerformanceAdditionalDialogue || '',
  messageForBA: data.messageForBA || '',
  attachmentsAdditionalDialogue: data.attachmentsAdditionalDialogue || '',
});
```

**Key: `populateFormStoreFromGhl()`** — can pass the nested data directly to `updateFormData()` since the GET API already returns FormData structure:
```typescript
const populateFormStoreFromGhl = (data: any) => {
  resetForm();
  updateFormData(data); // Already in correct nested structure
};
```

### 2. Replace Submission — Create New GHL Record

**Currently:** Submit button shows an alert with JSON.

**Target:** POST to the existing submit endpoint.

The existing endpoint is at `src/app/api/ghl/submit-property/route.ts`. It:
- Accepts FormData in the body
- Maps to GHL field names (snake_case)
- POSTs to `{GHL_BASE_URL}/objects/{GHL_OBJECT_ID}/records` with `locationId`
- Returns `{ success: true, recordId: "..." }`

**Implementation for the duplicate tool submit:**

The duplicate tool needs to collect values from TWO sources:
1. **Page 1 fields:** from `fieldStates` (using `getEffectiveValue()`)
2. **Page 2 fields:** from `useFormStore().formData` (the actual components write to the store)
3. **Dialogue values:** from `dialogueValues` state (Page 1) and formStore (Page 2)

```typescript
const handleSubmit = async () => {
  // Build the FormData object that submit-property expects
  const formStoreData = useFormStore.getState().formData;
  
  const submitData = {
    // From formStore (Page 2 components wrote here)
    ...formStoreData,
    
    // Override with Page 1 effective values
    address: {
      ...formStoreData.address,
      lotNumber: getEffectiveValue('lotNumber'),
      streetNumber: getEffectiveValue('streetNumber'),
      streetName: getEffectiveValue('streetName'),
      suburbName: getEffectiveValue('suburbName'),
      state: getEffectiveValue('state'),
      postCode: getEffectiveValue('postCode'),
      lga: getEffectiveValue('lga'),
      propertyAddress: `${getEffectiveValue('streetNumber')} ${getEffectiveValue('streetName')}, ${getEffectiveValue('suburbName')} ${getEffectiveValue('state')} ${getEffectiveValue('postCode')}`,
    },
    riskOverlays: {
      ...formStoreData.riskOverlays,
      zoning: getEffectiveValue('zoning'),
      flood: getEffectiveValue('flood'),
      bushfire: getEffectiveValue('bushfire'),
      mining: getEffectiveValue('mining'),
      otherOverlay: getEffectiveValue('otherOverlay'),
      specialInfrastructure: getEffectiveValue('specialInfrastructure'),
      dueDiligenceAcceptance: getEffectiveValue('dueDiligenceAcceptance'),
    },
    decisionTree: {
      ...formStoreData.decisionTree,
      propertyType: getEffectiveValue('propertyType'),
      contractType: getEffectiveValue('contractType'),
      dualOccupancy: getEffectiveValue('dualOccupancy'),
      dwellingType: getEffectiveValue('dwellingType'),
      status: getEffectiveValue('status'),
    },
    propertyDescription: {
      ...formStoreData.propertyDescription,
      bedsPrimary: getEffectiveValue('bedsPrimary'),
      bathPrimary: getEffectiveValue('bathPrimary'),
      garagePrimary: getEffectiveValue('garagePrimary'),
      yearBuilt: getEffectiveValue('yearBuilt'),
      landSize: getEffectiveValue('landSize'),
      buildSize: getEffectiveValue('buildSize'),
      propertyDescriptionAdditionalDialogue: dialogueValues['propertyDescriptionAdditionalDialogue'] || '',
    },
    purchasePrice: {
      ...formStoreData.purchasePrice,
      asking: getEffectiveValue('asking'),
      landPrice: getEffectiveValue('landPrice'),
      buildPrice: getEffectiveValue('buildPrice'),
      totalPrice: getEffectiveValue('totalPrice'),
      purchasePriceAdditionalDialogue: dialogueValues['purchasePriceAdditionalDialogue'] || '',
    },
    rentalAssessment: {
      ...formStoreData.rentalAssessment,
      occupancyPrimary: getEffectiveValue('occupancyPrimary'),
      currentRentPrimary: getEffectiveValue('currentRentPrimary'),
      rentAppraisalPrimaryFrom: getEffectiveValue('rentAppraisalPrimaryFrom'),
      yield: getEffectiveValue('yield'),
      appraisedYield: getEffectiveValue('appraisedYield'),
      rentalAssessmentAdditionalDialogue: dialogueValues['rentalAssessmentAdditionalDialogue'] || '',
    },
    // Top-level fields
    messageForBA: dialogueValues['messageForBA'] || '',
    attachmentsAdditionalDialogue: dialogueValues['attachmentsAdditionalDialogue'] || '',
    sellingAgentName: getEffectiveValue('agentName'),
    sellingAgentEmail: getEffectiveValue('agentEmail'),
    sellingAgentMobile: getEffectiveValue('agentMobile'),
  };

  const response = await fetch('/api/ghl/submit-property', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitData),
  });
  
  const result = await response.json();
  if (result.success) {
    // Show success, offer link to new record
    alert(`New record created: ${result.recordId}`);
  }
};
```

### 3. Remove Mock Data

Delete `MOCK_SOURCE` constant entirely. The `handleLoad` function will fetch real data.

### 4. Add Loading/Error States

Add proper loading spinner and error display:
- Loading state while fetching source record
- Error state if fetch fails (invalid record ID, network error, etc.)
- Disable the "Load" button while loading

### 5. Google Drive Folder Creation

The duplicate needs a NEW Google Drive folder. The existing `Step6FolderCreation` component handles this, but it's not currently in the duplicate tool's step flow. Options:
- Add folder creation as part of the submission process (backend creates folder)
- Or add `Step6FolderCreation` as an additional step before submission

The existing folder creation API: `POST /api/google-drive/create-folder` (check `src/app/api/google-drive/`)

### 6. Cashflow Spreadsheet

The cashflow review requires an AMAP report selection and creates a spreadsheet. In the duplicate tool, the user will need to re-select the AMAP report. The `Step7CashflowReview` component already handles this interaction.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/admin/duplicate/page.tsx` | Main duplicate tool UI |
| `src/app/api/properties/[recordId]/route.ts` | GET: Fetch GHL record → FormData |
| `src/app/api/ghl/submit-property/route.ts` | POST: FormData → Create GHL record |
| `src/store/formStore.ts` | Shared form state (Zustand) |
| `src/types/form.ts` | TypeScript interfaces for FormData |
| `src/components/steps/Step3MarketPerformance.tsx` | Market Performance (auto-fetches) |
| `src/components/steps/Step5Proximity.tsx` | Proximity & Content |
| `src/components/steps/Step6InsuranceCalculator.tsx` | Insurance Calculator |
| `src/components/steps/Step6WashingtonBrown.tsx` | Washington Brown Depreciation |
| `src/components/steps/Step7CashflowReview.tsx` | Cashflow Review |

## GHL API Config

Environment variables (already configured in `.env.local`):
- `GHL_BASE_URL` = `https://services.leadconnectorhq.com`
- `GHL_OBJECT_ID` = Property Reviews custom object ID
- `GHL_LOCATION_ID` = Location ID
- `GHL_BEARER_TOKEN` = Bearer token
- `GHL_API_VERSION` = `2021-07-28`

## GHL Field Mapping Reference

The complete GHL field name ↔ FormData mapping is in:
- **Form → GHL:** `src/app/api/ghl/submit-property/route.ts` lines 79-212
- **GHL → Form:** `src/app/api/properties/[recordId]/route.ts` lines 327-641

Notable GHL field name quirks:
- `mining_dialogie` (typo in GHL — "dialogie" not "dialogue")
- `market_perfornance_additional_dialogue` (typo — "perfornance")
- Bath fields use `point` format: `2point5` = `2.5`
- Depreciation stored as comma-separated: `"12345,11234,10123,..."`
- `cf_insurance_value_`, `cf_councilwater_rates_`, `cf_depreciation_` (custom field prefix)

## Testing Checklist

1. [ ] Load a real GHL record by ID
2. [ ] Verify all Page 1 fields show correct source values
3. [ ] Verify Page 2 components pre-populate correctly
4. [ ] Edit fields on both pages
5. [ ] Verify dialogue fields carry over and are editable
6. [ ] Submit and verify new GHL record created with correct values
7. [ ] Verify the new record has a different ID from the source
8. [ ] Test with different property types (New/Established, Single/Dual)
