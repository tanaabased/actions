let input = '';
for await (const chunk of process.stdin) input += chunk;

const secretAssignment =
  /((?:"?)(?:authorization|token|password|secret|api[-_]?key|apikey|access[-_]?key|credential)(?:"?)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi;
const bearerToken = /(\bBearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const providerToken = /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g;

process.stdout.write(
  input
    .replace(bearerToken, '$1[REDACTED]')
    .replace(secretAssignment, '$1[REDACTED]')
    .replace(providerToken, '[REDACTED]'),
);
