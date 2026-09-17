# `setup-node`

Selects the caller's Node.js version and installs it with
[`actions/setup-node@v7`](https://github.com/actions/setup-node).

Supported runners: Linux (`ubuntu-24.04`), macOS (`macos-26`), and Windows (`windows-2025`).

## Usage

```yaml
- uses: actions/checkout@v7
- uses: tanaabased/actions/setup-node@v1
```

`auto` checks `.node-version`, `.nvmrc`, `.tool-versions` (`nodejs`), then `package.json#engines.node`, falling back to `26.x`.
An explicit `node-version` bypasses discovery. Empty or malformed declarations
fail instead of falling through; the upstream installer validates version syntax
and availability. Discovery stays inside `working-directory`; it does not walk
parent directories or use this action's own version files.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `test-mode` | `false` | Run the same real local installation. |
| `debug` | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `node-version` | `auto` | Project discovery or an explicit upstream version specification. |
| `working-directory` | `${{ github.workspace }}` | Project directory, relative to the workspace or absolute. |

## Outputs

| Output | Description |
| --- | --- |
| `node-version` | Installed runtime version reported by the upstream action. |
| `version-spec` | Version specification sent to the installer. |
| `version-source` | `input`, declaration filename or manifest field, or `fallback`. |

## Examples

```yaml
- uses: tanaabased/actions/setup-node@v1
  with:
    node-version: '26.9.0'
    working-directory: packages/cli
```

## Test behavior

Test mode performs normal setup without publishing. PR tests cover declaration
precedence, overrides, missing declarations, malformed inputs, and real installs
from files, package metadata, ranges, and fallbacks on every supported runner.

## Notes

Setup selects the runtime for subsequent steps in the same job; it does not
restore a previous version afterward. Upstream manages installation and binary
caching. Dependency installation, package caching, and registry authentication
remain caller-owned. Debug reports selection provenance; the upstream installer
has no separate debug input.
