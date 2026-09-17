# `publish-npm`

Publishes one supplied, tested npm tarball without repacking the checkout. The
action selects `latest` for stable versions and `edge` for prereleases by
default. Existing registry versions cannot be republished.

Use [`npm-pack`](../npm-pack/README.md) to produce the artifact.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Configure npm's trusted publisher for the calling repository and workflow. The
action selects the project's Node version and installs npm 11 at or above
`11.5.1`. Leave `registry-token` unset so npm can exchange GitHub's OIDC identity.
Trusted publishing authorizes publication but not `npm dist-tag`; the optional
stable-to-`edge` update needs a separate granular token through
`channel-token`.

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

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without registry mutation or publication credentials. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `tarball` | Yes | — | Tested npm tarball, relative to the workspace or absolute. |
| `registry-url` | No | `https://registry.npmjs.org` | npm-compatible registry URL. |
| `registry-token` | No | — | Token for registry reads and publication; omit for npm trusted publishing. |
| `channel-token` | No | — | Token used only to move the prerelease tag after a stable publication. |
| `stable-tag` | No | `latest` | Distribution tag for stable versions. |
| `prerelease-tag` | No | `edge` | Distribution tag for prerelease versions. |
| `update-prerelease-tag-on-stable` | No | `false` | Move `prerelease-tag` to a published stable version. |
| `access` | No | `public` | Access passed to `npm publish`; leave empty for registry defaults. |
| `working-directory` | No | `${{ github.workspace }}` | Project directory for runtime discovery. |
| `node-version` | No | `auto` | [Project discovery](../setup-node/README.md) or explicit Node version. |
| `npm-version` | No | `^11.5.1` | npm version range installed for publication. |

Debug enables verbose npm output.

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the supplied tarball. |
| `package-name` | Package name read from the tarball. |
| `package-version` | Package version read from the tarball. |
| `channel` | Selected distribution tag. |
| `release-type` | `stable` or `prerelease`. |

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

Test mode inspects the tarball, selects its channel, and runs npm's native dry
run without registry or channel credentials. It skips registry reads, publication,
and tag updates. PR tests cover stable and prerelease artifacts; live releases
prove authentication, immutability checks, publication, and channel mutation.

## Notes

### Publication and retries

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

After publication, the action reads back package identity, tarball integrity,
and all requested channels. It retries reads up to 12 times with five-second
pauses; it never retries publication.

If publication succeeds but readback or the distribution-tag update fails, inspect
the immutable version and current tags, then repair only the tag:

```sh
npm view "$PACKAGE_NAME@$PACKAGE_VERSION" version
npm dist-tag ls "$PACKAGE_NAME"
npm dist-tag add "$PACKAGE_NAME@$PACKAGE_VERSION" "$CHANNEL"
```

Do not rerun publication after the version exists.
