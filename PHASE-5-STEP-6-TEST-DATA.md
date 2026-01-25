# Phase 5 - Step 6: Washington Brown Calculator - Test Data

## Test Case 1: Standard Format with "Year X: $Y"

```
Year 1: $12,345
Year 2: $11,234
Year 3: $10,123
Year 4: $9,012
Year 5: $7,901
Year 6: $6,790
Year 7: $5,679
Year 8: $4,568
Year 9: $3,457
Year 10: $2,346
```

**Expected Result:** All 10 years should parse correctly with values: 12345, 11234, 10123, 9012, 7901, 6790, 5679, 4568, 3457, 2346

---

## Test Case 2: Numbered List Format "1. $Y"

```
1. $15,000
2. $14,250
3. $13,500
4. $12,750
5. $12,000
6. $11,250
7. $10,500
8. $9,750
9. $9,000
10. $8,250
```

**Expected Result:** All 10 years should parse correctly with values: 15000, 14250, 13500, 12750, 12000, 11250, 10500, 9750, 9000, 8250

---

## Test Case 3: Mixed Format with Extra Text

```
Depreciation Schedule - Diminishing Value Method

Year 1: $18,500.00 (First year depreciation)
Year 2: $17,200.50
Year 3: $16,100.25
Year 4: $15,000.00
Year 5: $13,900.75
Year 6: $12,800.50
Year 7: $11,700.25
Year 8: $10,600.00
Year 9: $9,500.75
Year 10: $8,400.50

Total depreciation over 10 years: $133,702.50
```

**Expected Result:** All 10 years should parse correctly with decimal values: 18500.00, 17200.50, 16100.25, 15000.00, 13900.75, 12800.50, 11700.25, 10600.00, 9500.75, 8400.50

---

## Test Case 4: Format with "Year" and Space Before Dollar

```
Year 1 $20,000
Year 2 $19,000
Year 3 $18,000
Year 4 $17,000
Year 5 $16,000
Year 6 $15,000
Year 7 $14,000
Year 8 $13,000
Year 9 $12,000
Year 10 $11,000
```

**Expected Result:** All 10 years should parse correctly with values: 20000, 19000, 18000, 17000, 16000, 15000, 14000, 13000, 12000, 11000

---

## Test Case 5: Missing Years (Should Show Error)

```
Year 1: $12,345
Year 2: $11,234
Year 3: $10,123
Year 5: $7,901
Year 6: $6,790
Year 7: $5,679
Year 8: $4,568
Year 10: $2,346
```

**Expected Result:** Error message: "Missing values for Year 4, 9. Please ensure all 10 years are included in the pasted text."

---

## Test Case 6: Invalid Format (Should Show Error)

```
This is just random text with no depreciation values.
Some numbers: 123, 456, 789
But no proper year format.
```

**Expected Result:** Error message: "Missing values for Year 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. Please ensure all 10 years are included in the pasted text."

---

## Test Case 7: Real-World Washington Brown Format

```
DEPRECIATION SCHEDULE
Property: 123 Main Street, Sydney NSW 2000
Date: January 21, 2026

Diminishing Value Method - Years 1-10:

Year 1: $22,450.00
Year 2: $21,327.50
Year 3: $20,261.13
Year 4: $19,248.07
Year 5: $18,285.67
Year 6: $17,371.39
Year 7: $16,502.82
Year 8: $15,677.68
Year 9: $14,893.80
Year 10: $14,149.11

Note: Values calculated using ATO diminishing value rates
```

**Expected Result:** All 10 years should parse correctly with decimal values: 22450.00, 21327.50, 20261.13, 19248.07, 18285.67, 17371.39, 16502.82, 15677.68, 14893.80, 14149.11

---

## Manual Editing Test

After parsing any of the above test cases:
1. Click on Year 5 value
2. Change it to "99999"
3. Verify the value updates in the table
4. Verify the form store is updated
5. Navigate to next step and back
6. Verify the edited value persists

---

## Validation Test

1. Parse Test Case 5 (missing years)
2. Manually fill in Year 4 and Year 9
3. Verify success message appears
4. Try to proceed to next step
5. Should succeed once all 10 years are filled

---

## Implementation Status

- [x] Component created: `Step6WashingtonBrown.tsx`
- [x] Added to MultiStepForm.tsx as Step 6
- [x] Validation logic added to MultiStepForm.tsx
- [x] Parsing logic handles multiple formats
- [x] Manual editing supported
- [x] Auto-save to form store
- [x] Success/error messages
- [x] All 10 years required validation
- [x] No linter errors

---

## Next Steps

1. Test in browser with sample data
2. Verify form store persistence
3. Verify navigation works correctly
4. Verify data is included in final submission
5. Update any documentation as needed
