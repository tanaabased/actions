<h1 align="center">vitepress-build-check</h1>

<p align="center">
  <img src="icon.svg" alt="VitePress book logo" width="180" />
</p>

<p align="center">
  Build and verify VitePress documentation.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-vitepress-build-check.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-vitepress-build-check.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Supported runner: Linux (`ubuntu-24.04`).

## Usage

Set up your runtime and install dependencies before invoking the action.
The preparation and build commands run with the job’s permissions.

```yaml
- name: Set up Bun
  uses: tanaabased/actions/setup-bun@v1

- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts

- name: Build documentation
  uses: tanaabased/actions/vitepress-build-check@v1
  with:
    build-command: bun run build
```

## Inputs

| Input             | Required | Default | Description                                                                   |
| ----------------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `debug`           | No       | `auto`  | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `prepare-command` | No       | —       | Shell command to run before the build.                                        |
| `build-command`   | Yes      | —       | Shell command that builds the VitePress site.                                 |

Caller-supplied commands are never printed or modified.

## Examples

For a multiversion build, supply preparation alongside the build command:

```yaml
- uses: tanaabased/actions/vitepress-build-check@v1
  with:
    prepare-command: bun run mvb
    build-command: bun run build
```
