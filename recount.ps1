# Read sheet CSV as raw and find ALL 24-char hex IDs
$sheetRaw = Get-Content 'c:\Users\User\OneDrive\John Arthur Investments\Temp to send\To check.csv' -Encoding Default -Raw

# Debug: show file size
Write-Output "Sheet CSV size: $($sheetRaw.Length) chars"

# Find all 24-char hex strings - case insensitive
$sheetMatches = [regex]::Matches($sheetRaw, '[0-9a-fA-F]{24}')
Write-Output "All 24-char hex matches in Sheet: $($sheetMatches.Count)"

$sheetIds = $sheetMatches | ForEach-Object { $_.Value.ToLower() } | Sort-Object -Unique
Write-Output "Unique Sheet IDs: $($sheetIds.Count)"

# Now portal
$portalRaw = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8 -Raw
$portalMatches = [regex]::Matches($portalRaw, '[0-9a-fA-F]{24}')
Write-Output "All 24-char hex matches in Portal: $($portalMatches.Count)"

$portalIds = $portalMatches | ForEach-Object { $_.Value.ToLower() } | Sort-Object -Unique
Write-Output "Unique Portal IDs: $($portalIds.Count)"

# Show some sample sheet IDs to verify they look right
Write-Output ""
Write-Output "First 5 Sheet IDs:"
$sheetIds[0..4] | ForEach-Object { Write-Output "  $_" }

Write-Output ""
Write-Output "Last 5 Sheet IDs:"
$sheetIds[($sheetIds.Count-5)..($sheetIds.Count-1)] | ForEach-Object { Write-Output "  $_" }

# Spot check - take some of the "missing" IDs and check if they're actually in the raw text
$spotCheck = @(
    '69e968d076c4cb198d356db2',
    '69d88b73deab0c3f757e70f2',
    '69ce119773b0808688dacac2',
    '69deb8d6503fec42ab2476ef',
    '69e06f64b44eb23079ca82b1',
    '698192a7111c84515a51cfd3',
    '69d87d4cec0173747ca0fb91',
    '69e1a68b2bc2d841102ac7b3'
)

Write-Output ""
Write-Output "=== SPOT CHECK: IDs I said were missing ==="
foreach ($id in $spotCheck) {
    $inSheet = $sheetRaw.Contains($id)
    $inArray = $sheetIds -contains $id
    Write-Output "$id | In raw text: $inSheet | In parsed array: $inArray"
}

# Real comparison
$inSheetOnly = $sheetIds | Where-Object { $portalIds -notcontains $_ }
$inPortalOnly = $portalIds | Where-Object { $sheetIds -notcontains $_ }

Write-Output ""
Write-Output "=== CORRECTED COMPARISON ==="
Write-Output "In Sheet but NOT Portal: $($inSheetOnly.Count)"
Write-Output "In Portal but NOT Sheet: $($inPortalOnly.Count)"
Write-Output "In BOTH: $(($portalIds | Where-Object { $sheetIds -contains $_ }).Count)"
