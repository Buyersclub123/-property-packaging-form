# Backend Batch Optimization - Executive Summary

**Date:** January 25, 2026  
**Status:** Ready for Review & Implementation  
**Full Plan:** See `BACKEND-BATCH-OPTIMIZATION-IMPLEMENTATION-PLAN.md`

---

## The Problem

Your proximity API currently makes **26 Google Maps API calls** per request:
- Airports: 2 calls (26 airports in batches of 25)
- Cities: 2 calls (30 cities in batches of 25)
- Train stations: ~4 calls (100 results in batches of 25)
- Bus stops: ~4 calls
- Kindergarten/Childcare: ~6 calls
- Schools: ~4 calls
- Supermarkets: ~4 calls
- Hospitals: ~2 calls

**Cost:** $0.13 per request  
**Bot Attack Impact:** 730 calls × $0.13 = **$95**

---

## The Solution

Consolidate into **2 Google Maps API calls** per request:

### Batch 1: Static Destinations (1 call)
- Top 10 airports (down from 26)
- Top 8 cities (down from 30)
- Total: 18 destinations in 1 call

### Batch 2: Dynamic Destinations (1 call)
- Top 3 train stations
- Top 3 bus stops
- Top 4 kindergarten/childcare
- Top 3 schools
- Top 4 supermarkets (closest + major chains)
- Top 3 hospitals (prioritize ED)
- Total: ~20 destinations in 1 call

**New Cost:** $0.01 per request  
**Savings:** 92% reduction ($0.12 per request)  
**Bot Attack Impact:** 730 calls × $0.01 = **$7** (saves $88)

---

## What You Get

✅ **Massive Cost Savings:** 92% reduction in API costs  
✅ **All Categories Preserved:** Still shows airports, cities, and all 6 amenity types  
✅ **Quality Results:** Top destinations per category (closest + important ones)  
✅ **Special Logic Maintained:** Tier-based airports/cities, ED hospitals, supermarket chains  
✅ **Bot Protection:** Even if bots attack, costs stay low  

## What You Lose

⚠️ **Less Comprehensive:** 
- Airports: 26 → 10 (still covers all major airports)
- Cities: 30 → 8 (all capital cities)
- Amenities: ~100 per category → top 3-4 per category

**Business Impact:** Minimal - users still get all essential proximity data

---

## Implementation Approach

### Option A: Test Rig First (Recommended) - 3 hours total

1. **Build Test Rig** (2 hours)
   - Mock Google Maps API (tracks call count)
   - Mock Geoapify API (returns test data)
   - Current implementation (copy from production)
   - Optimized implementation (new 2-call logic)
   - Test runner (compares both, generates reports)

2. **Implement in Production** (1 hour)
   - Backup current code
   - Reduce airport/city lists
   - Create consolidated batching function
   - Refactor main handler
   - Test in dev
   - Deploy to production

### Option B: Direct to Production - 1.25 hours

Skip test rig, go straight to production implementation.

**Recommendation:** Option A (test rig first) for validation and confidence.

---

## Key Questions for You

### 1. Coverage vs. Cost Trade-off

**Current Plan:** Reduce to 10 airports, 8 cities (2 total calls)  
**Alternative:** Keep all 26 airports, 30 cities (4 total calls, still 85% savings)

**Which do you prefer?**
- [ ] Option 1: Maximum savings (2 calls, 92% reduction) - Less comprehensive
- [ ] Option 2: Balanced savings (4 calls, 85% reduction) - Full coverage

### 2. Implementation Approach

**Which approach?**
- [ ] Option A: Build test rig first (3 hours, more confidence)
- [ ] Option B: Direct to production (1.25 hours, faster)

### 3. Deployment Timing

**When should we deploy?**
- [ ] Immediately (during business hours for monitoring)
- [ ] Off-peak hours (less traffic, but harder to monitor)
- [ ] Specific date/time: _______________

### 4. Amenity Limits

Current plan: Top 3-4 per category (train, bus, schools, etc.)

**Is this sufficient?**
- [ ] Yes, top 3-4 is fine
- [ ] No, increase to top 5-10 per category (may require 2-3 calls for Batch 2)

---

## Expected Results

### Test Rig Output (if built)

```
🧪 BACKEND BATCH OPTIMIZATION TEST RIG
================================================================================

🏠 Testing Address: 5 Acacia St Point Vernon QLD 4655

🔴 CURRENT IMPLEMENTATION
   API calls: 26
   Cost: $0.130

🟢 OPTIMIZED IMPLEMENTATION
   API calls: 2
   Cost: $0.010

📊 SAVINGS: 24 calls (92%) → $0.120 saved
```

### Production Monitoring (7 days)

- Google Maps API calls: ↓ 92%
- Cost per request: $0.13 → $0.01
- Bot attack cost: $95 → $7
- User experience: No change (all data still present)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Reduced data quality | Low | Medium | Keep top destinations, monitor feedback |
| Breaking functionality | Low | High | Test rig validates, rollback plan ready |
| User complaints | Very Low | Low | Data still comprehensive for most use cases |
| API errors | Very Low | Low | Same error handling as current |

**Overall Risk:** LOW - High confidence in success

---

## File Locations

**Current Implementation:**
- `property-review-system/form-app/src/app/api/geoapify/proximity/route.ts`

**Test Rig (if built):**
- `property-review-system/test-rig/backend-batch-optimization/`

**Documentation:**
- Full Plan: `BACKEND-BATCH-OPTIMIZATION-IMPLEMENTATION-PLAN.md`
- Original Spec: `BACKEND-BATCH-OPTIMIZATION-TEST-RIG-PLAN.md`

---

## Next Steps

1. **Review this summary** and the full implementation plan
2. **Answer the 4 key questions** above
3. **Approve to proceed** with your chosen approach
4. **I will implement** according to your preferences
5. **Monitor results** for 7 days post-deployment

---

## Quick Decision Matrix

**If you want:**
- ✅ Maximum cost savings (92%) → Choose Option 1 (2 calls)
- ✅ Full coverage maintained (85% savings) → Choose Option 2 (4 calls)
- ✅ High confidence validation → Choose Test Rig First
- ✅ Fastest implementation → Choose Direct to Production

**My Recommendation:**
- Coverage: Option 1 (2 calls, 92% savings) - Top destinations are sufficient
- Approach: Test Rig First - Validates approach, generates proof
- Timing: Immediate deployment during business hours
- Amenity Limits: Top 3-4 is sufficient

---

**Ready to proceed when you are!** 🚀

Just let me know:
1. Your answers to the 4 questions
2. Any concerns or modifications
3. Approval to start implementation

