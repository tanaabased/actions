#!/usr/bin/env bash

set -euo pipefail

case "${1:-}" in
  auto)
    if [[ "${RUNNER_DEBUG:-}" == '1' ]]; then
      printf 'true\n'
    else
      printf 'false\n'
    fi
    ;;
  true | false)
    printf '%s\n' "$1"
    ;;
  *)
    printf '::error::debug must be auto, true, or false\n' >&2
    exit 2
    ;;
esac
