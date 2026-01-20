# Simple Steps: Test Stashproperty API

## What We're Testing

We want to see if your API key works with the Stashproperty API.

---

## Option 1: Test in Make.com (EASIEST - Recommended)

### Step 1: Open Make.com
1. Go to https://www.make.com
2. Log in to your account

### Step 2: Create a Test Scenario
1. Click **"Create a new scenario"** (or **"Scenarios"** → **"Create a new scenario"**)
2. Name it: **"Test Stashproperty API"**

### Step 3: Add HTTP Module
1. Click **"Add a module"** or drag a module into the flow
2. Search for: **"HTTP"**
3. Select: **"HTTP - Make a request"**

### Step 4: Configure the HTTP Module

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891
```

**Method:**
- Select: **GET**

**Headers:**
Click **"Add header"** and add:

**Header 1:**
- **Name:** `Authorization`
- **Value:** `Bearer stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

**Header 2:**
- **Name:** `Accept`
- **Value:** `application/json`

### Step 5: Run the Test
1. Click **"Run once"** button (or **"Save"** then **"Run once"**)
2. Wait for it to finish

### Step 6: Check the Result

**If it works (Success):**
- You'll see a green checkmark ✅
- Click on the HTTP module to see the response
- You should see JSON data with fields like `zone`, `hazards`, `lga`, etc.

**If it doesn't work (Error):**
- You'll see a red X ❌
- Click on the HTTP module to see the error message
- Common errors:
  - **401 Unauthorized** = API key format is wrong
  - **404 Not Found** = URL is wrong
  - **400 Bad Request** = Parameters are wrong

### Step 7: Try Alternative Authentication (If First One Failed)

If you got a 401 error, try this instead:

**Change Header 1 to:**
- **Name:** `Authorization`
- **Value:** `stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`
(Remove the word "Bearer" and the space)

Click **"Run once"** again and see if it works.

---

## Option 2: Test with Online Tool (Alternative)

### Step 1: Go to Online API Tester
1. Open: https://reqbin.com/ (or https://httpie.io/app)
2. This is a free online tool to test APIs

### Step 2: Enter the Details

**Method:** Select **GET**

**URL:**
```
https://stashproperty.com.au/app/api/planning-info?lat=-24.883688961467872&lon=152.3923265417891
```

**Headers:**
Click **"Headers"** tab and add:

**Header 1:**
- **Name:** `Authorization`
- **Value:** `Bearer stash_af04f6bb-7dba-472f-a740-3016736d9a87_1765615729891`

**Header 2:**
- **Name:** `Accept`
- **Value:** `application/json`

### Step 3: Send Request
1. Click **"Send"** button
2. Wait for response

### Step 4: Check Result

**If it works:**
- Status code will be **200 OK** (green)
- Response body will show JSON data

**If it doesn't work:**
- Status code will be **401** (red) = authentication failed
- Or **404** = URL wrong
- Try removing "Bearer" from the Authorization header

---

## What to Tell Me

After testing, tell me:

1. **Did it work?** (Yes or No)
2. **What did you see?**
   - If it worked: "I saw JSON data with zone, hazards, etc."
   - If it failed: Copy the error message (e.g., "401 Unauthorized")
3. **Which method did you use?** (Make.com or online tool)

---

## Quick Checklist

- [ ] Opened Make.com or online API tester
- [ ] Entered the URL with lat/lon
- [ ] Set Method to GET
- [ ] Added Authorization header with "Bearer" + API key
- [ ] Added Accept header with "application/json"
- [ ] Clicked Run/Send
- [ ] Checked the result
- [ ] If failed, tried without "Bearer"

---

**Need Help?** Just tell me what step you're stuck on and I'll help!

