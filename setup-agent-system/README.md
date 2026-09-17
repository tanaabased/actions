# `setup-agent-system`

Builds or downloads one exact Agent System npm package, installs that real
tarball into an existing isolated OpenClaw profile, enables the plugin, and
verifies the loaded runtime against the selected version and artifact.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

Prepare the isolated profile with [`setup-openclaw`](../setup-openclaw/README.md),
then select exactly one Agent System source.

```yaml
- name: Install OpenClaw
  uses: tanaabased/actions/setup-openclaw@v1
  with:
    version: 2026.9.3

- name: Prepare isolated OpenClaw
  shell: bash
  run: |
    openclaw-setup \
      --profile ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT} \
      --workspace "$RUNNER_TEMP/openclaw-workspace" \
      --state-dir "$RUNNER_TEMP/openclaw-state"

- name: Install Agent System
  id: agent-system
  uses: tanaabased/actions/setup-agent-system@v1
  with:
    version: 0.6.0
```

`openclaw-setup` exports the successful profile, configuration path, and
OpenClaw state directory for later steps. An equivalent caller-managed setup
may instead supply `profile`, `config-path`, and `state-directory` together.
Partial explicit context is rejected so an old environment value cannot
quietly complete a new profile.

No provider credentials are required. The action does not provision an agent,
configure GitHub notifications, select models, alter execution policy, or set
Agent System credentials; those decisions remain with the caller.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `version` | One source | — | Exact published `@tanaab/openclaw-agent-system` semantic version. |
| `source-directory` | One source | — | Absolute or workspace-relative Agent System source checkout to build and pack. |
| `profile` | Context tuple | exported context | Isolated non-default OpenClaw profile. |
| `config-path` | Context tuple | exported context | Absolute path to the existing OpenClaw configuration file. |
| `state-directory` | Context tuple | exported context | Absolute path to the existing OpenClaw state directory. |

Debug enables verbose package preparation and owned OpenClaw invocations.

Exactly one of `version` or `source-directory` is required. Versions must be
exact; ranges, tags such as `latest`, URLs, and missing releases fail instead
of silently selecting a different package.

Source installation requires the package name
`@tanaab/openclaw-agent-system`, exact package and `packageManager` versions, a
committed `bun.lock`, and the package's `build` and `plugin:check` scripts. The
runner also needs network access for its frozen dependency installation. The
action copies the checkout without `.git`, `node_modules`, or `dist`, runs the
source-declared Bun version with `bun install --frozen-lockfile --ignore-scripts`,
builds, checks, and packs it. Tracked modifications, untracked files, and the
original checkout remain intact. Source mode never downloads Agent System itself.

## Outputs

| Output | Description |
| --- | --- |
| `version` | Exact installed Agent System package version. |
| `source` | Exact npm selector or canonical source directory used to prepare the package. |
| `artifact-path` | Absolute path to the real npm tarball installed into OpenClaw. |
| `plugin-path` | Absolute installed plugin directory reported by OpenClaw runtime inspection. |

The action verifies the packed identity and version, OpenClaw configuration,
plugin enablement, loaded status, runtime version, installed source artifact,
required hook access, and absence of plugin error diagnostics. Unsupported
Agent System/OpenClaw combinations fail during supported plugin installation
or runtime inspection; the action does not waive compatibility checks.

## Examples

### Install from a source checkout

Pin the checkout separately, then pass its directory. Local modifications are
included in the staged build without changing the checkout.

```yaml
- name: Checkout Agent System
  uses: actions/checkout@v7
  with:
    repository: tanaabased/openclaw-agent-system
    ref: 4fc7dd6abab9d511d4a6a899b65305b74e4eec7b
    path: agent-system-source

- name: Install Agent System source
  id: agent-system
  uses: tanaabased/actions/setup-agent-system@v1
  with:
    source-directory: agent-system-source
```

### Supply an equivalent isolated context

```yaml
- name: Install Agent System into caller-managed OpenClaw
  uses: tanaabased/actions/setup-agent-system@v1
  with:
    version: 0.6.0
    profile: ci-profile
    config-path: ${{ runner.temp }}/openclaw/openclaw.json
    state-directory: ${{ runner.temp }}/openclaw
```

## Test behavior

PR checks perform the normal download or source build and isolated installation.
They verify plugin loading, artifact provenance, source
preservation, invalid inputs, and caller cleanup without provider credentials.

## Notes

Source build staging is removed on success and failure. The tarball stays under
`RUNNER_TEMP` at `artifact-path` for inspection; callers may remove its parent
directory afterward. OpenClaw profile and plugin cleanup remain caller-owned.
