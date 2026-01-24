# ChatGPT Analysis: Investment Highlights Output

**Created:** Jan 23, 2026  
**Purpose:** Analyze Investment Highlights formatting issues  
**Issues:** "Regional" appearing in heading, general formatting review

---

## 📋 INSTRUCTIONS

1. **Scroll down** to the prompt section (marked clearly)
2. **Copy EVERYTHING** between the two lines:
   - Start: "COPY EVERYTHING BELOW THIS LINE"
   - End: "END OF PROMPT - COPY EVERYTHING ABOVE THIS LINE"
3. **Paste** into ChatGPT
4. **Wait** for analysis
5. **Come back here** and paste ChatGPT's response in the "CHATGPT RECOMMENDATIONS" section at the bottom

---

## 🎯 COMPLETE PROMPT FOR CHATGPT

**👇 COPY EVERYTHING BELOW THIS LINE 👇**

---

---

I have a property investment form system that processes Investment Highlights text and formats it for email display. I'm experiencing two issues:

1. **"Regional" appearing in heading**: The heading shows "Fraser Coast Regional" instead of just "Fraser Coast"
2. **General formatting review**: Want to ensure the output looks professional

### CONTEXT:
- Investment Highlights data comes from Hotspotting reports
- Data is stored in Google Sheets with a "Report Name" field (e.g., "Fraser Coast")
- The text is formatted for HTML email display using JavaScript
- The first line of the Investment Highlights text becomes the heading

### CURRENT FORMATTING CODE:

```javascript
// This code runs in Make.com to format Investment Highlights for email display
// Format "Investment Highlights" as HTML
function formatInvestmentHighlightsHtml(rawText) {
  const t = normaliseNewlines(rawText);
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  const knownHeadings = new Set(
    [
      "population growth context",
      "residential",
      "industrial",
      "commercial and civic",
      "commercial and civil",
      "health and education",
      "health and community",
      "transport",
      "infrastructure",
      "education",
      "job implications",
    ].map((s) => s.toLowerCase())
  );

  let html = "";
  let inList = false;
  let lineIndex = 0;
  let lastType = null;
  let lastHeadingType = null;

  function openList() {
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
  }

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine;
    const lower = line.toLowerCase();
    const explicitBullet = /^[-•]/.test(line);
    const bulletText = explicitBullet ? line.replace(/^[-•]\s*/, "").trim() : line;

    // LINE 0: First line becomes the REGION HEADING (THIS IS WHERE "Fraser Coast Regional" APPEARS)
    if (lineIndex === 0) {
      closeList();
      html += `<p class="highlight-region"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "region";
      lineIndex++;
      continue;
    }

    // LINE 1: Second line becomes sub-heading
    if (lineIndex === 1) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "sub";
      lineIndex++;
      continue;
    }

    // Explicit bullet points
    if (explicitBullet) {
      openList();
      html += `<li>${bulletText}</li>`;
      lastType = "bullet";
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    // Check if line starts with a known heading
    const matchesKnownHeading = Array.from(knownHeadings).some(heading => lower.startsWith(heading));
    if (matchesKnownHeading) {
      closeList();
      html += `<p class="highlight-heading"><strong>${bulletText}</strong></p>`;
      lastType = "heading";
      lastHeadingType = "section";
      lineIndex++;
      continue;
    }

    // After a section heading, treat as list item
    if (lastType === "heading") {
      if (lastHeadingType === "section") {
        openList();
        html += `<li>${bulletText}</li>`;
        lastType = "bullet";
      } else {
        closeList();
        html += `<p>${bulletText}</p>`;
        lastType = "body";
      }
      lastHeadingType = null;
      lineIndex++;
      continue;
    }

    // Default: treat as list item
    openList();
    html += `<li>${bulletText}</li>`;
    lastType = "bullet";
    lineIndex++;
  }

  // Close any open list at the end
  closeList();
  return html;
}

function normaliseNewlines(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/&#10;|&#13;/g, "\n");
}
```

### EXAMPLE INPUT DATA:

**From Google Sheet:**
- **Report Name:** "Fraser Coast"
- **State:** "QLD"
- **Main Body (Investment Highlights text):**

```
Fraser Coast Regional

Population Growth Context
Fraser Coast's population is forecast to grow by 15,234 residents between 2021 and 2046, representing a 24.5% increase. The region's appeal is driven by affordability, coastal lifestyle, and rising infrastructure investment.

Residential
$450 million Waterfront Estate in Hervey Bay to deliver 1,500 lots with $35 million in infrastructure
$280 million Marina Development to deliver 800 residential units and commercial space

Industrial
$120 million Industrial Park expansion to support manufacturing and logistics

Commercial and Civic
$85 million Civic Centre upgrade including library and community facilities

Health and Education
$200 million Hospital expansion adding 100 beds and specialist services
$45 million School upgrades across the region

Transport
$1.2 billion Bruce Highway upgrades improving connectivity
$65 million Hervey Bay Airport expansion

Job Implications
3,500 construction jobs and 1,200 ongoing operational jobs
```

### CURRENT OUTPUT (THE PROBLEM):

When the above text is processed, the email displays:

**Heading shows:** "Fraser Coast Regional"

**Problem:** The word "Regional" shouldn't be in the heading. It should just be "Fraser Coast".

**Why it happens:** The first line of the Investment Highlights text is "Fraser Coast Regional", and the code uses line 0 as the region heading.

### MY QUESTIONS:

1. **Where is "Regional" coming from?**
   - Is it in the source data (first line of Main Body)?
   - Should we strip it from the heading?
   - Should we use the "Report Name" field instead of line 0?

2. **How should we fix this?**
   - Option A: Strip "Regional" from line 0 when creating heading?
   - Option B: Use the "Report Name" field from Google Sheet instead of line 0?
   - Option C: Remove line 0 from the Main Body text before processing?
   - Option D: Something else?

3. **Is the current formatting logic good?**
   - Does the structure make sense (region heading → sub-heading → sections → bullets)?
   - Are there any formatting issues?
   - Is the HTML output professional?

4. **Data structure question:**
   - Should the first line of "Main Body" be the region name?
   - Or should "Main Body" start with "Population Growth Context"?
   - Should we rely on the "Report Name" field instead?

5. **Best practice:**
   - What's the cleanest way to ensure the heading is just "Fraser Coast" without "Regional"?
   - Should we validate/clean the data when it's saved to Google Sheet?
   - Or handle it in the formatting function?

### ADDITIONAL CONTEXT - How Investment Highlights are created:
1. User downloads Hotspotting report PDF from membership site
2. User uploads PDF to form OR pastes text manually
3. System extracts "Report Name" (e.g., "Fraser Coast") and saves to Google Sheet
4. User generates or pastes the "Main Body" text
5. Main Body text typically starts with the region name as first line
6. When property is submitted, Make.com formats the text for email using the code above

**Current workflow issue:**
- The "Main Body" text starts with "Fraser Coast Regional" as the first line
- The formatting code uses this first line as the heading
- We want the heading to be just "Fraser Coast" (matching the Report Name field)

### DESIRED OUTPUT:

**Heading should show:** "Fraser Coast" (NOT "Fraser Coast Regional")

**Rest of formatting:** Should remain the same (sections, bullets, etc.)

### PLEASE ANALYZE AND RECOMMEND:

1. Root cause of "Regional" appearing
2. Best solution to remove it
3. Any other formatting improvements
4. Should we change the data structure or just the formatting logic?
5. Code changes needed (be specific)

Thank you!

---

**👆 END OF PROMPT - COPY EVERYTHING ABOVE THIS LINE 👆**

---

## ✅ CHATGPT RECOMMENDATIONS

*(Paste ChatGPT's response here once received)*

---

## 🔧 IMPLEMENTATION PLAN

*(Create implementation tasks based on ChatGPT's recommendations)*
