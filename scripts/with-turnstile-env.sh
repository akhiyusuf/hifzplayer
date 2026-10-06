#!/usr/bin/env bash
# Export the public Turnstile site key (from wrangler.jsonc) for Next/OpenNext builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}" ]]; then
  line="$(node "$ROOT/scripts/export-turnstile-sitekey.mjs" || true)"
  if [[ -n "${line}" && "${line}" == NEXT_PUBLIC_TURNSTILE_SITE_KEY=* ]]; then
    export NEXT_PUBLIC_TURNSTILE_SITE_KEY="${line#NEXT_PUBLIC_TURNSTILE_SITE_KEY=}"
    echo "Exported NEXT_PUBLIC_TURNSTILE_SITE_KEY for build (${NEXT_PUBLIC_TURNSTILE_SITE_KEY:0:8}…)"
  fi
fi
exec "$@"
