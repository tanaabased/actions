# `prepare-release`

Prepares a release in the caller's checkout without pushing changes. It wraps
[`tanaabased/prepare-release-action@v1`](https://github.com/tanaabased/prepare-release-action)
with the shared release date and `CHANGELOG.md` contract used by Tanaab
publishers.

Supported runner: Linux (`ubuntu-24.04`).

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

Outside a `release` event, provide `version`, `release-date`, and `release-url`
explicitly.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without external mutation or publication credentials. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `version` | No | Release tag | Semver-valid release version. |
| `release-date` | No | Release publication timestamp | Date or timestamp formatted as `Month D, YYYY` for the changelog. |
| `release-url` | No | Release URL | Link recorded in the changelog. |
| `commands` | No | — | Project-specific preparation commands. |
| `root` | No | `${{ github.workspace }}` | Root containing the release source and `package.json`. |
| `bun-version` | No | `auto` | [Project discovery](../setup-bun/README.md) or explicit Bun version. |

Runtime discovery uses `root`; the resolved version is passed upstream.
The upstream preparation action has no debug input.

## Outputs

| Output | Description |
| --- | --- |
| `resolved-version` | Semver-valid version resolved by the upstream preparation action. |

## Test behavior

Test mode runs normal local preparation. PR tests verify package metadata,
changelog, commands, resolved version, and unchanged Git history.

## Notes

### File behavior

`package.json` is required at `root` and its version is updated. An existing
`CHANGELOG.md` has its current unreleased tokens resolved and receives a fresh
unreleased header; a missing changelog is left missing. `commands` run from
`root` and may use `PREPARE_RELEASE_VERSION`.

Retries can add another changelog header to already-prepared files. Start from
the original release source.
