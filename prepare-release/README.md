# `prepare-release`

Prepares a release in the caller's checkout without pushing changes. It wraps
[`tanaabased/prepare-release-action@v1`](https://github.com/tanaabased/prepare-release-action)
with the shared release date and `CHANGELOG.md` contract used by Tanaab
publishers.

## Usage

```yaml
- name: Prepare release
  id: prepare
  uses: tanaabased/actions/prepare-release@v1
  with:
    commands: |
      bun run build
      version-injector dist/index.js --style js --version "$PREPARE_RELEASE_VERSION"
```

Package or archive publication can follow in the same job. The action modifies
that job's original release checkout and fixes upstream synchronization to
`false`; it does not push a branch or tags.

Outside a `release` event, provide `version`, `release-date`, and `release-url`
explicitly.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without external mutation or publication credentials. |
| `version` | No | Release tag | Semver-valid release version. |
| `release-date` | No | Release publication timestamp | Date or timestamp formatted as `Month D, YYYY` for the changelog. |
| `release-url` | No | Release URL | Link recorded in the changelog. |
| `commands` | No | — | Project-specific preparation commands. |
| `root` | No | `${{ github.workspace }}` | Root containing the release source and `package.json`. |
| `bun-version` | No | `auto` | Bun version, or automatic project resolution. |

## Outputs

| Output | Description |
| --- | --- |
| `resolved-version` | Semver-valid version resolved by the upstream preparation action. |

## File behavior

`package.json` is required at `root` and its version is updated. An existing
`CHANGELOG.md` has its current unreleased tokens resolved and receives a fresh
unreleased header; a missing changelog is left missing. `commands` run from
`root` and may use `PREPARE_RELEASE_VERSION`.

Each invocation performs preparation again. In particular, a retry can add
another changelog header if it starts from already-prepared files. Consumers
should publish from the original release source and should not mistake
`sync: false` for an unconditional no-op.

## Test behavior

Release preparation already fixes synchronization to `false`, so
`test-mode: true` runs the normal action against a local fixture. Pull requests
verify the resolved version, package metadata, changelog, project commands, and
unchanged Git history.
