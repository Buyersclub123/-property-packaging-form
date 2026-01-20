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
    const apiBaseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    
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
    return `You are a real estate investment summary tool. Your job is to provide a list of 7 investment-based reasons why a specific property location is a strong investment, using suburb and LGA-level data.

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
  }
  
  return '';
}
