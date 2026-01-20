# Configuration Reference

## GHL API Configuration

```javascript
const GHL_CONFIG = {
  bearerToken: "pit-d375efb5-f445-458d-af06-3cbbb4b331dd",
  apiVersion: "2021-07-28",
  objectId: "692d04e3662599ed0c29edfa",
  baseUrl: "https://services.leadconnectorhq.com"
};
```

## Make.com Webhooks

```javascript
const WEBHOOKS = {
  module1: "https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl",
  approval: "https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk",
  portal: "https://hook.eu1.make.com/YOUR_MODULE_1_WEBHOOK_URL" // TODO: Update
};
```

## Google Sheets

```javascript
const SHEETS = {
  sheetId: "1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q",
  opportunitiesTab: "Opportunities",
  genericMessagesTab: "Generic BA messages",
  corsProxy: "https://api.allorigins.win/raw?url="
};
```

## Email Addresses

```javascript
const EMAILS = {
  packager: "john.t@buyersclub.com.au", // Testing
  baGroup: "property@buyersclub.com.au", // Shared BA group
  test: "john.t@buyersclub.com.au" // Testing only
};
```

## Portal Configuration

```javascript
const PORTAL = {
  url: "https://buyersclub123.github.io/property-portal",
  githubRepo: "buyersclub123/property-portal"
};
```

## Approval Webhook Parameters

```
URL: https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk

Query Parameters:
- recordId: GHL record ID
- propertyId: Property identifier
- action: "approve" | "reject"
- field: Field to update (e.g., "packager_approved")
- value: Value to set (e.g., "Approved")
```

## Portal Webhook Payload

```json
{
  "source": "portal",
  "recordId": "...",
  "propertyId": "...",
  "propertyAddress": "...",
  "baEmail": "...",
  "baName": "...",
  "selectedClients": [
    {
      "id": "...",
      "name": "...",
      "emails": ["..."],
      "message": "...",
      "clientName": "...",
      "partnerName": "...",
      "type": "standard" | "personalised"
    }
  ],
  "action": "send_standard" | "action_selected",
  "timestamp": "..."
}
```

## Make.com Module References

- Module 1: Webhook (Trigger)
- Module 13: Get Record (GHL API)
- Module 6: Make Code (Preprocessor)
- Module 3: Make Code (Email Template Builder)
- Module 7: Make Code (HTML Extractor)
- Router: Email Routing (4 paths)

## Testing Notes

- All emails currently go to `john.t@buyersclub.com.au` for testing
- Portal webhook URL needs to be updated in portal code
- BA approval field currently used for testing (may not be needed once portal is complete)










