# `setup-bun-node`

Sets up a project’s Bun runtime, optionally its Node.js runtime, and installs
its dependencies. It reads version files from the caller’s project directory;
the caller still owns runners, job topology, credentials, source validation,
and publication. There is no small empire hiding in a setup step.

Supported runners: Linux (`ubuntu-24.04`), macOS (`macos-26`), and Windows
(`windows-2025`).

## Usage

Set up a Bun-only project from its `.bun-version` and lockfile:

```yaml
- name: Set up dependencies
  uses: tanaabased/actions/setup-bun-node@v1
  with:
    working-directory: .
```

Set up Bun and Node from `.bun-version` and `.node-version`:

```yaml
- name: Set up runtimes and dependencies
  uses: tanaabased/actions/setup-bun-node@v1
  with:
    working-directory: .
    setup-node: true
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the same local runtime and dependency setup without external credentials. |
| `working-directory` | No | `.` | Workspace-relative directory containing `package.json` and version files. |
| `bun-version-file` | No | `.bun-version` | Bun version file relative to `working-directory`. |
| `setup-node` | No | `false` | Set up Node.js from `node-version-file`. |
| `node-version-file` | No | `.node-version` | Node.js version file relative to `working-directory` when `setup-node` is `true`. |
| `frozen-lockfile` | No | `true` | Require `bun.lock` to match `package.json`. |
| `ignore-scripts` | No | `true` | Disable package lifecycle scripts during `bun install`. |

All Boolean inputs accept only `true` or `false`. With `frozen-lockfile: true`,
`bun.lock` is required. Node setup deliberately disables `actions/setup-node`
package-manager caching; Bun owns dependency installation.

## Outputs

| Output | Description |
| --- | --- |
| `bun-version` | Installed version reported by `bun --version`. |
| `node-version` | Installed version reported by `node --version`, or empty when `setup-node` is `false`. |
| `dependency-directory` | Absolute project directory where dependencies were installed. |

## Examples

### Permit lifecycle scripts for a trusted project

```yaml
- name: Set up trusted project dependencies
  uses: tanaabased/actions/setup-bun-node@v1
  with:
    working-directory: packages/trusted-project
    ignore-scripts: false
```

### Allow lockfile updates during deliberate dependency maintenance

```yaml
- name: Refresh dependencies
  uses: tanaabased/actions/setup-bun-node@v1
  with:
    frozen-lockfile: false
```

## Test behavior

`test-mode: true` performs the same local runtime setup and `bun install` as a
normal invocation. The PR workflow runs Bun-only and Bun-plus-Node fixtures on
every supported runner, checks reported versions, verifies both commands remain
on `PATH` in a later step, imports the installed fixture dependency, and proves
the default lifecycle-script policy. The action has no registry or repository
mutation and needs no publication credentials; its normal behavior is already
the test behavior.

## Notes

This action does not set a registry URL, cache packages, run project commands,
or publish anything. Put those choices in the caller’s workflow, where they
can be reviewed alongside the permissions and consequences they require.
