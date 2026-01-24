import { NextRequest, NextResponse } from 'next/server';

/**
 * Parse Hotspotting report text using ChatGPT API
 * 
 * POST /api/investment-highlights/parse-with-ai
 * Body: { text: string, reportName?: string, validPeriod?: string }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, reportName, validPeriod } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'AI parsing not configured. Please enter information manually.' },
        { status: 500 }
      );
    }

    // Call OpenAI ChatGPT API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: `You are a data extraction assistant. Extract structured information from Hotspotting property reports.
            
Return a JSON object with these fields:
- reportName: The report/region name (e.g., "Fraser Coast", "Sunshine Coast")
- validPeriod: The time period (e.g., "October 2025 - January 2026")
- mainBody: A comprehensive summary combining all sections (Population Growth Context, Residential, Industrial, Commercial, Health & Education, Transport, Job Implications)

Format the mainBody as a flowing narrative, not bullet points. Include specific dollar amounts, project names, and key statistics.`
          },
          {
            role: 'user',
            content: `Extract information from this Hotspotting report:\n\n${text.substring(0, 15000)}` // Limit to ~15k chars
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { success: false, error: 'AI parsing failed. Please enter information manually.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to parse AI response as JSON:', content);
      throw new Error('AI returned invalid format');
    }

    // Merge with any pre-extracted data
    const result = {
      reportName: parsed.reportName || reportName || '',
      validPeriod: parsed.validPeriod || validPeriod || '',
      mainBody: parsed.mainBody || '',
    };

    console.log('✅ AI parsing successful:', result.reportName);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error: any) {
    console.error('❌ AI parsing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to parse report with AI',
      },
      { status: 500 }
    );
  }
}
