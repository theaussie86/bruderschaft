#!/usr/bin/env bash
# Startet PocketBase lokal mit denselben Migrationen und Hooks wie das Image.
# Das Binary holt scripts/pb-install.sh nach .pocketbase/ (gitignored).
set -euo pipefail

cd "$(dirname "$0")/.."
./scripts/pb-install.sh
DIR=.pocketbase

exec "$DIR/pocketbase" serve --http=127.0.0.1:8090 --dir="$DIR/pb_data" \
  --migrationsDir=pocketbase/pb_migrations --hooksDir=pocketbase/pb_hooks
