## {{ UNRELEASED_VERSION }} - [{{ UNRELEASED_DATE }}]({{ UNRELEASED_LINK }})

- Fixed `setup-openclaw` helpers to preserve explicit OpenClaw log levels and export the raw gateway log path. [#38](https://github.com/tanaabased/actions/pull/38)

## v1.0.0-beta.2 - [September 17, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0-beta.2)

- Added Agent System installation from exact versions, local tarballs or source directories, and explicit GitHub refs. [#37](https://github.com/tanaabased/actions/pull/37)
- Added inferred install, setup, and run modes to `setup-openclaw`, sharing one helper contract with later Leia commands. [#37](https://github.com/tanaabased/actions/pull/37)
- Added optional Secret Service, SSH, model, opCache, and YOLO setup with verified Agent System runtime and fixture path outputs. [#37](https://github.com/tanaabased/actions/pull/37)
- Fixed gateway and diagnostic helpers to reuse saved context after Leia workspace changes. [#37](https://github.com/tanaabased/actions/pull/37)
- Fixed gateway readiness to require an OpenClaw CLI request and retain onboarding authentication. [#37](https://github.com/tanaabased/actions/pull/37)
- Removed `setup-agent-system`; use `setup-openclaw` with `agent-system` or the `openclaw-setup --agent-system` helper. [#37](https://github.com/tanaabased/actions/pull/37)
- Removed the no-op `test-mode` input from non-mutating actions; these actions now always run normally. [#35](https://github.com/tanaabased/actions/pull/35)
- Renamed publishers' `test-mode` input to `dry-run`; consumers must update it before adopting this release. [#35](https://github.com/tanaabased/actions/pull/35)
- Updated action check names to `Test action / <action-name>` with concise runner and case labels. [#37](https://github.com/tanaabased/actions/pull/37)

## v1.0.0-beta.1 - [September 17, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0-beta.1)

- Added [`npm-pack`](https://github.com/tanaabased/actions/tree/main/npm-pack) to pack a package and expose its exact artifact and metadata.
- Added [`prepare-release`](https://github.com/tanaabased/actions/tree/main/prepare-release) to prepare release files without pushing Git changes.
- Added [`publish-clawhub`](https://github.com/tanaabased/actions/tree/main/publish-clawhub) to publish a tested code-plugin tarball to ClawHub.
- Added [`publish-codex-plugin`](https://github.com/tanaabased/actions/tree/main/publish-codex-plugin) to prepare and upload a Codex plugin release archive.
- Added [`publish-npm`](https://github.com/tanaabased/actions/tree/main/publish-npm) to publish a tested tarball and verify its registry artifact and channels.
- Added [`publish-repo`](https://github.com/tanaabased/actions/tree/main/publish-repo) to synchronize prepared release changes and verify Git branches and tags.
- Added [`run-leia`](https://github.com/tanaabased/actions/tree/main/run-leia) to run Leia scenarios with isolated cross-platform temporary state.
- Added [`setup-agent-system`](https://github.com/tanaabased/actions/tree/main/setup-agent-system) to install Agent System from a release or source into isolated OpenClaw.
- Added [`setup-bun`](https://github.com/tanaabased/actions/tree/main/setup-bun) to discover and install the caller's Bun version.
- Added [`setup-node`](https://github.com/tanaabased/actions/tree/main/setup-node) to discover and install the caller's Node version.
- Added [`setup-openclaw`](https://github.com/tanaabased/actions/tree/main/setup-openclaw) to install an exact OpenClaw CLI and expose isolated CI helpers.
- Added [`ssh-test-key`](https://github.com/tanaabased/actions/tree/main/ssh-test-key) to generate local Ed25519 SSH keys for test fixtures.
- Added [`validate-codex-plugin`](https://github.com/tanaabased/actions/tree/main/validate-codex-plugin) to validate Codex plugins against a pinned OpenAI validator.
- Added [`vitepress-build-check`](https://github.com/tanaabased/actions/tree/main/vitepress-build-check) to run optional preparation and a required VitePress build.
