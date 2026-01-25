# Specific Make.com Questions - Based on Screenshots

## Scenario: "Test Stashproperty AP"

**Module Order (as per screenshot):**
1. Module 3 (Webhooks) - TRIGGER
2. Module 4 (HTTP) - First Stash API call
3. Module 9 (Make Code) - First processing
4. Module 5 (HTTP) - Second API call
5. Module 6 (Make Code) - Second processing
6. Module 1 (HTTP) - Third API call
7. Module 7 (Make Code) - Final processing
8. Module 8 (Webhooks) - Response

---

### Module 3: Webhooks (Custom webhook) - TRIGGER
**Status:** ✅ Complete
**Webhook URL:** `https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885`
**HTTP Method:** POST (inferred)
**Request Format:** 
```json
{
  "property_address": "123 Main St, Suburb, State"
}
```
**Note:** Format inferred from Module 4 usage

---

### Module 4: HTTP - "Make a request" (First Stash API call)
**Status:** ✅ Details received
**API Endpoint:** `https://api.psma.com.au/v2/addresses/geocoder`
**HTTP Method:** `GET`
**Request Headers:**
- `Authorization`: `VfqDRW796v5jGTfXcHgJXDdoGi7DENZA`
- `Accept`: `application/json`
**Request Format:**
- Query parameter: `address=3.property_address`
- Uses `property_address` field from Module 3

**Inferred Module 3 Request Format:**
- Module 3 expects: `{ "property_address": "123 Main St, Suburb, State" }`

---

### Module 9: Make Code - "Run code" (First processing)
**Status:** ✅ Complete
**Purpose:** Extract lat/lon coordinates from Geoscape geocoder response
**Input:** `data` variable from "4. Data" (Module 4 output)
**Output:**
```json
{
  "longitude": <number>,
  "latitude": <number>,
  "coordinates": [<longitude>, <latitude>],
  "debug": { ... }
}
```
**Code:** Extracts coordinates from `responseData.data.features[0].geometry.coordinates`

---

### Module 5: HTTP - "Make a request" (Second Stash API call)
**Status:** ✅ Complete
**Purpose:** Authenticate/login to Stash Property API
**API Endpoint:** `https://stashproperty.com.au/auth/api/login`
**HTTP Method:** `POST`
**Request Headers:**
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `Origin`: `https://stashproperty.com.au/`
**Request Body:**
```json
{
  "email": "ali.h@buyersclub.com.au",
  "password": "Buyersclub313!"
}
```
**Note:** Login call - does not use Module 9 coordinates. Returns auth token for subsequent calls.

---

### Module 6: Make Code - "Run code" (Second processing)
**Status:** ✅ Complete
**Purpose:** Extract accessToken and refreshToken from Set-Cookie headers
**Input:** `headers` variable from "5. HTTP - Make a request [bundle]" (Module 5 output)
**Output:**
```json
{
  "accessToken": "<token>",
  "refreshToken": "<token>",
  "lastActiveUser": "<value>",
  "cookieHeader": "last-active-user=<value>; refreshToken=<token>; accessToken=<token>",
  "cookies": {...},
  "rawHeaders": {...},
  "rawSetCookie": [...],
  "debugHttpResponse": {...}
}
```
**Note:** Extracts authentication tokens from login response cookies for use in Module 1 (third API call)

---

### Module 1: HTTP - "Make a request" (Third Stash API call)
**Status:** ✅ Complete
**Purpose:** Get planning info/risk overlays from Stash Property API
**API Endpoint:** `https://stashproperty.com.au/app/api/planning-info`
**HTTP Method:** `GET`
**Query Parameters:**
- `lat`: `9. result: latitude` (from Module 9)
- `lon`: `9. result: longitude` (from Module 9)
**Request Headers:**
- `Accept`: `application/json`
- `Cookie`: `6. result: cookieHeader` (from Module 6)
**Note:** Main API call that retrieves risk overlays, zoning, LGA, and planning information

---

### Module 7: Make Code - "Run code" (Final processing)
**Status:** ✅ Complete
**Purpose:** Parse Stashproperty Planning Info response and extract risk overlays
**Input:** `Data` variable from "1.Data" (Module 1 output)
**Output Structure:**
```json
{
  "zone": "<zoning code>",
  "zoneDesc": "<zoning description>",
  "zoning": "<code> (<description>)",
  "lga": "<LGA name>",
  "state": "<state>",
  "lgaPid": "<LGA PID>",
  "floodRisk": "Yes" | "No",
  "floodingRisk": "Yes" | "No",
  "flooding": "<text>",
  "bushfireRisk": "Yes" | "No",
  "bushfire": "<text>",
  "heritageRisk": "Yes" | "No",
  "heritage": "<text>",
  "biodiversityRisk": "Yes" | "No",
  "biodiversity": "<text>",
  "floodingRiskValue": <number>,
  "bushfireRiskValue": <number>,
  "heritageRiskValue": <number>,
  "biodiversityRiskValue": <number>,
  "lotSizeMin": "<min lot size>",
  "lotSizeAvg": "<avg lot size>",
  "planningLinks": ["<link1>", "<link2>"],
  "planningLink1": "<first link>",
  "planningLink2": "<second link>",
  "rawStashData": {...},
  "rawHazards": {...},
  "rawSources": [...]
}
```
**Note:** Maps Stash Property API response to form fields (flood, bushfire, heritage, biodiversity, zoning, LGA)

---

### Module 8: Webhooks - "Webhook response"
**Status:** ✅ Complete
**HTTP Status:** `200`
**Response Body:** Returns output from Module 7 (`7. result`)
**Response Format:** Same as Module 7 output (see Module 7 above)

**Field Mapping to Form Fields:**
- `floodRisk` / `floodingRisk` → Form field: `flood` ("Yes"/"No")
- `bushfireRisk` → Form field: `bushfire` ("Yes"/"No")
- `heritageRisk` → Form field: `heritage` (may map to `other_overlay`?)
- `biodiversityRisk` → Form field: `biodiversity` (may map to `other_overlay`?)
- `zoning` → Form field: `zoning`
- `lga` → Form field: `lga` (for Investment Highlights lookup)
- `state` → Form field: `state`
- `coordinates` (from Module 9) → Not returned in Module 8, but available from Module 9

**Note:** Module 7/8 don't explicitly extract `mining`, `other_overlay`, or `special_infrastructure`. These may need to be mapped from other fields or the Stash API response structure may need to be checked.

---

## Scenario: "GHL Property Review Submitted"

### Module 1: Webhooks (Custom webhook) - TRIGGER
**Questions:**
- [ ] Webhook URL: `https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d` - Is this correct?
- [ ] What is the exact JSON payload structure received from GHL?
- [ ] Are all custom object fields included in the payload?

### Module 2: Router
**Questions:**
- [ ] How many routes/branches are there?
- [ ] What conditions determine each route?
  - Route 1: Condition? (e.g., `status = "01 Available"`?)
  - Route 2: Condition?
  - Route 3: Condition?
  - etc.
- [ ] What is the purpose of each route? (Different email types? Different processing?)

### Module 3+: Modules after Router
**Questions:**
- [ ] **Module X:** "Get Record" - What does this get? (Stash data? Google Sheets data?)
- [ ] **Module Y:** "Make Code" modules - What does each one do?
  - Module Y.1: Purpose?
  - Module Y.2: Purpose?
  - etc.
- [ ] **Module Z:** "Iterator" - What does it iterate over? (Email recipients? Properties?)
- [ ] **Module W:** "Gmail" modules - How many email modules are there?
  - Module W.1: Who receives this email? (Packager? BA? Client?)
  - Module W.2: Who receives this email?
  - etc.

### Google Sheets Integration
**Questions:**
- [ ] Which module writes to Google Sheets?
- [ ] What Google Sheet name?
- [ ] What tab name? ("Property Log"? "Sent"?)
- [ ] What columns/fields are written?
- [ ] When does it write? (After email sent? Before? Both?)

### Stash Integration
**Questions:**
- [ ] Does this scenario call "Test Stashproperty AP" scenario?
  - If yes: Which module calls it? (HTTP module? Scenario call module?)
  - What is the exact call format?
- [ ] Or does it call Stash API directly?
  - If yes: Which module? What endpoint?

---

## Scenario: "Property Review Approval Webhook - by Ahmad"

### Module 1: Webhooks (Custom webhook) - TRIGGER
**Questions:**
- [ ] What is the exact webhook URL?
- [ ] What triggers this? (Email approval button click?)
- [ ] What is the request format? (e.g., `{ "property_review_id": "...", "approved": true }`?)

### Module 2: Update Custom Object (GHL)
**Questions:**
- [ ] Which GHL custom object? ("Property Reviews"?)
- [ ] Which field is updated? (`packager_approved`?)
- [ ] What value is set? (`"Approved"`? `true`? `"yes"`?)
- [ ] What is the exact GHL API endpoint used?

### Module 3: Break
**Questions:**
- [ ] Just confirms execution stops here?

---

## Scenario: "Opportunity SNAPSHOT"

### Module 1: Google Sheets - "Clear Values from a Range"
**Questions:**
- [ ] Which Google Sheet?
- [ ] Which tab?
- [ ] Which range? (e.g., "A2:Z1000"?)

### Module 2: GoHighLevel - "Search Opportunities"
**Questions:**
- [ ] What pipeline name? ("04. PROPERTY TEAM P..."?)
- [ ] What filters/criteria?
- [ ] What fields are retrieved?

### Module 3: GoHighLevel - "Get an Opportunity"
**Questions:**
- [ ] What opportunity data is retrieved?
- [ ] What fields?

### Module 4: GoHighLevel - "Get a Contact"
**Questions:**
- [ ] What contact data is retrieved?
- [ ] What fields?

### Module 5: Google Sheets - "Add a Row"
**Questions:**
- [ ] Which Google Sheet?
- [ ] Which tab?
- [ ] What data is written? (Which columns?)

### Module 6: Array aggregator
**Questions:**
- [ ] What data is aggregated?
- [ ] What is the output format?

### Module 7+: Google Sheets - "Update a Cell" (multiple)
**Questions:**
- [ ] How many "Update a Cell" modules?
- [ ] What cells are updated?
- [ ] What data is written to each?

---

## Scenario: "Realtime opportunity tracker"

### Module 1: Webhooks (Custom webhook) - TRIGGER
**Questions:**
- [ ] What is the exact webhook URL?
- [ ] What triggers this? (GHL webhook when opportunity changes?)
- [ ] What is the request format?

### Module 2: Google Sheets - "Search Rows"
**Questions:**
- [ ] Which Google Sheet? ("Pipeline Stage changes via Make.com"?)
- [ ] Which tab?
- [ ] What search criteria? (opportunity_id?)

### Module 3: Router
**Questions:**
- [ ] Route 1: "Checks if exists" - Condition?
- [ ] Route 2: "Add row (fallback route)" - Condition?

### Module 4 (Route 1): Google Sheets - "Update a Row"
**Questions:**
- [ ] Which row is updated? (How is it identified?)
- [ ] What data is updated?

### Module 5 (Route 2): Google Sheets - "Add a Row"
**Questions:**
- [ ] What data is added?
- [ ] Which columns?

---

## General Questions

### Webhook URLs Needed:
- [ ] "Test Stashproperty AP" webhook URL (Module 1)
- [ ] "Property Review Approval Webhook - by Ahmad" webhook URL (Module 1)
- [ ] "Realtime opportunity tracker" webhook URL (Module 1)
- [ ] Any other webhook URLs?

### API Credentials:
- [ ] Stash API credentials (where stored in Make.com?)
- [ ] GHL API credentials (where stored in Make.com?)
- [ ] Google Sheets API credentials (where stored in Make.com?)
- [ ] ChatGPT API credentials (where stored in Make.com?)

### Data Flow:
- [ ] Can the new form call "Test Stashproperty AP" directly via webhook?
- [ ] Or should form → GHL → triggers "GHL Property Review Submitted"?
- [ ] What's the preferred flow?

---

## What I Need From Screenshots:

For each scenario, please provide:
1. **Module numbers** (1, 2, 3, etc.)
2. **Module types** (Webhooks, HTTP, Make Code, Router, etc.)
3. **Module names/labels** (if any)
4. **Webhook URLs** (for webhook modules)
5. **API endpoints** (for HTTP modules)
6. **Data structures** (request/response formats)
7. **Router conditions** (for Router modules)
8. **Field mappings** (what data flows between modules)

**Please reference screenshots by:**
- Scenario name
- Module number
- Module type
- Specific question

Example: *"In 'Test Stashproperty AP', Module 1 (Webhooks), what is the webhook URL?"*

