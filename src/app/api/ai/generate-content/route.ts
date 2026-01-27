import { NextRequest, NextResponse } from 'next/server';

/**
 * Strip markdown formatting from text
 * Removes **bold**, *italic*, and other markdown syntax
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')     // Remove *italic*
    .replace(/_([^_]+)_/g, '$1')       // Remove _italic_
    .replace(/~~([^~]+)~~/g, '$1')     // Remove ~~strikethrough~~
    .trim();
}

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
  // Parse JSON with explicit error handling (Next.js can fail silently here)
  // For large bodies (>1MB), use request.text() instead of request.json()
  let body;
  try {
    // Try standard JSON parsing first
    body = await request.json();
  } catch (e: any) {
    console.error('❌ JSON parse error with request.json():', e.message || e);
    
    // Fallback: Try manual parsing with request.text() for large bodies
    try {
      console.log('🔄 Attempting manual JSON parse with request.text()...');
      const text = await request.text();
      body = JSON.parse(text);
      console.log('✅ Manual JSON parse successful');
    } catch (e2: any) {
      console.error('❌ Manual JSON parse also failed:', e2.message || e2);
      return NextResponse.json(
        { error: 'Invalid JSON body or body too large' }, 
        { status: 400 }
      );
    }
  }

  try {
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
    
    // Strip markdown formatting to ensure plain text for emails
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

/**
 * Generate prompt text based on content type
 */
function getPrompt(suburb: string, lga: string, type: string, rawText?: string, context?: any): string {
  if (type === 'investmentHighlights') {
    const suburbName = context?.suburb || suburb;
    const stateName = context?.state || '';
    const lgaName = context?.lga || lga || '';
    
    return `You are an infrastructure summary generator that produces structured, investment-focused overviews of infrastructure projects in Australian LGAs. Your output must strictly follow the layout and formatting rules provided below:

CRITICAL REQUIREMENT: You MUST output each section heading on its own line in your response. Do NOT skip any section headings.

STRUCTURE ENFORCEMENT: You must include all section headings in this exact order. Do not skip any. If a section has no data, still include the heading with no entries under it. Every heading must be present, on its own line.

Output Layout (YOU MUST FOLLOW THIS EXACT STRUCTURE):

[LGA Name]
Population growth context
[introductory paragraph]
Residential
[project entries]
Industrial
[project entries]
Commercial and civic
[project entries]
Health and education
[project entries]
Transport
[project entries]
Job implications (construction + ongoing)
[job summary paragraph]

Formatting Rules:
No bullets or indentation
No blank lines between entries
Each project line starts with bolded dollar figure or status, e.g. $200 million or Cost to be determined
Each line is a single paragraph describing the project and its investment relevance
No empty lines between section headers and content
Text must be Google Docs and Gmail table compatible

Tone & Style:
Concise and factual
Use bolding only for cost/status at the start of each line
Focus on financial scale, capital allocation, and timing relevance

Example Output:

Moreton Bay

Population growth context
Moreton Bay is forecast to grow by 240,000 people by 2041, driven by affordability, new housing supply, and major transport investments.

Residential
$300 million Caboolture West development delivering 3,000 new dwellings over 10 years
Cost to be determined Build-to-rent housing project near Petrie University with 400 units

Industrial
$120 million Food processing plant in Narangba employing 150 people upon completion

Commercial and civic
$90 million Redcliffe Civic Centre with council chambers, library, and event space

Health and education
$450 million expansion of Caboolture Hospital with new emergency and surgical wards
Cost to be determined New TAFE campus at Morayfield supporting 2,000 students annually

Transport
$2.1 billion Bruce Highway upgrades between Caboolture and Pine Rivers
$250 million North Lakes busway extension improving regional connectivity

Job implications (construction + ongoing)
These projects will create over 20,000 construction jobs and sustain thousands of ongoing roles across health, education, manufacturing, and retail.

Now, process the following input and generate the output in this exact format:

${rawText}`;
  }
  
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
- ✅ Each heading should be plain text WITHOUT any markdown formatting (e.g., "Strong Capital Growth" NOT "**Strong Capital Growth**")
- ✅ No bullet points, numbers, asterisks, or extra spacing between entries
- ✅ Use plain text only - no markdown, no HTML, no special formatting`;
  }
  
  return '';
}
