# Verify Make.com Code - Step by Step

## Modules That Need Code Verification

### ✅ Module 7: Make Code - Parse Stashproperty Planning Info
**File:** `code/make-code-stashproperty-parser.js`
**Status:** ✅ Working (based on your response!)

**What to check:**
1. Open Make.com → "Test Stashproperty AP" → Module 7
2. Copy the code from Module 7
3. Compare with `code/make-code-stashproperty-parser.js`
4. **Tell me:** Does it match? Any differences?

---

### ✅ Module 9: Make Code - Extract Coordinates  
**File:** `code/make-code-extract-coordinates.js`
**Purpose:** Extract lat/lon from Geoscape geocoder

**What to check:**
1. Open Make.com → "Test Stashproperty AP" → Module 9
2. Copy the code from Module 9
3. Compare with `code/make-code-extract-coordinates.js`
4. **Tell me:** Does it match? Any differences?

---

### ⚠️ Module 6: Make Code - Extract Tokens
**File:** `code/make-code-module-6.js` (but this might be wrong - it's for GHL webhooks)
**Purpose:** Extract accessToken, refreshToken, cookieHeader from Stash login

**What to check:**
1. Open Make.com → "Test Stashproperty AP" → Module 6
2. Copy the code from Module 6
3. **Send me the code** - I'll verify if it's correct
4. Expected output: `accessToken`, `refreshToken`, `cookieHeader`

**Expected Module 6 Code (for Stash token extraction):**
```javascript
// Extract tokens from Set-Cookie headers
let httpResponse = input;
let headersObj = httpResponse.headers || httpResponse.Headers || {};

// Get set-cookie array
let setCookieHeaders = [];
const headerKeys = Object.keys(headersObj);
for (let key of headerKeys) {
  if (key.toLowerCase() === 'set-cookie') {
    const value = headersObj[key];
    if (Array.isArray(value)) {
      setCookieHeaders = value;
    } else if (value) {
      setCookieHeaders = [value];
    }
    break;
  }
}

// Extract tokens
let accessToken = null;
let refreshToken = null;
let lastActiveUser = null;

setCookieHeaders.forEach(cookieString => {
  if (!cookieString) return;
  const parts = cookieString.split(';');
  if (parts.length > 0) {
    const [name, value] = parts[0].split('=').map(s => s.trim());
    if (name === 'accessToken' && value) {
      accessToken = value;
    } else if (name === 'refreshToken' && value) {
      refreshToken = value;
    } else if (name === 'last-active-user' && value) {
      lastActiveUser = value;
    }
  }
});

// Build Cookie header
let cookieHeader = '';
if (lastActiveUser) {
  cookieHeader += `last-active-user=${lastActiveUser}; `;
}
if (refreshToken) {
  cookieHeader += `refreshToken=${refreshToken}; `;
}
if (accessToken) {
  cookieHeader += `accessToken=${accessToken};`;
}

return {
  accessToken: accessToken,
  refreshToken: refreshToken,
  lastActiveUser: lastActiveUser,
  cookieHeader: cookieHeader.trim()
};
```

---

## Module 8: Webhook Response (Configuration, Not Code)

**What to check:**
1. Open Module 8
2. **Status:** Should be `200`
3. **Body:** Should be `{{7}}` or `{{7.result}}`
4. **Tell me:** What does Body say now?

**Current Issue:** Response is `[{result: {...}}]` instead of just `{...}`

**Fix Option 1:** Change Body to `{{7.result}}` (returns just the result object)
**Fix Option 2:** Keep `{{7}}` and frontend handles `response[0].result` (already fixed)

---

## Quick Verification Checklist

- [ ] **Module 7 code** - Compare with `make-code-stashproperty-parser.js`
- [ ] **Module 9 code** - Compare with `make-code-extract-coordinates.js`  
- [ ] **Module 6 code** - Send me the code to verify
- [ ] **Module 8 Body** - Should be `{{7}}` or `{{7.result}}`

---

## What to Send Me

1. **Module 7 code** (copy/paste from Make.com)
2. **Module 9 code** (copy/paste from Make.com)
3. **Module 6 code** (copy/paste from Make.com)
4. **Module 8 Body field** (what it says)

Then I can verify everything matches and fix any issues!

---

**Please check these modules and send me the code!** 🔍







