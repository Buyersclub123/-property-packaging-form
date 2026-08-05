$c = Get-Content 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\To check.csv' -Encoding Default -Raw
$ids = [regex]::Matches($c, '[0-9a-f]{24}')
Write-Output "Records in Google Sheet CSV: $($ids.Count)"

$c2 = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8 -Raw
$ids2 = [regex]::Matches($c2, '[0-9a-f]{24}')
Write-Output "Records in Portal CSV: $($ids2.Count)"

# Find IDs in Sheet but not in Portal
$sheetIds = $ids | ForEach-Object { $_.Value } | Sort-Object -Unique
$portalIds = $ids2 | ForEach-Object { $_.Value } | Sort-Object -Unique

$inSheetOnly = $sheetIds | Where-Object { $portalIds -notcontains $_ }
$inPortalOnly = $portalIds | Where-Object { $sheetIds -notcontains $_ }

Write-Output "`nIn Google Sheet but NOT in Portal: $($inSheetOnly.Count)"
$inSheetOnly | ForEach-Object { Write-Output "  $_" }

Write-Output "`nIn Portal but NOT in Google Sheet: $($inPortalOnly.Count)"
$inPortalOnly | ForEach-Object { Write-Output "  $_" }
