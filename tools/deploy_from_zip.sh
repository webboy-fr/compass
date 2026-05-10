#!/bin/bash

# Usage:
# ./deploy_from_zip.sh /path/to/archive.zip /path/to/destination

set -e

ZIP_FILE="$1"
DEST_DIR="$2"

if [ -z "$ZIP_FILE" ] || [ -z "$DEST_DIR" ]; then
    echo "Usage: ./deploy_from_zip.sh archive.zip /destination/path"
    exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
    echo "ZIP file not found: $ZIP_FILE"
    exit 1
fi

TMP_DIR=$(mktemp -d)

echo "Extracting ZIP..."
unzip -q "$ZIP_FILE" -d "$TMP_DIR"

# Detect real project root.
ROOT_DIR=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$ROOT_DIR" ]; then
    ROOT_DIR="$TMP_DIR"
fi

echo "Deploying files to $DEST_DIR..."

mkdir -p "$DEST_DIR"

rsync -av --delete         --exclude='config.php'         "$ROOT_DIR"/         "$DEST_DIR"/

echo "Cleaning temporary files..."
rm -rf "$TMP_DIR"

echo "Deployment complete."
