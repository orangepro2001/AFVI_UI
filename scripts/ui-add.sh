#!/usr/bin/env bash
# ui-add.sh - add shadcn-vue components to frontend/src/components/ui.
#
#   scripts/ui-add.sh button dialog ...        components by name (https://www.shadcn-vue.com/docs/components)
#   scripts/ui-add.sh --overwrite button       any other option goes to the shadcn-vue CLI
#
# The CLI copies the component source into the project and installs its dependencies with pnpm
# (package.json and the lockfile change: commit them with the components). The version of the CLI
# is pinned here. Components are ours from then on, see docs/FRONTEND.md ("shadcn-vue").

set -euo pipefail

# Always run from the frontend folder
cd "$(dirname "${BASH_SOURCE[0]}")/../frontend"

SHADCN_VUE_VERSION=2.8.2

if [ $# -eq 0 ]; then
    echo "usage: scripts/ui-add.sh <component>... [shadcn-vue options]"
    exit 1
fi

# The CLI installs through nypm, which runs "corepack pnpm add" whenever corepack exists, and
# corepack 0.34 cannot start pnpm 12. nypm looks for corepack in node_modules/.bin first, so a
# stub there that fails makes it fall back to plain pnpm.
pnpm install --frozen-lockfile
mkdir -p node_modules/.bin
stub=node_modules/.bin/corepack
printf '#!/bin/sh\nexit 127\n' > "$stub"
chmod +x "$stub"
trap 'rm -f "$stub"' EXIT

pnpm dlx "shadcn-vue@${SHADCN_VUE_VERSION}" add --yes "$@"
