# Tanaab Actions

Reusable composite actions for caller-owned GitHub Actions jobs.

## Catalog

| Action | Purpose |
| --- | --- |
| [npm-pack](npm-pack/README.md) | Pack a package and expose its exact artifact and metadata. |
| [prepare-release](prepare-release/README.md) | Prepare release files without pushing Git changes. |
| [publish-clawhub](publish-clawhub/README.md) | Publish a code-plugin tarball and wait for the result. |
| [publish-codex-plugin](publish-codex-plugin/README.md) | Prepare and optionally upload a Codex plugin release archive. |
| [publish-npm](publish-npm/README.md) | Publish a tested tarball with explicit registry channels. |
| [publish-repo](publish-repo/README.md) | Synchronize prepared release changes and Git tags. |
| [run-leia](run-leia/README.md) | Run Leia scenarios with isolated cross-platform temporary state. |
| [setup-node](setup-node/README.md) | Discover and install the caller’s Node version. |
| [setup-bun](setup-bun/README.md) | Discover and install the caller’s Bun version. |
| [setup-agent-system](setup-agent-system/README.md) | Install Agent System from an exact release or source checkout into isolated OpenClaw. |
| [setup-openclaw](setup-openclaw/README.md) | Install an exact OpenClaw CLI and expose isolated CI helpers. |
| [ssh-test-key](ssh-test-key/README.md) | Generate a local Ed25519 SSH key pair for test fixtures. |
| [validate-codex-plugin](validate-codex-plugin/README.md) | Validate a Codex plugin against a pinned OpenAI validator snapshot. |
| [vitepress-build-check](vitepress-build-check/README.md) | Run optional VitePress preparation and a required build command. |

## Usage

Choose an action for its inputs, outputs, permissions, and supported runners.
See [the release example](publish-npm/examples/release.yml) for packing and testing
one artifact before publication, with repository publication in an independent job.

The first release is in preparation. Examples use the planned `@v1` reference;
pin a reviewed commit until that tag is published. The catalog also ships as
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

[PR checks](https://github.com/tanaabased/actions/actions) verify local behavior;
live releases prove publication. Publishing actions own their production checks.

[Issues](https://github.com/tanaabased/actions/issues) · [Changelog](CHANGELOG.md) ·
[Releases](https://github.com/tanaabased/actions/releases)

## License

[MIT](LICENSE), Tanaab Maneuvering Systems LLC. The vendored OpenAI Codex validator
retains its [Apache-2.0 license](validate-codex-plugin/LICENSE.openai-codex) and
[notice](validate-codex-plugin/NOTICE.openai-codex).
