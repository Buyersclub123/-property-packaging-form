# PDF Extraction 404 Error - Analysis Request for ChatGPT

## Problem Summary
We have a persistent 404 error for the `/api/investment-highlights/extract-metadata` Next.js API route. The route file exists, compiles successfully, but returns 404 at runtime. We believe Next.js is silently dropping the route from the manifest due to the `pdf-parse` library.

## Technical Context

### Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Runtime:** Node.js
- **Dev Server:** Running on port 3001
- **PDF Library:** `pdf-parse` (causing the issue)

### The Route That's Failing
**File:** `src/app/api/investment-highlights/extract-metadata/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { extractPdfText, extractMetadataFromText } from '@/lib/pdfExtractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    
    // Initialize Google Drive API
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
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Download PDF from Google Drive
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    if (!response.data) {
      throw new Error('Failed to download PDF from Google Drive');
    }
    
    // Extract text from PDF using pdf-parse
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const text = await extractPdfText(buffer);
    
    // Extract metadata
    const metadata = extractMetadataFromText(text);
    
    return NextResponse.json({
      success: true,
      ...metadata,
      extractedText: text.substring(0, 500)
    });
    
  } catch (error: any) {
    console.error('Error extracting PDF metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract PDF metadata' },
      { status: 500 }
    );
  }
}
```

**File:** `src/lib/pdfExtractor.ts` (uses pdf-parse)

```typescript
import pdf from 'pdf-parse';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

export function extractMetadataFromText(text: string) {
  // ... extraction logic ...
}
```

### What We've Tried

1. **Added `export const runtime = 'nodejs'`** - Still 404
2. **Restarted dev server multiple times** - Still 404
3. **Cleared `.next` cache** - Still 404
4. **Tried `--experimental-old-dev` (Webpack)** - Still 404
5. **Created minimal test route** - Works fine (proves Next.js routing is functional)
6. **Incremental testing** - Confirmed `pdf-parse` import is the culprit

### Evidence

**Terminal logs show:**
```
✓ Compiled /api/investment-highlights/extract-metadata in 2.8s (1538 modules)
POST /api/investment-highlights/extract-metadata 404 in 3922ms
POST /api/investment-highlights/extract-metadata 404 in 141ms
POST /api/investment-highlights/extract-metadata 404 in 56ms
```

The route compiles successfully but returns 404 at runtime.

**F12 Console logs show:**
```
Step1AInvestmentHighlightsCheck.tsx:201  POST http://localhost:3001/api/investment-highlights/extract-metadata 404 (Not Found)
Step1AInvestmentHighlightsCheck.tsx:219 Extraction attempt 1 failed: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

The 404 returns an HTML error page, which the frontend tries to parse as JSON, causing the "Unexpected token '<'" error.

### Previous ChatGPT Analysis

You previously diagnosed this as:

> "There is one class of behavior in Next.js that causes silent skipping of a route even when the file exists, the export is correct, runtime = 'nodejs' is present, and the server is restarted: **when Next.js cannot statically analyze the file due to something in the body it can't parse or bundle**, so it drops the route from the manifest entirely."

You identified that `pdf-parse` likely contains:
- Dynamic `require()` statements
- Native addons
- Constructs that can't be statically analyzed by Next.js's bundler

### Current Workaround (Not Working)

We're trying to orchestrate calls to existing API endpoints:
1. `/api/investment-highlights/upload-pdf` (works ✅)
2. `/api/investment-highlights/extract-metadata` (404 ❌)
3. `/api/investment-highlights/save` (works ✅)

But step 2 is failing with 404.

## Questions for ChatGPT

1. **Root Cause Confirmation:** Is our diagnosis correct that `pdf-parse` is causing Next.js to drop the route from the manifest?

2. **Why Does This Happen?** Can you explain the specific mechanism by which Next.js's static analysis fails with `pdf-parse`?

3. **Alternative PDF Libraries:** What PDF extraction libraries are known to work well with Next.js 14 App Router? Consider:
   - `pdfjs-dist` (we tried, got "Object.defineProperty called on non-object" error)
   - `react-pdf` (uses pdfjs-dist internally, same error)
   - `@pdf-lib/pdf-lib`
   - `pdf2json`
   - Others?

4. **Alternative Architectures:** What are our options?
   - **Option A:** Move PDF extraction to a separate serverless function (Vercel Edge Function, AWS Lambda)
   - **Option B:** Use a third-party PDF extraction API
   - **Option C:** Use dynamic imports `await import('pdf-parse')` inside the POST function
   - **Option D:** Create a separate Node.js microservice just for PDF extraction
   - **Option E:** Something else?

5. **Dynamic Import Solution:** Would this work?
   ```typescript
   export async function POST(request: NextRequest) {
     const pdf = (await import('pdf-parse')).default;
     // ... rest of logic
   }
   ```

6. **Webpack Configuration:** Can we configure Next.js's webpack to handle `pdf-parse` properly? If so, how?

7. **Best Practice:** What's the recommended approach for PDF processing in Next.js 14 App Router applications in 2026?

## Constraints

- We need to extract text from PDF files stored in Google Drive
- The PDFs are Hotspotting investment reports (typically 20-50 pages)
- We only need to extract text from the first 2-3 pages
- The solution must work in a Next.js 14 App Router environment
- We prefer server-side processing (not client-side)
- We want to avoid adding too much complexity (e.g., separate microservices) if possible

## Desired Outcome

A clear recommendation on:
1. The best PDF extraction approach for our use case
2. Step-by-step implementation guidance
3. Any gotchas or edge cases to watch out for

## Additional Context

- We previously had a working PDF extraction endpoint at `/api/investment-highlights/organize-pdf` that uses `pdf-parse`, but we're not sure why that one works and this one doesn't
- The application is in active development, not yet in production
- We're willing to change libraries or architecture if needed

---

**Please provide:**
1. Your analysis of the root cause
2. Your recommended solution (with pros/cons of alternatives)
3. Implementation steps for your recommended approach
4. Any code examples that would help
