# Sourced By & Packaged By - Implementation Note

## Fields Needed
- **Sourced By**: Who found/identified the property
- **Packaged By**: Who packaged the property for review

## Considerations

### Email Validation Rules (from Market Performance implementation):
- Must be individual `@buyersclub.com.au` email addresses
- **BLOCKED**: `Properties@buyersclub.com.au`, `Packaging@buyersclub.com.au`
- **ALLOWED**: Individual accounts like `john.smith@buyersclub.com.au`

### Questions to Review:
1. **Where should these fields appear in the form?**
   - Step 0 (Address & Risk)?
   - Step 1 (Decision Tree)?
   - Step 5 (Review & Submit)?
   - Separate step?

2. **Should these fields:**
   - Auto-populate from the logged-in user's email?
   - Allow manual entry/override?
   - Be editable after initial entry?

3. **For Projects (Multiple Lots):**
   - Same "Sourced By" for all lots?
   - Same "Packaged By" for all lots?
   - Or can different people package different lots?

4. **Storage:**
   - Store in form state?
   - Store in Google Sheet (one per lot for projects)?
   - Store in GHL Custom Object?

5. **Validation:**
   - Required fields?
   - Must match email validation rules (individual accounts only)?

## Implementation Approach
- Use same email validation as Market Performance (`src/lib/userAuth.ts`)
- Store in form store
- Add to form submission data
- Include in Google Sheet and GHL records

## Status
**TODO**: Review and implement before form completion





