#!/usr/bin/env bash
# Actualiza esta instalación a una versión nueva entregada como paquete .tar.gz.
#   sudo -u <usuario-del-servicio> ./scripts/actualizar-version.sh /ruta/almacen-1.2.0.tar.gz
#   ./scripts/actualizar-version.sh volver        vuelve a la versión anterior
# Los datos (data/), la licencia, los certificados, el .env y las copias no se tocan nunca.
set -euo pipefail
cd "$(dirname "$0")/.."
SERVICIO="${SERVICIO:-almacen}"
KEEP=(data backups certs logs node_modules .env)
ver() { node -e "console.log(require('./lib/build-info.json').version)" 2>/dev/null || echo "?"; }
reiniciar() {
  echo "== Reiniciando el servicio $SERVICIO"
  sudo systemctl restart "$SERVICIO"; sleep 3
  systemctl is-active --quiet "$SERVICIO"
}
programa() { ls -A | grep -v -x -e data -e backups -e certs -e logs -e node_modules -e .env; }

if [ "${1:-}" = "volver" ]; then
  ULT=$(ls -t backups/programa-*.tar.gz 2>/dev/null | head -1 || true)
  [ -n "$ULT" ] || { echo "No hay ninguna versión anterior guardada."; exit 1; }
  echo "== Volviendo a $ULT"
  programa | xargs rm -rf; tar -xzf "$ULT"
  npm ci --omit=dev --silent
  reiniciar && echo "OK: versión $(ver)" || { echo "ERROR: el servicio no arranca. Revisa: sudo journalctl -u $SERVICIO -n 50"; exit 1; }
  exit 0
fi

PAQ="${1:-}"; [ -f "$PAQ" ] || { echo "Uso: $0 /ruta/almacen-X.Y.Z.tar.gz   (o: $0 volver)"; exit 1; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
tar -xzf "$PAQ" -C "$TMP"
NUEVA="$TMP/almacen"; [ -f "$NUEVA/server.jsc" ] && [ -f "$NUEVA/lib/build-info.json" ] || { echo "El paquete no es una versión válida de la aplicación."; exit 1; }
NEED=$(node -e "console.log(require('$NUEVA/lib/build-info.json').node)"); NV=$(node -e "console.log(require('$NUEVA/lib/build-info.json').version)")
if [ "$NEED" != "$(node -v)" ]; then echo "Esta versión necesita Node $NEED y el servidor tiene $(node -v). Instala esa versión de Node antes de actualizar."; exit 1; fi
echo "== Actualizando de la versión $(ver) a la $NV"

echo "== Copia de seguridad de los datos"; node scripts/backup.js
mkdir -p backups; GUARDA="backups/programa-$(ver)-$(date +%Y%m%d-%H%M).tar.gz"
programa | tar -czf "$GUARDA" -T -; echo "   Versión actual guardada en $GUARDA"

CAMBIA_DEP=0; cmp -s package-lock.json "$NUEVA/package-lock.json" || CAMBIA_DEP=1
programa | xargs rm -rf
( cd "$NUEVA" && ls -A | grep -v -x -e data -e backups -e certs -e logs -e node_modules -e .env | xargs -I{} cp -a {} "$OLDPWD/" )
chmod +x scripts/*.sh 2>/dev/null || true
if [ "$CAMBIA_DEP" = 1 ] || [ ! -d node_modules ]; then echo "== Instalando dependencias"; npm ci --omit=dev --silent; fi

if reiniciar; then echo "OK: funcionando con la versión $NV"; else
  echo "ERROR: la versión nueva no arranca. Volviendo a la anterior…"
  programa | xargs rm -rf; tar -xzf "$GUARDA"; npm ci --omit=dev --silent; reiniciar || true
  echo "Se ha restaurado la versión $(ver). Revisa: sudo journalctl -u $SERVICIO -n 50"; exit 1
fi
