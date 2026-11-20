<h1 align="center">setup-bun</h1>

<p align="center">
  <img src="icon.svg" alt="Bun mascot outline" width="180" />
</p>

<p align="center">
  Bun runtime setup.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-setup-bun.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-bun.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Selects the caller's Bun version and installs it with
[`oven-sh/setup-bun@v2`](https://github.com/oven-sh/setup-bun).

Supported runners: Linux (`ubuntu-24.04`), macOS (`macos-26`), and Windows (`windows-2025`).

## Usage

```yaml
- uses: actions/checkout@v7
- uses: tanaabased/actions/setup-bun@v1
```

`auto` checks `.bun-version`, `.tool-versions` (`bun`), `package.json#packageManager` (`bun@…`), then `package.json#engines.bun`, falling back to `1.4.x`.
Discovery uses only `working-directory`. An invalid declaration fails setup.
Set `bun-version` explicitly to bypass discovery.

## Inputs

| Input               | Default                   | Description                                                                   |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| `debug`             | `auto`                    | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `bun-version`       | `auto`                    | Project discovery or an explicit upstream version specification.              |
| `working-directory` | `${{ github.workspace }}` | Project directory, relative to the workspace or absolute.                     |

## Outputs

| Output           | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `bun-version`    | Installed runtime version reported by the upstream action.      |
| `version-spec`   | Version specification sent to the installer.                    |
| `version-source` | `input`, declaration filename or manifest field, or `fallback`. |

## Examples

```yaml
- uses: tanaabased/actions/setup-bun@v1
  with:
    bun-version: '1.4.2'
    working-directory: packages/cli
```

## Notes

- The selected runtime stays on `PATH` for subsequent steps in the job. Install project dependencies separately.
- Enable `debug` to see which declaration selected the version. The upstream installer has no separate verbosity setting.
