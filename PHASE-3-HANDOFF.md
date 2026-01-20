# Phase 3 Handoff Document
## Step 5 Refactoring - Component Extraction

**Date:** January 21, 2026  
**For:** Chat B  
**Branch:** `feature/phase-3-step5-refactor` (to be created)  
**Previous Phase:** Phase 2 Complete ✅

---

## 🎯 Objective

Refactor `Step5Proximity.tsx` by extracting three independent field components. This "ringfences" each field's behavior and enables parallel development of Phase 4 automation features.

---

## 📋 Phase 2 Completion Summary

**What was completed:**
- ✅ Address construction utility (`addressFormatter.ts`)
- ✅ Google Sheets core fields mapping (rows 1-13)
- ✅ Google Sheets new fields mapping (rows 14-27)
- ✅ Type definitions for all new fields

**Key Questions Resolved:**
1. **Dual Occupancy Detection:** Uses `dualOccupancy === 'Yes'` OR presence of secondary fields
2. **Contract Type Field:** `formData.decisionTree?.contractTypeSimplified`
3. **Body Corp Detection:** Checks if title contains "strata" or "owners corp"

---

## 📚 Required Documents

**Primary Reference:**
- `planning_docs/02_developer_build_spec.md` - Step 5 refactoring specification
- `planning_docs/deployment_plan.md` - Phase 3 section

**Supporting References:**
- `planning_docs/07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` - Feature requirements for Phase 4
- `IMPLEMENTATION-TRACKER.md` - Overall project tracking

---

## 🔧 Implementation Requirements

### Step 5: Component Extraction

**Current State:**
- `Step5Proximity.tsx` is a monolithic component handling three distinct features
- Fields are tightly coupled, making parallel development difficult

**Target State:**
- Three independent, reusable components
- Clear separation of concerns
- No cross-field dependencies
- Ready for Phase 4 automation integration

---

## 📦 Components to Extract

### 1. ProximityField.tsx (or ProximitySection.tsx)

**Purpose:** Display and manage proximity/amenity data

**Current Location:** Part of `Step5Proximity.tsx`

**Features:**
- Text area for proximity results
- Manual paste functionality
- (Phase 4 will add: Auto-run on page load, address override, loading states)

**Props Interface:**
```typescript
interface ProximityFieldProps {
  value: string;
  onChange: (value: string) => void;
  address?: string; // For future auto-run feature
  disabled?: boolean;
}
```

**State Management:**
- Local state for text area value
- Controlled component pattern
- No dependencies on other Step 5 fields

---

### 2. WhyThisPropertyField.tsx (or PropertyContentSection.tsx)

**Purpose:** Display and manage "Why This Property" content

**Current Location:** Part of `Step5Proximity.tsx`

**Features:**
- Growing text area for property content
- Manual paste functionality
- (Phase 4 will add: AI generation, regenerate button, loading states)

**Props Interface:**
```typescript
interface WhyThisPropertyFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string; // For future AI generation
  disabled?: boolean;
}
```

**State Management:**
- Local state for text area value
- Controlled component pattern
- No dependencies on other Step 5 fields

---

### 3. InvestmentHighlightsField.tsx (or InvestmentHighlightsSection.tsx)

**Purpose:** Display and manage investment highlights/hotspotting reports

**Current Location:** Part of `Step5Proximity.tsx`

**Features:**
- Text area for investment highlights
- Manual paste functionality
- (Phase 4 will add: Google Sheets lookup, report selection, save logic)

**Props Interface:**
```typescript
interface InvestmentHighlightsFieldProps {
  value: string;
  onChange: (value: string) => void;
  lga?: string; // For future sheet lookup
  state?: string; // For future sheet lookup
  disabled?: boolean;
}
```

**State Management:**
- Local state for text area value
- Controlled component pattern
- No dependencies on other Step 5 fields

**Custom Hook (Optional):**
```typescript
// useInvestmentHighlights.ts
// For Phase 4: Will handle Google Sheets lookup logic
export function useInvestmentHighlights(lga?: string, state?: string) {
  // Placeholder for Phase 4 implementation
  return {
    loading: false,
    report: null,
    error: null,
  };
}
```

---

## 🏗️ Refactored Step5Proximity.tsx Structure

**After refactoring, the main component should be a composition:**

```typescript
// Step5Proximity.tsx (simplified)
export default function Step5Proximity() {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <h2>Property Content & Proximity</h2>
      
      {/* Component 1: Proximity */}
      <ProximityField
        value={formData.contentSections?.proximity || ''}
        onChange={(value) => updateFormData({
          contentSections: {
            ...formData.contentSections,
            proximity: value
          }
        })}
        address={formData.address?.propertyAddress}
      />

      {/* Component 2: Why This Property */}
      <WhyThisPropertyField
        value={formData.contentSections?.whyThisProperty || ''}
        onChange={(value) => updateFormData({
          contentSections: {
            ...formData.contentSections,
            whyThisProperty: value
          }
        })}
        suburb={formData.address?.suburb}
      />

      {/* Component 3: Investment Highlights */}
      <InvestmentHighlightsField
        value={formData.contentSections?.investmentHighlights || ''}
        onChange={(value) => updateFormData({
          contentSections: {
            ...formData.contentSections,
            investmentHighlights: value
          }
        })}
        lga={formData.address?.lga}
        state={formData.address?.state}
      />
    </div>
  );
}
```

---

## 📁 File Structure

**Create these new files:**
```
form-app/src/components/steps/step5/
├── ProximityField.tsx (or ProximitySection.tsx)
├── WhyThisPropertyField.tsx (or PropertyContentSection.tsx)
├── InvestmentHighlightsField.tsx (or InvestmentHighlightsSection.tsx)
└── useInvestmentHighlights.ts (optional hook for Phase 4)
```

**Modify:**
```
form-app/src/components/steps/Step5Proximity.tsx
```

**Update types (if needed):**
```
form-app/src/types/form.ts
```

---

## ✅ Success Criteria

### Functional Requirements
- [ ] All three components extracted and working independently
- [ ] No cross-field dependencies (changing one field doesn't affect others)
- [ ] Step 5 functionality unchanged (pure refactoring)
- [ ] All existing features still work (manual paste, save, navigation)

### Code Quality
- [ ] No linter errors
- [ ] Type-safe implementations
- [ ] Clear component interfaces (props)
- [ ] Comprehensive comments
- [ ] Reusable component structure

### Testing
- [ ] Test Step 5 after refactoring - verify all fields work
- [ ] Test form navigation (previous/next buttons)
- [ ] Test save functionality
- [ ] Test with empty/populated fields
- [ ] Verify no console errors

---

## 🚨 Important Notes

### What NOT to Do
- ❌ Do NOT add Phase 4 automation features yet (auto-run, AI generation, sheet lookup)
- ❌ Do NOT change field behavior or validation
- ❌ Do NOT modify form data structure (unless absolutely necessary)
- ❌ Do NOT add new dependencies without justification

### What TO Do
- ✅ Extract components with clean interfaces
- ✅ Maintain existing functionality exactly
- ✅ Add props for future Phase 4 features (address, suburb, lga, state)
- ✅ Document component purpose and usage
- ✅ Test thoroughly after refactoring

---

## 🔄 Phase 4 Preview

**After Phase 3 is complete, these components will be enhanced:**

**Phase 4A (Proximity):**
- Auto-run proximity API on page load
- Add loading spinner
- Add address override functionality
- Add error handling with fallback

**Phase 4B (Why This Property):**
- Add AI generation button
- Add regenerate functionality
- Add loading states
- Add error handling with fallback

**Phase 4C (Investment Highlights):**
- Add Google Sheets lookup
- Add report selection dropdown
- Add "match found" / "no match" UI
- Add save logic
- Add error handling with fallback

---

## 📊 Implementation Checklist

### Setup
- [ ] Review `planning_docs/02_developer_build_spec.md`
- [ ] Review current `Step5Proximity.tsx` implementation
- [ ] Create `feature/phase-3-step5-refactor` branch
- [ ] Update `IMPLEMENTATION-TRACKER.md` status to "In Progress"

### Component Extraction
- [ ] Create `step5/` subdirectory
- [ ] Extract `ProximityField.tsx`
- [ ] Extract `WhyThisPropertyField.tsx`
- [ ] Extract `InvestmentHighlightsField.tsx`
- [ ] Create `useInvestmentHighlights.ts` hook (optional)
- [ ] Refactor `Step5Proximity.tsx` to use new components

### Testing
- [ ] Test all three fields independently
- [ ] Test form navigation
- [ ] Test save functionality
- [ ] Verify no cross-field dependencies
- [ ] Check for console errors
- [ ] Run linter and fix any issues

### Documentation
- [ ] Update `IMPLEMENTATION-TRACKER.md` with progress
- [ ] Add inline comments to components
- [ ] Document any decisions or trade-offs
- [ ] Create `PHASE-3-IMPLEMENTATION-SUMMARY.md`

### Completion
- [ ] Commit changes with clear message
- [ ] Update tracker to "Complete"
- [ ] Return to Coordinator Chat for Phase 3 completion tasks

---

## 🔗 Related Files

**Current Implementation:**
- `form-app/src/components/steps/Step5Proximity.tsx` (to be refactored)

**Type Definitions:**
- `form-app/src/types/form.ts` (may need updates)

**Context:**
- Form context likely in `form-app/src/contexts/` or similar

---

## 📝 Questions to Resolve During Implementation

1. **Component Naming:** Use "Field" or "Section" suffix? (Recommend: Section for consistency)
2. **Form Data Structure:** Does `formData.contentSections` already exist?
3. **Validation:** Are there any validation rules for these fields?
4. **Character Limits:** Any max length for text areas?

**Action:** Document answers in implementation summary

---

## 🎯 Estimated Effort

**Complexity:** Medium (refactoring risk, but no new features)  
**Estimated Time:** 2-4 hours  
**Risk Level:** Medium

**Risks:**
- Breaking existing functionality during extraction
- Introducing subtle bugs in state management
- Missing edge cases in component isolation

**Mitigation:**
- Test thoroughly after each component extraction
- Make incremental commits
- Keep original functionality identical

---

## 📞 Coordination

**When Complete:**
1. Commit all changes to `feature/phase-3-step5-refactor`
2. Update `IMPLEMENTATION-TRACKER.md` to mark Phase 3 complete
3. Create `PHASE-3-IMPLEMENTATION-SUMMARY.md`
4. Return to **Coordinator Chat** with summary

**If Blocked:**
1. Document blocker in `IMPLEMENTATION-TRACKER.md`
2. Return to **Coordinator Chat** for assistance

---

## 🚀 Ready to Begin

**Branch:** Create `feature/phase-3-step5-refactor` from current `feature/phase-2-core-infrastructure`  
**Status:** Ready to start  
**Next Phase:** Phase 4 (Parallel development of three automation features)

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for Chat B
