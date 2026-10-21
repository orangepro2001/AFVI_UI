#!/usr/bin/env bash
# wintests.sh - compile the Go tests for Windows and pack them into one archive.
#
#   ./scripts/wintests.sh <archive.tar.gz>
#
# Every package with tests becomes one windows/amd64 test binary. The GitHub Windows runner
# (.github/workflows/windows.yml) unpacks the archive and runs the binaries, so it needs no Go
# toolchain and compiles nothing. The archive holds <name>.test.exe files and wintests.txt, one line
# per binary: "<name>.test.exe<TAB><package folder relative to the repository root>". The runner
# starts each binary in that folder, because tests read testdata/ relative to their package.
#
# build.sh calls this after the executable is built (the root package embeds frontend/dist).

set -euo pipefail

# Always run from the project root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ $# -ne 1 ]; then
    echo "usage: scripts/wintests.sh <archive.tar.gz>"
    exit 1
fi
archive=$(realpath -m "$1")

stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

: > "$stage/wintests.txt"
count=0
# go list prints an empty line for a package without tests; "import path<space>directory".
while read -r pkg dir; do
    [ -n "$pkg" ] || continue
    rel=${dir#"$PWD"}
    rel=${rel#/}
    rel=${rel:-.}
    if [ "$rel" = . ]; then
        name=root
    else
        name=$(printf '%s' "$rel" | tr '/' '_')
    fi
    GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go test -c -trimpath -o "$stage/$name.test.exe" "$pkg"
    printf '%s\t%s\n' "$name.test.exe" "$rel" >> "$stage/wintests.txt"
    count=$((count + 1))
done < <(go list -f '{{if or .TestGoFiles .XTestGoFiles}}{{.ImportPath}} {{.Dir}}{{end}}' ./...)

if [ "$count" -eq 0 ]; then
    echo "ERROR: no package with tests found"
    exit 1
fi

mkdir -p "$(dirname "$archive")"
tar czf "$archive" -C "$stage" .
echo "Packed $count Windows test binaries into $archive ($(du -h "$archive" | cut -f1))"
