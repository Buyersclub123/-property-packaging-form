# Make.com Scenario Configuration

## Module Details

### Module 1: Webhook (Trigger)
- **Type**: Custom webhook
- **URL**: `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
- **Function**: Receives property submission data from GHL

### Module 13: Get Record
- **Type**: Make a request (HTTP)
- **URL**: `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/`
- **Method**: GET
- **Headers**:
  - `Version`: `2021-07-28`
  - `Authorization`: `Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- **Error Handling**: Evaluate all states as errors (except 2xx and 3xx)
- **Function**: Fetches full property record data from GHL

### Module 6: Make Code (Preprocessor)
- **Type**: Run code
- **Language**: JavaScript
- **Input Variable**: `Webhook_Data`
- **Function**: 
  - Preprocesses webhook data
  - Handles portal requests vs normal GHL webhooks
  - Formats data for email template builder
- **Code**: See `code/make-code-module-6.js`

### Module 3: Make Code (Email Template Builder)
- **Type**: Run code
- **Language**: JavaScript
- **Input Variable**: `Data`
- **Function**: 
  - Builds HTML and text email templates
  - Handles both portal requests and GHL webhook requests
  - Generates approval buttons
  - Formats property data sections
- **Code**: See `code/make-code-module-3.js`

### Module 7: Make Code (HTML Extractor)
- **Type**: Run code
- **Language**: JavaScript
- **Input Variable**: `Data`
- **Function**: Extracts clean summary HTML from email template
- **Code**: See `code/make-code-module-7.js`

### Router: Email Routing
Routes emails based on approval status:

#### Path 1: EMAIL TO PACKAGER
- **Condition**: `packager_approved` Not equal to `Approved`
- **Recipient**: `john.t@buyersclub.com.au` (testing)
- **Subject**: From Module 3 result
- **Body**: HTML from Module 3 result
- **Buttons**: Approve / Needs Editing & Resubmitting

#### Path 2: EMAIL TO BA
- **Condition**: `packager_approved` Equal to `Approved` AND `ba_approved` Not equal to `Approved`
- **Recipient**: `property@buyersclub.com.au` (shared BA group)
- **Subject**: From Module 3 result
- **Body**: HTML from Module 3 result
- **Buttons**: Review Suitable Clients / Needs Editing & Resubmitting

#### Path 3: TEST PATH
- **Condition**: `packager_approved` Equal to `Approved` AND `ba_approved` Equal to `Approved`
- **Recipient**: `john.t@buyersclub.com.au` (testing only)
- **Function**: Manual test option

#### Path 4: CLIENTS EMAILS
- **Condition**: `packager_approved` Equal to `Approved` AND `source` Equal to `portal`
- **Recipient**: Mapped from portal client selection
- **Function**: Sends emails to selected clients from BA's Gmail

## Approval Webhook

- **URL**: `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`
- **Parameters**:
  - `recordId`: GHL record ID
  - `propertyId`: Property identifier
  - `action`: `approve` or `reject`
  - `field`: Field to update (e.g., `packager_approved`)
  - `value`: Value to set (e.g., `Approved`)

## Portal Webhook

- **URL**: Module 1 webhook (same as GHL webhook)
- **Payload Structure**:
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
      "partnerName": "..."
    }
  ],
  "action": "send_standard" | "action_selected",
  "timestamp": "..."
}
```










