# shellcheck shell=bash

error_message() {
  printf 'error: %s\n' "$1" >&2
}

error() {
  local message="$1"
  local exit_code="${2:-1}"

  error_message "$message"
  exit "$exit_code"
}

require_positive_integer() {
  local label="$1"
  local value="$2"

  if [[ ! "$value" =~ ^[1-9][0-9]*$ ]]; then
    error "$label must be a positive integer: $value" 2
  fi
}

configure_debug() {
  local setting="${1:-auto}"

  case "$setting" in
    auto)
      if [[ "${RUNNER_DEBUG:-}" == '1' ]]; then
        debug_enabled=true
      else
        debug_enabled=false
      fi
      ;;
    true | false)
      debug_enabled="$setting"
      ;;
    *)
      error "debug must be auto, true, or false: $setting" 2
      ;;
  esac

  if [[ "$debug_enabled" == 'true' ]]; then
    export OPENCLAW_LOG_LEVEL=debug
  else
    export OPENCLAW_LOG_LEVEL=warn
  fi
}

debug() {
  if [[ "${debug_enabled:-false}" == 'true' ]]; then
    printf 'debug: %s\n' "$*" >&2
  fi
}

require_github_actions() {
  [[ "${GITHUB_ACTIONS:-}" == 'true' ]] || error 'this command may run only in GitHub Actions'
}

configure_context() {
  local requested_profile="$1"
  local requested_workspace="$2"
  local requested_state_dir="$3"
  local create_paths="${4:-false}"

  [[ -n "$requested_profile" ]] || error '--profile is required' 2
  [[ "$requested_profile" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || error "profile contains unsupported characters: $requested_profile" 2
  [[ "$requested_profile" != 'default' ]] || error 'profile must name an isolated non-default profile' 2
  [[ "$requested_workspace" == /* && "$requested_workspace" != '/' ]] || error "workspace must be an absolute non-root path: $requested_workspace" 2
  [[ "$requested_state_dir" == /* && "$requested_state_dir" != '/' ]] || error "state directory must be an absolute non-root path: $requested_state_dir" 2
  [[ "$requested_workspace" != *$'\n'* && "$requested_state_dir" != *$'\n'* ]] || error 'workspace and state directory must not contain newlines' 2

  if [[ "$create_paths" == 'true' ]]; then
    mkdir -p "$requested_workspace" "$requested_state_dir"
  fi
  [[ -d "$requested_workspace" ]] || error "workspace directory does not exist: $requested_workspace"
  [[ -d "$requested_state_dir" ]] || error "state directory does not exist: $requested_state_dir"

  profile="$requested_profile"
  workspace="$(cd "$requested_workspace" && pwd -P)"
  state_dir="$(cd "$requested_state_dir" && pwd -P)"
  openclaw_state_dir="$state_dir/openclaw"
  openclaw_config_path="$openclaw_state_dir/openclaw.json"
  gateway_state_dir="$state_dir/gateway"
  context_path="$state_dir/context"
  mkdir -p "$openclaw_state_dir" "$gateway_state_dir"
}

write_context() {
  printf 'profile=%s\nworkspace=%s\n' "$profile" "$workspace" > "$context_path"
}

verify_context() {
  local saved_profile
  local saved_workspace

  [[ -f "$context_path" ]] || error "isolated setup context is missing: $context_path"
  saved_profile="$(sed -n 's/^profile=//p' "$context_path")"
  saved_workspace="$(sed -n 's/^workspace=//p' "$context_path")"
  [[ "$saved_profile" == "$profile" ]] || error "profile does not match isolated setup context: $profile"
  [[ "$saved_workspace" == "$workspace" ]] || error "workspace does not match isolated setup context: $workspace"
}

run_openclaw() {
  OPENCLAW_CONFIG_PATH="$openclaw_config_path" \
    OPENCLAW_STATE_DIR="$openclaw_state_dir" \
    command openclaw --profile "$profile" "$@"
}

redact_stream() {
  node "$command_dir/lib/redact-stream.mjs"
}

read_gateway_pid() {
  pid_path="$gateway_state_dir/gateway.pid"
  [[ -f "$pid_path" ]] || return 1
  gateway_pid="$(sed -n '1p' "$pid_path")"
  [[ "$gateway_pid" =~ ^[0-9]+$ ]] || return 1
}

gateway_is_running() {
  read_gateway_pid || return 1
  kill -0 "$gateway_pid" 2>/dev/null || return 1
}

print_gateway_diagnostics() {
  local log_path="$gateway_state_dir/gateway.log"
  local call_log_path="$gateway_state_dir/gateway-call.log"

  printf 'OpenClaw gateway diagnostics\n' >&2
  if gateway_is_running; then
    printf 'gateway process: running (pid %s)\n' "$gateway_pid" >&2
  elif [[ -f "$gateway_state_dir/gateway.pid" ]]; then
    printf 'gateway process: stale or invalid PID file\n' >&2
  else
    printf 'gateway process: stopped\n' >&2
  fi

  if [[ -f "$call_log_path" ]]; then
    printf 'latest readiness failure:\n' >&2
    tail -n 20 "$call_log_path" | redact_stream >&2
  fi
  if [[ -f "$log_path" ]]; then
    printf 'recent gateway warnings and errors:\n' >&2
    grep -E '(^|[^[:alpha:]])(warn|WARN|error|ERROR|fatal|FATAL)([^[:alpha:]]|$)' "$log_path" \
      | tail -n 40 | redact_stream >&2 || true
    if [[ "${debug_enabled:-false}" == 'true' ]]; then
      printf 'gateway log: %s bytes at %s\n' "$(wc -c < "$log_path" | tr -d ' ')" "$log_path" >&2
    fi
  fi
}
