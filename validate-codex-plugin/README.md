<h1 align="center">validate-codex-plugin</h1>

<p align="center">
  <img src="icon.svg" alt="OpenAI logo for Codex plugin validation" width="180" />
</p>

<p align="center">
  Check local Codex plugin manifests.
</p>

<p align="center">
  <a href="https://github.com/tanaabased/actions/actions/workflows/pr-validate-codex-plugin.yml"><img src="https://img.shields.io/github/actions/workflow/status/tanaabased/actions/pr-validate-codex-plugin.yml?event=pull_request&amp;label=PR%20tests" alt="PR tests" /></a>
</p>

Check manifest requirements for local installation without installing or running
plugins. This action checks selected manifest JSON, portable schema and names,
and explicit compatibility names and versions. Unfamiliar fields and omitted
listing metadata are not errors. Keep repository policy checks separate.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

```yaml
- name: Check Codex plugin manifest
  uses: tanaabased/actions/validate-codex-plugin@v1
  with:
    plugin-directory: .
```

## Inputs

| Input              | Required | Default | Description                                                                   |
| ------------------ | -------- | ------- | ----------------------------------------------------------------------------- |
| `debug`            | No       | `auto`  | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `plugin-directory` | No       | `.`     | Plugin root, relative to workspace or absolute.                               |
| `python-version`   | No       | `3.13`  | Deprecated compatibility input; ignored. Bun runs manifest checks.            |

## Outputs

| Output        | Description                   |
| ------------- | ----------------------------- |
| `plugin-path` | Absolute path to plugin root. |

## Test behavior

PR tests exercise this action on both supported runners and compare fixture
results with isolated local marketplace installs using Codex CLI `0.170.0`.
Fixtures cover Canon’s dark icon, unknown nested metadata, portable selection,
compatibility fallback, malformed JSON, and invalid names and versions.
To repeat installer comparisons locally, run
`bun validate-codex-plugin/test/compare-installer.mjs /path/to/codex`.

## Notes

[Portable Agent Plugins manifests](https://developers.openai.com/plugins/build/plugins)
use root `plugin.json` with its Agent Plugins schema. Recognized schema
namespaces take precedence; unsupported Agent Plugins versions fail rather
than falling back. Unrelated root JSON is ignored when Codex looks for
compatibility manifests, starting with `.codex-plugin/plugin.json`.
With no OpenAI extension object, Codex can read that compatibility manifest
as overlay metadata for portable packages.

Compatibility names may come from source directory names, and marketplaces
can supply missing manifests. When no manifest is selected, this action
reports that installation depends on marketplace fallback. This check cannot
confirm marketplace name agreement, publication eligibility, asset availability,
or plugin runtime behavior. For end-to-end evidence, install from your actual
marketplace.
