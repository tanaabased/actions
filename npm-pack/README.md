# `npm-pack`

Packs one npm package and exposes its exact tarball for tests and publication.
Package scripts are disabled; prepare release files before packing.

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
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `package-directory` | No | `.` | Directory containing `package.json`, relative to the workspace or absolute. |
| `node-version` | No | `auto` | [Project discovery](../setup-node/README.md) or explicit Node version. |

Runtime discovery uses `package-directory`.

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

PR tests run normal packing, then inspect, install, and exercise the exact
fixture tarball.
