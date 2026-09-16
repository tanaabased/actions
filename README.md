<h1 align="center">Tanaab Actions</h1>

<p align="center">
  <a href="https://github.com/actions"><img src="https://avatars.githubusercontent.com/u/44036562?v=4" alt="GitHub Actions" width="180" /></a>
</p>

<p align="center">
  Reusable composite actions for preparing releases, packing artifacts, and publishing them to Git, npm, and ClawHub.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/lint-actions.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/lint-actions.yml?event=pull_request&label=Lint" alt="Workflow lint" /></a>
</p>

## Catalog

| Action | Purpose | PR tests |
| --- | --- | --- |
| [npm-pack](npm-pack/README.md) | Pack a package and expose its exact artifact and metadata. | [![npm-pack](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-npm-pack.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-npm-pack.yml) |
| [prepare-release](prepare-release/README.md) | Prepare release files without pushing Git changes. | [![prepare-release](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-prepare-release.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-prepare-release.yml) |
| [publish-clawhub](publish-clawhub/README.md) | Publish a code-plugin tarball and wait for the result. | [![publish-clawhub](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-clawhub.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-clawhub.yml) |
| [publish-npm](publish-npm/README.md) | Publish a tested tarball with explicit registry channels. | [![publish-npm](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-npm.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-npm.yml) |
| [publish-repo](publish-repo/README.md) | Synchronize prepared release changes and Git tags. | [![publish-repo](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-repo.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-repo.yml) |
| [setup-bun-node](setup-bun-node/README.md) | Set up Bun, optional Node.js, and project dependencies. | [![setup-bun-node](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-bun-node.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-setup-bun-node.yml) |

## Usage

Choose an action above for its inputs, outputs, permissions, and examples.
Each action runs inside a caller-owned job; callers choose runners and job
dependencies. Current actions are tested on Linux (`ubuntu-24.04`).

The first release is in preparation. Examples use the planned `@v1` reference;
pin a reviewed commit until that tag is published.

See [the npm release example](publish-npm/examples/release.yml) for packing and
testing one artifact before publication, with repository publication in an
independent job.

PR tests use explicit `test-mode: true` and real local artifacts. Registry and
repository publication are verified through real release lifecycles; the
badges above report PR checks, not live publication.

## Issues

[Report a problem or request an action](https://github.com/tanaabased/actions/issues).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for changes and
[GitHub Releases](https://github.com/tanaabased/actions/releases) for published versions.

## Contributors

<a href="https://github.com/tanaabased/actions/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=tanaabased/actions" alt="Contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
