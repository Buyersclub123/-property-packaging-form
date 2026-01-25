# Technical Code Spec: Amenity Integration into Step 5

## Overview

This document provides the exact code changes needed to integrate automated proximity and investment data generation into Step 5 of the property packaging form.

---

## Files to Modify/Create

### 1. New API Route: `/api/generate-proximity/route.ts`
### 2. Update: `Step5Proximity.tsx` (add generate button and logic)
### 3. Environment Variable: `.env.local` (add Make.com webhook URL)

---

## Implementation Details

### File 1: Create API Route

**Path:** `form-app/src/app/api/generate-proximity/route.ts`

**Purpose:** Call Make.com webhook to generate proximity and investment data

```typescript
import { NextResponse } from 'next/server';

/**
 * API route to generate proximity and investment data via Make.com webhook
 * Calls Make.com scenario that uses ChatGPT to generate:
 * - Proximity list (nearby amenities)
 * - Why this Property (7 investment reasons)
 * - Investment Highlights
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      propertyAddress, 
      suburb, 
      state, 
      postcode, 
      lga 
    } = body;
    
    // Validate required fields
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }
    
    // Get Make.com webhook URL from environment
    const makeWebhookUrl = process.env.MAKE_PROXIMITY_WEBHOOK_URL;
    
    if (!makeWebhookUrl) {
      console.error('MAKE_PROXIMITY_WEBHOOK_URL not configured');
      return NextResponse.json(
        { success: false, error: 'Proximity generation service not configured' },
        { status: 500 }
      );
    }
    
    // Call Make.com webhook
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyAddress: propertyAddress || '',
        suburb: suburb || '',
        state: state || '',
        postcode: postcode || '',
        lga: lga || '',
      }),
    });
    
    if (!response.ok) {
      console.error('Make.com webhook error:', response.statusText);
      return NextResponse.json(
        { success: false, error: 'Failed to generate proximity data' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Return structured data
    return NextResponse.json({
      success: true,
      proximity: data.proximity || '',
      whyThisProperty: data.whyThisProperty || '',
      investmentHighlights: data.investmentHighlights || '',
    });
    
  } catch (error) {
    console.error('Error generating proximity data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
```

---

### File 2: Update Step5Proximity Component

**Path:** `form-app/src/components/steps/Step5Proximity.tsx`

**Changes:**
1. Add loading state
2. Add generate function
3. Add "Generate Automatically" button
4. Add error handling

**Complete Updated File:**

```typescript
'use client';

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step5Proximity() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address } = formData;
  
  const [proximity, setProximity] = useState(contentSections?.proximity || '');
  const [whyThisProperty, setWhyThisProperty] = useState(contentSections?.whyThisProperty || '');
  const [investmentHighlights, setInvestmentHighlights] = useState(contentSections?.investmentHighlights || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleProximityChange = (value: string) => {
    setProximity(value);
    setIsGenerated(false); // Reset flag if user edits manually
    updateFormData({
      contentSections: {
        ...contentSections,
        proximity: value,
      },
    });
  };

  const handleWhyThisPropertyChange = (value: string) => {
    setWhyThisProperty(value);
    setIsGenerated(false);
    updateFormData({
      contentSections: {
        ...contentSections,
        whyThisProperty: value,
      },
    });
  };

  const handleInvestmentHighlightsChange = (value: string) => {
    setInvestmentHighlights(value);
    setIsGenerated(false);
    updateFormData({
      contentSections: {
        ...contentSections,
        investmentHighlights: value,
      },
    });
  };

  /**
   * Generate proximity and investment data automatically
   * Calls Make.com webhook via API route
   */
  const handleGenerateProximityData = async () => {
    // Validate address exists
    if (!address?.propertyAddress) {
      setGenerateError('Please enter a property address first (Step 0)');
      return;
    }
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      const response = await fetch('/api/generate-proximity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: address.propertyAddress || '',
          suburb: address.suburbName || '',
          state: address.state || '',
          postcode: address.postCode || '',
          lga: address.lga || '',
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate data');
      }
      
      // Auto-populate fields with generated data
      if (data.proximity) {
        handleProximityChange(data.proximity);
      }
      if (data.whyThisProperty) {
        handleWhyThisPropertyChange(data.whyThisProperty);
      }
      if (data.investmentHighlights) {
        handleInvestmentHighlightsChange(data.investmentHighlights);
      }
      
      setIsGenerated(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => setIsGenerated(false), 5000);
      
    } catch (error) {
      console.error('Error generating proximity data:', error);
      setGenerateError(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate data. Please fill in manually or try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if address exists (for button enable/disable)
  const hasAddress = !!(address?.propertyAddress || address?.suburbName);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Content Sections</h2>
      
      {/* Generate Button Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Auto-Generate Proximity & Investment Data
            </h3>
            <p className="text-sm text-blue-700">
              Automatically generate proximity information, investment reasons, and highlights based on the property address.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateProximityData}
            disabled={isGenerating || !hasAddress}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors
              ${isGenerating || !hasAddress
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Automatically'
            )}
          </button>
        </div>
        
        {/* Error Message */}
        {generateError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {generateError}
          </div>
        )}
        
        {/* Success Message */}
        {isGenerated && !generateError && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            ✅ Data generated successfully! You can edit the fields below if needed.
          </div>
        )}
        
        {/* Warning if no address */}
        {!hasAddress && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
            ⚠️ Please enter a property address in Step 0 before generating data.
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Why This Property Section */}
        <div>
          <label className="label-field mb-2">
            Why this Property? *
            <span className="text-xs text-gray-500 ml-2">
              (Text will appear exactly as typed in email template)
            </span>
          </label>
          <p className="text-sm text-gray-600 mb-2">
            Provide detailed reasons why this property is a good investment opportunity.
            <br />
            <span className="italic">Format: Each bullet point as "• **Heading** - Description" (all on one line)</span>
          </p>
          <textarea
            value={whyThisProperty}
            onChange={(e) => handleWhyThisPropertyChange(e.target.value)}
            className="input-field min-h-[150px]"
            placeholder="• **Location** - Prime location in growing suburb&#10;• **Growth Potential** - Strong capital growth expected&#10;• **Rental Yield** - Excellent rental yield of X%"
            spellCheck={true}
            required
          />
        </div>

        {/* Proximity Section */}
        <div>
          <label className="label-field mb-2">
            Proximity *
            <span className="text-xs text-gray-500 ml-2">
              (Text will appear exactly as typed in email template)
            </span>
          </label>
          <p className="text-sm text-gray-600 mb-2">
            List nearby amenities with distance and travel time.
            <br />
            <span className="italic">Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]"</span>
            <br />
            <span className="text-xs text-gray-500">
              Include: 1x kindergarten, 3x schools, 2x supermarket, 2x hospitals, 1x train station, 1x bus stop, 1x beach, 1x airport, 1x closest capital city, 3x child day cares
            </span>
          </p>
          <textarea
            value={proximity}
            onChange={(e) => handleProximityChange(e.target.value)}
            className="input-field min-h-[200px]"
            placeholder={`${address?.propertyAddress || 'Property Address'}&#10;• 0.5 km (5 mins), Local Kindergarten&#10;• 1.2 km (10 mins), Primary School&#10;• 2.5 km (15 mins), Supermarket&#10;• 5.0 km (20 mins), Hospital`}
            spellCheck={true}
            required
          />
        </div>

        {/* Investment Highlights Section */}
        <div>
          <label className="label-field mb-2">
            Investment Highlights *
            <span className="text-xs text-gray-500 ml-2">
              (Text will appear exactly as typed in email template)
            </span>
          </label>
          <p className="text-sm text-gray-600 mb-2">
            Key investment highlights and infrastructure developments in the area.
            <br />
            <span className="italic">This data is typically sourced from Hotspotting Reports (updated quarterly)</span>
          </p>
          <textarea
            value={investmentHighlights}
            onChange={(e) => handleInvestmentHighlightsChange(e.target.value)}
            className="input-field min-h-[150px]"
            placeholder="• Major infrastructure projects&#10;• Population growth trends&#10;• Economic development initiatives&#10;• Transport improvements"
            spellCheck={true}
            required
          />
        </div>
      </div>
    </div>
  );
}
```

---

### File 3: Environment Variable

**Path:** `form-app/.env.local` (or `.env` for production)

**Add:**
```env
# Make.com Webhook URL for Proximity & Investment Data Generation
MAKE_PROXIMITY_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-id-here
```

**Note:** Replace `your-webhook-id-here` with the actual Make.com webhook URL from your scenario.

---

## Make.com Scenario Setup

### Scenario Structure:

```
1. Webhook (Custom)
   - Method: POST
   - Response: JSON
   - Copy webhook URL for environment variable

2. Tools > Set Multiple Variables
   - Extract from webhook payload:
     * propertyAddress: {{1.propertyAddress}}
     * suburb: {{1.suburb}}
     * state: {{1.state}}
     * postcode: {{1.postcode}}
     * lga: {{1.lga}}

3. OpenAI (Create a Chat Completion)
   - Model: gpt-4 (or gpt-3.5-turbo for cost savings)
   - Messages:
     * System: [Use prompt template below]
     * User: 
       Property Address: {{2.propertyAddress}}
       Suburb: {{2.suburb}}
       State: {{2.state}}
       Postcode: {{2.postcode}}
       LGA: {{2.lga}}

4. Tools > Set Multiple Variables (Parse Response)
   - Parse ChatGPT JSON response:
     * proximity: {{3.choices[0].message.content.proximity}}
     * whyThisProperty: {{3.choices[0].message.content.whyThisProperty}}
     * investmentHighlights: {{3.choices[0].message.content.investmentHighlights}}

5. Webhook Response
   - Status: 200
   - Response body:
     {
       "proximity": "{{4.proximity}}",
       "whyThisProperty": "{{4.whyThisProperty}}",
       "investmentHighlights": "{{4.investmentHighlights}}"
     }
```

### ChatGPT System Prompt Template:

```
You are a property investment analysis tool. Given a property address, generate structured output in JSON format.

Generate three sections:

1. PROXIMITY DATA (car travel mode, sorted by distance within each category):
   - Start with the full property address on the first line
   - Then list in this exact order and format:
     * 1x kindergarten (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 3x schools (nearest, any level): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 2x supermarkets (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 2x hospitals (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 1x train station (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 1x bus stop (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 1x beach (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 1x airport (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 1x closest capital city CBD: "• [DISTANCE] km ([TIME] mins), [NAME]"
     * 3x child day cares (nearest): "• [DISTANCE] km ([TIME] mins), [NAME]"
   - Use realistic distances and travel times based on the location

2. WHY THIS PROPERTY (7 detailed investment reasons):
   Generate 7 tailored property investment insights for the suburb/LGA, each formatted as:
   "• **Heading** - Description"
   
   Each should cover:
   - Capital growth trends
   - Rental yield performance
   - Vacancy rates
   - Infrastructure upgrades
   - Affordability levels
   - Public transport availability
   - Tenant or buyer demand
   
   Example format:
   • **Strong Capital Growth** - [suburb] has consistently outperformed the [state] average with strong growth trends
   • **Attractive Rental Yields** - Inner [suburb] delivers competitive gross rental yields above X%
   [etc. for 7 total]

3. INVESTMENT HIGHLIGHTS:
   Key infrastructure developments, population growth trends, economic development initiatives, and transport improvements for the area.
   Format as bullet points:
   • [Highlight 1]
   • [Highlight 2]
   [etc.]

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "proximity": "Address\n• Distance km (time mins), Name\n...",
  "whyThisProperty": "• **Heading** - Description\n• **Heading** - Description\n...",
  "investmentHighlights": "• Highlight 1\n• Highlight 2\n..."
}

Do not include any explanation or text outside the JSON object.
```

---

## Testing Checklist

### Manual Testing:
- [ ] Enter address in Step 0
- [ ] Navigate to Step 5
- [ ] Click "Generate Automatically" button
- [ ] Verify all 3 fields populate automatically
- [ ] Verify data format matches expected format
- [ ] Test error handling (no address, API failure)
- [ ] Test editing fields after generation
- [ ] Test with different addresses (various states/suburbs)
- [ ] Verify data persists when navigating between steps

### Edge Cases:
- [ ] Missing address → Shows warning message
- [ ] API failure → Shows error message
- [ ] Partial data → Handles gracefully
- [ ] Empty response → Handles gracefully
- [ ] Network timeout → Shows error

---

## Deployment Notes

1. **Environment Variable:**
   - Add `MAKE_PROXIMITY_WEBHOOK_URL` to Vercel environment variables
   - Keep webhook URL secret (don't commit to repo)

2. **Make.com Scenario:**
   - Test scenario thoroughly before going live
   - Monitor API usage/costs
   - Set up error notifications

3. **Rate Limiting:**
   - Consider adding rate limiting to prevent abuse
   - Cache results for same address (optional enhancement)

---

## Future Enhancements (Optional)

1. **Cache Generated Data:**
   - Store results in session storage
   - Same address = use cached data
   - Add "Regenerate" button to force refresh

2. **Progressive Enhancement:**
   - Auto-fetch in background when address is entered
   - Show in Step 5 when user arrives

3. **Data Validation:**
   - Validate generated data format
   - Auto-fix common formatting issues
   - Warn if data looks incorrect

4. **Multiple Sources:**
   - Allow user to choose: ChatGPT vs Direct APIs
   - Compare results from different sources

---

**Ready for implementation when you return!** 🚀
