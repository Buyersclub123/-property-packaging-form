# Phase 2 Batch Optimization - Test Plan & Logic Review

## Test Address
**Address:** `4 Osborne Circuit Maroochydore QLD 4558`

---

## Part 1: Baseline Comparison Test

### Step 1: Get Baseline Results (Old Code - Separate Calls)
1. **Temporarily restore backup:**
   ```powershell
   Copy-Item "src\app\api\geoapify\proximity\route.ts.backup" "src\app\api\geoapify\proximity\route.ts"
   ```

2. **Test with address:** `4 Osborne Circuit Maroochydore QLD 4558`
   - Make API call to `/api/geoapify/proximity`
   - **Capture console logs** - count Google Maps API calls
   - **Capture full response** - all categories and results

3. **Document baseline results:**
   - Total Google Maps API calls made: `____`
   - Categories returned:
     - Airports: `____`
     - Cities: `____`
     - Train Stations: `____`
     - Bus Stops: `____`
     - Kindergartens: `____`
     - Childcare: `____`
     - Schools: `____`
     - Supermarkets: `____`
     - Hospitals: `____`
   - Full response JSON saved to: `baseline-results.json`

### Step 2: Get Optimized Results (New Code - Batched Calls)
1. **Restore optimized code:**
   ```powershell
   # (Code is already in place, but if needed)
   # Copy-Item "src\app\api\geoapify\proximity\route.ts" "src\app\api\geoapify\proximity\route.ts.optimized"
   ```

2. **Test with same address:** `4 Osborne Circuit Maroochydore QLD 4558`
   - Make API call to `/api/geoapify/proximity`
   - **Capture console logs** - should show only 2 Google Maps API calls
   - **Capture full response** - all categories and results

3. **Document optimized results:**
   - Total Google Maps API calls made: `____` (should be 2)
   - Categories returned:
     - Airports: `____`
     - Cities: `____`
     - Train Stations: `____`
     - Bus Stops: `____`
     - Kindergartens: `____`
     - Childcare: `____`
     - Schools: `____`
     - Supermarkets: `____`
     - Hospitals: `____`
   - Full response JSON saved to: `optimized-results.json`

### Step 3: Compare Results
1. **Compare category counts** - should match
2. **Compare specific amenities** - should be same or very similar
3. **Compare distances/times** - should match (within rounding)
4. **Verify cost reduction** - from ~26 calls to 2 calls = 92% reduction

---

## Part 2: Logic Review with ChatGPT & Google AI

### Questions to Ask Both AI Systems:

#### Question 1: Batching Strategy
**Prompt:**
```
I'm optimizing a Google Maps Distance Matrix API integration. Currently, I make separate API calls for each category of destinations (airports, cities, train stations, etc.), resulting in 26-30 API calls per request.

I want to reduce this to 2 calls by batching:
- Batch 1: 10 airports + 8 cities (18 destinations total) - all use addresses
- Batch 2: All amenities from Geoapify API (up to 25 destinations) - all use coordinates (lat/lon)

The Google Maps Distance Matrix API allows up to 25 destinations per request. I'm using a consolidated function that accepts both addresses and coordinates, converting them appropriately.

Is this batching strategy correct? Are there any issues with mixing addresses and coordinates in the same batch?
```

#### Question 2: Result Alignment
**Prompt:**
```
I'm processing results from a batched Google Maps Distance Matrix API call. The destinations are:
- Index 0-9: 10 airports (addresses)
- Index 10-17: 8 cities (addresses)
- Index 18+: Various amenities (coordinates)

After getting results, I need to:
1. Process airports (indices 0-9) with tier logic
2. Process cities (indices 10-17) with tier logic
3. Process amenities sequentially by category

Is my approach of using array indices to align results correct? What happens if some destinations fail (status != 'OK')? Should I maintain a separate metadata array to track which result corresponds to which destination?
```

#### Question 3: Geoapify Pre-filtering
**Prompt:**
```
Before batching amenities into Google Maps, I:
1. Call Geoapify API for each category (train stations, bus stops, schools, etc.) in parallel
2. Filter/process results (e.g., filter train stations, find closest bus stop, etc.)
3. Take top N results from each category
4. Batch all selected amenities into single Google Maps call

Is this approach correct? Should I filter before or after getting distances? Does pre-filtering risk missing closer amenities that would be found if I queried Google Maps first?
```

#### Question 4: Error Handling
**Prompt:**
```
In my batched Google Maps Distance Matrix API call, if some destinations return status != 'OK', I'm pushing { distance: 0, duration: 0 } to maintain array alignment. Then I filter out results with distance > 0.

Is this the correct approach? Should I handle errors differently? What if the entire batch fails?
```

---

## Part 3: Implementation Review Checklist

### Batch 1 (Airports + Cities)
- [ ] 10 airports reduced from 26
- [ ] 8 cities reduced from 30
- [ ] All 18 destinations batched into single call
- [ ] Results correctly aligned (indices 0-9 for airports, 10-17 for cities)
- [ ] Tier logic still works correctly
- [ ] Same airports/cities selected as before

### Batch 2 (Amenities)
- [ ] All Geoapify calls made in parallel (Promise.all)
- [ ] Filtering logic preserved (train stations, bus stops, etc.)
- [ ] Top N results selected per category before batching
- [ ] All amenities batched into single call (up to 25)
- [ ] Results correctly processed by category
- [ ] Chain matching for supermarkets still works
- [ ] ED hospital logic for hospitals still works

### Consolidated Function
- [ ] `getConsolidatedDistances()` handles both addresses and coordinates
- [ ] Origin uses coordinates (more accurate)
- [ ] Destinations use address if available, else coordinates
- [ ] Batching respects 25-destination limit
- [ ] Error handling maintains array alignment
- [ ] API call counting works correctly

### Logging
- [ ] Console logs show batch start/completion
- [ ] API call count logged correctly
- [ ] Total calls should be 2 (not 26-30)

---

## Part 4: Test Execution

### Test 1: Baseline (Old Code)
```bash
# Restore backup
Copy-Item "src\app\api\geoapify\proximity\route.ts.backup" "src\app\api\geoapify\proximity\route.ts"

# Restart dev server
npm run dev

# Make API call (use Postman or form)
POST http://localhost:3000/api/geoapify/proximity
Body: {
  "propertyAddress": "4 Osborne Circuit Maroochydore QLD 4558",
  "userEmail": "test@buyersclub.com.au"
}

# Capture:
# - Console logs (count API calls)
# - Response JSON (save to baseline-results.json)
```

### Test 2: Optimized (New Code)
```bash
# Restore optimized code (already in place)
# Copy-Item "src\app\api\geoapify\proximity\route.ts.optimized" "src\app\api\geoapify\proximity\route.ts"

# Restart dev server
npm run dev

# Make same API call
POST http://localhost:3000/api/geoapify/proximity
Body: {
  "propertyAddress": "4 Osborne Circuit Maroochydore QLD 4558",
  "userEmail": "test@buyersclub.com.au"
}

# Capture:
# - Console logs (should show 2 API calls)
# - Response JSON (save to optimized-results.json)
```

### Test 3: Comparison
```bash
# Compare JSON files
# Use diff tool or manual comparison
# Verify:
# - Same categories present
# - Same or very similar amenities
# - Same distances/times (within rounding)
```

---

## Expected Results

### Baseline (Old Code)
- **API Calls:** ~26-30 Google Maps Distance Matrix calls
- **Cost per request:** ~$0.13
- **Response time:** Slower (many sequential calls)

### Optimized (New Code)
- **API Calls:** 2 Google Maps Distance Matrix calls
- **Cost per request:** ~$0.01 (92% reduction)
- **Response time:** Faster (2 parallel calls)

### Categories Should Match
- Airports: Same tier logic, same airports selected
- Cities: Same tier logic, same cities selected
- Train Stations: Closest 1
- Bus Stops: Closest 1
- Kindergartens/Childcare: Top 4
- Schools: Top 3
- Supermarkets: Closest + 4 chains
- Hospitals: Closest ED + 1 more

---

## Next Steps After Testing

1. ✅ Review AI feedback on logic
2. ✅ Compare baseline vs optimized results
3. ✅ Fix any issues found
4. ✅ Re-test
5. ✅ Commit to Git
6. ✅ Deploy to production
7. ✅ Monitor Google Cloud API usage
