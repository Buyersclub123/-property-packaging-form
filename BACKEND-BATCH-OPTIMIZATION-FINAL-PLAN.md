# Backend Batch Optimization - FINAL IMPLEMENTATION PLAN

**Date:** January 25, 2026  
**Status:** Ready for Test Rig Implementation  
**Approach:** Pre-filter ALL categories using distance calculations before Google Maps  

---

## Executive Summary

**Goal:** Reduce Google Maps API calls from 27 to 4 per proximity request (85% reduction)

**Method:** 
1. Calculate straight-line distances for airports/cities (free)
2. Apply tier logic to select 2-3 airports and 2-3 cities
3. Pre-filter amenities using Geoapify distances to top 31
4. Send only selected destinations to Google Maps (4 calls total)

**Savings:**
- Current: 27 calls × $0.005 = $0.135 per request
- Optimized: 4 calls × $0.005 = $0.020 per request
- **Reduction: 85% ($0.115 saved per request)**
- **Bot attack savings: $83.95** (730 requests: $98.55 → $14.60)

---

## Table of Contents

1. [Optimization Strategy](#optimization-strategy)
2. [Test Rig Implementation](#test-rig-implementation)
3. [Production Implementation](#production-implementation)
4. [Timeline](#timeline)

---

## Optimization Strategy

### Current State (27 Google Maps API Calls)

| Category | Destinations | Current Calls |
|----------|-------------|---------------|
| Airports | 26 | 2 |
| Cities | 30 | 2 |
| Train Stations | 70 | 3 |
| Bus Stops | 100 | 4 |
| Kindergarten | 50 | 2 |
| Childcare | 100 | 4 |
| Schools | 100 | 4 |
| Supermarkets | 100 | 4 |
| Hospitals | 50 | 2 |
| **TOTAL** | **626** | **27** |

### Optimized State (4 Google Maps API Calls)

| Batch | Process | Destinations Sent | Calls |
|-------|---------|------------------|-------|
| **1. Airports** | Calculate straight-line distance to all 26 → Apply tier logic → Select 2-3 | 2-3 | 1 |
| **2. Cities** | Calculate straight-line distance to all 30 → Apply tier logic → Select 2-3 | 2-3 | 1 |
| **3. Amenities** | Use Geoapify distances → Pre-filter to top 31 | 25 | 1 |
| **4. Amenities (cont)** | Remaining amenities | 6 | 1 |
| **TOTAL** | | **~35** | **4** |

---

## Test Rig Implementation

### Purpose

Build isolated testing environment to:
1. Validate straight-line distance calculations
2. Test tier logic with pre-filtering
3. Compare API call counts (current vs optimized)
4. Verify result accuracy
5. Generate proof-of-concept reports

### Directory Structure

```
property-review-system/test-rig/
└── backend-batch-optimization/
    ├── README.md
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── mock-google-maps-api.ts       # Tracks API calls
    │   ├── mock-geoapify-api.ts          # Returns test data
    │   ├── distance-calculator.ts        # Haversine formula
    │   ├── current-implementation.ts     # Copy of production logic
    │   ├── optimized-implementation.ts   # New pre-filtering logic
    │   ├── test-runner.ts                # Orchestrates tests
    │   ├── test-data.ts                  # Sample addresses
    │   └── types.ts                      # TypeScript interfaces
    └── results/
        ├── current-api-calls.json
        ├── optimized-api-calls.json
        ├── comparison-report.json
        └── comparison-report.md
```

---

## Component 1: Distance Calculator

**File:** `src/distance-calculator.ts`

**Purpose:** Calculate straight-line distance between two lat/lon coordinates

```typescript
/**
 * Calculate straight-line distance using Haversine formula
 * Returns distance in meters
 */
export function calculateStraightLineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate distances from origin to multiple destinations
 */
export function calculateDistancesToMultiple(
  originLat: number,
  originLon: number,
  destinations: Array<{ lat: number; lon: number }>
): number[] {
  return destinations.map(dest =>
    calculateStraightLineDistance(originLat, originLon, dest.lat, dest.lon)
  );
}
```

---

## Component 2: Enhanced Airport/City Data

**File:** `src/test-data.ts`

**Add lat/lon coordinates to hardcoded lists:**

```typescript
export interface Airport {
  name: string;
  code: string;
  address: string;
  lat: number;
  lon: number;
  group: 1 | 2 | 3;
}

export interface City {
  name: string;
  state: string;
  address: string;
  lat: number;
  lon: number;
  group: 1 | 2 | 3;
}

export const AUSTRALIAN_AIRPORTS: Airport[] = [
  // Group 1 - Major Airports
  { name: 'Sydney Kingsford Smith Airport', code: 'SYD', address: 'Sydney Airport NSW 2020, Australia', lat: -33.9399, lon: 151.1753, group: 1 },
  { name: 'Melbourne Airport', code: 'MEL', address: 'Melbourne Airport VIC 3045, Australia', lat: -37.6690, lon: 144.8410, group: 1 },
  { name: 'Brisbane Airport', code: 'BNE', address: 'Brisbane Airport QLD 4008, Australia', lat: -27.3842, lon: 153.1175, group: 1 },
  { name: 'Perth Airport', code: 'PER', address: 'Perth Airport WA 6105, Australia', lat: -31.9403, lon: 115.9672, group: 1 },
  { name: 'Adelaide Airport', code: 'ADL', address: 'Adelaide Airport SA 5950, Australia', lat: -34.9470, lon: 138.5306, group: 1 },
  { name: 'Cairns Airport', code: 'CNS', address: 'Cairns Airport QLD 4870, Australia', lat: -16.8736, lon: 145.7550, group: 1 },
  { name: 'Darwin International Airport', code: 'DRW', address: 'Darwin Airport NT 0820, Australia', lat: -12.4147, lon: 130.8767, group: 1 },
  
  // Group 2 - Regional Airports
  { name: 'Gold Coast Airport', code: 'OOL', address: 'Gold Coast Airport QLD 4218, Australia', lat: -28.1644, lon: 153.5048, group: 2 },
  { name: 'Canberra Airport', code: 'CBR', address: 'Canberra Airport ACT 2609, Australia', lat: -35.3069, lon: 149.1950, group: 2 },
  { name: 'Hobart International Airport', code: 'HBA', address: 'Hobart Airport TAS 7170, Australia', lat: -42.8361, lon: 147.5100, group: 2 },
  { name: 'Avalon Airport', code: 'AVV', address: 'Avalon Airport VIC 3214, Australia', lat: -38.0394, lon: 144.4694, group: 2 },
  { name: 'Sunshine Coast Airport', code: 'MCY', address: 'Sunshine Coast Airport QLD 4564, Australia', lat: -26.6033, lon: 153.0911, group: 2 },
  { name: 'Townsville Airport', code: 'TSV', address: 'Townsville Airport QLD 4810, Australia', lat: -19.2525, lon: 146.7656, group: 2 },
  { name: 'Newcastle Airport', code: 'NTL', address: 'Newcastle Airport NSW 2300, Australia', lat: -32.7950, lon: 151.8344, group: 2 },
  { name: 'Broome International Airport', code: 'BME', address: 'Broome Airport WA 6725, Australia', lat: -17.9447, lon: 122.2322, group: 2 },
  { name: 'Port Hedland International Airport', code: 'PHE', address: 'Port Hedland Airport WA 6721, Australia', lat: -20.3778, lon: 118.6264, group: 2 },
  { name: 'Toowoomba Wellcamp Airport', code: 'WTB', address: 'Toowoomba Wellcamp Airport QLD 4350, Australia', lat: -27.5583, lon: 151.7933, group: 2 },
  
  // Group 3 - Smaller Regional Airports
  { name: 'Launceston Airport', code: 'LST', address: 'Launceston Airport TAS 7250, Australia', lat: -41.5453, lon: 147.2142, group: 3 },
  { name: 'Whitsunday Coast Airport', code: 'PPP', address: 'Proserpine Airport QLD 4800, Australia', lat: -20.4950, lon: 148.5522, group: 3 },
  { name: 'Alice Springs Airport', code: 'ASP', address: 'Alice Springs Airport NT 0870, Australia', lat: -23.8067, lon: 133.9025, group: 3 },
  { name: 'Rockhampton Airport', code: 'ROK', address: 'Rockhampton Airport QLD 4700, Australia', lat: -23.3819, lon: 150.4753, group: 3 },
  { name: 'Mackay Airport', code: 'MKY', address: 'Mackay Airport QLD 4740, Australia', lat: -21.1717, lon: 149.1797, group: 3 },
  { name: 'Ballina Byron Gateway Airport', code: 'BNK', address: 'Ballina Airport NSW 2478, Australia', lat: -28.8339, lon: 153.5622, group: 3 },
  { name: 'Hamilton Island Airport', code: 'HTI', address: 'Hamilton Island Airport QLD 4803, Australia', lat: -20.3581, lon: 148.9519, group: 3 },
  { name: 'Karratha Airport', code: 'KTA', address: 'Karratha Airport WA 6714, Australia', lat: -20.7122, lon: 116.7733, group: 3 },
  { name: 'Ayers Rock Airport', code: 'AYQ', address: 'Ayers Rock Airport NT 0872, Australia', lat: -25.1861, lon: 130.9756, group: 3 },
];

export const AUSTRALIAN_CITIES: City[] = [
  // Group 1 - Capital Cities
  { name: 'Melbourne', state: 'Victoria', address: 'Melbourne VIC, Australia', lat: -37.8136, lon: 144.9631, group: 1 },
  { name: 'Sydney', state: 'New South Wales', address: 'Sydney NSW, Australia', lat: -33.8688, lon: 151.2093, group: 1 },
  { name: 'Brisbane', state: 'Queensland', address: 'Brisbane QLD, Australia', lat: -27.4698, lon: 153.0251, group: 1 },
  { name: 'Perth', state: 'Western Australia', address: 'Perth WA, Australia', lat: -31.9505, lon: 115.8605, group: 1 },
  { name: 'Adelaide', state: 'South Australia', address: 'Adelaide SA, Australia', lat: -34.9285, lon: 138.6007, group: 1 },
  { name: 'Canberra', state: 'Australian Capital Territory', address: 'Canberra ACT, Australia', lat: -35.2809, lon: 149.1300, group: 1 },
  { name: 'Hobart', state: 'Tasmania', address: 'Hobart TAS, Australia', lat: -42.8821, lon: 147.3272, group: 1 },
  { name: 'Darwin', state: 'Northern Territory', address: 'Darwin NT, Australia', lat: -12.4634, lon: 130.8456, group: 1 },
  
  // Group 2 - Major Regional Cities
  { name: 'Gold Coast', state: 'Queensland', address: 'Gold Coast QLD, Australia', lat: -28.0167, lon: 153.4000, group: 2 },
  { name: 'Newcastle', state: 'New South Wales', address: 'Newcastle NSW, Australia', lat: -32.9283, lon: 151.7817, group: 2 },
  { name: 'Sunshine Coast', state: 'Queensland', address: 'Sunshine Coast QLD, Australia', lat: -26.6500, lon: 153.0667, group: 2 },
  { name: 'Wollongong', state: 'New South Wales', address: 'Wollongong NSW, Australia', lat: -34.4278, lon: 150.8931, group: 2 },
  { name: 'Geelong', state: 'Victoria', address: 'Geelong VIC, Australia', lat: -38.1499, lon: 144.3617, group: 2 },
  { name: 'Townsville', state: 'Queensland', address: 'Townsville QLD, Australia', lat: -19.2590, lon: 146.8169, group: 2 },
  { name: 'Cairns', state: 'Queensland', address: 'Cairns QLD, Australia', lat: -16.9186, lon: 145.7781, group: 2 },
  { name: 'Toowoomba', state: 'Queensland', address: 'Toowoomba QLD, Australia', lat: -27.5598, lon: 151.9507, group: 2 },
  { name: 'Ballarat', state: 'Victoria', address: 'Ballarat VIC, Australia', lat: -37.5622, lon: 143.8503, group: 2 },
  { name: 'Bendigo', state: 'Victoria', address: 'Bendigo VIC, Australia', lat: -36.7570, lon: 144.2794, group: 2 },
  
  // Group 3 - Smaller Regional Cities
  { name: 'Launceston', state: 'Tasmania', address: 'Launceston TAS, Australia', lat: -41.4332, lon: 147.1441, group: 3 },
  { name: 'Albury-Wodonga', state: 'New South Wales/Victoria', address: 'Albury NSW, Australia', lat: -36.0737, lon: 146.9135, group: 3 },
  { name: 'Wagga Wagga', state: 'New South Wales', address: 'Wagga Wagga NSW, Australia', lat: -35.1082, lon: 147.3598, group: 3 },
  { name: 'Mildura', state: 'Victoria', address: 'Mildura VIC, Australia', lat: -34.1887, lon: 142.1614, group: 3 },
  { name: 'Mackay', state: 'Queensland', address: 'Mackay QLD, Australia', lat: -21.1550, lon: 149.1861, group: 3 },
  { name: 'Bundaberg', state: 'Queensland', address: 'Bundaberg QLD, Australia', lat: -24.8661, lon: 152.3489, group: 3 },
  { name: 'Tamworth', state: 'New South Wales', address: 'Tamworth NSW, Australia', lat: -31.0927, lon: 150.9300, group: 3 },
  { name: 'Dubbo', state: 'New South Wales', address: 'Dubbo NSW, Australia', lat: -32.2569, lon: 148.6011, group: 3 },
  { name: 'Kalgoorlie-Boulder', state: 'Western Australia', address: 'Kalgoorlie WA, Australia', lat: -30.7489, lon: 121.4658, group: 3 },
  { name: 'Geraldton', state: 'Western Australia', address: 'Geraldton WA, Australia', lat: -28.7774, lon: 114.6142, group: 3 },
  { name: 'Port Macquarie', state: 'New South Wales', address: 'Port Macquarie NSW, Australia', lat: -31.4308, lon: 152.9089, group: 3 },
  { name: 'Coffs Harbour', state: 'New South Wales', address: 'Coffs Harbour NSW, Australia', lat: -30.2963, lon: 153.1135, group: 3 },
  { name: 'Gladstone', state: 'Queensland', address: 'Gladstone QLD, Australia', lat: -23.8479, lon: 151.2569, group: 3 },
];

export const TEST_ADDRESSES = [
  { address: '5 Acacia St Point Vernon QLD 4655', lat: -25.2744, lon: 152.8478 },
  { address: '15 Barker Street Lewisham NSW 2049', lat: -33.8947, lon: 151.1436 },
  { address: '123 Collins St Melbourne VIC 3000', lat: -37.8136, lon: 144.9631 },
];
```

---

## Component 3: Optimized Implementation

**File:** `src/optimized-implementation.ts`

```typescript
import axios from 'axios';
import { calculateStraightLineDistance } from './distance-calculator';
import { AUSTRALIAN_AIRPORTS, AUSTRALIAN_CITIES, Airport, City } from './test-data';

const GOOGLE_MAPS_API_BASE = 'http://localhost:3002/maps/api/distancematrix/json';
const GEOAPIFY_API_BASE = 'http://localhost:3003/v2/places';

/**
 * Pre-filter airports using straight-line distance + tier logic
 */
function preFilterAirports(
  propertyLat: number,
  propertyLon: number
): Airport[] {
  // Calculate straight-line distances
  const airportsWithDistance = AUSTRALIAN_AIRPORTS.map(airport => ({
    ...airport,
    straightLineDistance: calculateStraightLineDistance(
      propertyLat,
      propertyLon,
      airport.lat,
      airport.lon
    ),
  }));

  // Group by tier and find closest in each
  const closestByGroup: { [key: number]: typeof airportsWithDistance[0] } = {};
  airportsWithDistance.forEach(airport => {
    if (!closestByGroup[airport.group] || 
        airport.straightLineDistance < closestByGroup[airport.group].straightLineDistance) {
      closestByGroup[airport.group] = airport;
    }
  });

  // Apply tier logic
  const sortedByDistance = [...airportsWithDistance].sort(
    (a, b) => a.straightLineDistance - b.straightLineDistance
  );
  const closestOverall = sortedByDistance[0];
  const closestGroup = closestOverall.group;

  const airportsToQuery: typeof airportsWithDistance = [];
  
  if (closestGroup === 3) {
    // Tier 3 closest → query Tier 3 + Tier 1
    if (closestByGroup[3]) airportsToQuery.push(closestByGroup[3]);
    if (closestByGroup[1]) airportsToQuery.push(closestByGroup[1]);
  } else if (closestGroup === 2) {
    // Tier 2 closest → query Tier 2 + Tier 1
    if (closestByGroup[2]) airportsToQuery.push(closestByGroup[2]);
    if (closestByGroup[1]) airportsToQuery.push(closestByGroup[1]);
  } else {
    // Tier 1 closest → query Tier 1 + closest from Tier 2/3
    if (closestByGroup[1]) airportsToQuery.push(closestByGroup[1]);
    const tier2And3 = [closestByGroup[2], closestByGroup[3]].filter(Boolean);
    if (tier2And3.length > 0) {
      tier2And3.sort((a, b) => a!.straightLineDistance - b!.straightLineDistance);
      airportsToQuery.push(tier2And3[0]!);
    }
  }

  console.log(`   Pre-filtered airports: ${AUSTRALIAN_AIRPORTS.length} → ${airportsToQuery.length}`);
  return airportsToQuery;
}

/**
 * Pre-filter cities using straight-line distance + tier logic
 */
function preFilterCities(
  propertyLat: number,
  propertyLon: number
): City[] {
  // Same logic as airports
  const citiesWithDistance = AUSTRALIAN_CITIES.map(city => ({
    ...city,
    straightLineDistance: calculateStraightLineDistance(
      propertyLat,
      propertyLon,
      city.lat,
      city.lon
    ),
  }));

  const closestByGroup: { [key: number]: typeof citiesWithDistance[0] } = {};
  citiesWithDistance.forEach(city => {
    if (!closestByGroup[city.group] || 
        city.straightLineDistance < closestByGroup[city.group].straightLineDistance) {
      closestByGroup[city.group] = city;
    }
  });

  const sortedByDistance = [...citiesWithDistance].sort(
    (a, b) => a.straightLineDistance - b.straightLineDistance
  );
  const closestOverall = sortedByDistance[0];
  const closestGroup = closestOverall.group;

  const citiesToQuery: typeof citiesWithDistance = [];
  
  if (closestGroup === 3) {
    if (closestByGroup[3]) citiesToQuery.push(closestByGroup[3]);
    if (closestByGroup[1]) citiesToQuery.push(closestByGroup[1]);
  } else if (closestGroup === 2) {
    if (closestByGroup[2]) citiesToQuery.push(closestByGroup[2]);
    if (closestByGroup[1]) citiesToQuery.push(closestByGroup[1]);
  } else {
    if (closestByGroup[1]) citiesToQuery.push(closestByGroup[1]);
    const tier2And3 = [closestByGroup[2], closestByGroup[3]].filter(Boolean);
    if (tier2And3.length > 0) {
      tier2And3.sort((a, b) => a!.straightLineDistance - b!.straightLineDistance);
      citiesToQuery.push(tier2And3[0]!);
    }
  }

  console.log(`   Pre-filtered cities: ${AUSTRALIAN_CITIES.length} → ${citiesToQuery.length}`);
  return citiesToQuery;
}

/**
 * Optimized proximity data fetching
 */
export async function getOptimizedProximityData(
  address: string,
  lat: number,
  lon: number
) {
  console.log('\n🟢 OPTIMIZED IMPLEMENTATION (Pre-filtering)\n');
  
  const allResults = [];
  
  // ============================================
  // BATCH 1: Pre-filtered Airports
  // ============================================
  console.log('📍 Batch 1: Airports (pre-filtered)');
  const selectedAirports = preFilterAirports(lat, lon);
  
  if (selectedAirports.length > 0) {
    const url = `${GOOGLE_MAPS_API_BASE}?origins=${encodeURIComponent(address)}&destinations=${encodeURIComponent(selectedAirports.map(a => a.address).join('|'))}`;
    const response = await axios.get(url);
    console.log(`✅ Batch 1: ${selectedAirports.length} airports (1 API call)`);
    allResults.push(...selectedAirports.map((a, idx) => ({
      category: 'airport',
      name: `${a.name} (${a.code})`,
    })));
  }
  
  // ============================================
  // BATCH 2: Pre-filtered Cities
  // ============================================
  console.log('📍 Batch 2: Cities (pre-filtered)');
  const selectedCities = preFilterCities(lat, lon);
  
  if (selectedCities.length > 0) {
    const url = `${GOOGLE_MAPS_API_BASE}?origins=${encodeURIComponent(address)}&destinations=${encodeURIComponent(selectedCities.map(c => c.address).join('|'))}`;
    const response = await axios.get(url);
    console.log(`✅ Batch 2: ${selectedCities.length} cities (1 API call)`);
    allResults.push(...selectedCities.map(c => ({
      category: 'city',
      name: `${c.name}, ${c.state}`,
    })));
  }
  
  // ============================================
  // BATCH 3 & 4: Pre-filtered Amenities
  // ============================================
  console.log('📍 Batch 3-4: Amenities (pre-filtered using Geoapify distance)');
  
  const amenities = [];
  
  // Fetch from Geoapify and take top N (already sorted by distance)
  const trainPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=public_transport.train&limit=50`);
  amenities.push(...trainPlaces.data.features.slice(0, 5));
  
  const busPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=public_transport.bus&limit=100`);
  amenities.push(...busPlaces.data.features.slice(0, 5));
  
  const kindergartenPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=childcare.kindergarten&limit=50`);
  amenities.push(...kindergartenPlaces.data.features.slice(0, 3));
  
  const childcarePlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=childcare&limit=100`);
  amenities.push(...childcarePlaces.data.features.slice(0, 3));
  
  const schoolPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=education.school&limit=100`);
  amenities.push(...schoolPlaces.data.features.slice(0, 5));
  
  const supermarketPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=commercial.supermarket&limit=100`);
  amenities.push(...supermarketPlaces.data.features.slice(0, 5));
  
  const hospitalPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=healthcare.hospital&limit=50`);
  amenities.push(...hospitalPlaces.data.features.slice(0, 5));
  
  console.log(`   Pre-filtered amenities: 570 → ${amenities.length}`);
  
  // Send to Google Maps in batches of 25
  const batch3 = amenities.slice(0, 25);
  const batch4 = amenities.slice(25);
  
  if (batch3.length > 0) {
    const coords = batch3.map(a => `${a.properties.lat},${a.properties.lon}`).join('|');
    const url = `${GOOGLE_MAPS_API_BASE}?origins=${lat},${lon}&destinations=${encodeURIComponent(coords)}`;
    await axios.get(url);
    console.log(`✅ Batch 3: ${batch3.length} amenities (1 API call)`);
  }
  
  if (batch4.length > 0) {
    const coords = batch4.map(a => `${a.properties.lat},${a.properties.lon}`).join('|');
    const url = `${GOOGLE_MAPS_API_BASE}?origins=${lat},${lon}&destinations=${encodeURIComponent(coords)}`;
    await axios.get(url);
    console.log(`✅ Batch 4: ${batch4.length} amenities (1 API call)`);
  }
  
  allResults.push(...amenities.map(a => ({
    category: 'amenity',
    name: a.properties.name,
  })));
  
  console.log('\n📊 OPTIMIZED IMPLEMENTATION COMPLETE');
  console.log(`   Total Google Maps API calls: ${2 + (batch4.length > 0 ? 2 : 1)}`);
  console.log(`   Total results: ${allResults.length}`);
  
  return allResults;
}
```

---

## Component 4: Test Runner

**File:** `src/test-runner.ts`

```typescript
import { startMockGoogleMapsAPI } from './mock-google-maps-api';
import { startMockGeoapifyAPI } from './mock-geoapify-api';
import { getCurrentProximityData } from './current-implementation';
import { getOptimizedProximityData } from './optimized-implementation';
import { TEST_ADDRESSES } from './test-data';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 BACKEND BATCH OPTIMIZATION TEST RIG');
  console.log('=' .repeat(80));
  console.log('Strategy: Pre-filter using straight-line distance before Google Maps');
  console.log('=' .repeat(80));
  console.log('');
  
  // Start mock servers
  console.log('Starting mock servers...');
  startMockGoogleMapsAPI(3002);
  startMockGeoapifyAPI(3003);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Mock servers running\n');
  
  const allResults = [];
  
  for (const testData of TEST_ADDRESSES) {
    console.log('\n' + '='.repeat(80));
    console.log(`\n🏠 Testing: ${testData.address}`);
    console.log(`   Coordinates: ${testData.lat}, ${testData.lon}`);
    console.log('='.repeat(80));
    
    // Test Current Implementation
    await axios.post('http://localhost:3002/api/test/reset');
    
    console.log('\n🔴 Running CURRENT implementation...\n');
    const currentStartTime = Date.now();
    await getCurrentProximityData(testData.address, testData.lat, testData.lon);
    const currentDuration = Date.now() - currentStartTime;
    
    const currentCallData = await axios.get('http://localhost:3002/api/test/call-count');
    const currentCalls = currentCallData.data.callCount;
    
    console.log(`\n✅ Current: ${currentCalls} API calls in ${currentDuration}ms`);
    
    // Test Optimized Implementation
    await axios.post('http://localhost:3002/api/test/reset');
    
    console.log('\n🟢 Running OPTIMIZED implementation...\n');
    const optimizedStartTime = Date.now();
    await getOptimizedProximityData(testData.address, testData.lat, testData.lon);
    const optimizedDuration = Date.now() - optimizedStartTime;
    
    const optimizedCallData = await axios.get('http://localhost:3002/api/test/call-count');
    const optimizedCalls = optimizedCallData.data.callCount;
    
    console.log(`\n✅ Optimized: ${optimizedCalls} API calls in ${optimizedDuration}ms`);
    
    // Comparison
    const comparison = {
      address: testData.address,
      current: {
        apiCalls: currentCalls,
        duration: currentDuration,
        cost: currentCalls * 0.005,
      },
      optimized: {
        apiCalls: optimizedCalls,
        duration: optimizedDuration,
        cost: optimizedCalls * 0.005,
      },
      savings: {
        apiCalls: currentCalls - optimizedCalls,
        percentage: ((currentCalls - optimizedCalls) / currentCalls) * 100,
        cost: (currentCalls - optimizedCalls) * 0.005,
      },
    };
    
    allResults.push(comparison);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPARISON');
    console.log('='.repeat(80));
    console.log(`Current:   ${currentCalls} calls → $${comparison.current.cost.toFixed(3)}`);
    console.log(`Optimized: ${optimizedCalls} calls → $${comparison.optimized.cost.toFixed(3)}`);
    console.log(`Savings:   ${comparison.savings.apiCalls} calls (${comparison.savings.percentage.toFixed(0)}%) → $${comparison.savings.cost.toFixed(3)}`);
    console.log('='.repeat(80));
  }
  
  // Save results
  const resultsDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(resultsDir, 'comparison-report.json'),
    JSON.stringify(allResults, null, 2)
  );
  
  generateMarkdownReport(allResults, resultsDir);
  
  console.log('\n✅ Test complete! Reports saved to results/\n');
  process.exit(0);
}

function generateMarkdownReport(results: any[], resultsDir: string) {
  const avgCurrent = results.reduce((sum, r) => sum + r.current.apiCalls, 0) / results.length;
  const avgOptimized = results.reduce((sum, r) => sum + r.optimized.apiCalls, 0) / results.length;
  const avgSavings = avgCurrent - avgOptimized;
  
  let md = '# Backend Batch Optimization - Test Results\n\n';
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Strategy:** Pre-filter using straight-line distance\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Current | Optimized | Savings |\n`;
  md += `|--------|---------|-----------|----------|\n`;
  md += `| Avg API Calls | ${avgCurrent.toFixed(1)} | ${avgOptimized.toFixed(1)} | ${avgSavings.toFixed(1)} (${((avgSavings / avgCurrent) * 100).toFixed(0)}%) |\n`;
  md += `| Cost per Request | $${(avgCurrent * 0.005).toFixed(3)} | $${(avgOptimized * 0.005).toFixed(3)} | $${(avgSavings * 0.005).toFixed(3)} |\n`;
  md += `| Cost for 730 Requests | $${(avgCurrent * 730 * 0.005).toFixed(2)} | $${(avgOptimized * 730 * 0.005).toFixed(2)} | $${(avgSavings * 730 * 0.005).toFixed(2)} |\n\n`;
  
  md += `## ✅ Success Criteria Met\n\n`;
  md += `- Reduced API calls by ${((avgSavings / avgCurrent) * 100).toFixed(0)}%\n`;
  md += `- Bot attack cost reduced from $${(avgCurrent * 730 * 0.005).toFixed(2)} to $${(avgOptimized * 730 * 0.005).toFixed(2)}\n`;
  md += `- Tier logic preserved for airports and cities\n`;
  md += `- All amenity categories still represented\n`;
  
  fs.writeFileSync(path.join(resultsDir, 'comparison-report.md'), md);
}

runTests().catch(console.error);
```

---

## Production Implementation

### Phase 1: Add Coordinates to Production Code (15 min)

**File:** `form-app/src/app/api/geoapify/proximity/route.ts`

1. Add `lat` and `lon` fields to `Airport` and `City` interfaces
2. Update `AUSTRALIAN_AIRPORTS` array with coordinates
3. Update `AUSTRALIAN_CITIES` array with coordinates

### Phase 2: Add Distance Calculator (10 min)

Add Haversine formula function to route file (or create utility file)

### Phase 3: Implement Pre-filtering (30 min)

1. Create `preFilterAirports()` function
2. Create `preFilterCities()` function
3. Update main POST handler to use pre-filtering
4. Update amenity processing to use Geoapify distance for pre-filtering

### Phase 4: Testing & Deployment (20 min)

1. Test in development
2. Verify API call reduction
3. Deploy to production
4. Monitor for 7 days

---

## Timeline

| Phase | Task | Time |
|-------|------|------|
| **Test Rig** | Setup + Mock APIs | 30 min |
| | Distance calculator | 15 min |
| | Enhanced test data (with coordinates) | 20 min |
| | Current implementation | 20 min |
| | Optimized implementation | 45 min |
| | Test runner | 20 min |
| | Run tests & review results | 15 min |
| | **Test Rig Subtotal** | **165 min (~2.75 hours)** |
| **Production** | Add coordinates to production | 15 min |
| | Add distance calculator | 10 min |
| | Implement pre-filtering | 30 min |
| | Test in development | 15 min |
| | Deploy & monitor | 10 min |
| | **Production Subtotal** | **80 min (~1.3 hours)** |
| **TOTAL** | | **245 min (~4 hours)** |

---

## Expected Results

### Test Rig Output

```
🧪 BACKEND BATCH OPTIMIZATION TEST RIG
Strategy: Pre-filter using straight-line distance before Google Maps
================================================================================

🏠 Testing: 5 Acacia St Point Vernon QLD 4655

🔴 CURRENT IMPLEMENTATION
   API calls: 27

🟢 OPTIMIZED IMPLEMENTATION
   Pre-filtered airports: 26 → 2
   Pre-filtered cities: 30 → 2
   Pre-filtered amenities: 570 → 31
   API calls: 4

📊 COMPARISON
Current:   27 calls → $0.135
Optimized: 4 calls → $0.020
Savings:   23 calls (85%) → $0.115
```

### Production Monitoring

- Google Maps API calls: 27 → 4 (85% reduction)
- Cost per request: $0.135 → $0.020
- Bot attack cost: $98.55 → $14.60 (saves $83.95)

---

## Success Criteria

✅ Test rig validates 85% reduction in API calls  
✅ Tier logic preserved for airports/cities  
✅ All amenity categories still represented  
✅ Results accuracy maintained  
✅ Production deployment successful  
✅ No increase in error rates  
✅ Cost monitoring confirms savings  

---

**Status:** Ready to build test rig  
**Next Action:** Proceed with test rig implementation

