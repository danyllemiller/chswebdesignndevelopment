#!/bin/bash
# scripts/learning-notebook/print.sh <book.html> [book.pdf]
# Prints a Learning Notebook built by build.js to a letter-size PDF with headless Chrome
# (one 8.5x11 page per .page, backgrounds and dot grids included). Send the PDF to the
# print shop as double-sided, spiral-bound on the long edge.
set -e
IN="$1"; OUT="${2:-${1%.html}.pdf}"
[ -f "$IN" ] || { echo "Usage: print.sh <book.html> [book.pdf]"; exit 1; }
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium)"
PROFILE="$(mktemp -d)"
"$CHROME" --headless=new --disable-gpu --no-first-run --user-data-dir="$PROFILE" \
  --no-pdf-header-footer --virtual-time-budget=15000 --print-to-pdf="$OUT" "file://$(cd "$(dirname "$IN")" && pwd)/$(basename "$IN")" 2>/dev/null
rm -r "$PROFILE"
echo "$OUT"
