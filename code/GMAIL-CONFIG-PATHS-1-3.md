# Gmail Module Configuration for Paths 1-3

## Module 3 Output Structure (for normal requests)
Module 3 outputs:
```javascript
{
  subject: "PACKAGER TO CONFIRM – Property Review: [ADDRESS]",
  html_body: "<!DOCTYPE html>...",
  text_body: "...",
  source: ""
}
```

## Module 7 Output Structure
Module 7 outputs:
```javascript
{
  clean_summary_html: "...",  // Extracted <body> content
  subject: "...",
  html_body: "...",
  text_body: "...",
  source: ""
}
```

---

## Path 1: Packager Email (Gmail Module)

**Configuration:**

1. **To** field:
   - **Option 1:** Use GHL data field `packager_email` or `packager` from Module 6
   - **Option 2:** Use static email address if packager email is consistent
   - **Field mapping:** `6.result.packager_email` or `6.packager_email` (check what Module 6 outputs)
   - **Map toggle:** OFF (single recipient)

2. **Subject** field:
   - **Field mapping:** `7.subject` or `3.subject`
   - **Expected value:** "PACKAGER TO CONFIRM – Property Review: [ADDRESS]"

3. **Body type** field:
   - **Value:** "Raw HTML"

4. **Content** field:
   - **Field mapping:** `7.clean_summary_html` or `7.html_body` or `3.html_body`
   - **Note:** `7.clean_summary_html` is preferred as it extracts just the body content

---

## Path 2: BA Email (Gmail Module)

**Configuration:**

1. **To** field:
   - **Option 1:** Use GHL data field `ba_email` or `ba` from Module 6
   - **Option 2:** Use static email address if BA email is consistent
   - **Field mapping:** `6.result.ba_email` or `6.ba_email` (check what Module 6 outputs)
   - **Map toggle:** OFF (single recipient)

2. **Subject** field:
   - **Field mapping:** `7.subject` or `3.subject`
   - **Expected value:** "BA AUTO SEND – Property Review: [ADDRESS]"

3. **Body type** field:
   - **Value:** "Raw HTML"

4. **Content** field:
   - **Field mapping:** `7.clean_summary_html` or `7.html_body` or `3.html_body`
   - **Note:** `7.clean_summary_html` is preferred as it extracts just the body content

---

## Path 3: Manual Testing (Gmail Module)

**Configuration:**

1. **To** field:
   - **Value:** Your test email address (e.g., `john.t@buyersclub.com.au`)
   - **Map toggle:** OFF

2. **Subject** field:
   - **Field mapping:** `7.subject` or `3.subject`

3. **Body type** field:
   - **Value:** "Raw HTML"

4. **Content** field:
   - **Field mapping:** `7.clean_summary_html` or `7.html_body` or `3.html_body`

---

## Important Notes:

1. **Module 7 Processing:** Module 7 extracts the `<body>` content from Module 3's HTML. Use `7.clean_summary_html` for the email body if available, otherwise use `7.html_body` or `3.html_body`.

2. **Email Address Source:** The packager and BA email addresses should come from GHL data. Check Module 6's output to see what field names are available (e.g., `packager_email`, `ba_email`, `packager`, `ba`).

3. **Field Path Format:** In Make.com, use the format `[ModuleNumber].[field]` or `[ModuleNumber].result.[field]` depending on how Make.com structures the output.

4. **Testing:** After configuring, test each path to ensure emails are sent correctly with the right content.

---

## Quick Reference:

| Path | To Field | Subject Field | Body Field |
|------|----------|---------------|------------|
| Path 1 (Packager) | `6.result.packager_email` | `7.subject` | `7.clean_summary_html` |
| Path 2 (BA) | `6.result.ba_email` | `7.subject` | `7.clean_summary_html` |
| Path 3 (Test) | Static email | `7.subject` | `7.clean_summary_html` |

**Note:** Adjust the field paths based on what's actually available in Make.com's module outputs.










