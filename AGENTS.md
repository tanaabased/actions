# Repository guidance

## Product boundaries

- Default to a composite action when the reusable product is a sequence of
  steps that belongs inside a caller-owned job.
- Put each public composite action in a root-level `<name>/` directory. Require
  `action.yml` and `README.md`; keep optional runtime helpers under `scripts/`
  and action-owned fixtures under `test/fixture/`. An action may compose another
  public action but must not reach into another action's private scripts or
  fixtures.
- Add a reusable workflow only when the reusable contract genuinely owns job
  topology that a composite action cannot: multiple jobs or dependencies,
  runner selection, service containers, environments or approvals, job-level
  permissions, or job-level concurrency. Document that reason with the
  workflow. Prefer a caller workflow plus composite actions when the caller can
  own those choices.
- Keep repository-owned verification and release workflows in
  `.github/workflows/`. They are lifecycle configuration, not catalog products.
- Keep short usage examples in the owning action's README. Put standalone
  examples under `<name>/examples/` only when they add something the README
  does not cover. Examples combining actions have one primary owner; other
  actions link to that copy. Keep executable test fixtures under
  `<name>/test/fixture/`.

## Action documentation

- Use this README order: description, Usage, Inputs, Outputs, Examples,
  Test behavior, then action-specific Notes. Omit sections with no useful
  content; put required permissions and credentials beside the relevant usage.
- Keep the root README focused on the catalog. Action contracts and examples
  belong in the owning action; link to them rather than duplicating them.
- State supported operating systems in each action README and back those
  claims with its PR runner matrix. Add platforms for actual consumer needs.

## Test-mode contract

- Every public action exposes `test-mode`, defaults it to `false`, and rejects
  values other than `true` or `false`.
- `test-mode: true` must not mutate a registry, repository, tag, release, or
  other external system and must not require publication credentials. It must
  still validate real inputs, operate on real local artifacts, expose every
  locally determinable output, and use a native dry-run mechanism when one
  exists.
- For an action whose normal behavior is already non-mutating, test mode runs
  that normal behavior. Never invent a lesser implementation merely to make
  the switch appear consequential.
- Select test mode explicitly. Never infer it from the event, action path,
  action repository, missing credentials, or any other caller context. A
  misconfigured live publication must fail rather than quietly become a test.
- Each action README includes a **Test behavior** section naming what test mode
  exercises and what only a live lifecycle can prove.
- Test mode is not a sandbox for caller-supplied commands. PR fixtures must use
  commands without external side effects; local installation and artifact
  preparation are expected behavior.

## Pull-request validation

- Give every composite action one `.github/workflows/pr-<name>.yml` workflow.
  It checks out the repository, invokes `./<name>` with `test-mode: true`, and
  asserts inputs, outputs, and observable postconditions. Use a matrix when the
  same assertions meaningfully cover several input classes.
- Keep workflow and job names aligned with the action basename. Preserve stable
  check identities when changing matrices or repository rules.
- Run static workflow validation and all non-mutating action tests on pull
  requests. Do not repeat tests across GitHub event types unless an event
  payload is part of the public contract; events are triggers, not test
  dimensions.
- Verify behavior whose defining result is an external mutation during the
  first real lifecycle that consumes it. Do not maintain synthetic registries,
  publication packages, branches, or tags merely to impersonate production.
- Keep lint checks separate from action behavior tests. Avoid conditionally
  skipped test jobs and workflows created only to manufacture event coverage.
- Include action-owned example workflows in the existing static lint check.

### Testing vectors

| Product | Pull request | Release lifecycle |
| --- | --- | --- |
| `prepare-release` | Prepare and inspect its local fixture | None |
| `npm-pack` | Pack, inspect, install, and exercise its exact tarball | None |
| `publish-clawhub` | Pack its code-plugin fixture and exercise ClawHub's dry-run path | First real Agent System ClawHub publication |
| `publish-codex-plugin` | Prepare both dependency-policy archives and compare their exact unpacked contents | First real consumer GitHub Release upload and download |
| `publish-npm` | Exercise stable and prerelease tarballs through npm's dry-run path | Real downstream npm publication |
| `publish-repo` | Prepare and inspect its local fixture without synchronizing Git | This repository's real release |
| `validate-codex-plugin` | Accept a valid fixture and reject an invalid fixture on Linux and macOS | None |
