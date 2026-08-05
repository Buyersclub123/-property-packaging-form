$content = [System.IO.File]::ReadAllText('c:\Users\User\property-tool-prod\extracted-module3-from-blueprint-31-clean.js', [System.Text.Encoding]::UTF8)
$lines = $content -split "`n"
for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match '[^\x00-\x7F]') {
        $lineNum = $i + 1
        # Show just the non-ASCII chars
        $nonAscii = [regex]::Matches($line, '[^\x00-\x7F]+')
        foreach ($m in $nonAscii) {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($m.Value)
            $hex = ($bytes | ForEach-Object { $_.ToString("X2") }) -join " "
            Write-Host "Line ${lineNum}: pos=$($m.Index) chars='$($m.Value)' hex=$hex"
        }
    }
}
