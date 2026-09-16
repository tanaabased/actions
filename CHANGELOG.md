## {{ UNRELEASED_VERSION }} - [{{ UNRELEASED_DATE }}]({{ UNRELEASED_LINK }})

- Added a ClawHub publisher for tested code-plugin tarballs with source metadata, channels, and bounded waits. [#4](https://github.com/tanaabased/actions/issues/4)
- Added an npm packing action that exposes the exact tarball and package metadata.
- Added shared release preparation and repository publication actions.
- Added the initial action catalog and repository structure.
- Replaced directory-based npm publication with tested-tarball publication,
  trusted-publishing support, explicit channels, and immutable-version checks.
