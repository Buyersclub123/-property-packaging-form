# 🚀 Phase 4B - AI Content Generation - For Chat D

**Date:** January 21, 2026  
**Status:** Ready to start  
**Branch:** `feature/phase-4-ai-generation` (create from `feature/phase-3-step5-refactor`)

---

## 🎯 Your Mission

Integrate OpenAI GPT-4 to auto-generate "Why This Property" content in the `WhyThisPropertyField` component.

**What you're building:**
- Auto-generate 7 investment bullet points when Step 5 loads
- Regenerate button for new content
- Error handling with manual paste fallback
- Auto-growing textarea (reuse Phase 4A hook!)

---

## ✅ What's Already Done

Phase 3 extracted the component:
- ✅ `WhyThisPropertyField.tsx` exists and works
- ✅ Manual paste functionality working
- ✅ Smart quote cleanup implemented
- ✅ Controlled component pattern

Phase 4A created reusable hook:
- ✅ `useAutoResize` hook available at `form-app/src/hooks/useAutoResize.ts`
- ✅ Just import and use it!

---

## 🔑 Configuration (Already Provided by User)

### AI Provider: OpenAI GPT-4

**Environment Variables** (should already be in `.env.local`):
```env
OPENAI_API_KEY=your_real_openai_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1/chat/completions
```

### Exact Prompt Text (From User):

```
You are a real estate investment summary tool. Your job is to provide a list of 7 investment-based reasons why a specific property location is a strong investment, using suburb and LGA-level data.

Provide two outputs in the exact format below:

1. Full Detailed Reasons – 7 reasons, each starting with a bold heading (like "Strong Capital Growth"), followed by 2–4 sentences with suburb-specific data or explanation.  
2. Short One-Line Versions Only – list the same 7 headings only, in the same order as above.

Rules:
- No bullet points, asterisks, or extra spacing.
- No intro, explanation, or summary.
- Each reason must be based on real property investment criteria: capital growth, rental yield, vacancy, infrastructure, affordability, transport, and tenant demand.
- Use the suburb and LGA data for accuracy.
- Style must be consistent and clean for direct inclusion in a property investment report.

Suburb: ${suburb}
LGA: ${lga}
```

---

## 📋 Implementation Steps

### Step 1: Create Backend API Endpoint (1-1.5 hours)

**File:** `form-app/src/app/api/ai/generate-content/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { suburb, lga, type } = await request.json();
    
    if (!suburb || !lga) {
      return NextResponse.json(
        { error: 'Suburb and LGA are required' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    const apiBaseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    const prompt = `You are a real estate investment summary tool. Your job is to provide a list of 7 investment-based reasons why a specific property location is a strong investment, using suburb and LGA-level data.

Provide two outputs in the exact format below:

1. Full Detailed Reasons – 7 reasons, each starting with a bold heading (like "Strong Capital Growth"), followed by 2–4 sentences with suburb-specific data or explanation.  
2. Short One-Line Versions Only – list the same 7 headings only, in the same order as above.

Rules:
- No bullet points, asterisks, or extra spacing.
- No intro, explanation, or summary.
- Each reason must be based on real property investment criteria: capital growth, rental yield, vacancy, infrastructure, affordability, transport, and tenant demand.
- Use the suburb and LGA data for accuracy.
- Style must be consistent and clean for direct inclusion in a property investment report.

Suburb: ${suburb}
LGA: ${lga}`;
    
    const response = await fetch(apiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a real estate investment summary tool.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API request failed');
    }
    
    const content = data.choices[0]?.message?.content || '';
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
```

**Test the endpoint:**
- Start dev server
- Use Postman or curl to test: `POST http://localhost:3000/api/ai/generate-content`
- Body: `{ "suburb": "Lewisham", "lga": "Inner West", "type": "why-property" }`

---

### Step 2: Update WhyThisPropertyField Component (1.5-2 hours)

**File:** `form-app/src/components/steps/step5/WhyThisPropertyField.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize'; // Import Phase 4A hook!

interface WhyThisPropertyFieldProps {
  value: string;
  onChange: (value: string) => void;
  suburb?: string;
  lga?: string;
  disabled?: boolean;
}

export function WhyThisPropertyField({ 
  value, 
  onChange, 
  suburb,
  lga,
  disabled 
}: WhyThisPropertyFieldProps) {
  const textareaRef = useAutoResize(value); // Use Phase 4A hook!
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  // Auto-generate on mount
  useEffect(() => {
    if (suburb && lga && !value && !generated) {
      generateContent();
    }
  }, [suburb, lga]);

  const generateContent = async () => {
    if (!suburb || !lga) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb,
          lga,
          type: 'why-property' 
        }),
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      onChange(data.content);
      setGenerated(true);
    } catch (err) {
      setError('The AI service could not be reached. Please generate content manually via Chat GPT and paste the results below.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    generateContent();
  };

  const handleRetry = () => {
    setError(null);
    generateContent();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Why This Property
        </label>
        
        {loading && (
          <div className="flex items-center space-x-2 mb-3 text-blue-600">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating content...</span>
          </div>
        )}
        
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
        {generated && !loading && (
          <div className="mb-3 text-sm text-green-600 flex items-center space-x-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Content generated for {suburb}</span>
          </div>
        )}
        
        <textarea
          ref={textareaRef} // Auto-growing!
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
          style={{ 
            overflow: 'hidden', 
            resize: 'none',
            minHeight: '100px'
          }}
          placeholder="AI will generate content automatically, or paste manually..."
        />
      </div>
      
      {!loading && (
        <button
          onClick={handleRegenerate}
          disabled={disabled || !suburb || !lga}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Regenerate
        </button>
      )}
    </div>
  );
}
```

---

### Step 3: Update Step5Proximity to Pass LGA (30 min)

**File:** `form-app/src/components/steps/Step5Proximity.tsx`

Make sure it passes `lga` prop to WhyThisPropertyField:

```typescript
<WhyThisPropertyField
  value={formData.whyThisProperty || ''}
  onChange={(value) => updateFormData({ whyThisProperty: value })}
  suburb={formData.suburb}
  lga={formData.lga} // Make sure this is passed!
  disabled={isSubmitting}
/>
```

---

## ✅ Success Criteria

**Functional:**
- [ ] Auto-generation runs when Step 5 loads
- [ ] Loading spinner displays
- [ ] Content populates textarea
- [ ] Textarea auto-grows with content
- [ ] Regenerate button works
- [ ] Error handling works
- [ ] Manual paste fallback works

**Content Quality:**
- [ ] Generates 7 reasons
- [ ] Format matches user's prompt requirements
- [ ] Content is suburb-specific

**Code Quality:**
- [ ] Build passes
- [ ] No linter errors
- [ ] API key stays server-side only

---

## 🧪 Testing Checklist

1. **Test auto-generation:**
   - Navigate to Step 5
   - Verify API call in network tab
   - Verify content appears in textarea

2. **Test regenerate:**
   - Click "Regenerate" button
   - Verify new content is generated

3. **Test auto-growing:**
   - Add/remove content manually
   - Verify textarea expands/shrinks

4. **Test error handling:**
   - Temporarily break API key
   - Verify error message appears
   - Verify "Retry" button works

5. **Test manual paste:**
   - Clear content
   - Paste manually
   - Verify it works

---

## 📦 No Dependencies Needed!

✅ Uses native `fetch` API (built into Next.js)  
✅ No OpenAI SDK installation required  
✅ Keeps bundle size small

---

## 🚀 When Complete

1. Test thoroughly
2. Update `IMPLEMENTATION-TRACKER.md`
3. Create `PHASE-4B-IMPLEMENTATION-SUMMARY.md`
4. Return to Coordinator Chat with summary

---

## 📚 Reference Documents

Full details in:
- `PHASE-4B-HANDOFF-AI-GENERATION.md` - Complete implementation guide
- `PHASE-4-STEP5-UI-ENHANCEMENTS.md` - Auto-grow hook documentation

---

**Estimated Time:** 3-4 hours  
**Complexity:** Medium  
**Risk:** Medium (external API)

**Ready to start!** 🎉
