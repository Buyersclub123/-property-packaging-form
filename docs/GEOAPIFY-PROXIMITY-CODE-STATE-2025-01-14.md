# Geoapify Proximity API - Current Code State

**Date:** 2025-01-14  
**Status:** Working but airports/train stations not appearing

## Current Implementation

### What's Working
- Geoapify API connection (API key: 61cf69f5359f4d5197a72214a78164c9)
- Geocoding via Geoscape
- Distance calculation (Haversine - straight line, NOT road distance - needs fixing)
- Major supermarket prioritization (Coles, Woolworths, ALDI, IGA)
- Results showing with distances

### Current Issues
1. **Airports not appearing** - Maroochydore Airport is ~15km away but not in results
2. **Train stations not appearing**
3. **Capital cities not appearing**
4. **Road distance** - Currently using straight-line, should use road network
5. **Road names in results** - "Sunshine Cove Way", "Main Road" appearing (some are bus stops/childcare)
6. **Business type suffixes** - Need to add (e.g., "Sunshine Cove Way Bus Stop")

### Code Location
`property-review-system/form-app/src/app/api/geoapify/proximity/route.ts`

### Key Settings
- Initial search radius: 50km
- Airport search: 200km if none in 50km
- Train station search: 100km if none in 50km
- Categories: childcare.kindergarten, education.school, commercial.supermarket, healthcare.hospital, public_transport.train, railway.train, public_transport.bus, beach, airport, populated_place.city, childcare

### Known Findings
- "Sunshine Cove Way" = bus_stop (should show as "Sunshine Cove Way Bus Stop")
- "Main Road" = child_daycare (should show as "Main Road Childcare")
- "Maroochydore Main Road" = child_daycare
- Airports ARE found when searching directly (tested: Sunshine Coast Airport found at ~15km)

### Next Steps Needed
1. Fix airport/train station category matching
2. Add business type suffixes to names
3. Switch to road distance calculation (Google Maps API)
4. Better filtering of pure road names vs places named after roads
