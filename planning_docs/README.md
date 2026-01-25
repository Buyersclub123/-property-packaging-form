# Planning Documents - Property Review System

This folder contains a high-fidelity breakdown of a planning session transcript where detailed requirements and logic were agreed upon for the Property Review System.

**Source Transcript:** `cursor_proximity_tool_handover_review.md` (5076 lines)  
**Export Date:** January 21, 2026  
**Session Focus:** Google Sheets integration, form refactoring, and feature planning

---

## Document Structure

These documents represent a **raw, unedited split** of the planning session, preserving all confirmation blocks where agreements were reached. They are organized chronologically and by topic.

### 📄 Document Index

| # | File | Topic | Lines | Key Content |
|---|------|-------|-------|-------------|
| 01 | [01_initial_proximity_tool_review.md](./01_initial_proximity_tool_review.md) | Proximity Tool Review | 1-200 | Initial handover review, code analysis, test module status |
| 02 | [02_form_architecture_analysis_refactoring.md](./02_form_architecture_analysis_refactoring.md) | Form Architecture | 200-320 | Steps 5 & 6 analysis, refactoring opportunities, field mapping introduction |
| 03 | [03_google_sheets_mapping_core_fields.md](./03_google_sheets_mapping_core_fields.md) | Core Fields Logic | 320-800 | **Field-by-field logic for rows 1-13** with all confirmation blocks |
| 04 | [04_google_sheets_mapping_new_fields.md](./04_google_sheets_mapping_new_fields.md) | New Fields Logic | 800-1700 | **Field-by-field logic for rows 14-27** with all confirmation blocks |
| 05 | [05_address_construction_folder_naming.md](./05_address_construction_folder_naming.md) | Address & Naming | 1700-1900 | Address construction, folder naming, filename restrictions |
| 06 | [06_new_page_flow_ui_structure.md](./06_new_page_flow_ui_structure.md) | Page Flow | 1900-2200 | Steps 6-8 restructuring, Washington Brown integration |
| 07 | [07_step5_proximity_content_requirements.md](./07_step5_proximity_content_requirements.md) | Step 5 Features | 2000-2450 | Proximity automation, AI content, Hotspotting reports |
| 08 | [08_unit_number_bug_fix.md](./08_unit_number_bug_fix.md) | Bug Fix | 1790-4900 | Unit number persistence issue, root cause, solution |
| 09 | [09_final_handover_summary.md](./09_final_handover_summary.md) | Summary | 4900-5076 | Handover document, complete summary, next steps |

---

## Quick Reference Guide

### 🎯 Looking for specific logic?

**Google Sheets Field Mapping:**
- **Core fields (Address, State, Costs, Rent, etc.):** → Document 03
- **New fields (Rates, Insurance, Depreciation, etc.):** → Document 04
- **Mapping method:** Keyword Matching (consistent across all fields)

**Form Structure:**
- **Step 5 refactoring plan:** → Document 02
- **Step 5 feature requirements:** → Document 07
- **Steps 6-8 new flow:** → Document 06

**Address & Naming:**
- **Address construction logic:** → Document 05
- **Folder/file naming:** → Document 05
- **Filename length restrictions:** → Document 05

**Bug Fixes:**
- **Unit number persistence:** → Document 08

**Integration Features:**
- **Proximity tool (auto-run):** → Document 07, Section A
- **AI content generation:** → Document 07, Section B
- **Hotspotting reports:** → Document 07, Section C
- **Washington Brown calculator:** → Document 06

---

## Key Decisions Summary

### Field Mapping Logic

✅ **Mapping Method:** Keyword Matching for all fields (search Column A, write to Column B)  
✅ **GHL Sync:** Most new fields are Form Only (no GHL sync)  
✅ **Insurance Logic:** Based on Title Type, not Body Corp presence  
✅ **Depreciation:** Washington Brown paste & parse functionality  

### Page Flow

✅ **Step 6:** Washington Brown Calculator (paste & parse)  
✅ **Step 7:** Cashflow Review & Folder Creation (separate action)  
✅ **Step 8:** Pre-Submission Checklist & Final Submission  
✅ **Key:** Folder creation happens BEFORE submission (user reviews folder first)  

### Address Construction

✅ **Format:** `Lot [X], Unit [Y], [Street Address]`  
✅ **Order:** Lot first, then Unit, then Street  
✅ **Reuse:** Existing form logic for address display  
✅ **Length Limit:** 250 characters (remove state/postcode if exceeded)  

### Step 5 Features

✅ **Proximity:** Auto-run on page load, editable results, address override option  
✅ **Why This Property:** AI-generated (OpenAI/Gemini), 7 bullet points  
✅ **Investment Highlights:** Google Sheet-based hotspotting reports  
✅ **Fallback:** All features have manual paste option if automation fails  

---

## Confirmation Blocks

Each document includes **confirmation blocks** showing where the user explicitly approved the logic. Look for:

```
**User:** Yes
**Confirmation:** ✅ Approved
```

These blocks indicate finalized decisions that should not be changed without user consultation.

---

## Field Mapping Reference

### Core Fields (Rows 1-13)

| Field | Source | Logic Type | Status |
|-------|--------|------------|--------|
| Address | Page 1 + Page 2 | Lot + Unit + Street | ✅ |
| State | Page 1 | 3-letter code transform | ✅ |
| Land Cost | Page 3 | Conditional (H&L only) | ✅ |
| Build Cost | Page 3 | Conditional (H&L only) | ✅ |
| Total Cost | Page 3 | Use form's Total Price | ✅ |
| Cashback Value | Page 3 | Conditional (Cashback only) | ✅ |
| Total Bed/Bath/Garage | Page 3 | "X + Y" format if dual | ✅ |
| Low/High Rent | Page 3 | Sum if dual occupancy | ✅ |

### New Fields (Rows 14-27)

| Field | Source | Logic Type | GHL Sync | Status |
|-------|--------|------------|----------|--------|
| Council/Water Rates $ | Review Page | Direct input | ❌ No | ✅ |
| Insurance Label | Title Type | Conditional label | ❌ No | ✅ |
| Insurance Value | Title + Body Corp | Complex calculation | ❌ No | ✅ |
| P&B / PCI | Property Type | Conditional text | ❌ No | ✅ |
| Depreciation Y1-Y10 | Washington Brown | Parse & populate | ❌ No | ✅ |
| Build Window | Review Page | Dropdown (09/12/15/18) | ❌ No | ✅ |
| Cashback 1/2 month | Review Page | Dropdown (1-18) | ❌ No | ✅ |

---

## Usage Notes

### For Developers

1. **Read documents in order** (01-09) for full context
2. **Reference specific documents** for detailed logic
3. **Check confirmation blocks** before making changes
4. **All logic is finalized** - no need to re-ask questions

### For Project Managers

1. **Documents 03 & 04** contain all field mapping specifications
2. **Document 06** contains the new page flow structure
3. **Document 07** contains feature requirements for Step 5
4. **Document 09** provides the overall summary

### For QA/Testing

1. **Document 03** lists all core field test cases
2. **Document 04** lists all new field test cases
3. **Document 08** documents the bug fix with test scenarios
4. **All confirmation blocks** represent approved behavior

---

## Important Context

### Why This Format?

The user specifically requested:
> "Create a folder named /planning_docs. Break the transcript into logical sections based on the topics discussed. Save each section as a separate Markdown file within that folder. **Ensure every file includes the exact text from the transcript, specifically including the 'Confirmation Blocks' where I agreed to the agent's summary.** Do not summarize; perform a raw, high-fidelity split."

This format preserves:
- ✅ Exact conversation flow
- ✅ All confirmation blocks
- ✅ User corrections and clarifications
- ✅ Evolution of decisions
- ✅ Context for why decisions were made

### What's NOT Here

- ❌ Code implementation (only logic specifications)
- ❌ UI mockups (only textual descriptions)
- ❌ Test data (only test scenarios)
- ❌ API documentation (only integration requirements)

---

## Next Steps

**For Implementation:**

1. Review all 9 documents in sequence
2. Start with Document 08 (bug fix already implemented)
3. Implement Step 5 refactoring (Document 07)
4. Implement Steps 6-8 (Documents 06)
5. Implement field mapping logic (Documents 03 & 04)
6. Test against confirmation blocks

**For Questions:**

If any logic is unclear, refer back to the specific document section. The confirmation blocks show the exact point where agreement was reached.

---

## Document Statistics

- **Total Documents:** 9
- **Total Transcript Lines:** 5076
- **Confirmation Blocks:** 30+
- **Fields Documented:** 27+
- **Features Specified:** 10+
- **Bug Fixes:** 1 (implemented)

---

**Last Updated:** January 21, 2026  
**Source:** `cursor_proximity_tool_handover_review.md`  
**Status:** Complete - Ready for Implementation
