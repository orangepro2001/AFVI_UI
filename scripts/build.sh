#!/usr/bin/env bash
# build.sh - One-click build on Linux/WSL2: checks, then the Windows executable.
#
#   ./scripts/build.sh [--version V] [--skip-checks] [--offline]
#
# Checks: gofmt, go vet, go test, up-to-date Wails bindings, then in frontend/: types, ESLint,
# Prettier, Vitest. Then `wails build` cross-compiles for Windows (no cgo, no MinGW needed) and
# the result is copied to dist/AFVI-UI-<version>-windows-amd64.exe with SHA256SUMS.txt.
#
#   --version V     version shown in the window title and the file name (default: git describe,
#                   else "dev")
#   --skip-checks   only build (quick local rebuild; the build server never skips)
#   --offline       GOPROXY=off and pnpm --offline (needs warm caches)
#
# Needs: go and the tools of scripts/tools.sh (fetched here, git-ignored under .tools/).
# The build server (deploy/server/ci) runs exactly this script.

set -euo pipefail

# Always run from the project root
cd "$(dirname "${BASH_SOURCE[0]}")/.."

VERSION=""
CHECKS=true
OFFLINE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --skip-checks)
            CHECKS=false
            shift
            ;;
        --offline)
            OFFLINE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ -z "$VERSION" ]; then
    VERSION=$(git describe --tags --always 2> /dev/null || echo dev)
fi

if ! command -v go &> /dev/null; then
    echo "ERROR: go not found."
    exit 1
fi

# --- 0. tools ------------------------------------------------------------------
echo "==> tools (scripts/tools.sh)"
./scripts/tools.sh
TOOLS_DIR=${AFVI_TOOLS_DIR:-$PWD/.tools}
export PATH="$TOOLS_DIR/bin:$PATH"

if [ "$OFFLINE" = true ]; then
    export GOPROXY=off
    export GOFLAGS="-mod=readonly"
    export npm_config_offline=true
fi

if [ "$CHECKS" = true ]; then
    # --- 1. gofmt --------------------------------------------------------------
    echo "==> gofmt -l"
    unformatted=$(find . -name '*.go' -not -path './frontend/*' -not -path './.tools/*' -print0 | xargs -0 gofmt -l)
    if [ -n "$unformatted" ]; then
        echo "The following files are not gofmt-clean:"
        echo "$unformatted"
        exit 1
    fi

    # --- 2. go vet and tests ---------------------------------------------------
    echo "==> go vet ./..."
    go vet ./...
    echo "==> go test ./..."
    go test ./...

    # --- 3. bindings -----------------------------------------------------------
    echo "==> bindings up to date?"
    ./scripts/bindings.sh --check

    # --- 4. frontend -----------------------------------------------------------
    echo "==> frontend: pnpm install --frozen-lockfile"
    (cd frontend && pnpm install --frozen-lockfile)
    echo "==> frontend: typecheck, lint, format, tests"
    (cd frontend && pnpm check)
fi

# --- 5. build ----------------------------------------------------------------
# wails build runs `pnpm install` and `pnpm build` itself (wails.json). -m: no `go mod tidy`,
# -skipbindings: they were checked above (or are the committed ones).
echo "==> wails build (windows/amd64) $VERSION"
go tool wails build -platform windows/amd64 -clean -m -skipbindings -trimpath \
    -o AFVI-UI.exe -ldflags "-X main.version=$VERSION"

exe="build/bin/AFVI-UI.exe"
if [ ! -f "$exe" ]; then
    echo "ERROR: build failed, $exe not found"
    exit 1
fi

# --- 6. dist -----------------------------------------------------------------
name="AFVI-UI-${VERSION}-windows-amd64.exe"
mkdir -p dist
rm -f dist/AFVI-UI-*-windows-amd64.exe dist/SHA256SUMS.txt
cp "$exe" "dist/$name"
(cd dist && sha256sum "$name" > SHA256SUMS.txt)

echo "Built dist/$name ($(du -h "dist/$name" | cut -f1))"
echo "OK"
