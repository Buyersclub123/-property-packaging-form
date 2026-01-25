# Vercel Access Information

**IMPORTANT: This file contains access credentials and project IDs for all Vercel projects.**

## Project Categories

### 🏠 PROPERTY PACKAGING PROJECT (Current/Active)
This is the main project we're actively working on.

**property-packaging-form**
- **Project Name:** `property-packaging-form`
- **Project ID:** (Check Vercel dashboard - Settings → General)
- **Vercel URL:** `property-packaging-form.vercel.app`
- **Local Path:** `form-app/`
- **GitHub Repo:** `Buyersclub123/property-packaging-form`
- **Purpose:** Main property packaging form application
- **Status:** ✅ Already linked/accessible

---

### 🛠️ PREVIOUS TOOLS (Amenity Distance Apps)
These are the older amenity distance calculator tools.

#### 1. amenity-distance-app (Main)
- **Project Name:** `amenity-distance-app`
- **Project ID:** `prj_npDyA1rE7JbJQdSTwvpEyy9B7i6C`
- **Vercel URL:** `amenity-distance-app.vercel.app`
- **Local Path:** `amenity-distance-app/`
- **GitHub Repo:** `Buyersclub123/amenity-distance-app`
- **Purpose:** Amenity distance calculator - main version
- **Status:** ✅ Local copy created - Need to link to Vercel

#### 2. amenity-distance-app-a220 (Variant)
- **Project Name:** `amenity-distance-app-a220`
- **Project ID:** `prj_Fn7algkhTDEsYmlKXnGmQ8Fs8vvr`
- **Vercel URL:** `amenity-distance-app-a22o.vercel.app`
- **Local Path:** `amenity-distance-app-a220/`
- **GitHub Repo:** `Buyersclub123/amenity-distance-app`
- **Purpose:** Amenity distance calculator - a220 variant
- **Status:** ✅ Local copy created - Need to link to Vercel

#### 3. amenity-distance-app-8m3d (Variant)
- **Project Name:** `amenity-distance-app-8m3d`
- **Project ID:** `prj_00368xqiLdylmPmcjP3BfkCL9K73`
- **Vercel URL:** `amenity-distance-app-8m3d.vercel.app`
- **Local Path:** `amenity-distance-app-8m3d/`
- **GitHub Repo:** `Buyersclub123/amenity-distance-app`
- **Purpose:** Amenity distance calculator - 8m3d variant
- **Status:** ✅ Local copy created - Need to link to Vercel

---

## API Access

**Vercel API Token:** `RVE0quS0k8s5yNzlLzcmHIyz`

**To use this token:**
1. Add to `.env.local` file: `VERCEL_API_TOKEN=RVE0quS0k8s5yNzlLzcmHIyz`
2. Or use in Vercel CLI commands
3. Or use in API requests to manage deployments/environment variables

**Token Location in Vercel Dashboard:**
- URL: https://vercel.com/account/tokens
- Can create additional tokens if needed

---

## Summary

| Project | Type | Project ID | Local Path | Status |
|---------|------|------------|------------|--------|
| property-packaging-form | 🏠 PACKAGING | (Check dashboard) | `form-app/` | ✅ Linked |
| amenity-distance-app | 🛠️ PREVIOUS TOOL | `prj_npDyA1rE7JbJQdSTwvpEyy9B7i6C` | `amenity-distance-app/` | ✅ Local copy created |
| amenity-distance-app-a220 | 🛠️ PREVIOUS TOOL | `prj_Fn7algkhTDEsYmlKXnGmQ8Fs8vvr` | `amenity-distance-app-a220/` | ✅ Local copy created |
| amenity-distance-app-8m3d | 🛠️ PREVIOUS TOOL | `prj_00368xqiLdylmPmcjP3BfkCL9K73` | `amenity-distance-app-8m3d/` | ✅ Local copy created |

---

## Next Steps to Link Projects

To link the 3 amenity distance apps locally:

1. **Clone the repository** (if not already local):
   ```bash
   git clone https://github.com/Buyersclub123/amenity-distance-app.git
   ```

2. **Link each project using Vercel CLI:**
   ```bash
   # For amenity-distance-app
   vercel link --project prj_npDyA1rE7JbJQdSTwvpEyy9B7i6C
   
   # For amenity-distance-app-a220
   vercel link --project prj_Fn7algkhTDEsYmlKXnGmQ8Fs8vvr
   
   # For amenity-distance-app-8m3d
   vercel link --project prj_00368xqiLdylmPmcjP3BfkCL9K73
   ```

3. **Or use API token in code** to manage projects programmatically

---

**Last Updated:** 2026-01-10
**Note:** Keep this file secure and do not commit API tokens to public repositories.
