$portalCsv = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8
$sheetRaw = Get-Content 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\To check.csv' -Encoding Default -Raw
$sheetIds = [regex]::Matches($sheetRaw, '[0-9a-f]{24}') | ForEach-Object { $_.Value } | Sort-Object -Unique

# Header: Type,Packager,Sourcer,Status,Review Date,QA,Property Address,Asking,...,Record ID
# Index:  0    1        2       3      4           5  6                7        ...

$approvedCount = 0
$notApprovedCount = 0
$results = @()

foreach ($line in $portalCsv[1..($portalCsv.Count-1)]) {
    $idMatch = [regex]::Match($line, '[0-9a-f]{24}')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Value
    if ($sheetIds -contains $id) { continue }
    
    # Skip test records
    $lineLower = $line.ToLower()
    if ($lineLower -match '\btest\b|retrop|pop up|e2e|make\.com|gmail|working button|complete flow|ba only|packager approved') {
        continue
    }
    
    # Parse fields - handle quoted fields with commas
    $fields = @()
    $inQuote = $false
    $current = ""
    foreach ($char in $line.ToCharArray()) {
        if ($char -eq '"') { $inQuote = -not $inQuote; continue }
        if ($char -eq ',' -and -not $inQuote) { $fields += $current; $current = ""; continue }
        $current += $char
    }
    $fields += $current
    
    $type = $fields[0]
    $packager = $fields[1]
    $status = $fields[3]
    $qa = $fields[5]
    $address = $fields[6]
    
    $qaTag = if ($qa -eq 'Approved') { "YES" } else { "NO " }
    
    if ($qa -eq 'Approved') { $approvedCount++ } else { $notApprovedCount++ }
    
    $results += "$qaTag | $type | $packager | $status | $address | $id"
}

Write-Output "=== GENUINE RECORDS IN PORTAL BUT NOT IN GOOGLE SHEET ==="
Write-Output "Packager Approved: $approvedCount"
Write-Output "NOT Approved: $notApprovedCount"
Write-Output "Total: $($approvedCount + $notApprovedCount)"
Write-Output ""
Write-Output "--- APPROVED ---"
$results | Where-Object { $_.StartsWith("YES") } | ForEach-Object { Write-Output $_ }
Write-Output ""
Write-Output "--- NOT APPROVED ---"
$results | Where-Object { $_.StartsWith("NO ") } | ForEach-Object { Write-Output $_ }
