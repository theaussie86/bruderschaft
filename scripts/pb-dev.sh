#!/usr/bin/env bash
# Startet PocketBase lokal mit denselben Migrationen und Hooks wie das Image.
# Lädt das Binary beim ersten Aufruf nach .pocketbase/ (gitignored). Version
# hier und in pocketbase/Dockerfile gleich halten.
set -euo pipefail

PB_VERSION=0.42.2
cd "$(dirname "$0")/.."
DIR=.pocketbase
BIN="$DIR/pocketbase"

if [ ! -x "$BIN" ] || ! "$BIN" --version | grep -q "$PB_VERSION"; then
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(uname -m); [ "$arch" = x86_64 ] && arch=amd64; [ "$arch" = aarch64 ] && arch=arm64
  file="pocketbase_${PB_VERSION}_${os}_${arch}.zip"
  base="https://ganigeorgiev.com/meta/pocketbase/pocketbase/download/v${PB_VERSION}"
  mkdir -p "$DIR"
  curl -fsSL -o "$DIR/$file" "$base/$file"
  expected=$(curl -fsSL "$base/checksums.txt" | awk -v f="$file" '$2 == f {print $1}')
  echo "$expected  $DIR/$file" | shasum -a 256 -c -
  unzip -o -q "$DIR/$file" pocketbase -d "$DIR"
  rm "$DIR/$file"
fi

exec "$BIN" serve --http=127.0.0.1:8090 --dir="$DIR/pb_data" \
  --migrationsDir=pocketbase/pb_migrations --hooksDir=pocketbase/pb_hooks
