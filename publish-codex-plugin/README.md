<h1 align="center">publish-codex-plugin</h1>

<p align="center">
  <img src="icon.svg" alt="OpenAI logo with an amber DEPRECATED ribbon" width="180" />
</p>

<p align="center">
  Prepare a Codex plugin release archive.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-publish-codex-plugin.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-codex-plugin.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

**Deprecated for new Codex plugin releases.** Use [`npm-pack`](../npm-pack/README.md)
→ [`publish-npm`](../publish-npm/README.md) for npm distribution. This v1 action
still prepares and optionally uploads a release archive for existing callers.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

For existing archive consumers, live upload requires job-level `contents: write`
permission and a token with access to the target repository:

```yaml
permissions:
  contents: write

steps:
  - uses: actions/checkout@v7
    with:
      ref: ${{ github.sha }}
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

Check the manifest with [validate-codex-plugin](../validate-codex-plugin/README.md) before uploading.
For parallel release jobs, follow the
[shared checkout guidance](../publish-repo/README.md#usage).

## Inputs

| Input               | Required         | Default                    | Description                                                                                 |
| ------------------- | ---------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `dry-run`           | No               | `false`                    | Prepare the real archive without uploading it or requiring credentials.                     |
| `debug`             | No               | `auto`                     | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`.               |
| `plugin-directory`  | No               | `.`                        | Plugin root to archive, relative to the workspace or absolute.                              |
| `archive-name`      | Yes              | —                          | Archive filename ending in `.tar.gz`, using letters, digits, dots, underscores, or hyphens. |
| `dependency-policy` | No               | `include-production`       | `include-production` or `exclude-node-modules`.                                             |
| `bun-version`       | No               | `auto`                     | [Project discovery](../setup-bun/README.md) or explicit Bun version.                        |
| `release-tag`       | Yes              | —                          | Existing GitHub Release tag that receives the archive.                                      |
| `repository`        | No               | `${{ github.repository }}` | GitHub repository containing the release.                                                   |
| `github-token`      | Live publication | —                          | Token with `contents: write`; omit in dry runs.                                             |

Runtime discovery uses `plugin-directory`. Debug enables verbose Bun output.

`include-production` removes the plugin root's existing `node_modules` and runs
`bun install --production --frozen-lockfile --ignore-scripts` before packing.
The resulting production `node_modules` is included. `exclude-node-modules`
does not install dependencies and excludes the root `node_modules` directory
entirely. Both policies exclude version-control metadata.

## Outputs

| Output         | Description                                      |
| -------------- | ------------------------------------------------ |
| `archive-path` | Absolute path to the prepared `.tar.gz` archive. |
| `archive-name` | Filename of the prepared archive.                |

## Examples

### Migrate to npm distribution

Build the plugin before packing. Codex does not run install-time lifecycle scripts.
Supply your own `check-plugin-package.sh` to verify the manifest, required resources,
and runtime entry points in the extracted package. Publish the same tarball.

```yaml
- id: pack
  uses: tanaabased/actions/npm-pack@v1
- name: Verify extracted plugin package
  env:
    TARBALL: ${{ steps.pack.outputs.tarball-path }}
  run: |
    package_root="$(mktemp -d)"
    tar -xzf "$TARBALL" -C "$package_root"
    ./scripts/check-plugin-package.sh "$package_root/package"
- uses: tanaabased/actions/publish-npm@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
```

## Notes

- Uploading an archive replaces any release asset with the same name. If an upload is interrupted, inspect the release assets before retrying.
