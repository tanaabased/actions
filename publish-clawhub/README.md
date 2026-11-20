<h1 align="center">publish-clawhub</h1>

<p align="center">
  <img src="icon.svg" alt="Claw symbol with a publish arrow" width="180" />
</p>

<p align="center">
  Publish a plugin package to ClawHub.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-publish-clawhub.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-clawhub.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Pass the code-plugin tarball produced by [npm-pack](../npm-pack/README.md).
Live publication waits for ClawHub’s security checks and publication result.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Store a ClawHub token with publisher access to `owner` in a GitHub Actions secret.

On a GitHub release event, the default tags are `latest,edge` for a Latest
non-prerelease release and `edge` for other releases. The workflow needs
`contents: read` to check release status. Outside release events, omitting
`tags` uses the ClawHub CLI default (currently `latest`). Set `tags: edge`
to publish a manual preview. Explicit tags take precedence on any event.

```yaml
- uses: actions/checkout@v7
  with:
    ref: ${{ github.sha }}

- name: Pack plugin
  id: pack
  uses: tanaabased/actions/npm-pack@v1

- name: Publish plugin to ClawHub
  uses: tanaabased/actions/publish-clawhub@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
    owner: tanaab
    clawhub-token: ${{ secrets.CLAWHUB_TOKEN }}
```

For parallel release jobs, follow the [shared checkout guidance](../publish-repo/README.md#usage).

## Inputs

| Input               | Required         | Default                    | Description                                                                   |
| ------------------- | ---------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `dry-run`           | No               | `false`                    | Use ClawHub's native dry run without authentication or publication.           |
| `debug`             | No               | `auto`                     | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `tarball`           | Yes              | —                          | Code-plugin tarball, relative to the workspace or absolute.                   |
| `owner`             | Yes              | —                          | ClawHub user or organization publisher handle.                                |
| `clawhub-token`     | Live publication | —                          | ClawHub API token; omit in dry runs.                                          |
| `tags`              | No               | Automatic                  | Comma-separated channels overriding the release or CLI default.               |
| `source-repo`       | No               | `${{ github.repository }}` | Source repository recorded by ClawHub.                                        |
| `source-commit`     | No               | `${{ github.sha }}`        | Source commit recorded by ClawHub.                                            |
| `wait-timeout`      | No               | `1800`                     | Maximum seconds to wait for definitive live publication.                      |
| `working-directory` | No               | `${{ github.workspace }}`  | Project directory for CLI and runtime discovery.                              |
| `node-version`      | No               | `auto`                     | [Project discovery](../setup-node/README.md) or explicit Node version.        |
| `clawhub-version`   | No               | `auto`                     | Explicit CLI version or range, or caller dependency discovery.                |

With `clawhub-version: auto`, the action reads `devDependencies.clawhub` or
`dependencies.clawhub` from `working-directory`'s `package.json`. Both must match
when present; peer dependencies are ignored. An absent manifest or declaration
falls back to npm `latest`. Explicit versions bypass discovery. Malformed
manifests, conflicting or invalid declarations, and npm resolution failures do
not fall back.

For repeatable selection, declare `"clawhub": "0.26.0"` in the caller's
`devDependencies` or set `clawhub-version` explicitly. Ranges and `latest` can
change between runs. CLI `0.26.0` requires Node.js `^22.13.0 || >=24`; if runtime
discovery selects an older Node version, set `node-version: 24`. Other CLI versions
use their own runtime requirements.

Debug enables verbose npm output; ClawHub has no supported verbosity control.

## Outputs

| Output         | Description                            |
| -------------- | -------------------------------------- |
| `tarball-path` | Absolute path to the supplied tarball. |

## Notes

- If publication times out, check the attempt in ClawHub before retrying. The upload may still be processing.
