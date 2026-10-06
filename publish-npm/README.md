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

Publishes one supplied, tested npm tarball without repacking the checkout. For
GitHub release events, a Latest non-prerelease release publishes to `latest-tag`
(default `latest`), then optionally syncs `edge-tag` (default `edge`) to that
version. GitHub prereleases and regular releases that are not Latest update only
`edge-tag`. Without release context, the package version's SemVer prerelease
suffix selects the channel. These are
separate concepts: npm `latest` is the default install tag, not a SemVer stability
guarantee, and `edge` is the project's moving iterative tag. A first published
GitHub release follows its reported status; no bootstrap exception is needed.
A first GitHub prerelease updates only `edge-tag` and does not establish npm
`latest`.
Existing registry versions cannot be republished.

Use [`npm-pack`](../npm-pack/README.md) to produce the artifact.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

For supported npm trusted-publishing workflows, omit both token inputs; npm
uses the workflow's OIDC identity for publication and channel syncing. The
action selects the project's Node version and installs a compatible npm 11
release by default. Token inputs remain available for registries and
environments that require them; `registry-token` can also authenticate the tag
update when `channel-token` is omitted.
Release events also require `contents: read` to query GitHub's Latest status.

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

| Input | Required | Effective default | Description |
| --- | --- | --- | --- |
| `dry-run` | No | `false` | Use npm's native dry run without registry mutation or publication credentials. |
| `debug` | No | `auto` | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `tarball` | Yes | — | Tested npm tarball, relative to the workspace or absolute. |
| `registry-url` | No | `https://registry.npmjs.org` | npm-compatible registry URL. |
| `registry-token` | No | — | Optional publication token for registries without trusted publishing; omit for supported npm trusted publishing. |
| `channel-token` | No | — | Optional `edge-tag` sync token; omit for supported npm trusted publishing. |
| `latest-tag` | No | `latest` | Distribution tag for GitHub Latest releases or stable SemVer fallback. |
| `edge-tag` | No | `edge` | Distribution tag for other releases or prerelease SemVer fallback. |
| `sync-edge-tag` | No | `true` | Also move `edge-tag` after a `latest-tag` publication. |
| `access` | No | `public` | Access passed to `npm publish`; leave empty for registry defaults. |
| `working-directory` | No | `${{ github.workspace }}` | Project directory for runtime discovery. |
| `node-version` | No | `auto` | [Project discovery](../setup-node/README.md) or explicit Node version. |
| `npm-version` | No | `^11.21.0` | npm version range installed for publication. |

For [trusted publishing](https://docs.npmjs.com/trusted-publishers/), enable `npm publish` for publication and `npm dist-tag` for channel syncing.

For a consumer pull-request dry run, set `dry-run: true`. It inspects and
validates the supplied tarball through npm's native dry-run path without
publication or channel updates. Its local artifact outputs remain meaningful.

Debug enables verbose npm output.

### Deprecated inputs

These aliases still work for existing `@v1` callers but will be removed in a
future breaking release. New workflows should use the replacement names.

| Input | Required | Effective default | Description |
| --- | --- | --- | --- |
| `stable-tag` | No | `latest` | Deprecated alias for `latest-tag`. |
| `prerelease-tag` | No | `edge` | Deprecated alias for `edge-tag`. |
| `update-prerelease-tag-on-stable` | No | `true` | Deprecated alias for `sync-edge-tag`. |

To migrate, replace each old input name with its alias target; values need no
change. If both names for one setting are supplied, their values must match or
the action fails before publication.

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the supplied tarball. |
| `package-name` | Package name read from the tarball. |
| `package-version` | Package version read from the tarball. |
| `channel` | Selected distribution tag. |

### Deprecated outputs

This output remains available to existing `@v1` callers but will be removed in
a future breaking release.

| Output | Description |
| --- | --- |
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

## Test behavior

Dry run inspects the tarball, selects its channel, and runs npm's native dry
run without registry or channel credentials. PR tests cover all release-status
decisions with fake GitHub and npm commands, stable and prerelease artifacts,
and command failure propagation. Live releases exercise authentication,
publication, and channel mutation.

## Notes

### Publication and retries

The action inspects the tarball offline and makes one live
`npm publish --ignore-scripts` attempt. npm enforces version immutability and
reports publication errors. Successful publication is sufficient; the action
never polls registry visibility or retries publication.

A `latest-tag` publication syncs `edge-tag` by default. Set
`sync-edge-tag: false` to keep the tags separate. The action preserves any
`npm dist-tag add` failure; it does not silently switch authentication or skip
the update. Dry runs need neither token and never update tags.

After an interrupted publication or a failed tag update, inspect the version
and tags before retrying. If the version exists, repair only the tag:

```sh
npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version
npm dist-tag ls "$PACKAGE_NAME"
npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" "$CHANNEL"
```
