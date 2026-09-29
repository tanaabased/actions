<h1 align="center">npm-pack</h1>

<p align="center">
  <img src="../.github/assets/actions/npm-pack.svg" alt="Pack a package for testing and release" width="180" />
</p>

<p align="center">
  Pack a package for testing and release.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-npm-pack.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-npm-pack.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

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
| `debug` | No | `auto` | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
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
