# Quick Start Guide

## What's Been Built

✅ **Complete Next.js project structure** with TypeScript  
✅ **Multi-step workflow UI** (8 steps)  
✅ **Flexible Stash API integration** (configurable, handles errors)  
✅ **Form state management** with persistence (save/resume)  
✅ **Step 0:** Decision Tree (complete)  
✅ **Step 1:** Address Entry with Stash integration (complete)  
✅ **Step 2:** Risk Overlays with Stash auto-population (complete)  
✅ **Steps 3-7:** Placeholders (ready for implementation)

## Installation

```bash
cd property-review-system/form-app
npm install
```

## Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## What Works Now

1. **Multi-step form navigation** - Click through steps
2. **Step 0:** Select property type, contract type, lot type - shows subject line preview
3. **Step 1:** Enter address, click "Check Stash" - calls webhook, shows loading/error states
4. **Step 2:** Risk overlays auto-populated from Stash (Flood, Bushfire), manual fields (Mining, Other Overlay, Special Infrastructure)
5. **Form state persists** - Refresh page, data is saved in localStorage

## Next Steps

1. **Test Stash webhook** - Call with test address, capture full response
2. **Update Stash integration** - Adjust field mapping based on actual response
3. **Build Step 4:** Market Performance (Google Sheets integration)
4. **Build Step 6:** Property Details (all form fields)
5. **Build Step 7:** Review & Submit (GHL API integration)

## Key Files

- `src/lib/stash.ts` - Flexible Stash API integration (easy to update)
- `src/store/formStore.ts` - Form state with persistence
- `src/types/form.ts` - TypeScript types
- `src/components/MultiStepForm.tsx` - Main form component
- `src/components/steps/` - Individual step components

## Configuration

Stash webhook URL is configured in:
- `next.config.js` - Environment variable
- `src/lib/stash.ts` - CONFIG object (can be updated easily)

## Notes

- Form works with or without Stash data (graceful error handling)
- State persists in localStorage (can resume later)
- Field mapping is flexible (update `CONFIG.fieldMapping` in `stash.ts`)







