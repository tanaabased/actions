# `vitepress-build-check`

Runs an optional VitePress preparation command followed by the required build
command. Callers retain their runner, caches, runtime setup, dependency
installation, and check identity.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Set up Bun, install dependencies, and configure caches in the caller job before
invoking this action.

```yaml
- name: Set up Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version-file: .bun-version

- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts

- name: Build documentation
  uses: tanaabased/actions/vitepress-build-check@v1
  with:
    build-command: bun run build
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Must be `true` or `false`; both values run the same local commands. |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `prepare-command` | No | — | Shell command to run before the build. |
| `build-command` | Yes | — | Shell command that builds the VitePress site. |

Caller-supplied commands are never printed or modified.

## Examples

For a multiversion build, supply preparation alongside the build command:

```yaml
- uses: tanaabased/actions/vitepress-build-check@v1
  with:
    prepare-command: bun run mvb
    build-command: bun run build
```

## Test behavior

Test mode runs the same preparation and build commands. PR tests build a real
VitePress fixture and assert its output, preparation marker, and failure propagation.
Caller commands must avoid external side effects.
