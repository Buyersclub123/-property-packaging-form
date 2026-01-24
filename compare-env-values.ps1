# Safe Environment Variable Value Comparison Script
# Checks if VALUES match between .env.local and .env.vercel (without showing secrets)

Write-Host "=== Environment Variable Value Comparison ===" -ForegroundColor Cyan
Write-Host ""

# Check if files exist
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env.vercel")) {
    Write-Host "ERROR: .env.vercel not found! Run 'vercel env pull .env.vercel' first." -ForegroundColor Red
    exit 1
}

# Read files
$localVars = @{}
$vercelVars = @{}

# Parse .env.local
Get-Content ".env.local" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $localVars[$matches[1]] = $matches[2]
        }
    }
}

# Parse .env.vercel
Get-Content ".env.vercel" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $vercelVars[$matches[1]] = $matches[2]
        }
    }
}

# Find differences
$onlyInLocal = @()
$onlyInVercel = @()
$differentValues = @()
$sameValues = @()

foreach ($key in $localVars.Keys) {
    if (-not $vercelVars.ContainsKey($key)) {
        $onlyInLocal += $key
    } elseif ($localVars[$key] -ne $vercelVars[$key]) {
        $differentValues += $key
    } else {
        $sameValues += $key
    }
}

foreach ($key in $vercelVars.Keys) {
    if (-not $localVars.ContainsKey($key)) {
        $onlyInVercel += $key
    }
}

# Display results
Write-Host "Variables ONLY in .env.local (need to add to Vercel):" -ForegroundColor Yellow
if ($onlyInLocal.Count -eq 0) {
    Write-Host "  (none)" -ForegroundColor Gray
} else {
    $onlyInLocal | ForEach-Object {
        Write-Host "  + $_" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "Variables ONLY in .env.vercel (missing from local):" -ForegroundColor Yellow
if ($onlyInVercel.Count -eq 0) {
    Write-Host "  (none)" -ForegroundColor Gray
} else {
    $onlyInVercel | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Variables with DIFFERENT values (need to sync):" -ForegroundColor Yellow
if ($differentValues.Count -eq 0) {
    Write-Host "  (none)" -ForegroundColor Gray
} else {
    $differentValues | ForEach-Object {
        Write-Host "  != $_" -ForegroundColor Magenta
    }
}
Write-Host ""

Write-Host "Variables with SAME values:" -ForegroundColor Yellow
if ($sameValues.Count -eq 0) {
    Write-Host "  (none)" -ForegroundColor Gray
} else {
    $sameValues | ForEach-Object {
        Write-Host "  = $_" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total in .env.local: $($localVars.Count)" -ForegroundColor White
Write-Host "Total in .env.vercel: $($vercelVars.Count)" -ForegroundColor White
Write-Host "Only in local: $($onlyInLocal.Count)" -ForegroundColor Green
Write-Host "Only in Vercel: $($onlyInVercel.Count)" -ForegroundColor Red
Write-Host "Different values: $($differentValues.Count)" -ForegroundColor Magenta
Write-Host "Same values: $($sameValues.Count)" -ForegroundColor Gray
Write-Host ""

if ($onlyInLocal.Count -gt 0) {
    Write-Host "ACTION: Add these $($onlyInLocal.Count) variables to Vercel" -ForegroundColor Yellow
}

if ($differentValues.Count -gt 0) {
    Write-Host "WARNING: $($differentValues.Count) variables have different values!" -ForegroundColor Magenta
    Write-Host "You need to decide which value is correct and update accordingly." -ForegroundColor Yellow
}

if ($onlyInLocal.Count -eq 0 -and $differentValues.Count -eq 0) {
    Write-Host "SUCCESS: All variables are in sync!" -ForegroundColor Green
}
