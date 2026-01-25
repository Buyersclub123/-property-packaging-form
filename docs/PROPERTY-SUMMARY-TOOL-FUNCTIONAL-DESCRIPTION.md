# Property Summary Tool — Functional Description Document

**Source:** ChatGPT  
**Date:** 2025-01-15  
**Purpose:** Functional description of the Property Summary Tool (PST) for integration reference

---

## 1. Purpose of the Tool

The Property Summary Tool (PST) provides a consolidated, read-only summary of a residential property by aggregating and analysing multiple internal and third-party data sources.

The tool is designed to support decision-making and presentation use cases by returning a normalized snapshot of a property's key characteristics, market indicators, and derived estimates at the time of request.

The tool does not accept user-defined rules or logic. All calculations, assumptions, and eligibility checks are handled internally by the service.

---

## 2. What the Tool Does (High-Level)

When invoked with a valid property identifier, the Property Summary Tool:

- Identifies the target property
- Validates that sufficient data exists to generate a summary
- Aggregates relevant property, market, and historical datasets
- Applies internal business logic and models
- Returns a structured summary suitable for downstream systems

The output represents the current best available summary at the time of execution.

---

## 3. Inputs the Tool Accepts

The tool requires one primary property identifier and may accept optional flags that influence presentation (not logic).

### Required Input

One of the following identifiers (exact type defined by the API contract):

- Internal property ID
- Listing ID
- Structured address
- Other canonical property identifier

If the identifier cannot be resolved to a unique property, the request fails.

### Optional Inputs (Non-Logical)

Optional inputs may include flags such as:

- Include or exclude comparable sales
- Include or exclude rental indicators
- Currency or regional formatting preferences

These inputs do not change underlying calculations. They only affect what sections are returned in the response.

---

## 4. What the Tool Produces (Outputs)

The Property Summary Tool returns a single, self-contained summary object.

At a minimum, the output includes:

### Property Identification

- Canonical property ID
- Normalized address components
- Geographic context (e.g., suburb, region)

### Property Characteristics

- Dwelling type (where available)
- Core physical attributes (bedrooms, bathrooms, land size, etc., where available)
- Data completeness indicators

### Market Summary

- Estimated value indicators (if available)
- Rental indicators (if available)
- Confidence or quality signals associated with estimates

### Comparable Indicators

- Presence or absence of relevant comparable data
- Summary-level signals (not raw datasets unless explicitly enabled)

### Metadata

- Timestamp of generation
- Source attribution
- Summary version or model version identifier

The tool does not return raw source datasets unless explicitly configured to do so.

---

## 5. What the Tool Does Not Do

The Property Summary Tool explicitly does not:

- Accept custom valuation rules
- Accept custom weighting or scoring logic
- Guarantee identical outputs across different points in time
- Perform write or mutation operations
- Act on behalf of a specific human user unless delegated authentication is used
- Expose internal model formulas or proprietary algorithms

The tool is strictly read-only and deterministic per execution context.

---

## 6. Error and Edge-Case Behaviour

The tool may return structured errors in the following cases:

- Property identifier cannot be resolved
- Insufficient data exists to generate a summary
- The caller is not authorized to access the property
- Rate limits are exceeded
- An upstream dependency is unavailable

In all cases, the response clearly indicates:

- Whether the request succeeded
- The reason for failure
- Whether retrying may succeed

---

## 7. Parity With User Experience

When called programmatically, the Property Summary Tool:

- Executes the same backend logic used by the user interface
- Applies the same validation and eligibility rules
- Produces results consistent with what a user would see, given the same context and timing

Differences may occur due to:

- Timing (data updates)
- Identifier resolution method
- Authorization scope

No additional business logic is required or expected from calling systems.

---

## 8. Intended Use in Automation (Make.com)

When integrated with Make.com or other automation platforms, the tool is intended to:

- Act as a single source of truth for property summary data
- Provide a stable, normalized payload for downstream workflows
- Be invoked synchronously as part of larger automations

Calling systems should treat the output as authoritative and should not attempt to reinterpret or recompute results.

---

## 9. Responsibility Boundaries

| Responsibility | Owner |
|----------------|-------|
| Data sourcing | Property Summary Tool |
| Business rules | Property Summary Tool |
| Calculations & models | Property Summary Tool |
| API invocation | Integration layer |
| Error handling & retries | Integration layer |
| Workflow orchestration | Make.com |

---

## 10. Summary Statement (for Cursor)

The Property Summary Tool is a read-only service that returns a consolidated, authoritative summary of a property based on internal rules and data.

Integrations are responsible only for invoking the service correctly and handling its structured response. No business logic is to be recreated or inferred externally.

---

**Document Created:** 2025-01-15  
**Status:** Reference document for Property Summary Tool integration
