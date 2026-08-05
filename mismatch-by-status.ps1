$sheetRaw = Get-Content 'C:\Users\User\property-tool-prod\docs\TO check 2.csv' -Encoding UTF8 -Raw

# Extract ID + status from sheet via sort key pattern
$sheetPattern = '([0-9a-f]{24}),([^\r\n]+)'
$sheetMatches = [regex]::Matches($sheetRaw, $sheetPattern)

$sheetData = @{}
foreach ($m in $sheetMatches) {
    $id = $m.Groups[1].Value
    $sortKey = $m.Groups[2].Value
    if ($sortKey -match '- (0[0-9] [^-]+) -') {
        $status = $matches[1].Trim()
    } elseif ($sortKey -match '- (0[0-9] .+)$') {
        $status = $matches[1].Trim()
    } else {
        $status = "UNKNOWN"
    }
    $sheetData[$id] = $status
}

# Read portal CSV
$portalLines = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8
$portalData = @{}
foreach ($line in $portalLines[1..($portalLines.Count-1)]) {
    $idMatch = [regex]::Match($line, '([0-9a-f]{24})')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Groups[1].Value
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

# Group mismatches by what the Sheet says the status SHOULD be
$groups = @{}
foreach ($id in $sheetData.Keys) {
    if (-not $portalData.ContainsKey($id)) { continue }
    $sheetStatus = $sheetData[$id]
    $portalStatus = $portalData[$id]
    if ($sheetStatus.ToLower().Trim() -ne $portalStatus.ToLower().Trim()) {
        if (-not $groups.ContainsKey($sheetStatus)) { $groups[$sheetStatus] = @() }
        $groups[$sheetStatus] += $id
    }
}

# Output each group
foreach ($status in ($groups.Keys | Sort-Object)) {
    $ids = $groups[$status]
    Write-Output ""
    Write-Output "=== SHEET STATUS: $status ($($ids.Count) records) ==="
    Write-Output "Paste this into Record ID filter:"
    Write-Output ($ids -join "`n")
}
