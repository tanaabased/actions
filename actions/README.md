# Action catalog

Each public surface has one entry at `actions/<name>/`. Start there: its
`README.md` contains the user-facing contract, including usage, inputs,
outputs, permissions, and retry behavior.

Each catalog entry contains `action.yml` and every runtime file it needs. The
actions compose within one caller job so prepared artifacts can be tested and
then handed to publication unchanged.

| Action | Contract |
| --- | --- |
| [`npm-pack`](npm-pack/README.md) | Produce one npm tarball and expose its package metadata. |
| [`prepare-release`](prepare-release/README.md) | Prepare release files without synchronization. |
| [`publish-clawhub`](publish-clawhub/README.md) | Publish a code-plugin tarball with source metadata, channels, and bounded waiting. |
| [`publish-npm`](publish-npm/README.md) | Publish one tested tarball to an npm-compatible registry. |
| [`publish-repo`](publish-repo/README.md) | Synchronize prepared release files and Git tags. |
