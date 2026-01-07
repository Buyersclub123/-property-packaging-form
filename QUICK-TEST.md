# Quick Test Steps

## 1. Setup (One Time)

Run the setup script:
```powershell
.\setup-and-test.ps1
```

Or manually:
```bash
npm install
npm run dev
```

## 2. Open Browser

Navigate to: http://localhost:3000

## 3. Test Step 0 (Decision Tree)

1. ✅ Select "New" → "H&L" → "Multiple"
2. ✅ Verify subject line appears: "New H&L Project - [Suburb] - [Lots Available]"
3. ✅ Click "Next"
4. ✅ Should go to Step 1

**If this works:** ✅ Step 0 is correct!

---

## 4. Test Step 1 (Address)

1. ✅ Enter: "4 Osborne Circuit Maroochydore QLD 4558"
2. ✅ Click "Check Stash"
3. ✅ Watch for:
   - Loading indicator appears
   - Either success OR error message
   - Form still works either way
4. ✅ Fill in address fields manually
5. ✅ Click "Next"

**If this works:** ✅ Step 1 is correct!

---

## 5. Test Step 2 (Risk Overlays)

1. ✅ Check if Zoning/Flood/Bushfire auto-populated (if Stash worked)
2. ✅ Change Flood to "Yes"
3. ✅ Verify dialogue field appears
4. ✅ Enter some text
5. ✅ Test "Set All Overlays to No" button
6. ✅ Set Due Diligence to "Yes"
7. ✅ Click "Next"

**If this works:** ✅ Step 2 is correct!

---

## 6. Test Persistence

1. ✅ Fill in some data
2. ✅ Refresh page (F5)
3. ✅ Verify data is still there
4. ✅ Verify you're on the same step

**If this works:** ✅ Persistence is correct!

---

## Report Issues

If anything doesn't work:
1. Check browser console (F12) for errors
2. Check terminal for errors
3. Note what step you were on
4. Note what you expected vs what happened

---

## Next Steps

Once Steps 0-2 are 100% working, we'll move to:
- Step 4: Market Performance
- Step 6: Property Details  
- Step 7: Review & Submit







