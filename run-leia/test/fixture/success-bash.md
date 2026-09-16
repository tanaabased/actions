# Successful Bash scenario

## Testing

```bash
# Records the isolated temporary path
test "$TMPDIR" = "$TMP"
test "$TMPDIR" = "$TEMP"
case "$TMPDIR" in "$RUNNER_TEMP"/run-leia.*) ;; *) exit 1 ;; esac
printf '%s\n' "$TMPDIR" > "$RUN_LEIA_EVIDENCE"
```

## Destroy tests

```bash
# Records that the custom cleanup heading ran
printf '%s\n' cleanup > "$RUN_LEIA_CLEANUP_EVIDENCE"
```
