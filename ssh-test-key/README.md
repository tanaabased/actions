# `ssh-test-key`

Generates one local Ed25519 SSH key pair for a test fixture. It creates keys;
installation, GitHub registration, and remote SSH assertions are somebody
else's problem.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

```yaml
- name: Create a temporary SSH key
  id: ssh-key
  uses: tanaabased/actions/ssh-test-key@v1
  with:
    test-mode: true
    destination: ${{ runner.temp }}/fixture/id_ed25519
    comment: fixture@example.test
```

Omit `destination` to create the pair in an isolated directory below
`RUNNER_TEMP`.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `test-mode` | No | `false` | Must be `true` or `false`; both values create a real local pair. |
| `destination` | No | — | Private-key destination; the public key is written at `<destination>.pub`. |
| `comment` | No | `ssh-test-key` | Comment recorded in the public key. |

## Outputs

| Output | Description |
| --- | --- |
| `private-key-path` | Absolute path to the generated private key. |
| `public-key-path` | Absolute path to the generated public key. |

## Examples

```yaml
- name: Use the generated public key
  run: ssh-keygen -lf "${{ steps.ssh-key.outputs.public-key-path }}"
```

## Test behavior

Test mode performs the same real, local `ssh-keygen` operation as ordinary
mode in an isolated temporary directory when no destination is supplied. It
does not register a GitHub key, install a key, or make a remote SSH connection.

## Notes

The action refuses to overwrite either destination file and reports the
collision. It writes the private key with mode `600` and the public key with
mode `644`. Callers own fixture cleanup; remove the containing temporary
directory when the key is no longer needed. The action never prints private
key material.
