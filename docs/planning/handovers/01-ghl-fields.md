# Handover: Activity 1 — GHL Field Creation

## What to do
Create two new custom object fields in GHL (GoHighLevel) on the Property Review custom object.

## Fields to create

### 1. `dwelling_type` (Dropdown) ✅ CREATED
- **Display name**: Dwelling Type
- **Field type**: Dropdown (Single)
- **Unique key**: `custom_objects.property_reviews.dwelling_type`
- **Option keys**: `unit`, `townhouse`, `villa`, `house`, `dualkey`, `duplex`, `multidwelling`, `block_of_units`
- **Values** (in this order):
  - Unit (`unit`)
  - Townhouse (`townhouse`)
  - Villa (`villa`)
  - House (`house`)
  - Dual-key (`dualkey`)
  - Duplex (`duplex`)
  - Multi-dwelling (`multidwelling`)
  - Block of Units (`block_of_units`)

### 2. `subject_line` (Text) ✅ CREATED
- **Display name**: Subject Line
- **Field type**: Single Line text
- **Unique key**: `custom_objects.property_reviews.subject_line`
- **Purpose**: Stores the computed email subject line (without the prefix). Editable by humans in GHL.
- **Example values**:
  - `Property Review: 29 GEORGE AVENUE, WHYALLA NORRIE, SA 5608`
  - `Property Review (H&L 6-bed Duplex): LOT 41 JIBBON WAY, YANCHEP, WA 6035`

## Notes
- This is a manual GHL configuration task, not a code change.
- These fields must exist before any of the code changes (Activities 2–8) can be tested end-to-end.
- Record the exact GHL internal field keys after creation — the API routes need to reference them.

## Plan doc
After reviewing this handover, create your plan at: `docs/planning/agent-plans/01-ghl-fields-plan.md`
