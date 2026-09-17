# `setup-openclaw`

Installs one exact OpenClaw CLI version with a compatible Node.js runtime and
exposes opt-in helpers for isolated CI setup, gateway lifecycle, and bounded
diagnostics. Installation is the default; none of the helpers run unless a
later caller step invokes them.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

Pin the version explicitly when the workflow owns the tested version:

```yaml
- name: Install OpenClaw
  id: openclaw
  uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3
```

The default `version: auto` reads `devDependencies.openclaw`, then
`dependencies.openclaw`, from `package-json`. If both fields are present, their
declarations must match. Automatic selection ignores `peerDependencies` and
requires an explicit version if neither installation field is present.

```yaml
- name: Install the package-tested OpenClaw version
  id: openclaw
  uses: tanaabased/actions/setup-openclaw@v1
  with:
    package-json: package.json
```

Set `package-field` to a dot-delimited field when the project intentionally
stores its tested version somewhere else. That explicit override reads only the
selected field. An explicit `version` always wins and does not require
`package-json` to exist, even when the manifest's automatic declarations
conflict.

The accepted explicit value is an exact semantic version or npm
semantic-version range, not a dist-tag or URL. A range resolves through npm to
the highest matching published version at run time; the exact result is
returned as `version` and installed. Pin an exact version for reproducibility.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Must be `true` or `false`; both values perform the same real local installation. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `version` | No | `auto` | `auto`, an exact OpenClaw semantic version, or a range. An explicit version overrides package selection. |
| `package-json` | No | `package.json` | Package manifest used only when `version` is `auto`; relative paths resolve from the workspace. |
| `package-field` | No | — | Optional dot-delimited field that replaces automatic `devDependencies`/`dependencies` discovery. |

The action rejects missing files, invalid JSON, missing or non-string fields,
conflicting automatic declarations, tags such as `latest`, URLs, invalid
ranges, ranges with no published match, and packages without a declared
`engines.node` requirement. It installs a Node.js version satisfying the
selected OpenClaw package's requirement before installing the exact resolved
package.

The resolved debug value persists for later helpers; an explicit helper
`--debug` value takes precedence.

## Outputs

| Output | Description |
| --- | --- |
| `version` | Exact installed OpenClaw version after range resolution. |
| `executable-path` | Absolute path to the installed `openclaw` executable. |
| `helper-path` | Absolute directory containing the supported helper commands. |

The action adds the executable directory and `helper-path` to `GITHUB_PATH`, so
later steps can call `openclaw`, `openclaw-setup`, `openclaw-gateway`, and
`openclaw-diagnostics` by name.

## Examples

### Isolated gateway lifecycle

Every helper call names the same non-default profile, absolute workspace, and
absolute state directory. `openclaw-setup` records that context; the other
helpers reject mismatches instead of quietly operating on somebody else's
profile.

```yaml
- name: Install OpenClaw
  uses: tanaabased/actions/setup-openclaw@v1
  with:
    test-mode: true
    version: 2026.9.3

- name: Prepare isolated OpenClaw
  shell: bash
  run: |
    openclaw-setup \
      --profile ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT} \
      --workspace "$RUNNER_TEMP/openclaw-workspace" \
      --state-dir "$RUNNER_TEMP/openclaw-state"

- name: Start and inspect the gateway
  shell: bash
  run: |
    openclaw-gateway start \
      --profile ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT} \
      --workspace "$RUNNER_TEMP/openclaw-workspace" \
      --state-dir "$RUNNER_TEMP/openclaw-state" \
      --timeout 90
    openclaw-diagnostics \
      --profile ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT} \
      --workspace "$RUNNER_TEMP/openclaw-workspace" \
      --state-dir "$RUNNER_TEMP/openclaw-state"

- name: Stop the gateway
  if: always()
  shell: bash
  run: |
    openclaw-gateway stop \
      --profile ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT} \
      --workspace "$RUNNER_TEMP/openclaw-workspace" \
      --state-dir "$RUNNER_TEMP/openclaw-state" \
      --timeout 30
```

## Test behavior

Test mode runs normal resolution, Node.js setup, CLI installation, and any
caller-invoked helpers. PR tests on Linux and macOS cover version selection,
invalid inputs, exported helpers, gateway readiness, and cleanup.

Setup skips provider authentication, channels, hooks, skills, and daemon
installation. The isolated gateway binds to loopback without authentication;
these checks do not prove model-provider access.

## Notes

### Supported helper interface

Only these executable commands are public. Files below `scripts/lib/` are
private implementation details and may change without notice.

#### `openclaw-setup`

```text
openclaw-setup --profile <name> --workspace <path> --state-dir <path> [--debug <auto|true|false>]
```

Creates the workspace and state directory when needed, performs unattended
local onboarding with provider authentication skipped, validates the generated
configuration, and records the isolated context for later helpers. After
successful setup it exports `OPENCLAW_PROFILE`, `OPENCLAW_CONFIG_PATH`, and
`OPENCLAW_STATE_DIR` through `GITHUB_ENV`, allowing later public actions and
commands to use the same profile without reading this action's private helper
state. It requires GitHub Actions and rejects the default profile and root
paths.

#### `openclaw-gateway`

```text
openclaw-gateway <start|wait|restart|stop|diagnostics> \
  --profile <name> --workspace <path> --state-dir <path> \
  [--timeout <seconds>] [--debug <auto|true|false>]
```

`start` launches the loopback gateway and waits for a successful health call;
`wait` probes an existing process; `restart` performs bounded stop and start;
`stop` terminates the recorded process; and `diagnostics` prints bounded,
redacted process and log evidence. Readiness defaults to 90 seconds and stop to
30 seconds. A failed start reports diagnostics, attempts cleanup, and returns
the original readiness failure.

The helper records the process start time alongside its PID and checks both
before signaling it. Invalid records, including older PID-only files, fail
closed; a reused PID does not authorize stopping the replacement process.

#### `openclaw-diagnostics`

```text
openclaw-diagnostics --profile <name> --workspace <path> --state-dir <path> \
  [--exit-code <0-255>] [--debug <auto|true|false>]
```

Reports the CLI version, configuration validity, gateway process state, and
bounded redacted failures. `--exit-code` defaults to `0`; pass a captured
failure code to report evidence without replacing the original result.
Diagnostics never dump environment variables, model credentials, channel
configuration, agent configuration, or complete OpenClaw configuration.
