# `publish-codex-plugin`

Prepares one Codex plugin archive and optionally uploads it to an existing
GitHub Release. The dependency policy is explicit because a reusable action
should not settle a product decision by ambush.

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
| `test-mode` | No | `false` | Prepare the real archive without uploading it or requiring credentials. |
| `debug` | No | `auto` | Action and Bun verbosity: `auto`, `true`, or `false`. |
| `plugin-directory` | No | `.` | Plugin root to archive, relative to the workspace or absolute. |
| `archive-name` | Yes | — | Archive filename ending in `.tar.gz`, using letters, digits, dots, underscores, or hyphens. |
| `dependency-policy` | No | `include-production` | `include-production` or `exclude-node-modules`. |
| `bun-version` | No | `1.3.14` | Bun version used for production dependency installation. |
| `release-tag` | Yes | — | Existing GitHub Release tag that receives the archive. |
| `repository` | No | `${{ github.repository }}` | GitHub repository containing the release. |
| `github-token` | Live publication | — | Token with `contents: write`; omit in test mode. |

Set `debug: true` for verbose Bun and action diagnostics, or use GitHub's
**Enable debug logging** rerun option with `auto`. Explicit `true` or `false`
overrides runner debug. Credentials are never included in diagnostic output.

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

## Examples

### Archive without dependencies

```yaml
- name: Prepare Agentbox-style archive
  id: archive
  uses: tanaabased/actions/publish-codex-plugin@v1
  with:
    test-mode: true
    plugin-directory: .
    archive-name: agentbox-test.tar.gz
    dependency-policy: exclude-node-modules
    release-tag: test

- name: Inspect local archive
  run: tar -tzf "${{ steps.archive.outputs.archive-path }}"
```

## Test behavior

Test mode performs normal dependency preparation and creates the real archive
in `RUNNER_TEMP`, then exposes its path without calling GitHub or requiring a
token. Pull requests exercise both dependency policies on `ubuntu-24.04` and
compare the exact unpacked contents. Test mode does not prove release access,
replacement, or download; the first real consumer release tracked in
[`tanaabased/actions#13`](https://github.com/tanaabased/actions/issues/13) owns
that evidence.

## Notes

### Upload replacement and retries

Live mode calls `gh release upload` once with `--clobber`. An existing asset
with the same name is replaced; an absent release, invalid token, or failed
upload fails the action. The action does not retry automatically. Inspect the
release before rerunning after an ambiguous transport failure, then rerun the
workflow to replace the named asset. A successful command proves upload, while
consumer lifecycle verification must download and inspect the published asset.
