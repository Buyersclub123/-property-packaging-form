# Property Review System - Make.com & GHL Integration

## Project Overview

This project implements an automated property review workflow that connects GoHighLevel (GHL) property packaging with Make.com automation and a client-facing portal.

## Current Flow

1. **Property Packaging**: Property packaged in GHL → webhook to Make.com → email to packager
2. **Packager Review**: Packager reviews and approves/rejects
3. **BA Review**: BA receives email, reviews, and selects clients via portal
4. **Client Emails**: Selected clients receive property opportunity emails

## Architecture

### Make.com Scenario Flow

```
Webhook (1) 
  → Get Record (13) 
  → Make Code (6) [Preprocess webhook data]
  → Make Code (3) [Email template builder]
  → Make Code (7) [Extract clean HTML]
  → Router
    ├─ Path 1: EMAIL TO PACKAGER (packager_approved != Approved)
    ├─ Path 2: EMAIL TO BA (packager_approved == Approved && ba_approved != Approved)
    ├─ Path 3: TEST PATH (both approved)
    └─ Path 4: CLIENTS EMAILS (packager_approved == Approved && source == portal)
```

### Components

1. **Webhook Handler** - Receives GHL property submissions
2. **Get Record Module** - Fetches GHL property data
3. **Email Template Builder** - Generates HTML/text emails with approval buttons
   - **Documentation:** `docs/EMAIL-TEMPLATE-FORMATTING-STRUCTURE.md` ⚠️ **IMPORTANT REFERENCE**
   - **Code:** `code/MODULE-3-COMPLETE-FOR-MAKE.js`
4. **Router** - Routes emails based on approval status
5. **Portal** - BA client selection interface (hosted on GitHub)

## Configuration

### GHL API Credentials
- **Bearer Token**: `pit-d375efb5-f445-458d-af06-3cbbb4b331dd`
- **API Version**: `2021-07-28`
- **Object ID**: `692d04e3662599ed0c29edfa`

### Webhooks
- **Module 1 Webhook**: `https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl`
- **Approval Webhook**: `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`
- **Portal URL**: `https://buyersclub123.github.io/property-portal`

### Google Sheets
- **Sheet ID**: `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- **Opportunities Tab**: `Opportunities`
- **Generic Messages Tab**: `Generic BA messages`

### Email Addresses (Testing)
- **Packager**: `john.t@buyersclub.com.au`
- **BA Shared Group**: `property@buyersclub.com.au`

## Portal Features

- Filter opportunities by BA (Follower) and Pipeline Stage
- Standard message editor (saved per BA)
- Personalized message per client
- Client selection with checkboxes
- Email validation
- Action buttons:
  - Send to All with Standard Message
  - Action the Above (selected clients)
  - Non-Suitable - Send Back to Packager

## Next Steps & Priorities

### Phase 1: Portal Functionality (Current Priority)
- [x] Portal code structure
- [ ] Complete client selection workflow
- [ ] Email sending from BA's Gmail
- [ ] Testing with multiple clients

### Phase 2: Form Enhancements
- [ ] Stash API integration (planning/overlays)
- [ ] Suburb performance spreadsheet integration
- [ ] Investment highlights spreadsheet integration
- [ ] Google Maps pin drop link
- [ ] ChatGPT integration for "why this property"
- [ ] ChatGPT + Proximity tool integration

### Phase 3: Workflow Improvements
- [ ] Re-edit process (packager → BA)
- [ ] Attachment/link management
- [ ] Hotspotting report integration
- [ ] Cashflow spreadsheet auto-update
- [ ] Missing report popup handling

### Phase 4: Integration & Reporting
- [ ] GoogleSheet Deal Tracker integration
- [ ] Status write-back to GHL
- [ ] Performance & Statistics Reporting
- [ ] Exception management Reporting
- [ ] Real-time opportunity webhook (replace slow pipeline pull)

## File Structure

```
property-review-system/
├── README.md (this file)
├── docs/
│   ├── make-scenario.md (Make.com module details)
│   ├── portal-code.md (Portal HTML/JS code)
│   └── workflow.md (Detailed workflow documentation)
├── code/
│   ├── make-code-module-3.js (Email template builder)
│   ├── make-code-module-6.js (Webhook preprocessor)
│   └── make-code-module-7.js (HTML extractor)
└── portal/
    └── index.html (Portal interface)
```

## Notes

- Portal is hosted on GitHub Pages
- Make.com scenario handles email routing and approvals
- GHL stores property data and records
- Google Sheets stores client opportunities and BA messages
- Testing currently uses `john.t@buyersclub.com.au` for all email paths

## Status

**Current State**: Portal functionality in development
**Last Updated**: [Current Date]
**Chat History**: Preserved in project documentation

