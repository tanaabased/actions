# `publish-npm`

Publishes one npm package from the caller repository. It does not create a
release, tag a commit, or retry a registry write. Those are separate decisions,
as they should be.

The canonical reusable workflow is [workflow.yml](workflow.yml).

## Usage

```yaml
jobs:
  publish-npm:
    uses: tanaabased/actions/.github/workflows/publish-npm.yml@v1
    with:
      package-directory: packages/cli
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `package-directory` | No | `.` | Directory containing `package.json`. |
| `registry-url` | No | `https://registry.npmjs.org` | npm-compatible registry URL. |

## Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `npm-token` | Yes | Token authorized to publish to `registry-url`. |

## Outputs

| Output | Description |
| --- | --- |
| `package-version` | The version read from the published package's `package.json`. |

## Permissions

The workflow requires `contents: read` to check out the caller repository.
Registry authorization comes from `npm-token`, not a broad GitHub token.

## Retry behavior

The workflow makes one `npm publish` attempt. Re-run only after determining
whether the version reached the registry: retries of a successful publish fail
because versions are immutable, a detail npm has chosen to make everyone learn.
