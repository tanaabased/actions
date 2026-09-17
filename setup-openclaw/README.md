# `setup-openclaw`

Installs an exact OpenClaw CLI with a compatible Node.js runtime and exposes one
helper suite for isolated OpenClaw and Agent System tests. Runs on Linux
(`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

Install the CLI and helpers for later commands:

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3
```

Select a setup input to prepare the harness in the action step:

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

Or run caller-owned commands after installation:

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3
    run: |
      openclaw-setup --workspace "$RUNNER_TEMP/main"
      openclaw-gateway start
      openclaw gateway call agents.list --json --timeout 3000
      openclaw-gateway stop
```

The action needs no publication credentials or write permissions. Model setup
requires the caller's `OPENAI_API_KEY`; source downloads need repository read
access and dependency installation needs network access. Linux Secret Service
setup uses `sudo apt-get` on the supported Ubuntu runner. Arbitrary `run`
commands and source build scripts execute with the job's permissions and
credentials; the action does not sandbox them.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `debug` | `auto` | [Common diagnostics](../README.md#common-inputs); also applies to later helpers. |
| `version` | `auto` | Exact OpenClaw version or npm semver range; ranges resolve to one exact published version. |
| `package-json` | `package.json` | Workspace-relative or absolute manifest for automatic OpenClaw selection. |
| `package-field` | — | Dot-delimited field overriding automatic manifest discovery. |
| `run` | — | Multiline Bash commands, run after installation with `-eo pipefail`. |
| `profile` | unique CI profile | Isolated non-default profile. |
| `workspace` | temporary context workspace | Absolute agent workspace. |
| `state-dir` | unique directory below `RUNNER_TEMP` | Absolute helper state directory. |
| `model` | — | `openai/model`; authenticates with `OPENAI_API_KEY` and selects the model. |
| `agent-system` | — | Exact published version, local package/source, or explicit repository ref. |
| `needs-secret-service` | — | `true` prepares Linux Secret Service; `false` disables it. Skipped on macOS. |
| `needs-ssh-key` | — | `true` creates the SSH fixture; `false` disables it. |
| `op-cache` | process-lifetime, 128 entries | Agent System cache JSON object; requires `agent-system`. |
| `yolo` | — | `true` enables unattended execution in this isolated profile; `false` disables it. |

No orchestration inputs selects **install** mode. Any explicitly supplied setup
input (`profile` through `yolo`, including an explicit `false`) selects **setup**
mode. Nonblank `run` selects **run** mode. Mixing `run` with setup inputs fails
before installation or fixture creation. Version-selection inputs and `debug`
are common to all modes. There is no `test-mode` or `dry-run` switch.

Automatic OpenClaw selection reads `devDependencies.openclaw`, then
`dependencies.openclaw`; both must match when present. It ignores peer
dependencies. An explicit `package-field` replaces that discovery. An explicit
`version` wins even if the manifest is absent or conflicting. Dist-tags, URLs,
invalid ranges, missing declarations, and packages without `engines.node` fail.
The action installs a Node.js runtime satisfying the resolved OpenClaw package.

Agent System selection is deliberately unambiguous:

| Form | Meaning |
| --- | --- |
| `0.6.0` | Exact published `@tanaab/openclaw-agent-system` version; no ranges or dist-tags. |
| `/absolute/plugin.tgz`, `./plugin.tgz`, `file:plugin.tgz` | Existing npm tarball, installed directly. |
| `.`, `./checkout`, `/absolute/checkout`, `file:checkout` | Existing source directory, staged without modifying the checkout. |
| `github:tanaabased/openclaw-agent-system#<ref>` | Explicit repository source; resolves the ref to a recorded commit before building. |

Missing paths never fall back to npm or GitHub. Source packages must declare the
correct package identity, an exact version, exact `bun@` package manager,
`bun.lock`, `build`, and `plugin:check`. Builds exclude `.git`, `node_modules`,
and `dist`, install frozen dependencies with lifecycle scripts disabled, then
run the declared build/check and pack. Action setup provisions the source's Bun
version through `setup-bun`; later source-helper calls require that Bun version
already on `PATH`. A prebuilt local tarball avoids rebuilding consumer artifacts.

## Outputs

| Output | Description |
| --- | --- |
| `mode` | `install`, `setup`, or `run`. |
| `version` | Exact installed OpenClaw version. |
| `executable-path`, `helper-path` | Installed CLI and public helper directory, added to `PATH`. |
| `profile`, `workspace`, `state-dir`, `config-path` | Isolated context; configuration is created during setup. |
| `agent-system-version`, `agent-system-source` | Installed package version and resolved provenance. |
| `agent-system-artifact-path`, `agent-system-plugin-path` | Verified npm tarball and loaded plugin directory. |
| `private-key-path`, `public-key-path` | SSH fixture paths; never private-key contents. |
| `dbus-address`, `secret-service-home` | Linux Secret Service address and isolated home. |

Agent System and fixture outputs describe setup mode. A caller's `run` block
may invoke helpers multiple times and owns any additional output contract.
Helpers export successful setup results to later steps through `GITHUB_ENV`:
`OPENCLAW_PROFILE`, `OPENCLAW_WORKSPACE`, `OPENCLAW_CONFIG_PATH`,
`OPENCLAW_STATE_DIR`, `SETUP_OPENCLAW_STATE_DIR`, `AGENT_SYSTEM_VERSION`,
`AGENT_SYSTEM_SOURCE`, `AGENT_SYSTEM_ARTIFACT_PATH`, `AGENT_SYSTEM_PLUGIN_PATH`,
`SSH_PRIVATE_KEY_PATH`, `SSH_PUBLIC_KEY_PATH`, `DBUS_SESSION_BUS_ADDRESS`, and
`SECRET_SERVICE_HOME`.

All modes establish default context and fixture addresses before caller commands
run, so plain `openclaw` and helpers share that context within the same shell.
Explicit helper profile/state overrides apply to that helper and later steps;
commands in the current parent shell must also use the overridden context.
Gateway and diagnostic helpers read the saved profile/workspace unless explicit
flags override them, including immediately after a workspace change in Leia.

## Examples

### Later Leia helper invocation

Install the action before the consumer's existing Leia command. A scenario can
then use the same setup implementation with a previously packed plugin:

```bash
openclaw-setup \
  --workspace "$TMPDIR/main" \
  --agent-system "$AGENT_SYSTEM_PACKAGE" \
  --needs-secret-service \
  --needs-ssh-key \
  --yolo
openclaw-gateway start
openclaw gateway call agents.list --json --timeout 3000
openclaw-gateway stop
```

Keep the consumer's Leia invocation, model fixtures, diagnostic commands,
permissions, and matrix. This example documents the helper contract.

### Model setup

```yaml
- uses: tanaabased/actions/setup-openclaw@v1
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  with:
    version: 2026.9.3
    model: openai/gpt-5.4-nano
```

## Test behavior

PR checks exercise normal isolated installation and setup on Linux/macOS,
install and run modes, direct action and later-helper usage, exact-version,
local-tarball, source-directory and repository selection, source preservation,
Linux Secret Service readback, SSH fixtures, CLI readiness, process ownership,
invalid inputs, debug precedence, redaction, and original failure status.

Local contract tests use controlled command fixtures. They do not prove hosted
installation or provider access. PR integration checks use real OpenClaw and
Agent System packages without publishing or calling a model provider. Live
provider authentication and consumer scenarios remain consumer lifecycle proof.

## Notes

### Public helpers

- `openclaw-setup [options]`: action setup inputs have matching flags. Boolean
  flags accept `true|false` and default to `true` when supplied without a value.
  `--debug` accepts `auto|true|false`. Repeated and unknown flags fail.
- `openclaw-gateway <start|wait|restart|stop|diagnostics> [--timeout <seconds>]`:
  readiness requires a successful CLI `agents.list` request. Start/wait default
  to 90 seconds; stop defaults to 30. Failed starts report evidence, stop the
  owned process, and preserve the readiness failure.
- `openclaw-diagnostics [--exit-code <0-255>]`: reports bounded redacted evidence
  and preserves a supplied original failure code.

Every helper accepts `--profile`, `--workspace`, `--state-dir`, and
`--debug auto|true|false`; otherwise it uses the action context. Helpers require
GitHub Actions. Files in `scripts/lib/` are private implementation details.
Gateway helpers verify the recorded profile/workspace and PID start time before
signaling a process. The gateway binds to loopback with authentication disabled;
use this harness only on an isolated test runner.

Setup skips channels, daemon installation, hooks, skills, and provider
authentication unless a model was requested. GPT-5.4 models retain the former
helper's direct Codex tool-loading configuration. Agent System installation
authorizes capabilities and conversation hooks, sets the requested cache policy,
and verifies configuration, loaded runtime, artifact provenance, and typed hooks.
YOLO is opt-in.

SSH setup creates `$HOME/.ssh/big-test-bucket-ssh` with mode `600` and its public
key with mode `644`; existing files or symlinks are rejected. Linux Secret Service
uses an isolated home and a disposable D-Bus socket, respecting an existing
`DBUS_SESSION_BUS_ADDRESS` selection. Fixture services live for the runner job;
failed setup stops services it started and removes its new SSH key. Gateway
`stop` leaves successful fixtures available for later scenarios. Source staging
is removed; successful tarballs and diagnostic state remain for inspection.

`setup-agent-system` is retired. Use `setup-openclaw` with `agent-system` or
invoke `openclaw-setup --agent-system` after install-only setup. The former
`version` maps to `agent-system`, and `source-directory` maps to an explicit
local directory selector. Consumers must migrate before using the revised ref.
