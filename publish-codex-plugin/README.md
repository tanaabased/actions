# `publish-codex-plugin`

Prepares one Codex plugin archive and optionally uploads it to an existing
GitHub Release with an explicit dependency policy.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Live upload requires job-level `contents: write` permission and a token with
access to the target repository.

```yaml
permissions:
  contents: write

steps:
  - name: Publish Codex plugin archive
    id: publish
    uses: tanaabased/actions/publish-codex-plugin@v1
    with:
      plugin-directory: .
      archive-name: tanaab-${{ github.event.release.tag_name }}.tar.gz
      dependency-policy: include-production
      release-tag: ${{ github.event.release.tag_name }}
      github-token: ${{ github.token }}
```

Run generic and repository-specific validation before publication; this action
owns archive preparation and upload, not consumer policy checks or manifest
stamping.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `dry-run` | No | `false` | Prepare the real archive without uploading it or requiring credentials. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `plugin-directory` | No | `.` | Plugin root to archive, relative to the workspace or absolute. |
| `archive-name` | Yes | — | Archive filename ending in `.tar.gz`, using letters, digits, dots, underscores, or hyphens. |
| `dependency-policy` | No | `include-production` | `include-production` or `exclude-node-modules`. |
| `bun-version` | No | `auto` | [Project discovery](../setup-bun/README.md) or explicit Bun version. |
| `release-tag` | Yes | — | Existing GitHub Release tag that receives the archive. |
| `repository` | No | `${{ github.repository }}` | GitHub repository containing the release. |
| `github-token` | Live publication | — | Token with `contents: write`; omit in dry runs. |

For a consumer pull-request dry run, set `dry-run: true`. It validates inputs
and builds the real archive, but skips release upload and readback. Archive
outputs remain meaningful; a live release proves delivery.

Runtime discovery uses `plugin-directory`. Debug enables verbose Bun output.

`include-production` removes the plugin root's existing `node_modules` and runs
`bun install --production --frozen-lockfile --ignore-scripts` before packing.
The resulting production `node_modules` is included. `exclude-node-modules`
does not install dependencies and excludes the root `node_modules` directory
entirely. Both policies exclude version-control metadata.

## Outputs

| Output | Description |
| --- | --- |
| `archive-path` | Absolute path to the prepared `.tar.gz` archive. |
| `archive-name` | Filename of the prepared archive. |

## Test behavior

Dry run prepares the real archive under `RUNNER_TEMP` without GitHub access.
PR tests compare unpacked contents for both dependency policies. Release access,
asset replacement, and download require a live consumer release.

## Notes

### Upload replacement and retries

Live mode calls `gh release upload` once with `--clobber`. An existing asset
with the same name is replaced; an absent release, invalid token, or failed
upload fails the action. The action does not retry automatically. Inspect the
release before rerunning after an ambiguous transport failure, then rerun the
workflow to replace the named asset. A successful command proves upload, while
consumer lifecycle verification must download and inspect the published asset.
