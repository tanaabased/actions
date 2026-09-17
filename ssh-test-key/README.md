# `ssh-test-key`

Generates one local Ed25519 SSH key pair for a test fixture.

Supported runners: Linux (`ubuntu-24.04`) and macOS (`macos-26`).

## Usage

```yaml
- name: Create a temporary SSH key
  id: ssh-key
  uses: tanaabased/actions/ssh-test-key@v1
  with:
    destination: ${{ runner.temp }}/fixture/id_ed25519
    comment: fixture@example.test
```

Omit `destination` to create the pair in an isolated directory below
`RUNNER_TEMP`.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `debug` | No | `auto` | [Common diagnostics](../README.md#common-inputs). |
| `destination` | No | — | Private-key destination; the public key is written at `<destination>.pub`. |
| `comment` | No | `ssh-test-key` | Comment recorded in the public key. |

Debug includes the public-key fingerprint and path, never private-key contents.

## Outputs

| Output | Description |
| --- | --- |
| `private-key-path` | Absolute path to the generated private key. |
| `public-key-path` | Absolute path to the generated public key. |

## Test behavior

PR tests perform the real, local `ssh-keygen` operation in an isolated temporary
directory when no destination is supplied. The action
does not register a GitHub key, install a key, or make a remote SSH connection.

## Notes

The action refuses to overwrite either destination file and reports the
collision. It writes the private key with mode `600` and the public key with
mode `644`. Callers own fixture cleanup; remove the containing temporary
directory when the key is no longer needed. The action never prints private
key material.
