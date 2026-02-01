# Next Step: Email Format Fix

**Issue:** Investment Highlights formatting breaks in emails when sent from new form

**ChatGPT Analysis:** The form is likely escaping newlines (`\\n`) or converting them to HTML (`<br>`)

---

## 🔍 What We Need to Check:

1. **Look at actual Make.com webhook data**
   - Go to Make.com scenario
   - Check what data is being received
   - Look at the `investment_highlights` field
   - Does it show `\n` or `\\n` or `<br>`?

2. **Compare with manual paste**
   - When you manually pasted, what did Make.com receive?
   - Should be plain text with `\n` newlines

---

## 🔧 Likely Fix:

The form sends data correctly (line 61 in `submit-property/route.ts`):
```javascript
investment_highlights: formData.contentSections?.investmentHighlights || '',
```

But **JSON.stringify** might be escaping the newlines.

### Solution: Ensure newlines are preserved

In the submission code, we may need to explicitly handle newlines before sending to GHL/Make.com.

---

## 📋 ACTION ITEMS:

1. **Check Make.com webhook** - see what it's receiving
2. **If it shows `\\n`** - we need to fix how form sends data
3. **If it shows `<br>`** - we need to strip HTML before sending
4. **If it shows `\n`** - the issue is in Make.com's `normaliseNewlines` function

---

**What does Make.com show when it receives the data?**
