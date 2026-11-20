<h1 align="center">prepare-release</h1>

<p align="center">
  <img src="icon.svg" alt="Release tag with a check mark" width="180" />
</p>

<p align="center">
  Prepare release files and metadata.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-prepare-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-prepare-release.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Updates release files in the caller’s checkout without pushing changes.

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

Outside a GitHub release event, supply `version`, `release-date`, and `release-url`.
For a development build, use `version: dev` alone. It leaves the changelog untouched.

## Inputs

| Input          | Required | Default                       | Description                                                                          |
| -------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `debug`        | No       | `auto`                        | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`.        |
| `version`      | No       | Release tag                   | Semver-valid release version, or `dev` for an upstream-resolved development version. |
| `release-date` | No       | Release publication timestamp | Date or timestamp formatted as `Month D, YYYY` for the changelog.                    |
| `release-url`  | No       | Release URL                   | Link recorded in the changelog.                                                      |
| `commands`     | No       | —                             | Project-specific preparation commands.                                               |
| `root`         | No       | `${{ github.workspace }}`     | Root containing the release source and `package.json`.                               |
| `bun-version`  | No       | `auto`                        | [Project discovery](../setup-bun/README.md) or explicit Bun version.                 |

Runtime discovery uses `root`; the resolved version is passed upstream.
The upstream preparation action has no debug input.

## Outputs

| Output             | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `resolved-version` | Semver-valid version resolved by the upstream preparation action. |

## Notes

- Release preparation updates the version in `package.json` under `root`. If a changelog exists, it fills in the unreleased header and adds a fresh one.
- Preparation commands run from `root` with `PREPARE_RELEASE_VERSION` set.
- Retry from the original release commit to avoid duplicating a changelog header.
