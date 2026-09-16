# Tanaab Actions

Small, reusable GitHub Actions surfaces for release and publishing work. The
catalog is deliberately compact; a marketplace flea market is not a product
strategy.

## Catalog

| Reusable workflow | Purpose | Documentation |
| --- | --- | --- |
| `publish-npm` | Publish one npm package from a checked-out repository. | [actions/publish-npm](actions/publish-npm/README.md) |
| `publish-repo` | Create a GitHub release for an existing tag. | [actions/publish-repo](actions/publish-repo/README.md) |

## Layout

- `actions/<name>/` is the catalog entry for every public surface. Its README
  documents the contract. Composite actions contain `action.yml`; reusable
  workflows contain `workflow.yml`, a navigation symlink to their canonical
  workflow file.
- `.github/workflows/<workflow>.yml` contains a reusable workflow invoked with
  `uses: tanaabased/actions/.github/workflows/<workflow>.yml@<ref>`.
- `examples/` contains complete consumer workflows. It is not executable
  production configuration; copy the portions that fit the caller.

## Use a reusable workflow

```yaml
jobs:
  publish-repo:
    uses: tanaabased/actions/.github/workflows/publish-repo.yml@v1
    with:
      tag: v1.2.3
    secrets: inherit
```

See [examples/publish.yml](examples/publish.yml) for independent npm and
repository publishing jobs. Neither waits for a ceremonial finalizer.

## Local validation

Run the repository-owned structural check before committing:

```sh
ruby scripts/validate
git diff --check
```

`scripts/validate` parses every workflow and composite-action manifest, then
checks that catalog documentation links resolve. Use
[`actionlint`](https://github.com/rhysd/actionlint) as an additional local
check when it is installed:

```sh
actionlint .github/workflows/*.yml
```
