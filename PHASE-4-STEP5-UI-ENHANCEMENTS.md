# Phase 4 - Step 5 UI Enhancements

**Date:** January 21, 2026  
**Status:** Enhancement Request (User Testing Feedback)  
**Applies To:** All three Step 5 field components

---

## 🎯 Enhancement Request

**From:** User testing session (January 21, 2026)  
**Issue:** Text areas on Step 5 have fixed height, requiring scrolling to review longer content  
**Request:** Make all text areas auto-grow with content

---

## 📋 Affected Components

All three Step 5 field components need this enhancement:

1. **`ProximityField.tsx`** - Proximity & Amenities text area
2. **`WhyThisPropertyField.tsx`** - "Why This Property" text area  
3. **`InvestmentHighlightsField.tsx`** - Investment Highlights text area

---

## 🔧 Implementation Approach

### Option 1: CSS-Only Solution (Simplest)

Use CSS Grid trick for auto-growing textarea:

```css
.auto-grow-wrap {
  display: grid;
}

.auto-grow-wrap::after {
  content: attr(data-replicated-value) " ";
  white-space: pre-wrap;
  visibility: hidden;
}

.auto-grow-wrap > textarea {
  resize: none;
  overflow: hidden;
}

.auto-grow-wrap > textarea,
.auto-grow-wrap::after {
  grid-area: 1 / 1 / 2 / 2;
  font: inherit;
  padding: 0.5rem;
  border: 1px solid #ccc;
}
```

**Usage:**
```tsx
<div className="auto-grow-wrap" data-replicated-value={value}>
  <textarea
    value={value}
    onChange={onChange}
    rows={1}
  />
</div>
```

---

### Option 2: React Hook (More Control)

Create a custom hook for auto-resize:

```typescript
// hooks/useAutoResize.ts
import { useEffect, useRef } from 'react';

export function useAutoResize(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return textareaRef;
}
```

**Usage in component:**
```tsx
export function ProximityField({ value, onChange }: Props) {
  const textareaRef = useAutoResize(value);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      style={{ overflow: 'hidden', resize: 'none' }}
    />
  );
}
```

---

### Option 3: Library Solution (Most Robust)

Use `react-textarea-autosize` package:

```bash
npm install react-textarea-autosize
```

```tsx
import TextareaAutosize from 'react-textarea-autosize';

export function ProximityField({ value, onChange }: Props) {
  return (
    <TextareaAutosize
      value={value}
      onChange={onChange}
      minRows={3}
      maxRows={20}
      className="w-full p-3 border rounded"
    />
  );
}
```

---

## 🎨 Design Requirements

### Minimum Height
- **Empty state:** 3-4 rows (enough to show placeholder/instructions)
- **With content:** Grows to fit all content

### Maximum Height
- **Option A:** No max height (grows infinitely)
- **Option B:** Max height with scroll after ~20 rows (prevents extremely long pages)

### Visual Behavior
- ✅ No visible scrollbar for normal content
- ✅ Smooth height transitions (optional: add CSS transition)
- ✅ Maintains padding and border styling
- ✅ Works with existing form styling

---

## 📦 Implementation Plan

### Phase 4A (Proximity) - Chat C
- [ ] Add auto-grow to `ProximityField.tsx`
- [ ] Test with short content (3-4 lines)
- [ ] Test with long content (15+ lines)
- [ ] Verify no layout breaking

### Phase 4B (AI Generation) - Chat D
- [ ] Add auto-grow to `WhyThisPropertyField.tsx`
- [ ] Use same approach as Phase 4A
- [ ] Test with AI-generated content (typically 7-10 paragraphs)

### Phase 4C (Investment Highlights) - Chat E
- [ ] Add auto-grow to `InvestmentHighlightsField.tsx`
- [ ] Use same approach as Phase 4A
- [ ] Test with various content lengths

---

## ✅ Success Criteria

### Functional
- [ ] Text area height adjusts automatically when content changes
- [ ] Works on initial load (when auto-populated)
- [ ] Works when user types/pastes content
- [ ] Works when content is cleared
- [ ] No performance issues with long content

### User Experience
- [ ] No scrolling needed to review content
- [ ] Easy to see full content at a glance
- [ ] Maintains readability with proper line height
- [ ] Consistent behavior across all three fields

### Code Quality
- [ ] Reusable solution (same code for all three components)
- [ ] No layout breaking or overflow issues
- [ ] Works on all screen sizes
- [ ] No console errors or warnings

---

## 🚀 Recommended Approach

**Recommendation:** Use **Option 2 (React Hook)** for these reasons:

✅ **Pros:**
- No external dependencies
- Full control over behavior
- Easy to customize
- Works with existing Tailwind/styling
- Can be shared across all three components

❌ **Cons of other options:**
- Option 1 (CSS): Requires data attribute sync, harder to maintain
- Option 3 (Library): Adds dependency, may conflict with existing styling

---

## 📝 Implementation Notes

### For Chat C (Phase 4A)
1. Create `form-app/src/hooks/useAutoResize.ts` with the hook
2. Apply to `ProximityField.tsx`
3. Test thoroughly
4. Document in Phase 4A summary

### For Chat D & E (Phase 4B & 4C)
1. Reuse the `useAutoResize` hook from Phase 4A
2. Apply to their respective components
3. Ensure consistent behavior

---

## 🔗 Related Documents

- **Phase 4A Handoff:** `PHASE-4A-HANDOFF-PROXIMITY.md`
- **Phase 4B Handoff:** `PHASE-4B-HANDOFF-AI-GENERATION.md`
- **Phase 4C Handoff:** `PHASE-4C-HANDOFF-INVESTMENT-HIGHLIGHTS.md`
- **Implementation Tracker:** `IMPLEMENTATION-TRACKER.md`

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for implementation in Phase 4A/B/C
