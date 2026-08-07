# Reports Page — Table Criteria Reference

All tables source from `filteredRecords` (all records minus test records if excluded).

## Data Source: `filteredRecords`
- **Base**: All records from API (`/api/deal-sheet?statuses=all`)
- **Filter**: If "Excl. Test" checked, removes records where status starts with `07`

---

## Packager Stats Tab

### Weekly / Monthly / YTD / Lifetime
- **Records**: `filteredRecords` with a valid `reviewDate` and non-empty `packager`
- **Grouping**: By `packager` name
- **Columns**: H&L/Single count, Other count, Total
- **H&L/Single**: `type` field contains "House" or "Land" or "Single" (case-insensitive)
- **Other**: Everything else
- **Period logic**:
  - Weekly: bucketed by ISO week (Monday start), controlled by `weeksToShow` dropdown
  - Monthly: bucketed by calendar month, controlled by `monthsToShow` dropdown
  - YTD: Jan to current month of current year
  - Lifetime: single total across all time

---

## Sourcer Stats Tab

### Weekly / Monthly / YTD / Lifetime
- **Records**: `filteredRecords` with a valid `reviewDate` and non-empty `sourcer`
- **Grouping**: By `sourcer` name
- **Columns**: H&L/Single count, Other count, Total
- **Logic**: Identical to Packager Stats but grouped by `sourcer` instead of `packager`

---

## Team Stats Tab

### Weekly
- **Records**: `filteredRecords` with a valid `reviewDate`
- **Metrics per week**:
  - Properties Reviewed: count of records with valid reviewDate in that week
  - Clients Closed: count where `closingDate` falls in that week AND `clientClosed` is non-empty
  - Cash Back Deals Closed: subset of Clients Closed where `cashbackType` is non-empty and not "n/a"

### Monthly
- **Same metrics** as weekly, bucketed by calendar month

### YTD
- **Same metrics**, one column per month (Jan to current month), current year only

### Lifetime
- **Same metrics**, single total across all records/all time

---

## Conversion Tab

- **Records**: `filteredRecords` (period-filtered for weekly/monthly/YTD)
- **Grouping**: By `packager` name
- **Columns**:
  - EOI / Exchanged (Won): status starts with `02` or `03`
  - Removed Lost: status starts with `06`
  - No Interest: status starts with `05`
  - Total: sum of above three
  - Win %: Won / Total * 100
- **Period filtering**:
  - Weekly: reviewDate within last N weeks
  - Monthly: reviewDate within last N months
  - YTD: reviewDate in current year
  - Lifetime: no date filter

---

## Housekeeping Tab

**Note displayed**: "Only showing records in the status of Available (01)."

### Available Records filter
```
availableRecords = filteredRecords.filter(r => r.status.startsWith('01'))
```

### Awaiting Packager Approval
- **Source**: `availableRecords`
- **Filter**: `packagerApproved` is NOT "approved" (case-insensitive)
- **Columns**: Property, Packager, Review Date, Status

### Awaiting QA Approved > 24hrs
- **Source**: `availableRecords`
- **Filter**:
  1. `packagerApproved` IS "approved" (packager has already approved)
  2. `qaApproved` is NOT "approved" (QA has NOT yet approved — still waiting)
  3. `reviewDate` is more than 24 hours ago
- **Columns**: Property, Packager/Sourcer (toggle), Review Date, Status, Age
- **Note**: Shows records stuck waiting for QA approval after packager already approved

### Status Summary
- **Source**: `availableRecords` (status 01 only)
- **Shows**: Count per status prefix, total

### Day of Week Bar Chart
- **Source**: `filteredRecords` (all records, not just Available)
- **Logic**: Count records by day of week (Mon–Sun) based on `reviewDate`

---

## Heatmap Tab

- **Source**: `filteredRecords` with valid `reviewDate`
- **Day of Week Summary**: Bar chart showing records per day (Mon–Sun)
- **Daily Heatmap**: Grid of dates with color intensity based on record count per day
