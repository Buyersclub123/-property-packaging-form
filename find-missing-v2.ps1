$portalCsv = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8
$sheetRaw = Get-Content 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\To check.csv' -Encoding Default -Raw
$sheetIds = [regex]::Matches($sheetRaw, '[0-9a-f]{24}') | ForEach-Object { $_.Value } | Sort-Object -Unique

$testCount = 0
$genuineCount = 0

foreach ($line in $portalCsv[1..($portalCsv.Count-1)]) {
    $idMatch = [regex]::Match($line, '[0-9a-f]{24}')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Value
    if ($sheetIds -contains $id) { continue }
    
    $addrLower = $line.ToLower()
    if ($addrLower -match '\btest\b|retrop|pop up|e2e|make\.com|gmail|working button|complete flow|ba only|packager approved') {
        $testCount++
    } else {
        $genuineCount++
    }
}

Write-Output "TEST records missing from sheet: $testCount"
Write-Output "GENUINE records missing from sheet: $genuineCount"
Write-Output "TOTAL missing: $($testCount + $genuineCount)"
