# Read sheet CSV as raw text and extract all record IDs with their surrounding context
$sheetRaw = Get-Content 'C:\Users\User\property-tool-prod\docs\TO check 2.csv' -Encoding UTF8 -Raw

# Extract ID + status pairs from sheet using the sort key pattern which has the status
# Sort key format: "01 Hl Comms - 01 Available - $500-700k"
# Record IDs are 24 hex chars followed by comma then sort key
$sheetPattern = '([0-9a-f]{24}),([^\r\n]+)'
$sheetMatches = [regex]::Matches($sheetRaw, $sheetPattern)

$sheetData = @{}
foreach ($m in $sheetMatches) {
    $id = $m.Groups[1].Value
    $sortKey = $m.Groups[2].Value
    # Extract status from sort key (e.g. "01 Hl Comms - 01 Available - $500-700k" -> "01 Available")
    if ($sortKey -match '- (0[0-9] [^-]+) -') {
        $status = $matches[1].Trim()
    } elseif ($sortKey -match '- (0[0-9] .+)$') {
        $status = $matches[1].Trim()
    } else {
        $status = "UNKNOWN"
    }
    $sheetData[$id] = $status
}

Write-Output "Sheet records found: $($sheetData.Count)"

# Read portal CSV
$portalLines = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8
$portalData = @{}
foreach ($line in $portalLines[1..($portalLines.Count-1)]) {
    $idMatch = [regex]::Match($line, '([0-9a-f]{24})')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Groups[1].Value
    
    # Status is field index 3
    $fields = @()
    $inQuote = $false
    $current = ""
    foreach ($char in $line.ToCharArray()) {
        if ($char -eq '"') { $inQuote = -not $inQuote; continue }
        if ($char -eq ',' -and -not $inQuote) { $fields += $current; $current = ""; continue }
        $current += $char
    }
    $fields += $current
    $portalData[$id] = $fields[3]
}

Write-Output "Portal records found: $($portalData.Count)"

# Compare statuses
$mismatchCount = 0
$matchCount = 0
$sheetOnlyCount = 0
$portalOnlyCount = 0

Write-Output ""
Write-Output "=== STATUS MISMATCHES (Sheet vs Portal) ==="
Write-Output "Record ID | Sheet Status | Portal Status"
Write-Output "---"

foreach ($id in $sheetData.Keys) {
    if ($portalData.ContainsKey($id)) {
        $sheetStatus = $sheetData[$id]
        $portalStatus = $portalData[$id]
        # Normalize for comparison
        $sNorm = $sheetStatus.ToLower().Trim()
        $pNorm = $portalStatus.ToLower().Trim()
        if ($sNorm -ne $pNorm) {
            $mismatchCount++
            Write-Output "$id | SHEET: $sheetStatus | PORTAL: $portalStatus"
        } else {
            $matchCount++
        }
    } else {
        $sheetOnlyCount++
    }
}

foreach ($id in $portalData.Keys) {
    if (-not $sheetData.ContainsKey($id)) {
        $portalOnlyCount++
    }
}

Write-Output ""
Write-Output "=== SUMMARY ==="
Write-Output "Status matches: $matchCount"
Write-Output "Status MISMATCHES: $mismatchCount"
Write-Output "In Sheet only (not in portal): $sheetOnlyCount"
Write-Output "In Portal only (not in sheet): $portalOnlyCount"
