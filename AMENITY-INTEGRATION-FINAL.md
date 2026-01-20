# Final Integration Plan: Amenity Distance with Peak Hour Travel Times

## Key Enhancement: 9am Weekday Peak Travel Modeling

**Enhancement Request:** Calculate travel times at **9am on a typical weekday** (not average conditions) to reflect:
- Peak hour traffic reality
- Real commuter experience for parents, tenants, workers
- More accurate liveability assessment
- Better investor value proposition

**Why This Matters:**
- Before: "Hospital is nearby" (vague)
- After: "St Vincent's Hospital – 14 min by car at 9am weekday – ideal for medical professionals" (specific, valuable)

---

## Implementation Strategy

### Hybrid Approach with Peak Hour Travel Times

1. **Proximity Data:** Google Maps Places API + Distance Matrix API (9am weekday)
2. **Investment Reasoning:** ChatGPT via Make.com (smart analysis)
3. **Investment Highlights:** ChatGPT via Make.com (infrastructure insights)

---

## Google Maps API Implementation

### Distance Matrix API with Peak Hour Traffic

**Key Parameters:**
- `departure_time`: Set to 9:00am on next Tuesday (typical workday, not Monday)
- `traffic_model`: `best_guess` (uses historical traffic data)
- `mode`: `driving`
- `avoid`: Optional (tolls, highways, ferries)

**API Call Example:**
```typescript
// Calculate travel time at 9am on a Tuesday (typical workday)
const calculate9amTravelTime = async (
  origin: string, // lat,lng of property
  destination: string, // lat,lng of amenity
  apiKey: string
) => {
  // Get next Tuesday at 9am
  const nextTuesday = getNextTuesdayAt9am();
  const departureTime = Math.floor(nextTuesday.getTime() / 1000); // Unix timestamp
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
    `origins=${origin}&` +
    `destinations=${destination}&` +
    `mode=driving&` +
    `departure_time=${departureTime}&` +
    `traffic_model=best_guess&` +
    `key=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.rows[0]?.elements[0]?.status === 'OK') {
    const element = data.rows[0].elements[0];
    return {
      distance: element.distance.value, // meters
      duration: element.duration.value, // seconds (includes traffic)
      duration_in_traffic: element.duration_in_traffic?.value || element.duration.value, // seconds with traffic
    };
  }
  
  return null;
};

// Helper: Get next Tuesday at 9am
function getNextTuesdayAt9am(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 2 = Tuesday
  
  // Calculate days until next Tuesday
  let daysUntilTuesday;
  if (dayOfWeek === 0) daysUntilTuesday = 2; // Sunday -> Tuesday (2 days)
  else if (dayOfWeek === 1) daysUntilTuesday = 1; // Monday -> Tuesday (1 day)
  else if (dayOfWeek === 2) {
    // If today is Tuesday, check if before 9am
    if (now.getHours() < 9) {
      daysUntilTuesday = 0; // Use today at 9am
    } else {
      daysUntilTuesday = 7; // Use next Tuesday
    }
  } else {
    daysUntilTuesday = (9 - dayOfWeek) % 7 || 7; // Days until next Tuesday
  }
  
  const nextTuesday = new Date(now);
  nextTuesday.setDate(now.getDate() + daysUntilTuesday);
  nextTuesday.setHours(9, 0, 0, 0); // 9:00 AM
  
  return nextTuesday;
}
```

---

## Complete Implementation Code

### Updated API Route with Peak Hour Travel Times

**File:** `form-app/src/app/api/generate-proximity/route.ts`

```typescript
import { NextResponse } from 'next/server';

/**
 * Generate proximity data with 9am weekday peak travel times
 * Uses Google Maps Places API + Distance Matrix API (with traffic)
 * + ChatGPT for investment reasoning
 */
export async function POST(request: Request) {
  try {
    const { 
      propertyAddress, 
      suburb, 
      state, 
      postcode, 
      lga,
      latitude,
      longitude
    } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }
    
    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Property coordinates are required. Please verify address in Step 0.' },
        { status: 400 }
      );
    }
    
    // PART 1: Get proximity data with 9am weekday travel times
    const proximityData = await getProximityWithPeakHourTimes(
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
 * Get next Tuesday at 9am (typical workday, avoids Monday)
 */
function getNextTuesdayAt9am(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 2 = Tuesday
  
  let daysUntilTuesday;
  if (dayOfWeek === 0) daysUntilTuesday = 2; // Sunday -> Tuesday (2 days)
  else if (dayOfWeek === 1) daysUntilTuesday = 1; // Monday -> Tuesday (1 day)
  else if (dayOfWeek === 2) {
    // If today is Tuesday, check if before 9am
    if (now.getHours() < 9) {
      daysUntilTuesday = 0; // Use today at 9am
    } else {
      daysUntilTuesday = 7; // Use next Tuesday
    }
  } else {
    daysUntilTuesday = (9 - dayOfWeek) % 7 || 7; // Days until next Tuesday
  }
  
  const nextTuesday = new Date(now);
  nextTuesday.setDate(now.getDate() + daysUntilTuesday);
  nextTuesday.setHours(9, 0, 0, 0); // 9:00 AM
  
  return nextTuesday;
}

/**
 * Get proximity data with 9am weekday peak travel times
 */
async function getProximityWithPeakHourTimes(
  lat: number,
  lng: number,
  address: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }
  
  // Calculate departure time: Next Tuesday at 9am
  const departureDate = getNextTuesdayAt9am();
  const departureTime = Math.floor(departureDate.getTime() / 1000); // Unix timestamp
  
  const origin = `${lat},${lng}`;
  
  // Define search categories with radius and counts
  const searchCategories = [
    { name: 'kindergarten', types: ['school'], keyword: 'kindergarten', radius: 5000, count: 1 },
    { name: 'schools', types: ['school'], radius: 5000, count: 3 },
    { name: 'supermarkets', types: ['supermarket'], radius: 5000, count: 2 },
    { name: 'hospitals', types: ['hospital'], radius: 10000, count: 2 },
    { name: 'train_station', types: ['subway_station', 'train_station'], radius: 10000, count: 1 },
    { name: 'bus_station', types: ['bus_station', 'transit_station'], radius: 10000, count: 1 },
    { name: 'beach', types: ['natural_feature'], keyword: 'beach', radius: 50000, count: 1 },
    { name: 'airport', types: ['airport'], radius: 100000, count: 1 },
    { name: 'childcare', types: ['establishment'], keyword: 'childcare daycare', radius: 5000, count: 3 },
  ];
  
  // Special handling for Capital City CBD
  const capitalCity = await getCapitalCityCBD(lat, lng, state || 'VIC', apiKey);
  
  const allAmenities: Array<{
    name: string;
    category: string;
    distance: number; // meters
    duration: number; // seconds (peak hour)
  }> = [];
  
  // Search for each category
  for (const category of searchCategories) {
    try {
      // Step 1: Find nearby places using Places API
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${lat},${lng}&` +
        `radius=${category.radius}&` +
        `type=${category.types[0]}&` +
        (category.keyword ? `keyword=${encodeURIComponent(category.keyword)}&` : '') +
        `key=${apiKey}`;
      
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json();
      
      if (placesData.results && placesData.results.length > 0) {
        // Step 2: Get travel times with peak hour traffic
        const places = placesData.results.slice(0, category.count);
        
        // Process each place individually to get accurate travel times
        for (const place of places) {
          const destLat = place.geometry.location.lat;
          const destLng = place.geometry.location.lng;
          const destination = `${destLat},${destLng}`;
          
          // Get 9am weekday travel time
          const travelTime = await calculate9amTravelTime(
            origin,
            destination,
            departureTime,
            apiKey
          );
          
          if (travelTime) {
            allAmenities.push({
              name: place.name,
              category: category.name,
              distance: travelTime.distance, // meters
              duration: travelTime.duration_in_traffic || travelTime.duration, // seconds (with traffic)
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${category.name}:`, error);
      // Continue with other categories
    }
  }
  
  // Add capital city CBD if found
  if (capitalCity) {
    allAmenities.push(capitalCity);
  }
  
  // Format output
  return formatProximityOutput(address, allAmenities);
}

/**
 * Calculate travel time at 9am weekday with traffic
 */
async function calculate9amTravelTime(
  origin: string,
  destination: string,
  departureTime: number,
  apiKey: string
): Promise<{ distance: number; duration: number; duration_in_traffic?: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${origin}&` +
      `destinations=${destination}&` +
      `mode=driving&` +
      `departure_time=${departureTime}&` +
      `traffic_model=best_guess&` +
      `key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance.value, // meters
        duration: element.duration.value, // seconds (base time)
        duration_in_traffic: element.duration_in_traffic?.value || element.duration.value, // seconds (with traffic)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
}

/**
 * Get Capital City CBD (special handling)
 */
async function getCapitalCityCBD(
  lat: number,
  lng: number,
  state: string,
  apiKey: string
): Promise<{ name: string; category: string; distance: number; duration: number } | null> {
  // Map states to capital cities
  const capitalCities: Record<string, string> = {
    'VIC': 'Melbourne CBD',
    'NSW': 'Sydney CBD',
    'QLD': 'Brisbane CBD',
    'WA': 'Perth CBD',
    'SA': 'Adelaide CBD',
    'TAS': 'Hobart CBD',
    'ACT': 'Canberra CBD',
    'NT': 'Darwin CBD',
  };
  
  const capitalCityName = capitalCities[state] || 'Melbourne CBD';
  
  try {
    // Geocode capital city CBD
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(capitalCityName + ', ' + state + ', Australia')}&` +
      `key=${apiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.results && geocodeData.results.length > 0) {
      const capitalLat = geocodeData.results[0].geometry.location.lat;
      const capitalLng = geocodeData.results[0].geometry.location.lng;
      const capitalDestination = `${capitalLat},${capitalLng}`;
      const origin = `${lat},${lng}`;
      
      const departureDate = getNextTuesdayAt9am();
      const departureTime = Math.floor(departureDate.getTime() / 1000);
      
      const travelTime = await calculate9amTravelTime(
        origin,
        capitalDestination,
        departureTime,
        apiKey
      );
      
      if (travelTime) {
        return {
          name: capitalCityName,
          category: 'capital_cbd',
          distance: travelTime.distance,
          duration: travelTime.duration_in_traffic || travelTime.duration,
        };
      }
    }
  } catch (error) {
    console.error('Error getting capital city CBD:', error);
  }
  
  return null;
}

/**
 * Format proximity output with peak hour travel times
 */
function formatProximityOutput(address: string, amenities: Array<{
  name: string;
  category: string;
  distance: number;
  duration: number;
}>): string {
  let output = `${address}\n`;
  
  // Define category order and display names
  const categoryOrder = [
    { key: 'kindergarten', label: '' },
    { key: 'schools', label: ' (School)' },
    { key: 'supermarkets', label: '' },
    { key: 'hospitals', label: '' },
    { key: 'train_station', label: '' },
    { key: 'bus_station', label: '' },
    { key: 'beach', label: '' },
    { key: 'airport', label: '' },
    { key: 'capital_cbd', label: '' },
    { key: 'childcare', label: ' (Child Care)' },
  ];
  
  categoryOrder.forEach(({ key, label }) => {
    const items = amenities
      .filter(a => a.category === key)
      .sort((a, b) => a.duration - b.duration); // Sort by travel time (peak hour)
    
    items.forEach(item => {
      const distance = (item.distance / 1000).toFixed(1); // Convert to km
      const timeMinutes = Math.round(item.duration / 60); // Convert to minutes
      const name = item.name;
      
      // Format: "• [DISTANCE] km ([TIME] mins), [NAME][LABEL]"
      // Note: Time shown is peak hour (9am weekday) travel time
      output += `• ${distance} km (${timeMinutes} mins), ${name}${label}\n`;
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

## Output Format Example

### Before (Average Conditions):
```
24 Smith Street, Fitzroy VIC 3065
• 0.5 km (5 mins), Fitzroy Primary School (School)
• 2.3 km (8 mins), St Vincent's Hospital
• 1.5 km (6 mins), Parliament Station
```

### After (9am Weekday Peak Hour):
```
24 Smith Street, Fitzroy VIC 3065
• 0.5 km (7 mins), Fitzroy Primary School (School)
• 2.3 km (14 mins), St Vincent's Hospital
• 1.5 km (9 mins), Parliament Station
```

**Key Difference:** Times reflect **realistic peak hour traffic** (7 mins vs 5 mins, 14 mins vs 8 mins)

---

## Enhanced Display Option (Future Enhancement)

Consider adding a note or tooltip in the UI:

```
Proximity *
Travel times calculated for 9am weekday peak hour traffic.
```

Or include in the generated text itself:
```
24 Smith Street, Fitzroy VIC 3065
(All travel times shown are for 9am weekday peak hour)

• 0.5 km (7 mins), Fitzroy Primary School (School)
• 2.3 km (14 mins), St Vincent's Hospital
...
```

---

## Benefits of Peak Hour Travel Times

### For Investors:
- ✅ **Realistic Assessment:** See actual commute times during peak hours
- ✅ **Better Investment Pitch:** "7 mins to school at 9am" is more compelling than "5 mins average"
- ✅ **Liveability Score:** More accurate measure of property convenience

### For Renters/Tenants:
- ✅ **Real-World Planning:** Know actual school run times
- ✅ **Commute Planning:** Accurate hospital/airport access times
- ✅ **Lifestyle Match:** Better understanding of daily commute reality

### For Agents/Developers:
- ✅ **Competitive Advantage:** More detailed, valuable proximity data
- ✅ **Professional Presentation:** Shows attention to detail
- ✅ **Sales Tool:** "14 mins to hospital at 9am" vs "8 mins" - demonstrates thoroughness

---

## API Costs & Optimization

### Google Maps Distance Matrix API Pricing:
- $5.00 per 1,000 requests (as of 2024)
- Each amenity = 1 request
- ~13 amenities per property = ~13 requests
- **Cost per property: ~$0.065**

### Optimization Strategies:

1. **Cache Results:**
   - Same address + same day = use cached results
   - Store in database or Redis

2. **Batch Requests:**
   - Use Distance Matrix API batch mode
   - Calculate multiple destinations in one request (up to 25)
   - **Reduces to ~1-2 requests per property**

3. **Fallback to Average:**
   - If API fails, use Places API distance (straight line)
   - Add note: "Approximate distance"

4. **Lazy Loading:**
   - Only calculate when user clicks "Generate"
   - Don't calculate on every form load

---

## Environment Variables

```env
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Make.com Webhooks
MAKE_INVESTMENT_WEBHOOK_URL=https://hook.us1.make.com/your-investment-webhook-url
```

---

## Make.com Scenario (Investment Data)

**Same as before - no changes needed for peak hour enhancement.**

---

## Testing Checklist

### Proximity Data:
- [ ] Verify 9am weekday travel times are calculated
- [ ] Test with different addresses (various states)
- [ ] Verify all categories are returned (13 amenities)
- [ ] Check formatting matches expected format
- [ ] Test with addresses far from amenities (fallback handling)
- [ ] Verify capital city CBD calculation
- [ ] Test API error handling (rate limits, failures)

### Travel Time Accuracy:
- [ ] Compare 9am weekday times vs average times (should show longer times)
- [ ] Verify times make sense for peak hour traffic
- [ ] Test with addresses in different traffic density areas

### Integration:
- [ ] Test full flow: Address → Generate → Auto-populate
- [ ] Verify data persists when navigating between steps
- [ ] Test error handling (no API key, API failure)
- [ ] Test with missing address data

---

## Future Enhancements

1. **Multiple Time Options:**
   - Allow user to choose: 7am, 9am, 5pm, average
   - Show comparison: "9am: 14 mins | Average: 8 mins"

2. **Public Transport Option:**
   - Calculate public transport times
   - Show both car and PT options

3. **Travel Time Visualization:**
   - Map showing travel time zones
   - Color-coded by travel time ranges

4. **Seasonal Traffic:**
   - Account for school holidays
   - Holiday period vs term time

5. **Alternative Routes:**
   - Show fastest route vs avoid tolls
   - Multiple route options

---

**Ready to implement with peak hour travel times!** 🚀

This enhancement makes the proximity data significantly more valuable and realistic for investors and renters.
