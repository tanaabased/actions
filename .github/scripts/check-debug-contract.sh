#!/usr/bin/env bash

set -euo pipefail

action_name="${1:-}"
action_file="$action_name/action.yml"
resolver='.lib/resolve-debug.sh'

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
grep -Fq '.lib/resolve-debug.sh' "$action_file"
if grep -Eq '(^|[[:space:]])set[[:space:]]+-[^[:space:]]*x' "$action_file"; then exit 1; fi

# Execute the checked-in shell blocks, without installing tools or invoking publishers.
extract_run() {
  awk -v marker="$1" '
    /^    - / { selected = index($0, marker) > 0; in_run = 0 }
    selected && /^      run: \|/ { in_run = 1; next }
    in_run && /^        / { print substr($0, 9); next }
    in_run && /^$/ { print; next }
    in_run { exit }
  ' "$action_file"
}

test_root="$(mktemp -d)"
trap 'rm -rf "$test_root"' EXIT
extract_run 'id: debug' > "$test_root/debug.sh"
test -s "$test_root/debug.sh"
case "$action_name" in
  setup-node | setup-bun) failure_step='id: resolve'; failure_message='Runtime version in input must be a nonempty single-line string' ;;
  npm-pack) failure_step='id: pack'; failure_message='No such file or directory' ;;
  prepare-release | publish-repo) failure_step='id: release-date'; failure_message='release-date must be a valid date' ;;
  publish-npm) failure_step='id: package'; failure_message='npm tarball does not exist' ;;
  publish-clawhub) failure_step='id: inputs'; failure_message='ClawHub tarball does not exist' ;;
  publish-codex-plugin | validate-codex-plugin) failure_step='id: inputs'; failure_message='plugin-directory does not exist' ;;
  setup-openclaw) failure_step='id: resolve'; failure_message='OpenClaw version resolution failed' ;;
  ssh-test-key) failure_step='id: generate'; failure_message='SSH test-key destination already exists' ;;
  vitepress-build-check) failure_step='name: Validate inputs'; failure_message='build-command must not be empty' ;;
  run-leia) failure_step='id: run-bash'; failure_message='retry must be a non-negative integer' ;;
  *) echo "missing failure case for $action_name" >&2; exit 1 ;;
esac
failure_shell=bash
if [[ "$action_name" == run-leia && "${RUNNER_OS:-}" == Windows ]]; then
  failure_step='id: run-pwsh'
  failure_shell=pwsh
fi
extract_run "$failure_step" > "$test_root/failure"
test -s "$test_root/failure"
printf 'unchanged fixture\n' > "$test_root/existing-key"

GITHUB_ACTION_PATH="$(cd "$action_name" && pwd)"
export GITHUB_ACTION_PATH
export GITHUB_WORKSPACE="$test_root" RUNNER_TEMP="$test_root"
export GITHUB_OUTPUT="$test_root/outputs" GITHUB_ENV="$test_root/environment"
export NODE_AUTH_TOKEN="$sentinel" GH_TOKEN="$sentinel" CLAWHUB_TOKEN="$sentinel"
export DRY_RUN=true PACKAGE_DIRECTORY="$test_root/missing" TARBALL="$test_root/missing.tgz"
export RELEASE_DATE=invalid DEPENDENCY_POLICY=exclude-node-modules ARCHIVE_NAME=fixture.tar.gz
export PLUGIN_DIRECTORY="$test_root/missing" RELEASE_TAG=fixture REPOSITORY=fixture/fixture
export SELECTED_VERSION='' SOURCE_DIRECTORY='' PACKAGE_JSON=missing.json PACKAGE_FIELD='' VERSION_SPEC=auto
export COMMENT=fixture DESTINATION="$test_root/existing-key" BUILD_COMMAND=''
export RUNTIME="${action_name#setup-}" RUNTIME_VERSION='' PROJECT_DIRECTORY="$test_root"
export RETRY=invalid STDIN=false SCENARIOS=fixture CLEANUP_HEADER=''
export OWNER=fixture SOURCE_COMMIT=fixture SOURCE_REPO=fixture/fixture TAGS=edge WAIT_TIMEOUT=1

baseline_status=''
for setting in auto true false; do
  for runner_debug in '' 1; do
    : > "$GITHUB_OUTPUT"
    : > "$GITHUB_ENV"
    export RUNNER_DEBUG="$runner_debug" DEBUG_INPUT="$setting"
    enabled=false
    if [[ "$setting" == true || ( "$setting" == auto && "$runner_debug" == 1 ) ]]; then enabled=true; fi
    bash -eo pipefail "$test_root/debug.sh" > "$test_root/log" 2>&1
    test "$(cat "$GITHUB_OUTPUT")" = "enabled=$enabled"
    if [[ "$enabled" == true ]]; then
      grep -Fq 'Diagnostics enabled' "$test_root/log"
    else
      test ! -s "$test_root/log"
    fi
    if [[ "$action_name" == setup-openclaw ]]; then
      test "$(cat "$GITHUB_ENV")" = "SETUP_OPENCLAW_DEBUG=$enabled"
    else
      test ! -s "$GITHUB_ENV"
    fi
    export ACTION_DEBUG="$enabled" SETUP_OPENCLAW_DEBUG="$enabled"
    : > "$GITHUB_OUTPUT"
    set +e
    if [[ "$failure_shell" == pwsh ]]; then
      pwsh -NoProfile -NonInteractive -Command "$(cat "$test_root/failure")" >> "$test_root/log" 2>&1
    else
      bash -eo pipefail "$test_root/failure" >> "$test_root/log" 2>&1
    fi
    status=$?
    set -e
    test "$status" != 0
    baseline_status="${baseline_status:-$status}"
    test "$status" = "$baseline_status"
    grep -Fq "$failure_message" "$test_root/log"
    test ! -s "$GITHUB_OUTPUT"
    if grep -Fq "$sentinel" "$test_root/log"; then exit 1; fi
    test "$(cat "$test_root/existing-key")" = 'unchanged fixture'
    test ! -e "$test_root/existing-key.pub"
  done
done

: > "$GITHUB_OUTPUT"
if DEBUG_INPUT="$sentinel" bash -eo pipefail "$test_root/debug.sh" > "$test_root/log" 2>&1; then exit 1; fi
grep -Fq 'debug must be auto, true, or false' "$test_root/log"
if grep -Fq "$sentinel" "$test_root/log"; then exit 1; fi
test ! -s "$GITHUB_OUTPUT"
echo "Verified $action_name debug output, precedence, invalid input, and failure invariants."
