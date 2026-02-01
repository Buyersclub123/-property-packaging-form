# Phase 2 Discussion Items

## Old Process & Logic (6 Points)

1. **Separate API calls per category** - Each category (airports, cities, train stations, etc.) made its own Google Maps Distance Matrix API call
2. **Get distances for all Geoapify results** - For amenities, fetched distances for ALL results from Geoapify before filtering
3. **Filter by actual distance** - Sorted all results by Google Maps distance, then selected top N based on actual driving distance
4. **Full airport/city lists** - Used all 26 airports and 30 cities in hardcoded lists
5. **Category-specific processing** - Each category processed independently with its own logic (chain matching, ED hospital logic, etc.)
6. **Result: 26-30 Google Maps API calls** - One call per category, plus batching within categories if > 25 destinations

## New Process & Logic (6 Points)

1. **Batched API calls** - Consolidated into 2 calls: Batch 1 (airports + cities), Batch 2 (all amenities)
2. **Pre-filter Geoapify results** - Take top N from Geoapify BEFORE getting distances (e.g., top 3 schools, top 4 childcare)
3. **Get distances for pre-filtered results** - Only get Google Maps distances for the pre-selected top N results
4. **Reduced airport/city lists** - Reduced to 11 airports and 9 cities (removed some regionally important ones)
5. **Consolidated processing** - All amenities batched together, then processed by category after getting distances
6. **Result: 2 Google Maps API calls** - Massive reduction, but may miss closer amenities due to pre-filtering

## Discussion Items (In Isolation)

### Priority 1: Pre-filtering Strategy ⚠️
- **Issue:** Taking top N from Geoapify before getting distances may miss closer amenities
- **Question:** Get distances for all Geoapify results first, then filter? (More Google Maps calls if > 25 per category)
- **Impact:** Accuracy vs API call count trade-off

### 2: Airport/City List Management Logic
- **Issue:** Sunshine Coast Airport (MCY) and Sunshine Coast city missing - major airport for QLD
- **Question:** How should we manage which airports/cities to include? Regional importance vs list size?
- **Note:** Already added back, but need to discuss the logic/strategy

### 3: Missing Closer Amenities
- **Issue:** Missing closer schools, childcare, hospitals, IGA supermarket compared to old code
- **Question:** Is this acceptable, or do we need to fix pre-filtering to get distances first?

### 4: Error Handling When Category Fails
- **Question:** If one category fails (e.g., no train stations found), what does the system do?
- **Action:** Need to test failure scenarios to verify behavior

### 5: Duplicate Detection
- **Issue:** "Sunshine Coast Early Learning Riverside Kindergarten" appears twice
- **Question:** Where is the duplication happening? Geoapify or our processing?

### 6: Filtering Strategy Details
- **Question:** If we get distances for all results first, how do we handle > 25 destinations per category?
- **Options:** Multiple batches, or increase pre-filter limits?

### 7: Batch Size & Logic Trade-offs
- **Question:** What's acceptable trade-off between accuracy and API calls?
- **Clarification:** Are we concerned about Google Maps calls or Geoapify calls?

---

## Start Here: Priority 1 - Pre-filtering Strategy
