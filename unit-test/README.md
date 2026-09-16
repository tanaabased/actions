# `unit-test`

Runs one caller-selected unit-test command from the workspace root. The caller
owns runtime setup, runner selection, matrices, permissions, and check name.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

Set up the required runtime in a preceding caller-owned step, then select the
repository command explicitly.

```yaml
jobs:
  unit-tests:
    name: Unit tests
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - name: Set up Bun and Node.js
        uses: tanaabased/actions/setup-bun-node@v1
      - name: Run unit tests
        uses: tanaabased/actions/unit-test@v1
        with:
          command: bun run test:unit
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Validate and run the selected command without changing action behavior. |
| `command` | Yes | — | Unit-test command to run from the workspace root. |

## Examples

Keep lint and unit tests in separate caller-owned jobs when they need separate
status checks. A project using another runtime can set that runtime up before
calling this action and select its own command, such as `npm run test:unit`.

## Test behavior

Test mode validates its inputs and runs the exact selected command. It is not a
sandbox: callers must choose commands with any desired safety properties. The
PR workflow uses non-mutating passing and failing local fixtures on Linux and
macOS; it does not prove a consumer's runtime setup or test suite.
