# `setup-openclaw`

Installs OpenClaw with a compatible Node.js runtime and provides helpers for
isolated OpenClaw and Agent System tests. Supports Linux (`ubuntu-24.04`) and
macOS (`macos-26`).

## Usage

### Install mode

Installs the CLI and adds the [CLI commands](#cli-commands) to `PATH`.
Selected when no setup inputs or `run` commands are supplied.

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3
```

### Setup mode

Installs the CLI and prepares an isolated test environment. Supplying any setup
input (`profile` through `yolo` in [Inputs](#inputs)), even an explicit `false`,
selects this mode.

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  id: openclaw
  with:
    version: 2026.9.3
    agent-system: 0.6.0
    needs-secret-service: true
    needs-ssh-key: true
    yolo: true
```

### Run mode

Installs the CLI, then executes `run` as Bash with `-eo pipefail`. Do not combine
`run` with setup inputs; pass setup options to the helper inside the block.
Version-selection inputs and `debug` work in all three modes.

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3
    run: |
      openclaw-setup --workspace "$RUNNER_TEMP/main"
      trap 'openclaw-gateway stop' EXIT
      openclaw-gateway start
      openclaw gateway call agents.list --json --timeout 3000
```

Use an isolated GitHub Actions runner. The action needs no publication credentials
or write permissions. Installation needs network access; source downloads need
repository read access. Linux Secret Service setup uses `sudo apt-get`.
Caller commands and source build scripts run with the job's permissions and credentials.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `debug` | `auto` | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. Also applies to later helpers. |
| `version` | `auto` | OpenClaw version or npm semver range; resolves to one exact published version. See [version selection](#version). |
| `package-json` | `package.json` | Workspace-relative or absolute manifest used by `version: auto`. |
| `package-field` | — | Dot-delimited manifest field overriding automatic discovery. |
| `run` | — | Bash commands to execute after installation; selects run mode. |
| `profile` | unique CI profile | Isolated profile name; cannot be `default`. |
| `workspace` | temporary context workspace | Absolute, non-root agent workspace. |
| `state-dir` | unique directory below `RUNNER_TEMP` | Absolute, non-root helper state directory. |
| `model` | — | `openai/model`; requires `OPENAI_API_KEY`. |
| `agent-system` | — | Exact version, local tarball/source, or repository ref. See [Agent System](#agent-system). |
| `needs-secret-service` | — (disabled) | `true` or `false`; prepare Linux Secret Service. Skipped on macOS. |
| `needs-ssh-key` | — (disabled) | `true` or `false`; create the SSH fixture. |
| `op-cache` | process-lifetime, 128 entries | Cache policy as a JSON object; requires `agent-system`. |
| `yolo` | — (disabled) | `true` or `false`; allow unattended execution in this isolated profile. |

### `version`

With `version: auto`, read `devDependencies.openclaw`, then `dependencies.openclaw`
from `package-json`. Both declarations must match when present; peer dependencies
are ignored. `package-field` selects a different field instead.

An explicit `version` bypasses manifest discovery. Dist-tags, URLs, invalid ranges,
missing declarations, and packages without `engines.node` fail. The action installs
Node.js to satisfy the resolved OpenClaw package's requirement.

### `agent-system`

| Selector | Source |
| --- | --- |
| `0.6.0` | Exact published `@tanaab/openclaw-agent-system` version; ranges and dist-tags are rejected. |
| `/absolute/plugin.tgz`, `./plugin.tgz`, `file:plugin.tgz` | Existing npm tarball, installed without rebuilding. |
| `.`, `./checkout`, `/absolute/checkout`, `file:checkout` | Existing source directory, staged without changing the checkout. |
| `github:tanaabased/openclaw-agent-system#<ref>` | Repository source; the ref resolves to a recorded commit. |

Missing paths fail. Source packages must declare the correct package name, an
exact version, exact `bun@` package manager, `bun.lock`, `build`, and `plugin:check`.
The build excludes `.git`, `node_modules`, and `dist`, installs frozen dependencies
with lifecycle scripts disabled, then builds, checks, and packs the package.
Action setup installs the required Bun version; later helper calls require it
already on `PATH`.

Installation authorizes capabilities and conversation hooks, applies `op-cache`,
and verifies the loaded runtime and artifact provenance.

## Outputs

Context outputs are available in every mode. Agent System and fixture outputs
are populated by setup mode when requested; helper calls inside `run` own any
additional output contract.

| Output | Description |
| --- | --- |
| `mode` | Selected mode: `install`, `setup`, or `run`. |
| `version` | Exact installed OpenClaw version. |
| `executable-path` | Absolute OpenClaw executable path; its directory is added to `PATH`. |
| `helper-path` | CLI command directory, added to `PATH`. |
| `profile` | Isolated OpenClaw profile name. |
| `workspace` | Absolute agent workspace. |
| `state-dir` | Absolute helper state directory. |
| `config-path` | Absolute OpenClaw configuration path; the file is created during setup. |
| `gateway-log-path` | Absolute raw gateway log path; the file is created when the gateway starts and may contain sensitive data. |
| `agent-system-version` | Exact installed Agent System version. |
| `agent-system-source` | Resolved package, local path, or repository commit. |
| `agent-system-artifact-path` | Verified Agent System npm tarball. |
| `agent-system-plugin-path` | Loaded Agent System plugin directory. |
| `private-key-path` | SSH private-key path; never key contents. |
| `public-key-path` | SSH public-key path. |
| `dbus-address` | Linux Secret Service D-Bus address. |
| `secret-service-home` | Isolated Linux Secret Service home. |

### Environment for later steps

The action establishes context and fixture addresses before caller commands run.
Successful helpers export their results through `GITHUB_ENV` for later steps.

| Variable | Value |
| --- | --- |
| `OPENCLAW_PROFILE` | Selected profile. |
| `OPENCLAW_WORKSPACE` | Agent workspace. |
| `SETUP_OPENCLAW_STATE_DIR` | Helper state directory. |
| `OPENCLAW_STATE_DIR` | OpenClaw state beneath the helper state directory. |
| `OPENCLAW_CONFIG_PATH` | OpenClaw configuration path. |
| `OPENCLAW_GATEWAY_LOG_PATH` | Raw gateway log path; contents are not exported and may contain sensitive data. |
| `AGENT_SYSTEM_VERSION` | Installed Agent System version. |
| `AGENT_SYSTEM_SOURCE` | Resolved Agent System provenance. |
| `AGENT_SYSTEM_ARTIFACT_PATH` | Agent System npm tarball. |
| `AGENT_SYSTEM_PLUGIN_PATH` | Loaded plugin directory. |
| `SSH_PRIVATE_KEY_PATH` | SSH private-key path. |
| `SSH_PUBLIC_KEY_PATH` | SSH public-key path. |
| `DBUS_SESSION_BUS_ADDRESS` | Selected Linux D-Bus address. |
| `SECRET_SERVICE_HOME` | Isolated Linux Secret Service home. |

A helper cannot update its parent shell's environment. After overriding a profile
or state directory, pass that context to subsequent commands in the same shell.
Gateway and diagnostic helpers read the saved profile/workspace, including after
a workspace change in Leia; explicit flags take precedence.
An explicit non-empty `OPENCLAW_LOG_LEVEL` also takes precedence over the helper's
debug setting; otherwise helpers select `debug` or `warn` from that setting.

## CLI commands

The action adds these commands to `PATH` for the rest of the job. They require
GitHub Actions and share the action's context.

### `openclaw-setup`

Onboard the isolated profile and prepare optional Agent System, model, and fixtures.
It does not start the gateway.

```sh
openclaw-setup [options]
```

| Option | Default | Description |
| --- | --- | --- |
| `--profile <name>` | `OPENCLAW_PROFILE` | Isolated, non-default profile. |
| `--workspace <path>` | `OPENCLAW_WORKSPACE` | Absolute, non-root agent workspace. |
| `--state-dir <path>` | `SETUP_OPENCLAW_STATE_DIR` | Absolute directory containing helper state and saved context. |
| `--agent-system <selector>` | — | Install from any [Agent System selector](#agent-system). |
| `--model <openai/model>` | — | Authenticate with `OPENAI_API_KEY` and select a model. |
| `--needs-secret-service [boolean]` | `false` | Prepare Linux Secret Service; skip on macOS. |
| `--needs-ssh-key [boolean]` | `false` | Create `~/.ssh/big-test-bucket-ssh` and its public key. |
| `--op-cache <json>` | process-lifetime, 128 entries | Agent System cache policy; requires `--agent-system`. |
| `--yolo [boolean]` | `false` | Enable unattended execution in this profile. |
| `--debug <value>` | `SETUP_OPENCLAW_DEBUG` or `auto` | `auto`, `true`, or `false`; `auto` follows `RUNNER_DEBUG=1`. |
| `-h`, `--help` | — | Display command help. |

Boolean flags accept `true` or `false`; a bare flag means `true`. Unknown or repeated
options fail. Without action context, supply `--profile`, `--workspace`, and
`--state-dir`.

Setup skips channels, daemon installation, hooks, and skills. Provider authentication
runs only when a model is requested; Agent System adds its own hooks. GPT-5.4
models use direct Codex tool loading.

### `openclaw-gateway`

Manage the gateway belonging to the saved profile and workspace.

```sh
openclaw-gateway <command> [options]
```

| Command | Description |
| --- | --- |
| `start` | Start the gateway and wait for a successful CLI `agents.list` request. |
| `wait` | Wait for an already-started gateway to pass the same readiness check. |
| `restart` | Stop, then start the gateway. |
| `stop` | Stop the owned gateway; leave fixtures available for later scenarios. |
| `diagnostics` | Print bounded, redacted gateway evidence. |

| Option | Default | Description |
| --- | --- | --- |
| `--profile <name>` | Saved profile, then `OPENCLAW_PROFILE` | Select and verify the isolated profile. |
| `--workspace <path>` | Saved workspace, then `OPENCLAW_WORKSPACE` | Select and verify the absolute agent workspace. |
| `--state-dir <path>` | `SETUP_OPENCLAW_STATE_DIR` | Absolute directory containing helper state and saved context. |
| `--timeout <seconds>` | `90`; `30` for `stop` | Positive integer bounding readiness or shutdown; `restart` applies it to each phase. |
| `--debug <value>` | `SETUP_OPENCLAW_DEBUG` or `auto` | `auto`, `true`, or `false`; `auto` follows `RUNNER_DEBUG=1`. |
| `-h`, `--help` | — | Display command help. |

The gateway binds to loopback and keeps onboarding's authentication; its token is
never an action output. Helpers verify process ownership before signaling it.
A failed start prints diagnostics, stops its process, and preserves the failure.

### `openclaw-diagnostics`

Report the OpenClaw version, configuration validity, and bounded, redacted gateway
evidence. Use `--exit-code` to retain the failure that prompted diagnostics.

```sh
openclaw-diagnostics [options]
```

| Option | Default | Description |
| --- | --- | --- |
| `--profile <name>` | Saved profile, then `OPENCLAW_PROFILE` | Select and verify the isolated profile. |
| `--workspace <path>` | Saved workspace, then `OPENCLAW_WORKSPACE` | Select and verify the absolute agent workspace. |
| `--state-dir <path>` | `SETUP_OPENCLAW_STATE_DIR` | Absolute directory containing helper state and saved context. |
| `--exit-code <code>` | `0` | Exit with this integer from `0` through `255` after reporting. |
| `--debug <value>` | `SETUP_OPENCLAW_DEBUG` or `auto` | `auto`, `true`, or `false`; `auto` follows `RUNNER_DEBUG=1`. |
| `-h`, `--help` | — | Display command help. |

## Notes

- SSH fixtures use mode `600` for the private key and `644` for the public key.
  Existing files or symlinks are rejected.
- Linux Secret Service uses an isolated home and disposable D-Bus socket. An
  existing `DBUS_SESSION_BUS_ADDRESS` must select an unused absolute `unix:path=` socket.
- Fixtures last for the runner job. Failed setup stops services it started and
  removes its new SSH key. Source staging is removed; successful tarballs and
  diagnostic state remain for inspection.
- `setup-agent-system` is retired. Use the `agent-system` input or
  `openclaw-setup --agent-system`; the old `version` maps to `agent-system`, and
  `source-directory` maps to an explicit local directory selector.

## Test behavior

The action always performs normal installation and setup; it has no dry-run switch.
PR checks cover all three modes on Linux/macOS, Agent System source forms, fixtures,
helper context, gateway readiness, invalid inputs, diagnostics, and failure cleanup.
Local contract tests use controlled commands; PR integration tests install real
packages. Model-provider authentication and consumer scenarios require live
consumer validation.
