#!/usr/bin/env bash
# snap.sh - screenshot a page of the running dev server with headless Chrome (design checks).
#
#   scripts/snap.sh [--route /teach] [--size 1778x929] [--out design/snap/teach.png]
#                   [--query 'design=reference/home.png&opacity=0.5&blend=difference']
#                   [--url http://localhost:5173]
#
# Start the dev server first (cd frontend && pnpm dev). The default size is the client area of the
# reference design (1778x929, the size of design/reference/*.png). The browser is $CHROME, else
# chromium / google-chrome on PATH, else Chrome or Edge of the Windows host (WSL2).
# --query is added to the URL: the design overlay reads it (docs/UI_WORKFLOW.md).

set -euo pipefail

# Always run from the project root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ROUTE=/
SIZE=1778x929
URL=http://localhost:5173
QUERY=""
OUT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --route)
            ROUTE="$2"
            shift 2
            ;;
        --size)
            SIZE="$2"
            shift 2
            ;;
        --url)
            URL="$2"
            shift 2
            ;;
        --query)
            QUERY="$2"
            shift 2
            ;;
        --out)
            OUT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ -z "$OUT" ]; then
    name=${ROUTE#/}
    OUT="design/snap/${name:-home}.png"
fi

# --- browser ---------------------------------------------------------------------
BROWSER=${CHROME:-}
if [ -z "$BROWSER" ]; then
    for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
        if command -v "$candidate" &> /dev/null; then
            BROWSER=$(command -v "$candidate")
            break
        fi
    done
fi
if [ -z "$BROWSER" ]; then
    for candidate in \
        "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
        "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
        "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; do
        if [ -x "$candidate" ]; then
            BROWSER=$candidate
            break
        fi
    done
fi
if [ -z "$BROWSER" ]; then
    echo "ERROR: no Chrome, Chromium or Edge found (set CHROME=/path/to/browser)."
    exit 1
fi

if ! curl -fsS -o /dev/null "$URL"; then
    echo "ERROR: $URL does not answer. Start the dev server: cd frontend && pnpm dev"
    exit 1
fi

target="$URL/"
[ -n "$QUERY" ] && target="$URL/?$QUERY"
target="$target#$ROUTE"

mkdir -p "$(dirname "$OUT")"
shot="$OUT"

# A Windows browser writes Windows paths: let it write to the Windows temp folder, then copy.
case $BROWSER in
    /mnt/*)
        win_temp=$(cmd.exe /c "echo %TEMP%" 2> /dev/null | tr -d '\r')
        shot_win="$win_temp\\afvi-snap-$$.png"
        shot=$(wslpath -u "$shot_win")
        ;;
    *)
        shot_win=$(realpath -m "$OUT")
        ;;
esac

echo "==> $target ($SIZE)"
"$BROWSER" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="${SIZE/x/,}" --virtual-time-budget=4000 \
    --screenshot="$shot_win" "$target" > /dev/null 2>&1 || true

if [ ! -s "$shot" ]; then
    echo "ERROR: the browser wrote no screenshot."
    exit 1
fi
if [ "$shot" != "$OUT" ]; then
    mv -f "$shot" "$OUT"
fi
echo "OK: $OUT"
