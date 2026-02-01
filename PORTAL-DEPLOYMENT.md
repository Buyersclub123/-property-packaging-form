# Portal Deployment - Single Repository Setup

## ⚠️ IMPORTANT: Portal Location

**Portal files are in:** `form-app/public/portal/`

**Portal URL:** `https://property-packaging-form.vercel.app/portal/`

**Everything is in ONE repository and ONE deployment system (Vercel).**

---

## How to Update Portal

### Step 1: Edit Portal Files

Edit files in: `form-app/public/portal/index.html` (or other portal files)

### Step 2: Commit Changes

```powershell
cd form-app
git add public/portal/
git commit -m "Update portal: [description]"
git push
```

### Step 3: Deploy to Vercel

```powershell
cd form-app
vercel --prod
```

**That's it!** Portal is deployed.

---

## Portal Files Location

- **Source:** `form-app/public/portal/index.html`
- **Deployed at:** `https://property-packaging-form.vercel.app/portal/`
- **Other files:** `confirmation.html`, `callback.html` also in `public/portal/`

---

## Old Locations (DO NOT USE)

❌ `property-review-system/portal/` - Old location, not used  
❌ `property-review-system/docs/portal/` - Old location, not used  
❌ GitHub Pages - No longer used

✅ **USE:** `form-app/public/portal/` only

---

## Make.com URL Updates

When portal URL changes, update:
1. **Scenario 2a Module 3** - Email template portal link
2. **Scenario 3 Module 18** - Deal Sheet portal link

**Current portal URL:** `https://property-packaging-form.vercel.app/portal`
