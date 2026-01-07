# How to Run the Form Application

## ✅ Dependencies Installed!

The app is now ready to run.

## 🚀 Running the App

### Option 1: Already Running (Background)
I've started the dev server for you. Check your terminal - it should show:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

**Open your browser and go to:** http://localhost:3000

### Option 2: Start Manually

If the server isn't running, open a terminal and run:

```powershell
cd C:\Users\User\.cursor\extensions\property-review-system\form-app
npm run dev
```

Then open: **http://localhost:3000**

## 🧪 Testing Steps

1. **Open browser:** http://localhost:3000
2. **You should see:** "Property Packaging Form" heading and a multi-step form
3. **Test Step 0:** Select "New" → "H&L" → "Multiple"
4. **Click "Next"** to go to Step 1
5. **Test Step 1:** Enter address "4 Osborne Circuit Maroochydore QLD 4558"
6. **Click "Check Stash"** to test API integration
7. **Continue testing** through the steps

## 🐛 If You See Errors

**Check terminal** for error messages. Common issues:
- Port 3000 already in use → Change port: `npm run dev -- -p 3001`
- Missing dependencies → Run `npm install` again
- TypeScript errors → Check terminal output

## 📍 Where Are the Files?

All code is in:
```
C:\Users\User\.cursor\extensions\property-review-system\form-app\
```

Main files:
- `src/app/page.tsx` - Main page
- `src/components/MultiStepForm.tsx` - Form component
- `src/components/steps/` - Individual step components
- `src/lib/stash.ts` - Stash API integration
- `src/store/formStore.ts` - State management

## 🎯 What to Test

1. ✅ Step 0: Decision Tree works
2. ✅ Step 1: Address entry works
3. ✅ Step 1: "Check Stash" button works (may show error if API not responding)
4. ✅ Step 2: Risk overlays work
5. ✅ Navigation: Can go back/forward between steps
6. ✅ Persistence: Refresh page, data is saved

## 📝 Report Back

Let me know:
- ✅ Does the page load?
- ✅ Can you see the form?
- ✅ Do the steps work?
- ✅ Any errors in browser console (F12)?
- ✅ Any errors in terminal?

---

**The app should now be running at http://localhost:3000** 🎉







