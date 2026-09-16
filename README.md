# Tanaab Actions

Small, reusable GitHub Actions surfaces for release and publishing work. The
catalog is deliberately compact; a marketplace flea market is not a product
strategy.

## Catalog

| Reusable workflow | Purpose | Documentation |
| --- | --- | --- |
| `publish-npm` | Publish one npm package from a checked-out repository. | [docs/publish-npm.md](docs/publish-npm.md) |
| `publish-repo` | Create a GitHub release for an existing tag. | [docs/publish-repo.md](docs/publish-repo.md) |

## Layout

- `actions/<action>/action.yml` contains a composite action and only the files
  it needs at runtime.
- `.github/workflows/<workflow>.yml` contains a reusable workflow invoked with
  `uses: tanaabased/actions/.github/workflows/<workflow>.yml@<ref>`.
- `docs/<name>.md` is the public contract for an action or reusable workflow:
  usage, inputs, outputs, permissions, and retry behavior belong there.
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
