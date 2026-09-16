# Repository guidance

## Workflow validation

- Treat composite actions and reusable workflows as workflow products with
  different invocation contracts. Do not introduce products, triggers, or
  events solely to manufacture test coverage.
- Run static workflow validation and non-mutating workflow tests on pull
  requests.
- Exercise pull-request-safe composite actions through
  `uses: ./actions/<name>` with explicit inputs. Exercise pull-request-safe
  reusable workflows from caller jobs using their local workflow paths. Assert
  outputs and observable postconditions in either case.
- Do not repeat tests across GitHub event types unless an event payload is part
  of the product's public contract. Events are triggers, not test dimensions.
- Verify workflow products whose defining behavior mutates a registry or
  repository only when a real release lifecycle performs that mutation. Do not
  maintain synthetic publication environments, test packages, branches, or
  tags.
- Name workflow-test jobs after the action directory basename or workflow
  filename without its extension, such as `npm-pack` or `prepare-release`.
  Qualify a name only when products collide. Keep lint checks named after their
  tool.
- Avoid conditionally skipped test jobs. Separate genuinely different gates,
  and remove workflows that exist only to manufacture event coverage.
- When adding a composite action or reusable workflow, classify it as
  pull-request-safe or externally mutating and update the testing vectors
  below.

### Testing vectors

| Product | Pull request | Release lifecycle |
| --- | --- | --- |
| `actions/prepare-release` | Prepare and inspect a local fixture without synchronizing Git | None |
| `actions/npm-pack` | Pack, inspect, install, and exercise the exact tarball | None |
| `actions/publish-clawhub` | Pack a code-plugin fixture and exercise ClawHub's dry-run path | First real Agent System ClawHub publication |
| `actions/publish-npm` | Static validation only | Real downstream npm publication |
| `actions/publish-repo` | Static validation only | This repository's real release |
