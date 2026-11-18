#!/bin/bash
# Removes the "Sheeets" CEP panel and, if the user agrees, restores the PlayerDebugMode values the installer changed.

ID="com.sheeets.linkedtext"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/$ID"
DATA="$HOME/Library/Application Support/Sheeets"
[ ! -d "$DATA" ] && [ -d "$HOME/Library/Application Support/CajaEnlazable" ] && DATA="$HOME/Library/Application Support/CajaEnlazable"   # before the rename
STATE="$DATA/registry-state.txt"
LOG="${TMPDIR:-/tmp}/Sheeets-uninstall.log"

log() { echo "$1"; echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $1" >> "$LOG"; }
finish() { echo; read -r -p "Apretá Enter para cerrar " _; exit "$1"; }

log "=== Desinstalador de Sheeets ==="
while pgrep -x "Adobe Illustrator" >/dev/null; do
    read -r -p "Illustrator está abierto. Cerralo y apretá Enter " _
done

if [ -d "$DEST" ]; then rm -rf "$DEST" && log "Plugin eliminado de: $DEST"
else log "El plugin no estaba instalado en: $DEST"; fi

if [ -f "$STATE" ]; then
    read -r -p "¿Querés desactivar también la carga de extensiones sin firmar que activó el instalador? (S/N) " answer
    case "$answer" in
        [sS]*)
            while IFS='=' read -r domain prev; do
                [ -z "$domain" ] && continue
                if [ "$prev" = "__nokey__" ] || [ "$prev" = "__absent__" ]; then
                    defaults delete "$domain" PlayerDebugMode 2>/dev/null
                    # remove the whole domain only if the installer created it and nothing else is in it
                    if [ "$prev" = "__nokey__" ] && ! defaults read "$domain" 2>/dev/null | grep -q "="; then defaults delete "$domain" 2>/dev/null; fi
                else
                    defaults write "$domain" PlayerDebugMode "$prev"
                fi
                log "Restaurado $domain"
            done < "$STATE"
            rm -f "$STATE" ;;
        *) log "Se dejó activada la carga de extensiones sin firmar." ;;
    esac
fi
rm -rf "$DATA/backup" "$DATA/respaldo"   # "respaldo": name before 0.4.2
rmdir "$DATA" 2>/dev/null

log "Listo. Sheeets se desinstaló."
finish 0
