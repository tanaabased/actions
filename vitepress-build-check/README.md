# `vitepress-build-check`

Runs an optional VitePress preparation command followed by the required build
command. Callers retain their runner, caches, runtime setup, dependency
installation, and check identity—the bits that become complicated the moment
an action starts feeling ambitious.

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Set up Bun and Node, install dependencies, and configure caches in the caller
job before invoking this action.

```yaml
- name: Set up Bun and Node
  uses: tanaabased/actions/setup-bun-node@v1

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
| `prepare-command` | No | — | Shell command to run before the build. |
| `build-command` | Yes | — | Shell command that builds the VitePress site. |

## Examples

### Theme multiversion build

Theme retains its cache and multiversion preparation in its own job.

```yaml
- name: Set up Bun and Node
  uses: tanaabased/actions/setup-bun-node@v1

- name: Restore documentation cache
  uses: actions/cache@v4
  with:
    path: .vitepress/cache
    key: ${{ runner.os }}-vitepress-${{ hashFiles('bun.lock') }}

- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts

- name: Build documentation
  uses: tanaabased/actions/vitepress-build-check@v1
  with:
    prepare-command: bun run mvb
    build-command: bun run build
```

### Website build

Website retains its distinct build behavior and does not supply multiversion
preparation.

```yaml
- name: Set up Bun and Node
  uses: tanaabased/actions/setup-bun-node@v1

- name: Restore website cache
  uses: actions/cache@v4
  with:
    path: .vitepress/cache
    key: ${{ runner.os }}-website-${{ hashFiles('bun.lock') }}

- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts

- name: Build website
  uses: tanaabased/actions/vitepress-build-check@v1
  with:
    build-command: bun run build
```

## Test behavior

VitePress builds are already local and non-publishing, so `test-mode: true`
runs the same preparation and build commands. Pull requests build a real small
VitePress fixture, confirm its generated output and preparation marker, and
prove preparation and build failures remain failures. Test mode does not test
caller-owned runtime setup, dependency caches, or job topology.
