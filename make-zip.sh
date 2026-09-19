#!/usr/bin/env bash
#
# Builds a clean, separated release archive:
#
#   upang-delivers.zip
#   ├── frontend/        React + Vite + Tailwind client
#   └── backend/         Express + SQLite API
#
# Usage:  bash make-zip.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/release"
NAME="upang-delivers"

echo "→ cleaning $OUT"
rm -rf "$OUT" "$ROOT/$NAME.zip"
mkdir -p "$OUT/$NAME/frontend" "$OUT/$NAME/backend"

echo "→ copying frontend"
for item in src public index.html package.json package-lock.json vite.config.ts tsconfig.json; do
  [ -e "$ROOT/$item" ] && cp -R "$ROOT/$item" "$OUT/$NAME/frontend/"
done
# the frontend does not need a copy of the server
rm -rf "$OUT/$NAME/frontend/src/lib/api.ts.bak" 2>/dev/null || true

echo "→ copying backend"
cp -R "$ROOT/backend/src" "$OUT/$NAME/backend/"
cp "$ROOT/backend/package.json" "$OUT/$NAME/backend/"
cp "$ROOT/backend/.env.example" "$OUT/$NAME/backend/"
cp "$ROOT/backend/README.md" "$OUT/$NAME/backend/"
# never ship real credentials
rm -f "$OUT/$NAME/backend/.env"

echo "→ copying docs"
cp "$ROOT/README.md" "$OUT/$NAME/" 2>/dev/null || true
cp "$ROOT/.gitignore" "$OUT/$NAME/" 2>/dev/null || true
cp "$ROOT/make-zip.sh" "$OUT/$NAME/" 2>/dev/null || true

echo "→ stripping build junk"
find "$OUT/$NAME" \( -name node_modules -o -name dist -o -name .DS_Store -o -name "*.db" -o -name "*.db-wal" -o -name "*.db-shm" \) -prune -exec rm -rf {} + 2>/dev/null || true

echo "→ zipping"
cd "$OUT"
if command -v zip >/dev/null 2>&1; then
  zip -qr "$ROOT/$NAME.zip" "$NAME"
else
  # fallback for machines without `zip`
  tar -czf "$ROOT/$NAME.tar.gz" "$NAME"
  echo "  (zip not found — created $NAME.tar.gz instead)"
fi

cd "$ROOT"
rm -rf "$OUT"
echo
echo "Done:  $ROOT/$NAME.zip"
echo "       ├── frontend/"
echo "       └── backend/"
