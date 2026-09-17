let input = '';
for await (const chunk of process.stdin) input += chunk;

const secretAssignment =
  /((?:"?)(?:authorization|token|password|secret|api[-_]?key|apikey|access[-_]?key|credential)(?:"?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi;
const bearerToken = /(\bBearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const providerToken = /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g;

// Owned diagnostics may contain a credential without a recognizable assignment label.
for (const [name, value] of Object.entries(process.env)) {
  if (/(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY)/i.test(name) && value.length >= 4) {
    input = input.split(value).join('[REDACTED]');
  }
}
process.stdout.write(
  input
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(bearerToken, '$1[REDACTED]')
    .replace(secretAssignment, '$1[REDACTED]')
    .replace(providerToken, '[REDACTED]'),
);
