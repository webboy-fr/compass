#!/bin/bash

set -euo pipefail

ZIP_FILE="${1:-}"
PROJECT_DIR="$(pwd)"
TMP_DIR="$(mktemp -d)"
SELF_BACKUP="$TMP_DIR/import_zip.sh.backup"

if [ -z "$ZIP_FILE" ]; then
    echo "Usage: bash tools/import_zip.sh /path/to/archive.zip"
    exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
    echo "ZIP not found: $ZIP_FILE"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/index.html" ]; then
    echo "Error: run this script from the project root, where index.html exists."
    exit 1
fi

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cp "$PROJECT_DIR/tools/import_zip.sh" "$SELF_BACKUP"

echo "Extracting ZIP..."
unzip -q "$ZIP_FILE" -d "$TMP_DIR"

SRC_DIR="$(find "$TMP_DIR" -type f -name "index.html" -print -quit | xargs -r dirname)"

if [ -z "$SRC_DIR" ]; then
    echo "Error: no index.html found inside ZIP."
    exit 1
fi

echo "Source detected: $SRC_DIR"
echo "Cleaning project..."

find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 \
    ! -name ".git" \
    ! -name "config.php" \
    ! -name ".env" \
    ! -name "tools" \
    -exec rm -rf {} +

echo "Copying new code..."

rsync -a --delete \
    --exclude=".git" \
    --exclude="config.php" \
    --exclude=".env" \
    --exclude=".gitignore" \
    --exclude="node_modules" \
    --exclude="tools/import_zip.sh" \
    "$SRC_DIR"/ \
    "$PROJECT_DIR"/

mkdir -p "$PROJECT_DIR/tools"
cp "$SELF_BACKUP" "$PROJECT_DIR/tools/import_zip.sh"

echo "Fixing permissions..."

find "$PROJECT_DIR" -type d -exec chmod 755 {} \;
find "$PROJECT_DIR" -type f -exec chmod 644 {} \;
chmod +x "$PROJECT_DIR/tools/import_zip.sh"

echo "Done."
echo "Imported title:"
grep -i "<title" "$PROJECT_DIR/index.html" || true