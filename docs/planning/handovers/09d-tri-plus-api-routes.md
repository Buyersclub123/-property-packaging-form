# Activity 9d: Tri-plus API Routes Implementation

## Goal
Add `dwelling_details` field mapping to submit and edit API routes to handle the JSON field.

## Context
- New GHL field: `dwelling_details` (multi-line text)
- Field key: `custom_objects.property_reviews.dwelling_details`
- Stores JSON array of all dwelling data
- Follow existing API field mapping patterns

## Requirements

### 1. Submit Route (`/api/ghl/submit-property/route.ts`)
Add `dwelling_details` field mapping:

**Pattern:** Follow existing `includeIfProvided` pattern
```typescript
dwelling_details: includeIfProvided(formData.dwellingDetails),
```

**Implementation:**
- Add to the field mappings object
- Use `includeIfProvided` utility (existing pattern)
- Handle empty/null values appropriately
- No transformation needed - store JSON string as-is

### 2. Edit GET Route (`/api/ghl/properties/[recordId]/route.ts`)
Add `dwelling_details` to GET response:

**Pattern:** Add to the response object
```typescript
dwelling_details: property.dwelling_details || "",
```

**Implementation:**
- Add to the data returned from GHL
- Default to empty string if null/undefined
- No parsing needed - return raw string from GHL

### 3. Edit PUT Route (`/api/ghl/properties/[recordId]/route.ts`)
Add `dwelling_details` field mapping:

**Pattern:** Follow existing `includeIfProvided` pattern
```typescript
dwelling_details: includeIfProvided(formData.dwellingDetails),
```

**Implementation:**
- Add to the update payload
- Use `includeIfProvided` utility
- Handle empty/null values appropriately
- Store JSON string as-is

### 4. Form Data Integration
The form will handle JSON serialization/deserialization:

**Submit/Edit:**
- Form stores dwelling data as array of objects
- Before API call: `JSON.stringify(dwellingsArray)`
- API receives string and stores in GHL

**Load/Edit:**
- API returns JSON string from GHL
- Form parses: `JSON.parse(dwelling_details)`
- Form displays as array of dwelling objects

### 5. Error Handling
- Handle invalid JSON gracefully (try/catch)
- Log errors for debugging
- Don't fail entire submission if `dwelling_details` has issues
- Validate JSON structure before sending

### 6. Character Limit Considerations
- GHL multi-line text field ~10,000 character limit
- Form should validate before submission
- Show error if JSON exceeds limit
- Consider splitting into 2 fields if needed (future enhancement)

## Implementation Notes

### Files to Modify
- `src/app/api/ghl/submit-property/route.ts`
- `src/app/api/ghl/properties/[recordId]/route.ts`

### Existing Patterns to Follow
- Look at how `dwelling_type` and `subject_line` were added (Activities 5 & 6)
- Use same `includeIfProvided` utility function
- Follow same error handling patterns

### Testing Scenarios
- Submit new Tri-plus property with dwelling data
- Edit existing Tri-plus property
- Submit with empty dwelling data
- Submit with invalid JSON (should handle gracefully)
- Load property with no dwelling data (empty string)

### Data Flow Examples

**Submit:**
```
Form: [{unitNumber: "1", beds: "2", ...}, {unitNumber: "2", beds: "3", ...}]
  -> JSON.stringify()
  -> "[{\"unitNumber\":\"1\",\"beds\":\"2\",...},{\"unitNumber\":\"2\",\"beds\":\"3\",...}]"
  -> API stores in GHL
```

**Load:**
```
GHL: "[{\"unitNumber\":\"1\",\"beds\":\"2\",...}]"
  -> API returns string
  -> JSON.parse()
  -> Form: [{unitNumber: "1", beds: "2", ...}]
```

## Deliverables
1. Add `dwelling_details` to submit route
2. Add `dwelling_details` to edit GET route  
3. Add `dwelling_details` to edit PUT route
4. Test all scenarios
5. Handle error cases appropriately

## References
- Activities 5 & 6 implementation patterns
- `dwelling_details` field key: `custom_objects.property_reviews.dwelling_details`
- JSON structure from design discussions
