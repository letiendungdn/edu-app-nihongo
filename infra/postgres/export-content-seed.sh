#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${POSTGRES_CONTAINER:-edu-postgres-nihongo}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/nihongo-content-seed.sql"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' chưa chạy. Chạy: docker compose up -d postgres-nihongo"
  exit 1
fi

docker cp "$DIR/dump-content-tables.sh" "$CONTAINER:/tmp/dump-content-tables.sh"
echo "Dump content -> $OUT"
docker exec "$CONTAINER" sh /tmp/dump-content-tables.sh > "$OUT"
echo "Done ($(wc -c < "$OUT") bytes)"
