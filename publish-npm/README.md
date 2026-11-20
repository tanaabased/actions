<h1 align="center">publish-npm</h1>

<p align="center">
  <img src="icon.svg" alt="npm wordmark" width="180" />
</p>

<p align="center">
  Publish a tested npm package.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-publish-npm.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-npm.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Publishes the supplied tarball without repacking it. Use [npm-pack](../npm-pack/README.md) to produce it.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

For [trusted publishing](https://docs.npmjs.com/trusted-publishers/), grant the job
`id-token: write` and enable `npm publish` in the trusted publisher configuration.
Enable `npm dist-tag` there too if the workflow syncs channels. Omit both token inputs. For token-authenticated
registries, supply `registry-token`. Release events need `contents: read` for tag selection.

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v7
    with:
      ref: ${{ github.sha }}
  - id: pack
    uses: tanaabased/actions/npm-pack@v1
  - uses: tanaabased/actions/publish-npm@v1
    with:
      tarball: ${{ steps.pack.outputs.tarball-path }}
```

## Inputs

| Input               | Required | Effective default            | Description                                                                                                 |
| ------------------- | -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `dry-run`           | No       | `false`                      | Use npm's native dry run without registry mutation or publication credentials.                              |
| `debug`             | No       | `auto`                       | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`.                               |
| `tarball`           | Yes      | —                            | Tested npm tarball, relative to the workspace or absolute.                                                  |
| `registry-url`      | No       | `https://registry.npmjs.org` | npm-compatible registry URL.                                                                                |
| `registry-token`    | No       | —                            | Token for publication and channel syncing when the registry requires token authentication.                  |
| `channel-token`     | No       | —                            | Deprecated in v1. Overrides the token for channel syncing only. Use trusted publishing or `registry-token`. |
| `latest-tag`        | No       | `latest`                     | Distribution tag for GitHub Latest releases or stable SemVer fallback.                                      |
| `edge-tag`          | No       | `edge`                       | Distribution tag for other releases or prerelease SemVer fallback.                                          |
| `sync-edge-tag`     | No       | `true`                       | Also move `edge-tag` after a `latest-tag` publication.                                                      |
| `access`            | No       | `public`                     | Access passed to `npm publish`; leave empty for registry defaults.                                          |
| `working-directory` | No       | `${{ github.workspace }}`    | Project directory for runtime discovery.                                                                    |
| `node-version`      | No       | `auto`                       | [Project discovery](../setup-node/README.md) or explicit Node version.                                      |
| `npm-version`       | No       | `^11.21.0`                   | npm version range installed for publication.                                                                |

A GitHub Latest release without a prerelease flag publishes to `latest-tag` and syncs
`edge-tag` unless `sync-edge-tag: false`. Other releases update only `edge-tag`.
Outside release events, prerelease versions use `edge-tag` and stable versions use `latest-tag`.

Debug enables verbose npm output.

### Deprecated inputs

These aliases still work for existing `@v1` callers but will be removed in a
future breaking release. New workflows should use the replacement names.

| Input                             | Required | Effective default | Description                           |
| --------------------------------- | -------- | ----------------- | ------------------------------------- |
| `stable-tag`                      | No       | `latest`          | Deprecated alias for `latest-tag`.    |
| `prerelease-tag`                  | No       | `edge`            | Deprecated alias for `edge-tag`.      |
| `update-prerelease-tag-on-stable` | No       | `true`            | Deprecated alias for `sync-edge-tag`. |

To migrate, replace each old input name with its alias target; values need no
change. If both names for one setting are supplied, their values must match or
the action fails before publication.

## Outputs

| Output            | Description                            |
| ----------------- | -------------------------------------- |
| `tarball-path`    | Absolute path to the supplied tarball. |
| `package-name`    | Package name read from the tarball.    |
| `package-version` | Package version read from the tarball. |
| `channel`         | Selected distribution tag.             |

### Deprecated outputs

This output remains available to existing `@v1` callers but will be removed in
a future breaking release.

| Output         | Description                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `release-type` | Package version's SemVer syntax: `stable` or `prerelease`; neither GitHub release status nor the selected npm tag. |

To migrate, use `channel` for the selected npm tag. If version syntax matters,
derive it from `package-version` rather than relying on `release-type`.

## Examples

### Token-authenticated registry

```yaml
- uses: tanaabased/actions/publish-npm@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
    registry-url: https://npm.pkg.github.com
    registry-token: ${{ github.token }}
```

The token is scoped to registry commands and temporary npm configuration is
removed afterward. For GitHub Packages, grant the job `packages: write` and use
an owner-scoped package name such as `@tanaabased/example`.

### Complete release

For a complete workflow, see [the release example](examples/release.yml), which
publishes npm and repository changes in independent jobs after a GitHub Release
is published. Adapt its preparation commands and moving tag to the consumer.

## Notes

- npm versions are immutable. After an interrupted upload or a failed channel update, check the version and tags before retrying. If the version exists, repair the tag:

  ```sh
  npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version
  npm dist-tag ls "$PACKAGE_NAME"
  npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" "$CHANNEL"
  ```
