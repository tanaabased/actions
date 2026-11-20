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

## Notes

- A root `plugin.json` with a recognized Agent Plugins schema takes precedence. An unsupported schema version fails validation. See the [portable manifest format](https://developers.openai.com/plugins/build/plugins).
- For compatibility manifests, lookup starts at `.codex-plugin/plugin.json`. A portable plugin without an OpenAI extension can also use this file for overlay metadata.
- A marketplace can supply a missing manifest or name. Install the plugin from your marketplace to verify that fallback and exercise its runtime.
