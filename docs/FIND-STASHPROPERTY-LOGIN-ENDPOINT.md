# Finding Stashproperty Login Endpoint

## Goal

Find the API endpoint that accepts login credentials and returns `accessToken` for automatic token refresh.

---

## Method 1: Browser Network Tab (Most Reliable)

### Step 1: Prepare
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Click **"Fetch/XHR"** filter (to show only API calls)
4. Clear all requests (trash icon)
5. Make sure **"Preserve log"** is checked

### Step 2: Log In
1. Navigate to: `https://stashproperty.com.au/auth/login`
2. Enter credentials:
   - Email: `Ali.h@buyersclub.com.au`
   - Password: `Buyersclub313!`
3. Click **Login** button
4. **Watch the Network tab** for new requests

### Step 3: Find Login POST Request
Look for:
- **POST** request (not GET)
- Happens **right when you click Login**
- Name might be: `login`, `auth`, `signin`, `session`, `authenticate`
- URL might be: `/auth/login`, `/app/api/auth/login`, `/api/login`, etc.

### Step 4: Inspect the Request
When you find it, click on it and check:

**Headers Tab:**
- **Request URL:** Copy this (this is the endpoint!)
- **Request Method:** Should be POST

**Payload Tab:**
- **Request Body:** Should contain email/password
- Format might be:
  ```json
  {
    "email": "Ali.h@buyersclub.com.au",
    "password": "Buyersclub313!"
  }
  ```
  OR
  ```json
  {
    "username": "Ali.h@buyersclub.com.au",
    "password": "Buyersclub313!"
  }
  ```

**Response Tab:**
- Should contain `accessToken` or `token`
- Format might be:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {...}
  }
  ```

---

## Method 2: Check Login Form Source

### Step 1: View Page Source
1. Go to: `https://stashproperty.com.au/auth/login`
2. Right-click → **View Page Source**
3. Search for: `form`, `action`, `login`, `api`

### Step 2: Look for Form
Find HTML like:
```html
<form action="/app/api/auth/login" method="POST">
  <input name="email" ...>
  <input name="password" ...>
</form>
```

The `action` attribute is the endpoint!

---

## Method 3: Check Apps Script stashLogin Function

If you can find the `stashLogin()` function in your Google Sheets Apps Script:

1. Open Apps Script
2. Search for: `function stashLogin`
3. Look for:
   - `UrlFetchApp.fetch()` calls
   - Login endpoint URL
   - Request format

---

## What to Share

When you find the login endpoint, share:

1. **Endpoint URL:** (e.g., `https://stashproperty.com.au/app/api/auth/login`)
2. **Method:** (POST)
3. **Request Body Format:**
   ```json
   {
     "email": "...",
     "password": "..."
   }
   ```
4. **Response Format:**
   ```json
   {
     "accessToken": "...",
     "refreshToken": "..."
   }
   ```
5. **Any Special Headers:** (Content-Type, etc.)

---

## Once We Have It

I'll create:
1. **Login Module** in Make.com
2. **Token Refresh Logic** (call login before Stashproperty API)
3. **Error Handling** (if login fails)

---

**Status:** 🔍 Discovery Phase  
**Next:** Find login endpoint via Network tab









