import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Content Generation API Endpoint (Phase 4B)
 * 
 * Purpose: Generate AI-powered content for property investment reports
 * Provider: OpenAI GPT-4
 * 
 * Endpoints:
 * - POST /api/ai/generate-content
 * 
 * Request Body:
 * {
 *   suburb: string,
 *   lga: string,
 *   type: 'why-property'
 * }
 * 
 * Response:
 * {
 *   content: string  // Generated content (7 investment reasons)
 * }
 * 
 * Error Response:
 * {
 *   error: string
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const { suburb, lga, type } = await request.json();
    
    // Validate required parameters
    if (!suburb || !lga) {
      return NextResponse.json(
        { error: 'Suburb and LGA are required' },
        { status: 400 }
      );
    }
    
    // Get API configuration from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    // Support both full URL and base URL formats
    let apiUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    // If it doesn't end with /chat/completions, add it
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
    const prompt = getPrompt(suburb, lga, type);
    
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
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

/**
 * Generate prompt text based on content type
 */
function getPrompt(suburb: string, lga: string, type: string): string {
  if (type === 'why-property') {
    return `Generate 7 detailed investment-based reasons why this property would appeal to investors. Use a professional, confident tone suited for a real estate investment brief. Each reason should start with a bold heading, followed by 2–4 well-written sentences explaining the insight clearly.

Focus on real investor themes like:
- Capital growth trends
- Rental yield strength
- Vacancy rates
- Infrastructure investment
- Affordability advantage
- Transport access
- Tenant demand

Use the specific suburb and LGA context when relevant.

Suburb: ${suburb}
LGA: ${lga}

Important formatting instructions:
- ✅ Include only the full detailed reasons
- ❌ Do not include a short summary list or single-line versions at the end
- ✅ Each heading must be bold (Markdown style, e.g., **Strong Capital Growth**)
- ✅ No bullet points, numbers, or extra spacing between entries`;
  }
  
  return '';
}
