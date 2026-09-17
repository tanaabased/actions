# `publish-clawhub`

Publishes one supplied code-plugin tarball to ClawHub with explicit owner,
source, and release-channel metadata. Live publication waits for security checks
and a definitive result.

Use [`npm-pack`](../npm-pack/README.md) to produce the artifact.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Create the token in ClawHub and store it as a GitHub Actions secret. The action
uses the token only for `clawhub login`, stores the resulting CLI state in an
isolated temporary configuration, and removes that configuration afterward.
The token's ClawHub actor must have publisher access to `owner`.

```yaml
- name: Pack plugin
  id: pack
  uses: tanaabased/actions/npm-pack@v1

- name: Publish plugin to ClawHub
  uses: tanaabased/actions/publish-clawhub@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
    owner: tanaab
    tags: ${{ github.event.release.prerelease && 'edge' || 'latest,edge' }}
    source-repo: ${{ github.repository }}
    source-commit: ${{ github.sha }}
    clawhub-token: ${{ secrets.CLAWHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Exercise the action without authenticating or publishing. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `tarball` | Yes | — | Code-plugin tarball, relative to the workspace or absolute. |
| `owner` | Yes | — | ClawHub user or organization publisher handle. |
| `clawhub-token` | Live publication | — | ClawHub API token; omit in test mode. |
| `tags` | No | `latest` | Comma-separated release channels. |
| `source-repo` | No | `${{ github.repository }}` | Source repository recorded by ClawHub. |
| `source-commit` | No | `${{ github.sha }}` | Source commit recorded by ClawHub. |
| `wait-timeout` | No | `1800` | Maximum seconds to wait for definitive live publication. |
| `working-directory` | No | `${{ github.workspace }}` | Project directory for runtime discovery. |
| `node-version` | No | `auto` | [Project discovery](../setup-node/README.md) or explicit Node version. |
| `clawhub-version` | No | `0.23.3` | ClawHub CLI version installed for publication. |

For a consumer pull-request dry run, set `test-mode: true` to validate its
tarball and publication metadata while suppressing authentication and publication.

Debug enables verbose npm output; ClawHub has no supported verbosity control.

The package family is fixed to `code-plugin`.

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the supplied tarball. |

## Test behavior

Test mode uses ClawHub's native dry-run path to validate the supplied tarball
and publication metadata without logging in or changing ClawHub. It does not
prove token access, asynchronous security checks, final channel visibility, or
timeout behavior.

## Notes

### Waiting and retries

Live runs call `clawhub package publish` once with `--wait` and the bounded
`--wait-timeout`. The step succeeds only when ClawHub reports successful
publication; terminal security-check failures, authentication failures, and
timeouts fail the action.

The action does not retry publication automatically. After a failure or
timeout, inspect the package and attempt in ClawHub before rerunning the
workflow; a timed-out client does not prove the registry abandoned the attempt.
