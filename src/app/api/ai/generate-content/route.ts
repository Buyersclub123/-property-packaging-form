import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// @ts-ignore — pdfjs-dist has no type declarations for this path
declare module 'pdfjs-dist/build/pdf.mjs';

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
    const { suburb, lga, type, rawText, fileId, context } = body;
    
    console.log('🔍 AI generate-content request:', { 
      type, 
      hasRawText: !!rawText, 
      hasFileId: !!fileId,
      rawTextLength: rawText?.length,
      suburb, 
      lga 
    });
    
    // Validate required parameters based on type
    if (type === 'investmentHighlights') {
      if (!rawText && !fileId) {
        console.error('❌ Missing rawText and fileId for investmentHighlights');
        return NextResponse.json(
          { error: 'Either rawText or fileId is required for investmentHighlights type' },
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
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Diagnostic log to file for debugging
    const fs = require('fs');
    const diagLog = `[${new Date().toISOString()}] type=${type} fileId=${fileId || 'NONE'} rawTextLen=${rawText?.length || 0} path=${type === 'investmentHighlights' && fileId ? 'RESPONSES_API' : 'CHAT_COMPLETIONS'}\n`;
    try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', diagLog); } catch(e) {}
    
    // If fileId is provided for investmentHighlights, use Responses API with native PDF reading
    // Two-pass section-split: each pass focuses on fewer sections for thorough extraction
    // Pass 1: LGA heading + Population + Residential + Industrial + Commercial
    // Pass 2: Health & education + Transport + Job implications
    // Then merge both outputs into a single clean document
    if (type === 'investmentHighlights' && fileId) {
      console.log('📄 Using Responses API (2-pass section-split) with native PDF reading for fileId:', fileId);
      
      // Download PDF from Google Drive
      const pdfBuffer = await downloadPdfFromDrive(fileId);
      console.log(`📄 PDF downloaded (${Math.round(pdfBuffer.length / 1024)}KB)`);
      
      // Upload PDF to OpenAI Files API (same as Custom GPTs do internally)
      // This gives better extraction than inline base64
      const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      const uploadFormData = new globalThis.FormData();
      uploadFormData.append('purpose', 'user_data');
      uploadFormData.append('file', pdfBlob, 'hotspotting-report.pdf');
      
      let openaiFileId: string;
      try {
        const uploadRes = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: uploadFormData as any,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          console.error('File upload failed, falling back to base64:', uploadData);
          throw new Error('upload failed');
        }
        openaiFileId = uploadData.id;
        console.log(`📄 PDF uploaded to OpenAI Files API: ${openaiFileId}`);
      } catch (uploadErr) {
        // Fallback: use base64 inline if Files API fails
        console.log('📄 Files API unavailable, using base64 fallback');
        openaiFileId = '';
      }
      
      // Build the file input — prefer file_id (server-side), fallback to base64
      const fileInput = openaiFileId
        ? { type: 'input_file' as const, file_id: openaiFileId }
        : { type: 'input_file' as const, filename: 'hotspotting-report.pdf', file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`, detail: 'high' as const };
      
      // PRE-PASS: Send PDF to gpt-4o-mini to build a project checklist
      // This gives us a cross-reference list for the verification pass
      const responsesApiUrl = 'https://api.openai.com/v1/responses';
      console.log('📋 Launching pre-pass checklist extraction...');
      const chunkIndexPromise = fetch(responsesApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          input: [
            { role: 'developer', content: [{ type: 'input_text', text: 'You extract project data from documents. Be exhaustive — list EVERY project, development, investment, and employment figure. Never skip anything.' }] },
            { role: 'user', content: [
              fileInput,
              { type: 'input_text', text: `Read this PDF thoroughly from start to finish. List EVERY project, development, investment, and employment figure mentioned anywhere in the document. For each, output ONE line with: dollar value (or "no value"), project name, location, and key details (area, dwellings, jobs, etc). Include sub-projects within larger developments (e.g. a business park within a master-planned community is its own entry). Be exhaustive — check every page, every paragraph, every table.` }
            ] }
          ],
          temperature: 0,
          max_output_tokens: 4000,
        })
      }).then(async (r) => {
        const d = await r.json();
        const text = d.output_text || d.output?.find?.((o: any) => o.type === 'message')?.content?.[0]?.text || '';
        if (text) {
          console.log(`📋 Checklist extraction OK: ${text.length} chars`);
          try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] PRE-PASS OK: ${text.length} chars\n`); } catch(e) {}
        } else {
          const debugMsg = `PRE-PASS returned no text. Status: ${r.status}. Keys: ${Object.keys(d).join(',')}. Error: ${JSON.stringify(d.error || 'none').substring(0, 300)}`;
          console.warn(debugMsg);
          try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] ${debugMsg}\n`); } catch(e) {}
        }
        return text;
      }).catch((err) => {
        console.error('📋 Pre-pass failed:', err);
        try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] PRE-PASS FAILED: ${err}\n`); } catch(e) {}
        return '';
      });
      const commonFormatRules = `FORMATTING RULES:
- Use plain text headings only — NO markdown (no #, no **, no *). Plain text throughout. No asterisks anywhere.
- Start each project line with the dollar figure or "Cost to be determined". No bullets, no indentation.
- Each project description should be detailed: include specific area figures (hectares, sq m), number of dwellings/lots/rooms, types of uses, employment numbers, tenant/anchor details, completion dates, and investment relevance.
- No blank lines between project entries. No blank lines between heading and first entry.
- Read EVERY page of the PDF thoroughly — do not skim. Projects are scattered across multiple sections, tables, and paragraphs. Check every page.
- Be extremely comprehensive — extract EVERY project, development, and investment mentioned in the document. Do not skip or consolidate.
- Include projects that are completed/opened — they still matter for investment context.
- After extracting from the PDF, use web search to find additional major projects in this region. Integrate them into the relevant sections — do NOT create a separate section.
- Do NOT add any summary, conclusion, or commentary.
- EVERY project line must start with either a specific dollar figure (e.g. $86 million) or "Cost to be determined". No exceptions.
- Do NOT list the same project in multiple sections. Each project appears ONCE in its most relevant section.
- SECTION RULES: Hospitals, health precincts, and medical facilities belong ONLY in Health and education — never in Residential or Commercial. Transport projects belong ONLY in Transport — never in Commercial. If a large development has both residential dwellings AND a health/transport component, list the dwellings in Residential and the health/transport part in its own section separately.
- Do NOT include council budget totals, gross regional product figures, government funding programs, or stormwater/drainage infrastructure unless they are specific named construction projects with a defined scope.
- Residential should contain housing developments and master-planned communities (dwellings, homes, apartments). Do not list health precincts or hospitals under Residential.
- Within each section, list projects with specific dollar figures FIRST (highest value first), then "Cost to be determined" entries at the bottom.`;

      // Pass 1: Population growth, Residential, Industrial, Commercial and civic
      const pass1UserMsg = `Extract the following sections from this hotspotting report:

1. LGA/REGION NAME — identify the LGA or region name from the report. Output it as a plain text heading on the first line.

2. POPULATION GROWTH CONTEXT — Write a detailed paragraph (3-5 sentences minimum) with specific current and projected population numbers, absolute growth figures, percentage growth, sources (e.g. SEQ Regional Plan), housing demand projections, and key growth drivers.

3. RESIDENTIAL — Extract EVERY residential project, housing development, master-planned community, and dwelling construction mentioned anywhere in the document.

4. INDUSTRIAL — Extract EVERY industrial park, business park, manufacturing facility, warehouse, logistics hub, and industrial development mentioned anywhere in the document.
CRITICAL: Large master-planned communities often contain business parks, industrial precincts, or commercial lots described within their residential or community sections. You MUST extract these as separate Industrial entries with their own dollar figures. Scan every paragraph about master-planned communities for sub-projects that belong under Industrial.

5. COMMERCIAL AND CIVIC — Extract EVERY commercial development, hotel, office tower, retail centre, convention facility, civic project, data centre, and mixed-use development mentioned anywhere in the document. Do NOT include hospitals (they belong under Health) or transport projects (they belong under Transport).

${commonFormatRules}`;

      // Pass 2: Health & education, Transport, Job implications
      const pass2UserMsg = `Extract ONLY the following sections from this hotspotting report. Do NOT output Population growth context, Residential, Industrial, or Commercial and civic sections — those are handled separately.

1. HEALTH AND EDUCATION — Extract EVERY hospital, health precinct, medical facility, university, school, research facility, and education project mentioned anywhere in the document.

2. TRANSPORT — Extract EVERY road upgrade, highway project, rail upgrade, rail extension, interchange, bus/metro project, airport expansion, cycling path, transport corridor, and transport study mentioned anywhere in the document. Include specific route details and dollar values.

3. JOB IMPLICATIONS (construction + ongoing) — Extract EVERY employment figure mentioned anywhere in the document. Check ALL sections — residential, commercial, industrial, health, transport, technology — for job numbers. Each line MUST start with the specific job number (e.g. 5,000 jobs, 422 construction jobs, 250 ongoing jobs), then the project name and context. Do NOT start lines with dollar figures or 'Cost to be determined'. Include both construction jobs and ongoing/permanent employment. Do NOT include vague lines without specific job numbers.

${commonFormatRules}`;

      // Checklist runs in parallel with main passes — no waiting
      // It will be awaited later for the verification pass only
      
      const pass1Promise = fetch(responsesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          input: [
            {
              role: 'developer',
              content: [{ type: 'input_text', text: getStandalonePrompt() }]
            },
            {
              role: 'user',
              content: [
                fileInput,
                { type: 'input_text', text: pass1UserMsg }
              ]
            }
          ],
          temperature: 0,
          max_output_tokens: 12000,
          tools: [{ type: 'web_search_preview' }],
        })
      });
      
      const pass2Promise = fetch(responsesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          input: [
            {
              role: 'developer',
              content: [{ type: 'input_text', text: getStandalonePrompt() }]
            },
            {
              role: 'user',
              content: [
                fileInput,
                { type: 'input_text', text: pass2UserMsg }
              ]
            }
          ],
          temperature: 0,
          max_output_tokens: 12000,
          tools: [{ type: 'web_search_preview' }],
        })
      });
      
      // Run both passes in parallel
      let pass1Response, pass2Response;
      try {
        [pass1Response, pass2Response] = await Promise.all([pass1Promise, pass2Promise]);
      } catch (fetchErr: any) {
        console.error('Pass fetch error:', fetchErr);
        try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] FETCH ERROR: ${fetchErr?.message || fetchErr}\n`); } catch(e) {}
        throw fetchErr;
      }
      const [pass1Data, pass2Data] = await Promise.all([pass1Response.json(), pass2Response.json()]);
      
      try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] pass1 status=${pass1Response.status} pass2 status=${pass2Response.status}\n`); } catch(e) {}
      
      if (!pass1Response.ok) {
        console.error('Pass 1 error:', JSON.stringify(pass1Data));
        try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] ERROR pass1 status=${pass1Response.status} msg=${JSON.stringify(pass1Data?.error || pass1Data).substring(0, 500)}\n`); } catch(e) {}
        throw new Error(pass1Data.error?.message || 'Pass 1 failed');
      }
      if (!pass2Response.ok) {
        console.error('Pass 2 error:', JSON.stringify(pass2Data));
        try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] ERROR pass2 status=${pass2Response.status} msg=${JSON.stringify(pass2Data?.error || pass2Data).substring(0, 500)}\n`); } catch(e) {}
        throw new Error(pass2Data.error?.message || 'Pass 2 failed');
      }
      
      const pass1Text = (pass1Data.output_text || pass1Data.output?.[0]?.content?.[0]?.text || '').trim();
      const pass2Text = (pass2Data.output_text || pass2Data.output?.[0]?.content?.[0]?.text || '').trim();
      
      // Section-aware merge: concatenate then deduplicate sections
      // Split merged text into sections, keep only the first occurrence of each heading
      let mergedOutput = pass1Text + '\n\n' + pass2Text;
      
      // Normalize section headings and deduplicate
      const sectionPattern = /^(Population growth context|Residential|Industrial|Commercial and civic|Health and education|Transport|Job implications)/i;
      const rawSections = mergedOutput.split(/\n{1,3}(?=(?:Population growth context|Residential|Industrial|Commercial and civic|Health and education|Transport|Job implications))/i);
      
      const seenSections = new Set<string>();
      const dedupedSections = rawSections.filter(section => {
        // Find the heading in this section (first non-empty line)
        const heading = section.split('\n').find(l => l.trim().length > 0)?.trim() || '';
        const match = heading.match(sectionPattern);
        if (match) {
          const key = match[1].toLowerCase();
          if (seenSections.has(key)) return false; // duplicate — skip
          seenSections.add(key);
        }
        return true;
      });
      
      mergedOutput = dedupedSections.join('\n\n');
      
      // Await the checklist that was running in parallel with passes 1 & 2
      const projectChecklist = await chunkIndexPromise;
      console.log(`📋 Project checklist ready: ${projectChecklist.length} chars`);
      try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] CHECKLIST CONTENT:\n${projectChecklist}\n---END CHECKLIST---\n`); } catch(e) {}
      
      // Pass 3: Verification — re-output the full corrected document with all missing projects inserted
      if (projectChecklist) {
        console.log('🔍 Running verification pass against project checklist...');
        try {
          const verifyResponse = await fetch(responsesApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              input: [
                {
                  role: 'developer',
                  content: [{ type: 'input_text', text: 'You are a meticulous editor. You merge project data into existing formatted output. No markdown. Plain text only. No asterisks.' }]
                },
                {
                  role: 'user',
                  content: [
                    { type: 'input_text', text: `Below is a formatted extraction and a project checklist from the same document.

Your task: Output the COMPLETE corrected version of the EXTRACTION with these fixes applied:

1. MISSING PROJECTS: If a project from the CHECKLIST is not in the EXTRACTION, add it to the correct section with its dollar figure and details from the checklist.
2. WRONG DOLLAR FIGURES: If a project shows "Cost to be determined" in the EXTRACTION but the CHECKLIST has a specific dollar figure, replace "Cost to be determined" with that dollar figure.
3. SECTION PLACEMENT: Ensure every project is in the correct section (hospitals in Health and education, not Commercial; transport in Transport, not Commercial).
4. SORT ORDER: Within each section, list dollar-value entries from highest to lowest, then "Cost to be determined" entries at the bottom.
5. PRESERVE everything from the original extraction that is correct — do not remove any projects.
6. PRESERVE the exact section headings from the extraction.
7. No markdown, no asterisks, no bullets. Plain text only.
8. Each project line starts with the dollar figure or "Cost to be determined".
9. Do NOT include council budget totals, gross regional product figures, or government funding programs — only specific named construction projects.
10. Do NOT duplicate the same project across sections or within a section. Each project appears exactly ONCE.
11. Hospitals and health precincts belong ONLY in Health and education — never in Residential.

Output ONLY the corrected full document. No commentary.

EXTRACTION:
${mergedOutput}

CHECKLIST:
${projectChecklist}` }
                  ]
                }
              ],
              temperature: 0,
              max_output_tokens: 8000,
            })
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            const verifyText = (verifyData.output_text || verifyData.output?.[0]?.content?.[0]?.text || '').trim();
            
            if (verifyText && verifyText.length > mergedOutput.length * 0.5) {
              // Only use the verification output if it's substantial (at least 50% of original)
              console.log(`🔍 Verification produced corrected output (${verifyText.length} chars vs original ${mergedOutput.length} chars). Using corrected version.`);
              mergedOutput = verifyText;
            } else {
              console.log(`🔍 Verification output too short or empty (${verifyText?.length || 0} chars). Keeping original.`);
            }
          }
        } catch (verifyErr) {
          console.warn('🔍 Verification pass failed (non-critical):', verifyErr);
        }
      }
      
      // Normalize section headings to canonical casing
      const canonicalHeadings: Record<string, string> = {
        'population growth context': 'Population growth context',
        'residential': 'Residential',
        'industrial': 'Industrial',
        'commercial and civic': 'Commercial and civic',
        'health and education': 'Health and education',
        'transport': 'Transport',
        'job implications (construction + ongoing)': 'Job implications (construction + ongoing)',
        'job implications': 'Job implications (construction + ongoing)',
      };
      mergedOutput = mergedOutput.replace(
        /^(Population growth context|Residential|Industrial|Commercial and civic|Health and education|Transport|Job implications(?:\s*\(construction \+ ongoing\))?)$/gim,
        (match) => canonicalHeadings[match.toLowerCase().trim()] || match
      );

      // Post-processing cleanup
      let cleanedOutput = mergedOutput
        .replace(/^#{1,4}\s+/gm, '') // Remove markdown headings
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
        .replace(/\*([^*]+)\*/g, '$1') // Remove *italic*
        .trim();
      
      // Fix: lines starting with "Cost to be determined" that have a $ figure in the description
      // e.g. "Cost to be determined Aura BP with plans for a $150 million park" → "$150 million Aura BP..."
      cleanedOutput = cleanedOutput.replace(
        /^Cost to be determined (.+?) (?:with plans for a |planned with a |proposed with a |featuring a |including a |offering a )?(\$[\d,.]+\s*(?:million|billion))\b(.*)$/gim,
        (match, before, dollarFig, after) => `${dollarFig} ${before}${after}`
      );
      
      // Remove council budget/admin lines that aren't specific projects
      cleanedOutput = cleanedOutput.replace(/^.*(?:council budget|capital works program|gross regional product|funding program).*$/gim, '');
      
      // Remove duplicate lines (exact match after trimming)
      const seenLines = new Set<string>();
      cleanedOutput = cleanedOutput.split('\n').filter((line: string) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return true; // keep blank lines
        if (seenLines.has(trimmed)) return false; // duplicate
        seenLines.add(trimmed);
        return true;
      }).join('\n');
      
      // Remove vague catch-all lines in Job implications (no specific job numbers)
      cleanedOutput = cleanedOutput.replace(/^Cost to be determined .*(?:job|employment|contribut).*$/gim, '');
      cleanedOutput = cleanedOutput.replace(/^(?:Cost to be determined )?Various .*$/gim, '');
      
      // In Job implications section: strip lines that don't contain job/employment/role keywords
      // This catches entries like "1,000 homes fast-tracked..." which aren't job figures
      const jobSectionMatch = cleanedOutput.match(/(JOB IMPLICATIONS[^\n]*\n)((?:.|\n)*?)(?=\n(?:Population|Residential|Industrial|Commercial|Health|Transport)|$)/i);
      if (jobSectionMatch) {
        const jobHeading = jobSectionMatch[1];
        const jobBody = jobSectionMatch[2];
        const filteredJobLines = jobBody.split('\n').filter((l: string) => {
          if (l.trim().length === 0) return true; // keep blank lines
          return /\bjob|\bemploy|\brole|\bposition/i.test(l);
        }).join('\n');
        cleanedOutput = cleanedOutput.replace(jobSectionMatch[0], jobHeading + filteredJobLines);
      }
      
      // Remove duplicate blank lines created by removals
      cleanedOutput = cleanedOutput.replace(/\n{3,}/g, '\n\n').trim();
      
      // Sort entries within each section: dollar values first (descending), then "Cost to be determined"
      console.log('📊 Running sort post-processing...');
      const sectionSplitRegex = /\n{1,3}(?=(?:Population growth context|Residential|Industrial|Commercial and civic|Health and education|Transport|Job implications))/gi;
      const sortSections = cleanedOutput.split(sectionSplitRegex);
      console.log(`📊 Split into ${sortSections.length} sections for sorting`);
      
      const parseDollarValue = (line: string): number => {
        const m = line.match(/^\$([\d,.]+)\s*(billion|million)/i);
        if (!m) return 0;
        const num = parseFloat(m[1].replace(/,/g, ''));
        return m[2].toLowerCase() === 'billion' ? num * 1000 : num;
      };
      
      const sortedSections = sortSections.map((section: string) => {
        const lines = section.split('\n').filter((l: string) => l.trim().length > 0);
        if (lines.length === 0) return section;
        
        const headingLine = lines[0].trim();
        
        // Skip sorting for: LGA name, Population, Job implications
        if (/population|job implications/i.test(headingLine)) return lines.join('\n');
        // Skip if not a known sortable section
        if (!/^(Residential|Industrial|Commercial and civic|Health and education|Transport)/i.test(headingLine)) return lines.join('\n');
        
        const heading = lines[0];
        const contentLines = lines.slice(1);
        
        const dollarLines = contentLines.filter((l: string) => l.trimStart().startsWith('$'));
        const ctbdLines = contentLines.filter((l: string) => l.trimStart().startsWith('Cost to be determined'));
        const otherLines = contentLines.filter((l: string) => !l.trimStart().startsWith('$') && !l.trimStart().startsWith('Cost to be determined'));
        
        // Sort dollar lines by value descending
        dollarLines.sort((a: string, b: string) => parseDollarValue(b.trimStart()) - parseDollarValue(a.trimStart()));
        
        console.log(`📊 Sorted ${headingLine}: ${dollarLines.length} dollar entries, ${ctbdLines.length} CTBDs`);
        return [heading, ...dollarLines, ...ctbdLines, ...otherLines].join('\n');
      });
      
      cleanedOutput = sortedSections.join('\n\n');
      
      // Clean up: delete the uploaded file from OpenAI
      if (openaiFileId) {
        fetch(`https://api.openai.com/v1/files/${openaiFileId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        }).catch(err => console.warn('Failed to delete uploaded file:', err));
      }
      
      console.log(`✅ 2-pass section-split complete. Pass1: ${pass1Text.length} chars, Pass2: ${pass2Text.length} chars, Merged: ${cleanedOutput.length} chars`);
      try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] RESPONSE 2-pass-split pass1_len=${pass1Text.length} pass2_len=${pass2Text.length} merged_len=${cleanedOutput.length}\n`); } catch(e) {}
      
      return NextResponse.json({ content: cleanedOutput });
    }
    
    // Fallback: Chat Completions API (for rawText or why-property)
    let apiUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
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
    
    // Call OpenAI Chat Completions API
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
  } catch (error: any) {
    console.error('AI generation error:', error);
    const fs = require('fs');
    try { fs.appendFileSync('c:\\Users\\User\\property-tool-prod\\logs\\ai-diagnostic.log', `[${new Date().toISOString()}] FATAL: ${error?.message || error}\n`); } catch(e) {}
    return NextResponse.json(
      { error: error?.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}

/**
 * Download PDF from Google Drive by file ID
 */
async function downloadPdfFromDrive(fileId: string): Promise<Buffer> {
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }
  
  credentialsJson = credentialsJson.trim();
  if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    credentials = JSON.parse(cleanedJson);
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  
  if (!response.data) {
    throw new Error('Failed to download PDF from Google Drive');
  }
  
  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Format structured JSON output from both passes into final plain text
 */
function formatStructuredOutput(pass1: any, pass2: any): string {
  const lines: string[] = [];

  // LGA heading
  if (pass1.lga_name) {
    lines.push(pass1.lga_name.toUpperCase());
    lines.push('');
  }

  // Population growth context
  if (pass1.population_growth) {
    lines.push('Population growth context');
    lines.push(pass1.population_growth);
    lines.push('');
  }

  // Residential
  if (pass1.residential?.length) {
    lines.push('Residential');
    for (const item of pass1.residential) {
      lines.push(`${item.cost} ${item.description}`);
    }
    lines.push('');
  }

  // Industrial
  if (pass1.industrial?.length) {
    lines.push('Industrial');
    for (const item of pass1.industrial) {
      lines.push(`${item.cost} ${item.description}`);
    }
    lines.push('');
  }

  // Commercial and civic
  if (pass1.commercial_and_civic?.length) {
    lines.push('Commercial and civic');
    for (const item of pass1.commercial_and_civic) {
      lines.push(`${item.cost} ${item.description}`);
    }
    lines.push('');
  }

  // Health and education
  if (pass1.health_and_education?.length) {
    lines.push('Health and education');
    for (const item of pass1.health_and_education) {
      lines.push(`${item.cost} ${item.description}`);
    }
    lines.push('');
  }

  // Transport
  if (pass2.transport?.length) {
    lines.push('Transport');
    for (const item of pass2.transport) {
      lines.push(`${item.cost} ${item.description}`);
    }
    lines.push('');
  }

  // Job implications
  if (pass2.job_implications?.length) {
    lines.push('Job implications (construction + ongoing)');
    for (const item of pass2.job_implications) {
      lines.push(`${item.figure} ${item.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Pass 1 prompt: Population growth context, Residential, Industrial, Commercial and civic, Health and education
 */
function getPass1Prompt(): string {
  return `You are extracting infrastructure project data from a hotspotting report PDF.

Extract ONLY these sections (in this order):

1. Population growth context
2. Residential
3. Industrial
4. Commercial and civic
5. Health and education

Top heading: LGA name (same size as other section headings)

Formatting Rules:

Population growth context
A plain paragraph (no bullet points). Summarise projected population growth and its drivers (e.g. affordability, job creation, livability improvements).

Residential, Industrial, Commercial and civic, Health and education
Start each line with no indentation or bullets
Begin each line with bolded cost/status (e.g. $300 million or Cost to be determined)
Continue with concise, investment-relevant project description
Each line should be a single paragraph block
No blank lines between project lines
No blank lines between section heading and first line

For Health and education: include ALL hospitals, day hospitals, medical centres, university facilities, health precincts, school builds, aged care, and research facilities. Include projects that have already opened or completed — they still matter for investment context.

Be comprehensive — include every project mentioned in the document for these sections. Do not skip or consolidate.

Style: Concise, pragmatic. Bold dollar figures. No indentation or bullet points. No blank lines between entries.`;
}

/**
 * Pass 2 prompt: Transport, Job implications
 */
function getPass2Prompt(): string {
  return `You are extracting infrastructure project data from a hotspotting report PDF.

Extract ONLY these two sections (in this order):

1. Transport
2. Job implications (construction + ongoing)

Do NOT include a top heading, population context, or any other sections.

Formatting Rules:

Transport
Start each line with no indentation or bullets
Begin each line with bolded cost/status (e.g. $948 million or Cost to be determined)
Follow with the project name and concise description
Each line should be a single paragraph block
No blank lines between project lines
No blank lines between section heading and first line
Include ALL: road upgrades, highway interchanges, rail projects, rail duplication, bus corridors, metro services, active transport paths, airport expansions, terminal upgrades, transport studies, and route strategies.

Job implications (construction + ongoing)
Each line starts with the job number, then the project name and context
Do NOT prefix lines with "Jobs:"
No blank lines between entries
Extract job figures from EVERY project in the entire document that mentions employment numbers — check all sections.

Be comprehensive — include every transport project and every job figure mentioned anywhere in the document.

Style: Concise, pragmatic. Bold dollar figures or job numbers at the start of each line. No indentation or bullet points. No blank lines between entries.`;
}

/**
 * Standalone prompt: matches the ChatGPT standalone tool prompt exactly
 * Used for single-pass PDF processing via Responses API
 */
function getStandalonePrompt(): string {
  return `Purpose
To present key infrastructure projects that impact a suburb or region from an investment perspective, with a focus on capital growth, livability, tenant demand, and job creation.

1. Top-Level Structure
Top heading: LGA name (same size as other section headings)
Intro paragraph: Population growth stats (absolute + %) to establish demand context
Use same heading level/style for the LGA name as the other subheadings (e.g. 'Residential')

2. Category Sections (in fixed order)
Each section has a heading (no emojis) using sentence case:

Population growth context
Residential
Industrial
Commercial and civic
Health and education
Transport
Job implications (construction + ongoing)

3. Formatting Rules

Population growth context
This section uses a plain paragraph (no bullet points)
Summarise projected population growth and its drivers (e.g. affordability, job creation, livability improvements)

All other sections (Residential to Job implications)
Start each line with no indentation or bullets
Begin each line with the cost or status (e.g. $300 million or Cost to be determined)
Continue with concise, investment-relevant project description
Each line should be a single paragraph block
No blank lines between project lines
No blank lines between section heading and first line

Sample Output:
Residential
$400 million River Park Estate to deliver 1,200 homes with integrated open space and retail centre
Cost to be determined New build-to-rent housing precinct proposed near transport corridor

Style & Tone
Concise and pragmatic
Start each project line with the dollar figure or status term
No indentation or bullet points
No blank lines between entries or headings
No markdown formatting — no asterisks, no hashes, no bold markers. Plain text only.
Google Docs and Gmail table compatible
Prioritises financial scale, timing, and capital allocation clarity

Be comprehensive — include every project mentioned in the document. Do not skip or consolidate projects.
Include projects that have already opened or completed — they still matter for investment context.
Read every page of the PDF thoroughly — do not skim. Projects are mentioned across multiple sections and tables.
Each project description should be detailed and investment-relevant: include specific area figures (hectares, square metres), number of dwellings/lots/rooms, types of uses, employment numbers, tenant/anchor details, completion dates, and how the project supports capital growth or tenant demand.`;
}

function getPrompt(suburb: string, lga: string, type: string, rawText?: string, context?: any): string {
  if (type === 'investmentHighlights') {
    const suburbName = context?.suburb || suburb;
    const stateName = context?.state || '';
    const lgaName = context?.lga || lga || '';
    
    return `Purpose
To present key infrastructure projects that impact a suburb or region from an investment perspective, with a focus on capital growth, livability, tenant demand, and job creation.

1. Top-Level Structure
Top heading: LGA name in Google email Large font (same size as other section headings)
Intro paragraph: Population growth stats (absolute + %) to establish demand context
Use same heading level/style for the LGA name as the other subheadings (e.g. 'Residential')

2. Category Sections (in fixed order)
Each section has a bold heading (no emojis) using sentence case:

Population growth context
Residential
Industrial
Commercial and civic
Health and education
Transport
Job implications (construction + ongoing)

3. Formatting Rules

Population growth context
This section uses a plain paragraph (no bullet points)
Summarise projected population growth and its drivers (e.g. affordability, job creation, livability improvements)

All other sections (Residential to Job implications)
Start each line with no indentation or bullets
Begin each line with bolded cost/status (e.g. $300 million or Cost to be determined)
Continue with concise, investment-relevant project description
Each line should be a single paragraph block
No blank lines between project lines
No blank lines between section heading and first line

Sample Output:
Residential
$400 million River Park Estate to deliver 1,200 homes with integrated open space and retail centre
Cost to be determined New build-to-rent housing precinct proposed near transport corridor

Style & Tone
Concise and pragmatic
Bold the dollar figures or status terms at the start of each project line
No indentation or bullet points
No blank lines between entries or headings
Google Docs and Gmail table compatible
Prioritises financial scale, timing, and capital allocation clarity

Now, process the following input:

${rawText}`;
  }
  
  if (type === 'why-property') {
    return `Generate exactly 7 concise investment-based reasons why this property would appeal to investors. Use a professional, confident tone suited for a real estate investment brief.

Format output like this (each reason on ONE line with heading and description separated by a dash):

**Strong Capital Growth** - Parrearra has seen consistent annual capital growth, driven by its proximity to beaches, medical precincts, and infrastructure investment.
**Tight Rental Market** - The Sunshine Coast region, including Parrearra, has rental vacancy rates below 1%, signalling strong tenant demand.
**Infrastructure Investment** - Major transport and medical infrastructure projects are underway, enhancing the area's long-term appeal.
**Affordability Advantage** - Parrearra offers entry-level pricing compared to premium coastal suburbs, providing better capital growth potential.
**Strong Rental Yield** - Current rental yields exceed regional averages, supported by high tenant demand and low vacancy rates.
**Transport Connectivity** - Excellent access to major highways and public transport links improves accessibility and tenant appeal.
**Population Growth** - The region is experiencing above-average population growth, driving demand for rental properties.

Rules:
- Use exactly one sentence for each reason (concise, not detailed paragraphs).
- Each reason must be on a single line: **Heading** - Description.
- Start each reason with a bold-style markdown heading like **Heading** (markdown will be stripped later).
- Do not use numbers, bullet points, asterisks (except for markdown bold **), or extra spacing between entries.
- Do not include any summary list or one-line version at the end.
- Do not use markdown tables or HTML formatting.
- Focus on real investor themes: capital growth, rental yield, vacancy rates, infrastructure, affordability, transport, tenant demand.

Suburb: ${suburb}
LGA: ${lga}`;
  }
  
  return '';
}
