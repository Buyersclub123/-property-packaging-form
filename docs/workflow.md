# Workflow Documentation

## Complete Property Review Workflow

### Step 1: Property Packaging (GHL)
1. Packager fills out GHL webform with property details
2. Form submission triggers webhook to Make.com
3. **Future Enhancement**: Two-section form with:
   - Initial section: Enter address → Pull Stash overlay info
   - Review overlays for suitability
   - Review comparable properties (CMI)
   - Confirm packaging → Create folder with cashflow spreadsheet
   - Complete rest of form → Submit

### Step 2: Make.com Processing
1. **Webhook (Module 1)** receives property data
2. **Get Record (Module 13)** fetches full property record from GHL
3. **Make Code (Module 6)** preprocesses data:
   - Handles portal requests vs GHL webhooks
   - Formats data for email template
4. **Make Code (Module 3)** builds email template:
   - Generates HTML email with property details
   - Adds approval buttons
   - Handles both packager and BA email formats
5. **Make Code (Module 7)** extracts clean HTML summary

### Step 3: Packager Review
**Email Sent To**: Packager (currently `john.t@buyersclub.com.au`)

**Email Contains**:
- Property details (all sections)
- Approval buttons:
  - **Approve**: Sets `packager_approved = Approved`
  - **Needs Editing & Resubmitting**: Rejects and sends back

**On Approval**:
- Updates cashflow spreadsheets with figures
- Pulls Hotspotting report link
- Adds attachments section
- Triggers BA email

**On Rejection**:
- **TODO**: Implement editing workflow
- Packager needs ability to edit submitted property
- Suggestion: Edit immediately when "Needs editing" clicked

**Missing Reports Handling**:
- **TODO**: Popup message to packager if:
  - No Hotspotting report available
  - No market performance figures for suburb
- Packager can add to repository

### Step 4: BA Review
**Email Sent To**: `property@buyersclub.com.au` (shared BA group)

**Email Contains**:
- Property details
- Message from packager (if exists)
- Approval buttons:
  - **Review Suitable Clients**: Opens portal
  - **Needs Editing & Resubmitting**: Sends back to packager with notes

**Portal Access**:
- URL: `https://buyersclub123.github.io/property-portal?recordId=...&propertyId=...&propertyAddress=...&baEmail=...`
- BA can:
  - Filter clients by BA (Follower) and Pipeline Stage
  - Edit standard message (saved per BA)
  - Select clients
  - Add personalized messages
  - Send emails

**On "Needs Editing"**:
- **TODO**: Portal view for editing requests
- BA can add notes about what needs changing
- **TODO**: Highlight to other BAs that change requested
- **TODO**: Prevent other BAs from sending (or show warning)
- **TODO**: Notify other BAs when edits complete

### Step 5: Client Selection & Email Sending
**Portal Actions**:

1. **Send to All with Standard Message**:
   - Sends standard message to all selected clients
   - Uses BA's saved generic message

2. **Action the Above**:
   - Sends personalized messages to selected clients
   - Each client can have custom message

3. **Non-Suitable**:
   - Marks property as non-suitable
   - Sends back to packager

**Email Sending**:
- Emails sent from BA's own Gmail account
- Each selected client receives email
- Email contains:
  - BA's message (standard or personalized)
  - Property details
  - Property sections (Why This Property, Address, Description, etc.)

**Tracking**:
- Records who property went to
- Tracks: property address, BA name, client name, opportunity name, timestamp
- Batch ID for grouping sends

### Step 6: Client Receives Email
- Email from BA's Gmail
- Contains property opportunity details
- Formatted HTML email with all property sections

## Approval States

### packager_approved
- `null` or empty: Initial state
- `Approved`: Packager approved
- Other: Rejected/needs editing

### ba_approved
- `null` or empty: Initial state
- `Approved`: BA approved (currently used for testing)
- Other: Rejected/needs editing

**Note**: Once portal is fully functional, `ba_approved` may not be needed as portal handles client selection directly.

## Data Sources

### GoHighLevel (GHL)
- Property records
- Object ID: `692d04e3662599ed0c29edfa`
- Stores all property data fields

### Google Sheets
- **Opportunities Tab**: Client opportunities with pipeline stage, BA follower, emails
- **Generic BA messages Tab**: Saved standard messages per BA

### Make.com
- Workflow automation
- Email routing
- Webhook handling

## Future Enhancements

### Form Auto-Feed
- Stash API integration (planning/overlays)
- Suburb performance spreadsheet
- Investment highlights spreadsheet
- Google Maps pin drop link
- ChatGPT for "why this property"
- ChatGPT + Proximity tool for proximity bullet points

### Workflow Improvements
- Re-edit process (packager → BA with notes)
- Attachment/link management
- Hotspotting report integration
- Cashflow spreadsheet auto-update
- Missing report popup handling

### Integration & Reporting
- GoogleSheet Deal Tracker integration
- Status write-back to GHL
- Performance & Statistics Reporting
- Exception management Reporting
- Real-time opportunity webhook (replace slow pipeline pull)

## Issues to Solve

### Performance
- **Current**: Pull of opportunities by pipeline stage is slow
- **Solution**: Create webhook to track changes in monitored pipeline stages
- **Result**: Real-time view instead of slow pull

### BA Assignment
- **Current**: Filter by Follower field
- **Short-term**: Edit by Follower
- **Long-term**: Add Assigned BA field for pre-filtering

### Email Tracking
- **Current**: Only BA's sent items
- **Need**: System-level tracking of who property went to
- **Solution**: Tracking system implemented in portal










