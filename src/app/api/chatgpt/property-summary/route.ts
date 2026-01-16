import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompt based on Property Summary Tool specification
const SYSTEM_PROMPT = `You are a Property Intelligence Engine that emulates the combined behavior of:
- A Property Summary Tool (primary)
- A Proximity Tool (supporting)

You generate structured, conservative, professional summaries of residential properties.

You do not invent data.
You do not expose internal reasoning or formulas.
You clearly label uncertainty and limitations.

When given a property address, you must:
1. Normalize the property and location
2. Assess proximity to key amenities (1x kindergarten, 3x schools, 2x supermarkets, 2x hospitals, 1x train station, 1x bus stop, 1x beach, 1x airport, 1x closest capital city, 3x child day cares)
3. Generate investment reasons (7 detailed reasons with real suburb/LGA-level insights)
4. Provide short one-line versions of the reasons

Output format:
- First line: Property address
- Next lines: List of 13 amenities (names only, no distances)
- Then: Full Detailed Reasons (7 investment-based reasons)
- Then: Short One-Line Versions Only (just headings)

Use professional, neutral, analytical tone. No sales language. No absolutes or guarantees.`;

export async function POST(request: Request) {
  try {
    const { propertyAddress } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    // Use Chat Completions API with system prompt and retry logic for rate limits
    let response;
    let errorText = '';
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: propertyAddress,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(Math.pow(2, retryCount) * 2000, 60000); // Max 60 seconds
        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        } else {
          // Final retry failed
          errorText = await response.text();
          return NextResponse.json(
            { 
              success: false,
              error: 'Rate limit exceeded. Please wait a few minutes before trying again.',
              details: 'OpenAI API rate limit. With your usage (5-20 requests/day), this should not happen in production.'
            },
            { status: 429 }
          );
        }
      }

      if (!response.ok) {
        errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return NextResponse.json(
          { 
            success: false,
            error: `OpenAI API error: ${response.status}`,
            details: errorText
          },
          { status: response.status }
        );
      }

      break; // Success
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded. Please try again in a few minutes.',
        },
        { status: 429 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('No response from ChatGPT');
    }
    
    // Parse the response to extract proximity and "Why this Property"
    const lines = content.split('\n').filter((line: string) => line.trim());
    
    let proximityText = '';
    let whyThisProperty = '';
    
    // First line is the address
    if (lines.length > 0) {
      proximityText = lines[0] + '\n';
    }
    
    // Next lines are amenities (until we hit investment reasons)
    let foundInvestmentReasons = false;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Check if this line starts investment reasons section
      if (line.toLowerCase().includes('investment') || line.toLowerCase().includes('reason') || line.toLowerCase().includes('detailed reasons') || line.startsWith('•')) {
        foundInvestmentReasons = true;
      }
      
      if (!foundInvestmentReasons) {
        proximityText += line + '\n';
      } else {
        whyThisProperty += line + '\n';
      }
    }
    
    return NextResponse.json({
      success: true,
      proximity: proximityText.trim(),
      whyThisProperty: whyThisProperty.trim(),
      fullResponse: content,
    });
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get property summary';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
