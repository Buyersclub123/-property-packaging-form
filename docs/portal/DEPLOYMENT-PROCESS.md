# Portal Deployment Process

## ⚠️ PORTAL HAS MOVED TO VERCEL

**This document is outdated. Portal is now deployed via Vercel.**

**Current Portal Location:** `form-app/public/portal/index.html`  
**Current Portal URL:** `https://property-packaging-form.vercel.app/portal/`

**See:** `form-app/PORTAL-DEPLOYMENT.md` for current deployment instructions.

---

## Old Information (No Longer Used)

The portal was previously deployed via GitHub Pages, but has been moved to Vercel for single-repository deployment.

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
