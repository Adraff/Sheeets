# Installs the "Sheeets" CEP panel for the current user (no admin rights needed).
# -NoPrompt: don't wait for user input (for automated runs); only warns if Illustrator is open.
param([switch]$NoPrompt)
$ErrorActionPreference = "Stop"

$Id       = "com.sheeets.linkedtext"
$Source   = Join-Path (Split-Path $PSScriptRoot -Parent) "plugin"
$Dest     = Join-Path $env:APPDATA "Adobe\CEP\extensions\$Id"
$DataDir  = Join-Path $env:LOCALAPPDATA "Sheeets"
$State    = Join-Path $DataDir "registry-state.json"
$LogFile  = Join-Path $env:TEMP "Sheeets-instalacion.log"
$CsxsVersions = 9..13   # Illustrator 2019 (CSXS 9) .. 2026 (CSXS 12), plus one ahead.

function Log($msg, $color = "Gray") {
    Write-Host $msg -ForegroundColor $color
    Add-Content -Path $LogFile -Value ("[{0}] {1}" -f (Get-Date -Format s), $msg) -Encoding UTF8
}
function Pause-Exit($code) { if (-not $NoPrompt) { Read-Host "Apretá Enter para cerrar" | Out-Null }; exit $code }
function Get-BundleVersion($manifest) { if (Test-Path $manifest) { ([xml](Get-Content $manifest -Raw -Encoding UTF8)).ExtensionManifest.ExtensionBundleVersion } }

try {
    Log "=== Instalador de Sheeets ===" "Cyan"
    Log "Registro de actividad: $LogFile"

    if (-not (Test-Path (Join-Path $Source "CSXS\manifest.xml"))) { throw "No se encontró la carpeta 'plugin' junto al instalador. Descomprimí el .zip completo y volvé a intentar." }

    # 0. Data folder of versions before the rename ("Caja enlazable"): keep its registry state.
    $OldDataDir = Join-Path $env:LOCALAPPDATA "CajaEnlazable"
    if ((Test-Path $OldDataDir) -and -not (Test-Path $DataDir)) { Move-Item $OldDataDir $DataDir; Log "Datos de la versión anterior movidos a: $DataDir" }

    # 1. Illustrator detection (informative only: the install is per user and version-independent).
    $found = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match "Illustrator" } | ForEach-Object { $_.DisplayName } | Sort-Object -Unique
    if ($found) { Log ("Illustrator encontrado: " + ($found -join ", ")) } else { Log "No se encontró Illustrator instalado. Se instala igual." "Yellow" }

    # 2. Illustrator must be closed (CEP reads extensions at startup).
    while (Get-Process Illustrator -ErrorAction SilentlyContinue) {
        if ($NoPrompt) { Log "Illustrator está abierto: vas a tener que reiniciarlo para ver el panel." "Yellow"; break }
        Read-Host "Illustrator está abierto. Guardá tu trabajo, cerralo y apretá Enter" | Out-Null
    }

    # 3. Versions + backup of the previous install.
    $newVer = Get-BundleVersion (Join-Path $Source "CSXS\manifest.xml")
    $oldVer = Get-BundleVersion (Join-Path $Dest "CSXS\manifest.xml")
    if ($oldVer) {
        Log "Versión instalada: $oldVer  ->  versión nueva: $newVer"
        $backup = Join-Path $DataDir "respaldo"
        if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
        New-Item -ItemType Directory -Force $DataDir | Out-Null
        Move-Item $Dest $backup   # backup lives outside the CEP folder so Illustrator never loads two copies
        Log "Copia de respaldo de la versión anterior en: $backup"
    } else {
        Log "Instalando versión $newVer"
    }

    # 4. Copy files.
    New-Item -ItemType Directory -Force $Dest | Out-Null
    Copy-Item (Join-Path $Source "*") $Dest -Recurse -Force
    Log "Archivos copiados en: $Dest"

    # 5. Allow unsigned extensions (PlayerDebugMode). Remember previous values so the uninstaller can restore them.
    New-Item -ItemType Directory -Force $DataDir | Out-Null
    $saved = @{}
    if (Test-Path $State) { (Get-Content $State -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $saved[$_.Name] = $_.Value } }
    foreach ($n in $CsxsVersions) {
        $key = "HKCU:\Software\Adobe\CSXS.$n"
        $prev = (Get-ItemProperty $key -Name PlayerDebugMode -ErrorAction SilentlyContinue).PlayerDebugMode
        if ($prev -ne "1" -and -not $saved.ContainsKey("CSXS.$n")) { $saved["CSXS.$n"] = if (-not (Test-Path $key)) { "__nokey__" } elseif ($null -eq $prev) { "__absent__" } else { [string]$prev } }
        if (-not (Test-Path $key)) { New-Item $key -Force | Out-Null }
        Set-ItemProperty $key -Name PlayerDebugMode -Value "1" -Type String
    }
    $saved | ConvertTo-Json | Set-Content $State -Encoding UTF8
    Log "Carga de extensiones sin firmar habilitada (PlayerDebugMode=1 en CSXS.$($CsxsVersions[0]) a CSXS.$($CsxsVersions[-1]))."

    # 6. Verify.
    foreach ($f in "CSXS\manifest.xml", "index.html", "jsx\host.jsx", "js\main.js") {
        if (-not (Test-Path (Join-Path $Dest $f))) { throw "Falta el archivo $f después de copiar." }
    }
    if ((Get-BundleVersion (Join-Path $Dest "CSXS\manifest.xml")) -ne $newVer) { throw "El manifiesto instalado no es válido." }

    Log ""
    Log "Listo. Sheeets $newVer quedó instalada." "Green"
    Log "Último paso: reiniciá Illustrator y abrí Ventana > Extensiones > Sheeets." "Green"
    Log ""
    Log "Aviso: este plugin no está firmado por Adobe. Para que cargue, el instalador activó el 'modo de depuración' de extensiones (PlayerDebugMode) en tu usuario. Eso permite que Illustrator cargue cualquier extensión sin firmar instalada en tu cuenta. El desinstalador puede revertirlo." "Yellow"
    Pause-Exit 0
} catch {
    Log ("ERROR: " + $_.Exception.Message) "Red"
    Log "La instalación no se completó. Mandá el archivo $LogFile si necesitás ayuda." "Red"
    Pause-Exit 1
}
