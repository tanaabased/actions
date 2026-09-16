# `setup-openclaw`

Installs one exact OpenClaw CLI version with a compatible Node.js runtime and
exposes opt-in helpers for isolated CI setup, gateway lifecycle, and bounded
diagnostics. Installation is the default; none of the helpers run unless a
later caller step invokes them.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`). Native
Windows is not part of the initial contract.

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
declarations must match. A broad peer compatibility range is a different claim,
so `peerDependencies` is never consulted automatically. If neither installation
field is present, the action requires an explicit version instead of making the
usual regrettable pilgrimage to `latest`.

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
returned as `version` and installed. Use an exact version when reproducibility
matters, which is most of the time and all of the time people later pretend
mattered.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Must be `true` or `false`; both values perform the same real local installation. |
| `debug` | No | `auto` | `auto`, `true`, or `false`. `auto` enables extra detail only when `RUNNER_DEBUG=1`; explicit values override it. |
| `version` | No | `auto` | `auto`, an exact OpenClaw semantic version, or a range. An explicit version overrides package selection. |
| `package-json` | No | `package.json` | Package manifest used only when `version` is `auto`; relative paths resolve from the workspace. |
| `package-field` | No | — | Optional dot-delimited field that replaces automatic `devDependencies`/`dependencies` discovery. |

The action rejects missing files, invalid JSON, missing or non-string fields,
conflicting automatic declarations, tags such as `latest`, URLs, invalid
ranges, ranges with no published match, and packages without a declared
`engines.node` requirement. It installs a Node.js version satisfying the
selected OpenClaw package's requirement before installing the exact resolved
package.

`debug` changes action and helper verbosity, not GitHub's runner logging. Useful
failure summaries remain visible when it is `false`. The action persists its
effective value for helpers invoked in later steps; a helper's explicit
`--debug` value takes precedence. Set `debug: true` directly, or leave it at
`auto` and use GitHub's **Enable debug logging** option when rerunning the job.

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

Test mode performs the normal npm resolution, compatible Node.js setup, exact
local CLI installation, PATH export, output generation, and any isolated helper
commands the caller invokes. The setup helper onboards without model-provider
credentials, channels, hooks, skills, daemon installation, or remote delivery.
The gateway binds to loopback, uses no authentication for the isolated runner,
and is started as a caller-owned process with bounded readiness and shutdown.

Test mode does not configure a remote system, publish an artifact, send a
message, or prove model-provider access. The Linux and macOS pull-request checks
install and invoke the real CLI, exercise package and explicit selection,
cover automatic dependency fallback, matching and conflicting declarations,
missing values, explicit field selection, and explicit-version precedence,
reject invalid inputs, call the exported helpers from later steps, and verify
gateway readiness and cleanup.

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
