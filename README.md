<h1 align="center">Tanaab Actions</h1>

<p align="center">
  <a href="https://github.com/actions"><img src="https://avatars.githubusercontent.com/u/44036562?v=4" alt="GitHub Actions" width="180" /></a>
</p>

<p align="center">
  Reusable composite actions for setting up runtimes and OpenClaw, validating plugins, preparing releases, packing artifacts, and publishing them to GitHub, npm, and ClawHub.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/releases"><img src="https://img.shields.io/github/v/release/tanaabased/actions?include_prereleases&amp;sort=semver" alt="Latest release, including prereleases" /></a>
  <a href="https://github.com/tanaabased/actions/actions/workflows/lint-actions.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/lint-actions.yml?event=pull_request&label=Lint" alt="Workflow lint" /></a>
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-release.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-release.yml?event=pull_request&label=Catalog%20tests" alt="Catalog release tests" /></a>
</p>

## Catalog

| Action | Purpose | PR tests |
| --- | --- | --- |
| [npm-pack](npm-pack/README.md) | Pack a package and expose its exact artifact and metadata. | [![npm-pack](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-npm-pack.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-npm-pack.yml) |
| [prepare-release](prepare-release/README.md) | Prepare release files without pushing Git changes. | [![prepare-release](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-prepare-release.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-prepare-release.yml) |
| [publish-clawhub](publish-clawhub/README.md) | Publish a code-plugin tarball and wait for the result. | [![publish-clawhub](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-clawhub.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-clawhub.yml) |
| [publish-codex-plugin](publish-codex-plugin/README.md) | Prepare and optionally upload a Codex plugin release archive. | [![publish-codex-plugin](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-codex-plugin.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-codex-plugin.yml) |
| [publish-npm](publish-npm/README.md) | Publish a tested tarball with explicit registry channels. | [![publish-npm](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-npm.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-npm.yml) |
| [publish-repo](publish-repo/README.md) | Synchronize prepared release changes and Git tags. | [![publish-repo](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-publish-repo.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-publish-repo.yml) |
| [run-leia](run-leia/README.md) | Run Leia scenarios with isolated cross-platform temporary state. | [![run-leia](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-run-leia.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-run-leia.yml) |
| [setup-node](setup-node/README.md) | Discover and install the caller’s Node version. | [![setup-node](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-node.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-setup-node.yml) |
| [setup-bun](setup-bun/README.md) | Discover and install the caller’s Bun version. | [![setup-bun](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-bun.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-setup-bun.yml) |
| [setup-agent-system](setup-agent-system/README.md) | Install Agent System from an exact release or source checkout into isolated OpenClaw. | [![setup-agent-system](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-agent-system.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-setup-agent-system.yml) |
| [setup-openclaw](setup-openclaw/README.md) | Install an exact OpenClaw CLI and expose isolated CI helpers. | [![setup-openclaw](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-setup-openclaw.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-setup-openclaw.yml) |
| [ssh-test-key](ssh-test-key/README.md) | Generate a local Ed25519 SSH key pair for test fixtures. | [![ssh-test-key](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-ssh-test-key.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-ssh-test-key.yml) |
| [validate-codex-plugin](validate-codex-plugin/README.md) | Validate a Codex plugin against a pinned OpenAI validator snapshot. | [![validate-codex-plugin](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-validate-codex-plugin.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-validate-codex-plugin.yml) |
| [vitepress-build-check](vitepress-build-check/README.md) | Run optional VitePress preparation and a required build command. | [![vitepress-build-check](https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-vitepress-build-check.yml?event=pull_request&label=Tests)](https://github.com/tanaabased/actions/actions/workflows/pr-vitepress-build-check.yml) |

## Usage

Choose an action above for its inputs, outputs, permissions, and supported runners.
Each action runs inside a caller-owned job; callers choose runners and job dependencies.
See [the release example](publish-npm/examples/release.yml) for packing and testing
one artifact before publication, with repository publication in an independent job.

The first release is in preparation. Examples use the planned `@v1` reference;
pin a reviewed commit until that tag is published. The npm catalog package is
`@tanaab/actions`; GitHub workflows consume Git references such as `@v1`. Composed actions use
GitHub.com’s same-repository `$/` references to keep wrappers at the caller-selected
action revision; GitHub Enterprise Server does not support that syntax.

Runtime selection follows project version files, then package metadata, then
Node `26.x` or Bun `1.4.x`. See [setup-node](setup-node/README.md) and
[setup-bun](setup-bun/README.md) for precedence and explicit overrides.

## Common inputs

- `test-mode`: `false` by default; accepts only `true` or `false`. Test mode
  uses real local artifacts and native dry runs without publication credentials
  or external mutations. Actions whose normal behavior is non-mutating run
  normally. Caller-supplied commands are not sandboxed; use safe PR fixtures.
- `debug`: `auto` by default; accepts `auto`, `true`, or `false`. Auto follows
  `RUNNER_DEBUG=1`, including GitHub's **Enable debug logging** rerun option.
  Explicit values override it. Diagnostics use supported tool verbosity without
  rewriting caller commands or exposing credentials; failure summaries remain
  enabled in every mode. Action READMEs note tool-specific exceptions.

The test badges report [PR checks](https://github.com/tanaabased/actions/actions) of local
behavior and dry runs; live releases prove publication. Publishing actions own
their production checks.

## Issues, Questions and Support

[Report a problem or request an action](https://github.com/tanaabased/actions/issues).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for changes and
[GitHub Releases](https://github.com/tanaabased/actions/releases) for published versions.

## Contributors

<a href="https://github.com/tanaabased/actions/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=tanaabased/actions" alt="Contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## License

- Repository-owned actions and helpers: [MIT](LICENSE), Tanaab Maneuvering Systems LLC.
- Vendored OpenAI Codex validator: [Apache-2.0](validate-codex-plugin/LICENSE.openai-codex), with its [notice](validate-codex-plugin/NOTICE.openai-codex).
