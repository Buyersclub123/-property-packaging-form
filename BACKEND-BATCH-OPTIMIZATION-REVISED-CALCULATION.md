# Backend Batch Optimization - REVISED CALCULATION
## Using Pre-filtering with Geoapify Distance

**Date:** January 25, 2026  
**Approach:** Apply tier/selection logic BEFORE calling Google Maps

---

## Current Implementation Analysis

### Airports & Cities - Tier Logic Requirements

**Airport Tier Logic (lines 536-566):**
1. Get distances for ALL 26 airports from Google Maps
2. Group by tier (1, 2, 3)
3. Find closest in each tier
4. Apply display rules:
   - If closest is Tier 3 → Show Tier 3 closest + Tier 1 closest
   - If closest is Tier 2 → Show Tier 2 closest + Tier 1 closest  
   - If closest is Tier 1 → Show Tier 1 closest + closest from Tier 2/3

**Result:** Shows 2 airports, but needs ALL 26 distances to determine which 2.

**City Tier Logic (lines 596-621):** Same pattern - needs all 30 city distances.

### Problem with Pre-filtering Airports/Cities

**We CANNOT pre-filter airports/cities using Geoapify distance because:**
- Airports/cities are hardcoded addresses (not Geoapify results)
- No straight-line distance available without calculation
- Tier logic requires knowing distances to ALL airports to determine tiers

**Conclusion:** Airports and cities MUST call Google Maps for all 26 + 30 = 56 destinations.

---

## Optimized Approach: Pre-filter Amenities Only

### Batch 1: Airports (ALL 26)
**Current:** 26 airports ÷ 25 per call = **2 Google Maps calls**
**Optimized:** Same - **2 Google Maps calls**
- Cannot reduce without breaking tier logic

### Batch 2: Cities (ALL 30)
**Current:** 30 cities ÷ 25 per call = **2 Google Maps calls**
**Optimized:** Same - **2 Google Maps calls**
- Cannot reduce without breaking tier logic

### Batch 3: Amenities (Pre-filtered using Geoapify)

**Current Process:**
1. Geoapify returns 70 train stations with distances
2. Send ALL 70 to Google Maps (3 calls)
3. Pick closest 1 from Google Maps results

**Optimized Process:**
1. Geoapify returns 70 train stations with distances (already sorted)
2. **Pre-filter: Take top 5 closest by Geoapify distance**
3. Send only 5 to Google Maps (part of consolidated call)
4. Pick closest 1 from Google Maps results

**Apply to all amenity categories:**

| Category | Geoapify Returns | Current GM Calls | Pre-filter To | Optimized GM Calls |
|----------|------------------|------------------|---------------|-------------------|
| Train Stations | 70 | 3 | 5 | Part of 1 |
| Bus Stops | 100 | 4 | 5 | Part of 1 |
| Kindergarten | 50 | 2 | 3 | Part of 1 |
| Childcare | 100 | 4 | 3 | Part of 1 |
| Schools | 100 | 4 | 5 | Part of 1 |
| Supermarkets | 100 | 4 | 5 | Part of 1 |
| Hospitals | 50 | 2 | 5 | Part of 1 |
| **TOTAL** | **570** | **23** | **31** | **2** |

**Batch 3 Consolidated:** 31 amenities ÷ 25 per call = **2 Google Maps calls**

---

## Final Calculation

### Total Google Maps API Calls

| Batch | Destinations | Current Calls | Optimized Calls | Savings |
|-------|-------------|---------------|-----------------|---------|
| Airports | 26 | 2 | 2 | 0 |
| Cities | 30 | 2 | 2 | 0 |
| Amenities | 570 → 31 | 23 | 2 | 21 |
| **TOTAL** | | **27** | **6** | **21 (78%)** |

### Cost Analysis

| Metric | Current | Optimized | Savings |
|--------|---------|-----------|---------|
| API Calls per Request | 27 | 6 | 21 calls |
| Cost per Request | $0.135 | $0.030 | $0.105 (78%) |
| Cost for 730 Requests | $98.55 | $21.90 | $76.65 |

---

## Why 6 Calls Instead of 2?

**Original goal of 2 calls assumed we could reduce airports/cities.**

**Reality:**
- Airports need ALL 26 to apply tier logic = 2 calls
- Cities need ALL 30 to apply tier logic = 2 calls  
- Amenities can be pre-filtered = 2 calls
- **Total: 6 calls**

**Still achieves 78% cost reduction!**

---

## Alternative: Compromise on Tier Logic

### Option A: Keep Tier Logic (6 calls, 78% savings)
- Airports: All 26 (2 calls)
- Cities: All 30 (2 calls)
- Amenities: Pre-filtered to 31 (2 calls)
- **Total: 6 calls = $0.030 per request**

### Option B: Simplify Tier Logic (3 calls, 89% savings)
- Airports: Pre-select 10 key airports (Group 1 + closest Group 2) = Part of 1 call
- Cities: Pre-select 10 key cities (capitals + major regional) = Part of 1 call
- Combined: 20 static destinations (1 call)
- Amenities: Pre-filtered to 25 (1 call)
- **Total: 2 calls = $0.010 per request**

**Trade-off:** Lose dynamic tier logic, but gain maximum savings.

### Option C: Hybrid Approach (4 calls, 85% savings)
- Airports + Cities: Consolidate into 3 calls instead of 4
  - Call 1: First 25 (mix of airports/cities)
  - Call 2: Next 25 (mix of airports/cities)
  - Call 3: Last 6 (remaining)
- Amenities: Pre-filtered to 25 (1 call)
- **Total: 4 calls = $0.020 per request**

---

## Recommendation

**Option A: Keep Full Tier Logic (6 calls)**

**Reasons:**
1. Preserves existing business logic (tier-based airport/city selection)
2. Still achieves 78% cost reduction ($98.55 → $21.90 for 730 requests)
3. No risk of breaking existing functionality
4. Easier to implement and test
5. Significant savings even with conservative approach

**Implementation:**
1. Keep airports/cities logic unchanged (4 calls total)
2. Add pre-filtering for amenities using Geoapify distance (2 calls)
3. Total: 6 calls instead of 27

---

## Implementation Details

### Pre-filtering Logic for Amenities

```typescript
// Example: Train Stations
const trainPlaces = await searchGeoapify(lon, lat, 'public_transport.train', 100000, 50);

// Geoapify already returns results sorted by distance
// Pre-filter: Take top 5 closest
const topTrainStations = trainPlaces.slice(0, 5);

// Add to consolidated batch for Google Maps
const amenitiesForGoogleMaps = [
  ...topTrainStations.map(p => ({ lat: p.geometry.coordinates[1], lon: p.geometry.coordinates[0] })),
  // ... other pre-filtered amenities
];

// ONE consolidated call for all amenities
const distances = await getDistancesFromGoogleMapsCoordinates(lat, lon, amenitiesForGoogleMaps);
```

### Pre-filter Quantities

Based on final display requirements:

| Category | Final Display | Pre-filter To | Reason |
|----------|--------------|---------------|---------|
| Train Stations | 1 | 5 | Buffer for filtering/validation |
| Bus Stops | 1 | 5 | Buffer for filtering/validation |
| Kindergarten | 2-4 | 3 | Direct match |
| Childcare | 2-4 | 3 | Direct match |
| Schools | 3 | 5 | Buffer for filtering |
| Supermarkets | 4-5 | 5 | Direct match (chains) |
| Hospitals | 2-3 | 5 | Buffer for ED filtering |
| **TOTAL** | | **31** | |

31 destinations ÷ 25 per call = **2 Google Maps calls**

---

## Success Metrics

### Before Optimization
- Google Maps API calls: 27 per request
- Cost: $0.135 per request
- Bot attack (730 calls): $98.55

### After Optimization  
- Google Maps API calls: 6 per request
- Cost: $0.030 per request
- Bot attack (730 calls): $21.90

### Savings
- API calls reduced: 78%
- Cost reduced: 78%
- Bot attack savings: $76.65

---

## Next Steps

1. **Confirm approach:** Option A (6 calls), B (2 calls), or C (4 calls)?
2. **Build test rig** to validate pre-filtering logic
3. **Implement** pre-filtering for amenities
4. **Test** in development
5. **Deploy** to production
6. **Monitor** for 7 days

---

**Status:** Awaiting confirmation of approach before proceeding with implementation.

