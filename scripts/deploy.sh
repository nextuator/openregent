#!/usr/bin/env bash
# Production deploy without git metadata (Vercel Hobby blocks deploys whose commit author isn't a team member).
# Usage: nix develop --command scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=$(mktemp -d)
tar --exclude=./.git --exclude=./node_modules --exclude=./.next --exclude=./data --exclude='./.env*' --exclude=./public/_review -cf - . | tar -xf - -C "$OUT"
cd "$OUT" && vercel deploy --prod --yes
rm -rf "$OUT"
