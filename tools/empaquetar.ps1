# Builds dist\Sheeets-<version>.zip with only built-in Windows/.NET tools.
# The .command files get Unix mode 755 and the zip entries are marked as made on Unix, so macOS keeps them executable.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path $PSScriptRoot -Parent
$version = ([xml](Get-Content (Join-Path $root "plugin\CSXS\manifest.xml") -Raw -Encoding UTF8)).ExtensionManifest.ExtensionBundleVersion
$name = "Sheeets-$version"
$dist = Join-Path $root "dist"
$zipPath = Join-Path $dist "$name.zip"
New-Item -ItemType Directory -Force $dist | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath }

$files = @("Instalar.bat", "Desinstalar.bat", "Instalar.command", "Desinstalar.command", "README.md", "README.es.md", "LICENSE", "LICENSE-ICONS.md") +
    (Get-ChildItem (Join-Path $root "installer") -File | ForEach-Object { "installer\" + $_.Name }) +
    (Get-ChildItem (Join-Path $root "docs") -File | ForEach-Object { "docs\" + $_.Name }) +
    (Get-ChildItem (Join-Path $root "plugin") -File -Recurse | ForEach-Object { $_.FullName.Substring($root.Length + 1) })

$zip = [IO.Compression.ZipFile]::Open($zipPath, "Create")
try {
    foreach ($rel in $files) {
        $bytes = [IO.File]::ReadAllBytes((Join-Path $root $rel))
        if ($rel -like "*.command") {  # bash needs LF line endings
            $bytes = [Text.Encoding]::UTF8.GetBytes(([Text.Encoding]::UTF8.GetString($bytes) -replace "`r`n", "`n"))
        }
        $entry = $zip.CreateEntry("$name/" + ($rel -replace "\\", "/"), "Optimal")
        $mode = if ($rel -like "*.command") { 0x81ED } else { 0x81A4 }   # regular file, 0755 / 0644
        $entry.ExternalAttributes = $mode -shl 16
        $s = $entry.Open(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
    }
} finally { $zip.Dispose() }

# Mark every central-directory entry as "made by Unix" (host byte = 3) so unzip tools honor the modes above.
$b = [IO.File]::ReadAllBytes($zipPath)
$eocd = -1
for ($i = $b.Length - 22; $i -ge 0; $i--) { if ([BitConverter]::ToUInt32($b, $i) -eq 0x06054b50) { $eocd = $i; break } }
if ($eocd -lt 0) { throw "Zip inválido: no se encontró el final del directorio central." }
$count = [BitConverter]::ToUInt16($b, $eocd + 10)
$p = [BitConverter]::ToUInt32($b, $eocd + 16)
for ($k = 0; $k -lt $count; $k++) {
    if ([BitConverter]::ToUInt32($b, $p) -ne 0x02014b50) { throw "Zip inválido: entrada $k del directorio central." }
    $b[$p + 5] = 3
    $p += 46 + [BitConverter]::ToUInt16($b, $p + 28) + [BitConverter]::ToUInt16($b, $p + 30) + [BitConverter]::ToUInt16($b, $p + 32)
}
[IO.File]::WriteAllBytes($zipPath, $b)

Write-Host "Paquete creado: $zipPath ($($files.Count) archivos)"
