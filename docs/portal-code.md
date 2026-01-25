# Portal Code Documentation

## Overview

The Buyers Agent Property Review Portal is a single-page HTML application hosted on GitHub Pages that allows BAs to:
- View property opportunities
- Filter clients by BA (Follower) and Pipeline Stage
- Compose standard and personalized messages
- Select clients and send property opportunity emails

## Location

- **GitHub Repository**: `buyersclub123/property-portal`
- **Live URL**: `https://buyersclub123.github.io/property-portal`

## Configuration

### Google Sheets Integration
- **Sheet ID**: `1nR0upQ4eV4iiw-dY1FCVMP0cNzc3GElZUVZU4WcTf3Q`
- **Opportunities Tab**: `Opportunities`
- **Generic Messages Tab**: `Generic BA messages`
- **CORS Proxy**: `https://api.allorigins.win/raw?url=`

### Webhooks
- **Module 1 Webhook**: `https://hook.eu1.make.com/YOUR_MODULE_1_WEBHOOK_URL` (needs update)
- **Non-Suitable Webhook**: `https://hook.eu1.make.com/q85flukqhepku5rudd6bc1qbl9mqtlxk`

## Features

### 1. Property Information Display
- Shows property address from URL parameters
- Displays property summary

### 2. Standard Message Editor
- Textarea for BA's standard client message
- Auto-saves to localStorage per BA
- Loads from Google Sheet if available
- Tip about formatting preservation

### 3. Filtering System
- **BA Filter**: Multi-select dropdown with checkboxes
- **Pipeline Stage Filter**: Multi-select dropdown with checkboxes
- Selected filters shown as tags
- Reset buttons for individual filters
- "Reset All Filters" button
- Filter count display

### 4. Opportunities Table
Columns:
- Checkbox (select/deselect)
- Opportunity Name
- Pipeline Stage
- Client Name (editable)
- Partner Name (editable)
- Main Contact and Partner Emails (editable textarea)
- Message Type dropdown (Standard/Personalised)
- Personalized Message textarea (shown when Personalised selected)

### 5. Action Buttons
- **Send to All with Standard Message**: Sends standard message to all selected clients
- **Action the Above**: Sends personalized messages to selected clients
- **Non-Suitable**: Marks property as non-suitable and sends back to packager

## URL Parameters

- `recordId`: GHL record ID
- `propertyId`: Property identifier
- `propertyAddress`: Property address for display
- `baEmail`: BA email address (for message saving)

## Data Flow

1. **Load Opportunities**: Fetches from Google Sheet Opportunities tab
2. **Load Generic Message**: Fetches from Google Sheet Generic BA messages tab (if BA email matches)
3. **Filter Opportunities**: Filters by selected BA and Pipeline Stage
4. **Collect Selections**: Gathers selected clients with their messages
5. **Send Emails**: POSTs to Module 1 webhook with client selection data
6. **Track Sends**: Logs email sends for reporting

## Key Functions

### `loadOpportunities()`
- Fetches opportunities from Google Sheet
- Parses and formats data
- Populates filter dropdowns
- Renders table

### `applyFilter()`
- Filters opportunities by BA and Pipeline Stage
- Updates filter count
- Loads generic message if single BA selected
- Re-renders table

### `collectSelections()`
- Gathers checked opportunities
- Collects email addresses
- Collects message types and content
- Returns array of selected clients

### `sendEmailsToClients()`
- Validates selections
- Formats payload
- POSTs to webhook
- Shows success/error messages
- Tracks sends

### `saveGenericMessage()`
- Saves message to localStorage
- Keyed by BA email
- Auto-saves on input (2 second delay)

## Storage

### localStorage Keys
- `ba_message_{baEmail}`: Saved generic message per BA
- `pendingTracking`: Failed tracking records (for retry)

## Error Handling

- Shows error messages for:
  - Failed Google Sheet fetch
  - No opportunities found
  - Invalid email addresses
  - Missing personalized messages
  - Webhook failures

## Tracking

- Generates batch ID for each send
- Tracks: property address, BA name, client name, opportunity name, timestamp
- Retries failed tracking requests
- Stores locally if webhook fails

## Code Location

Full portal code is in: `portal/index.html`










