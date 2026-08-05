# Bug Fix: Project Property Description Additional Dialogue Missing from Email

**Date:** 15 July 2026  
**Scenario:** Make.com 02a (GHL Property Review Submitted)  
**Module:** Module 3 (Email Template Builder)

## Issue

When packaging a Project property (multiple lots), the "Property Description Additional Dialogue" field was not appearing in the generated email, despite being populated in GHL.

## Root Cause

Module 3's code has three branches for building the Property Description section:
1. **Projects** — loops through lots
2. **Tri-plus** — summary + per-dwelling breakdown
3. **Normal/Established/H&L** — single property

Branches 2 and 3 both included code to output `property_description_additional_dialogue` after their respective sections. Branch 1 (Projects) did **not** — the lot loop ended without ever reading or outputting this field.

The data was confirmed present:
- GHL record: field populated with value (e.g. "Completion expected Q3 of 2027")
- Module 13 output: field returned in `record.properties.property_description_additional_dialogue`
- Module 3 had access via `v("property_description_additional_dialogue")` — but never called it in the project section

## Fix Applied

Added the following code after the project lot `forEach` loop closes, in **both** the normal and portal email paths:

```javascript
const propDescDialogueProject = v("property_description_additional_dialogue");
if (propDescDialogueProject) {
  const propDescDialogueHtmlProject = normaliseNewlines(propDescDialogueProject)
    .split(/\n+/).map((l) => l.trim()).filter(Boolean).join("<br>");
  propertyDescHtml += `<p>*${propDescDialogueHtmlProject}</p>`;
  propertyDescText += `*${propDescDialogueProject}\n`;
}
```

Portal path uses `vPortal()` and `propertyDescHtmlPortal` / `propertyDescTextPortal` equivalents.

## File

`make-com-scenarios/module-3-current.js` — deployed to Make.com Module 3 on 15 Jul 2026.
