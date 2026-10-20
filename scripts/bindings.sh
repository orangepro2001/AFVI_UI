#!/usr/bin/env bash
# bindings.sh - regenerate the TypeScript bindings of the Go App (frontend/wailsjs, committed).
#
#   scripts/bindings.sh [--check]
#
# Run it after adding or changing an exported method of App (app.go). --check regenerates into
# a scratch copy and fails when the committed bindings are out of date (scripts/build.sh does this).

set -euo pipefail

# Always run from the project root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CHECK=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --check)
            CHECK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$CHECK" = true ]; then
    before=$(mktemp -d)
    trap 'rm -rf "$before"' EXIT
    cp -r frontend/wailsjs/. "$before/"
fi

go tool wails generate module > /dev/null

if [ "$CHECK" = true ]; then
    if ! diff -r "$before" frontend/wailsjs > /dev/null; then
        echo "ERROR: frontend/wailsjs was out of date (now regenerated). Review and commit it:"
        diff -r "$before" frontend/wailsjs || true
        exit 1
    fi
    echo "bindings are up to date"
else
    echo "OK: frontend/wailsjs"
fi
