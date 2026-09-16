#!/usr/bin/env bash

set -euo pipefail

action_name="${1:-}"
action_file="$action_name/action.yml"
resolver='scripts/resolve-debug.sh'

[[ -f "$action_file" ]] || {
  echo "missing action metadata: $action_file" >&2
  exit 1
}

test "$(RUNNER_DEBUG='' bash "$resolver" auto)" = false
test "$(RUNNER_DEBUG=1 bash "$resolver" auto)" = true
test "$(RUNNER_DEBUG=1 bash "$resolver" false)" = false
test "$(RUNNER_DEBUG='' bash "$resolver" true)" = true

sentinel='debug-sentinel-secret-value'
if resolver_error="$(bash "$resolver" "$sentinel" 2>&1)"; then
  echo 'unsupported debug input was accepted' >&2
  exit 1
fi
[[ "$resolver_error" != *"$sentinel"* ]] || {
  echo 'unsupported debug input was disclosed' >&2
  exit 1
}

awk '
  /^  debug:$/ { in_debug = 1; next }
  in_debug && /^  [^ ]/ { exit }
  in_debug && /default: auto/ { found = 1 }
  END { exit !found }
' "$action_file"
grep -Fq 'scripts/resolve-debug.sh' "$action_file"
! grep -Eq '(^|[[:space:]])set[[:space:]]+-[^[:space:]]*x' "$action_file"
