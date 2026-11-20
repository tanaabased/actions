<h1 align="center">setup-node</h1>

<p align="center">
  <img src="icon.svg" alt="Node.js JS logo" width="180" />
</p>

<p align="center">
  Node.js runtime setup.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-setup-node.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-node.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Selects the caller's Node.js version and installs it with
[`actions/setup-node@v7`](https://github.com/actions/setup-node).

Supported runners: Linux (`ubuntu-24.04`), macOS (`macos-26`), and Windows (`windows-2025`).

## Usage

```yaml
- uses: actions/checkout@v7
- uses: tanaabased/actions/setup-node@v1
```

`auto` checks `.node-version`, `.nvmrc`, `.tool-versions` (`nodejs`), then `package.json#engines.node`, falling back to `26.x`.
Discovery uses only `working-directory`. An invalid declaration fails setup.
Set `node-version` explicitly to bypass discovery.

## Inputs

| Input               | Default                   | Description                                                                   |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| `debug`             | `auto`                    | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `node-version`      | `auto`                    | Project discovery or an explicit upstream version specification.              |
| `working-directory` | `${{ github.workspace }}` | Project directory, relative to the workspace or absolute.                     |

## Outputs

| Output           | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `node-version`   | Installed runtime version reported by the upstream action.      |
| `version-spec`   | Version specification sent to the installer.                    |
| `version-source` | `input`, declaration filename or manifest field, or `fallback`. |

## Examples

```yaml
- uses: tanaabased/actions/setup-node@v1
  with:
    node-version: '26.9.0'
    working-directory: packages/cli
```

## Notes

- The selected runtime stays on `PATH` for subsequent steps in the job. Install project dependencies separately.
- Enable `debug` to see which declaration selected the version. The upstream installer has no separate verbosity setting.
