# Successful PowerShell scenario

## Testing

```powershell
# Records the isolated temporary path
if ($env:TMPDIR -ne $env:TMP) { exit 1 }
if ($env:TMPDIR -ne $env:TEMP) { exit 1 }
if (-not $env:TMPDIR.StartsWith((Join-Path $env:RUNNER_TEMP 'run-leia.'))) { exit 1 }
Set-Content -LiteralPath $env:RUN_LEIA_EVIDENCE -Value $env:TMPDIR
```

## Destroy tests

```powershell
# Records that the custom cleanup heading ran
Set-Content -LiteralPath $env:RUN_LEIA_CLEANUP_EVIDENCE -Value cleanup
```
