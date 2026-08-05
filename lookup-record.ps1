param([string]$targetId = '69fc2c54372b666b59704295')

$ghl = Import-Csv 'c:\Users\User\Downloads\records (31).csv'
$old = Import-Csv 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\Deal Sheet Old Extract.csv'
$new = Import-Csv 'c:\Users\User\Downloads\deal-sheet-2026-05-24.csv'

# Look up all 11 mismatched IDs + the specific target
$ids = @(
    '69bb63aef891cea5156c4489',
    '69d71bcd1d2031f55a81b710',
    '69fae85bb6a20ce21cf39a41',
    '69fc2c54372b666b59704295',
    '69a65013b07a1b666870344b',
    '6a0ff5e15b83ab8004571086',
    '69f834fb545830a6f18c4f99',
    '69b36936ee5ca5a9ff0a28ec',
    '69fa9e7d2f11427a8362ce08',
    '6a043233636c90f286e2373a',
    '69e019c2bb84dbc37e4839f0'
)

foreach ($id in $ids) {
    $g = $ghl | Where-Object { $_.PSObject.Properties['Record ID'].Value.Trim() -eq $id }
    $o = $old | Where-Object { $_.PSObject.Properties['Record ID'].Value.Trim() -eq $id } | Select-Object -First 1
    $n = $new | Where-Object { $_.PSObject.Properties['Record ID'].Value.Trim() -eq $id }

    $addr = if ($g) { $g.'Property Address' } elseif ($n) { $n.'Property Address' } else { 'N/A' }
    $oldSt = if ($o) { $o.Status } else { 'NOT IN OLD' }
    $ghlSt = if ($g) { $g.Status } else { 'NOT IN GHL' }
    $newSt = if ($n) { $n.Status } else { 'NOT IN NEW' }

    Write-Host ""
    Write-Host "Record ID:  $id" -ForegroundColor Cyan
    Write-Host "Address:    $addr"
    Write-Host "Old Status: $oldSt"
    Write-Host "GHL Status: $ghlSt"
    Write-Host "New Status: $newSt"
}
