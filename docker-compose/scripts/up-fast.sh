#!/usr/bin/env bash
# up-fast.sh — start/recreate enabled services without rebuilding images.
# Use for config-only changes such as Tinyauth/Caddy/env updates.
set -e
exec bash "$(dirname "$0")/dc.sh" up -d --remove-orphans "$@"
