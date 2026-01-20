# Phase 4B Handoff Document
## "Why This Property" AI Content Generation

**Date:** January 21, 2026  
**For:** Chat D  
**Branch:** `feature/phase-4-ai-generation` (to be created from `feature/phase-3-step5-refactor`)  
**Previous Phase:** Phase 3 Complete ✅

---

## 🎯 Objective

Integrate AI content generation into the `WhyThisPropertyField` component. Auto-generate 7 bullet points about the property/suburb when Step 5 loads, with regenerate and error handling.

---

## 📋 Phase 3 Completion Summary

**What was completed:**
- ✅ `WhyThisPropertyField.tsx` extracted as independent component
- ✅ Component uses controlled pattern with `value` and `onChange` props
- ✅ Props include `suburb` parameter (ready for AI generation)
- ✅ Manual paste functionality working
- ✅ Smart quote cleanup implemented

**Component Location:** `form-app/src/components/steps/step5/WhyThisPropertyField.tsx`

---

## 📚 Required Documents

**Primary Reference:**
- `planning_docs/07_step5_proximity_content_requirements_DEVELOPER_BUILD_SPEC.md` - Section 2

**Supporting References:**
- `IMPLEMENTATION-TRACKER.md` - Overall project tracking
- `PHASE-3-IMPLEMENTATION-SUMMARY.md` - Component structure

---

## 🔧 Implementation Requirements

### Feature 1: Auto-Generate on Page Load

**Trigger:** When Step 5 loads and suburb is available

**Logic:**
```typescript
useEffect(() => {
  if (suburb && !value) {
    // Only auto-generate if field is empty
    generateContent(suburb);
  }
}, [suburb]);
```

**API Call:**
- Endpoint: `POST /api/ai/generate-content` (to be created)
- Body: `{ suburb: string, type: 'why-property' }`
- Response: `{ content: string }` (7 bullet points)

**Loading State:**
- Show spinner with text: "Generating content..."
- Disable text area while loading

---

### Feature 2: Backend API Endpoint

**Create:** `form-app/src/app/api/ai/generate-content/route.ts`

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai'; // or Google Gemini SDK

export async function POST(request: NextRequest) {
  try {
    const { suburb, type } = await request.json();
    
    if (!suburb) {
      return NextResponse.json(
        { error: 'Suburb is required' },
        { status: 400 }
      );
    }
    
    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY; // or GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Initialize AI client
    const openai = new OpenAI({ apiKey });
    
    // Generate content
    const prompt = getPrompt(suburb, type);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    
    const content = completion.choices[0]?.message?.content || '';
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

function getPrompt(suburb: string, type: string): string {
  if (type === 'why-property') {
    return `You are a real estate investment summary tool. Generate 7 bullet points about why ${suburb} is a good investment location. Format each point as:
* **Heading** - Description

Focus on:
- Infrastructure and development
- Transport and accessibility
- Schools and education
- Employment and economy
- Lifestyle and amenities
- Market performance
- Future growth potential

Be specific to ${suburb} and use real data where possible.`;
  }
  
  return '';
}
```

---

### Feature 3: Regenerate Button

**UI Component:**
- Button: "Regenerate"
- Position: Below text area
- Action: Re-run AI query

**Logic:**
```typescript
const handleRegenerate = async () => {
  if (suburb) {
    await generateContent(suburb);
  }
};
```

**Behavior:**
- Replace existing content with new generation
- Show loading state during regeneration
- Keep button enabled even after generation

---

### Feature 4: Error Handling

**Trigger:** If API call fails

**Error Message:**
```
"The AI service could not be reached. 
Please generate content manually via Chat GPT 
and paste the results below."
```

**Fallback:**
- Show error message (friendly, obvious)
- Provide empty text area for manual paste
- Show "Retry" button

**Error States:**
```typescript
interface AIState {
  loading: boolean;
  error: string | null;
  generated: boolean;
}
```

---

## 📦 Updated Component Interface

```typescript
interface WhyThisPropertyFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string; // Suburb name from formData
  disabled?: boolean;
}

export function WhyThisPropertyField({ 
  value, 
  onChange, 
  suburb, 
  disabled 
}: WhyThisPropertyFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Auto-generate on mount
  useEffect(() => {
    if (suburb && !value && !generated) {
      generateContent(suburb);
    }
  }, [suburb]);

  const generateContent = async (sub: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb: sub, 
          type: 'why-property' 
        }),
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      onChange(data.content);
      setGenerated(true);
    } catch (err) {
      setError('The AI service could not be reached...');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (suburb) {
      generateContent(suburb);
    }
  };

  // ... rest of component
}
```

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────┐
│ Why This Property                                │
├─────────────────────────────────────────────────┤
│                                                  │
│ [Loading Spinner] Generating content...         │
│                                                  │
│ OR                                               │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ * **Infrastructure** - Major upgrades...    │ │
│ │ * **Transport** - New train line...         │ │
│ │ * **Schools** - Top-rated schools...        │ │
│ │ [Editable text area with AI content]        │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ [Regenerate]                                     │
│                                                  │
│ OR (if error)                                    │
│                                                  │
│ ⚠ The AI service could not be reached...       │
│ [Retry]                                          │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔑 Environment Configuration

### Required Environment Variables

**User needs to add to `.env.local`:**

**For OpenAI:**
```env
OPENAI_API_KEY=sk-...your-key-here...
```

**OR for Google Gemini:**
```env
GEMINI_API_KEY=...your-key-here...
```

### API Provider Choice

**User will decide:** OpenAI GPT-4 or Google Gemini

**Implementation should support both:**
```typescript
const provider = process.env.AI_PROVIDER || 'openai'; // or 'gemini'

if (provider === 'openai') {
  // Use OpenAI SDK
} else if (provider === 'gemini') {
  // Use Gemini SDK
}
```

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Auto-generation runs when Step 5 loads
- [ ] Loading spinner displays during generation
- [ ] Content populates text area when complete
- [ ] Text area remains fully editable after population
- [ ] Regenerate button works
- [ ] Error handling displays friendly message
- [ ] Manual paste fallback works when API fails
- [ ] "Retry" button works after error

### Content Quality
- [ ] Generates 7 bullet points
- [ ] Format: `* **Heading** - Description`
- [ ] Content is specific to suburb
- [ ] Content is relevant for investment

### Code Quality
- [ ] No linter errors
- [ ] Type-safe implementation
- [ ] Proper error handling
- [ ] API key security (server-side only)
- [ ] No race conditions

---

## 🚨 Important Notes

### API Endpoint
- **Endpoint:** `/api/ai/generate-content` (NEW - to be created)
- **Location:** `form-app/src/app/api/ai/generate-content/route.ts`
- **Status:** Not yet implemented

### Security
- ⚠️ **NEVER expose API keys in client-side code**
- ✅ Keep API calls server-side only
- ✅ Validate all inputs
- ✅ Handle rate limiting

### Don't Break Existing Functionality
- ✅ Keep manual paste working
- ✅ Keep smart quote cleanup
- ✅ Keep controlled component pattern
- ✅ Don't change component props interface

### AI Prompt
**User will provide the exact prompt text.** Use placeholder for now:
```
"You are a real estate investment summary tool. Generate 7 bullet points about why [Suburb] is a good investment location..."
```

---

## 📊 Implementation Checklist

### Setup
- [ ] Review `WhyThisPropertyField.tsx` current implementation
- [ ] Decide on AI provider (OpenAI or Gemini)
- [ ] Get API key from user
- [ ] Get exact prompt text from user
- [ ] Create `feature/phase-4-ai-generation` branch
- [ ] Update `IMPLEMENTATION-TRACKER.md` status to "In Progress"

### Backend Implementation
- [ ] Create `/api/ai/generate-content/route.ts`
- [ ] Install AI SDK (`npm install openai` or `@google/generative-ai`)
- [ ] Implement POST handler
- [ ] Add environment variable validation
- [ ] Implement prompt generation
- [ ] Add error handling
- [ ] Test API endpoint independently

### Frontend Implementation
- [ ] Add state management (loading, error, generated)
- [ ] Implement auto-generate useEffect
- [ ] Implement generateContent function
- [ ] Add loading spinner UI
- [ ] Add regenerate button
- [ ] Implement error handling
- [ ] Add error message display
- [ ] Add "Retry" button

### Testing
- [ ] Test auto-generation on Step 5 load
- [ ] Test with valid suburb
- [ ] Test regenerate functionality
- [ ] Test error handling (simulate API failure)
- [ ] Test manual paste fallback
- [ ] Test that content remains editable
- [ ] Verify no console errors
- [ ] Test with different suburbs

### Documentation
- [ ] Update `IMPLEMENTATION-TRACKER.md` with progress
- [ ] Add inline comments
- [ ] Document environment variables needed
- [ ] Create `PHASE-4B-IMPLEMENTATION-SUMMARY.md`

### Completion
- [ ] Commit changes with clear message
- [ ] Update tracker to "Complete"
- [ ] Return to Coordinator Chat

---

## 🔗 Related Files

**To Create:**
- `form-app/src/app/api/ai/generate-content/route.ts` (NEW)

**To Modify:**
- `form-app/src/components/steps/step5/WhyThisPropertyField.tsx`

**To Update:**
- `.env.local` (add API key)
- `package.json` (add AI SDK dependency)

---

## 📦 Dependencies to Install

**For OpenAI:**
```bash
npm install openai
```

**For Google Gemini:**
```bash
npm install @google/generative-ai
```

---

## 🎯 Estimated Effort

**Complexity:** Medium  
**Estimated Time:** 3-4 hours  
**Risk Level:** Medium (external API dependency)

**Risks:**
- API might be slow or rate-limited
- API key configuration issues
- Content quality might vary
- Cost considerations (API usage)

**Mitigation:**
- Add timeout for API calls
- Comprehensive error handling
- Cache responses if possible
- Monitor API usage

---

## 📞 Coordination

**When Complete:**
1. Commit all changes to `feature/phase-4-ai-generation`
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4B-IMPLEMENTATION-SUMMARY.md`
4. Return to **Coordinator Chat** with summary

**If Blocked:**
1. Need exact AI prompt text from user
2. Need API provider choice (OpenAI vs Gemini)
3. Need API key from user
4. Document blocker in `IMPLEMENTATION-TRACKER.md`
5. Return to **Coordinator Chat** for assistance

---

## 🚀 Ready to Begin

**Branch:** Create `feature/phase-4-ai-generation` from `feature/phase-3-step5-refactor`  
**Status:** Ready to start (pending user input on API provider and prompt)  
**Parallel Work:** Can be done alongside Phase 4A and 4C

---

**Prepared by:** Coordinator Chat  
**Date:** January 21, 2026  
**Status:** Ready for Chat D (pending user configuration)
