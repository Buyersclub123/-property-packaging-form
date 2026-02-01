# Portal Deployment Process

## Portal is in the Main Repository

The portal code is deployed from the main repository using GitHub Pages.

**Repository:** `Buyersclub123/-property-packaging-form`  
**Portal Location:** `docs/portal/index.html`  
**Portal URL:** `https://buyersclub123.github.io/-property-packaging-form/portal/`

---

## Deployment Steps

### When Portal Code Changes

1. **Edit portal code** in: `property-review-system/docs/portal/index.html`

2. **Commit and push to main branch:**
   ```powershell
   cd property-review-system
   git add docs/portal/index.html
   git commit -m "Update portal: [description of changes]"
   git push origin main
   ```

3. **GitHub Pages will auto-deploy** (if configured to serve from `/docs` folder)

**Note:** Ensure GitHub Pages is configured to serve from `/docs` folder in repository settings.

---

## Security Check Before Deploying

**ALWAYS verify before pushing:**

- [ ] No hardcoded webhook URLs (should use URL parameters)
- [ ] No API keys or tokens
- [ ] No passwords or secrets
- [ ] No bearer tokens
- [ ] Google Sheet ID is OK (public data, not a secret)

**Current security status:**
- ✅ Webhook URLs come from URL parameters
- ✅ No secrets in code
- ✅ Google Sheet ID is public data

---

## Quick Reference

**Portal URL:** `https://buyersclub123.github.io/-property-packaging-form/portal/`  
**Repository:** `https://github.com/Buyersclub123/-property-packaging-form`  
**Source Code:** `property-review-system/docs/portal/index.html`

---

## GitHub Pages Configuration

**Required Setup:**
1. Go to repository settings: `https://github.com/Buyersclub123/-property-packaging-form/settings/pages`
2. Under "Source", select "Deploy from a branch"
3. Select branch: `main`
4. Select folder: `/docs`
5. Click "Save"

**After Configuration:**
- GitHub Pages will automatically deploy when you push to `main` branch
- Portal will be available at: `https://buyersclub123.github.io/-property-packaging-form/portal/`

---

## ⚠️ IMPORTANT: Update Make.com Modules

**The portal URL has changed.** You need to update:

1. **Make.com Scenario 2a, Module 3** - Email template portal link
2. **Make.com Scenario 3, Module 18** - Deal Sheet portal link

**Old URL:** `https://buyersclub123.github.io/property-portal`  
**New URL:** `https://buyersclub123.github.io/-property-packaging-form/portal/`
