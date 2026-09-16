# Repository guidance

## Action tests

- Name each test job after the action path it exercises, such as
  `actions/npm-pack`.
- Put pull-request-safe action tests in `.github/workflows/test-actions.yml`.
  They may inspect or create local artifacts, but must not mutate GitHub or an
  external registry.
- Put tests that require repository or registry writes in
  `.github/workflows/test-actions-live.yml`. Run them on branch pushes and
  manual dispatches with unique fixture identities and cleanup where the
  external system permits it.
- Exercise actions through `uses: ./actions/<name>` and assert their outputs
  plus observable postconditions.
- Do not repeat an action test for both pull-request and push events unless the
  event payload is part of the action's contract. Use separate workflows for
  distinct permission and side-effect boundaries instead of event-gated jobs
  that appear as skipped checks.
