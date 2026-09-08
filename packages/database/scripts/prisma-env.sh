#!/usr/bin/env bash
# Database-package env wrapper.
#
# When Infisical auth is configured (dev machines, deploy pipelines), inject
# the api-project secrets then pass ONLY what the database package needs
# (DATABASE_URL) down to the command — least privilege: prisma/seed never
# sees api-only secrets like JWT_SECRET or RESEND_API_KEY.
#
# When it isn't (CI — pr-check.yml sets disposable local credentials and
# has no Infisical), run directly against the existing environment.
set -euo pipefail
# Anchor to this package so .infisical.json + prisma schema resolve no matter
# where the script is invoked from (root, turbo, CI/CD).
cd "$(dirname "$0")/.."

if command -v infisical >/dev/null 2>&1 && { [ -n "${INFISICAL_DOMAIN:-}" ] || [ -n "${INFISICAL_TOKEN:-}" ] || [ -n "${INFISICAL_CUSTOM_HEADERS:-}" ]; }; then
  exec infisical run --env=dev -- sh -c 'env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" "$@"' sh "$@"
fi

exec env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" "$@"