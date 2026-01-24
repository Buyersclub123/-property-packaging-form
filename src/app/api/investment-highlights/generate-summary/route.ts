import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { extractPdfText } from '@/lib/pdfExtractor';

/**
 * Generate AI summary from uploaded PDF
 * Extracts text from PDF and sends to OpenAI to generate 7-section infrastructure summary
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }
    
    // Step 1: Download PDF from Google Drive
    console.log('Downloading PDF from Google Drive, fileId:', fileId);
    
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Failed to parse GOOGLE_SHEETS_CREDENTIALS');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Download PDF file
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'arraybuffer' }
    );
    
    const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
    console.log('PDF downloaded, size:', pdfBuffer.length);
    
    // Step 2: Extract text from PDF
    console.log('Extracting text from PDF...');
    const pdfText = await extractPdfText(pdfBuffer);
    console.log('Text extracted, length:', pdfText.length);
    
    if (!pdfText || pdfText.length < 100) {
      throw new Error('PDF text extraction failed or returned insufficient text');
    }
    
    // Step 3: Send to OpenAI API
    console.log('Sending to OpenAI API...');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';
    const openaiBaseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    const prompt = buildInfrastructurePrompt(pdfText);
    
    const openaiResponse = await fetch(`${openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert real estate analyst specializing in infrastructure analysis and investment research. You extract key infrastructure information from property reports and format it according to specific guidelines.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 4000,
      }),
    });
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI API');
    }
    
    console.log('AI response received, length:', aiResponse.length);
    
    // Step 4: Parse AI response into sections
    const sections = parseAiResponse(aiResponse);
    
    // Step 5: Generate Main Body by combining sections
    const mainBody = generateMainBody(sections);
    
    return NextResponse.json({
      success: true,
      sections,
      mainBody,
    });
  } catch (error: any) {
    console.error('AI summary generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI summary' },
      { status: 500 }
    );
  }
}

/**
 * Build the infrastructure summary prompt
 */
function buildInfrastructurePrompt(pdfText: string): string {
  return `I need you to analyze this Hotspotting property report and extract infrastructure information into 7 specific sections. Please follow the format exactly as described below.

PDF TEXT:
${pdfText}

---

Please extract and format the infrastructure information into the following 7 sections:

**SECTION 1: Population Growth Context**
- Write a plain paragraph (no bullet points) describing population growth trends and context
- Include relevant statistics and timeframes
- Keep it concise (2-4 sentences)

**SECTION 2: Residential**
- List residential infrastructure projects
- Format: **$[cost]** [project description]
- Example: **$500 million** New residential development in [area] with 1,200 dwellings
- Include multiple projects if available

**SECTION 3: Industrial**
- List industrial infrastructure projects
- Format: **$[cost]** [project description]
- Example: **$250 million** Industrial precinct expansion with logistics facilities
- Include multiple projects if available

**SECTION 4: Commercial and Civic**
- List commercial and civic infrastructure projects
- Format: **$[cost]** [project description]
- Example: **$180 million** New civic center and commercial plaza
- Include multiple projects if available

**SECTION 5: Health and Education**
- List health and education infrastructure projects
- Format: **$[cost]** [project description]
- Example: **$120 million** Hospital expansion and new medical facilities
- Include multiple projects if available

**SECTION 6: Transport**
- List transport infrastructure projects
- Format: **$[cost]** [project description]
- Example: **$2.5 billion** Rail line extension and station upgrades
- Include multiple projects if available

**SECTION 7: Job Implications**
- Summarize job creation impacts
- Include both construction jobs and ongoing jobs
- Format: [number] construction jobs, [number] ongoing jobs
- Example: 5,000 construction jobs and 2,000 ongoing jobs from infrastructure projects

---

IMPORTANT FORMATTING RULES:
1. Use **bold** for dollar amounts (e.g., **$500 million**)
2. Section 1 should be a plain paragraph (no bullets)
3. Sections 2-6 should have project entries with costs
4. Section 7 should summarize job numbers
5. If no information is found for a section, write "No specific information available in this report"
6. Use clear section headers: "SECTION 1: Population Growth Context", "SECTION 2: Residential", etc.
7. Be concise but include key details

Please provide the output with clear section headers so I can parse it programmatically.`;
}

/**
 * Parse AI response into individual sections
 */
function parseAiResponse(aiResponse: string): {
  populationGrowthContext: string;
  residential: string;
  industrial: string;
  commercialAndCivic: string;
  healthAndEducation: string;
  transport: string;
  jobImplications: string;
} {
  // Initialize sections with default values
  const sections = {
    populationGrowthContext: '',
    residential: '',
    industrial: '',
    commercialAndCivic: '',
    healthAndEducation: '',
    transport: '',
    jobImplications: '',
  };
  
  try {
    // Split by section headers (case insensitive)
    const sectionRegex = /SECTION\s+(\d+):\s*([^\n]+)\n([\s\S]*?)(?=SECTION\s+\d+:|$)/gi;
    const matches = [...aiResponse.matchAll(sectionRegex)];
    
    matches.forEach((match) => {
      const sectionNumber = match[1];
      const sectionTitle = match[2].trim().toLowerCase();
      const sectionContent = match[3].trim();
      
      // Map section numbers to field names
      if (sectionNumber === '1' || sectionTitle.includes('population')) {
        sections.populationGrowthContext = sectionContent;
      } else if (sectionNumber === '2' || sectionTitle.includes('residential')) {
        sections.residential = sectionContent;
      } else if (sectionNumber === '3' || sectionTitle.includes('industrial')) {
        sections.industrial = sectionContent;
      } else if (sectionNumber === '4' || sectionTitle.includes('commercial')) {
        sections.commercialAndCivic = sectionContent;
      } else if (sectionNumber === '5' || sectionTitle.includes('health') || sectionTitle.includes('education')) {
        sections.healthAndEducation = sectionContent;
      } else if (sectionNumber === '6' || sectionTitle.includes('transport')) {
        sections.transport = sectionContent;
      } else if (sectionNumber === '7' || sectionTitle.includes('job')) {
        sections.jobImplications = sectionContent;
      }
    });
    
    // Fallback: If regex parsing fails, try simple text splitting
    if (!sections.populationGrowthContext && aiResponse.length > 0) {
      console.warn('Regex parsing failed, using fallback parsing');
      
      // Try to find sections by keywords
      const lines = aiResponse.split('\n');
      let currentSection = '';
      let currentContent: string[] = [];
      
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        
        // Check for section headers
        if (trimmedLine.match(/^(SECTION\s+1|Population Growth Context)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'populationGrowthContext';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+2|Residential)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'residential';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+3|Industrial)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'industrial';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+4|Commercial)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'commercialAndCivic';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+5|Health|Education)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'healthAndEducation';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+6|Transport)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'transport';
          currentContent = [];
        } else if (trimmedLine.match(/^(SECTION\s+7|Job)/i)) {
          if (currentSection && currentContent.length > 0) {
            assignSection(sections, currentSection, currentContent.join('\n').trim());
          }
          currentSection = 'jobImplications';
          currentContent = [];
        } else if (trimmedLine && currentSection) {
          currentContent.push(line);
        }
      });
      
      // Assign last section
      if (currentSection && currentContent.length > 0) {
        assignSection(sections, currentSection, currentContent.join('\n').trim());
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
  }
  
  return sections;
}

/**
 * Helper function to assign section content
 */
function assignSection(sections: any, sectionName: string, content: string) {
  if (sections.hasOwnProperty(sectionName)) {
    sections[sectionName] = content;
  }
}

/**
 * Generate Main Body by combining all sections
 */
function generateMainBody(sections: {
  populationGrowthContext: string;
  residential: string;
  industrial: string;
  commercialAndCivic: string;
  healthAndEducation: string;
  transport: string;
  jobImplications: string;
}): string {
  const parts: string[] = [];
  
  // Add each section with a header (except population growth which is standalone)
  if (sections.populationGrowthContext) {
    parts.push(sections.populationGrowthContext);
  }
  
  if (sections.residential) {
    parts.push(`**Residential:**\n${sections.residential}`);
  }
  
  if (sections.industrial) {
    parts.push(`**Industrial:**\n${sections.industrial}`);
  }
  
  if (sections.commercialAndCivic) {
    parts.push(`**Commercial and Civic:**\n${sections.commercialAndCivic}`);
  }
  
  if (sections.healthAndEducation) {
    parts.push(`**Health and Education:**\n${sections.healthAndEducation}`);
  }
  
  if (sections.transport) {
    parts.push(`**Transport:**\n${sections.transport}`);
  }
  
  if (sections.jobImplications) {
    parts.push(`**Job Implications:**\n${sections.jobImplications}`);
  }
  
  return parts.join('\n\n');
}
