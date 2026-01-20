# Stashproperty Integration - Requirements Discussion

## Current Flow

```
Module 1 (Webhook) 
  ↓ Receives: property_address, opportunity_id, etc.
Module 13 (GHL Get Record)
  ↓ Returns: GHL property data (properties object)
Module 16 (Extract packager_approved)
  ↓ Extracts: packager_approved status
Module 6 (Preprocess)
  ↓ Merges: GHL data + webhook data
Module 3 (Email Builder)
  ↓ Generates: Email HTML
Module 7 (HTML Extractor)
  ↓ Extracts: Clean HTML
Module 14 (Gmail Send)
  ↓ Sends: Email
```

---

## Questions to Answer

### 1. What data do we need from Stashproperty?

**From the API response, we get:**
- ✅ Zoning code & description
- ✅ LGA & State
- ✅ Flood risk (Yes/No + details)
- ✅ Bushfire risk (Yes/No + details)
- ✅ Heritage risk (Yes/No + details)
- ✅ Biodiversity risk (Yes/No + details)
- ✅ Planning scheme links

**What we DON'T get:**
- ❌ Property details (beds, baths, car spaces, land size)
- ❌ These come from GHL, not Stashproperty

---

### 2. When do we need Stashproperty data?

**Option A: For all emails (Packager, BA, Client)**
- Packager emails need risk overlays
- BA emails need risk overlays
- Client emails need risk overlays

**Option B: Only for Client emails**
- Packager/BA emails don't need risk overlays
- Only client-facing emails need them

**Option C: Only when GHL doesn't have the data**
- Use Stashproperty as fallback if GHL fields are empty

**Which scenario applies?**

---

### 3. What data do we need to call Stashproperty API?

**Required:**
- Latitude & Longitude (or property address to geocode)

**Questions:**
- Does Module 13 (GHL) return `latitude` and `longitude`?
- Or does it only return `property_address`?
- Do we need to geocode the address first?

---

### 4. Where should Stashproperty API be placed?

**Option A: After Module 13**
```
Module 13 → Stashproperty API → Module 16 → Module 6 → Module 3
```
**Pros:**
- Have GHL data available
- Can check if GHL has lat/lon
- Can use GHL address if needed

**Cons:**
- Runs even if we don't need Stashproperty data
- Adds latency to all requests

**Option B: After Module 6 (before Module 3)**
```
Module 13 → Module 16 → Module 6 → Stashproperty API → Module 3
```
**Pros:**
- Only runs when we have all data merged
- Can check if risk overlays are already filled

**Cons:**
- Need to pass data through Module 6 first
- More complex data flow

**Option C: Parallel to Module 13**
```
Module 13 ──┐
            ├─→ Module 16 → Module 6 → Module 3
Stashproperty ─┘
```
**Pros:**
- Runs in parallel (faster)
- Independent of GHL data

**Cons:**
- Need address/lat-lon from Module 1
- More complex routing

**Which approach do you prefer?**

---

### 5. Should Stashproperty data be optional or required?

**Option A: Always call Stashproperty**
- Every property gets risk overlay data
- More complete emails
- But: API calls cost credits, tokens expire

**Option B: Only if GHL data is missing**
- Check if GHL has risk overlay fields
- Only call Stashproperty if empty
- Saves API calls

**Option C: Configurable**
- Add a flag/field to control when to call
- Some properties might not need it

**Which approach?**

---

### 6. Error handling

**What should happen if Stashproperty API fails?**
- Option A: Continue without Stashproperty data (use GHL only)
- Option B: Fail the scenario (require Stashproperty data)
- Option C: Retry X times, then continue without it

**What's your preference?**

---

### 7. Token refresh

**Current situation:**
- Token expires and needs manual refresh
- Not sustainable for production

**Options:**
- Option A: Find login endpoint, automate token refresh
- Option B: Use API key if Stashproperty provides one
- Option C: Manual refresh process (documented)
- Option D: Contact Stashproperty for API documentation

**What's the priority?**

---

## Recommended Approach (Pending Your Input)

Based on typical patterns, I'd suggest:

1. **Placement:** After Module 13
   - We have GHL data available
   - Can check for lat/lon or address
   - Can decide if Stashproperty is needed

2. **When to call:** Always (for now)
   - Ensures all emails have risk overlay data
   - Can optimize later if needed

3. **Error handling:** Continue without Stashproperty
   - Don't fail if API is down
   - Use GHL data as fallback

4. **Token refresh:** Find login endpoint
   - Automate token refresh
   - Make it production-ready

---

## What I Need From You

1. **Does Module 13 return `latitude` and `longitude`?**
   - Or only `property_address`?

2. **When do you need Stashproperty data?**
   - All emails? Only client emails? Only when missing?

3. **What's your preference for module placement?**
   - After Module 13? After Module 6? Parallel?

4. **How critical is Stashproperty data?**
   - Must have? Nice to have? Optional?

5. **Token refresh priority?**
   - Urgent? Can wait? Manual is fine for now?

---

**Once you answer these, I'll create the exact integration plan!**









