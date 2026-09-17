# `validate-codex-plugin`

Validates one local Codex plugin with a pinned snapshot of OpenAI's Python
validator. The action checks the generic plugin ingestion contract; repository
checks for links, automations, routing, and local skill policy remain separate
and may run before or after it.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

```yaml
- name: Validate repository policy
  run: bun run codex:validate

- name: Validate generic Codex plugin contract
  uses: tanaabased/actions/validate-codex-plugin@v1
  with:
    plugin-directory: .
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `debug` | No | `auto` | `auto`, `true`, or `false`; `auto` enables diagnostics when `RUNNER_DEBUG=1`. |
| `plugin-directory` | No | `.` | Plugin root, relative to the workspace or absolute. |
| `python-version` | No | `3.13` | Python version used to run the validator. |

Debug enables verbose pip output.

The action installs the validator's sole non-standard dependency,
[`PyYAML==6.0.2`](https://pypi.org/project/PyYAML/6.0.2/), before invoking the
bundled snapshot.

## Outputs

| Output | Description |
| --- | --- |
| `plugin-path` | Absolute path to the validated plugin root. |

## Test behavior

Validation is non-mutating. Pull requests exercise valid and invalid plugin
fixtures on every supported runner; consumer workflows should preserve their
own checks.

## Notes

### Validator provenance

`scripts/validate_plugin.py` and `scripts/identifier_validation.py` are
unmodified files from OpenAI Codex commit
[`2b59d92dbdd69fc600ed95250867d305942912e1`](https://github.com/openai/codex/tree/2b59d92dbdd69fc600ed95250867d305942912e1/codex-rs/skills/src/assets/samples/plugin-creator/scripts).
They are redistributed under that repository's Apache-2.0 license and NOTICE,
copied into this action as `LICENSE.openai-codex` and `NOTICE.openai-codex`.

Pinned source checksums:

| File | SHA-256 |
| --- | --- |
| `validate_plugin.py` | `f4eeadb733b28b0c3e714de263a76d6542866a672f3e99bdffcf4dbcdf85e944` |
| `identifier_validation.py` | `a6d51ce4a9a7e8f85626ff5808a467a67574e7f8cdf1167ffb467c5f67e57223` |

To update the snapshot, choose a reviewed OpenAI Codex commit, copy both files
from the same `plugin-creator/scripts` directory without modification, refresh
the bundled license and NOTICE if upstream changed them, and update the commit,
checksums, and pinned PyYAML version here. Verify both SHA-256 values locally,
then run the valid/invalid runner matrix.
