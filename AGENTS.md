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
- Release publication jobs check out `ref: ${{ github.sha }}` and prepare their
  own artifacts from that commit. Do not depend on a release tag that a peer
  publisher can move; preserve independent publication and retries.
- Use `Tanaab Maneuvering Systems LLC` for project copyright and authorship.
  Preserve third-party notices and functional package, account, and bot identities.

## Runtimes

- Use `setup-node` and `setup-bun` for installation, with `auto` discovery from
  the target project. Keep discovery policy in `.lib/resolve-runtime.mjs`; pass
  explicit versions when a tool requires a particular runtime.
- Compose sibling actions with `$/<name>` so they use the same action revision.
- Pin this repository’s runtimes in `.node-version` and `.bun-version`. Check
  upstream releases before changing action versions; do not copy stale examples.

## Documentation

- Keep the root README to the catalog and common behavior. Action READMEs own
  usage, inputs, outputs, distinct examples, test behavior, and operational notes,
  in that order. Omit empty sections and duplicated explanations.
- Keep each action self-contained: store its README artwork as
  `<name>/icon.svg` and link it from that action's README.
- Use a consistent README header: action name, centered artwork, concise
  centered purpose, and one live PR-test badge linked to that action's PR
  workflow. Keep explanatory usage and contract details in their existing
  sections. Do not add category text inside artwork when the README already
  communicates the action's purpose.
- Group artwork by action role: setup/runtime installation is **Setup**;
  packaging and release preparation are **Preparation**; validation and test
  support are **Testing**; publication and release delivery are **Publishing**.
  Use [Tanaab's canonical palette](https://github.com/tanaabased/theme/blob/main/styles/colors.json):
  mix each category base at 16% with the `#f6fbf9` light surface for the flat
  circle, and use the category's existing darker value for the glyph.

  | Category | Action role | Base | Circle | Glyph |
  | --- | --- | --- | --- | --- |
  | Setup | Runtime/tool installation | `#00c88a` | `#cff3e7` | `#008f64` |
  | Preparation | Packaging/release preparation | `#db2777` | `#f2d9e4` | `#9c1c55` |
  | Testing | Validation/test support | `#c7a0ff` | `#eeecfa` | `#6f42c1` |
  | Publishing | Publication/release delivery | `#5ab0ff` | `#ddeffa` | `#0069b8` |

  Use recognizable project marks or simple action symbols in roughly 180px
  artwork, centered in the category circle. Adapt glyphs to the category palette,
  preserve transparent space outside the circle, and use no gradients or shadows.
  Retain artwork sources and applicable third-party notices in `LICENSE`. Give
  each README image meaningful alt text. Future role groups may include security/credential operations, deployment/operations, or
  monitoring, but add a category only when an action's primary job does not fit
  an existing group; choose and document its palette mapping from the canonical
  palette before using it.
- Keep permissions and credentials beside usage. State supported operating
  systems and cover them in the action's PR matrix; add platforms for consumer needs.
- Put standalone examples in `<name>/examples/` only when they add to the README.
  Combined examples have one owner; other actions link to them.

## Dry runs

- Non-mutating actions expose no test or dry-run switch: they run normally.
- An action that can mutate an external system exposes exactly `dry-run:
  true|false`, defaulting to `false`. Dry runs require no publication
  credentials, make no external mutations, validate real inputs and local
  artifacts, expose locally determinable outputs, and use native dry runs where
  available.
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

## Command success and verification

- Treat a command or upstream action's successful exit as sufficient evidence
  that its documented operation succeeded.
- Add a follow-up check only for a specific requirement that success does not
  establish. Explain that requirement briefly beside the check.
- Never fail a successful publication because an external system has not
  immediately exposed the result. Do not add custom propagation polling.
- Retain necessary input validation, output extraction, safety checks, native
  asynchronous completion, and service readiness checks. Independent assertions
  in tests and consumer-specific checks such as catalog contents remain appropriate.

## Validation

- Each action has `.github/workflows/pr-<name>.yml`, invoking `./<name>` with
  safe fixtures and independently asserting inputs, outputs, and postconditions.
  Cover debug auto on/off, explicit precedence, invalid inputs, failure behavior,
  and sentinel-secret redaction on supported runners.
- Use matrices for meaningful input classes. Name action test workflows
  `Test action / <action-name>`. Job names contain lowercase, hyphenated case
  names or runner/matrix values, separated by ` / `; do not repeat the action name.
  Preserve these check identities unless a naming change is explicitly requested.
- Run non-mutating tests and separate static lint on PRs, including example
  workflows. Avoid skipped jobs and repeated event coverage unless the payload
  changes the public contract.
- Prove external mutations in the first real consuming lifecycle. Do not maintain
  synthetic registries, publication packages, branches, or tags as production substitutes.
