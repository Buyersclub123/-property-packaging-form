# Get Latest GHL Record - Quick Method

## Option 1: Add HTTP Module in Make.com (Recommended)

**What to do:**
1. In Make.com, after the HTTP module that creates the record (Module 14), add a new HTTP module
2. Configure it to GET the record using the ID from the previous module

**HTTP Module Configuration:**
- **Method:** `GET`
- **URL:** `https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/{{14.id}}`
  - Where `{{14.id}}` is the ID from the create module response
- **Headers:**
  - `Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
  - `Version: 2021-07-28`

## Option 2: Manual API Call (Quick Test)

**Use this in a terminal or Postman:**

```bash
curl -X GET "https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/696066854778006e251ed58e?locationId=UJWYn4mrgGodB7KZUcHt" \
  -H "Authorization: Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd" \
  -H "Version: 2021-07-28"
```

**Or in PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer pit-d375efb5-f445-458d-af06-3cbbb4b331dd"
    "Version" = "2021-07-28"
}
Invoke-RestMethod -Uri "https://services.leadconnectorhq.com/objects/692d04e3662599ed0c29edfa/records/696066854778006e251ed58e?locationId=UJWYn4mrgGodB7KZUcHt" -Headers $headers
```

## Option 3: Check in GHL UI

Just go to GHL → Property Reviews custom object → Find the latest record by date/time created
