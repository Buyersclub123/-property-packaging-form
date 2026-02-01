# Safe Environment Variable Comparison Script
# This script compares .env.local and .env.vercel WITHOUT showing sensitive values

Write-Host "=== Environment Variable Comparison ===" -ForegroundColor Cyan
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
            $localVars[$matches[1]] = $true
        }
    }
}

# Parse .env.vercel
Get-Content ".env.vercel" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $vercelVars[$matches[1]] = $true
        }
    }
}

# Find differences
$onlyInLocal = $localVars.Keys | Where-Object { -not $vercelVars.ContainsKey($_) }
$onlyInVercel = $vercelVars.Keys | Where-Object { -not $localVars.ContainsKey($_) }
$inBoth = $localVars.Keys | Where-Object { $vercelVars.ContainsKey($_) }

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

Write-Host "Variables in BOTH files:" -ForegroundColor Yellow
if ($inBoth.Count -eq 0) {
    Write-Host "  (none)" -ForegroundColor Gray
} else {
    $inBoth | ForEach-Object {
        Write-Host "  = $_" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total in .env.local: $($localVars.Count)" -ForegroundColor White
Write-Host "Total in .env.vercel: $($vercelVars.Count)" -ForegroundColor White
Write-Host "Only in local: $($onlyInLocal.Count)" -ForegroundColor Green
Write-Host "Only in Vercel: $($onlyInVercel.Count)" -ForegroundColor Red
Write-Host "In both: $($inBoth.Count)" -ForegroundColor Gray
Write-Host ""

if ($onlyInLocal.Count -gt 0) {
    Write-Host "ACTION REQUIRED: You need to add the GREEN variables to Vercel" -ForegroundColor Yellow
    Write-Host "Run: vercel env add <VARIABLE_NAME>" -ForegroundColor Cyan
}
