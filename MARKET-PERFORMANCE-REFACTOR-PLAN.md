# Market Performance Refactor Plan

## Changes to Implement:

1. **Pre-fill input fields** with existing values when data exists
2. **Color-code fields** based on data age:
   - Green (<7 days): `bg-green-50 border-green-300`
   - Amber (7-30 days): `bg-yellow-50 border-yellow-300`
   - Red (>30 days): `bg-red-50 border-red-300`
3. **Add informational messages**:
   - SPI: "Smart Property Investment typically updates its median 3-year and 5-year growth values on or around the first day of each month."
   - REI: "Real Estate Investar updates key suburb data such as vacancy rates, median yield, median rent change, and median price change values on the first day of each month."
4. **Add checkboxes** for "No update needed" next to each source
5. **Single "Save Market Performance Data" button** that can save SPI, REI, or BOTH
6. **Make URL fields optional**
7. **Update save API** to handle `dataSource: 'BOTH'`

## Implementation Steps:
1. Add helper functions for date calculations and color coding ✓
2. Pre-fill form fields when data exists ✓
3. Update input fields with color coding
4. Add informational messages
5. Add checkboxes for "no update needed"
6. Create single save handler
7. Update API to handle BOTH
8. Update UI to show single save button





