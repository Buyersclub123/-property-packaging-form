# Portal URL Update Required

## ⚠️ IMPORTANT: Portal URL Has Changed

**Old URL:** `https://buyersclub123.github.io/property-portal`  
**New URL:** `https://buyersclub123.github.io/-property-packaging-form/portal/`

---

## Make.com Modules That Need Updating

### 1. Scenario 2a "GHL Property Review Submitted" - Module 3

**Location:** Email template (Path 2 - EMAIL TO BA)

**What to update:** The `reviewUrl` variable in the code

**Find this line:**
```javascript
const reviewUrl = PORTAL_URL + "?webhookUrl=...";
```

**Update `PORTAL_URL` constant:**
```javascript
const PORTAL_URL = "https://buyersclub123.github.io/-property-packaging-form/portal";
```

---

### 2. Scenario 3 "Property Review Approval Webhook" - Module 18

**Location:** Deal Sheet portal link generation

**What to update:** The portal URL in the `propertyAddressLink` code

**Find this section:**
```javascript
const portalUrl = `https://buyersclub123.github.io/property-portal?webhookUrl=...`;
```

**Change to:**
```javascript
const portalUrl = `https://buyersclub123.github.io/-property-packaging-form/portal?webhookUrl=...`;
```

---

## Testing After Update

1. Test email link from Scenario 2a opens portal correctly
2. Test Deal Sheet link from Scenario 3 opens portal correctly
3. Verify portal loads with all URL parameters

---

## Notes

- All URL parameters remain the same (`webhookUrl`, `module1Webhook`, `apiUrl`, `recordId`, `propertyId`, `propertyAddress`)
- Only the base URL has changed
- Portal functionality is unchanged
