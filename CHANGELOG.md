## {{ UNRELEASED_VERSION }} - [{{ UNRELEASED_DATE }}]({{ UNRELEASED_LINK }})

## v1.0.0 - [September 21, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0)

### Action catalog

- Added [`npm-pack`](https://github.com/tanaabased/actions/tree/main/npm-pack) to pack a package and expose its exact tarball and metadata.
- Added [`prepare-release`](https://github.com/tanaabased/actions/tree/main/prepare-release) to prepare release files without pushing Git changes.
- Added [`publish-clawhub`](https://github.com/tanaabased/actions/tree/main/publish-clawhub) to publish a tested code-plugin tarball and wait for ClawHub's result.
- Added [`publish-codex-plugin`](https://github.com/tanaabased/actions/tree/main/publish-codex-plugin) to prepare and optionally upload a Codex plugin release archive.
- Added [`publish-npm`](https://github.com/tanaabased/actions/tree/main/publish-npm) to publish a tested tarball using trusted publishing or tokens, with stable and prerelease channels.
- Added [`publish-repo`](https://github.com/tanaabased/actions/tree/main/publish-repo) to synchronize prepared release changes, branches, and tags.
- Added [`run-leia`](https://github.com/tanaabased/actions/tree/main/run-leia) to run Leia scenarios with isolated cross-platform temporary state.
- Added [`setup-bun`](https://github.com/tanaabased/actions/tree/main/setup-bun) to discover and install the caller's Bun version.
- Added [`setup-node`](https://github.com/tanaabased/actions/tree/main/setup-node) to discover and install the caller's Node.js version.
- Added [`setup-openclaw`](https://github.com/tanaabased/actions/tree/main/setup-openclaw) to install OpenClaw and prepare isolated Agent System tests on Linux and macOS.
- Added [`ssh-test-key`](https://github.com/tanaabased/actions/tree/main/ssh-test-key) to generate local Ed25519 SSH keys for test fixtures.
- Added [`validate-codex-plugin`](https://github.com/tanaabased/actions/tree/main/validate-codex-plugin) to validate Codex plugins against a pinned OpenAI validator.
- Added [`vitepress-build-check`](https://github.com/tanaabased/actions/tree/main/vitepress-build-check) to run optional preparation and a required VitePress build.

### OpenClaw and Agent System

- Added Agent System installation from exact versions, local tarballs or source directories, and explicit GitHub refs. [#37](https://github.com/tanaabased/actions/pull/37)
- Added inferred install, setup, and run modes with optional Secret Service, SSH, model, opCache, and YOLO configuration. [#37](https://github.com/tanaabased/actions/pull/37)
- Added setup, gateway, and diagnostics CLI commands with saved context, readiness checks, bare `--debug` switches, and gateway log paths. [#37](https://github.com/tanaabased/actions/pull/37) [#39](https://github.com/tanaabased/actions/pull/39)

### Shared behavior and release reliability

- Added `debug: auto|true|false` across the catalog; `auto` follows `RUNNER_DEBUG=1`.
- Added credential-free publisher dry runs that validate local artifacts without external publication or mutation. [#35](https://github.com/tanaabased/actions/pull/35)
- Fixed parallel release checkout failures by pinning each publication job to the triggering commit, preserving independent publishers. [#41](https://github.com/tanaabased/actions/pull/41)
- Removed registry visibility polling and redundant Git readbacks; successful publication commands determine success. [#40](https://github.com/tanaabased/actions/pull/40)

### Upgrading from early betas

- Removed `setup-agent-system`; use `setup-openclaw` with `agent-system` or the `openclaw-setup --agent-system` helper. [#37](https://github.com/tanaabased/actions/pull/37)
- Removed `test-mode` from non-mutating actions and renamed it to `dry-run` on publishers; update existing workflows accordingly. [#35](https://github.com/tanaabased/actions/pull/35)

## v1.0.0-beta.5 - [September 17, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0-beta.5)

- Fixed parallel release checkout failures by pinning each job to the triggering commit. [#41](https://github.com/tanaabased/actions/pull/41)

## v1.0.0-beta.4 - [September 17, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0-beta.4)

- Removed registry visibility polling and redundant registry lookups from `publish-npm`; publication command results determine success. [#40](https://github.com/tanaabased/actions/pull/40)
- Removed remote branch and tag readback from `publish-repo`; the upstream synchronization result determines success. [#40](https://github.com/tanaabased/actions/pull/40)
- Simplified `setup-openclaw` verification while retaining final configuration validation, plugin loading checks, and service readiness. [#40](https://github.com/tanaabased/actions/pull/40)

## v1.0.0-beta.3 - [September 17, 2026](https://github.com/tanaabased/actions/releases/tag/v1.0.0-beta.3)

- Added `openclaw-gateway log-path` to print the absolute raw gateway log path. [#39](https://github.com/tanaabased/actions/pull/39)
- Added bare `--debug` switches to all `setup-openclaw` CLI commands. [#39](https://github.com/tanaabased/actions/pull/39)
- Fixed OpenClaw helpers overwriting an explicit `OPENCLAW_LOG_LEVEL`. [#39](https://github.com/tanaabased/actions/pull/39)
- Updated `setup-openclaw` to emit bare setup switches while preserving its existing action inputs. [#39](https://github.com/tanaabased/actions/pull/39)

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
