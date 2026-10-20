#!/usr/bin/env bash
# tools.sh - fetch the pinned build tools that are neither Go modules nor pnpm packages.
#
#   scripts/tools.sh [--force]
#
# Installs into $AFVI_TOOLS_DIR (default: <repo>/.tools, git-ignored):
#   bin/tailwindcss   Tailwind CSS standalone executable (the project has no npm Tailwind)
#   bin/pnpm          only when no pnpm is on PATH (the build server)
#
# Versions and SHA-256 sums are pinned in scripts/tools.env; a download that does not match is
# rejected. Safe to run again: tools that are already there are left alone (--force replaces them).
# Linux x86-64 only (WSL2 and the build server).

set -euo pipefail

# Always run from the project root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# shellcheck source=tools.env
. scripts/tools.env

if [ "$(uname -s)-$(uname -m)" != "Linux-x86_64" ]; then
    echo "ERROR: tools.sh supports Linux x86-64 only (found $(uname -s)-$(uname -m))."
    exit 1
fi
for tool in curl sha256sum tar; do
    if ! command -v "$tool" &> /dev/null; then
        echo "ERROR: $tool not found."
        exit 1
    fi
done

TOOLS_DIR=${AFVI_TOOLS_DIR:-$PWD/.tools}
mkdir -p "$TOOLS_DIR/bin"
TMP=$(mktemp -d "$TOOLS_DIR/.tmp.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# download <url> <sha256> <file>: fetch to <file> and check the sum.
download() {
    local url=$1 sum=$2 file=$3
    curl -fsSL --retry 3 --retry-delay 2 -o "$file" "$url"
    if ! echo "$sum  $file" | sha256sum -c --status -; then
        echo "ERROR: SHA-256 mismatch for $url"
        echo "  expected $sum"
        echo "  got      $(sha256sum "$file" | cut -d' ' -f1)"
        exit 1
    fi
}

# --- tailwindcss ---------------------------------------------------------------
tw="$TOOLS_DIR/bin/tailwindcss"
if [ "$FORCE" = true ] || ! "$tw" --help 2> /dev/null | grep -q "tailwindcss v${TAILWINDCSS_VERSION}"; then
    echo "==> tailwindcss ${TAILWINDCSS_VERSION}"
    download "$TAILWINDCSS_URL" "$TAILWINDCSS_SHA256" "$TMP/tailwindcss"
    chmod +x "$TMP/tailwindcss"
    mv -f "$TMP/tailwindcss" "$tw"
fi

# --- pnpm (only when there is none) ---------------------------------------------
if [ "$FORCE" = true ] || { ! command -v pnpm &> /dev/null && [ ! -x "$TOOLS_DIR/bin/pnpm" ]; }; then
    echo "==> pnpm ${PNPM_VERSION}"
    download "$PNPM_URL" "$PNPM_SHA256" "$TMP/pnpm.tar.gz"
    dest="$TOOLS_DIR/pnpm-${PNPM_VERSION}"
    rm -rf "$dest"
    mkdir -p "$dest"
    tar -xzf "$TMP/pnpm.tar.gz" -C "$dest"
    ln -sfn "../pnpm-${PNPM_VERSION}/pnpm" "$TOOLS_DIR/bin/pnpm"
fi

echo "OK: $TOOLS_DIR/bin"
