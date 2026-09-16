# Action catalog

Each public surface has one entry at `actions/<name>/`. Start there: its
`README.md` contains the user-facing contract, including usage, inputs,
outputs, permissions, and retry behavior.

- A composite action contains `action.yml` and every runtime file it needs.
- A reusable workflow contains `workflow.yml`, a symlink to its canonical
  `.github/workflows/<name>.yml` file. GitHub requires the actual workflow to
  remain there; the symlink exists for human navigation, not execution.
