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
    
    return `You are a professional real estate content formatter. Extract and organize the following Hotspotting report content into a structured investment brief.

RAW TEXT FROM PDF:
${rawText}

REQUIRED OUTPUT FORMAT:

FIRST LINE: LGA NAME AS HEADING
Start with the LGA name (e.g., "Fraser Coast Regional" or "${lgaName}") as the very first line.
Do NOT add any prefix like "SECTION" or numbering.

---

SECTION 1: POPULATION GROWTH CONTEXT
Write a single paragraph summarizing:
- Absolute population growth (e.g., "+45,000 people")
- Percentage growth (e.g., "+34% by 2041")
- Key drivers (e.g., affordability, job growth, infrastructure)
Focus on ${lgaName || suburbName}${stateName ? ', ' + stateName : ''}.

---

SECTION 2: RESIDENTIAL
Extract residential projects and format each as ONE LINE:
**$[amount]** [project description]
OR
**Cost to be determined** [project description]
Examples:
**$400 million** River Park Estate to deliver 1,200 homes with integrated open space and retail centre
**Cost to be determined** New build-to-rent housing precinct proposed near transport corridor

---

SECTION 3: INDUSTRIAL
Extract industrial projects and format each as ONE LINE:
**$[amount]** [project description]
OR
**Status: [status]** [project description]
Example:
**$70 million** Battery manufacturing plant in Maryborough creating 500 jobs

---

SECTION 4: COMMERCIAL AND CIVIC
Extract commercial and civic projects and format each as ONE LINE:
**$[amount]** [project description]
Example:
**$108.7 million** Hervey Bay Community Hub with sports facilities and community spaces

---

SECTION 5: HEALTH AND EDUCATION
Extract health and education projects and format each as ONE LINE:
**$[amount]** [project description]
Example:
**$100 million** Hervey Bay Hospital expansion including new emergency department

---

SECTION 6: TRANSPORT
Extract transport projects and format each as ONE LINE:
**$[amount]** [project description]
Example:
**$260 million** Bruce Highway upgrades improving regional connectivity

---

SECTION 7: JOB IMPLICATIONS
Summarize employment impact in 2-3 sentences covering:
- Construction jobs during project delivery
- Ongoing operational jobs after completion
- Key employment sectors

CRITICAL FORMATTING RULES:
1. Use plain text only - NO markdown except for bold dollar amounts/status
2. Each project is ONE PARAGRAPH (no line breaks within a project)
3. Start each project line with bold cost: **$[amount]** or **Cost to be determined** or **Status: [status]**
4. NO bullet points, NO indentation, NO blank lines between projects
5. Remove all page numbers, headers, footers (e.g., "1 / 251 / 25")
6. Remove location identifiers like "Butchulla Country1 / 251 / 25"
7. Gmail and Google Docs compatible formatting only
8. If a section has no projects, write: "No specific projects identified in this report."

EXAMPLE OUTPUT STRUCTURE:
Fraser Coast Regional

---

[Population growth context paragraph]

---

**$400 million** Project description here
**Cost to be determined** Another project description

---

[Continue with remaining sections...]

OUTPUT FORMAT: Start with LGA name, then "---", then the 7 sections with "---" separators. NO section headings like "SECTION 1:", NO preamble.`;
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
