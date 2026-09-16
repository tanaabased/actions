# `publish-clawhub`

Publishes one supplied code-plugin tarball to ClawHub with explicit owner,
source, and release-channel metadata. Live publication waits for security checks
and a definitive result, because “pending somewhere” is not a release outcome.

Use [`npm-pack`](../npm-pack/README.md) to produce the artifact.

## Live publication

```yaml
- name: Pack plugin
  id: pack
  uses: tanaabased/actions/actions/npm-pack@v1

- name: Publish plugin to ClawHub
  uses: tanaabased/actions/actions/publish-clawhub@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
    owner: tanaab
    tags: ${{ github.event.release.prerelease && 'edge' || 'latest,edge' }}
    source-repo: ${{ github.repository }}
    source-commit: ${{ github.sha }}
    clawhub-token: ${{ secrets.CLAWHUB_TOKEN }}
```

Create the token in ClawHub and store it as a GitHub Actions secret. The action
uses the token only for `clawhub login`, stores the resulting CLI state in an
isolated temporary configuration, and removes that configuration afterward.
The token's ClawHub actor must have publisher access to `owner`.

## Dry-run validation

```yaml
- name: Validate ClawHub package
  uses: tanaabased/actions/actions/publish-clawhub@v1
  with:
    tarball: ${{ steps.pack.outputs.tarball-path }}
    owner: tanaab
    tags: edge
    source-repo: ${{ github.repository }}
    source-commit: ${{ github.event.pull_request.head.sha }}
    dry-run: true
```

A dry run validates the supplied tarball and publication metadata without
logging in or changing ClawHub. It does not prove token access, asynchronous
security checks, final channel visibility, or timeout behavior.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `tarball` | Yes | — | Code-plugin tarball, relative to the workspace or absolute. |
| `owner` | Yes | — | ClawHub user or organization publisher handle. |
| `clawhub-token` | Live publication | — | ClawHub API token; omit for dry runs. |
| `tags` | No | `latest` | Comma-separated release channels. |
| `source-repo` | No | `${{ github.repository }}` | Source repository recorded by ClawHub. |
| `source-commit` | No | `${{ github.sha }}` | Source commit recorded by ClawHub. |
| `dry-run` | No | `false` | Validate without authenticating or publishing. |
| `wait-timeout` | No | `1800` | Maximum seconds to wait for definitive live publication. |
| `node-version` | No | `24` | Node.js version used to install and run the CLI. |
| `clawhub-version` | No | `0.23.3` | ClawHub CLI version installed for publication. |

The package family is fixed to `code-plugin`.

## Outputs

| Output | Description |
| --- | --- |
| `tarball-path` | Absolute path to the supplied tarball. |

## Waiting and retries

Live runs call `clawhub package publish` once with `--wait` and the bounded
`--wait-timeout`. The step succeeds only when ClawHub reports successful
publication; terminal security-check failures, authentication failures, and
timeouts fail the action.

The action does not retry publication automatically. After a failure or
timeout, inspect the package and attempt in ClawHub before rerunning the
workflow; a timed-out client does not prove the registry abandoned the attempt.
The first Agent System release that consumes this action owns live evidence for
authentication, metadata, channels, and conclusive waiting. Pull requests prove
only packing and ClawHub's dry-run path; a dedicated live test package is
deliberately deferred.
