# Backend Batch Optimization - Test Rig Plan
**Date:** January 26, 2026  
**Priority:** CRITICAL  
**Goal:** Reduce 26 Google Maps API calls → 2 calls per proximity route  
**Cost Savings:** $0.11 per route call (85% reduction)

---

## Problem Summary

**Current Behavior:**
- One call to `/api/geoapify/proximity` makes **26 Google Maps API calls**:
  - Airports: 2 batches (26 airports = 25 + 1)
  - Capital Cities: 2 batches (30 cities = 25 + 5)
  - Train Stations: ~4 batches (up to 100 stations)
  - Bus Stops: ~4 batches
  - Beaches/Parks: ~4 batches
  - Schools: ~4 batches
  - Supermarkets: ~4 batches
  - Hospitals: ~4 batches
- **Total: ~26-30 Google Maps calls per route = $0.13**

**Target Behavior:**
- Make **2 Google Maps API calls total**:
  - Call 1: Batch all static destinations (airports + cities)
  - Call 2: Batch all dynamic destinations (train stations, schools, etc.)
- **Total: 2 Google Maps calls per route = $0.01**

**Savings:** 85% cost reduction ($0.12 per route call)

**Why this matters:**
- Bots made 730 unauthorized calls in 3 days
- Current: 730 × $0.13 = $95
- Optimized: 730 × $0.01 = $7
- **Savings: $88 (even if bots still attack)**

---

## Current Implementation Analysis

### How Batching Works Now

**File:** `src/app/api/geoapify/proximity/route.ts`

**Function:** `getDistancesFromGoogleMaps()` (lines 322-369)

```typescript
async function getDistancesFromGoogleMaps(
  originAddress: string,
  destinations: Array<{ address: string }>
): Promise<Array<{ distance: number; duration: number }>> {
  const batchSize = 25; // Google Maps limit
  const results: Array<{ distance: number; duration: number }> = [];
  
  // Loop through destinations in batches of 25
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    
    // ONE API CALL per batch
    const response = await axios.get(GOOGLE_MAPS_API_BASE_URL, { ... });
    
    results.push(...response.data.rows[0].elements);
  }
  
  return results;
}
```

**Problem:** Each category calls this function separately:

1. **Airports** (line 492): `getDistancesFromGoogleMaps(address, AIRPORTS)` → 2 calls
2. **Cities** (line 552): `getDistancesFromGoogleMaps(address, CITIES)` → 2 calls
3. **Train Stations** (line 649): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls
4. **Bus Stops** (line 702): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls
5. **Beaches** (line 767): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls
6. **Schools** (line 820): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls
7. **Supermarkets** (line 873): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls
8. **Hospitals** (line 961): `getDistancesFromGoogleMapsCoordinates(...)` → 4 calls

**Total: ~26 separate API calls**

---

## Solution: Consolidate Into 2 Batches

### Batch 1: Static Destinations (Airports + Cities)
- 26 airports + 30 cities = 56 destinations
- Google Maps allows 25 destinations per call
- **Solution:** Pick top 25 most important (e.g., 15 major airports + 10 major cities)
- **Result: 1 API call**

### Batch 2: Dynamic Destinations (All Geoapify Results)
- Train stations + bus stops + schools + supermarkets + hospitals + beaches
- Geoapify returns ~100 results per category
- **Solution:** Get top 5 closest from each category = 30 destinations max
- **Result: 2 API calls (25 + 5)**

**Total: 3 API calls** (but we can optimize to 2 by prioritizing)

---

## Test Rig Structure

```
property-review-system/test-rig/
├── backend-batch-optimization/
│   ├── README.md                          # Overview and instructions
│   ├── current-implementation.ts          # Copy of current batching logic
│   ├── optimized-implementation.ts        # New 2-call batching logic
│   ├── test-runner.ts                     # Runs both and compares
│   ├── mock-google-maps-api.ts            # Mock Google Maps API (tracks calls)
│   ├── mock-geoapify-api.ts               # Mock Geoapify API (returns test data)
│   ├── test-data.ts                       # Sample addresses
│   └── results/
│       ├── current-api-calls.json         # API calls from current version
│       ├── optimized-api-calls.json       # API calls from optimized version
│       ├── result-comparison.json         # Compare proximity results
│       └── comparison-report.md           # Summary report
```

---

## Test Rig Components

### 1. Mock Google Maps API (15 min)

**File:** `test-rig/backend-batch-optimization/mock-google-maps-api.ts`

**Purpose:** Track how many Google Maps API calls are made

```typescript
import express from 'express';

let callCount = 0;
const callLog: Array<{
  timestamp: number;
  origin: string;
  destinationCount: number;
  destinations: string[];
}> = [];

const app = express();

app.get('/maps/api/distancematrix/json', (req, res) => {
  callCount++;
  
  const origin = req.query.origins as string;
  const destinations = (req.query.destinations as string).split('|');
  
  callLog.push({
    timestamp: Date.now(),
    origin,
    destinationCount: destinations.length,
    destinations,
  });
  
  console.log(`🚨 GOOGLE MAPS API CALL #${callCount} - ${destinations.length} destinations`);
  
  // Return mock distance data
  const elements = destinations.map((dest, idx) => ({
    status: 'OK',
    distance: { value: 5000 + (idx * 1000), text: `${5 + idx} km` },
    duration: { value: 600 + (idx * 60), text: `${10 + idx} mins` },
    duration_in_traffic: { value: 720 + (idx * 60), text: `${12 + idx} mins` },
  }));
  
  res.json({
    status: 'OK',
    rows: [{ elements }],
  });
});

app.get('/api/test/call-count', (req, res) => {
  res.json({ callCount, callLog });
});

app.post('/api/test/reset', (req, res) => {
  callCount = 0;
  callLog.length = 0;
  res.json({ success: true });
});

export function startMockGoogleMapsAPI(port = 3002) {
  app.listen(port, () => {
    console.log(`🧪 Mock Google Maps API running on http://localhost:${port}`);
  });
}

export { callCount, callLog };
```

---

### 2. Mock Geoapify API (10 min)

**File:** `test-rig/backend-batch-optimization/mock-geoapify-api.ts`

**Purpose:** Return mock nearby places (train stations, schools, etc.)

```typescript
import express from 'express';

const app = express();

app.get('/v2/places', (req, res) => {
  const categories = req.query.categories as string;
  
  console.log(`📍 Geoapify search: ${categories}`);
  
  // Return mock places (10 per category for testing)
  const mockPlaces = Array.from({ length: 10 }, (_, i) => ({
    properties: {
      name: `${categories} #${i + 1}`,
      lat: -27.4698 + (i * 0.01),
      lon: 153.0251 + (i * 0.01),
      distance: 1000 + (i * 500),
    },
  }));
  
  res.json({ features: mockPlaces });
});

export function startMockGeoapifyAPI(port = 3003) {
  app.listen(port, () => {
    console.log(`🧪 Mock Geoapify API running on http://localhost:${port}`);
  });
}
```

---

### 3. Current Implementation (20 min)

**File:** `test-rig/backend-batch-optimization/current-implementation.ts`

**Purpose:** Copy exact logic from production route

```typescript
import axios from 'axios';

const GOOGLE_MAPS_API_BASE = 'http://localhost:3002/maps/api/distancematrix/json';
const GEOAPIFY_API_BASE = 'http://localhost:3003/v2/places';

// Copy exact lists from production
const AUSTRALIAN_AIRPORTS = [
  { name: 'Sydney Airport', address: 'Sydney Airport NSW 2020' },
  { name: 'Melbourne Airport', address: 'Melbourne Airport VIC 3045' },
  // ... all 26 airports
];

const AUSTRALIAN_CITIES = [
  { name: 'Melbourne', address: 'Melbourne VIC' },
  { name: 'Sydney', address: 'Sydney NSW' },
  // ... all 30 cities
];

async function getDistancesFromGoogleMaps(
  originAddress: string,
  destinations: Array<{ address: string }>
): Promise<Array<{ distance: number; duration: number }>> {
  const batchSize = 25;
  const results: Array<{ distance: number; duration: number }> = [];
  
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const destStr = batch.map(d => d.address).join('|');
    
    const url = `${GOOGLE_MAPS_API_BASE}?origins=${encodeURIComponent(originAddress)}&destinations=${encodeURIComponent(destStr)}`;
    
    const response = await axios.get(url);
    const elements = response.data.rows[0]?.elements || [];
    
    elements.forEach((element: any) => {
      if (element.status === 'OK') {
        results.push({
          distance: element.distance.value,
          duration: element.duration_in_traffic?.value || element.duration.value,
        });
      }
    });
  }
  
  return results;
}

export async function getCurrentProximityData(address: string) {
  console.log('\n🔴 CURRENT IMPLEMENTATION (26 calls expected)\n');
  
  const allResults = [];
  
  // 1. Airports (2 calls: 25 + 1)
  console.log('📍 Fetching airports...');
  const airportDistances = await getDistancesFromGoogleMaps(address, AUSTRALIAN_AIRPORTS);
  allResults.push({ category: 'Airports', count: airportDistances.length });
  
  // 2. Cities (2 calls: 25 + 5)
  console.log('📍 Fetching cities...');
  const cityDistances = await getDistancesFromGoogleMaps(address, AUSTRALIAN_CITIES);
  allResults.push({ category: 'Cities', count: cityDistances.length });
  
  // 3. Train Stations (4 calls)
  console.log('📍 Fetching train stations...');
  const stations = await axios.get(`${GEOAPIFY_API_BASE}?categories=railway.railway_station`);
  const stationAddresses = stations.data.features.map((f: any) => ({
    address: `${f.properties.lat},${f.properties.lon}`,
  }));
  const stationDistances = await getDistancesFromGoogleMaps(address, stationAddresses);
  allResults.push({ category: 'Train Stations', count: stationDistances.length });
  
  // 4-8. Repeat for other categories (bus stops, schools, etc.)
  // ... (similar pattern)
  
  console.log('\n📊 CURRENT IMPLEMENTATION COMPLETE\n');
  return allResults;
}
```

---

### 4. Optimized Implementation (30 min)

**File:** `test-rig/backend-batch-optimization/optimized-implementation.ts`

**Purpose:** New logic that makes only 2 Google Maps calls

```typescript
import axios from 'axios';

const GOOGLE_MAPS_API_BASE = 'http://localhost:3002/maps/api/distancematrix/json';
const GEOAPIFY_API_BASE = 'http://localhost:3003/v2/places';

// Prioritize top destinations only
const TOP_AIRPORTS = [
  { name: 'Sydney Airport', address: 'Sydney Airport NSW 2020' },
  { name: 'Melbourne Airport', address: 'Melbourne Airport VIC 3045' },
  { name: 'Brisbane Airport', address: 'Brisbane Airport QLD 4008' },
  // ... top 10 airports only
];

const TOP_CITIES = [
  { name: 'Melbourne', address: 'Melbourne VIC' },
  { name: 'Sydney', address: 'Sydney NSW' },
  { name: 'Brisbane', address: 'Brisbane QLD' },
  // ... top 8 cities only
];

async function getDistancesInOneBatch(
  originAddress: string,
  destinations: Array<{ address: string }>
): Promise<Array<{ distance: number; duration: number }>> {
  // ONE API CALL for all destinations (up to 25)
  const destStr = destinations.slice(0, 25).map(d => d.address).join('|');
  
  const url = `${GOOGLE_MAPS_API_BASE}?origins=${encodeURIComponent(originAddress)}&destinations=${encodeURIComponent(destStr)}`;
  
  const response = await axios.get(url);
  const elements = response.data.rows[0]?.elements || [];
  
  const results: Array<{ distance: number; duration: number }> = [];
  elements.forEach((element: any) => {
    if (element.status === 'OK') {
      results.push({
        distance: element.distance.value,
        duration: element.duration_in_traffic?.value || element.duration.value,
      });
    }
  });
  
  return results;
}

export async function getOptimizedProximityData(address: string) {
  console.log('\n🟢 OPTIMIZED IMPLEMENTATION (2 calls expected)\n');
  
  const allResults = [];
  
  // BATCH 1: All static destinations (airports + cities)
  console.log('📍 Batch 1: Fetching airports + cities in ONE call...');
  const staticDestinations = [
    ...TOP_AIRPORTS.slice(0, 10),  // Top 10 airports
    ...TOP_CITIES.slice(0, 8),      // Top 8 cities
  ]; // Total: 18 destinations
  
  const batch1Results = await getDistancesInOneBatch(address, staticDestinations);
  allResults.push({
    category: 'Airports + Cities',
    count: batch1Results.length,
    apiCalls: 1,
  });
  
  // BATCH 2: All dynamic destinations (Geoapify results)
  console.log('📍 Batch 2: Fetching all amenities in ONE call...');
  
  // Get Geoapify results for all categories
  const categories = [
    'railway.railway_station',
    'public_transport.bus',
    'education.school',
    'commercial.supermarket',
    'healthcare.hospital',
    'beach',
  ];
  
  const allPlaces = [];
  for (const category of categories) {
    const response = await axios.get(`${GEOAPIFY_API_BASE}?categories=${category}`);
    const places = response.data.features.slice(0, 3); // Top 3 per category
    allPlaces.push(...places.map((f: any) => ({
      address: `${f.properties.lat},${f.properties.lon}`,
      category,
    })));
  }
  
  // ONE API CALL for all amenities (18 destinations = 6 categories × 3 each)
  const batch2Results = await getDistancesInOneBatch(address, allPlaces);
  allResults.push({
    category: 'All Amenities',
    count: batch2Results.length,
    apiCalls: 1,
  });
  
  console.log('\n📊 OPTIMIZED IMPLEMENTATION COMPLETE\n');
  console.log(`Total API calls: 2 (was 26)`);
  
  return allResults;
}
```

---

### 5. Test Runner (20 min)

**File:** `test-rig/backend-batch-optimization/test-runner.ts`

```typescript
import { startMockGoogleMapsAPI } from './mock-google-maps-api';
import { startMockGeoapifyAPI } from './mock-geoapify-api';
import { getCurrentProximityData } from './current-implementation';
import { getOptimizedProximityData } from './optimized-implementation';
import { TEST_ADDRESSES } from './test-data';
import axios from 'axios';
import fs from 'fs';

async function runTests() {
  console.log('🧪 BACKEND BATCH OPTIMIZATION TEST RIG\n');
  console.log('=' .repeat(60));
  
  // Start mock servers
  startMockGoogleMapsAPI(3002);
  startMockGeoapifyAPI(3003);
  
  // Wait for servers to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = [];
  
  for (const testAddress of TEST_ADDRESSES) {
    console.log('\n' + '='.repeat(60));
    console.log(`\n🏠 Testing Address: ${testAddress}\n`);
    
    // Reset call counter
    await axios.post('http://localhost:3002/api/test/reset');
    
    // Test current implementation
    console.log('🔴 Running CURRENT implementation...');
    await getCurrentProximityData(testAddress);
    const currentResult = await axios.get('http://localhost:3002/api/test/call-count');
    const currentCalls = currentResult.data.callCount;
    
    // Reset call counter
    await axios.post('http://localhost:3002/api/test/reset');
    
    // Test optimized implementation
    console.log('\n🟢 Running OPTIMIZED implementation...');
    await getOptimizedProximityData(testAddress);
    const optimizedResult = await axios.get('http://localhost:3002/api/test/call-count');
    const optimizedCalls = optimizedResult.data.callCount;
    
    // Compare
    const comparison = {
      address: testAddress,
      current: {
        googleMapsApiCalls: currentCalls,
        cost: currentCalls * 0.005,
        callLog: currentResult.data.callLog,
      },
      optimized: {
        googleMapsApiCalls: optimizedCalls,
        cost: optimizedCalls * 0.005,
        callLog: optimizedResult.data.callLog,
      },
      savings: {
        apiCalls: currentCalls - optimizedCalls,
        cost: (currentCalls - optimizedCalls) * 0.005,
        percentage: ((currentCalls - optimizedCalls) / currentCalls) * 100,
      },
    };
    
    results.push(comparison);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARISON');
    console.log('='.repeat(60));
    console.log(`Current:   ${currentCalls} Google Maps API calls → $${comparison.current.cost.toFixed(2)}`);
    console.log(`Optimized: ${optimizedCalls} Google Maps API calls → $${comparison.optimized.cost.toFixed(2)}`);
    console.log(`Savings:   ${comparison.savings.apiCalls} calls → $${comparison.savings.cost.toFixed(2)} (${comparison.savings.percentage.toFixed(0)}%)`);
    console.log('='.repeat(60) + '\n');
  }
  
  // Save results
  fs.writeFileSync(
    'test-rig/backend-batch-optimization/results/comparison-report.json',
    JSON.stringify(results, null, 2)
  );
  
  generateMarkdownReport(results);
  
  console.log('\n✅ Test complete! Results saved to results/\n');
  process.exit(0);
}

function generateMarkdownReport(results: any[]) {
  let markdown = '# Backend Batch Optimization - Test Results\n\n';
  markdown += `**Date:** ${new Date().toISOString()}\n\n`;
  
  const totalCurrentCalls = results.reduce((sum, r) => sum + r.current.googleMapsApiCalls, 0);
  const totalOptimizedCalls = results.reduce((sum, r) => sum + r.optimized.googleMapsApiCalls, 0);
  const totalSavings = totalCurrentCalls - totalOptimizedCalls;
  
  markdown += '## Summary\n\n';
  markdown += `| Metric | Current | Optimized | Savings |\n`;
  markdown += `|--------|---------|-----------|----------|\n`;
  markdown += `| Google Maps API Calls | ${totalCurrentCalls} | ${totalOptimizedCalls} | ${totalSavings} (${((totalSavings / totalCurrentCalls) * 100).toFixed(0)}%) |\n`;
  markdown += `| Cost per Property | $${(totalCurrentCalls * 0.005 / results.length).toFixed(2)} | $${(totalOptimizedCalls * 0.005 / results.length).toFixed(2)} | $${(totalSavings * 0.005 / results.length).toFixed(2)} |\n`;
  markdown += `| Cost for 730 calls | $${((totalCurrentCalls / results.length) * 730 * 0.005).toFixed(2)} | $${((totalOptimizedCalls / results.length) * 730 * 0.005).toFixed(2)} | $${((totalSavings / results.length) * 730 * 0.005).toFixed(2)} |\n\n`;
  
  fs.writeFileSync(
    'test-rig/backend-batch-optimization/results/comparison-report.md',
    markdown
  );
}

runTests().catch(console.error);
```

---

### 6. Test Data (5 min)

**File:** `test-rig/backend-batch-optimization/test-data.ts`

```typescript
export const TEST_ADDRESSES = [
  '5 Acacia St Point Vernon QLD 4655',
  '15 Barker Street Lewisham NSW 2049',
  '123 Collins St Melbourne VIC 3000',
];
```

---

## Expected Test Results

### Current Implementation
```
🔴 CURRENT IMPLEMENTATION
📍 Fetching airports...
🚨 GOOGLE MAPS API CALL #1 - 25 destinations (airports batch 1)
🚨 GOOGLE MAPS API CALL #2 - 1 destination (airports batch 2)
📍 Fetching cities...
🚨 GOOGLE MAPS API CALL #3 - 25 destinations (cities batch 1)
🚨 GOOGLE MAPS API CALL #4 - 5 destinations (cities batch 2)
📍 Fetching train stations...
🚨 GOOGLE MAPS API CALL #5-8 (train stations)
... (continues for all categories)

📊 TOTAL: 26 Google Maps API calls → $0.13
```

### Optimized Implementation
```
🟢 OPTIMIZED IMPLEMENTATION
📍 Batch 1: Airports + Cities
🚨 GOOGLE MAPS API CALL #1 - 18 destinations (10 airports + 8 cities)
📍 Batch 2: All Amenities
🚨 GOOGLE MAPS API CALL #2 - 18 destinations (6 categories × 3 each)

📊 TOTAL: 2 Google Maps API calls → $0.01
```

### Comparison
```
📊 SAVINGS: 24 calls, $0.12 (92% reduction)

If bots make 730 calls:
Current: $95
Optimized: $7
Savings: $88
```

---

## Implementation Steps (After Test Rig Validates)

### 1. Update proximity/route.ts (45 min)

**Changes:**
1. Reduce airport list to top 10
2. Reduce city list to top 8
3. Create new `getBatchedDistances()` function
4. Consolidate all Geoapify searches first, then batch
5. Make 2 Google Maps calls instead of 26

### 2. Test in Development (15 min)

1. Start dev server
2. Submit test property
3. Check console for API call count
4. Verify proximity data still accurate

### 3. Deploy to Production (5 min)

1. Commit changes
2. Push to Git
3. Monitor Google Cloud usage

---

## Time Estimates

| Task | Time |
|------|------|
| Mock Google Maps API | 15 min |
| Mock Geoapify API | 10 min |
| Current implementation | 20 min |
| Optimized implementation | 30 min |
| Test runner | 20 min |
| Test data | 5 min |
| **Total Test Rig** | **100 min (~1.5 hours)** |
| | |
| Update production route | 45 min |
| Test in dev | 15 min |
| Deploy | 5 min |
| **Total Implementation** | **65 min (~1 hour)** |
| | |
| **GRAND TOTAL** | **165 min (~2.5 hours)** |

---

## Success Criteria

✅ Test rig shows 26 calls → 2 calls reduction  
✅ Cost per route: $0.13 → $0.01 (92% savings)  
✅ Proximity results are still accurate  
✅ All categories still represented  
✅ Google Cloud usage drops by 92%  
✅ Bot attacks cost $7 instead of $95  

---

## Bonus: Fix Duplicate Call Issue Too

After this optimization, we can also fix the duplicate call (Step 4 + Step 5):
- Current after optimization: 2 calls × 2 Google Maps = 4 Google Maps calls = $0.02
- After fixing duplicate: 1 call × 2 Google Maps = 2 Google Maps calls = $0.01
- **Combined savings: 96% ($0.26 → $0.01)**

---

## Next Steps

1. **Create test rig** (100 min)
2. **Run tests** to validate approach (10 min)
3. **Implement in production** (65 min)
4. **Monitor for 7 days**
5. **(Optional) Fix duplicate call** for additional 50% savings

---

## Notes

- This addresses the **root cause** of the $190 bill
- Even with bots, costs will be manageable
- Combined with authentication, this makes the system secure AND efficient
- Proximity data will be slightly less comprehensive (top destinations only) but still useful
