# Repository guidance

## Product boundaries

- Public actions must work across caller repositories. Resolve consumer files
  from inputs or the workspace and bundled helpers from `GITHUB_ACTION_PATH`.
  Keep catalog package names, fixtures, and release policy in repository automation.
- Put each public action in a root `<name>/` with `action.yml` and `README.md`.
  Action-owned helpers belong in `<name>/scripts/`, fixtures in `<name>/test/fixture/`,
  shared runtime in `.lib/`, and repository-only checks in `.github/scripts/`.
  Compose public actions; never reach into another action's private files.
- Prefer composite actions inside caller-owned jobs. Use reusable workflows only
  for contracts that require job topology, runners, services, environments,
  approvals, permissions, or concurrency; document that reason.
- Keep repository lifecycle workflows in `.github/workflows/`.
- Production guarantees, including publication readback, belong inside actions.
  Consumer workflows may add product-specific checks such as catalog contents.
  Independent assertions in this repository's PR tests are expected.
- Use `Tanaab Maneuvering Systems LLC` for project copyright and authorship.
  Preserve third-party notices and functional package, account, and bot identities.

## Documentation

- Keep the root README to the catalog and common behavior. Action READMEs own
  usage, inputs, outputs, distinct examples, test behavior, and operational notes,
  in that order. Omit empty sections and duplicated explanations.
- Keep permissions and credentials beside usage. State supported operating
  systems and cover them in the action's PR matrix; add platforms for consumer needs.
- Put standalone examples in `<name>/examples/` only when they add to the README.
  Combined examples have one owner; other actions link to them.

## Test mode

- Every action accepts exactly `test-mode: true|false`, defaulting to `false`.
  Never infer it from events, paths, repository identity, or missing credentials.
- Test mode requires no publication credentials and makes no external mutations.
  Validate real inputs and local artifacts, expose locally determinable outputs,
  and use native dry runs where available. Non-mutating actions run normally.
- Caller commands are not sandboxed. PR fixtures must avoid external side effects;
  local installation and artifact preparation are expected.
- Each action's Test behavior section identifies what runs locally and what
  requires a live lifecycle to prove.

## Debug

- Every action accepts exactly `debug: auto|true|false`, defaulting to `auto`.
  Auto follows only `RUNNER_DEBUG=1`; explicit values override it.
- Apply supported verbosity controls to owned tools and propagate the resolved
  value to composed actions and helpers. Leave caller commands unchanged and
  document upstream tools without verbosity controls.
- Preserve exit status, cleanup, outputs, retries, and destination state.
  Keep bounded failure diagnostics in every mode; never print credentials,
  private keys, authentication configuration, full environments, or shell traces.

## Validation

- Each action has `.github/workflows/pr-<name>.yml`, invoking `./<name>` with
  `test-mode: true` and independently asserting inputs, outputs, and postconditions.
  Cover debug auto on/off, explicit precedence, invalid inputs, failure behavior,
  and sentinel-secret redaction on supported runners.
- Use matrices for meaningful input classes. Preserve stable check identities;
  align workflow and job names with action basenames.
- Run non-mutating tests and separate static lint on PRs, including example
  workflows. Avoid skipped jobs and repeated event coverage unless the payload
  changes the public contract.
- Prove external mutations in the first real consuming lifecycle. Do not maintain
  synthetic registries, publication packages, branches, or tags as production substitutes.
