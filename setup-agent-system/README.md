# `setup-agent-system`

Builds or downloads one exact Agent System npm package, installs that real
tarball into an existing isolated OpenClaw profile, enables the plugin, and
verifies the loaded runtime against the selected version and artifact.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`). Native
Windows is not part of the initial contract.

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
| `test-mode` | No | `false` | Must be `true` or `false`; both values perform the same real isolated local installation. |
| `debug` | No | `auto` | Action and owned tool verbosity: `auto`, `true`, or `false`. |
| `version` | One source | — | Exact published `@tanaab/openclaw-agent-system` semantic version. |
| `source-directory` | One source | — | Absolute or workspace-relative Agent System source checkout to build and pack. |
| `profile` | Context tuple | exported context | Isolated non-default OpenClaw profile. |
| `config-path` | Context tuple | exported context | Absolute path to the existing OpenClaw configuration file. |
| `state-directory` | Context tuple | exported context | Absolute path to the existing OpenClaw state directory. |

Set `debug: true` for verbose package preparation and OpenClaw diagnostics, or
use GitHub's **Enable debug logging** rerun option with `auto`. Explicit `true`
or `false` overrides runner debug, including for owned OpenClaw invocations.

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
original checkout remain intact; registry substitution would be clever only in
the way forged evidence is clever, so the source path never downloads Agent
System itself.

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

Test mode performs the normal registry download or frozen source build, creates
the real npm tarball, installs and enables it in the selected isolated profile,
validates OpenClaw configuration, and performs runtime plugin inspection. It
does not publish a package, mutate a repository or release, configure a
provider, send a notification, or provision an Agent System agent.

Pull-request checks exercise pinned published and source installations on Linux
and macOS. They verify actual plugin loading, output provenance, a harmless
`openclaw agent-system --help` command, preservation of source changes, invalid
selection failures, and caller cleanup without provider credentials.

## Notes

Source build staging is removed on success and failure. The installed tarball
is deliberately retained at `artifact-path` so later steps can inspect or
archive the exact bytes that OpenClaw consumed. It lives under `RUNNER_TEMP` and
is removed with the runner; callers that need earlier cleanup may delete the
tarball's parent directory after their final inspection. OpenClaw profile and
plugin state remain in the caller-owned state directory and follow the caller's
cleanup policy.
