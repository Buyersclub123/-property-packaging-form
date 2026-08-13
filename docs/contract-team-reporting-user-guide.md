# Contract Team Reporting Tool — User Guide

URL: `https://property-packaging-form.vercel.app/contract-team-reporting`

## The basics

- **Login**: enter your individual `@buyersclub.com.au` email the first time. Shared inboxes are not allowed.
- **Views**: the **View** dropdown (top right) switches between reports, grouped into *Standard*, *Custom* and *Exception* sections. The grey line under the header always explains exactly what the current view includes (pipelines, stages excluded, filters).
- **B&P view**: the quick-filter buttons (Blank P-type, No B&P Date, etc.) only appear on this view.
- **Filters**: every column has an Excel-style ▼ Filter (tick/untick values, search, "Only", "Clear"). **Clear Filters** resets them all.
- **Sorting**: click a column header. Click again to reverse, a third time to clear.
- **Cell popup**: click any cell with longer text to see the full value with a **Copy** button.
- **Row highlight**: click a row to highlight it; click again to un-highlight.
- **Export**: exports the current filtered view (or everything) to CSV.
- **Settings (⚙)**: row height, GHL schema status, who you're logged in as.
- **Column source tags**: the tiny blue `opp` / green `co` in each column header shows whether the field comes from the Opportunity or the Property Review custom object.

## Editing data (writes back to GHL)

1. **Shift + double-click the logo** to reveal the Edit Mode button.
2. Click **Edit Mode**, then tick the row you want to edit.
3. Fields render exactly as GHL has them: dropdowns, tick boxes, date pickers, text.
4. Click **Save** — the change writes straight to GHL.
5. **Multi-edit**: while in Edit Mode, Shift+double-click the Edit Mode button to toggle multi-row editing, then Save All.

Notes:
- Grey columns are read-only everywhere (Pipeline, Opportunity Name, Owner, Assigned BA, etc.).
- Custom object (`co`) fields are currently read-only.
- After you save, the screen keeps showing your saved value even if GHL is slow to catch up — the write has gone through.

## Building and saving your own views

1. **Shift + double-click the ⚙ Settings button** to reveal the **View Builder**.
2. Start from any view, then open **View Builder ▼**. Everything lives in one panel:
   - **1. Report columns** — tick/untick fields (grouped: Opportunity / Custom Object / Other). Searchable.
   - **2. Pipelines & stages** — ticking a pipeline ticks all its stages; untick the ones you don't want. Nothing ticked = everything.
   - **3. Column colours & end states** — click a column, pick a colour, and tick which values turn the cell green.
   - **4. Save** — enter a name, choose the section (Standard/Custom/Exception) and Personal vs Public, then either:
     - **+ Save as NEW view** — creates a new view, or
     - **Update "current view"** — overwrites the view you started from (built-in views can't be overwritten).
3. An amber **●** next to the View name means your current layout has unsaved changes.
4. **Personal** views live only in your browser. **Public** views are shared with everyone.
5. **Delete a view**: open the View dropdown (with builder revealed) and click the red ✕ next to it.
6. **Reorder views**: drag the ⠿ handle in the View dropdown.

You can also drag column headers to reorder and drag their right edge to resize — widths are saved with the view.

## Automatic behaviours

- **Data refresh**: every 60 seconds while you're using the page. Pauses when the tab is hidden or you've been inactive for 30 minutes (an amber note appears — just move the mouse to resume with fresh data).
- **GHL schema sync**: every hour the tool pulls the latest field definitions from GHL, so new dropdown values appear automatically without a code change.
- **Alert emails** (to John T & Julie L): sent if data fails to load from GHL, if a save is rejected, or if brand-new fields are created in GHL that the tool doesn't know yet. Each email explains why it was sent and what to check. Max one per issue type per hour.
