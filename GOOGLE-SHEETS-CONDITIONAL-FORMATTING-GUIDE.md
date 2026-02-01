# Google Sheets Conditional Formatting Guide
## Date Tracking with Color-Coded Cells

**Document Version:** 2.0  
**Last Updated:** January 24, 2026  
**Purpose:** Set up automatic color-coding for date tracking in Column F

---

# PART 1: QUICK SETUP GUIDE

Follow these steps exactly. No explanations - just do it!

---

## Step 1: Add Date Picker to Column F

1. Click on the **Column F header** (the letter "F")
2. Menu: **Data → Data validation**
3. Click **"+ Add rule"**
4. **Criteria:** Select **"Date is valid"**
5. **On invalid data:** Select **"Show warning"**
6. Click **"Done"**

✅ **Result:** Double-clicking cells now shows a calendar picker

---

## Step 2: Add Conditional Formatting Rules

### Access Conditional Formatting
1. Click on the **Column F header**
2. Menu: **Format → Conditional formatting**

---

### Rule 1: Blank Cells → White

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F` for unlimited)
3. **Format cells if:** Custom formula is
4. **Formula:** `=ISBLANK(F3)`
5. **Formatting style:** White background
6. Click **"Done"**

---

### Rule 2: "Nil Finance" → Brown (Any Capitalization)

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F`)
3. **Format cells if:** Custom formula is
4. **Formula:** 
```
=OR(F3="NIL FINANCE", F3="Nil Finance", F3="nil finance", UPPER(TRIM(F3))="NIL FINANCE")
```
5. **Formatting style:** Brown background (#A0522D or #8B4513)
6. Click **"Done"**

---

### Rule 3: Other Text → Light Blue

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F`)
3. **Format cells if:** Custom formula is
4. **Formula:** 
```
=AND(NOT(ISBLANK(F3)), NOT(ISNUMBER(F3)), UPPER(TRIM(F3))<>"NIL FINANCE")
```
5. **Formatting style:** Light Blue background (#CFE2F3 or #D0E0E3)
6. Click **"Done"**

---

### Rule 4: Past Dates → Red

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F`)
3. **Format cells if:** Custom formula is
4. **Formula:** `=AND(ISNUMBER(F3), F3<TODAY())`
5. **Formatting style:** Red background (#FF0000 or #EA4335)
6. Click **"Done"**

---

### Rule 5: Dates Within 5 Days → Amber

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F`)
3. **Format cells if:** Custom formula is
4. **Formula:** `=AND(ISNUMBER(F3), F3>=TODAY(), F3<=TODAY()+5)`
5. **Formatting style:** Amber/Orange background (#FFA500 or #FBBC04)
6. Click **"Done"**

---

### Rule 6: Dates 6+ Days Away → Green

1. Click **"+ Add another rule"**
2. **Apply to range:** `F3:F991` (or `F3:F`)
3. **Format cells if:** Custom formula is
4. **Formula:** `=AND(ISNUMBER(F3), F3>TODAY()+5)`
5. **Formatting style:** Green background (#00FF00 or #34A853)
6. Click **"Done"**

---

## Step 3: Verify Rule Order

**CRITICAL:** Rules must be in this exact order!

1. Open **Format → Conditional formatting**
2. **Drag rules** to match this order:
   1. ⬜ Blank → White
   2. 🟫 "Nil Finance" → Brown
   3. 🔵 Other Text → Light Blue
   4. 🔴 Past Date → Red
   5. 🟠 Within 5 Days → Amber
   6. 🟢 6+ Days → Green
3. Click **"Done"**

---

## Step 4: Add Apps Script (Optional but Recommended)

This auto-converts typed dates like "26/11/2025" to proper dates.

1. Menu: **Extensions → Apps Script**
2. Delete any existing code
3. Paste this code:

```javascript
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    const sheetName = "YOUR_SHEET_NAME_HERE"; // CHANGE THIS
    
    if (sh.getName() !== sheetName) return;
    
    const range = e.range;
    const col = range.getColumn();
    const row = range.getRow();
    
    if (col !== 6 || row < 3) return;
    
    const value = range.getValue();
    
    if (!value || value instanceof Date) return;
    
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (datePattern.test(value)) {
      const parts = value.split('/');
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!isNaN(date)) {
        range.setValue(date);
        range.setNumberFormat('dd/mm/yyyy');
      }
    }
    
  } catch (err) {
    // Fail silently
  }
}
```

4. **Change line 4:** Replace `YOUR_SHEET_NAME_HERE` with your actual sheet tab name (case-sensitive!)
5. Press **Ctrl+S** to save
6. Close Apps Script tab
7. Refresh your Google Sheet (F5)

---

## Step 5: Fix Existing Text Dates

If you have dates that were entered before adding the script:

1. Select all cells in Column F with white dates
2. Menu: **Format → Number → Date**
3. Done!

---

## Step 6: Test Everything

| Type This | Expected Color |
|-----------|---------------|
| (Leave blank) | ⬜ White |
| `NIL FINANCE` | 🟫 Brown |
| `Nil Finance` | 🟫 Brown |
| `nil finance` | 🟫 Brown |
| `REQUESTED BROKERS DETAILS` | 🔵 Light Blue |
| `01/01/2025` (past date) | 🔴 Red |
| Date 3 days from today | 🟠 Amber |
| Date 10 days from today | 🟢 Green |

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Nil Finance" is white, not brown | Check Rule 2 range includes all rows (`F3:F991` or `F3:F`) |
| Dates are white | Select cells → Format → Number → Date |
| Script not working | Check sheet name matches exactly (case-sensitive) |
| Wrong colors | Check rule order (Nil Finance must be before Other Text) |

---

# PART 2: DETAILED EXPLANATIONS

## Why This Setup Works

### Understanding the Color System

**⬜ White (Blank):**
- Formula: `=ISBLANK(F3)`
- Only matches completely empty cells
- Keeps your sheet looking clean

**🟫 Brown (Nil Finance):**
- Formula: `=OR(F3="NIL FINANCE", F3="Nil Finance", F3="nil finance", UPPER(TRIM(F3))="NIL FINANCE")`
- Matches "Nil Finance" in ANY capitalization
- `TRIM()` removes extra spaces
- `UPPER()` converts to uppercase for comparison
- Works with: "NIL FINANCE", "Nil Finance", "nil finance", " Nil Finance " (with spaces)

**🔵 Light Blue (Other Text):**
- Formula: `=AND(NOT(ISBLANK(F3)), NOT(ISNUMBER(F3)), UPPER(TRIM(F3))<>"NIL FINANCE")`
- Matches any text that isn't blank and isn't "Nil Finance"
- `NOT(ISNUMBER(F3))` excludes dates (dates are stored as numbers)
- Catches: "REQUESTED BROKERS DETAILS", "TBC", "Pending", etc.

**🔴 Red (Past Dates):**
- Formula: `=AND(ISNUMBER(F3), F3<TODAY())`
- Dates are stored as numbers in Google Sheets
- `TODAY()` returns the current date
- Highlights overdue dates

**🟠 Amber (Upcoming Dates):**
- Formula: `=AND(ISNUMBER(F3), F3>=TODAY(), F3<=TODAY()+5)`
- Matches dates from today through 5 days from now
- Warns about approaching deadlines

**🟢 Green (Future Dates):**
- Formula: `=AND(ISNUMBER(F3), F3>TODAY()+5)`
- Matches dates more than 5 days away
- Shows dates that are safely in the future

---

## Why Rule Order Matters

Google Sheets checks rules **from top to bottom** and applies the **first matching rule**.

### Example: Wrong Order

If "Other Text" (Rule 3) comes BEFORE "Nil Finance" (Rule 2):

```
Cell contains: "Nil Finance"

Check Rule 3 (Other Text):
  - NOT(ISBLANK(F3)) → TRUE (not blank)
  - NOT(ISNUMBER(F3)) → TRUE (not a number)
  - UPPER(TRIM(F3))<>"NIL FINANCE" → FALSE (it IS "NIL FINANCE")
  
Result: Rule 3 doesn't match, continue to Rule 2

Check Rule 2 (Nil Finance):
  - OR(...) → TRUE (matches "Nil Finance")
  
Result: Cell turns BROWN ✅
```

Wait, that worked! But what if Rule 3 had the old formula without the UPPER check?

```
Old Rule 3: =AND(NOT(ISBLANK(F3)), NOT(ISNUMBER(F3)), F3<>"Nil Finance")

Cell contains: "NIL FINANCE"

Check Rule 3:
  - NOT(ISBLANK(F3)) → TRUE
  - NOT(ISNUMBER(F3)) → TRUE
  - F3<>"Nil Finance" → TRUE (because "NIL FINANCE" ≠ "Nil Finance")
  
Result: Cell turns LIGHT BLUE ❌ (wrong!)
Rule 2 never gets checked!
```

### Correct Order Prevents Issues

By putting "Nil Finance" (Rule 2) BEFORE "Other Text" (Rule 3):
- "Nil Finance" gets checked first and matched
- Other text gets checked second and matched
- No conflicts!

---

## Why the Apps Script is Essential

### The Text vs. Date Problem

**What Google Sheets Does:**

When you type `26/11/2025` in a cell, Google Sheets tries to interpret it:

1. **If your locale is DD/MM/YYYY:** Converts to a proper date ✅
2. **If your locale is MM/DD/YYYY:** Sees "month 26" (invalid) → stores as TEXT ❌
3. **If you have a leading space:** Stores as TEXT ❌
4. **If you copy/paste from elsewhere:** Often stores as TEXT ❌

**Why This Breaks Conditional Formatting:**

```
Cell shows: "26/11/2025"
Stored as: TEXT (not a date)

Date Rule Check:
  - ISNUMBER(F3) → FALSE (text is not a number)
  - Rule doesn't apply
  
Result: Cell stays WHITE ❌
```

**How Dates Should Work:**

```
Cell shows: 26/11/2025
Stored as: 45646 (date serial number)
Formatted as: dd/mm/yyyy

Date Rule Check:
  - ISNUMBER(F3) → TRUE (dates are numbers)
  - F3<TODAY() → TRUE (if date is past)
  
Result: Cell turns RED ✅
```

### What the Script Does

The script watches Column F and automatically converts text dates to real dates:

```javascript
// Detects pattern: DD/MM/YYYY
const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

// Splits "26/11/2025" into ["26", "11", "2025"]
const parts = value.split('/');

// Creates date: new Date(year, month-1, day)
const date = new Date(parts[2], parts[1] - 1, parts[0]);

// Replaces text with date
range.setValue(date);

// Formats as dd/mm/yyyy
range.setNumberFormat('dd/mm/yyyy');
```

**Result:** You type `26/11/2025` → Script converts it → Conditional formatting works!

---

## Apps Script Code Breakdown

### Line-by-Line Explanation

```javascript
function onEdit(e) {
```
- **Trigger function:** Runs automatically whenever someone edits a cell
- `e` contains information about the edit (which cell, what value, etc.)

```javascript
const sh = e.range.getSheet();
const sheetName = "YOUR_SHEET_NAME_HERE";
if (sh.getName() !== sheetName) return;
```
- Gets the sheet that was edited
- Checks if it matches your specified sheet name
- **Why:** Prevents script from running on every sheet in your workbook (performance)
- **Important:** Sheet name is case-sensitive!

```javascript
const col = range.getColumn();
const row = range.getRow();
if (col !== 6 || row < 3) return;
```
- Gets column number (F = 6) and row number
- Only continues if editing Column F (6) and row 3 or below
- **Why:** Only runs on Column F data cells, not headers or other columns

```javascript
const value = range.getValue();
if (!value || value instanceof Date) return;
```
- Gets the value that was typed
- Exits if blank or already a proper date
- **Why:** Don't waste time processing empty cells or dates that are already correct

```javascript
const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
if (datePattern.test(value)) {
```
- **Regular expression** that matches date patterns
- `\d{1,2}` = 1 or 2 digits (day or month)
- `\/` = forward slash
- `\d{4}` = 4 digits (year)
- Matches: `26/11/2025`, `1/3/2026`, `05/10/2025`
- Doesn't match: `2025-11-26`, `Nov 26, 2025`, `26-11-2025`

```javascript
const parts = value.split('/');
const date = new Date(parts[2], parts[1] - 1, parts[0]);
```
- Splits "26/11/2025" into `["26", "11", "2025"]`
- Creates date: `new Date(year, month, day)`
- **Important:** JavaScript months are 0-indexed (January = 0, December = 11)
- So we do `parts[1] - 1` to convert month 11 to index 10 (November)

```javascript
range.setValue(date);
range.setNumberFormat('dd/mm/yyyy');
```
- Replaces the text with the actual date object
- Formats it to display as `dd/mm/yyyy`
- **Result:** Cell now contains a DATE (number), not TEXT

```javascript
} catch (err) {
  // Fail silently
}
```
- If anything goes wrong, don't show error popups to users
- Just skip the conversion and let them continue working

---

## Common Issues and Solutions

### Issue 1: "Nil Finance" Stays White

**Cause:** Rule 2 range doesn't include the cell

**How to Check:**
1. Click on the white "Nil Finance" cell
2. Note the row number (e.g., row 150)
3. Go to Format → Conditional formatting
4. Click on Rule 2 (brown)
5. Check "Apply to range"
   - If it says `F3:F100` but your cell is in row 150 → **That's the problem!**
   - Change to `F3:F991` or `F3:F` (unlimited)

**Solution:**
- Update Rule 2 range to cover all rows: `F3:F991` or `F3:F`

---

### Issue 2: Dates Stay White

**Cause:** Dates are stored as text, not date values

**How to Check:**
1. Click on the white date cell
2. Look at the formula bar
3. If it shows `'26/11/2025` (with apostrophe) → It's text

**Solution:**
- Select the cells
- Menu: Format → Number → Date
- Or add the Apps Script to auto-convert future dates

---

### Issue 3: Script Not Working

**Cause 1: Sheet name doesn't match**

**How to Check:**
1. Look at the tab name at the bottom of your sheet
2. Copy it exactly (including spaces, capitalization)
3. In Apps Script, update: `const sheetName = "Exact Tab Name";`

**Cause 2: Script not saved**

**Solution:**
- Extensions → Apps Script
- Press Ctrl+S
- Close and refresh sheet (F5)

**Cause 3: Permissions not granted**

**Solution:**
- Edit a cell in Column F
- If popup appears, click "Allow"
- If no popup, try running the script manually:
  - Apps Script editor → Select `onEdit` from dropdown → Click Run (▶️)
  - This triggers the authorization flow

---

### Issue 4: Wrong Rule Order

**Symptom:** "Nil Finance" turns light blue instead of brown

**Cause:** Rule 3 (Other Text) is checked before Rule 2 (Nil Finance)

**Solution:**
1. Format → Conditional formatting
2. Drag Rule 2 (Nil Finance - brown) ABOVE Rule 3 (Other Text - light blue)
3. Click "Done"

---

## Advanced Tips

### Tip 1: Extending the Range

If you have more than 991 rows of data:
- Change all rules from `F3:F991` to `F3:F2000` (or higher)
- Or use `F3:F` for unlimited rows (may be slower on very large sheets)

### Tip 2: Changing the Date Thresholds

Want to change "within 5 days" to "within 7 days"?

**Rule 5 (Amber):**
- Change: `F3<=TODAY()+5` to `F3<=TODAY()+7`

**Rule 6 (Green):**
- Change: `F3>TODAY()+5` to `F3>TODAY()+7`

### Tip 3: Adding More Text Values

Want "N/A" to also be brown like "Nil Finance"?

**Update Rule 2:**
```
=OR(F3="NIL FINANCE", F3="Nil Finance", F3="nil finance", UPPER(TRIM(F3))="NIL FINANCE", UPPER(TRIM(F3))="N/A")
```

**Update Rule 3:**
```
=AND(NOT(ISBLANK(F3)), NOT(ISNUMBER(F3)), UPPER(TRIM(F3))<>"NIL FINANCE", UPPER(TRIM(F3))<>"N/A")
```

### Tip 4: Different Date Format

If you want to type dates as `YYYY-MM-DD` instead of `DD/MM/YYYY`:

**Update Apps Script:**
```javascript
// Change pattern from:
const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

// To:
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// Change parsing from:
const parts = value.split('/');
const date = new Date(parts[2], parts[1] - 1, parts[0]);

// To:
const parts = value.split('-');
const date = new Date(parts[0], parts[1] - 1, parts[2]);
```

---

## Summary Checklist

- [ ] Data validation added (Date is valid, Show warning)
- [ ] Rule 1: Blank → White (`=ISBLANK(F3)`)
- [ ] Rule 2: Nil Finance → Brown (case-insensitive OR formula)
- [ ] Rule 3: Other text → Light Blue (excludes Nil Finance)
- [ ] Rule 4: Past dates → Red
- [ ] Rule 5: Dates within 5 days → Amber
- [ ] Rule 6: Dates 6+ days away → Green
- [ ] **All rules have range `F3:F991` or `F3:F` covering all data**
- [ ] **Rules in correct order** (Blank, Nil Finance, Other Text, then dates)
- [ ] Tested: blank cell → white
- [ ] Tested: "NIL FINANCE" → brown
- [ ] Tested: "Nil Finance" → brown
- [ ] Tested: "nil finance" → brown
- [ ] Tested: other text → light blue
- [ ] Tested: past date → red
- [ ] Tested: date within 5 days → amber
- [ ] Tested: date 6+ days away → green
- [ ] Apps Script added and saved
- [ ] Script sheet name matches actual tab name
- [ ] Script authorized (permissions granted)
- [ ] Existing text dates converted to proper dates

---

## Color Reference Table

| Color | Meaning | Formula | Example |
|-------|---------|---------|---------|
| ⬜ White | Blank | `=ISBLANK(F3)` | (empty cell) |
| 🟫 Brown | Nil Finance | `=OR(F3="NIL FINANCE", ...)` | "NIL FINANCE", "Nil Finance" |
| 🔵 Light Blue | Other text | `=AND(NOT(ISBLANK(F3)), ...)` | "REQUESTED BROKERS DETAILS" |
| 🔴 Red | Past date | `=AND(ISNUMBER(F3), F3<TODAY())` | 01/01/2025 (if today is later) |
| 🟠 Amber | Within 5 days | `=AND(ISNUMBER(F3), F3>=TODAY(), F3<=TODAY()+5)` | 27/01/2026 (if today is 24/01/2026) |
| 🟢 Green | 6+ days away | `=AND(ISNUMBER(F3), F3>TODAY()+5)` | 05/02/2026 (if today is 24/01/2026) |

---

**End of Guide**

**Document Version:** 2.0  
**Last Updated:** January 24, 2026

---

## Need Help?

If you're still having issues:

1. **Check the range:** All rules must have `F3:F991` or `F3:F` covering your data
2. **Check rule order:** Nil Finance before Other Text
3. **Check sheet name:** In script, must match tab name exactly (case-sensitive)
4. **Convert text dates:** Select cells → Format → Number → Date
5. **Start fresh:** Delete all rules and follow Part 1 again step-by-step
