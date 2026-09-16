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
  uses: oven-sh/setup-bun@v2

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
| `test-mode` | No | `false` | Run the normal local behavior without changing the contract. |
| `debug` | No | `auto` | Action diagnostics: `auto`, `true`, or `false`. |
| `scenarios` | Yes | — | Newline-delimited scenario paths or glob patterns, relative to the caller's workspace unless absolute. |
| `shell` | Yes | — | Scenario shell: `bash` or `pwsh`. |
| `retry` | No | `0` | Non-negative number of retries for each failed test. |
| `stdin` | No | `true` | Whether Leia attaches standard input to scenario commands. |
| `cleanup-header` | No | — | Optional comma-separated H2 prefixes Leia treats as cleanup sections. |

Set `debug: true` for extra action detail, or use GitHub's **Enable debug
logging** rerun option with `auto`. Explicit `true` or `false` overrides runner
debug. Leia exposes no supported verbosity control, so its invocation and retry
behavior are unchanged.

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

Leia scenario execution is already local and non-publishing, so
`test-mode: true` runs the normal action against the scenarios supplied by the
caller. Pull requests exercise real Leia fixtures and verify success, failure
propagation, temporary variables, custom cleanup headings, and removal of the
temporary directory on each supported runner.

Test mode is **not** a sandbox. Leia executes scenario commands as the workflow
runner, and arbitrary caller-provided scenarios can change files, install
software, use available credentials, or mutate external systems. Review
scenarios before running them; use non-mutating fixtures in pull requests.

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
