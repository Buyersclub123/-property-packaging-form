# ChatGPT Analysis Prompt: AI API 400 Error in Investment Highlights

## Problem Summary

When uploading a Hotspotting PDF in Step 2 (Investment Highlights Check), the workflow successfully:
1. ✅ Uploads PDF to Google Drive
2. ✅ Extracts text from PDF (25 pages, 51,353 chars)
3. ❌ **FAILS** at AI formatting step with 400 error
4. ✅ Falls back to raw text and saves to Google Sheet

**Error:** `POST http://localhost:3001/api/ai/generate-content 400 (Bad Request)`

## Server Logs

```
✅ PDF uploaded to Hotspotting folder: Point Vernon-QLD-Fraser Coast (5)-2026-01-22.pdf (1uhibODJjid9DRwgJ-mJ4wO_AVfNc9GbQ)
POST /api/investment-highlights/upload-pdf 200 in 4173ms

✅ Extracted text from PDF (25 pages, 51353 chars)
POST /api/investment-highlights/extract-metadata 200 in 6077ms

POST /api/ai/generate-content 400 in 930ms

POST /api/investment-highlights/save 200 in 4363ms
```

**Note:** No error message is logged on the server for the 400 error.

## Browser Console Logs

```javascript
Step1AInvestmentHighlightsCheck.tsx:189 ✅ PDF uploaded: 1uhibODJjid9DRwgJ-mJ4wO_AVfNc9GbQ
Step1AInvestmentHighlightsCheck.tsx:210 ✅ Metadata extracted successfully
Step1AInvestmentHighlightsCheck.tsx:232  POST http://localhost:3001/api/ai/generate-content 400 (Bad Request)
Step1AInvestmentHighlightsCheck.tsx:250 AI formatting failed, using raw text
Step1AInvestmentHighlightsCheck.tsx:302 ✅ Investment Highlights processed and ready for Step 6
```

## Relevant Code

### API Endpoint: `/api/ai/generate-content/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburb, lga, type, rawText, context } = body;
    
    console.log('🔍 AI generate-content request:', { 
      type, 
      hasRawText: !!rawText, 
      rawTextLength: rawText?.length,
      suburb, 
      lga 
    });
    
    // Validate required parameters based on type
    if (type === 'investmentHighlights') {
      if (!rawText) {
        console.error('❌ Missing rawText for investmentHighlights');
        return NextResponse.json(
          { error: 'rawText is required for investmentHighlights type' },
          { status: 400 }
        );
      }
    } else {
      if (!suburb || !lga) {
        console.error('❌ Missing suburb or lga');
        return NextResponse.json(
          { error: 'Suburb and LGA are required' },
          { status: 400 }
        );
      }
    }
    
    // Get API configuration from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    let apiUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
    }
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Generate prompt based on content type
    const prompt = type === 'investmentHighlights' 
      ? getPrompt(suburb, lga, type, rawText, context)
      : getPrompt(suburb, lga, type);
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }
    
    // Call OpenAI API using native fetch
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a real estate investment summary tool.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'OpenAI API request failed');
    }
    
    const content = data.choices[0]?.message?.content || '';
    const plainTextContent = stripMarkdown(content);
    
    return NextResponse.json({ content: plainTextContent });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

function getPrompt(suburb: string, lga: string, type: string, rawText?: string, context?: any): string {
  if (type === 'investmentHighlights') {
    const suburbName = context?.suburb || suburb;
    const stateName = context?.state || '';
    
    return `You are a professional real estate content formatter. Format the following raw text extracted from a Hotspotting investment report into clean, readable paragraphs for a property investment brief.

RAW TEXT FROM PDF:
${rawText}

FORMATTING INSTRUCTIONS:
- Remove all page numbers, headers, footers, and metadata (e.g., "1 / 251 / 25")
- Remove dollar amounts that appear at the start (e.g., "$5 billion Penrith Health")
- Remove location identifiers like "Butchulla Country1 / 251 / 25"
- Organize the content into clear, flowing paragraphs
- Keep all important investment information, statistics, and infrastructure details
- Use plain text only - no markdown, no HTML, no special formatting
- Focus on content relevant to ${suburbName}${stateName ? ', ' + stateName : ''}
- Keep the professional, informative tone
- Aim for 3-5 well-structured paragraphs
- Remove any incomplete sentences at the end

OUTPUT ONLY THE FORMATTED TEXT - NO HEADINGS, NO PREAMBLE, JUST THE CLEAN PARAGRAPHS.`;
  }
  
  if (type === 'why-property') {
    // ... other type
  }
  
  return '';
}
```

### Client Code: `Step1AInvestmentHighlightsCheck.tsx`

```typescript
// Step 3: Parse with ChatGPT for better formatting
setUploadProgress('Formatting with AI...');

let formattedMainBody = extractResult?.mainBody || '';

console.log('📝 Preparing AI request:', {
  hasMainBody: !!extractResult?.mainBody,
  mainBodyLength: extractResult?.mainBody?.length,
  suburb: address?.suburbName,
  state: address?.state
});

try {
  const aiRequestBody = {
    type: 'investmentHighlights',
    rawText: extractResult?.mainBody || '',
    context: {
      suburb: address?.suburbName || '',
      state: address?.state || '',
    },
  };
  
  console.log('📤 Sending to AI:', {
    type: aiRequestBody.type,
    rawTextLength: aiRequestBody.rawText.length,
    hasRawText: !!aiRequestBody.rawText
  });
  
  const parseResponse = await fetch('/api/ai/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiRequestBody),
  });
  
  if (parseResponse.ok) {
    const parseResult = await parseResponse.json();
    formattedMainBody = parseResult.content || formattedMainBody;
    console.log('✅ Text formatted by AI');
  } else {
    const errorText = await parseResponse.text();
    console.warn('AI formatting failed, using raw text. Error:', errorText);
  }
} catch (err) {
  console.warn('AI formatting error, using raw text:', err);
}
```

## Environment Variables

- `OPENAI_API_KEY`: Set (confirmed working for other endpoints)
- `OPENAI_API_BASE_URL`: May or may not be set (defaults to OpenAI)
- `OPENAI_MODEL`: May or may not be set (defaults to 'gpt-4')

## Questions for Analysis

1. **Why is the 400 error not logging any message on the server?**
   - The console.log at the start should show request details
   - The validation errors should log if triggered
   - But we see NOTHING in the logs

2. **Is the request even reaching the endpoint?**
   - Could Next.js be rejecting it before it hits our code?
   - Could there be a middleware issue?

3. **Could the 51,353 character rawText be too large?**
   - Is there a Next.js body size limit?
   - Is there an OpenAI token limit being hit?

4. **Why does the endpoint work for 'why-property' type but not 'investmentHighlights'?**
   - Both use the same endpoint
   - Different validation paths

5. **Is there a JSON parsing issue?**
   - Could the rawText contain characters that break JSON.stringify?
   - Should we escape or truncate the text?

## What We Need

1. **Root cause** of the 400 error
2. **Why no server logs** are appearing
3. **Quick fix** to get AI formatting working
4. **Fallback strategy** if the text is too large

## Additional Context

- Next.js 14.2.35 (App Router)
- OpenAI GPT-4
- PDF extraction works perfectly (unpdf library)
- Raw text is being saved successfully to Google Sheets
- This is blocking the "early processing" workflow where Investment Highlights should be ready by Step 6

## Success Criteria

- AI formatting endpoint returns 200
- Formatted text is clean, readable paragraphs
- No more 400 errors
- Server logs show what's happening

---

**Please analyze this and provide:**
1. Most likely root cause
2. Diagnostic steps to confirm
3. Code fix to implement
4. Any edge cases to handle
