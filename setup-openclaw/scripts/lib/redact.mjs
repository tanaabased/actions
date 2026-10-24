export function redact(input, environment = process.env) {
  let output = String(input);
  for (const [name, value] of Object.entries(environment)) {
    if (/(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY)/i.test(name) && value.length >= 4) {
      output = output.split(value).join('[REDACTED]');
    }
  }
  return output
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED PRIVATE KEY]')
    .replace(/(\bBearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/((?:"?)(?:authorization|token|password|secret|api[-_]?key|apikey|access[-_]?key|credential)(?:"?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi, '$1[REDACTED]')
    .replace(/\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]');
}
