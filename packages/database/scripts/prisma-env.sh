#!/usr/bin/env bash
# Inject the api-project secrets, then pass ONLY what the database package
# needs (DATABASE_URL) down to the command. Least privilege: prisma/seed
# never sees api-only secrets like JWT_SECRET or RESEND_API_KEY.
set -euo pipefail
infisical run --env=dev -- sh -c 'env -i PATH="$PATH" HOME="$HOME" DATABASE_URL="$DATABASE_URL" "$@"' sh "$@"