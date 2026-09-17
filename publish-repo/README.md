# `publish-repo`

Prepares release files, creates a verified commit on the target branch, and
forces the exact release tag plus any requested moving tags to that commit. It
is the Git publication peer of package and archive publishers; it does not
create a GitHub Release.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

```yaml
jobs:
  publish-repo:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: tanaabased/actions/publish-repo@v1
        with:
          commands: bun run build
          sync-tags: v1
          sync-token: ${{ secrets.RELEASE_SYNC_TOKEN }}
```

Run this in an independent job so a package publisher can fail or be retried
without coupling its registry result to Git synchronization. Outside a
`release` event, provide `version`, `release-date`, and `release-url`
explicitly.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Prepare locally without committing, pushing, or requiring publication credentials. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `version` | No | Release tag | Semver-valid exact tag and project version. |
| `release-date` | No | Release publication timestamp | Date or timestamp formatted as `Month D, YYYY` for the changelog. |
| `release-url` | No | Release URL | Link recorded in the changelog. |
| `commands` | No | — | Project-specific preparation commands. |
| `root` | No | `${{ github.workspace }}` | Repository root containing the release source and `package.json`. |
| `bun-version` | No | `auto` | Bun version, or automatic project resolution. |
| `sync-branch` | No | Release target or current branch | Branch that receives the release commit. |
| `sync-tags` | No | — | Newline-separated moving tags, such as `v1`, forced to the release commit. |
| `sync-token` | No | `${{ github.token }}` | Token authorized to create the verified commit and push tags. |

The upstream preparation action has no debug input.

The local synchronization identity is fixed to
`tanaabot <tanaabot@tanaab.dev>` and verified commit mode. GitHub attributes
the verified commit to the `sync-token` account, so use the established bot
token to publish as `tanaabot` and to satisfy repository rules.

## Outputs

| Output | Description |
| --- | --- |
| `resolved-version` | Semver-valid version resolved by the upstream preparation action. |

## Examples

See [the combined release example](../publish-npm/examples/release.yml) for npm
and repository publication in independent jobs.

## Test behavior

Test mode prepares files locally without synchronizing or supplying the sync token.
PR tests assert metadata, changelog, commands, and unchanged history. Live releases
prove verified commits and branch/tag updates.

## Notes

### File and retry behavior

`package.json` is required at `root` and its version is updated. An existing
`CHANGELOG.md` has its current unreleased tokens resolved and receives a fresh
unreleased header; a missing changelog is left missing. `commands` run from
`root` and may use `PREPARE_RELEASE_VERSION`.

After synchronization, the action checks that the remote branch, exact release
tag, and every requested moving tag select the prepared commit and package version.

A retry runs preparation again, creates a commit when files change, and forces
the exact and moving tags to the resulting commit. This makes repository
publication independently retryable, not unconditionally idempotent. In
particular, already-prepared changelog content can acquire a duplicate release
header.
