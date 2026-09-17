#!/usr/bin/env bash

set -euo pipefail

action_root="$(cd "$(dirname "$0")/.." && pwd)"
command_dir="$action_root/scripts"
# shellcheck source=setup-openclaw/scripts/lib/openclaw-common.sh
source "$command_dir/lib/openclaw-common.sh"
test_root="$(mktemp -d)"
test_root="$(cd "$test_root" && pwd -P)"
test_pid=''
cleanup() {
  if [[ -n "$test_pid" ]]; then
    kill "$test_pid" 2>/dev/null || true
    wait "$test_pid" 2>/dev/null || true
  fi
  rm -rf "$test_root"
}
trap cleanup EXIT

mkdir -p "$test_root/bin" "$test_root/workspace" "$test_root/state/openclaw" "$test_root/state/gateway"
printf 'profile=fixture\nworkspace=%s\n' "$test_root/workspace" > "$test_root/state/context"
cat > "$test_root/bin/openclaw" <<'SH'
#!/usr/bin/env bash
case "$*" in
  *'config get gateway.port') echo 19876 ;;
  *'config validate --json') echo 'error: token=diagnostic-sentinel-secret'; exit 17 ;;
  *'--version') echo fixture ;;
  *) exit 99 ;;
esac
SH
chmod +x "$test_root/bin/openclaw"
export PATH="$test_root/bin:$PATH" GITHUB_ACTIONS=true
context=(--profile fixture --workspace "$test_root/workspace" --state-dir "$test_root/state")
pid_path="$test_root/state/gateway/gateway.pid"

unset OPENCLAW_LOG_LEVEL
configure_debug false
test "$OPENCLAW_LOG_LEVEL" = warn
OPENCLAW_LOG_LEVEL=debug
configure_debug false
test "$OPENCLAW_LOG_LEVEL" = debug
unset OPENCLAW_LOG_LEVEL

# Every process used by this test belongs to this test; invalid records must never signal it.
sleep 120 &
test_pid=$!
started="$(gateway_process_start "$test_pid")"
for record in 0 1 -1 invalid 2147483648 999999999999999999999 01; do
  printf '%s\n%s\n' "$record" "$started" > "$pid_path"
  for operation in start wait stop; do
    if bash "$command_dir/openclaw-gateway" "$operation" "${context[@]}" > "$test_root/output" 2>&1; then
      echo "accepted invalid process record: $record ($operation)" >&2
      exit 1
    fi
    grep -Eq 'gateway PID|unowned' "$test_root/output"
    kill -0 "$test_pid"
  done
done

printf '%s\n' "$test_pid" > "$pid_path"
if bash "$command_dir/openclaw-gateway" stop "${context[@]}" > "$test_root/output" 2>&1; then exit 1; fi
grep -Fq 'gateway PID file is invalid' "$test_root/output"
kill -0 "$test_pid"

printf '%s\nstale start time\n' "$test_pid" > "$pid_path"
for operation in start wait stop; do
  if bash "$command_dir/openclaw-gateway" "$operation" "${context[@]}" > "$test_root/output" 2>&1; then
    echo "accepted reused process identity: $operation" >&2
    exit 1
  fi
  grep -Eq 'gateway PID|unowned' "$test_root/output"
  kill -0 "$test_pid"
done

printf '%s\n%s\n' "$test_pid" "$started" > "$pid_path"
gateway_state_dir="$test_root/state/gateway"
gateway_is_running
bash "$command_dir/openclaw-gateway" stop "${context[@]}" --timeout 5
wait "$test_pid" 2>/dev/null || true
test ! -f "$pid_path"
test_pid=''

# An HTTP 200 must not make an unusable CLI gateway appear ready.
node -e 'const http=require("node:http");const s=http.createServer((q,r)=>r.end("ok"));s.listen(0,"127.0.0.1",()=>console.log(s.address().port))' > "$test_root/port" &
test_pid=$!
for ((attempt=0; attempt<10; attempt++)); do
  [[ ! -s "$test_root/port" ]] || break
  sleep 0.1
done
node -e 'fetch("http://127.0.0.1:"+process.argv[1]+"/health").then(r=>{if(r.status!==200)process.exit(1)})' "$(cat "$test_root/port")"
printf '%s\n%s\n' "$test_pid" "$(gateway_process_start "$test_pid")" > "$pid_path"
if bash "$command_dir/openclaw-gateway" wait "${context[@]}" --timeout 1 > "$test_root/output" 2>&1; then
  echo 'HTTP health accepted without a successful CLI request' >&2
  exit 1
fi
grep -Fq 'did not become ready' "$test_root/output"
bash "$command_dir/openclaw-gateway" stop "${context[@]}" --timeout 5
wait "$test_pid" 2>/dev/null || true
test_pid=''

# A valid record for an exited child is removed without signaling anything else.
printf '%s\n%s\n' "$gateway_pid" "$started" > "$pid_path"
bash "$command_dir/openclaw-gateway" stop "${context[@]}" --timeout 5
test ! -f "$pid_path"

printf 'error: token=diagnostic-sentinel-secret\n' > "$test_root/state/gateway/gateway.log"
for setting in auto true false; do
  for runner_debug in '' 1; do
    set +e
    RUNNER_DEBUG="$runner_debug" bash "$command_dir/openclaw-diagnostics" \
      "${context[@]}" --debug "$setting" --exit-code 23 > "$test_root/output" 2>&1
    status=$?
    set -e
    test "$status" = 23
    grep -Fq 'configuration: invalid' "$test_root/output"
    grep -Fq '[REDACTED]' "$test_root/output"
    if grep -Fq 'diagnostic-sentinel-secret' "$test_root/output"; then exit 1; fi
    if [[ "$setting" == true || ( "$setting" == auto && "$runner_debug" == 1 ) ]]; then
      grep -Fq 'gateway log:' "$test_root/output"
    else
      if grep -Fq 'gateway log:' "$test_root/output"; then exit 1; fi
    fi
  done
done
for helper in openclaw-setup openclaw-gateway openclaw-diagnostics; do
  args=("${context[@]}" --debug diagnostic-sentinel-secret)
  [[ "$helper" != openclaw-gateway ]] || args=(diagnostics "${args[@]}")
  if bash "$command_dir/$helper" "${args[@]}" > "$test_root/output" 2>&1; then exit 1; fi
  if grep -Fq diagnostic-sentinel-secret "$test_root/output"; then exit 1; fi
done
echo 'Verified gateway process ownership, debug precedence, redaction, and failure status.'
