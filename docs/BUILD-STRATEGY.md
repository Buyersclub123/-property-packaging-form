# Build Strategy - Property Packaging Form

## Decision: Build Now, Test in Parallel

**Rationale:**
- ✅ Have enough information to start (webhook URL, request format, field mappings)
- ✅ 5-day timeline - can't afford to wait
- ✅ Build flexible integration layer that can adapt to actual response structure
- ✅ Test webhook in parallel, adjust integration as needed

---

## Phase 1: Foundation (Day 1-2)

### Build Form Structure
- [x] Multi-step workflow UI
- [x] Form field definitions
- [x] Conditional visibility logic
- [x] Validation rules
- [x] State management (save/resume)

### Build Flexible Stash Integration
- [x] Webhook call function (configurable URL)
- [x] Response parser (flexible field mapping)
- [x] Error handling (graceful failures)
- [x] Field mapping configuration (easy to update)

**Key Design:**
```javascript
// Flexible field mapping - can be updated after testing
const STASH_FIELD_MAPPING = {
  flood: 'floodRisk',           // Can adjust if field name differs
  bushfire: 'bushfireRisk',     // Can adjust if field name differs
  zoning: 'zoning',            // Can adjust if field name differs
  lga: 'lga',                  // Can adjust if field name differs
  state: 'state',              // Can adjust if field name differs
  latitude: 'latitude',        // May need to add to Module 7
  longitude: 'longitude'       // May need to add to Module 7
};

// Flexible response parser
function parseStashResponse(response) {
  // Handle different response structures
  // Extract fields based on mapping
  // Return standardized format
}
```

---

## Phase 2: Integration (Day 2-3)

### Test Stash Webhook (Parallel)
- [ ] Call webhook with test address
- [ ] Capture full response structure
- [ ] Document all available fields
- [ ] Update field mapping configuration
- [ ] Update Module 7 if needed (add coordinates)

### Build Google Sheets Integration
- [ ] Market Performance lookup (by Suburb/State)
- [ ] Investment Highlights lookup (by LGA/State)
- [ ] Data collection forms
- [ ] Write to Google Sheets

### Build ChatGPT Integration
- [ ] Property Summary Tool API call
- [ ] Proximity Tool API call
- [ ] Auto-populate fields
- [ ] Error handling

---

## Phase 3: Completion (Day 4-5)

### Form Submission
- [ ] GHL custom object write
- [ ] Deal Sheet sync
- [ ] Email generation
- [ ] Error logging

### Testing & Refinement
- [ ] End-to-end testing
- [ ] Adjust field mappings based on actual Stash response
- [ ] Fix any integration issues
- [ ] Polish UI/UX

---

## Flexible Integration Design

### Stash API Integration Layer

**File:** `src/integrations/stash.js`

```javascript
// Configuration - Easy to update after testing
const CONFIG = {
  webhookUrl: 'https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885',
  fieldMapping: {
    // Will be updated after testing
    flood: 'floodRisk',
    bushfire: 'bushfireRisk',
    zoning: 'zoning',
    lga: 'lga',
    state: 'state',
    latitude: 'latitude',      // May need to add
    longitude: 'longitude'     // May need to add
  },
  timeout: 30000, // 30 seconds
  retries: 2
};

// Flexible response parser
export async function getStashData(address) {
  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_address: address })
    });
    
    const data = await response.json();
    
    // Handle different response structures
    return parseStashResponse(data);
    
  } catch (error) {
    // Graceful error handling
    return {
      error: true,
      message: error.message,
      // Allow form to continue with manual entry
    };
  }
}

function parseStashResponse(data) {
  // Flexible parsing - handles different structures
  // Updates easily when we know actual structure
  
  return {
    flood: extractField(data, CONFIG.fieldMapping.flood),
    bushfire: extractField(data, CONFIG.fieldMapping.bushfire),
    zoning: extractField(data, CONFIG.fieldMapping.zoning),
    lga: extractField(data, CONFIG.fieldMapping.lga),
    state: extractField(data, CONFIG.fieldMapping.state),
    latitude: extractField(data, CONFIG.fieldMapping.latitude),
    longitude: extractField(data, CONFIG.fieldMapping.longitude),
    // Include raw data for debugging
    raw: data
  };
}

function extractField(data, fieldPath) {
  // Flexible field extraction
  // Handles nested objects, arrays, etc.
  // Can be updated easily
}
```

---

## Testing Strategy

### Parallel Testing
1. **Build form** with flexible integration
2. **Test webhook** separately (capture full response)
3. **Update configuration** when test results available
4. **No blocking** - form works with or without Stash data

### Test Scenarios
- [ ] Valid address (4 Osborne Circuit Maroochydore QLD 4558)
- [ ] Invalid address
- [ ] API timeout
- [ ] API error
- [ ] Missing fields in response

---

## Risk Mitigation

### If Stash Response Structure Differs
- ✅ Flexible parser handles different structures
- ✅ Configuration file easy to update
- ✅ Form works with manual entry if API fails

### If Coordinates Not in Response
- ✅ Form can use address for Google Maps
- ✅ Can add coordinates to Module 7 later
- ✅ Integration layer ready to handle coordinates when available

### If LGA Format Doesn't Match
- ✅ Can normalize/transform LGA format
- ✅ Can update mapping logic easily
- ✅ Form continues to work

---

## Success Criteria

- ✅ Form structure complete
- ✅ Stash integration works (even if needs adjustment)
- ✅ Form handles errors gracefully
- ✅ Can update integration without code changes (config file)
- ✅ Test results documented
- ✅ Integration refined based on actual response

---

## Next Steps

1. **Start building form foundation** (UI, workflow, fields)
2. **Build flexible Stash integration** (configurable, handles errors)
3. **Test webhook in parallel** (capture full response)
4. **Update integration** when test results available
5. **Continue building** other integrations

**No blocking - build and test in parallel!**







