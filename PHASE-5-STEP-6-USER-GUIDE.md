# Step 6: Washington Brown Calculator - User Guide

## Quick Start

1. Navigate to **Step 6: Washington Brown** in the multi-step form
2. Paste your Washington Brown depreciation report into the text area
3. Click **"Parse Depreciation Values"**
4. Review the parsed values in the table
5. Make any manual corrections if needed
6. Click **"Next"** to proceed to Step 7

---

## Supported Formats

The parser automatically recognizes these formats:

### Format 1: "Year X: $Y"
```
Year 1: $12,345
Year 2: $11,234
...
Year 10: $2,346
```

### Format 2: Numbered List "X. $Y"
```
1. $15,000
2. $14,250
...
10. $8,250
```

### Format 3: "Year X $Y" (no colon)
```
Year 1 $20,000
Year 2 $19,000
...
Year 10 $11,000
```

### Format 4: With Decimals
```
Year 1: $18,500.00
Year 2: $17,200.50
...
Year 10: $8,400.50
```

---

## Features

### ✅ Automatic Parsing
- Extracts Years 1-10 automatically
- Handles commas, dollar signs, and decimals
- Ignores extra text and formatting

### ✅ Manual Editing
- Click any cell to edit the value
- Changes save automatically
- No need to click a "Save" button

### ✅ Validation
- All 10 years must be filled
- Values must be positive numbers
- Clear error messages if something is missing

### ✅ Persistence
- Data saves automatically as you type
- Navigate away and come back - your data is still there
- Survives page refreshes

---

## Common Scenarios

### Scenario 1: Perfect Parse
1. Paste report → Click "Parse"
2. See green success message: "All 10 years parsed successfully!"
3. Click "Next" to proceed

### Scenario 2: Missing Years
1. Paste report → Click "Parse"
2. See red error: "Missing values for Year 4, 9"
3. Manually enter values for Year 4 and Year 9
4. Success message appears
5. Click "Next" to proceed

### Scenario 3: Manual Entry (No Report)
1. Skip pasting, go directly to table
2. Manually enter all 10 years
3. Success message appears when all filled
4. Click "Next" to proceed

### Scenario 4: Correction After Parsing
1. Parse report successfully
2. Notice Year 5 is wrong
3. Click Year 5 cell and edit
4. New value saves automatically
5. Click "Next" to proceed

---

## Troubleshooting

### ❌ "Missing values for Year X, Y, Z"
**Problem:** Parser couldn't find all 10 years in the pasted text

**Solutions:**
1. Check if your report includes all 10 years
2. Manually enter the missing years in the table
3. Try copying a larger section of the report

### ❌ "Invalid depreciation value for Year X"
**Problem:** The value isn't a valid number

**Solutions:**
1. Click the cell and re-enter the value
2. Remove any letters or special characters
3. Use numbers only (commas and decimals are OK)

### ❌ Can't Proceed to Next Step
**Problem:** Validation is blocking navigation

**Solutions:**
1. Check for red-bordered cells in the table
2. Fill in any empty cells
3. Verify all values are valid numbers
4. Look for error messages above the table

---

## Tips & Tricks

### 💡 Tip 1: Copy More Than You Need
The parser ignores extra text, so copy a large section of the report. It will find the 10 years automatically.

### 💡 Tip 2: Don't Worry About Formatting
Dollar signs, commas, decimals - the parser handles them all. Just paste and parse!

### 💡 Tip 3: Edit Anytime
Made a mistake? Just click the cell and fix it. No need to re-parse the entire report.

### 💡 Tip 4: Use Tab Key
After entering a value, press Tab to move to the next year. Faster than clicking!

### 💡 Tip 5: Check Your Work
Before clicking "Next", scroll through the table to verify all values look correct.

---

## Data Format

The component stores data in this format:

```typescript
{
  year1: "12345",
  year2: "11234",
  year3: "10123",
  year4: "9012",
  year5: "7901",
  year6: "6790",
  year7: "5679",
  year8: "4568",
  year9: "3457",
  year10: "2346"
}
```

**Note:** Values are stored as strings (without commas) to preserve decimal precision.

---

## Keyboard Shortcuts

- **Enter** in textarea: (none - use mouse to click Parse button)
- **Tab** in table: Move to next cell
- **Shift+Tab** in table: Move to previous cell
- **Escape** in cell: Cancel edit (reverts to previous value)

---

## FAQ

### Q: Do I need to remove extra text from the report?
**A:** No! The parser automatically ignores extra text and finds the year values.

### Q: What if my report has 15 years instead of 10?
**A:** The parser only extracts Years 1-10. Years 11-15 are ignored.

### Q: Can I use this for Prime Cost method?
**A:** Currently only Diminishing Value is supported. Use the values from your Diminishing Value section.

### Q: What if I don't have a Washington Brown report?
**A:** You can manually enter the 10 years directly in the table. No parsing needed.

### Q: Will my data be saved if I close the browser?
**A:** Yes! Data is saved to browser storage and persists across sessions.

### Q: Can I go back and change values later?
**A:** Yes! Use the "Previous" button to return to Step 6 and edit any values.

---

## Example: Complete Workflow

1. **Open Step 6**
   - See instructions and empty textarea

2. **Paste Report**
   ```
   Year 1: $18,500.00
   Year 2: $17,200.50
   Year 3: $16,100.25
   Year 4: $15,000.00
   Year 5: $13,900.75
   Year 6: $12,800.50
   Year 7: $11,700.25
   Year 8: $10,600.00
   Year 9: $9,500.75
   Year 10: $8,400.50
   ```

3. **Click "Parse Depreciation Values"**
   - Button shows spinner
   - Table appears with all 10 years
   - Green success message: "All 10 years parsed successfully!"

4. **Review Values**
   - Scroll through table
   - All values look correct

5. **Click "Next"**
   - Proceeds to Step 7: Folder Creation
   - Data is saved and ready for submission

---

## Support

If you encounter issues:
1. Check this user guide
2. Try the troubleshooting section
3. Review the test data file: `PHASE-5-STEP-6-TEST-DATA.md`
4. Contact the development team

---

**Last Updated:** January 21, 2026  
**Version:** 1.0
