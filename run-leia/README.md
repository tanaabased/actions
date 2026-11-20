<h1 align="center">run-leia</h1>

<p align="center">
  <img src="icon.svg" alt="Lando planet logo" width="180" />
</p>

<p align="center">
  Run isolated Leia test scenarios.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-run-leia.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-run-leia.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

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

## Inputs

| Input            | Required | Default | Description                                                                                            |
| ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `debug`          | No       | `auto`  | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`.                          |
| `scenarios`      | Yes      | —       | Newline-delimited scenario paths or glob patterns, relative to the caller's workspace unless absolute. |
| `shell`          | Yes      | —       | Scenario shell: `bash` or `pwsh`.                                                                      |
| `retry`          | No       | `0`     | Non-negative number of retries for each failed test.                                                   |
| `stdin`          | No       | `true`  | Whether Leia attaches standard input to scenario commands.                                             |
| `cleanup-header` | No       | —       | Optional comma-separated H2 prefixes Leia treats as cleanup sections.                                  |

Leia has no supported verbosity control.

Supply one path or glob per line in `scenarios`. Blank lines are ignored.

## Outputs

| Output                | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `exit-code`           | Exit code returned by Leia.                                                                      |
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

## Notes

- Scenarios execute with the job’s permissions. Leia expands the glob patterns you supply.
- Leia uses an isolated temporary directory for each invocation. Cleanup runs even after a failure. If Leia and cleanup both fail, the action returns Leia’s exit code.
