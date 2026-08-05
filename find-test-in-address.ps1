$portalLines = Get-Content 'c:\Users\User\Downloads\deal-sheet-2026-05-21 (2).csv' -Encoding UTF8

foreach ($line in $portalLines[1..($portalLines.Count-1)]) {
    $idMatch = [regex]::Match($line, '([0-9a-f]{24})')
    if (-not $idMatch.Success) { continue }
    $id = $idMatch.Groups[1].Value
    
    # Parse fields
    $fields = @()
    $inQuote = $false
    $current = ""
    foreach ($char in $line.ToCharArray()) {
        if ($char -eq '"') { $inQuote = -not $inQuote; continue }
        if ($char -eq ',' -and -not $inQuote) { $fields += $current; $current = ""; continue }
        $current += $char
    }
    $fields += $current
    
    $status = $fields[3]
    $address = $fields[6]
    
    # Skip already marked as 07 Test Record
    if ($status -eq '07 Test Record') { continue }
    
    # Check if address contains "test" (case insensitive)
    if ($address -match '(?i)test') {
        Write-Output "$id | $status | $address"
    }
}
