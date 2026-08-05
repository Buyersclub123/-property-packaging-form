# 3-WAY COMPARISON: Old Deal Sheet vs GHL vs New Deal Sheet
# Focus: Status field comparison by Record ID

$oldPath = "c:\Users\User\OneDrive\John Arthur Investments\Temp to send\Deal Sheet Old Extract.csv"
$ghlPath = "c:\Users\User\Downloads\records (32).csv"
$newPath = "c:\Users\User\Downloads\deal-sheet-2026-05-24 (1).csv"

# Import CSVs
$oldData = Import-Csv -Path $oldPath
$ghlData = Import-Csv -Path $ghlPath
$newData = Import-Csv -Path $newPath

Write-Host "=== 3-WAY DEAL SHEET COMPARISON ===" -ForegroundColor Cyan
Write-Host "Old Deal Sheet records: $($oldData.Count)"
Write-Host "GHL records:            $($ghlData.Count)"
Write-Host "New Deal Sheet records: $($newData.Count)"
Write-Host ""

# ---- NORMALISE STATUS ----
# Old sheet may have "02 EOI", new sheet has "02 Eoi", GHL may have "02_eoi"
# We normalise to lowercase, strip apostrophes, underscores, and extra spaces for comparison
function Normalize-Status($s) {
    if (-not $s) { return "" }
    $s = $s.Trim().ToLower()
    $s = $s -replace "'", ""
    $s = $s -replace "_", " "
    $s = $s -replace "\s+", " "
    return $s
}

# Build lookups: Record ID -> raw status + normalised status
$oldLookup = @{}
foreach ($row in $oldData) {
    $id = ($row.'Record ID').Trim()
    if ($id) { $oldLookup[$id] = $row.Status }
}

$ghlLookup = @{}
$ghlTypeLookup = @{}
foreach ($row in $ghlData) {
    $id = ($row.'Record ID').Trim()
    if ($id) {
        $ghlLookup[$id] = $row.Status
        $ghlTypeLookup[$id] = $row.'Deal Type'
    }
}

$newLookup = @{}
foreach ($row in $newData) {
    $id = ($row.'Record ID').Trim()
    if ($id) { $newLookup[$id] = $row.Status }
}

Write-Host "Unique IDs - Old: $($oldLookup.Count) | GHL: $($ghlLookup.Count) | New: $($newLookup.Count)"
Write-Host ""

# ---- GHL STATUS DISTRIBUTION (to understand what values exist) ----
Write-Host "=== GHL STATUS DISTRIBUTION ===" -ForegroundColor Cyan
$ghlData | Group-Object Status | Sort-Object Count -Descending | Format-Table @{L='Status';E={if($_.Name){"'$($_.Name)'"}else{"(blank)"}}}, Count -AutoSize

Write-Host "=== GHL DEAL TYPE DISTRIBUTION ===" -ForegroundColor Cyan
$ghlData | Group-Object 'Deal Type' | Sort-Object Count -Descending | Format-Table @{L='Deal Type';E={if($_.Name){"'$($_.Name)'"}else{"(blank)"}}}, Count -AutoSize

# ---- 1. OLD vs GHL STATUS COMPARISON (non-test) ----
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "=== 1. OLD DEAL SHEET vs GHL (Status comparison) ===" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
$oldVsGhlMatch = 0
$oldVsGhlMismatch = @()
$oldVsGhlTestSkip = 0
$oldNotInGhl = @()

foreach ($id in $oldLookup.Keys) {
    $oldRaw = $oldLookup[$id]
    $oldNorm = Normalize-Status $oldRaw
    
    if ($oldNorm -eq "07 test record") { $oldVsGhlTestSkip++; continue }
    
    if ($ghlLookup.ContainsKey($id)) {
        $ghlRaw = $ghlLookup[$id]
        $ghlNorm = Normalize-Status $ghlRaw
        
        if ($oldNorm -eq $ghlNorm) {
            $oldVsGhlMatch++
        } else {
            $oldVsGhlMismatch += [PSCustomObject]@{
                RecordID = $id
                OldStatus = $oldRaw
                GHLStatus = $ghlRaw
            }
        }
    } else {
        $oldNotInGhl += [PSCustomObject]@{
            RecordID = $id
            OldStatus = $oldRaw
        }
    }
}

Write-Host "Matched: $oldVsGhlMatch | Mismatches: $($oldVsGhlMismatch.Count) | Test skipped: $oldVsGhlTestSkip | Old not in GHL: $($oldNotInGhl.Count)"
if ($oldVsGhlMismatch.Count -gt 0) {
    Write-Host "`nMISMATCHES (Old vs GHL):" -ForegroundColor Red
    $oldVsGhlMismatch | Format-Table -AutoSize
}
if ($oldNotInGhl.Count -gt 0) {
    Write-Host "NON-TEST RECORDS IN OLD BUT NOT IN GHL:" -ForegroundColor Red
    $oldNotInGhl | Format-Table -AutoSize
}

# ---- 2. GHL vs NEW DEAL SHEET (Status comparison) ----
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "=== 2. GHL vs NEW DEAL SHEET (Status comparison) ===" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
$ghlVsNewMatch = 0
$ghlVsNewMismatch = @()
$ghlVsNewTestSkip = 0
$ghlNotInNew = @()

foreach ($id in $ghlLookup.Keys) {
    $ghlRaw = $ghlLookup[$id]
    $ghlNorm = Normalize-Status $ghlRaw
    
    if ($ghlNorm -eq "07 test record") { $ghlVsNewTestSkip++; continue }
    
    if ($newLookup.ContainsKey($id)) {
        $newRaw = $newLookup[$id]
        $newNorm = Normalize-Status $newRaw
        
        if ($ghlNorm -eq $newNorm) {
            $ghlVsNewMatch++
        } else {
            $ghlVsNewMismatch += [PSCustomObject]@{
                RecordID = $id
                GHLStatus = $ghlRaw
                NewStatus = $newRaw
            }
        }
    } else {
        $ghlNotInNew += [PSCustomObject]@{
            RecordID = $id
            GHLStatus = $ghlRaw
            GHLType  = $ghlTypeLookup[$id]
        }
    }
}

Write-Host "Matched: $ghlVsNewMatch | Mismatches: $($ghlVsNewMismatch.Count) | Test skipped: $ghlVsNewTestSkip | GHL not in New: $($ghlNotInNew.Count)"
if ($ghlVsNewMismatch.Count -gt 0) {
    Write-Host "`nMISMATCHES (GHL vs New):" -ForegroundColor Red
    $ghlVsNewMismatch | Format-Table -AutoSize
}
if ($ghlNotInNew.Count -gt 0) {
    # Only show non-test
    $realGhlNotInNew = $ghlNotInNew | Where-Object { (Normalize-Status $_.GHLStatus) -ne "07 test record" }
    Write-Host "NON-TEST GHL RECORDS NOT IN NEW DEAL SHEET: $($realGhlNotInNew.Count)" -ForegroundColor Red
    if ($realGhlNotInNew.Count -gt 0) {
        $realGhlNotInNew | Format-Table -AutoSize
    }
}

# ---- 3. OLD vs NEW DEAL SHEET (direct comparison, non-test) ----
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "=== 3. OLD vs NEW DEAL SHEET (Status comparison) ===" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
$oldVsNewMatch = 0
$oldVsNewMismatch = @()
$oldVsNewTestSkip = 0

foreach ($id in $oldLookup.Keys) {
    $oldRaw = $oldLookup[$id]
    $oldNorm = Normalize-Status $oldRaw
    
    if ($oldNorm -eq "07 test record") { $oldVsNewTestSkip++; continue }
    
    if ($newLookup.ContainsKey($id)) {
        $newRaw = $newLookup[$id]
        $newNorm = Normalize-Status $newRaw
        
        if ($oldNorm -eq $newNorm) {
            $oldVsNewMatch++
        } else {
            $oldVsNewMismatch += [PSCustomObject]@{
                RecordID = $id
                OldStatus = $oldRaw
                NewStatus = $newRaw
                GHLStatus = if ($ghlLookup.ContainsKey($id)) { $ghlLookup[$id] } else { "NOT IN GHL" }
            }
        }
    }
}

Write-Host "Matched: $oldVsNewMatch | Mismatches: $($oldVsNewMismatch.Count) | Test skipped: $oldVsNewTestSkip"
if ($oldVsNewMismatch.Count -gt 0) {
    Write-Host "`nMISMATCHES (Old vs New, with GHL reference):" -ForegroundColor Red
    $oldVsNewMismatch | Format-Table -AutoSize
}

# ---- 4. STATUS DISTRIBUTION SUMMARY (non-test) ----
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "=== STATUS DISTRIBUTION (Non-test only) ===" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nOLD SHEET:" -ForegroundColor Green
$oldData | Where-Object { $_.Status -and $_.Status -ne "07 Test Record" } | Group-Object Status | Sort-Object Name | Format-Table Name, Count -AutoSize

Write-Host "GHL:" -ForegroundColor Green
$ghlData | Where-Object { $_.Status -and $_.Status -ne "07 Test Record" } | Group-Object Status | Sort-Object Name | Format-Table Name, Count -AutoSize

Write-Host "NEW SHEET:" -ForegroundColor Green
$newData | Where-Object { $_.Status -and $_.Status -ne "07 Test Record" } | Group-Object Status | Sort-Object Name | Format-Table Name, Count -AutoSize
