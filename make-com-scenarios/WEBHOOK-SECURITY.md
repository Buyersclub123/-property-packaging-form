# Webhook Security and Configuration

## Overview

The portal requires webhook URLs to be provided via URL parameters. No webhook URLs are hardcoded in the source code.

---

## Required URL Parameters

When linking to the portal, include these parameters:

- `webhookUrl` - Make.com Scenario 5 webhook URL (for loading opportunities)
- `module1Webhook` - Make.com Module 1 webhook URL (for sending emails)
- `apiUrl` - Form-app API URL (for lookups)

**Example:**
```
https://buyersclub123.github.io/property-portal?webhookUrl=https://hook.eu1.make.com/...&module1Webhook=https://hook.eu1.make.com/...&apiUrl=https://property-review-form.vercel.app
```

---

## Where Portal Links Are Created

### 1. Make.com Email Templates (BA Auto Select Email)

**Location:** Make.com scenario that sends BA approval emails

**Action Required:** Update email template button/link to include all required parameters:
- `webhookUrl` - Scenario 5 webhook URL
- `module1Webhook` - Module 1 webhook URL  
- `apiUrl` - Form-app Vercel URL
- Existing parameters: `recordId`, `propertyId`, `propertyAddress`

**Example Make.com expression:**
```
https://buyersclub123.github.io/property-portal?webhookUrl={{YOUR_SCENARIO_5_WEBHOOK}}&module1Webhook={{YOUR_MODULE_1_WEBHOOK}}&apiUrl=https://property-review-form.vercel.app&recordId={{1.id}}&propertyId={{1.propertyId}}&propertyAddress={{1.propertyAddress}}
```

---

### 2. Google Sheets Deal Sheet

**Location:** Google Sheets "Deal Sheet" - portal link column/button

**Action Required:** Update Google Apps Script or formula to include all required parameters:
- `webhookUrl` - Scenario 5 webhook URL
- `module1Webhook` - Module 1 webhook URL
- `apiUrl` - Form-app Vercel URL
- Existing parameters: `recordId`, `propertyId`, `propertyAddress`

---

## Security Best Practices

### Make.com Scenario Security

**Add validation in Make.com scenarios:**

1. **Validate `source` field:**
   - Check that `{{1.source}}` equals `"portal"`
   - Reject requests without valid source

2. **Validate required fields:**
   - Check that `selectedClients` exists and is an array
   - Check that each client has required fields (`id`, `emails`, etc.)

3. **Add authentication token (optional):**
   - Portal sends: `{ "source": "portal", "authToken": "your-secret", ... }`
   - Make.com checks: `{{1.authToken}}` equals your secret
   - If wrong, stop execution

**Example Router condition in Make.com:**
```
{{1.source}} equals "portal" AND {{1.authToken}} equals "your-secret-here"
```

### Rate Limiting

- Set execution limits in Make.com scenario settings
- Prevents abuse if webhook URLs are discovered

### IP Whitelisting (if supported)

- Restrict webhook to specific IPs in Make.com webhook settings
- Check Make.com documentation for IP whitelisting options

---

## Development/Testing

For local development or testing, you can use `window.PORTAL_CONFIG`:

```javascript
window.PORTAL_CONFIG = {
  webhookUrl: 'https://hook.eu1.make.com/...',
  module1Webhook: 'https://hook.eu1.make.com/...',
  apiUrl: 'https://property-review-form.vercel.app'
};
```

Add this to browser console before loading the portal.

---

## Implementation Checklist

- [ ] Update Make.com email template to include `webhookUrl` and `module1Webhook` parameters
- [ ] Update Google Sheets Deal Sheet link to include `webhookUrl` and `module1Webhook` parameters
- [ ] Add security validation in Make.com Scenario 1 (Module 1 webhook)
- [ ] Add security validation in Make.com Scenario 5 (Module 8 webhook)
- [ ] Test portal links from both email and Deal Sheet
- [ ] Verify portal works with URL parameters only (no hardcoded defaults)

---

## Notes

- Webhook URLs are public endpoints by design
- Security should be handled in Make.com scenario logic, not by hiding URLs
- URL parameters allow flexibility (different URLs per use case)
- No secrets are stored in Git repository
