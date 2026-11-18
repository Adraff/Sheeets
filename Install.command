#!/bin/bash
# Installs the "Sheeets" CEP panel for the current macOS user (no admin rights needed).
# Only uses tools that ship with macOS: bash, ditto, defaults, xattr, pgrep.

ID="com.sheeets.linkedtext"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/plugin"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/$ID"
DATA="$HOME/Library/Application Support/Sheeets"
OLD_DATA="$HOME/Library/Application Support/CajaEnlazable"   # before the rename
STATE="$DATA/registry-state.txt"
LOG="${TMPDIR:-/tmp}/Sheeets-install.log"
CSXS_VERSIONS="9 10 11 12 13"   # Illustrator 2019 (CSXS 9) .. 2026 (CSXS 12), plus one ahead.

log() { echo "$1"; echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $1" >> "$LOG"; }
finish() { echo; read -r -p "Apretá Enter para cerrar " _; exit "$1"; }
fail() { log "ERROR: $1"; log "La instalación no se completó. Mandá el archivo $LOG si necesitás ayuda."; finish 1; }
bundle_version() { sed -n 's/.*ExtensionBundleVersion="\([^"]*\)".*/\1/p' "$1" 2>/dev/null | head -n 1; }

log "=== Instalador de Sheeets ==="
[ -d "$OLD_DATA" ] && [ ! -d "$DATA" ] && mv "$OLD_DATA" "$DATA"
log "Registro de actividad: $LOG"

[ -f "$SRC/CSXS/manifest.xml" ] || fail "No se encontró la carpeta 'plugin' junto al instalador. Descomprimí el .zip completo y volvé a intentar."

# 1. Illustrator detection (informative only: the install is per user and version-independent).
FOUND="$(ls -d /Applications/Adobe\ Illustrator* 2>/dev/null | sed 's#.*/##' | tr '\n' ',' | sed 's/,$//; s/,/, /g')"
if [ -n "$FOUND" ]; then log "Illustrator encontrado: $FOUND"; else log "No se encontró Illustrator en /Applications. Se instala igual."; fi

# 2. Illustrator must be closed (CEP reads extensions at startup).
while pgrep -x "Adobe Illustrator" >/dev/null; do
    read -r -p "Illustrator está abierto. Guardá tu trabajo, cerralo y apretá Enter " _
done

# 3. Versions + backup of the previous install (outside the CEP folder so Illustrator never loads two copies).
NEW_VER="$(bundle_version "$SRC/CSXS/manifest.xml")"
OLD_VER="$(bundle_version "$DEST/CSXS/manifest.xml")"
mkdir -p "$DATA" || fail "No se pudo crear $DATA"
if [ -n "$OLD_VER" ]; then
    log "Versión instalada: $OLD_VER  ->  versión nueva: $NEW_VER"
    rm -rf "$DATA/backup" "$DATA/respaldo"   # "respaldo": name before 0.4.2
    mv "$DEST" "$DATA/backup" || fail "No se pudo respaldar la versión anterior."
    log "Copia de respaldo de la versión anterior en: $DATA/backup"
else
    log "Instalando versión $NEW_VER"
fi

# 4. Copy files and drop the quarantine flag macOS adds to downloaded files.
mkdir -p "$DEST" && ditto "$SRC" "$DEST" || fail "No se pudieron copiar los archivos a $DEST"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null
log "Archivos copiados en: $DEST"

# 5. Allow unsigned extensions (PlayerDebugMode). Remember previous values so the uninstaller can restore them.
touch "$STATE"
for n in $CSXS_VERSIONS; do
    domain="com.adobe.CSXS.$n"
    if ! grep -q "^$domain=" "$STATE"; then
        if ! defaults read "$domain" >/dev/null 2>&1; then prev="__nokey__"
        else prev="$(defaults read "$domain" PlayerDebugMode 2>/dev/null)" || prev="__absent__"; fi
        [ "$prev" != "1" ] && echo "$domain=$prev" >> "$STATE"
    fi
    defaults write "$domain" PlayerDebugMode 1 || fail "No se pudo activar PlayerDebugMode en $domain"
done
log "Carga de extensiones sin firmar habilitada (PlayerDebugMode=1 en CSXS.9 a CSXS.13)."

# 6. Verify.
for f in CSXS/manifest.xml index.html jsx/host.jsx js/main.js; do
    [ -f "$DEST/$f" ] || fail "Falta el archivo $f después de copiar."
done
[ "$(bundle_version "$DEST/CSXS/manifest.xml")" = "$NEW_VER" ] || fail "El manifiesto instalado no es válido."

log ""
log "Listo. Sheeets $NEW_VER quedó instalada."
log "Último paso: abrí Illustrator y andá a Ventana > Extensiones > Sheeets."
log ""
log "Aviso: este plugin no está firmado por Adobe. Para que cargue, el instalador activó el 'modo de depuración' de extensiones (PlayerDebugMode) en tu usuario. Eso permite que Illustrator cargue cualquier extensión sin firmar instalada en tu cuenta. El desinstalador puede revertirlo."
finish 0
