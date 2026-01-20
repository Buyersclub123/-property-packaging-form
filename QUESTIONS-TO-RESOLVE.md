# Questions to Resolve - Property Review System Enhancements

**Date:** 2025-01-15  
**Purpose:** Centralized list of questions that need answers before implementation  
**Status:** Answers will be provided when we start each activity

---

## 📋 Project Email Formatting

**Status:** ⏸️ **Will be answered when we start this activity**

### Q1: How many lots should be shown per email?
- [ ] Show all lots in a single email (no pagination)
- [ ] Paginate lots (e.g., 5 lots per email, with "View More" link)
- [ ] Other: _________________________

### Q2: Should project emails have different structure than standard emails?
- [ ] Yes - completely different structure (e.g., project overview first, then lots)
- [ ] No - similar structure but with lot sections
- [ ] Other: _________________________

### Q3: How to display shared vs. lot-specific data visually?
- [ ] Shared data at top (Project Brief, Sales Assessment), then individual lot sections
- [ ] Each lot section includes both shared and lot-specific data
- [ ] Other: _________________________

**Additional Notes:**
- What should the email header show? (Project name? Estate address? Both?)
- Should there be a project summary section before individual lots?
- How should lot sections be visually separated? (dividers? cards? tables?)

---

## 📝 Form Edit Access

**Status:** ⏸️ **Will be answered when we start this activity**

### Q4: Who can edit properties?
- [ ] Packager only (original creator)
- [ ] BA only (after approval)
- [ ] Both Packager and BA
- [ ] Other: _________________________

### Q5: Should edits require re-approval?
- [ ] Yes - any edit requires re-approval from packager/BA
- [ ] No - edits can be saved without re-approval
- [ ] Depends on what was edited (major changes require approval, minor don't)
- [ ] Other: _________________________

### Q6: Should edit history be tracked?
- [ ] Yes - track who edited what and when
- [ ] No - no history tracking needed
- [ ] Optional - can be added later
- [ ] Other: _________________________

**Additional Notes:**
- Should there be a "View History" button to see what changed?
- Should edits be locked once property is sent to clients?
- Can properties be edited after they've been sent to clients?

---

## 📊 Deal Sheet

**Status:** ⏸️ **Will be answered when we start this activity**

### Q7: Which implementation approach?
- [ ] **Option A:** Google Sheets Deal Sheet
  - Create new Google Sheet tab
  - Use Make.com to sync GHL data to Sheet
  - Use Google Apps Script for actions (buttons)
  - Pros: Familiar interface, easy filtering/sorting
  - Cons: Not real-time, requires sync automation

- [ ] **Option B:** Custom Portal/Web App
  - Build dedicated Deal Sheet view in portal or new app
  - Direct API connection to GHL
  - Real-time data
  - Pros: Real-time, more flexible
  - Cons: Requires development, separate app to maintain

- [ ] **Option C:** Enhance Existing Portal
  - Add "Deal Sheet" view to existing portal
  - List all properties with actions
  - Pros: Single app, consistent UI
  - Cons: Portal may become cluttered

- [ ] Other: _________________________

### Q8: Real-time or periodic sync?
- [ ] Real-time (data updates immediately when property changes)
- [ ] Periodic sync (e.g., every 15 minutes, hourly, daily)
- [ ] Manual refresh button
- [ ] Other: _________________________

### Q9: What columns/fields to display in Deal Sheet?
**Suggested columns (please confirm or modify):**
- [ ] Property Address
- [ ] Property Type (New/Established)
- [ ] Deal Type (H&L, SMSF, etc.)
- [ ] Status (Available, Sent, Needs Editing, etc.)
- [ ] Date Created
- [ ] Packager Name
- [ ] BA Name (Follower)
- [ ] Number of Clients Sent To
- [ ] Last Sent Date
- [ ] Other: _________________________

**Additional Notes:**
- Should Deal Sheet show all properties or filter by BA?
- Should there be default filters (e.g., "Show only Available")?
- What actions should be available per row? (View, Edit, Send to Clients, etc.)

---

## 📧 Send Tracking & Logging

**Status:** ⏸️ **Will be answered when we start this activity**

### Q10: Which storage option for send logs?
- [ ] **Option A:** GHL Custom Object field (`clients_sent_to` JSON array)
  - Store as JSON array in existing property record
  - Pros: All data in one place, easy to query
  - Cons: JSON array may become large, harder to query/search

- [ ] **Option B:** Separate GHL Custom Object (`property_send_log`)
  - Create new custom object for send logs
  - One record per send event
  - Pros: Easy to query, scalable, can track multiple sends
  - Cons: Separate object to maintain

- [ ] **Option C:** Google Sheets (new tab: "Send Log")
  - Sync send data to Google Sheet
  - Pros: Easy to view/export, familiar interface
  - Cons: Not real-time, requires sync automation

- [ ] **Option D:** Database (if available)
  - Store in dedicated database
  - Pros: Most flexible, best for queries
  - Cons: Requires database setup/maintenance

- [ ] Other: _________________________

### Q11: Should we track multiple sends to same client?
- [ ] Yes - each send creates a separate log entry (recommended for audit trail)
- [ ] No - only track first send, update timestamp on re-send
- [ ] Other: _________________________

### Q12: Should we track send status per BA?
- [ ] Yes - track which BA sent to which client (recommended for audit trail)
- [ ] No - only track that property was sent, not who sent it
- [ ] Other: _________________________

**Additional Notes:**
- What metadata should be logged? (timestamp, message type, source, etc.)
- Should logs be searchable/filterable? (by property, client, BA, date range)
- Should there be a log viewing interface? (portal, Deal Sheet, separate page?)

---

## 🎨 Portal Client Status Display

**Status:** ⏸️ **Will be answered when we start this activity**

### Q13: Exact UI design for "Sent" indicator?
**Options:**
- [ ] Badge/icon next to client name (e.g., green checkmark, "Sent" badge)
- [ ] Highlighted row background (e.g., light green/grey background)
- [ ] Text indicator (e.g., "Sent on [Date] by [BA Name]")
- [ ] Combination of above
- [ ] Other: _________________________

**Visual Examples:**
- Badge: `[✓ Sent]` or `[Sent on Jan 15]`
- Highlight: Entire row has light grey/green background
- Text: `"Already sent to this client on January 15, 2025 by John Smith"`

### Q14: Should re-send create new log entry or update existing?
- [ ] Create new log entry (recommended - full audit trail)
- [ ] Update existing entry (update timestamp, keep original date)
- [ ] Other: _________________________

**Additional Notes:**
- Should re-send confirmation show previous send details? (date, BA, message type)
- Should there be a limit on how many times a property can be re-sent to same client?
- Should re-sends be visually distinguished from first sends in the log?

---

## 🔄 Workflow & Process Questions

**Status:** ⏸️ **Will be answered when we start this activity**

### Q15: Email Button - "Edit Property" placement
- [ ] Add alongside existing buttons ("Review Suitable Clients", "Needs Editing")
- [ ] Replace "Needs Editing" button with "Edit Property"
- [ ] Add as third option in dropdown menu
- [ ] Other: _________________________

### Q16: Deal Sheet - Access control
- [ ] All BAs can see all properties
- [ ] BAs only see properties they're assigned to (Follower)
- [ ] Packagers see all properties, BAs see only assigned
- [ ] Other: _________________________

### Q17: Form Edit - When can properties be edited?
- [ ] Anytime (even after sent to clients)
- [ ] Only before first send to clients
- [ ] Only by original creator (packager)
- [ ] Other: _________________________

---

## 📝 Additional Questions

**Status:** 🔜 **Priority: Will be looked at first after current work (proximity tool) is complete**

### Q18: Any other requirements or considerations?
_Please add any additional questions, concerns, or requirements here:_

- 
- 
- 

---

## ✅ Answer Format

**To answer these questions:**
1. Review each question
2. Check the box(es) for your preferred option(s)
3. Fill in "Other" fields if you have a different preference
4. Add notes in "Additional Notes" sections where relevant
5. Save this document and let me know when ready

**Or:** Simply tell me your answers verbally and I'll update this document.

---

**Document Created:** 2025-01-15  
**Last Updated:** 2025-01-15  
**Status:** Answers will be provided when we start each activity. Additional Questions section is priority after current work (proximity tool) is complete.
