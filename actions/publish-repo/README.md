# `publish-repo`

Creates a GitHub release for an existing tag in the caller repository. If the
release already exists, it returns that release instead of manufacturing a
second ceremony around the same tag.

The canonical reusable workflow is [workflow.yml](workflow.yml).

## Usage

```yaml
jobs:
  publish-repo:
    uses: tanaabased/actions/.github/workflows/publish-repo.yml@v1
    with:
      tag: v1.2.3
      prerelease: false
    secrets:
      token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `tag` | Yes | — | Existing Git tag to publish. |
| `prerelease` | No | `false` | Mark the created release as a prerelease. |

## Secrets

| Secret | Required | Description |
| --- | --- | --- |
| `token` | Yes | Token that may create releases in the caller repository. |

## Outputs

| Output | Description |
| --- | --- |
| `release-url` | URL of the created or already-existing GitHub release. |

## Permissions

The workflow declares `contents: write`. A caller using `GITHUB_TOKEN` must
also allow that permission at the calling workflow or job; a more restricted
token will fail, correctly and without sentiment.

## Retry behavior

The workflow first looks up a release for `tag`. A re-run after a successful
creation returns the existing URL. Failures before a release exists are not
retried internally; correct the cause and re-run the job.
