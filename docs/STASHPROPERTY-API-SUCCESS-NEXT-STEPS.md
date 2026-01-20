# Stashproperty API Integration - Status & Next Steps

## ✅ What We Accomplished Today

1. **Found the API Endpoint:**
   - URL: `https://stashproperty.com.au/app/api/planning-info`
   - Method: `GET`
   - Parameters: `lat` and `lon` (latitude/longitude)

2. **Discovered Authentication Method:**
   - Uses **Cookie header** (not Bearer token or API key directly)
   - Requires `accessToken` cookie (JWT token)
   - Token expires and needs to be refreshed periodically

3. **Successfully Tested API:**
   - Status Code: 200 ✅
   - API is working and returning data

---

## 📋 What We Need to Do Next

### 1. Review the API Response Data
- [ ] Check the Output section in Make.com HTTP module
- [ ] Note what fields are returned (zone, hazards, lga, state, etc.)
- [ ] Confirm it has the data we need for the email template

### 2. Set Up Full Make.com Integration

**Module Flow:**
```
Module 1 (Webhook) 
  ↓
Module 13 (GHL Get Record) 
  ↓
Module [NEW] (Geocode Address → Lat/Lon) - IF GHL doesn't have coordinates
  ↓
Module [NEW] (Stashproperty API Call)
  ↓
Module [NEW] (Parse Stashproperty Response)
  ↓
Module 16 → Module 6 → Module 3 → ...
```

**What to Create:**
- [ ] Geocoding module (if GHL doesn't have lat/lon)
- [ ] Stashproperty API HTTP module
- [ ] Parse response module (extract fields)
- [ ] Update Module 6 to merge Stashproperty data
- [ ] Update Module 3 to use Stashproperty risk overlays in emails

### 3. Handle Token Refresh
- [ ] Find the login endpoint to get fresh tokens automatically
- [ ] OR set up token refresh mechanism
- [ ] OR document manual token refresh process

### 4. Test End-to-End
- [ ] Test with a real property address
- [ ] Verify data flows correctly
- [ ] Check email output includes Stashproperty data

---

## 🔑 Key Information

### API Endpoint
```
GET https://stashproperty.com.au/app/api/planning-info?lat={lat}&lon={lon}
```

### Authentication
- **Method:** Cookie header
- **Required Cookie:** `accessToken` (JWT token)
- **Token Expires:** Yes (needs periodic refresh)

### Current Working Cookie Format
```
last-active-user=b6794945-e8ab-4f64-98b6-63e55976be06; _fw_crm_v=8ac3fc99-dcdd-4535-d9de-720bd1b579d0; refreshToken=2f8ae913-1515-4621-a05f-5c04b07aa77a; accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; first_session=...; __session=...
```

### Credentials
- **Email:** Ali.h@buyersclub.com.au
- **Password:** Buyersclub313!
- **API Key:** stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891 (not used directly)

---

## 📝 Notes

- The API key we have doesn't work directly - we need the accessToken from login
- Token expires, so we'll need to handle refresh
- The website uses cookies for authentication, not Bearer tokens
- We still need to find the login endpoint for automatic token refresh

---

## 🎯 First Thing Tomorrow

1. **Check the API response data** in Make.com
2. **Share what fields you see** in the response
3. **Then I'll create the full integration code** for Make.com

---

**Status:** ✅ API Working - Ready for Integration  
**Next:** Review response data, then create Make.com modules









