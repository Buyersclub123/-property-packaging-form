# Geoapify Places API Investigation

## Current Workflow

**Step 1:** ChatGPT Property Summary Tool
- Input: Property address
- Output: Address + list of 13 amenity names (no distances)

**Step 2:** Backend API (`amenity-distance-backend.onrender.com`)
- Input: Address + amenity list from ChatGPT
- Process: Uses Google Maps API to calculate distances
- Output: Formatted list with distances and travel times

**13 Amenities Required:**
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

**Output Format:**
```
Distance (time via car), Location Name
Sorted by distance (ascending)
```

---

## Geoapify Places API Investigation

### What We Need to Find Out

**1. Capabilities:**
- ✅ Can it find nearby places by category (schools, hospitals, etc.)?
- ✅ Can it calculate distances and travel times?
- ✅ Does it support all our required categories?
- ✅ Can it find "closest capital city" (special case)?

**2. Pricing:**
- Free tier limits?
- Cost per request?
- Monthly pricing tiers?
- Comparison to current Google Maps API costs

**3. Integration:**
- Can it replace both ChatGPT step AND backend API step?
- API documentation and examples
- Rate limits

---

## Research Status

**Web Search Results:** 
- Searches returned Google Places API results instead of Geoapify
- Need to check Geoapify website directly

**Next Steps:**
1. Visit `https://www.geoapify.com/` directly
2. Check Places API documentation
3. Review pricing page
4. Test API with sample request

---

## Comparison: Current vs Geoapify

### Current Approach
- **Step 1:** ChatGPT API call (cost: OpenAI API usage)
- **Step 2:** Backend API call (cost: Google Maps API usage)
- **Total:** 2 API calls per property

### Potential Geoapify Approach
- **Single Step:** Geoapify Places API call
- **Total:** 1 API call per property
- **Benefit:** Simpler workflow, potentially lower cost

---

## Questions to Answer

1. **Does Geoapify have all category types we need?**
   - Schools, hospitals, supermarkets ✅ (standard)
   - Kindergartens, child day cares ✅ (likely)
   - Train stations, bus stops ✅ (transit)
   - Beaches ✅ (recreation)
   - Airports ✅ (transport)
   - Closest capital city ❓ (special - may need custom logic)

2. **Can it calculate driving distances/times?**
   - Or just straight-line distances?

3. **Pricing comparison:**
   - Current: ChatGPT + Google Maps API costs
   - Geoapify: Single API cost
   - At 5-20 requests/day, which is cheaper?

---

## Action Items

- [ ] Visit Geoapify website and review Places API docs
- [ ] Check pricing page for current rates
- [ ] Test API with sample property address
- [ ] Compare costs vs current approach
- [ ] Evaluate if it can replace both steps

---

## Notes

- Usage: 5-20 requests per day (max)
- Current backend uses Google Maps API (costs apply)
- ChatGPT step may have rate limits (429 errors during testing)
