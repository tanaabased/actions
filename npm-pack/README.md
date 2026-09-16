# `npm-pack`

Packs one npm package once and exposes the exact tarball for consumer tests and
publication. Package scripts are disabled: release preparation belongs before
packing, not halfway through an artifact handoff.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

```yaml
- name: Pack package
  id: pack
  uses: tanaabased/actions/npm-pack@v1
  with:
    package-directory: packages/cli

- name: Test packed artifact
  run: npm install --ignore-scripts "${{ steps.pack.outputs.tarball-path }}"
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without external mutation or publication credentials. |
| `debug` | No | `auto` | Action and npm verbosity: `auto`, `true`, or `false`. |
| `package-directory` | No | `.` | Directory containing `package.json`, relative to the workspace or absolute. |
| `node-version` | No | `24` | Node.js version used to run `npm pack`. |

Set `debug: true` for verbose npm and action diagnostics, or use GitHub's
**Enable debug logging** rerun option with `auto`. Explicit `true` or `false`
overrides runner debug. Useful failure output remains enabled in every mode.

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the produced tarball. |
| `package-name` | Package name recorded by `npm pack`. |
| `package-version` | Package version recorded by `npm pack`. |

The action runs `npm pack --ignore-scripts --json` and fails unless npm reports
exactly one existing tarball with name and version metadata. It neither uploads
the artifact nor publishes it to a registry.

## Test behavior

Packing is already non-mutating outside the runner, so `test-mode: true` runs
the normal action. Pull requests pack, inspect, install, and exercise the exact
fixture tarball; no live lifecycle evidence is required.
