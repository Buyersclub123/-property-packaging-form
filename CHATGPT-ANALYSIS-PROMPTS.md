# ChatGPT Analysis Prompts

**Created:** Jan 23, 2026  
**Purpose:** Prompts to analyze output formatting issues on Page 6

---

## 🎯 PROMPT 1: Investment Highlights Output Analysis

### Context for ChatGPT:
```
I have a Next.js form application that generates Investment Highlights text for property investment reports. 
I'm experiencing two issues:
1. The output includes "Regional" in the heading (e.g., "Fraser Coast Regional" instead of "Fraser Coast")
2. The formatting may not be optimal for professional reports

I need you to analyze the code logic and example output to identify what's wrong.
```

### Code to Provide:
**Files to include:**
1. The Investment Highlights generation logic (likely in Step 5 or Step 6 component)
2. Any API route that processes Investment Highlights data
3. The Google Sheets integration code that handles Investment Highlights

**How to find:**
- Search for "Investment Highlights" in the codebase
- Look for LGA name processing/extraction logic
- Find where the heading is constructed

### Example Output to Provide:
```
[Paste actual output from the form showing:]
- The heading with "Regional" issue
- The full Investment Highlights text as it appears
- Any formatting issues visible
```

### Questions to Ask ChatGPT:
```
1. Why is "Regional" being added to the LGA name in the heading?
2. Where in the code is this happening?
3. How can we strip "Regional" from the output?
4. Are there any other formatting issues you notice?
5. What improvements would you suggest for professional appearance?
```

---

## 🎯 PROMPT 2: Why This Property Output Analysis

### Context for ChatGPT:
```
I have a Next.js form application that generates "Why This Property" text for property investment reports.
The output formatting "seems weird" and may not be displaying as intended.

I need you to analyze the code logic and example output to identify formatting issues.
```

### Code to Provide:
**Files to include:**
1. The "Why This Property" generation logic (likely in Step 5 or Step 6 component)
2. Any API route that processes "Why This Property" data
3. The display/rendering logic for this field

**How to find:**
- Search for "Why This Property" in the codebase
- Look for text generation/formatting logic
- Find where this content is displayed

### Example Output to Provide:
```
[Paste actual output from the form showing:]
- The full "Why This Property" text as it appears
- Any weird formatting, spacing, or structure issues
- How it looks in the form vs how it should look
```

### Questions to Ask ChatGPT:
```
1. What formatting issues do you see in the output?
2. Is the text structure logical and professional?
3. Are there issues with line breaks, spacing, or punctuation?
4. How should we restructure the formatting logic?
5. What improvements would make this more professional and readable?
```

---

## 🎯 PROMPT 3: Email Formatting Issue Analysis

### Context for ChatGPT:
```
I have a Next.js form application that sends data to Make.com for email generation.
The data from the form is breaking the email formatting in Make.com.

I need you to analyze:
1. How the form prepares/formats data before sending
2. What might be causing formatting issues (special characters, line breaks, etc.)
3. How to properly sanitize/format the data for email compatibility
```

### Code to Provide:
**Files to include:**
1. The Page 6 (Proximity & Content) component where data is collected
2. The submission logic that sends data to Make.com
3. Any data transformation/sanitization functions
4. The Make.com scenario configuration (if accessible)

**How to find:**
- Search for Make.com webhook/API calls
- Look for form submission logic
- Find data transformation before sending

### Example Data to Provide:
```
[Provide examples of:]
- Raw data from form fields
- Transformed data sent to Make.com
- Expected email format
- Actual broken email format (screenshot or HTML)
```

### Questions to Ask ChatGPT:
```
1. What in the data structure could break email formatting?
2. Are there special characters that need escaping?
3. How should line breaks be handled for email compatibility?
4. What sanitization should we apply before sending to Make.com?
5. What's the best data format to send (JSON structure, encoding, etc.)?
```

---

## 📋 HOW TO USE THESE PROMPTS

### Step 1: Gather the Code
For each prompt, you'll need to:
1. Find the relevant files in the codebase
2. Copy the key functions/components
3. Include imports and context

### Step 2: Gather Example Output
1. Run through the form with test data
2. Capture screenshots or copy text output
3. Note what's wrong vs what's expected

### Step 3: Create ChatGPT Conversation
1. Start with the Context section
2. Paste the code with clear labels
3. Paste the example output
4. Ask the questions listed

### Step 4: Document ChatGPT's Response
1. Save the analysis in a new file: `CHATGPT-ANALYSIS-RESULTS.md`
2. Include recommended fixes
3. Create implementation tasks based on recommendations

---

## 🔍 FILES TO SEARCH FOR

### Investment Highlights:
- `src/components/steps/Step5*.tsx` or `Step6*.tsx`
- `src/app/api/investment-highlights/**`
- Search term: `"Investment Highlights"` or `investmentHighlights`

### Why This Property:
- `src/components/steps/Step5*.tsx` or `Step6*.tsx`
- Search term: `"Why This Property"` or `whyThisProperty`

### Email/Make.com Integration:
- `src/app/api/submit/**` or similar
- `src/components/steps/Step9*.tsx` (Submission page)
- Search term: `"make.com"` or `webhook` or `email`

### Page 6 Data Collection:
- `src/components/steps/Step6*.tsx`
- Search for proximity, content review, Investment Highlights fields

---

## ⚡ QUICK START COMMANDS

```bash
# Find Investment Highlights code
grep -r "Investment Highlights" src/ --include="*.tsx" --include="*.ts"

# Find Why This Property code
grep -r "Why This Property" src/ --include="*.tsx" --include="*.ts"

# Find Make.com integration
grep -r "make.com\|webhook" src/ --include="*.tsx" --include="*.ts"

# Find Page 6 component
ls src/components/steps/Step6*
```

---

**Ready to gather code and create ChatGPT conversations!**
