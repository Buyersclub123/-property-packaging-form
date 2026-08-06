# Deal Sheet — User Guide

## Overview

The Deal Sheet is a live property records dashboard that displays data from GHL (GoHighLevel). It auto-refreshes every 15 seconds and supports filtering, sorting, custom views, column management, and CSV export.

---

## Header Bar

The header bar runs across the top of the sheet. From left to right:

### Live Records

- **All*** — Shows all Available (01) and EOI (02) records. This is the default view on load.
- **Available** — Shows only 01 Available records (with Packager Approved).
- **EOI** — Shows only 02 EOI records.

### Housekeeping

- **Awaiting Packager** — Records where Packager Approved is not yet "Approved".
- **Awaiting QA** — Records where Packager is Approved but QA Approved is not yet "Approved".

### Clear Filters

Resets all filters, quick filters, and ID search back to default (All Available + EOI). The button turns amber when any filter is active.

### Other Records

A dropdown to load records with other statuses (not loaded by default to keep the sheet fast):

- **All** — Every record regardless of status
- **Exchanged Contract** — Status 03
- **Remove No Interest** — Status 05
- **Remove Lost** — Status 06
- **Test Records** — Status 07

### Export

- **Export Filtered** — Exports only the currently visible/filtered records to CSV.
- **Export All** — Exports all loaded records to CSV.

### Views

See the [Views](#views) section below.

### Columns

See the [Column Management](#column-management) section below.

### New (Xh)

Highlights recently created records with a green left border.

- Click to open the dropdown and select a time window: **24h, 36h, 48h, or 72h**.
- **Reset** — Clears the new records filter.

### Other Controls

- **Refresh** — Manually re-fetches data from GHL.
- **Dark/Light** — Toggles between dark and light themes.
- **Row height slider** — Adjusts the maximum height of table cells.
- **Record count** — Shows how many records are currently displayed.

---

## Filtering

### Quick Filters (Header Buttons)

The buttons described above (All, Available, EOI, Awaiting Packager, Awaiting QA) are quick filters. Only one can be active at a time.

### Column Filters

Each column header has a small **filter triangle (▼)** on the right side. Click it to open a dropdown of all unique values in that column.

- Select a value to filter the sheet to only show rows matching that value.
- The filter is a text-match filter — it shows rows where that column contains the selected value.

### ID Search

There is a search box (magnifying glass icon) that lets you search by Record ID.

### Combining Filters

You can combine:
- A quick filter (e.g. "Awaiting QA")
- Column filters on one or more columns
- ID search

All filters are AND-based — a record must match all active filters to be shown.

### Clearing Filters

- Click **Clear Filters** to reset everything.
- Click a different quick filter button to switch.
- Click outside a filter dropdown to close it.

---

## Sorting

Click any column header to sort by that column. Click again to reverse the sort direction. The current sort column shows an arrow (▲/▼) in the header.

---

## Views

Views save your current layout so you can switch between different configurations quickly.

### Preset Views

Three built-in views are always available:

1. **Default (All Columns)** — All 30 columns, sorted by Type > Status > Price Group.
2. **BA View (Key Info)** — 10 key columns: Status, Property Address, Asking, Price Group, BA Message, CONFIG, Appraised Rent, Land, Packager Approved, QA Approved.
3. **Closing View** — 9 columns focused on deal closing: Status, Address, Asking, Closing BA, Close Price, Client, Close Date, Packager, Sourcer. Sorted by Close Date (newest first).

### Custom Views (My Views)

You can save your own views:

1. Set up the sheet exactly how you want it — choose your columns, set filters, sort order.
2. Click **Views**.
3. Type a name in the text box at the bottom.
4. Click **Save**.

Your custom view saves:
- Which columns are visible (and their order/widths)
- The active quick filter
- Any column filters
- Sort column and direction

To load a saved view, click **Views** and click the view name.

To delete a custom view, click the **x** next to it.

**Reset to Default** restores the Default (All Columns) view and clears all filters.

### Important Notes

- Custom views are stored in your **browser's local storage**. They are private to you and your browser.
- Other users will not see your custom views.
- Clearing your browser data will remove saved views.
- Preset views are always available and cannot be deleted.

---

## Column Management

### Columns Button

Click **Columns** to open a checkbox panel listing all available columns.

- **Uncheck** a column to hide it from the table.
- **Check** a column to show it again (it will be inserted back in its default position).
- **Show All** at the bottom restores all columns.

Column changes are reflected immediately. You can then save this configuration as a custom view.

### Drag to Reorder

You can drag column headers left/right to reorder them. Grab a column header and drag it to a new position.

### Resize Columns

Hover over the right edge of a column header until the cursor changes to a resize handle. Click and drag to adjust the column width.

---

## Cell Content

### Height Limit

Table cells have a maximum height to keep the sheet compact. If a cell contains long text (e.g. a BA Message), it will be clipped.

### Expand on Click

Click on any cell with long text (more than 30 characters) to see the full content in a popup. Click the **✕** button or click anywhere else to close it.

### Tooltips

Hover over any cell to see its full content in a browser tooltip.

---

## Status Changes

You can change a record's status directly from the deal sheet:

1. Click the **status cell** for the record you want to change.
2. A dropdown appears with available statuses.
3. Select the new status — it updates in GHL immediately.

The sheet will reflect the change on the next auto-refresh (within 15 seconds).

---

## PDF Column

The **PDF** column shows a link icon for records that have a generated PDF snapshot. Click the icon to open the PDF in a new tab.

---

## Color Coding

Records are color-coded by status:

| Status | Color |
|--------|-------|
| 01 Available | Green |
| 02 EOI | Yellow |
| 03 Contract Exchanged | Blue |
| 05 Remove No Interest | Grey |
| 06 Remove Lost | Dark Grey |
| 07 Test Record | Light Grey |

Additional color coding:
- **TBC fields** — Pink background with black text, indicating the value needs confirmation.
- **New records** — Green left border (when New filter is active).

---

## Themes

Toggle between **Dark** and **Light** mode using the theme button in the header. Your preference is saved in your browser.

---

## Auto-Refresh

The deal sheet polls for changes every 15 seconds. A green "synced" message appears briefly when new data is detected. You can also click **Refresh** to manually re-fetch.

---

## Export

Two export options are available via the **Export** dropdown:

- **Export Filtered** — Exports only the rows currently visible after all filters are applied. The count is shown in brackets.
- **Export All** — Exports every loaded record regardless of filters.

Both export as CSV files that open in Excel or Google Sheets.
