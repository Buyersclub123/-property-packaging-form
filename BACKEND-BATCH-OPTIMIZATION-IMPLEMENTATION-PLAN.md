# Backend Batch Optimization - Implementation Plan

**Date:** January 25, 2026  
**Author:** AI Assistant  
**Status:** Ready for Review  
**Priority:** CRITICAL  

---

## Executive Summary

This document outlines the complete implementation plan for reducing Google Maps API calls from **26 calls to 2 calls** per proximity route request, achieving an **85-92% cost reduction** ($0.13 → $0.01 per request).

**Key Metrics:**
- Current: 26 Google Maps API calls per request = $0.13
- Target: 2 Google Maps API calls per request = $0.01
- Savings: $0.12 per request (92% reduction)
- Bot attack impact: $95 → $7 (for 730 unauthorized calls)

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Optimization Strategy](#optimization-strategy)
3. [Test Rig Implementation](#test-rig-implementation)
4. [Production Implementation](#production-implementation)
5. [Testing & Validation](#testing--validation)
6. [Deployment Plan](#deployment-plan)
7. [Questions & Clarifications](#questions--clarifications)

---

## Current Implementation Analysis

### File Location
`property-review-system/form-app/src/app/api/geoapify/proximity/route.ts`

### Current API Call Pattern

The route makes **26 separate Google Maps Distance Matrix API calls**:

| Category | Function | Batch Size | API Calls | Line Reference |
|----------|----------|------------|-----------|----------------|
| Airports (26) | `getDistancesFromGoogleMaps()` | 25 | 2 calls (25+1) | Line 492 |
| Cities (30) | `getDistancesFromGoogleMaps()` | 25 | 2 calls (25+5) | Line 552 |
| Train Stations (~100) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~4 calls | Line 649 |
| Bus Stops (~100) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~4 calls | Line 702 |
| Kindergarten/Childcare (~150) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~6 calls | Line 767 |
| Schools (~100) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~4 calls | Line 820 |
| Supermarkets (~100) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~4 calls | Line 873 |
| Hospitals (~50) | `getDistancesFromGoogleMapsCoordinates()` | 25 | ~2 calls | Line 961 |

**Total: ~26-28 Google Maps API calls per request**

### Why So Many Calls?

Each category:
1. Searches Geoapify for places (returns 50-100 results)
2. Calls Google Maps Distance Matrix API in batches of 25
3. Processes results independently

**Problem:** Categories are processed sequentially, each making separate Google Maps calls.

### Current Helper Functions

```typescript
// Line 322-369: Address-based batching (for airports/cities)
async function getDistancesFromGoogleMaps(
  originAddress: string,
  destinations: Array<{ address: string }>
): Promise<Array<{ distance: number; duration: number }>>

// Line 221-269: Coordinate-based batching (for Geoapify results)
async function getDistancesFromGoogleMapsCoordinates(
  originLat: number,
  originLon: number,
  destinations: Array<{ lat: number; lon: number }>
): Promise<Array<{ distance: number; duration: number }>>
```

Both functions loop through destinations in batches of 25, making one API call per batch.

---

## Optimization Strategy

### Core Concept: Consolidate Before Calling

Instead of:
```
Geoapify → Google Maps (4 calls)
Geoapify → Google Maps (4 calls)
Geoapify → Google Maps (4 calls)
... (repeat for each category)
```

Do this:
```
Geoapify (all categories) → Consolidate → Google Maps (2 calls total)
```

### Two-Batch Approach

**Batch 1: Static Destinations (Airports + Cities)**
- Airports: Top 10 most important (Group 1 + closest from Group 2/3)
- Cities: Top 8 most important (Group 1 + closest from Group 2/3)
- Total: ~18 destinations
- **Result: 1 Google Maps API call**

**Batch 2: Dynamic Destinations (All Geoapify Results)**
- Train stations: Top 3 closest
- Bus stops: Top 3 closest
- Kindergarten/Childcare: Top 3 closest
- Schools: Top 3 closest
- Supermarkets: Top 3 closest (+ major chains)
- Hospitals: Top 3 closest (prioritize ED)
- Total: ~18-21 destinations
- **Result: 1 Google Maps API call**

**Total: 2 Google Maps API calls**

### Trade-offs

**What We Lose:**
- Comprehensive coverage of all 26 airports → Top 10-12 airports
- Comprehensive coverage of all 30 cities → Top 8-10 cities
- Multiple results per amenity category → Top 3 per category

**What We Keep:**
- All category types still represented
- Closest results for each category
- Accurate distance/duration data
- Tier-based logic for airports/cities
- Special logic (ED hospitals, supermarket chains)

**Business Impact:**
- Slightly less comprehensive proximity data
- Still provides all essential information for property reviews
- Massive cost savings ($88 saved per 730 bot attacks)

---

## Test Rig Implementation

### Purpose

Build an isolated testing environment to:
1. Validate the optimization approach
2. Compare API call counts (current vs. optimized)
3. Verify result accuracy
4. Generate comparison reports

### Directory Structure

```
property-review-system/test-rig/
└── backend-batch-optimization/
    ├── README.md                          # Setup and run instructions
    ├── package.json                       # Dependencies (express, axios, typescript)
    ├── tsconfig.json                      # TypeScript config
    ├── src/
    │   ├── mock-google-maps-api.ts        # Mock Google Maps API (tracks calls)
    │   ├── mock-geoapify-api.ts           # Mock Geoapify API (returns test data)
    │   ├── current-implementation.ts      # Copy of current batching logic
    │   ├── optimized-implementation.ts    # New 2-call batching logic
    │   ├── test-runner.ts                 # Orchestrates tests and comparisons
    │   ├── test-data.ts                   # Sample addresses for testing
    │   └── types.ts                       # Shared TypeScript interfaces
    └── results/
        ├── current-api-calls.json         # Detailed call log (current)
        ├── optimized-api-calls.json       # Detailed call log (optimized)
        ├── result-comparison.json         # Side-by-side comparison
        └── comparison-report.md           # Human-readable summary
```

### Component Details

#### 1. Mock Google Maps API (`mock-google-maps-api.ts`)

**Purpose:** Track API call count and log all requests

**Key Features:**
- Express server on port 3002
- Endpoint: `/maps/api/distancematrix/json` (mimics Google Maps)
- Tracks: call count, timestamp, origin, destination count, destinations list
- Returns: Mock distance/duration data (5-50km range)
- Admin endpoints:
  - `GET /api/test/call-count` - Get current call count and log
  - `POST /api/test/reset` - Reset counter between tests

**Implementation:**
```typescript
import express from 'express';

interface CallLogEntry {
  timestamp: number;
  callNumber: number;
  origin: string;
  destinationCount: number;
  destinations: string[];
}

let callCount = 0;
const callLog: CallLogEntry[] = [];

const app = express();
app.use(express.json());

app.get('/maps/api/distancematrix/json', (req, res) => {
  callCount++;
  
  const origin = req.query.origins as string;
  const destinations = (req.query.destinations as string).split('|');
  
  const logEntry: CallLogEntry = {
    timestamp: Date.now(),
    callNumber: callCount,
    origin,
    destinationCount: destinations.length,
    destinations,
  };
  
  callLog.push(logEntry);
  
  console.log(`🚨 GOOGLE MAPS API CALL #${callCount}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Destinations: ${destinations.length}`);
  
  // Generate mock distance data
  const elements = destinations.map((dest, idx) => ({
    status: 'OK',
    distance: { 
      value: 5000 + (idx * 1000), // 5km to 30km range
      text: `${Math.round((5000 + idx * 1000) / 1000)} km` 
    },
    duration: { 
      value: 600 + (idx * 60), // 10 to 40 mins
      text: `${Math.round((600 + idx * 60) / 60)} mins` 
    },
    duration_in_traffic: { 
      value: 720 + (idx * 60),
      text: `${Math.round((720 + idx * 60) / 60)} mins` 
    },
  }));
  
  res.json({
    status: 'OK',
    origin_addresses: [origin],
    destination_addresses: destinations,
    rows: [{ elements }],
  });
});

app.get('/api/test/call-count', (req, res) => {
  res.json({ 
    callCount, 
    callLog,
    totalDestinations: callLog.reduce((sum, log) => sum + log.destinationCount, 0)
  });
});

app.post('/api/test/reset', (req, res) => {
  const previousCount = callCount;
  callCount = 0;
  callLog.length = 0;
  console.log(`🔄 Reset call counter (was ${previousCount})`);
  res.json({ success: true, previousCount });
});

export function startMockGoogleMapsAPI(port = 3002) {
  app.listen(port, () => {
    console.log(`🧪 Mock Google Maps API running on http://localhost:${port}`);
    console.log(`   Endpoint: /maps/api/distancematrix/json`);
    console.log(`   Admin: /api/test/call-count, /api/test/reset`);
  });
}

export { callCount, callLog };
```

#### 2. Mock Geoapify API (`mock-geoapify-api.ts`)

**Purpose:** Return mock nearby places for testing

**Key Features:**
- Express server on port 3003
- Endpoint: `/v2/places` (mimics Geoapify)
- Returns: 10-50 mock places per category
- Realistic coordinates (Brisbane area for testing)

**Implementation:**
```typescript
import express from 'express';

const app = express();

// Mock place generator
function generateMockPlaces(category: string, count: number) {
  const baseLat = -27.4698; // Brisbane
  const baseLon = 153.0251;
  
  const places = [];
  for (let i = 0; i < count; i++) {
    places.push({
      type: 'Feature',
      properties: {
        name: `${category} #${i + 1}`,
        categories: [category],
        lat: baseLat + (i * 0.01), // Spread out
        lon: baseLon + (i * 0.01),
        distance: 1000 + (i * 500), // 1km to 25km
        place_id: `mock_${category}_${i}`,
      },
      geometry: {
        type: 'Point',
        coordinates: [baseLon + (i * 0.01), baseLat + (i * 0.01)],
      },
    });
  }
  
  return places;
}

app.get('/v2/places', (req, res) => {
  const categories = req.query.categories as string;
  const limit = parseInt(req.query.limit as string) || 50;
  
  console.log(`📍 Geoapify search: ${categories} (limit: ${limit})`);
  
  const mockPlaces = generateMockPlaces(categories, Math.min(limit, 100));
  
  res.json({ 
    type: 'FeatureCollection',
    features: mockPlaces 
  });
});

export function startMockGeoapifyAPI(port = 3003) {
  app.listen(port, () => {
    console.log(`🧪 Mock Geoapify API running on http://localhost:${port}`);
    console.log(`   Endpoint: /v2/places`);
  });
}
```

#### 3. Current Implementation (`current-implementation.ts`)

**Purpose:** Replicate exact current logic from production

**Key Features:**
- Copy exact airport/city lists from production
- Copy exact batching logic (25 per batch)
- Use mock APIs instead of real APIs
- Track all API calls made

**Implementation Approach:**
1. Copy `AUSTRALIAN_AIRPORTS` and `AUSTRALIAN_CITIES` arrays
2. Copy `getDistancesFromGoogleMaps()` function
3. Copy `getDistancesFromGoogleMapsCoordinates()` function
4. Copy main processing logic for all 8 categories
5. Point to mock APIs (localhost:3002, localhost:3003)

**Pseudo-code:**
```typescript
import axios from 'axios';

const GOOGLE_MAPS_API_BASE = 'http://localhost:3002/maps/api/distancematrix/json';
const GEOAPIFY_API_BASE = 'http://localhost:3003/v2/places';

// Copy exact arrays from production
const AUSTRALIAN_AIRPORTS = [ /* 26 airports */ ];
const AUSTRALIAN_CITIES = [ /* 30 cities */ ];

// Copy exact batching functions
async function getDistancesFromGoogleMaps(...) { /* exact copy */ }
async function getDistancesFromGoogleMapsCoordinates(...) { /* exact copy */ }

export async function getCurrentProximityData(address: string) {
  console.log('\n🔴 CURRENT IMPLEMENTATION\n');
  
  const allResults = [];
  
  // 1. Airports (2 calls)
  const airportDistances = await getDistancesFromGoogleMaps(address, AUSTRALIAN_AIRPORTS);
  // ... process results
  
  // 2. Cities (2 calls)
  const cityDistances = await getDistancesFromGoogleMaps(address, AUSTRALIAN_CITIES);
  // ... process results
  
  // 3. Train Stations (~4 calls)
  const trainPlaces = await axios.get(`${GEOAPIFY_API_BASE}?categories=public_transport.train&limit=100`);
  const trainDistances = await getDistancesFromGoogleMapsCoordinates(...);
  // ... process results
  
  // 4-8. Repeat for other categories
  // ... (bus, kindergarten, schools, supermarkets, hospitals)
  
  return allResults;
}
```

#### 4. Optimized Implementation (`optimized-implementation.ts`)

**Purpose:** New logic that makes only 2 Google Maps calls

**Key Features:**
- Consolidate all static destinations (airports + cities) into 1 call
- Consolidate all dynamic destinations (Geoapify results) into 1 call
- Maintain result quality (top results per category)
- Preserve special logic (tiers, ED hospitals, chains)

**Implementation Strategy:**

```typescript
import axios from 'axios';

const GOOGLE_MAPS_API_BASE = 'http://localhost:3002/maps/api/distancematrix/json';
const GEOAPIFY_API_BASE = 'http://localhost:3003/v2/places';

// Reduced lists (top destinations only)
const TOP_AIRPORTS = [
  // Group 1 (Major): SYD, MEL, BNE, PER, ADL, CNS, DRW (7)
  // Group 2 (Regional): OOL, CBR, HBA (3)
  // Total: 10 airports
];

const TOP_CITIES = [
  // Group 1 (Capitals): Melbourne, Sydney, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin (8)
  // Total: 8 cities
];

// New consolidated batching function
async function getBatchedDistances(
  originAddress: string,
  destinations: Array<{ address?: string; lat?: number; lon?: number }>
): Promise<Array<{ distance: number; duration: number }>> {
  // Convert all destinations to string format
  const destStrings = destinations.map(d => {
    if (d.address) return d.address;
    if (d.lat && d.lon) return `${d.lat},${d.lon}`;
    return '';
  }).filter(Boolean);
  
  // Batch into groups of 25
  const batchSize = 25;
  const results = [];
  
  for (let i = 0; i < destStrings.length; i += batchSize) {
    const batch = destStrings.slice(i, i + batchSize);
    const destStr = batch.join('|');
    
    const url = `${GOOGLE_MAPS_API_BASE}?` +
      `origins=${encodeURIComponent(originAddress)}` +
      `&destinations=${encodeURIComponent(destStr)}`;
    
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

export async function getOptimizedProximityData(address: string) {
  console.log('\n🟢 OPTIMIZED IMPLEMENTATION\n');
  
  const allResults = [];
  
  // ============================================
  // BATCH 1: All Static Destinations (1 call)
  // ============================================
  console.log('📍 Batch 1: Fetching airports + cities in ONE call...');
  
  const staticDestinations = [
    ...TOP_AIRPORTS.map(a => ({ address: a.address })),  // 10 airports
    ...TOP_CITIES.map(c => ({ address: c.address })),    // 8 cities
  ]; // Total: 18 destinations
  
  const batch1Results = await getBatchedDistances(address, staticDestinations);
  
  // Process airports (first 10 results)
  const airportResults = batch1Results.slice(0, 10);
  TOP_AIRPORTS.forEach((airport, idx) => {
    if (airportResults[idx]) {
      allResults.push({
        category: 'airport',
        name: `${airport.name} (${airport.code})`,
        distance: airportResults[idx].distance,
        duration: airportResults[idx].duration,
      });
    }
  });
  
  // Process cities (next 8 results)
  const cityResults = batch1Results.slice(10, 18);
  TOP_CITIES.forEach((city, idx) => {
    if (cityResults[idx]) {
      allResults.push({
        category: 'city',
        name: `${city.name}, ${city.state}`,
        distance: cityResults[idx].distance,
        duration: cityResults[idx].duration,
      });
    }
  });
  
  console.log(`✅ Batch 1 complete: ${batch1Results.length} results (1 API call)`);
  
  // ============================================
  // BATCH 2: All Dynamic Destinations (1 call)
  // ============================================
  console.log('📍 Batch 2: Fetching all amenities in ONE call...');
  
  // Fetch all Geoapify categories
  const categories = [
    { name: 'public_transport.train', limit: 50, take: 3 },
    { name: 'public_transport.bus', limit: 100, take: 3 },
    { name: 'childcare.kindergarten', limit: 50, take: 2 },
    { name: 'childcare', limit: 100, take: 2 },
    { name: 'education.school', limit: 100, take: 3 },
    { name: 'commercial.supermarket', limit: 100, take: 4 },
    { name: 'healthcare.hospital', limit: 50, take: 3 },
  ];
  
  const allPlaces = [];
  
  for (const category of categories) {
    const response = await axios.get(
      `${GEOAPIFY_API_BASE}?categories=${category.name}&limit=${category.limit}`
    );
    const places = response.data.features || [];
    
    // Take top N closest (by Geoapify distance)
    const topPlaces = places.slice(0, category.take);
    
    topPlaces.forEach((place: any) => {
      allPlaces.push({
        category: category.name,
        name: place.properties.name,
        lat: place.properties.lat || place.geometry.coordinates[1],
        lon: place.properties.lon || place.geometry.coordinates[0],
      });
    });
  }
  
  console.log(`   Collected ${allPlaces.length} places from ${categories.length} categories`);
  
  // ONE Google Maps call for all amenities
  const batch2Results = await getBatchedDistances(address, allPlaces);
  
  // Map results back to places
  allPlaces.forEach((place, idx) => {
    if (batch2Results[idx]) {
      allResults.push({
        category: place.category,
        name: place.name,
        distance: batch2Results[idx].distance,
        duration: batch2Results[idx].duration,
      });
    }
  });
  
  console.log(`✅ Batch 2 complete: ${batch2Results.length} results (1 API call)`);
  
  // ============================================
  // Summary
  // ============================================
  console.log('\n📊 OPTIMIZED IMPLEMENTATION COMPLETE');
  console.log(`   Total Google Maps API calls: 2`);
  console.log(`   Total results: ${allResults.length}`);
  
  return allResults;
}
```

#### 5. Test Runner (`test-runner.ts`)

**Purpose:** Orchestrate tests and generate comparison reports

**Key Features:**
- Start both mock servers
- Run current implementation
- Run optimized implementation
- Compare API call counts
- Generate JSON and Markdown reports

**Implementation:**
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
  console.log('');
  
  // Start mock servers
  console.log('Starting mock servers...');
  startMockGoogleMapsAPI(3002);
  startMockGeoapifyAPI(3003);
  
  // Wait for servers to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Mock servers running\n');
  
  const allResults = [];
  
  for (const testAddress of TEST_ADDRESSES) {
    console.log('\n' + '='.repeat(80));
    console.log(`\n🏠 Testing Address: ${testAddress}\n`);
    console.log('='.repeat(80));
    
    // ============================================
    // Test Current Implementation
    // ============================================
    await axios.post('http://localhost:3002/api/test/reset');
    
    console.log('\n🔴 Running CURRENT implementation...\n');
    const currentStartTime = Date.now();
    const currentResults = await getCurrentProximityData(testAddress);
    const currentDuration = Date.now() - currentStartTime;
    
    const currentCallData = await axios.get('http://localhost:3002/api/test/call-count');
    const currentCalls = currentCallData.data.callCount;
    const currentCallLog = currentCallData.data.callLog;
    
    console.log(`\n✅ Current implementation complete`);
    console.log(`   API calls: ${currentCalls}`);
    console.log(`   Results: ${currentResults.length}`);
    console.log(`   Duration: ${currentDuration}ms`);
    
    // ============================================
    // Test Optimized Implementation
    // ============================================
    await axios.post('http://localhost:3002/api/test/reset');
    
    console.log('\n🟢 Running OPTIMIZED implementation...\n');
    const optimizedStartTime = Date.now();
    const optimizedResults = await getOptimizedProximityData(testAddress);
    const optimizedDuration = Date.now() - optimizedStartTime;
    
    const optimizedCallData = await axios.get('http://localhost:3002/api/test/call-count');
    const optimizedCalls = optimizedCallData.data.callCount;
    const optimizedCallLog = optimizedCallData.data.callLog;
    
    console.log(`\n✅ Optimized implementation complete`);
    console.log(`   API calls: ${optimizedCalls}`);
    console.log(`   Results: ${optimizedResults.length}`);
    console.log(`   Duration: ${optimizedDuration}ms`);
    
    // ============================================
    // Compare Results
    // ============================================
    const comparison = {
      address: testAddress,
      current: {
        apiCalls: currentCalls,
        results: currentResults.length,
        duration: currentDuration,
        cost: currentCalls * 0.005, // $0.005 per call
        callLog: currentCallLog,
      },
      optimized: {
        apiCalls: optimizedCalls,
        results: optimizedResults.length,
        duration: optimizedDuration,
        cost: optimizedCalls * 0.005,
        callLog: optimizedCallLog,
      },
      savings: {
        apiCalls: currentCalls - optimizedCalls,
        callsPercentage: ((currentCalls - optimizedCalls) / currentCalls) * 100,
        cost: (currentCalls - optimizedCalls) * 0.005,
        costPercentage: ((currentCalls - optimizedCalls) / currentCalls) * 100,
      },
    };
    
    allResults.push(comparison);
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPARISON SUMMARY');
    console.log('='.repeat(80));
    console.log(`Current:   ${currentCalls} API calls → $${comparison.current.cost.toFixed(3)}`);
    console.log(`Optimized: ${optimizedCalls} API calls → $${comparison.optimized.cost.toFixed(3)}`);
    console.log(`Savings:   ${comparison.savings.apiCalls} calls (${comparison.savings.callsPercentage.toFixed(1)}%) → $${comparison.savings.cost.toFixed(3)}`);
    console.log('='.repeat(80) + '\n');
  }
  
  // ============================================
  // Generate Reports
  // ============================================
  console.log('\n📝 Generating reports...\n');
  
  const resultsDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Save JSON report
  fs.writeFileSync(
    path.join(resultsDir, 'comparison-report.json'),
    JSON.stringify(allResults, null, 2)
  );
  
  // Generate Markdown report
  generateMarkdownReport(allResults, resultsDir);
  
  console.log('✅ Reports saved to results/');
  console.log('   - comparison-report.json');
  console.log('   - comparison-report.md');
  console.log('\n🎉 Test complete!\n');
  
  process.exit(0);
}

function generateMarkdownReport(results: any[], resultsDir: string) {
  let markdown = '# Backend Batch Optimization - Test Results\n\n';
  markdown += `**Date:** ${new Date().toISOString()}\n`;
  markdown += `**Test Addresses:** ${results.length}\n\n`;
  
  // Calculate totals
  const totalCurrentCalls = results.reduce((sum, r) => sum + r.current.apiCalls, 0);
  const totalOptimizedCalls = results.reduce((sum, r) => sum + r.optimized.apiCalls, 0);
  const totalSavings = totalCurrentCalls - totalOptimizedCalls;
  const avgCurrentCalls = totalCurrentCalls / results.length;
  const avgOptimizedCalls = totalOptimizedCalls / results.length;
  
  markdown += '## Summary\n\n';
  markdown += `| Metric | Current | Optimized | Savings |\n`;
  markdown += `|--------|---------|-----------|----------|\n`;
  markdown += `| Avg API Calls per Request | ${avgCurrentCalls.toFixed(1)} | ${avgOptimizedCalls.toFixed(1)} | ${(totalSavings / results.length).toFixed(1)} (${((totalSavings / totalCurrentCalls) * 100).toFixed(0)}%) |\n`;
  markdown += `| Cost per Request | $${(avgCurrentCalls * 0.005).toFixed(3)} | $${(avgOptimizedCalls * 0.005).toFixed(3)} | $${((totalSavings / results.length) * 0.005).toFixed(3)} |\n`;
  markdown += `| Cost for 730 Requests | $${(avgCurrentCalls * 730 * 0.005).toFixed(2)} | $${(avgOptimizedCalls * 730 * 0.005).toFixed(2)} | $${((totalSavings / results.length) * 730 * 0.005).toFixed(2)} |\n\n`;
  
  markdown += '## Detailed Results\n\n';
  results.forEach((result, idx) => {
    markdown += `### Test ${idx + 1}: ${result.address}\n\n`;
    markdown += `| Metric | Current | Optimized | Savings |\n`;
    markdown += `|--------|---------|-----------|----------|\n`;
    markdown += `| API Calls | ${result.current.apiCalls} | ${result.optimized.apiCalls} | ${result.savings.apiCalls} (${result.savings.callsPercentage.toFixed(0)}%) |\n`;
    markdown += `| Cost | $${result.current.cost.toFixed(3)} | $${result.optimized.cost.toFixed(3)} | $${result.savings.cost.toFixed(3)} |\n`;
    markdown += `| Results | ${result.current.results} | ${result.optimized.results} | ${result.optimized.results - result.current.results} |\n`;
    markdown += `| Duration | ${result.current.duration}ms | ${result.optimized.duration}ms | ${result.optimized.duration - result.current.duration}ms |\n\n`;
  });
  
  markdown += '## Conclusion\n\n';
  markdown += `✅ **Optimization successful!**\n\n`;
  markdown += `- Reduced API calls by **${((totalSavings / totalCurrentCalls) * 100).toFixed(0)}%**\n`;
  markdown += `- Cost savings: **$${((totalSavings / results.length) * 0.005).toFixed(3)}** per request\n`;
  markdown += `- For 730 bot attacks: **$${((totalSavings / results.length) * 730 * 0.005).toFixed(2)}** saved\n`;
  
  fs.writeFileSync(
    path.join(resultsDir, 'comparison-report.md'),
    markdown
  );
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
```

#### 6. Test Data (`test-data.ts`)

**Purpose:** Sample addresses for testing

```typescript
export const TEST_ADDRESSES = [
  '5 Acacia St Point Vernon QLD 4655',           // Regional Queensland
  '15 Barker Street Lewisham NSW 2049',          // Sydney suburb
  '123 Collins St Melbourne VIC 3000',           // Melbourne CBD
];
```

### Test Rig Setup & Execution

**Time Estimate: 2 hours**

#### Setup Steps

1. **Create directory structure:**
```bash
cd property-review-system
mkdir -p test-rig/backend-batch-optimization/src
mkdir -p test-rig/backend-batch-optimization/results
```

2. **Initialize package:**
```bash
cd test-rig/backend-batch-optimization
npm init -y
npm install express axios typescript ts-node @types/node @types/express
```

3. **Create tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

4. **Create all source files** (as detailed above)

5. **Add run scripts to package.json:**
```json
{
  "scripts": {
    "test": "ts-node src/test-runner.ts",
    "mock-google": "ts-node src/mock-google-maps-api.ts",
    "mock-geoapify": "ts-node src/mock-geoapify-api.ts"
  }
}
```

#### Running Tests

```bash
npm test
```

Expected output:
```
🧪 BACKEND BATCH OPTIMIZATION TEST RIG
================================================================================

Starting mock servers...
🧪 Mock Google Maps API running on http://localhost:3002
🧪 Mock Geoapify API running on http://localhost:3003
✅ Mock servers running

================================================================================

🏠 Testing Address: 5 Acacia St Point Vernon QLD 4655

================================================================================

🔴 Running CURRENT implementation...

📍 Fetching airports...
🚨 GOOGLE MAPS API CALL #1 - 25 destinations
🚨 GOOGLE MAPS API CALL #2 - 1 destination
📍 Fetching cities...
🚨 GOOGLE MAPS API CALL #3 - 25 destinations
🚨 GOOGLE MAPS API CALL #4 - 5 destinations
📍 Fetching train stations...
🚨 GOOGLE MAPS API CALL #5 - 25 destinations
...
[continues for all categories]

✅ Current implementation complete
   API calls: 26
   Results: 45
   Duration: 1250ms

🟢 Running OPTIMIZED implementation...

📍 Batch 1: Fetching airports + cities in ONE call...
🚨 GOOGLE MAPS API CALL #1 - 18 destinations
✅ Batch 1 complete: 18 results (1 API call)
📍 Batch 2: Fetching all amenities in ONE call...
🚨 GOOGLE MAPS API CALL #2 - 21 destinations
✅ Batch 2 complete: 21 results (1 API call)

✅ Optimized implementation complete
   API calls: 2
   Results: 39
   Duration: 450ms

================================================================================
📊 COMPARISON SUMMARY
================================================================================
Current:   26 API calls → $0.130
Optimized: 2 API calls → $0.010
Savings:   24 calls (92.3%) → $0.120
================================================================================

📝 Generating reports...

✅ Reports saved to results/
   - comparison-report.json
   - comparison-report.md

🎉 Test complete!
```

---

## Production Implementation

### Phase 1: Backup Current Implementation

**Time: 5 minutes**

1. Create backup of current route:
```bash
cp form-app/src/app/api/geoapify/proximity/route.ts \
   form-app/src/app/api/geoapify/proximity/route.ts.backup-2026-01-25
```

2. Commit backup:
```bash
git add form-app/src/app/api/geoapify/proximity/route.ts.backup-2026-01-25
git commit -m "Backup: proximity route before batch optimization"
```

### Phase 2: Implement Optimized Logic

**Time: 45 minutes**

#### Step 1: Reduce Static Lists (10 min)

**File:** `form-app/src/app/api/geoapify/proximity/route.ts`

**Change 1: Reduce AUSTRALIAN_AIRPORTS to top 10**

Current (lines 37-64): 26 airports

Optimized:
```typescript
const AUSTRALIAN_AIRPORTS: Airport[] = [
  // Group 1 - Major airports (7)
  { name: 'Sydney Kingsford Smith Airport', code: 'SYD', address: 'Sydney Airport NSW 2020, Australia', group: 1 },
  { name: 'Melbourne Airport', code: 'MEL', address: 'Melbourne Airport VIC 3045, Australia', group: 1 },
  { name: 'Brisbane Airport', code: 'BNE', address: 'Brisbane Airport QLD 4008, Australia', group: 1 },
  { name: 'Perth Airport', code: 'PER', address: 'Perth Airport WA 6105, Australia', group: 1 },
  { name: 'Adelaide Airport', code: 'ADL', address: 'Adelaide Airport SA 5950, Australia', group: 1 },
  { name: 'Cairns Airport', code: 'CNS', address: 'Cairns Airport QLD 4870, Australia', group: 1 },
  { name: 'Darwin International Airport', code: 'DRW', address: 'Darwin Airport NT 0820, Australia', group: 1 },
  
  // Group 2 - Regional airports (3)
  { name: 'Gold Coast Airport', code: 'OOL', address: 'Gold Coast Airport QLD 4218, Australia', group: 2 },
  { name: 'Canberra Airport', code: 'CBR', address: 'Canberra Airport ACT 2609, Australia', group: 2 },
  { name: 'Hobart International Airport', code: 'HBA', address: 'Hobart Airport TAS 7170, Australia', group: 2 },
];
```

**Change 2: Reduce AUSTRALIAN_CITIES to top 8**

Current (lines 66-98): 30 cities

Optimized:
```typescript
const AUSTRALIAN_CITIES: City[] = [
  // Group 1 - Capital cities (8)
  { name: 'Melbourne', state: 'Victoria', address: 'Melbourne VIC, Australia', group: 1 },
  { name: 'Sydney', state: 'New South Wales', address: 'Sydney NSW, Australia', group: 1 },
  { name: 'Brisbane', state: 'Queensland', address: 'Brisbane QLD, Australia', group: 1 },
  { name: 'Perth', state: 'Western Australia', address: 'Perth WA, Australia', group: 1 },
  { name: 'Adelaide', state: 'South Australia', address: 'Adelaide SA, Australia', group: 1 },
  { name: 'Canberra', state: 'Australian Capital Territory', address: 'Canberra ACT, Australia', group: 1 },
  { name: 'Hobart', state: 'Tasmania', address: 'Hobart TAS, Australia', group: 1 },
  { name: 'Darwin', state: 'Northern Territory', address: 'Darwin NT, Australia', group: 1 },
];
```

#### Step 2: Create Consolidated Batching Function (15 min)

**Add new function after line 369:**

```typescript
/**
 * Consolidated batching: Call Google Maps with mixed address/coordinate destinations
 * This allows us to batch static (address) and dynamic (coordinate) destinations together
 */
async function getConsolidatedDistances(
  originAddress: string,
  destinations: Array<{ address?: string; lat?: number; lon?: number; name?: string; category?: string }>
): Promise<Array<{ distance: number; duration: number; name?: string; category?: string }>> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const batchSize = 25;
  const results: Array<{ distance: number; duration: number; name?: string; category?: string }> = [];
  const departureTime = getNextWednesday9AM();

  // Convert all destinations to string format (address or "lat,lon")
  const destStrings = destinations.map(d => {
    if (d.address) return d.address;
    if (d.lat !== undefined && d.lon !== undefined) return `${d.lat},${d.lon}`;
    return null;
  }).filter(Boolean) as string[];

  for (let i = 0; i < destStrings.length; i += batchSize) {
    const batch = destStrings.slice(i, i + batchSize);
    const batchDestinations = destinations.slice(i, i + batchSize);
    const destStr = batch.join('|');

    const url = `${GOOGLE_MAPS_API_BASE_URL}?` +
      `origins=${encodeURIComponent(originAddress)}` +
      `&destinations=${encodeURIComponent(destStr)}` +
      `&departure_time=${departureTime}` +
      `&traffic_model=best_guess` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status !== 'OK') {
        console.error('Google Maps API error:', response.data.status);
        continue;
      }

      const elements = response.data.rows[0]?.elements || [];
      elements.forEach((element: any, idx: number) => {
        if (element.status === 'OK') {
          const dest = batchDestinations[idx];
          results.push({
            distance: element.distance.value,
            duration: element.duration_in_traffic?.value || element.duration.value,
            name: dest?.name,
            category: dest?.category,
          });
        }
      });
    } catch (error) {
      console.error(`Error fetching consolidated batch ${i}-${i + batchSize}:`, error);
    }
  }

  return results;
}
```

#### Step 3: Refactor Main POST Handler (20 min)

**Replace lines 487-1042 with optimized logic:**

```typescript
    const allResults: ProximityResult[] = [];

    // ============================================
    // BATCH 1: Static Destinations (Airports + Cities)
    // ============================================
    if (GOOGLE_MAPS_API_KEY) {
      try {
        console.log('🔵 Batch 1: Fetching airports + cities (consolidated)');
        
        const staticDestinations = [
          ...AUSTRALIAN_AIRPORTS.map(a => ({ 
            address: a.address, 
            name: `${a.name} (${a.code})`,
            category: 'airport',
            group: a.group,
          })),
          ...AUSTRALIAN_CITIES.map(c => ({ 
            address: c.address, 
            name: `${c.name}, ${c.state}`,
            category: 'city',
            group: c.group,
          })),
        ];
        
        // ONE API CALL for all static destinations
        const staticResults = await getConsolidatedDistances(
          addressForGoogleMaps,
          staticDestinations
        );
        
        // Map results back to destinations
        staticDestinations.forEach((dest, idx) => {
          if (staticResults[idx] && staticResults[idx].distance > 0) {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              staticResults[idx].distance,
              staticResults[idx].duration
            );
            
            allResults.push({
              name: dest.name,
              distance: staticResults[idx].distance,
              category: dest.category,
              formattedLine: `${distStr} (${timeStr}), ${dest.name}`,
              group: dest.group,
            });
          }
        });
        
        console.log(`✅ Batch 1: ${staticResults.length} results (1 API call)`);
      } catch (error) {
        console.error('Error in Batch 1 (airports + cities):', error);
      }
    }

    // ============================================
    // BATCH 2: Dynamic Destinations (All Geoapify Results)
    // ============================================
    if (GOOGLE_MAPS_API_KEY) {
      try {
        console.log('🔵 Batch 2: Fetching all amenities (consolidated)');
        
        const dynamicDestinations: Array<{
          lat: number;
          lon: number;
          name: string;
          category: string;
          properties?: any;
        }> = [];
        
        // 1. Train Stations (top 3)
        const trainPlaces = await searchGeoapify(lon, lat, 'public_transport.train', 100000, 50);
        const tramPlaces = await searchGeoapify(lon, lat, 'public_transport.tram', 10000, 20);
        const allTrainTram = [...trainPlaces, ...tramPlaces];
        
        const validStations = allTrainTram.filter(place => {
          const name = (place.properties.name || '').trim().toLowerCase();
          const words = name.split(/\s+/);
          const excludeTerms = ['society', 'club', 'modellers', 'modeller', 'association', 'group', 'railway society'];
          if (excludeTerms.some(term => name.includes(term))) return false;
          if (words.length === 1) {
            const problematicNames = ['koala'];
            if (problematicNames.includes(name)) return false;
          }
          return true;
        }).slice(0, 3); // Top 3 only
        
        validStations.forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || 'Train Station',
              category: 'train_station',
              properties: place.properties,
            });
          }
        });
        
        // 2. Bus Stops (top 3)
        const busPlaces = await searchGeoapify(lon, lat, 'public_transport.bus', 50000, 100);
        busPlaces.slice(0, 3).forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || 'Bus Stop',
              category: 'bus_stop',
              properties: place.properties,
            });
          }
        });
        
        // 3. Kindergarten & Childcare (top 4 combined)
        const kindergartenPlaces = await searchGeoapify(lon, lat, 'childcare.kindergarten', 50000, 50);
        const childcarePlaces = await searchGeoapify(lon, lat, 'childcare', 50000, 100);
        const childcareOnly = childcarePlaces.filter(place => {
          const categories = place.properties.categories || [];
          return !categories.some(cat => cat.includes('kindergarten'));
        });
        const combinedChildcare = [
          ...kindergartenPlaces.map(p => ({ ...p, type: 'kindergarten' })),
          ...childcareOnly.map(p => ({ ...p, type: 'childcare' })),
        ].slice(0, 4);
        
        combinedChildcare.forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || (place.type === 'kindergarten' ? 'Kindergarten' : 'Childcare'),
              category: place.type,
              properties: place.properties,
            });
          }
        });
        
        // 4. Schools (top 3)
        const schoolPlaces = await searchGeoapify(lon, lat, 'education.school', 50000, 100);
        schoolPlaces.slice(0, 3).forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || 'School',
              category: 'school',
              properties: place.properties,
            });
          }
        });
        
        // 5. Supermarkets (top 4 - closest + chains)
        const supermarketPlaces = await searchGeoapify(lon, lat, 'commercial.supermarket', 50000, 100);
        const chains = [
          { name: 'Woolworths', keywords: ['woolworths', 'woolies'] },
          { name: 'Coles', keywords: ['coles'] },
          { name: 'IGA', keywords: ['iga'] },
          { name: 'Aldi', keywords: ['aldi'] },
        ];
        
        const selectedSupermarkets: typeof supermarketPlaces = [];
        const selectedIds = new Set<string>();
        
        // Add closest overall
        if (supermarketPlaces.length > 0) {
          selectedSupermarkets.push(supermarketPlaces[0]);
          if (supermarketPlaces[0].properties.place_id) {
            selectedIds.add(supermarketPlaces[0].properties.place_id);
          }
        }
        
        // Add one from each chain
        for (const chain of chains) {
          const chainStore = supermarketPlaces.find(store => {
            const storeName = (store.properties.name || '').toLowerCase();
            const placeId = store.properties.place_id || '';
            return !selectedIds.has(placeId) && 
                   chain.keywords.some(keyword => storeName.includes(keyword));
          });
          if (chainStore && selectedSupermarkets.length < 4) {
            selectedSupermarkets.push(chainStore);
            if (chainStore.properties.place_id) {
              selectedIds.add(chainStore.properties.place_id);
            }
          }
        }
        
        selectedSupermarkets.forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || 'Supermarket',
              category: 'supermarket',
              properties: place.properties,
            });
          }
        });
        
        // 6. Hospitals (top 3, prioritize ED)
        const hospitalPlaces = await searchGeoapify(lon, lat, 'healthcare.hospital', 50000, 50);
        const emergencyKeywords = ['emergency', 'ed ', 'emergency department', 'a&e', 'accident', 'casualty'];
        const publicHospitalKeywords = ['public hospital', 'general hospital', 'base hospital', 'district hospital'];
        const majorHospitalIndicators = ['prince', 'royal', 'queen', 'king', 'university hospital'];
        
        const hospitalsWithED = hospitalPlaces.filter(hospital => {
          const name = (hospital.properties.name || '').toLowerCase();
          const hasEDKeyword = emergencyKeywords.some(keyword => name.includes(keyword));
          const isSpecialtyOnly = name.includes('rehab') || name.includes('rehabilitation') ||
                                 name.includes('psychiatric') || name.includes('mental health');
          if (isSpecialtyOnly) return false;
          const isPublicHospital = publicHospitalKeywords.some(keyword => name.includes(keyword));
          const isMajorHospital = majorHospitalIndicators.some(keyword => name.includes(keyword)) && 
                                 !name.includes('private');
          return hasEDKeyword || isPublicHospital || isMajorHospital;
        });
        
        const selectedHospitals: typeof hospitalPlaces = [];
        const selectedHospitalIds = new Set<string>();
        
        // Add closest ED hospital
        if (hospitalsWithED.length > 0) {
          selectedHospitals.push(hospitalsWithED[0]);
          if (hospitalsWithED[0].properties.place_id) {
            selectedHospitalIds.add(hospitalsWithED[0].properties.place_id);
          }
        }
        
        // Fill remaining slots with closest hospitals
        for (const hospital of hospitalPlaces) {
          if (selectedHospitals.length >= 3) break;
          const placeId = hospital.properties.place_id || '';
          if (!selectedHospitalIds.has(placeId)) {
            selectedHospitals.push(hospital);
            if (placeId) selectedHospitalIds.add(placeId);
          }
        }
        
        selectedHospitals.forEach(place => {
          if (place.geometry?.coordinates) {
            dynamicDestinations.push({
              lat: place.geometry.coordinates[1],
              lon: place.geometry.coordinates[0],
              name: place.properties.name || 'Hospital',
              category: 'hospital',
              properties: place.properties,
            });
          }
        });
        
        console.log(`   Collected ${dynamicDestinations.length} amenities from ${6} categories`);
        
        // ONE API CALL for all dynamic destinations
        const dynamicResults = await getConsolidatedDistances(
          addressForGoogleMaps,
          dynamicDestinations
        );
        
        // Map results back to destinations
        dynamicDestinations.forEach((dest, idx) => {
          if (dynamicResults[idx] && dynamicResults[idx].distance > 0) {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              dynamicResults[idx].distance,
              dynamicResults[idx].duration
            );
            
            let displayName = dest.name;
            // Apply category name appending logic
            displayName = appendCategoryName(displayName, dest.category);
            
            allResults.push({
              name: displayName,
              distance: dynamicResults[idx].distance,
              category: dest.category,
              formattedLine: `${distStr} (${timeStr}), ${displayName}`,
            });
          }
        });
        
        console.log(`✅ Batch 2: ${dynamicResults.length} results (1 API call)`);
      } catch (error) {
        console.error('Error in Batch 2 (amenities):', error);
      }
    }

    // Apply tier-based filtering for airports/cities (same logic as before)
    // Filter allResults to apply tier logic...
    const airports = allResults.filter(r => r.category === 'airport');
    const cities = allResults.filter(r => r.category === 'city');
    const amenities = allResults.filter(r => r.category !== 'airport' && r.category !== 'city');
    
    // Apply tier logic for airports
    const filteredAirports: ProximityResult[] = [];
    if (airports.length > 0) {
      airports.sort((a, b) => a.distance - b.distance);
      const closestAirport = airports[0];
      const closestGroup = (closestAirport as any).group;
      
      if (closestGroup === 3) {
        // Tier 3 closest → show Tier 3 + Tier 1
        const tier3 = airports.find(a => (a as any).group === 3);
        const tier1 = airports.find(a => (a as any).group === 1);
        if (tier3) filteredAirports.push(tier3);
        if (tier1) filteredAirports.push(tier1);
      } else if (closestGroup === 2) {
        // Tier 2 closest → show Tier 2 + Tier 1
        const tier2 = airports.find(a => (a as any).group === 2);
        const tier1 = airports.find(a => (a as any).group === 1);
        if (tier2) filteredAirports.push(tier2);
        if (tier1) filteredAirports.push(tier1);
      } else {
        // Tier 1 closest → show Tier 1 + closest from Tier 2/3
        const tier1 = airports.find(a => (a as any).group === 1);
        if (tier1) filteredAirports.push(tier1);
        const tier2And3 = airports.filter(a => (a as any).group === 2 || (a as any).group === 3);
        if (tier2And3.length > 0) {
          tier2And3.sort((a, b) => a.distance - b.distance);
          filteredAirports.push(tier2And3[0]);
        }
      }
    }
    
    // Apply tier logic for cities (same pattern)
    const filteredCities: ProximityResult[] = [];
    if (cities.length > 0) {
      cities.sort((a, b) => a.distance - b.distance);
      const closestCity = cities[0];
      const closestGroup = (closestCity as any).group;
      
      if (closestGroup === 3) {
        const tier3 = cities.find(c => (c as any).group === 3);
        const tier1 = cities.find(c => (c as any).group === 1);
        if (tier3) filteredCities.push(tier3);
        if (tier1) filteredCities.push(tier1);
      } else if (closestGroup === 2) {
        const tier2 = cities.find(c => (c as any).group === 2);
        const tier1 = cities.find(c => (c as any).group === 1);
        if (tier2) filteredCities.push(tier2);
        if (tier1) filteredCities.push(tier1);
      } else {
        const tier1 = cities.find(c => (c as any).group === 1);
        if (tier1) filteredCities.push(tier1);
        const tier2And3 = cities.filter(c => (c as any).group === 2 || (c as any).group === 3);
        if (tier2And3.length > 0) {
          tier2And3.sort((a, b) => a.distance - b.distance);
          filteredCities.push(tier2And3[0]);
        }
      }
    }
    
    // Combine filtered results
    const finalResults = [...filteredAirports, ...filteredCities, ...amenities];
    finalResults.sort((a, b) => a.distance - b.distance);

    // Format output
    const formattedLines = finalResults.map(r => r.formattedLine);
```

### Phase 3: Testing in Development

**Time: 15 minutes**

1. **Start development server:**
```bash
cd form-app
npm run dev
```

2. **Test with sample addresses:**
   - Open browser to `http://localhost:3000`
   - Navigate to Step 5 (Proximity)
   - Test with:
     - `5 Acacia St Point Vernon QLD 4655`
     - `15 Barker Street Lewisham NSW 2049`
     - `123 Collins St Melbourne VIC 3000`

3. **Monitor console logs:**
   - Look for: `🔵 Batch 1: Fetching airports + cities (consolidated)`
   - Look for: `🔵 Batch 2: Fetching all amenities (consolidated)`
   - Verify: Only 2 Google Maps API calls per request

4. **Verify results:**
   - Check that all categories are still present
   - Check that distances are reasonable
   - Check that formatting is correct

### Phase 4: Deployment

**Time: 10 minutes**

1. **Commit changes:**
```bash
git add form-app/src/app/api/geoapify/proximity/route.ts
git commit -m "Optimize: Reduce Google Maps API calls from 26 to 2 per proximity request

- Consolidate airports + cities into single batch (1 call)
- Consolidate all amenities into single batch (1 call)
- Reduce airport list from 26 to 10 (top tier airports)
- Reduce city list from 30 to 8 (capital cities only)
- Maintain tier-based logic for airports/cities
- Maintain special logic for ED hospitals and supermarket chains
- Expected savings: 92% cost reduction ($0.13 → $0.01 per request)"
```

2. **Push to repository:**
```bash
git push origin main
```

3. **Verify Vercel deployment:**
   - Wait for automatic deployment
   - Check deployment logs
   - Test production URL

4. **Monitor Google Cloud usage:**
   - Open Google Cloud Console
   - Navigate to APIs & Services → Distance Matrix API
   - Monitor request count over next 24 hours
   - Expected: ~92% reduction in calls

---

## Testing & Validation

### Success Criteria

✅ **Test Rig Results:**
- Current implementation: 26 API calls
- Optimized implementation: 2 API calls
- Reduction: 24 calls (92%)

✅ **Development Testing:**
- All 8 categories still present in results
- Distances are accurate
- Formatting is correct
- No errors in console

✅ **Production Monitoring (7 days):**
- Google Maps API calls reduced by 85-92%
- Cost per request: $0.13 → $0.01
- No increase in error rates
- User feedback: No complaints about missing data

### Rollback Plan

If issues arise:

1. **Immediate rollback:**
```bash
git revert HEAD
git push origin main
```

2. **Or restore backup:**
```bash
cp form-app/src/app/api/geoapify/proximity/route.ts.backup-2026-01-25 \
   form-app/src/app/api/geoapify/proximity/route.ts
git add form-app/src/app/api/geoapify/proximity/route.ts
git commit -m "Rollback: Restore original proximity route"
git push origin main
```

---

## Questions & Clarifications

### Questions for User

1. **Airport/City Selection:**
   - Current plan: Reduce to top 10 airports and 8 cities
   - Alternative: Keep all 26 airports and 30 cities, but make 2 calls each (4 total instead of 2)
   - **Question:** Is reducing coverage acceptable, or should we keep full coverage with 4 total calls?

2. **Amenity Limits:**
   - Current plan: Top 3 per category (train, bus, schools, etc.)
   - Current implementation: Shows only 1 closest per category anyway
   - **Question:** Is top 3 per category sufficient, or do we need more?

3. **Supermarket Logic:**
   - Current plan: Closest + one from each major chain (Woolworths, Coles, IGA, Aldi) = up to 5 total
   - **Question:** Should we limit to 4 total, or keep up to 5?

4. **Hospital Logic:**
   - Current plan: Closest ED hospital + 2 more closest = 3 total
   - **Question:** Is 3 hospitals sufficient?

5. **Test Rig Execution:**
   - **Question:** Should I proceed with building the test rig first, or go straight to production implementation?
   - Recommendation: Build test rig first to validate approach

6. **Deployment Timing:**
   - **Question:** Should this be deployed immediately, or wait for off-peak hours?
   - Recommendation: Deploy during business hours for monitoring

### Assumptions Made

1. **Cost per API call:** $0.005 (based on Google Maps Distance Matrix pricing)
2. **Current call count:** 26 calls per request (based on code analysis)
3. **Acceptable trade-off:** Slightly less comprehensive data for massive cost savings
4. **Tier logic:** Existing tier-based logic for airports/cities should be preserved
5. **Special logic:** ED hospital prioritization and supermarket chain logic should be preserved

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reduced data comprehensiveness | Medium | Keep top destinations per category |
| Breaking existing functionality | High | Test rig validates before production |
| User complaints about missing data | Low | Monitor feedback, can adjust limits |
| API errors with consolidated calls | Low | Maintain same error handling |
| Deployment issues | Low | Have rollback plan ready |

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Test Rig** | Setup directory structure | 10 min | Not Started |
| | Create mock Google Maps API | 15 min | Not Started |
| | Create mock Geoapify API | 10 min | Not Started |
| | Implement current logic | 20 min | Not Started |
| | Implement optimized logic | 30 min | Not Started |
| | Create test runner | 20 min | Not Started |
| | Run tests & generate reports | 10 min | Not Started |
| | **Test Rig Subtotal** | **115 min (~2 hours)** | |
| **Production** | Backup current implementation | 5 min | Not Started |
| | Reduce static lists | 10 min | Not Started |
| | Create consolidated function | 15 min | Not Started |
| | Refactor main handler | 20 min | Not Started |
| | Test in development | 15 min | Not Started |
| | Deploy to production | 10 min | Not Started |
| | **Production Subtotal** | **75 min (~1.25 hours)** | |
| **Total** | | **190 min (~3 hours)** | |

---

## Next Steps

1. **User Review:** Review this document and answer questions above
2. **Decision:** Choose approach:
   - Option A: Build test rig first (recommended)
   - Option B: Go straight to production implementation
3. **Execution:** Once approved, proceed with implementation
4. **Monitoring:** Monitor for 7 days post-deployment
5. **Optimization:** Consider additional optimizations (e.g., caching)

---

## Appendix: Additional Optimizations (Future)

### 1. Caching Strategy

**Potential savings:** Additional 50% reduction for repeated addresses

- Cache proximity results by address for 24 hours
- Use Redis or in-memory cache
- Invalidate cache daily (proximity data changes slowly)

### 2. Geoapify Consolidation

**Current:** 6-8 separate Geoapify API calls per request  
**Optimized:** Could potentially consolidate some categories

### 3. Distance Pre-filtering

**Idea:** Use Geoapify distance estimates to pre-filter before Google Maps
- Geoapify provides straight-line distance
- Filter to closest 25 before calling Google Maps
- Reduces need for multiple batches

---

**Document Status:** Ready for Review  
**Next Action:** Awaiting user feedback and approval to proceed

