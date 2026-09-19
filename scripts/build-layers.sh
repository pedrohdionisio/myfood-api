#!/usr/bin/env bash
set -euo pipefail

LAYER_DIR='layers/sharp/nodejs'
SHARP_VERSION="$(node -p "require('./package.json').dependencies.sharp")"

echo "Building sharp layer (${SHARP_VERSION}, linux/arm64/glibc)..."

rm -rf layers/sharp
mkdir -p "$LAYER_DIR"

# npm, e não pnpm: o pnpm instala por symlink e a Lambda não resolve symlinks dentro do
# pacote de deploy. O diretório é isolado, então nada disso toca o lockfile do projeto.
(
  cd "$LAYER_DIR"
  npm init -y > /dev/null
  npm install --cpu=arm64 --os=linux --libc=glibc --omit=dev "sharp@${SHARP_VERSION}"
  rm -f package.json package-lock.json

  # O .bin só tem symlinks de CLI, e a Lambda não resolve symlinks dentro do pacote.
  rm -rf node_modules/.bin

  # Fallback wasm do sharp, 8.8M que nunca executam porque o binário nativo arm64 está
  # presente. O carregador do sharp tenta cada implementação em try/catch, então a ausência
  # é ignorada. @emnapi e tslib existem só para servir o wasm.
  rm -rf node_modules/@img/sharp-wasm32 node_modules/@emnapi node_modules/tslib
)

# Sem os binários da plataforma o npm instala o sharp mesmo assim, e a falha só apareceria
# na primeira invocação da Lambda.
if [ ! -d "${LAYER_DIR}/node_modules/@img/sharp-linux-arm64" ]; then
  echo 'error: @img/sharp-linux-arm64 não foi instalado; a layer subiria quebrada.' >&2
  exit 1
fi

echo "Layer ready at layers/sharp ($(du -sh layers/sharp | cut -f1))"
