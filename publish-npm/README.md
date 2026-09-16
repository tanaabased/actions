# `publish-npm`

Publishes one supplied, tested npm tarball without repacking the checkout. The
action selects `latest` for stable versions and `edge` for prereleases by
default. Registry versions remain immutable, despite the industry having had
ample time to wish otherwise.

Use [`npm-pack`](../npm-pack/README.md) to produce the artifact.

## npm trusted publishing

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v7
  - id: pack
    uses: tanaabased/actions/npm-pack@v1
  - uses: tanaabased/actions/publish-npm@v1
    with:
      tarball: ${{ steps.pack.outputs.tarball-path }}
      update-prerelease-tag-on-stable: true
      channel-token: ${{ secrets.NPM_CHANNEL_TOKEN }}
```

Configure npm's trusted publisher for the calling repository and workflow. The
action installs Node.js 24 and npm 11 at or above `11.5.1`, then leaves
`registry-token` unset so npm can exchange GitHub's OIDC identity. Trusted
publishing authorizes publication but not `npm dist-tag`; the optional
stable-to-`edge` update needs a separate granular token through
`channel-token`.

## Token-authenticated registry

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

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without registry mutation or publication credentials. |
| `tarball` | Yes | — | Tested npm tarball, relative to the workspace or absolute. |
| `registry-url` | No | `https://registry.npmjs.org` | npm-compatible registry URL. |
| `registry-token` | No | — | Token for registry reads and publication; omit for npm trusted publishing. |
| `channel-token` | No | — | Token used only to move the prerelease tag after a stable publication. |
| `stable-tag` | No | `latest` | Distribution tag for stable versions. |
| `prerelease-tag` | No | `edge` | Distribution tag for prerelease versions. |
| `update-prerelease-tag-on-stable` | No | `false` | Move `prerelease-tag` to a published stable version. |
| `access` | No | `public` | Access passed to `npm publish`; leave empty for registry defaults. |
| `node-version` | No | `24` | Node.js version used for publication. |
| `npm-version` | No | `^11.5.1` | npm version range installed for publication. |

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the supplied tarball. |
| `package-name` | Package name read from the tarball. |
| `package-version` | Package version read from the tarball. |
| `channel` | Selected distribution tag. |
| `release-type` | `stable` or `prerelease`. |

## Publication and retries

The action inspects the tarball offline, checks the registry for the exact
package version, dry-runs that tarball, and performs one live
`npm publish --ignore-scripts` attempt. An existing version fails before
publication with an immutable-version error. Other lookup failures also stop
the action; an authentication outage is not evidence that a version is
available.

Do not retry the same version blindly after an interrupted publication. The
action checks again after a failed publish and reports when the version now
exists, but registry state remains the authority. A stable publication updates
the prerelease tag only when `update-prerelease-tag-on-stable` is `true`; the
action validates the required token before publishing so a missing tag
credential cannot create a half-finished release.

## Test behavior

With `test-mode: true`, the action inspects the supplied tarball, selects its
stable or prerelease channel, and runs npm's native publication dry run. It
skips registry existence checks, live publication, and distribution-tag
updates, and requires no registry or channel token. Pull requests exercise both
stable and prerelease packages; only a real downstream release proves registry
authentication, immutability checks, publication, and channel mutation.
