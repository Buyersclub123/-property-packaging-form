# Project changes in Make.com

## Purpose
Track requested changes and the ongoing analysis/implementation work required to ensure **Project (multi-lot) client emails are sent as ONE consolidated email** and later support **SOLD styling**.

## Requirements (from user)
- Send **one email per Project** that includes **all lots**.
- When a lot is selected from the portal, the system must still generate **one email showing all lots**.
- Add SOLD formatting (later): If a lot status in GHL changes to **02 EOI** or **03 Contr' Exchanged**, then in the email:
  - That lot’s property details are **struck through**
  - Add **SOLD** next to it in **red text**
- Get **formatting correct first**, then implement SOLD styling.

## Scope breakdown (3 phases)
### Phase 1: Initial creation + Packager approval email (Project)
- When a Project (multi-lot) is created (02b flow), send **one consolidated email** that includes **all lots**.
- Consolidated formatting must follow the confirmed rules (Purchase Price + Rental Assessment per lot).

### Phase 2: Portal send to client (Project)
- When a **Project lot** is selected in the portal and sent to clients, generate **one consolidated email** that includes **all sibling lots** for that `project_identifier`.
- Requires fetching sibling lots in Make.com (02a) after the selected lot record is fetched.

### Phase 3: SOLD styling (Project-only)
- When rendering each lot block, if status is `02 EOI` or `03 Contr' Exchanged`:
  - Strike-through that lot’s details
  - Add a red `SOLD` label

## Non-negotiable guardrails
- **All changes must be Project-only.**
- **No changes** to formatting/behaviour for:
  - Established
  - New (single contract)
  - New (split contract)
- Use the **existing wording + rules** from new properties for each lot (single vs split), but apply them **only inside Project rendering**.

## Implementation plan (best-practice)
### Phase 1 trigger change (avoid dedupe)
Goal: Keep **1 record per lot** (GHL + deal sheet), but trigger **one** consolidated packager email.

- **02b** (Form App submission) will:
  - Create/update all lot records as it does today.
  - After the lot loop completes, send **one webhook** into **02a** with:
    - `action: "project_created"`
    - `project_identifier: "PROJ-..."`
    - Webhook URL (02a Module 1): `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`

#### Verified: where to get a lot record id in 02b
- Project (multi-lot) create uses **Module 12** (`http:MakeRequest`) to POST each lot record.
- Each operation output includes the created record id at: `{{12.data.record.id}}`.
- Use any one created lot id (e.g. the first operation) as the `id` field when triggering 02a.

#### Recommended 02b -> 02a trigger payload
Send JSON:
- `source: "form_app"`
- `action: "project_created"`
- `project_identifier: {{13.project_identifier}}`
- `id: {{12.data.record.id}}`

- **02a** will:
  - Add a route for `action === "project_created"`:
    - Search/list all Property Review records where `project_identifier == incoming project_identifier`
    - Call Module 3 with the full array of lots
    - Send **one** packager approval email (consolidated)

- **02a** must also suppress the per-lot send during project creation:
  - If incoming webhook is a standard record-created trigger and the fetched record has `record.properties.project_identifier`, then **do not send** (it will be handled by `project_created`).

## Current state (confirmed)
### Make.com scenario + key modules
Source: `make-com-scenarios/02a GHL Property Review Submitted approval & email processing.blueprint (26).json`

- **Module 3 (`code:ExecuteCode`)**
  - This is the **authoritative email template builder** (same code as `code/MODULE-3-COMPLETE-FOR-MAKE.js`).
  - Generates email fields like `subject`, HTML body (`html_body` / `htmlBody`), etc.

- **Module 19 (`builtin:BasicFeeder`)**
  - Config: `array: {{3.result}}`
  - This means Module 3 returns an **array** of bundles and Make feeds them downstream.
  - This is a major reason the system can behave like “multiple outputs” (and is the mechanism that would cause multi-send if Module 3 returns multiple items).

- **Email sending modules (`google-email:sendAnEmail`)**
  - They do not build formatting.
  - They just send `content`:
    - Non-portal paths often use `{{3.result.html_body}}`
    - Portal/auto-send paths use `{{19.htmlBody}}`

### Email builder code location
Source: `code/MODULE-3-COMPLETE-FOR-MAKE.js`

- Portal detection exists in Module 3 code:
  - `const isPortalRequest = portalData.source === "portal";`

- Portal emails are currently built as:
  - `selectedClients.map(...)` returning an **array of email objects**

## Analysis: What must change to send ONE consolidated Project email
### A) Consolidated “all lots” formatting
**Change location:** Make.com **Module 3** (email builder)

- For a Project, the email body must contain:
  - Shared project fields once (Address, Google Map, overlays, etc.)
  - Then for each of the following sections, repeat a **lot sub-block**:
    - Property Description
    - Purchase Price
    - Rental Assessment

**Important note:** This requires Module 3 to have access to **all lots’ data** at generation time.

### B) Prevent “one email per lot” behavior
**Change location:** Make.com **Module 3 output** and potentially Module 19 usage

Options:
- **Option 1 (preferred):** For Projects, have Module 3 return a **single email object** for the consolidated email (per client), rather than returning one bundle per lot.
- **Option 2:** Keep returning an array, but ensure the array has **length = 1** for Projects (the single item is the consolidated email).

## Portal requirement: Selecting a lot must generate email with all lots
### Key dependency
To show all lots when the user selects a single lot record, Make.com must be able to:
- Identify the “project group” for that lot
- Fetch all sibling lot records (or fetch parent record containing lots)

### Verified indicators
- Project lot indicator (from GHL record fetch): `record.properties.project_identifier` exists.
- Non-project lot: `record.properties.project_identifier` missing/empty.

Two viable approaches:
- **Approach 1: Fetch all lots at send time**
  - Use a grouping field (e.g. `project_identifier`) from the selected lot record.
  - Run a “search/list records” step in Make.com to retrieve all lots sharing that identifier.

- **Approach 2: Use parent record storage**
  - Parent record stores prebuilt template and/or `lots_data` JSON.
  - Portal send resolves parent record then uses stored lots list/template.

Reference doc already in repo:
- `PROJECT-LOTS-ARCHITECTURE.md` (describes parent/child patterns and “one email all lots” requirement)

## SOLD styling (deferred until formatting is correct)
**Change location:** Make.com **Module 3** while rendering each lot block.

Rules:
- If lot status is `02 EOI` OR `03 Contr' Exchanged`:
  - Apply `text-decoration: line-through;` to that lot’s details
  - Add `SOLD` label in red (e.g. `color: #ff0000; font-weight: 700;`)

Dependency:
- The per-lot status value must be available for every lot when building the consolidated email.

## Open items / needs confirmation
- Identify the exact Make.com scenario/webhook that is triggered by the **portal client-send** flow.
- Confirm how projects/lots are currently grouped in GHL (e.g. `project_identifier`, parent linkage).
- Confirm whether the current portal payload includes only a single `recordId` (selected lot) or includes project context.

## Existing rules we must NOT change (baseline behaviour)
Source: `code/MODULE-3-COMPLETE-FOR-MAKE.js`

### Purchase Price wording (New properties)
- **New (H&L + SMSF)**: current code adds **"House & Land package"** at the top of Purchase Price.
- **Single Contract**: shows `Price: $X` (Total Price).
- **Split Contract**: shows `Price: $X` then indented `Land: $X` and `Build: $X`.
- **Projects**: current code explicitly says **do not show Projects here** (Purchase Price logic is currently excluded from Projects).

### Cashback vs Rebate vs Net Price (baseline rules)
Source: `docs/0000-REQUIREMENTS/EMAIL-TEMPLATE-REQUIREMENTS.md` + `code/MODULE-3-COMPLETE-FOR-MAKE.js`

- **Cashback vs Rebate label**:
  - If type includes `rebate` => show `Rebate: $X` (no Net Price sentence).
  - Else => treat as cashback.
- **Net Price sentence** (New properties only):
  - Show only when `cashbackRebateType === "cashback"`.
  - Format: `Net Price: $X when considering the $Y cashback`.
  - Cashback amount styling: grey background `#808080`, white bold text.
- **Established**:
  - Never show Net Price.
- **Comparable Sales**:
  - Must still show (mandatory field behaviour) regardless of cashback/rebate.

### Project-only implementation rule
- When we add Purchase Price back for Projects, it must be in a **new Project-only block**.
- That Project-only block must reuse the same single vs split logic above, per lot.
- Cashback/rebate/net price rules above must be applied **per lot** and **Project-only**.

### Confirmed Project formatting decisions
- **Purchase Price (Projects)**:
  - Show **"House & Land package" once** at the top of the Purchase Price section.
  - Then for each lot: show a `Lot X` heading, then apply the same baseline rules for:
    - `Price:`
    - `Land:` + `Build:` (split only)
    - `Net Price:` sentence (cashback only)
    - `Rebate:` line (rebate only)
- **Rental Assessment (Projects)**:
  - Projects are **New only** (no tenants).
  - Show **Appraisal** + **Appraised Yield** per lot.
  - Do **not** show Occupancy / Current Rent / Expiry / Current Yield.

## Where project_identifier is created (Make.com)
Source: `make-com-scenarios/02b Form App Property Submission to GHL once approved.blueprint (13).json`

- **Module 13** (`util:SetVariable2`) sets `project_identifier`:
  - Value: `PROJ-{{formatDate(now; "YYYYMMDD-HHmmss")}}`
- **Module 22** (`code:ExecuteCode`) receives it as input `projectIdentifier: {{13.project_identifier}}`.
- This indicates scenario **02b is generating the project_identifier** and passing it into the per-lot mapping step.

## Work log
### 2026-03-14
- Identified key formatting module: **Make Module 3**
- Identified iteration mechanism: **Make Module 19 BasicFeeder**
- Confirmed portal detection uses `source === "portal"` in Module 3
