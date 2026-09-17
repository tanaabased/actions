# `run-leia`

Runs caller-provided Leia scenarios with explicit shell, retry, standard-input,
cleanup-header, and temporary-directory behavior. The action consumes an
existing Bun runtime and local Leia installation; runtime installation,
scenario setup, credentials, and assertions remain with the caller.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`) with Bash, and
Windows (`windows-2025`) with PowerShell.

## Usage

Install Leia in the caller's project before invoking the action.

```yaml
- name: Install Bun
  uses: tanaabased/actions/setup-bun@v1

- name: Install Leia
  run: bun install --frozen-lockfile --ignore-scripts

- name: Run documentation scenarios
  uses: tanaabased/actions/run-leia@v1
  with:
    scenarios: |
      README.md
      examples/**/*.md
    shell: bash
    retry: 0
    stdin: true
```

The action streams Leia's normal output. A failing Leia invocation fails the
action with the same exit code after removing its temporary directory.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `scenarios` | Yes | — | Newline-delimited scenario paths or glob patterns, relative to the caller's workspace unless absolute. |
| `shell` | Yes | — | Scenario shell: `bash` or `pwsh`. |
| `retry` | No | `0` | Non-negative number of retries for each failed test. |
| `stdin` | No | `true` | Whether Leia attaches standard input to scenario commands. |
| `cleanup-header` | No | — | Optional comma-separated H2 prefixes Leia treats as cleanup sections. |

Leia has no supported verbosity control.

Blank lines in `scenarios` are ignored. Each nonblank line is passed to Leia as
one argument, so glob patterns should remain quoted by YAML rather than expanded
by the workflow shell.

## Outputs

| Output | Description |
| --- | --- |
| `exit-code` | Exit code returned by Leia. |
| `temporary-directory` | Invocation-specific directory used beneath `RUNNER_TEMP` and removed before the action finishes. |

## Examples

### PowerShell with a custom cleanup heading

```yaml
- name: Run PowerShell scenarios
  uses: tanaabased/actions/run-leia@v1
  with:
    scenarios: examples/powershell.md
    shell: pwsh
    retry: 0
    stdin: false
    cleanup-header: Destroy tests
```

## Test behavior

PR tests run the supplied scenarios normally and cover success, failure,
temporary state, and cleanup on every supported runner. Caller scenarios must
avoid external side effects; see [common inputs](../README.md#common-inputs).

## Notes

### Temporary state and cleanup

Each invocation creates a unique directory beneath `RUNNER_TEMP`, exposes the
same path to Leia as `TMPDIR`, `TMP`, and `TEMP`, and removes it after Leia
finishes. Cleanup also runs after failure. If Leia and cleanup both fail, the
action reports both problems and preserves Leia's exit code; a cleanup failure
fails an otherwise successful invocation.

The action invokes the caller's local Leia installation with `bun run leia` and
passes scenario values without evaluating them as shell commands. Leia remains
responsible for expanding supported glob patterns and for executing the
commands contained in each scenario.
