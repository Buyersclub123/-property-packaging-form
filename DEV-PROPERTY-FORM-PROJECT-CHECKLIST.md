# Dev Property Form - Project / H&L Analysis Checklist

## 1) What gets sent to Make.com / GHL (payload)
- **[Confirm payload source]** Step 8 sends `payload = { source: 'form_app', action: 'submit_new_property', formData: processedSubmissionData, folderLink }` to the Make.com webhook (`NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION`).
  - **Findings:** The payload includes *almost the entire* `formData` object.
  - **Actions:** Confirm in Make.com scenario which `formData` fields are mapped into GHL fields (because the app itself does not do per-field GHL mapping here).

- **[Fields excluded before sending]** `formData.address` has these removed before sending:
  - `addressVerified`
  - `addressFieldsEditable`
  - `stashPropertyAddress`
  - `latitude`
  - `longitude`
  - `addressSource`
  - `lotNumberNotApplicable`
  - `usePropertyAddressForProject`
  - `hasUnitNumbers`
  - **Actions:** If you need any of the above in GHL later, they currently will not be available via submission.

- **[Key point for “Project Name” + “Project Address”]**
  - `address.projectName` is currently **not** in the excluded list, so it **is sent**.
  - `address.projectAddress` is currently **not** in the excluded list, so it **is sent**.
  - **Actions:** Defer removal of Project Name + Project Address from the form (leave as-is for now).

## 2) Conditional / Project-specific UI fields
- **[Project vs H&L detection]**
  - **Project** in Step 2 is when `decisionTree.propertyType === 'New'` and `decisionTree.lotType === 'Multiple'`.
  - **H&L** is when `decisionTree.propertyType === 'New'` and `decisionTree.lotType === 'Individual'`.
  - **Findings:** Project vs H&L drives whether fields are entered once (H&L) or per-lot (Project).

- **[Main pricing conditional: Contract Type (Split vs Single)]**
  - **Split Contract** (e.g. contract type `01_hl_comms`): pricing uses `landPrice` + `buildPrice`.
  - **Single Contract** (e.g. contract type `02_single_comms`): pricing uses `totalPrice`.

- **[Project-level fields visible in ProjectLotsView]**
  - Project Address (`address.projectAddress`) (required)
  - Project Name (`address.projectName`) (optional)
  - Comparable Sales (shared; stored in `purchasePrice.comparableSales` and copied to all lots)
  - Project Brief (stored in `propertyDescription.projectBrief`)
  - Cashback/Rebate (project-level; copied to lots depending on contract type)

- **[Actions: Project fields]**
  - Defer removal of Project Address + Project Name + Project Brief from the form UI (leave as-is for now).

## 2a) Project per-lot fields (`formData.lots[]`)
- **What it is:** For Projects, lot/unit details are stored in `formData.lots[]`.
- **Per-lot fields to verify:**
  - `lots[i].lotNumber`
  - `lots[i].singleOrDual` (drives whether secondary dwelling fields are relevant for that lot)
  - `lots[i].propertyDescription` (lot-level overrides)
  - `lots[i].purchasePrice` (lot-level overrides)
  - `lots[i].rentalAssessment` (lot-level overrides)
- **Actions:**
  - Fix: ensure each Project lot record in GHL is populated from that lot’s values in `lots[i]` (starting with `price_group`).
  - Confirm which lot identifier is used downstream for naming (lot/unit number in sheets + email + folder artifacts).

## 3) “Use Property Address from Step 1” checkbox (Project Address)
- **[Intended behaviour]** When checked:
  - sets `address.usePropertyAddressForProject = true`
  - copies `address.propertyAddress` into `address.projectAddress`
  - disables/read-only the Project Address input

- **[Does it actually work?]**
  - **Findings:** Yes, the UI copies the value on check, and also has an effect that keeps syncing `propertyAddress → projectAddress` while checked.
  - **Findings:** `usePropertyAddressForProject` is NOT sent to Make/GHL (explicitly removed), but `projectAddress` *is* sent.
  - **Actions:** Defer removal of this checkbox + Project Address field from the form (leave as-is for now).

## 4) Project Name
- **Actions:** Defer removal of `address.projectName` from the form UI (leave as-is for now).

## 5) “Project brief” error (`ReferenceError: isEditMode is not defined`)
- **Observed error:** Clicking/expanding Project Brief triggers a crash in `ProjectLotsView`.
- **Likely cause (code-level):** `ProjectLotsView()` references `isEditMode` (for “Clear in GHL” UI), but `isEditMode` is **not defined inside that function**.
- **Actions:** FIX: add `const isEditMode = formData.editMode === true || !!formData.ghlRecordId;` inside `ProjectLotsView()`.
  - After fix: re-test expanding Project Brief and any other sections that reference `isEditMode`.

## 6) Cashflow spreadsheet creation + naming (per Lot / Unit)
- **Current behaviour (folder creation route):** `/api/create-property-folder` renames the kept sheet to:
  - `CF spreadsheet ${streetNumber} ${streetName} ${suburbName}`
  - and renames Photos doc similarly.
- **Gap for Projects:** This creates **one** spreadsheet per property folder, not one per lot.

- **Desired behaviour (your requirement):** For Projects, create a cashflow spreadsheet **per lot** and name it with:
  - lot/unit identifier + address

- **Actions (to decide/implement):**
  - Decide the naming standard, e.g. `CF spreadsheet Lot 12 - 10 Smith St Suburb` (or `Unit 3` etc).
  - Confirm where lot identifiers live in `formData.lots[]` (lot/unit fields) and which should be used.
  - FIX: include Lot & Unit number in the **cashflow sheet name**.
  - FIX: include Lot & Unit number in the **property folder name**.
  - FIX (Projects): create **one cashflow sheet per lot** (not a single shared sheet).
  - Update folder creation logic to:
    - copy/duplicate the template sheet N times (N = number of lots)
    - rename each sheet using the lot identifier + base address
    - populate each sheet with that lot’s data (not the project-level defaults)

## 7) `price_group` not populating in GHL for Projects
- **Problem:** `price_group` is not being populated in GHL when the property is a Project.
- **Things to check (likely causes):**
  - The form calculates **Price Group per lot** (`formData.lots[i].purchasePrice.priceGroup`), and the downstream automation may not be using that lot-level value when creating/updating the lot records in GHL.
  - The value may be present in the payload but not written into the GHL `price_group` field for each lot record.
- **Actions:**
  - Confirm each lot in `lots[]` has `purchasePrice.priceGroup` populated in the submission payload.
  - FIX: ensure the automation that creates the **per-lot GHL records** writes `lots[i].purchasePrice.priceGroup` into the GHL `price_group` field for that lot record.
  - Confirm the GHL custom field key/API name for `price_group` is correct.

## 7a) Make.com Scenario actions (Projects)
- **[FIX: `price_group` mapping]** In Make.com, update the Project lot-record creation mapping so `price_group` is written from the **lot-level** value (`lots[i].purchasePrice.priceGroup`) rather than the shared/top-level `purchasePrice.priceGroup`.
- **[Note: Project Brief mapping]** `project_brief` / Project Brief is not mapped into GHL in the Make.com scenario (and you’ve decided not to use it).

## 8) Project linking fields: `project_parent_id` / `is_parent_record` / `project_identifier`
- **Goal:** Understand how these 3 fields are populated and how they’re used to link Project parent ↔ lot/unit child records in GHL.
- **Things to check:**
  - Whether these fields exist anywhere in the form payload (`payload.formData.*`) or are created only inside Make.com.
  - Which record is supposed to be the “parent” in GHL:
    - Project record as parent (single record holding shared info)
    - Each lot/unit as separate records (children)
  - Data types/values expected:
    - `is_parent_record` should likely be a boolean/flag
    - `project_parent_id` likely stores a GHL record ID
    - `project_identifier` likely stores a shared identifier across parent + children
- **Actions:**
  - Confirm in Make.com scenario where each field is set (which module) and under what conditions (Projects only?).
  - Confirm which value is used for `project_identifier` (e.g. parent record ID, project name, folder name, address-derived key).
  - Confirm if child records are created/updated in Make.com and how `project_parent_id` is assigned.

## Open items to confirm in Dev
- **[GHL mapping]** Which GHL fields are actually populated from `formData.address.projectAddress` and `formData.address.projectName`?
- **[Email template usage]** Which template fields are used for “Project Address” and “Project Brief” in the email?
- **[Project lots]** Are `lots[]` sent as-is and does Make.com handle them properly (create child records / notes / etc)?
