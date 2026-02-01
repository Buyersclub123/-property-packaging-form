# Photo Document Generator - Analysis Prompt

**FOR EXTERNAL AI CHAT (Sonnet 4.5 / ChatGPT / Google AI)**  
**TASK: Analyze and recommend best approach for photo document generation**

---

## The Requirement

**Goal:** Generate a professional PDF document with property photos

**User Workflow:**
1. User drags & drops photos from realestate.com.au (or other sources)
2. System collects photos
3. System generates a PDF with:
   - Property address as header
   - All photos laid out professionally
   - Saved to property's Google Drive folder

**Current Manual Process:**
- User downloads photos
- Pastes into Word document
- Adds address header
- Saves as PDF
- Uploads to Google Drive

**We want to automate this!**

---

## Technical Context

**Tech Stack:**
- Next.js 14 (App Router)
- React 18, TypeScript
- Google Drive API (for storage)
- Server-side API routes available

**Constraints:**
- Must run in Next.js environment (Node.js)
- Must generate PDF (not Word doc)
- Must be reliable and fast
- Photos can be various sizes/formats (JPG, PNG, WebP)

---

## Questions to Analyze

### 1. PDF Generation Libraries

**Which library is best for Next.js?**

**Options:**
- **PDFKit** - Low-level, full control
- **jsPDF** - Popular, client or server-side
- **Puppeteer** - Render HTML to PDF
- **pdf-lib** - Modify existing PDFs
- **React-PDF** - React components to PDF
- **Others?**

**Evaluation criteria:**
- Ease of use
- Image handling quality
- Layout flexibility
- Performance
- Bundle size
- Server-side compatibility

### 2. Image Processing

**How to handle various image formats and sizes?**

**Considerations:**
- Images from realestate.com.au may be large (2-5 MB each)
- Need to resize for PDF (optimize file size)
- Maintain aspect ratios
- Support JPG, PNG, WebP, possibly HEIC

**Options:**
- **Sharp** - Fast Node.js image processing
- **Jimp** - Pure JavaScript
- **Canvas API** - Built-in
- Browser-side resizing before upload?

### 3. Layout & Design

**How to layout photos professionally?**

**Options:**
- Grid layout (2x2, 3x3)
- Single photo per page
- Mixed layouts (large + small)
- Captions/labels for each photo?

**Design considerations:**
- Page size (A4, Letter)
- Margins
- Photo spacing
- Header/footer
- Page numbers?

### 4. Drag & Drop Implementation

**How to handle photo upload?**

**User Experience:**
- Drag & drop multiple photos at once
- Show preview thumbnails
- Allow reordering
- Remove unwanted photos
- Add captions (optional)?

**Technical:**
- File size limits
- Validation (image files only)
- Progress indicators
- Error handling

### 5. Document Header

**What should the header include?**

**Minimum:**
- Property address (e.g., "5 Acacia St Point Vernon QLD 4655")

**Optional:**
- Date generated
- Logo?
- Property type?
- Number of photos?

### 6. Performance & Optimization

**How to handle large documents?**

**Scenarios:**
- 5-10 photos (typical)
- 20-30 photos (large property)
- Each photo 2-5 MB

**Optimization strategies:**
- Resize images before PDF generation
- Compress PDF output
- Stream generation (for large docs)
- Background processing?

---

## Your Task

Please analyze and provide:

### 1. Recommended Approach

**Which PDF library?**
- Why this one?
- Pros/cons vs alternatives

**Which image processing library?**
- Why this one?
- How to use it

**Recommended layout?**
- How many photos per page?
- Page size and margins
- Header design

### 2. Implementation Plan

**High-level steps:**
1. User uploads photos (drag & drop)
2. [Your steps here]
3. PDF generated
4. Saved to Google Drive

**Key technical decisions:**
- Client-side or server-side processing?
- Image resizing strategy
- PDF generation approach
- Error handling

### 3. Code Architecture (Conceptual)

**API Endpoints:**
- `/api/photos/upload` - Upload photos
- `/api/photos/generate-pdf` - Generate PDF
- Others?

**Components:**
- Photo upload component
- Preview component
- Others?

**Data flow:**
- How photos move through the system
- Where they're stored temporarily
- How PDF is generated

### 4. Edge Cases & Challenges

**What could go wrong?**
- Very large images
- Unsupported formats
- Too many photos
- PDF generation fails
- Google Drive upload fails

**How to handle:**
- Validation
- Error messages
- Fallbacks
- User feedback

### 5. User Experience Recommendations

**Best UX for:**
- Photo upload (drag & drop)
- Photo preview/reordering
- PDF generation progress
- Success/error states

---

## Example Workflow (Your Recommendation)

Please provide a detailed workflow like:

```
1. User drags 8 photos into upload zone
2. System validates (image files, < 10MB each)
3. Client-side: Resize to max 1920x1080 (maintain aspect ratio)
4. Upload to Next.js API route
5. Server-side: 
   - Receive photos
   - Generate PDF using [Library X]
   - Layout: 2 photos per page, A4 size
   - Header: Property address, centered, 18pt
   - Compress PDF to < 5MB
6. Upload PDF to Google Drive
7. Return success + PDF link to user
```

---

## Deliverables

1. **Library Recommendations**
   - PDF generation library (with reasoning)
   - Image processing library (with reasoning)

2. **Implementation Plan**
   - Step-by-step workflow
   - Technical architecture
   - API endpoints needed

3. **Layout Design**
   - Photos per page
   - Page size and margins
   - Header format

4. **Edge Case Handling**
   - Validation rules
   - Error handling
   - User feedback

5. **Code Examples (Pseudocode)**
   - Photo upload handler
   - PDF generation logic
   - Image resizing

---

## Critical Rules

❌ DO NOT WRITE FULL CODE  
✅ Provide pseudocode and conceptual examples  
✅ Focus on architecture and approach  
✅ Recommend specific libraries with reasons  

---

## Output Format

Save your analysis as a document with clear sections:
- Recommended libraries
- Implementation workflow
- Layout design
- Edge cases
- Pseudocode examples

---

**End of Prompt**
