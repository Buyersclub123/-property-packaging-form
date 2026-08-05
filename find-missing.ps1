$portalCsv = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8
$sheetRaw = Get-Content 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\To check.csv' -Encoding Default -Raw
$sheetIds = [regex]::Matches($sheetRaw, '[0-9a-f]{24}') | ForEach-Object { $_.Value } | Sort-Object -Unique

# Parse portal CSV - find records NOT in sheet
$header = $portalCsv[0]
Write-Output "=== RECORDS IN PORTAL BUT NOT IN GOOGLE SHEET ==="
Write-Output ""

foreach ($line in $portalCsv[1..($portalCsv.Count-1)]) {
    # Extract record ID (last 24-char hex string on the line)
    $idMatch = [regex]::Match($line, '[0-9a-f]{24}')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Value
    
    if ($sheetIds -contains $id) { continue }
    
    # Extract key fields - Type, Packager, Status, Property Address
    # Skip lines that look like test records
    $fields = $line -split ','
    $type = $fields[0]
    $packager = $fields[1]
    $status = $fields[3]
    
    # Find address - it's field index 6 but may be quoted with commas
    $addr = ""
    if ($line -match '"([^"]*)"') {
        $addr = $matches[1]
    }
    
    # Flag as test or genuine
    $isTest = $false
    $addrLower = $addr.ToLower()
    if ($addrLower -match 'test|retrop|pop up|e2e|make\.com|gmail|new test|live test|working button|complete flow|ba only|packager approved') {
        $isTest = $true
    }
    if ($packager -eq 'john' -and $type -eq '05 Established' -and $addr -notmatch '\d+ .+ (St|Rd|Ave|Dr|Ct|Pl|Cr|Way|Gr|Cct|Pde|Tce|Loop|Ln)') {
        $isTest = $true
    }
    
    $tag = if ($isTest) { "[TEST]" } else { "[GENUINE]" }
    Write-Output "$tag | $type | $packager | $status | $addr | $id"
}
