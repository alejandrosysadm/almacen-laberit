#!/usr/bin/env bash
# Actualiza la aplicación desde GitHub en el servidor.
#   ./scripts/actualizar.sh          descarga la última versión, la prueba y reinicia
#   ./scripts/actualizar.sh volver   vuelve a la versión anterior a la última actualización
set -euo pipefail
cd "$(dirname "$0")/.."
SERVICIO="${SERVICIO:-almacen-laberit}"

reiniciar() {
  echo "== Reiniciando el servicio"
  sudo systemctl restart "$SERVICIO"
  sleep 3
  if systemctl is-active --quiet "$SERVICIO"; then
    echo "OK: funcionando con la versión $(git log -1 --format='%h  %s  (%cd)' --date=short)"
  else
    echo "ERROR: el servicio no arranca. Revisa: sudo journalctl -u $SERVICIO -n 50"
    echo "Para volver a la versión anterior: ./scripts/actualizar.sh volver"
    exit 1
  fi
}

if [ "${1:-}" = "volver" ]; then
  [ -f .git/ANTERIOR ] || { echo "No hay una versión anterior guardada."; exit 1; }
  PREV=$(cat .git/ANTERIOR)
  echo "== Volviendo a $(git log -1 --format='%h  %s' "$PREV")"
  git reset --hard --quiet "$PREV"
  npm ci --omit=dev --silent
  reiniciar
  exit 0
fi

echo "== Copia de seguridad previa"
npm run backup --silent

echo "== Buscando cambios en GitHub"
git fetch --quiet origin
LOCAL=$(git rev-parse HEAD)
REMOTO=$(git rev-parse '@{u}')
if [ "$LOCAL" = "$REMOTO" ]; then
  echo "Ya está al día: $(git log -1 --format='%h  %s')"
  exit 0
fi
echo "Cambios nuevos:"
git log --format='  %h  %s' "$LOCAL..$REMOTO"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ERROR: hay archivos modificados a mano en el servidor:"
  git status --short --untracked-files=no
  echo "Guárdalos o descártalos (git checkout -- <archivo>) y vuelve a intentarlo."
  exit 1
fi

CAMBIADOS=$(git diff --name-only "$LOCAL" "$REMOTO")
echo "$LOCAL" > .git/ANTERIOR
git merge --ff-only --quiet "$REMOTO"

if echo "$CAMBIADOS" | grep -qE '^package(-lock)?\.json$'; then
  echo "== Instalando dependencias"
  npm ci --omit=dev --silent
fi

echo "== Comprobando la nueva versión"
if ! npm test --silent; then
  echo "ERROR: la comprobación ha fallado. Volviendo a la versión anterior."
  git reset --hard --quiet "$LOCAL"
  exit 1
fi

reiniciar
