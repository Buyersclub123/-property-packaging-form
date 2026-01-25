# Revised Integration Plan: Amenity Distance & Investment Highlights

## Key Insight from ChatGPT Tool Analysis

The ChatGPT tool **simulates** real-world proximity search by:
1. **Geocoding** the address (lat/long)
2. **Setting search radius** (different per category: 3-5km for schools, up to 100km for airports)
3. **Filtering by category** (kindergartens, schools, supermarkets, etc.)
4. **Sorting by car travel distance/time**
5. **Standardizing naming** (consistent format)

**However**, for **production use**, we should use **real APIs** for accuracy, not simulation.

---

## Revised Integration Strategy

### Hybrid Approach (Recommended)

**Use Real APIs for Proximity Data** (accurate)  
**Use ChatGPT for Investment Reasoning** (smart analysis)

#### Why This Approach?

1. **Proximity Data** = Needs to be accurate (actual distances, real places)
   - ✅ Use Google Maps Places API / Distance Matrix API
   - ✅ Real geocoding (we already have this from Geoscape/Stash)
   - ✅ Real proximity calculations
   - ✅ Real amenity data

2. **Investment Reasoning** = Needs to be insightful (market analysis, trends)
   - ✅ Use ChatGPT (like your other tool does)
   - ✅ Analyzes suburb/LGA market data
   - ✅ Generates tailored investment reasons
   - ✅ Provides context and insights

3. **Investment Highlights** = Can use either:
   - Option A: ChatGPT (if it has good market knowledge)
   - Option B: Real data sources (Hotspotting Reports API if available)
   - Option C: Hybrid (ChatGPT + real infrastructure data)

---

## Implementation Options

### Option A: Full Real API Integration (Most Accurate)

**Proximity Data:**
- Google Maps Places API (find nearby amenities)
- Google Maps Distance Matrix API (calculate travel times)
- Filter and sort by category
- Format exactly as required

**Investment Reasoning:**
- ChatGPT API via Make.com (generates 7 investment reasons)
- Uses suburb/LGA market data context

**Investment Highlights:**
- ChatGPT API via Make.com (infrastructure/development insights)
- OR: Real data source if available

**Pros:**
- ✅ Most accurate proximity data
- ✅ Real distances and travel times
- ✅ Professional-grade output

**Cons:**
- ⚠️ Requires Google Maps API key (costs per request)
- ⚠️ More complex implementation
- ⚠️ Need to handle API rate limits

---

### Option B: ChatGPT Simulation (Simplest)

**All Data:**
- Use ChatGPT to simulate proximity + investment data (like your current tool)
- Single Make.com webhook call
- ChatGPT generates everything based on location knowledge

**Pros:**
- ✅ Simple implementation (single webhook)
- ✅ Uses existing ChatGPT infrastructure
- ✅ Fast setup

**Cons:**
- ⚠️ Simulated distances (may not be 100% accurate)
- ⚠️ ChatGPT doesn't have real-time proximity data
- ⚠️ May need frequent prompt tuning

---

### Option C: Hybrid (Best Balance) ⭐ RECOMMENDED

**Proximity Data:**
- Use **real APIs** (Google Maps Places/Distance Matrix)
- Accurate distances and travel times
- Real amenity locations

**Investment Reasoning:**
- Use **ChatGPT** via Make.com
- Smart analysis of suburb/LGA market data
- Generates 7 tailored investment reasons

**Investment Highlights:**
- Use **ChatGPT** via Make.com
- Infrastructure and development insights

**Pros:**
- ✅ Accurate proximity (real APIs)
- ✅ Smart investment analysis (ChatGPT)
- ✅ Best of both worlds
- ✅ Professional output

**Cons:**
- ⚠️ Requires Google Maps API setup
- ⚠️ Two Make.com scenarios (or one complex scenario)
- ⚠️ Slightly more complex

---

## Recommended: Option C (Hybrid Approach)

### Architecture

```
┌─────────────────────┐
│  Step 5 Form        │
│  User clicks        │
│  "Generate" button  │
└──────────┬──────────┘
           │
           │ POST /api/generate-proximity
           ↓
┌─────────────────────────────────────────┐
│  Next.js API Route                      │
│  /api/generate-proximity/route.ts       │
└──────────┬──────────────────────────────┘
           │
           ├─────────────────┬──────────────────┐
           │                 │                  │
           ↓                 ↓                  ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Google Maps  │  │  Make.com    │  │  Make.com    │
    │ Places API   │  │  Scenario 1  │  │  Scenario 2  │
    │              │  │  (Investment │  │  (Highlights)│
    │ Proximity    │  │   Reasons)   │  │              │
    │ Data         │  │              │  │              │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           │                 │                  │
           ↓                 ↓                  ↓
    ┌──────────────────────────────────────────────┐
    │  Combine Results                             │
    │  - proximity (from Google Maps)             │
    │  - whyThisProperty (from ChatGPT)           │
    │  - investmentHighlights (from ChatGPT)      │
    └──────────────────┬───────────────────────────┘
                       │
                       ↓
    ┌──────────────────────────────────────────────┐
    │  Return to Form                              │
    │  Auto-populate Step 5 fields                 │
    └──────────────────────────────────────────────┘
```

---

## Implementation Details

### Part 1: Proximity Data (Google Maps API)

**API Route:** `/api/generate-proximity-data/route.ts`

**Uses:**
- Google Maps Places API (Nearby Search)
- Google Maps Distance Matrix API (Travel times)
- Already have lat/long from Step 0 (Geoscape/Stash)

**Search Categories:**
```typescript
const searchCategories = {
  kindergarten: { types: ['school'], keyword: 'kindergarten', radius: 5000, count: 1 },
  schools: { types: ['school'], radius: 5000, count: 3 },
  supermarkets: { types: ['supermarket'], radius: 5000, count: 2 },
  hospitals: { types: ['hospital'], radius: 10000, count: 2 },
  train_station: { types: ['train_station'], radius: 10000, count: 1 },
  bus_station: { types: ['bus_station', 'transit_station'], radius: 10000, count: 1 },
  beach: { types: ['natural_feature'], keyword: 'beach', radius: 50000, count: 1 },
  airport: { types: ['airport'], radius: 100000, count: 1 },
  capital_cbd: { types: ['administrative_area_level_1'], keyword: 'CBD', radius: 100000, count: 1 },
  childcare: { types: ['establishment'], keyword: 'childcare daycare', radius: 5000, count: 3 },
};
```

**Format Output:**
```typescript
const formatProximityOutput = (address: string, amenities: any[]) => {
  let output = `${address}\n`;
  
  // Sort by category order
  const categories = ['kindergarten', 'schools', 'supermarkets', 'hospitals', 
                      'train_station', 'bus_station', 'beach', 'airport', 
                      'capital_cbd', 'childcare'];
  
  categories.forEach(category => {
    const items = amenities.filter(a => a.category === category);
    items.forEach(item => {
      const distance = (item.distance / 1000).toFixed(1); // km
      const time = item.duration || 'N/A'; // minutes
      const name = item.name;
      
      // Format: "• [DISTANCE] km ([TIME] mins), [NAME]"
      // Add category label for schools and childcare only
      const label = (category === 'schools' || category === 'childcare') 
        ? ` (${category === 'schools' ? 'School' : 'Child Care'})` 
        : '';
      
      output += `• ${distance} km (${time} mins), ${name}${label}\n`;
    });
  });
  
  return output;
};
```

---

### Part 2: Investment Reasoning (ChatGPT via Make.com)

**Make.com Scenario:** "Generate Investment Reasons"

**Input:**
- Property address
- Suburb
- State
- Postcode
- LGA

**ChatGPT Prompt:**
```
You are a property investment analyst. Given a property address and location details, generate 7 tailored property investment insights for this suburb/LGA.

For each insight, provide:
- A bold heading (descriptive and compelling)
- A concise explanation (2-3 sentences) covering relevant factors such as:
  * Capital growth trends
  * Rental yield performance
  * Vacancy rates
  * Infrastructure upgrades
  * Affordability levels
  * Public transport availability
  * Tenant or buyer demand

Format each as: "• **Heading** - Description"

Property Address: {propertyAddress}
Suburb: {suburb}
State: {state}
Postcode: {postcode}
LGA: {lga}

Generate 7 investment reasons that are relevant to this specific location. Base insights on realistic market data for this suburb/LGA.

Return ONLY the formatted list, one reason per line.
```

**Output Format:**
```
• **Strong Capital Growth** - Fitzroy has consistently outperformed the Melbourne average with a 10-year annual growth rate exceeding 7%, supported by its desirable inner-city location.
• **Attractive Rental Yields** - Inner-north suburbs like Fitzroy deliver competitive gross rental yields above 4% for units, driven by demand from young professionals and students.
[... 5 more reasons]
```

---

### Part 3: Investment Highlights (ChatGPT via Make.com)

**Make.com Scenario:** "Generate Investment Highlights"  
(Can be same scenario as Part 2, or separate)

**ChatGPT Prompt:**
```
You are a property investment analyst. Given a property address and location details, generate key investment highlights and infrastructure developments for this area.

Include:
- Major infrastructure projects
- Population growth trends
- Economic development initiatives
- Transport improvements
- Urban planning developments

Format as bullet points: "• [Highlight]"

Property Address: {propertyAddress}
Suburb: {suburb}
State: {state}
Postcode: {postcode}
LGA: {lga}

Generate 5-8 investment highlights relevant to this specific location. Base on realistic infrastructure and development data for this suburb/LGA.

Return ONLY the formatted list, one highlight per line.
```

---

## Code Implementation

### Updated API Route (Hybrid Approach)

**File:** `form-app/src/app/api/generate-proximity/route.ts`

```typescript
import { NextResponse } from 'next/server';

/**
 * Hybrid approach:
 * - Google Maps API for accurate proximity data
 * - ChatGPT (via Make.com) for investment reasoning
 */
export async function POST(request: Request) {
  try {
    const { propertyAddress, suburb, state, postcode, lga, latitude, longitude } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }
    
    // Need lat/long for Google Maps API
    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Property coordinates are required. Please verify address in Step 0.' },
        { status: 400 }
      );
    }
    
    // PART 1: Get proximity data from Google Maps API
    const proximityData = await getProximityFromGoogleMaps(
      latitude, 
      longitude, 
      propertyAddress
    );
    
    // PART 2 & 3: Get investment data from ChatGPT (via Make.com)
    const investmentData = await getInvestmentDataFromChatGPT(
      propertyAddress,
      suburb,
      state,
      postcode,
      lga
    );
    
    return NextResponse.json({
      success: true,
      proximity: proximityData,
      whyThisProperty: investmentData.whyThisProperty,
      investmentHighlights: investmentData.investmentHighlights,
    });
    
  } catch (error) {
    console.error('Error generating proximity data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get proximity data from Google Maps Places API
 */
async function getProximityFromGoogleMaps(
  lat: number,
  lng: number,
  address: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }
  
  // Search for each category of amenities
  const categories = [
    { name: 'kindergarten', types: ['school'], keyword: 'kindergarten', radius: 5000, count: 1 },
    { name: 'schools', types: ['school'], radius: 5000, count: 3 },
    { name: 'supermarkets', types: ['supermarket'], radius: 5000, count: 2 },
    { name: 'hospitals', types: ['hospital'], radius: 10000, count: 2 },
    { name: 'train_station', types: ['subway_station', 'train_station'], radius: 10000, count: 1 },
    { name: 'bus_station', types: ['bus_station', 'transit_station'], radius: 10000, count: 1 },
    { name: 'beach', types: ['natural_feature'], keyword: 'beach', radius: 50000, count: 1 },
    { name: 'airport', types: ['airport'], radius: 100000, count: 1 },
    { name: 'capital_cbd', types: [], keyword: 'CBD', radius: 100000, count: 1 }, // Special handling
    { name: 'childcare', types: ['establishment'], keyword: 'childcare daycare', radius: 5000, count: 3 },
  ];
  
  const allAmenities: any[] = [];
  
  // Search for each category
  for (const category of categories) {
    try {
      // Google Places Nearby Search
      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${lat},${lng}&` +
        `radius=${category.radius}&` +
        `type=${category.types.join('|')}&` +
        (category.keyword ? `keyword=${encodeURIComponent(category.keyword)}&` : '') +
        `key=${apiKey}`
      );
      
      const placesData = await placesResponse.json();
      
      if (placesData.results && placesData.results.length > 0) {
        // Get travel times using Distance Matrix API
        const destinations = placesData.results
          .slice(0, category.count)
          .map((place: any) => `${place.geometry.location.lat},${place.geometry.location.lng}`)
          .join('|');
        
        const distanceResponse = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?` +
          `origins=${lat},${lng}&` +
          `destinations=${destinations}&` +
          `mode=driving&` +
          `key=${apiKey}`
        );
        
        const distanceData = await distanceResponse.json();
        
        // Combine place data with distance data
        placesData.results.slice(0, category.count).forEach((place: any, index: number) => {
          const distanceElement = distanceData.rows[0]?.elements[index];
          if (distanceElement && distanceElement.status === 'OK') {
            allAmenities.push({
              name: place.name,
              category: category.name,
              distance: distanceElement.distance.value, // meters
              duration: Math.round(distanceElement.duration.value / 60), // minutes
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching ${category.name}:`, error);
      // Continue with other categories
    }
  }
  
  // Format output
  return formatProximityOutput(address, allAmenities);
}

function formatProximityOutput(address: string, amenities: any[]): string {
  let output = `${address}\n`;
  
  const categoryOrder = ['kindergarten', 'schools', 'supermarkets', 'hospitals', 
                         'train_station', 'bus_station', 'beach', 'airport', 
                         'capital_cbd', 'childcare'];
  
  categoryOrder.forEach(category => {
    const items = amenities
      .filter(a => a.category === category)
      .sort((a, b) => a.distance - b.distance); // Sort by distance
    
    items.forEach(item => {
      const distance = (item.distance / 1000).toFixed(1); // Convert to km
      const time = item.duration;
      const name = item.name;
      
      // Add category label only for schools and childcare
      const label = (category === 'schools') ? ' (School)' :
                    (category === 'childcare') ? ' (Child Care)' : '';
      
      output += `• ${distance} km (${time} mins), ${name}${label}\n`;
    });
  });
  
  return output.trim();
}

/**
 * Get investment data from ChatGPT via Make.com webhook
 */
async function getInvestmentDataFromChatGPT(
  propertyAddress: string,
  suburb: string,
  state: string,
  postcode: string,
  lga: string
): Promise<{ whyThisProperty: string; investmentHighlights: string }> {
  const makeWebhookUrl = process.env.MAKE_INVESTMENT_WEBHOOK_URL;
  
  if (!makeWebhookUrl) {
    throw new Error('MAKE_INVESTMENT_WEBHOOK_URL not configured');
  }
  
  const response = await fetch(makeWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyAddress: propertyAddress || '',
      suburb: suburb || '',
      state: state || '',
      postcode: postcode || '',
      lga: lga || '',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate investment data from ChatGPT');
  }
  
  const data = await response.json();
  
  return {
    whyThisProperty: data.whyThisProperty || '',
    investmentHighlights: data.investmentHighlights || '',
  };
}
```

---

## Environment Variables

**Add to `.env.local`:**
```env
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Make.com Webhooks
MAKE_INVESTMENT_WEBHOOK_URL=https://hook.us1.make.com/your-investment-webhook-url
```

---

## Make.com Scenario (Investment Data)

**Single Scenario or Two Separate:**

### Option: Single Scenario (Generates Both)
```
1. Webhook (Custom) - Receive address data
2. Set Variables - Extract address components
3. OpenAI (ChatGPT) - Generate investment reasons
   - Prompt: [7 investment reasons prompt]
4. OpenAI (ChatGPT) - Generate investment highlights
   - Prompt: [Investment highlights prompt]
5. Set Variables - Combine both outputs
6. Webhook Response - Return JSON
   {
     "whyThisProperty": "...",
     "investmentHighlights": "..."
   }
```

### Option: Two Separate Scenarios (More Flexible)
- Scenario 1: Generate Investment Reasons
- Scenario 2: Generate Investment Highlights
- Call both in parallel from API route

---

## Alternative: Pure ChatGPT Simulation (Option B)

If you want to keep it simple and match your current tool exactly, we can use pure ChatGPT simulation (no Google Maps API). This would:

1. Single Make.com webhook
2. ChatGPT simulates proximity search (like your current tool)
3. ChatGPT generates investment reasons
4. ChatGPT generates investment highlights
5. One API call, everything generated

**Pros:** Simple, fast, matches current tool  
**Cons:** Simulated distances (not 100% accurate)

---

## Recommendation

**For Production:** Use **Option C (Hybrid)** - Real APIs for proximity, ChatGPT for investment reasoning

**For MVP/Testing:** Use **Option B (Pure ChatGPT)** - Quick to implement, good enough for testing

**Decision Point:** Do you want 100% accurate proximity data, or is "good enough" ChatGPT simulation acceptable for now?

---

**Ready to implement either approach when you return!** 🚀
