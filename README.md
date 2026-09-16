# Tanaab Actions

Small, reusable GitHub Actions surfaces for release and publishing work. The
catalog is deliberately compact; a marketplace flea market is not a product
strategy.

## Catalog

| Surface | Purpose | Documentation |
| --- | --- | --- |
| `npm-pack` | Pack one npm package and expose the exact artifact and metadata. | [npm-pack](npm-pack/README.md) |
| `prepare-release` | Prepare release files without pushing Git changes. | [prepare-release](prepare-release/README.md) |
| `publish-clawhub` | Publish one code-plugin tarball and wait for ClawHub's verdict. | [publish-clawhub](publish-clawhub/README.md) |
| `publish-npm` | Publish one tested tarball with explicit registry channels. | [publish-npm](publish-npm/README.md) |
| `publish-repo` | Synchronize prepared release changes and Git tags. | [publish-repo](publish-repo/README.md) |

## Layout

- `<name>/` is the root-level catalog entry for every public composite action.
  Its README documents the contract, `action.yml` defines the action, and any
  supporting scripts or fixtures remain inside that directory.
- `.github/workflows/` contains this repository's release and verification
  workflows. Each action has one `pr-<name>.yml` workflow that invokes its
  explicit, non-mutating `test-mode`.
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
      - uses: tanaabased/actions/publish-repo@v1
        with:
          sync-tags: v1
          sync-token: ${{ secrets.RELEASE_SYNC_TOKEN }}
```

See [examples/publish.yml](examples/publish.yml) for a pack-once npm publication
and an independent repository publication. Neither waits for a ceremonial
finalizer.
