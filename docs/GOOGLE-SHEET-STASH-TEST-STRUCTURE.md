# Google Sheet Structure for Stash API Testing

## Sheet Name
**"Stash API Test Results"** (or add tab to existing "Property Review Static Data - Market Performance" sheet)

## Purpose
Capture and analyze Stash Property API responses to:
1. Document all available fields
2. Map LGA format
3. Verify coordinate format
4. Identify other useful data for future use

---

## Column Structure

### Basic Info
| Column | Description | Example |
|--------|-------------|---------|
| **Timestamp** | When test was run | 2025-01-15 10:30:00 |
| **Test Address** | Address used for test | 4 Osborne Circuit Maroochydore QLD 4558 |
| **Response Status** | HTTP status code | 200 |
| **Error Message** | Error if any | (blank if success) |

### Coordinates (from Module 9)
| Column | Description | Example |
|--------|-------------|---------|
| **Latitude** | Latitude coordinate | -26.6543 |
| **Longitude** | Longitude coordinate | 153.0892 |
| **Coordinates Array** | Full coordinates array | [-26.6543, 153.0892] |

### Zoning (from Module 7)
| Column | Description | Example |
|--------|-------------|---------|
| **Zone Code** | Zoning code | R2 |
| **Zone Description** | Zoning description | Low Density Residential |
| **Zoning Full** | Combined format | R2 (Low Density Residential) |

### Location (from Module 7)
| Column | Description | Example |
|--------|-------------|---------|
| **LGA** | Local Government Area | Sunshine Coast Regional Council |
| **LGA PID** | LGA Property ID | (if available) |
| **State** | State code | QLD |

### Risk Overlays (from Module 7)
| Column | Description | Example |
|--------|-------------|---------|
| **Flood Risk** | Yes/No | Yes |
| **Flood Risk Value** | Numeric value | 1 |
| **Flood Text** | Flood description text | (if available) |
| **Bushfire Risk** | Yes/No | No |
| **Bushfire Risk Value** | Numeric value | 0 |
| **Bushfire Text** | Bushfire description text | (if available) |
| **Heritage Risk** | Yes/No | No |
| **Heritage Risk Value** | Numeric value | 0 |
| **Heritage Text** | Heritage description text | (if available) |
| **Biodiversity Risk** | Yes/No | No |
| **Biodiversity Risk Value** | Numeric value | 0 |
| **Biodiversity Text** | Biodiversity description text | (if available) |

### Lot Size (from Module 7)
| Column | Description | Example |
|--------|-------------|---------|
| **Lot Size Min** | Minimum lot size | 400m² |
| **Lot Size Avg** | Average lot size | 600m² |

### Planning Links (from Module 7)
| Column | Description | Example |
|--------|-------------|---------|
| **Planning Link 1** | First planning link | Title - URL |
| **Planning Link 2** | Second planning link | Title - URL |
| **Planning Links Count** | Number of links | 2 |

### Raw Data (for analysis)
| Column | Description | Notes |
|--------|-------------|-------|
| **Raw Stash Data** | Full JSON response | Store as JSON string or link |
| **Raw Hazards** | Hazards object | Store as JSON string |
| **Raw Sources** | Sources array | Store as JSON string |
| **Other Fields** | Any other fields found | Document for future use |

---

## How to Use

1. **Run Test:** Call webhook with test address
2. **Capture Response:** Copy full JSON response
3. **Parse Data:** Extract fields into columns
4. **Document:** Note any unexpected fields or formats
5. **Analyze:** Compare LGA format with Google Sheet "Investment Highlights" tab

---

## Analysis Questions

After capturing test data, answer:

1. **LGA Format:**
   - What exact format is returned? (e.g., "Sunshine Coast Regional Council")
   - Does it match Google Sheet format?
   - Do we need to normalize/transform it?

2. **Coordinates:**
   - What precision? (decimal places)
   - Format consistent?
   - Can we use for GeoScape property name lookup?

3. **Other Available Data:**
   - What other fields are in `rawStashData`?
   - What other fields are in `rawHazards`?
   - What other fields are in `rawSources`?
   - Any fields useful for future features?

4. **Error Scenarios:**
   - What happens with invalid address?
   - What happens if API fails?
   - What error format is returned?

---

## Next Steps

1. Create Google Sheet with this structure
2. Run test with address: "4 Osborne Circuit Maroochydore QLD 4558"
3. Capture full response (may need to check Make.com execution logs)
4. Populate sheet with data
5. Analyze and document findings
6. Update Module 7 to include coordinates if needed
7. Map LGA format for Investment Highlights lookup







