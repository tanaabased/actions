# Tanaab Actions

Small, reusable GitHub Actions surfaces for release and publishing work. The
catalog is deliberately compact; a marketplace flea market is not a product
strategy.

## Catalog

| Surface | Purpose | Documentation |
| --- | --- | --- |
| `npm-pack` | Pack one npm package and expose the exact artifact and metadata. | [actions/npm-pack](actions/npm-pack/README.md) |
| `prepare-release` | Prepare release files without pushing Git changes. | [actions/prepare-release](actions/prepare-release/README.md) |
| `publish-clawhub` | Publish one code-plugin tarball and wait for ClawHub's verdict. | [actions/publish-clawhub](actions/publish-clawhub/README.md) |
| `publish-npm` | Publish one tested tarball with explicit registry channels. | [actions/publish-npm](actions/publish-npm/README.md) |
| `publish-repo` | Synchronize prepared release changes and Git tags. | [actions/publish-repo](actions/publish-repo/README.md) |

## Layout

- `actions/<name>/` is the catalog entry for every public surface. Its README
  documents the contract and `action.yml` contains the composite action.
- `.github/workflows/` contains this repository's release and verification
  workflows.
- `examples/` contains complete consumer workflows. It is not executable
  production configuration; copy the portions that fit the caller.

## Use the catalog

```yaml
jobs:
  publish-repo:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: tanaabased/actions/actions/publish-repo@v1
        with:
          sync-tags: v1
          sync-token: ${{ secrets.RELEASE_SYNC_TOKEN }}
```

See [examples/publish.yml](examples/publish.yml) for a pack-once npm publication
and an independent repository publication. Neither waits for a ceremonial
finalizer.
