# Integration Plan: Amenity Distance & Investment Highlights Automation

## Current State

### What We Have:
- ✅ **Step 5 (Proximity)** - Manual text inputs for:
  - `whyThisProperty` - "Why this Property?" field
  - `proximity` - List of nearby amenities with distances
  - `investmentHighlights` - Infrastructure and investment highlights

- ✅ **Address Data** - Collected in Step 0:
  - Full property address
  - Suburb, state, postcode
  - LGA (Local Government Area) - for investment highlights lookup
  - Lat/Long coordinates (from Geoscape/Stash)

### What the Amenity Distance Tool Provides:
- **Proximity Data**: Exactly formatted as Step 5 expects
  - Address at top
  - 1x kindergarten
  - 3x schools
  - 2x supermarkets
  - 2x hospitals
  - 1x train station
  - 1x bus stop
  - 1x beach
  - 1x airport
  - 1x closest capital city
  - 3x child day cares
  - All sorted by distance (car travel)

- **Why This Property**: 7 detailed investment reasons
  - Full detailed versions with explanations
  - Short one-line headings
  
- **Investment Highlights**: Based on suburb/LGA market data

---

## Integration Options

### Option 1: Make.com Webhook with ChatGPT API (Recommended)
**Why:** User mentioned they have another tool using ChatGPT that does this, and want to migrate to Make.com

**Flow:**
1. User enters address in Step 0 → form has address data
2. User reaches Step 5 → Click "Generate Proximity & Investment Data" button
3. Form sends address to Make.com webhook
4. Make.com scenario:
   - **Module 1:** Webhook (receive address)
   - **Module 2:** ChatGPT API call (using amenity distance prompt)
   - **Module 3:** Parse response
   - **Module 4:** HTTP response back to form
5. Form receives structured data and auto-populates Step 5 fields

**Pros:**
- ✅ Uses existing Make.com infrastructure
- ✅ Leverages ChatGPT for flexible generation
- ✅ No need to build/maintain geocoding APIs
- ✅ Easy to update prompts/format
- ✅ Can reuse ChatGPT integration pattern from other tools

**Cons:**
- ⚠️ Requires Make.com webhook setup
- ⚠️ ChatGPT API costs per request
- ⚠️ Need to handle API rate limits

---

### Option 2: Direct API Integration (Amenity Distance App)
**Flow:**
1. Integrate the amenity-distance-app React app logic as API
2. Form sends address → API returns proximity + investment data
3. Auto-populate Step 5 fields

**Pros:**
- ✅ Uses existing amenity-distance-app code
- ✅ No external API costs (if using free services)
- ✅ Full control over data format

**Cons:**
- ⚠️ Need to extract logic from React app
- ⚠️ Need to set up geocoding/proximity APIs (Google Maps, etc.)
- ⚠️ Need to maintain infrastructure
- ⚠️ Need to source investment data (suburb/LGA market data)

---

### Option 3: Hybrid Approach (Make.com + Direct APIs)
**Flow:**
1. Make.com webhook receives address
2. Make.com calls geocoding API (Google Maps/Distance Matrix)
3. Make.com calls ChatGPT for investment reasons (using suburb/LGA data)
4. Make.com formats response
5. Returns to form

**Pros:**
- ✅ Best of both worlds
- ✅ ChatGPT handles investment reasoning (smart)
- ✅ Direct APIs handle proximity (accurate)
- ✅ All managed in Make.com

**Cons:**
- ⚠️ More complex Make.com scenario
- ⚠️ Multiple API calls = multiple costs

---

## Recommended Implementation: Option 1 (Make.com + ChatGPT)

### Step-by-Step Implementation Plan

#### Phase 1: Make.com Scenario Setup

**Make.com Scenario Structure:**
```
1. Webhook (Custom) - Receive property address
   ↓
2. Tools > Set Variable - Extract address components
   - propertyAddress (full)
   - suburb
   - state
   - postcode
   - lga (if available)
   ↓
3. OpenAI (ChatGPT) - Generate proximity & investment data
   Prompt: [See template below]
   ↓
4. Tools > Set Multiple Variables - Parse response
   - proximity (formatted list)
   - whyThisProperty (7 detailed reasons)
   - investmentHighlights (infrastructure/investment info)
   ↓
5. Webhook Response - Return JSON to form
   {
     "proximity": "...",
     "whyThisProperty": "...",
     "investmentHighlights": "..."
   }
```

**ChatGPT Prompt Template:**
```
You are a property investment analysis tool. Given a property address, generate:

1. PROXIMITY DATA (car travel mode, sorted by distance within each category):
   Start with the full address on the first line.
   Then list, in this exact order:
   - 1x kindergarten (nearest)
   - 3x schools (nearest, any level)
   - 2x supermarkets (nearest)
   - 2x hospitals (nearest)
   - 1x train station (nearest)
   - 1x bus stop (nearest)
   - 1x beach (nearest)
   - 1x airport (nearest)
   - 1x closest capital city CBD
   - 3x child day cares (nearest)
   
   Format each as: "• [DISTANCE] km ([TIME] mins), [NAME]"
   
2. WHY THIS PROPERTY (7 detailed investment reasons):
   Generate 7 tailored property investment insights for the suburb/LGA, each with:
   - Bold heading
   - Concise explanation covering:
     * Capital growth trends
     * Rental yield performance
     * Vacancy rates
     * Infrastructure upgrades
     * Affordability levels
     * Public transport availability
     * Tenant or buyer demand
   
3. INVESTMENT HIGHLIGHTS:
   Key infrastructure developments, population growth, economic initiatives, transport improvements.
   
Property Address: {propertyAddress}
Suburb: {suburb}
State: {state}
Postcode: {postcode}
LGA: {lga}

Return as JSON:
{
  "proximity": "...",
  "whyThisProperty": "...",
  "investmentHighlights": "..."
}
```

#### Phase 2: Form Integration

**Add to Step 5 (Step5Proximity.tsx):**

1. **Add "Generate Automatically" Button:**
   ```tsx
   <button 
     onClick={handleGenerateProximityData}
     disabled={isGenerating}
     className="btn-secondary"
   >
     {isGenerating ? 'Generating...' : 'Generate Proximity & Investment Data'}
   </button>
   ```

2. **Add Loading State:**
   ```tsx
   const [isGenerating, setIsGenerating] = useState(false);
   ```

3. **Create API Call Function:**
   ```tsx
   const handleGenerateProximityData = async () => {
     if (!address?.propertyAddress) {
       alert('Please enter a property address first (Step 0)');
       return;
     }
     
     setIsGenerating(true);
     try {
       const response = await fetch('/api/generate-proximity', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           propertyAddress: address.propertyAddress,
           suburb: address.suburbName,
           state: address.state,
           postcode: address.postCode,
           lga: address.lga,
         }),
       });
       
       const data = await response.json();
       
       // Auto-populate fields
       handleProximityChange(data.proximity || '');
       handleWhyThisPropertyChange(data.whyThisProperty || '');
       handleInvestmentHighlightsChange(data.investmentHighlights || '');
     } catch (error) {
       alert('Failed to generate data. Please fill in manually.');
       console.error(error);
     } finally {
       setIsGenerating(false);
     }
   };
   ```

4. **Create API Route: `/api/generate-proximity/route.ts`:**
   ```typescript
   import { NextResponse } from 'next/server';
   
   export async function POST(request: Request) {
     try {
       const { propertyAddress, suburb, state, postcode, lga } = await request.json();
       
       // Call Make.com webhook
       const makeWebhookUrl = process.env.MAKE_PROXIMITY_WEBHOOK_URL;
       const response = await fetch(makeWebhookUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           propertyAddress,
           suburb,
           state,
           postcode,
           lga,
         }),
       });
       
       const data = await response.json();
       
       return NextResponse.json({
         success: true,
         proximity: data.proximity,
         whyThisProperty: data.whyThisProperty,
         investmentHighlights: data.investmentHighlights,
       });
     } catch (error) {
       return NextResponse.json(
         { success: false, error: 'Failed to generate proximity data' },
         { status: 500 }
       );
     }
   }
   ```

5. **Add Environment Variable:**
   ```env
   MAKE_PROXIMITY_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-url
   ```

#### Phase 3: User Experience Flow

**Option A: Auto-generate on Step 5 Entry**
- When user enters Step 5, if address exists but proximity is empty, show prompt:
  "Would you like to automatically generate proximity and investment data?"

**Option B: Manual Button Click (Recommended)**
- User clicks "Generate Automatically" button
- Fields populate automatically
- User can still edit manually if needed

**Option C: Auto-fill on Address Change**
- When address is entered/changed in Step 0, automatically fetch data in background
- Show in Step 5 when user arrives

**Recommendation: Option B (Manual Button)** - Gives user control and clarity.

---

## Integration with Existing Amenity Distance App

### If We Want to Use Existing App Logic:

**Option: Extract API from amenity-distance-app**

1. **Check what APIs the app uses:**
   - Google Maps Distance Matrix API?
   - Geocoding API?
   - Other proximity services?

2. **Create API wrapper:**
   - Extract proximity calculation logic
   - Create `/api/proximity` endpoint in form-app
   - Reuse same logic as amenity-distance-app

3. **For Investment Data:**
   - Still use ChatGPT (as described above)
   - Or integrate with existing data source if app uses one

---

## Data Flow Diagram

```
┌─────────────────┐
│   Step 0 Form   │
│  Enter Address  │
│  (Geocode)      │
└────────┬────────┘
         │
         │ Store: address, suburb, state, postcode, lga, lat/long
         ↓
┌─────────────────┐
│   Step 5 Form   │
│  Proximity Tab  │
└────────┬────────┘
         │
         │ User clicks "Generate Automatically"
         ↓
┌─────────────────────────┐
│  /api/generate-proximity │
│  (Next.js API Route)     │
└────────┬─────────────────┘
         │
         │ POST to Make.com Webhook
         ↓
┌────────────────────────────┐
│     Make.com Scenario      │
│  1. Webhook (receive)      │
│  2. Extract variables      │
│  3. ChatGPT API call       │
│     (with amenity prompt)  │
│  4. Parse response         │
│  5. Webhook response       │
└────────┬───────────────────┘
         │
         │ JSON response:
         │ { proximity, whyThisProperty, investmentHighlights }
         ↓
┌─────────────────────────┐
│  Form Auto-populates    │
│  Step 5 Fields          │
│  - proximity            │
│  - whyThisProperty      │
│  - investmentHighlights │
└─────────────────────────┘
         │
         │ User can edit if needed
         ↓
┌─────────────────────────┐
│  User continues form    │
│  Submits to Make.com    │
└─────────────────────────┘
```

---

## Benefits of This Integration

### For Users:
- ✅ **Saves Time**: Auto-generates 3 large text fields
- ✅ **Consistency**: Same format every time (matches amenity tool)
- ✅ **Accuracy**: Uses real proximity data and market insights
- ✅ **Flexibility**: Can still edit manually if needed

### For System:
- ✅ **Reuses Infrastructure**: Make.com + ChatGPT (same as other tools)
- ✅ **Maintainable**: All logic in Make.com (easy to update)
- ✅ **Scalable**: ChatGPT handles any address/suburb
- ✅ **No Code Duplication**: One source of truth for proximity format

---

## Implementation Checklist

### Phase 1: Make.com Setup
- [ ] Create Make.com scenario
- [ ] Set up webhook module (receive address)
- [ ] Set up variable extraction
- [ ] Set up ChatGPT API module with prompt
- [ ] Set up response parsing
- [ ] Set up webhook response module
- [ ] Test scenario with sample address

### Phase 2: Form Integration
- [ ] Create `/api/generate-proximity` route
- [ ] Add "Generate Automatically" button to Step 5
- [ ] Add loading state and error handling
- [ ] Add auto-populate logic
- [ ] Add environment variable for Make.com webhook URL

### Phase 3: Testing
- [ ] Test with various addresses (different states, suburbs)
- [ ] Verify proximity format matches expected format
- [ ] Verify investment reasons are relevant
- [ ] Test error handling (no address, API failures)
- [ ] Test manual editing after auto-generation

### Phase 4: Enhancement (Optional)
- [ ] Add "Regenerate" button (re-fetch with different data)
- [ ] Add "Clear Generated Data" button
- [ ] Cache generated data (prevent re-fetching same address)
- [ ] Show loading spinner while generating
- [ ] Add success notification

---

## Next Steps

1. **User provides access to ChatGPT tool** (if different from current setup)
2. **Set up Make.com scenario** (can use existing ChatGPT integration pattern)
3. **Create form integration** (API route + button)
4. **Test end-to-end**
5. **Deploy and monitor**

---

## Questions to Answer

1. **Does the existing ChatGPT tool have the exact prompt/format?**
   - Can we reuse that prompt?
   - Or do we need to adapt it?

2. **Do we want to use the existing amenity-distance-app React app logic?**
   - Or purely ChatGPT-based approach?
   - Or hybrid (ChatGPT for investment, direct APIs for proximity)?

3. **Should generation happen:**
   - Automatically when Step 5 is entered?
   - On button click only?
   - In background when address is entered?

4. **Should we cache results?**
   - Same address = same results (avoid re-fetching)
   - Store in form state or session storage?

---

**Ready to implement when you return!** 🚀
