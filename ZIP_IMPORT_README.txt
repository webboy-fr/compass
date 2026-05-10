Simple ZIP import workflow

Usage:

chmod +x tools/import_zip.sh

./tools/import_zip.sh ~/Downloads/compassvXX.zip

The script:
- extracts the ZIP
- detects the real project root
- imports files over the current project
- preserves .git
- ignores config.php
- ignores .env
