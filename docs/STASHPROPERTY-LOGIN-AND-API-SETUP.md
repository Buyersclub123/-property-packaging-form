# Stashproperty Login & API Setup for Make.com

## Credentials

**Username:** `Ali.h@buyersclub.com.au`  
**Password:** `Buyersclub313!`

---

## How It Works

The Stashproperty API requires a **2-step process**:

1. **Step 1: Login** → Get an access token
2. **Step 2: Use token** → Call `/planning-info` API with the token

---

## Step 1: Test Login Endpoint

We need to find the login endpoint. Common possibilities:

### Option A: `/app/api/login`
```
POST https://stashproperty.com.au/app/api/login
```

### Option B: `/auth/login`
```
POST https://stashproperty.com.au/auth/login
```

### Option C: `/app/api/auth/login`
```
POST https://stashproperty.com.au/app/api/auth/login
```

---

## Test Login in Make.com

### Module 1: HTTP - Login

**Method:** `POST`

**URL:** Try one of these:
- `https://stashproperty.com.au/app/api/login`
- `https://stashproperty.com.au/auth/login`
- `https://stashproperty.com.au/app/api/auth/login`

**Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`

**Body (JSON):**
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**OR try:**
```json
{
  "username": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```

**OR try:**
```json
{
  "email": "Ali.h@buyersclub.com.au",
  "password": "Buyersclub313!",
  "apiKey": "stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891"
}
```

---

## Step 2: Extract Token from Login Response

After login succeeds, you should get a response like:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save this token** - you'll use it in Step 3.

---

## Step 3: Use Token for Planning Info API

### Module 2: HTTP - Get Planning Info

**Method:** `GET`

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891
```

**Headers:**
- `Authorization`: `Bearer {token_from_step_1}`
- `Accept`: `application/json`

---

## Make.com Scenario Setup

### Flow:
```
Manual Trigger → HTTP Login → Set Variable (save token) → HTTP Planning Info
```

### Module 1: Manual Trigger
- Just a trigger to start the flow

### Module 2: HTTP - Login
- POST to login endpoint
- Body: email + password

### Module 3: Set Variable (or use data from Module 2)
- Extract token from login response
- Store it (or pass directly to next module)

### Module 4: HTTP - Planning Info
- GET to `/planning-info`
- Use token from Module 3 in Authorization header

---

## Testing Steps

1. **Test Login First:**
   - Create HTTP module with POST to login endpoint
   - Try different URL variations
   - Try different body formats
   - See which one works

2. **Once Login Works:**
   - Note the response structure
   - Extract the token
   - Use it in planning-info call

---

## Next Steps

1. **Try the login endpoint** in Make.com
2. **Share the response** (success or error)
3. **Once we know the login format**, I'll create the full Make.com scenario

---

**Status:** 🔍 Need to Test Login Endpoint  
**Credentials:** Ali.h@buyersclub.com.au / Buyersclub313!









