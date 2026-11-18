# Removes the "Sheeets" CEP panel and, if the user agrees, restores the PlayerDebugMode values the installer changed.
# -NoPrompt: don't ask; -RestoreRegistry: with -NoPrompt, also restore registry values.
param([switch]$NoPrompt, [switch]$RestoreRegistry)
$ErrorActionPreference = "Stop"

$Id      = "com.sheeets.linkedtext"
$Dest    = Join-Path $env:APPDATA "Adobe\CEP\extensions\$Id"
$DataDir = Join-Path $env:LOCALAPPDATA "Sheeets"
$State   = Join-Path $DataDir "registry-state.json"
$LogFile = Join-Path $env:TEMP "Sheeets-uninstall.log"

function Log($msg, $color = "Gray") {
    Write-Host $msg -ForegroundColor $color
    Add-Content -Path $LogFile -Value ("[{0}] {1}" -f (Get-Date -Format s), $msg) -Encoding UTF8
}
function Pause-Exit($code) { if (-not $NoPrompt) { Read-Host "Apretá Enter para cerrar" | Out-Null }; exit $code }

try {
    Log "=== Desinstalador de Sheeets ===" "Cyan"
    $OldDataDir = Join-Path $env:LOCALAPPDATA "CajaEnlazable"  # before the rename
    if ((Test-Path $OldDataDir) -and -not (Test-Path $DataDir)) { $DataDir = $OldDataDir; $State = Join-Path $DataDir "registry-state.json" }
    while (Get-Process Illustrator -ErrorAction SilentlyContinue) {
        if ($NoPrompt) { Log "Illustrator está abierto: el panel desaparece al reiniciarlo." "Yellow"; break }
        Read-Host "Illustrator está abierto. Cerralo y apretá Enter" | Out-Null
    }

    if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force; Log "Plugin eliminado de: $Dest" }
    else { Log "El plugin no estaba instalado en: $Dest" "Yellow" }

    if (Test-Path $State) {
        $restore = if ($NoPrompt) { $RestoreRegistry } else { (Read-Host "¿Querés desactivar también la carga de extensiones sin firmar que activó el instalador? (S/N)") -match "^[sS]" }
        if ($restore) {
            (Get-Content $State -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object {
                $key = "HKCU:\Software\Adobe\$($_.Name)"
                if ($_.Value -eq "__nokey__") {
                    Remove-ItemProperty $key -Name PlayerDebugMode -ErrorAction SilentlyContinue
                    $k = Get-Item $key -ErrorAction SilentlyContinue   # remove the key only if the installer created it and it's now empty
                    if ($k -and $k.ValueCount -eq 0 -and $k.SubKeyCount -eq 0) { Remove-Item $key }
                }
                elseif ($_.Value -eq "__absent__") { Remove-ItemProperty $key -Name PlayerDebugMode -ErrorAction SilentlyContinue }
                else { Set-ItemProperty $key -Name PlayerDebugMode -Value $_.Value -Type String }
                Log "Restaurado $($_.Name)"
            }
            Remove-Item $State -Force
        } else {
            Log "Se dejó activada la carga de extensiones sin firmar."
        }
    }
    foreach ($backup in (Join-Path $DataDir "backup"), (Join-Path $DataDir "respaldo")) {  # "respaldo": name before 0.4.2
        if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
    }
    if ((Test-Path $DataDir) -and -not (Get-ChildItem $DataDir)) { Remove-Item $DataDir -Force }

    Log "Listo. Sheeets se desinstaló." "Green"
    Pause-Exit 0
} catch {
    Log ("ERROR: " + $_.Exception.Message) "Red"
    Pause-Exit 1
}
