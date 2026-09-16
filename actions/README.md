# Action catalog

Each public surface has one entry at `actions/<name>/`. Start there: its
`README.md` contains the user-facing contract, including usage, inputs,
outputs, permissions, and retry behavior.

Each catalog entry contains `action.yml` and every runtime file it needs. The
actions compose within one caller job so prepared artifacts can be tested and
then handed to publication unchanged.
