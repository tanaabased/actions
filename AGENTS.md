# Repository guidance

## Action validation

- Treat this repository's products as composite actions. Do not introduce
  `workflow_call`, `workflow_dispatch`, or push-triggered workflows solely to
  test them.
- Run static workflow validation and non-mutating action tests on pull requests.
- Exercise pull-request-safe actions through `uses: ./actions/<name>` with
  explicit inputs, then assert outputs and observable postconditions.
- Do not repeat tests across GitHub event types unless an event payload is part
  of the action's public contract. Events are triggers, not test dimensions.
- Verify actions whose defining behavior mutates a registry or repository only
  when a real release lifecycle performs that mutation. Do not maintain
  synthetic publication environments, test packages, branches, or tags.
- Name action-test jobs after their action paths, such as `actions/npm-pack`.
  Keep lint checks named after their tool.
- Avoid conditionally skipped test jobs. Separate genuinely different gates,
  and remove workflows that exist only to manufacture event coverage.
- When adding an action, classify it as pull-request-safe or externally
  mutating and update the testing vectors below.

### Testing vectors

| Action | Pull request | Release lifecycle |
| --- | --- | --- |
| `actions/prepare-release` | Prepare and inspect a local fixture without synchronizing Git | None |
| `actions/npm-pack` | Pack, inspect, install, and exercise the exact tarball | None |
| `actions/publish-npm` | Static validation only | Real downstream npm publication |
| `actions/publish-repo` | Static validation only | This repository's real release |
