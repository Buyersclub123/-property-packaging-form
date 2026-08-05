$bp = Get-Content 'c:\Users\User\property-tool-prod\make-com-scenarios\02a GHL Property Review Submitted approval & email processing.blueprint (31).json' -Raw -Encoding UTF8
$json = $bp | ConvertFrom-Json

function Find-Module3($nodes, $depth) {
    foreach ($m in $nodes) {
        $indent = "  " * $depth
        Write-Host ($indent + "id=" + [string]$m.id + " module=" + [string]$m.module)
        if ([int]$m.id -eq 3) {
            Write-Host ("mapper type: " + $m.mapper.GetType().FullName)
            Write-Host ("mapper keys: " + ($m.mapper.PSObject.Properties.Name -join ", "))
            $code = $m.mapper.codeEditorJavascript
            if (-not $code) {
                $code = $m.mapper.code
            }
            if ($code) {
                [System.IO.File]::WriteAllText('c:\Users\User\property-tool-prod\extracted-module3-from-blueprint-31-clean.js', $code, [System.Text.Encoding]::UTF8)
                Write-Host ("FOUND Module 3! Extracted " + $code.Length + " chars")
            } else {
                Write-Host "Module 3 found but code is empty/null everywhere"
                # Dump raw mapper JSON
                $mapperJson = $m.mapper | ConvertTo-Json -Depth 1 -Compress
                Write-Host ("mapper JSON (first 500): " + $mapperJson.Substring(0, [Math]::Min(500, $mapperJson.Length)))
            }
            return $true
        }
        # Check router routes
        if ($m.routes) {
            foreach ($route in $m.routes) {
                $routeFlow = $route.flow
                if ($routeFlow) {
                    $result = Find-Module3 $routeFlow ($depth + 1)
                    if ($result) { return $true }
                }
            }
        }
        # Check next array
        if ($m.next) {
            $result = Find-Module3 $m.next ($depth + 1)
            if ($result) { return $true }
        }
    }
    return $false
}

$result = Find-Module3 $json.flow 0
if (-not $result) { Write-Host "Module 3 not found anywhere in blueprint" }
