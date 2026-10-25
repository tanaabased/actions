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
    .replace(/((?:"?)(?:authorization|token|password|secret|api[-_]?key|apikey|access[-_]?key|credential)(?:"?)\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,}]+)/gi, '$1[REDACTED]')
    .replace(/\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]');
}

/** Frame before redaction so split tokens, UTF-8 and multiline private keys cannot leak. */
export async function* redactedLines(stream, environment = process.env) {
  const fragments = Object.entries(environment)
    .filter(([name, value]) => /TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY/i.test(name) && value.length >= 4)
    .flatMap(([, value]) => value.split(/\r?\n/).filter(Boolean));
  let pending = '';
  let privateKey = false;
  let quote = '';
  let suppressed = false;
  const closingQuote = (text, delimiter) => {
    for (let index = 0; index < text.length; index++) {
      if (text[index] === '\\') index++;
      else if (text[index] === delimiter) return index;
    }
    return -1;
  };
  const sanitize = value => {
    let line = value;
    if (privateKey) {
      const end = /-----END [^-]*PRIVATE KEY-----/.exec(line);
      if (!end) return '';
      privateKey = false;
      line = line.slice(end.index + end[0].length);
    }
    if (quote) {
      const end = closingQuote(line, quote);
      if (end < 0) return '';
      line = line.slice(end + 1);
      quote = '';
    }
    for (const marker of line.matchAll(/-----([A-Z]+) [^-]*PRIVATE KEY-----/g)) privateKey = marker[1] === 'BEGIN';
    const assignment = /(?:authorization|token|password|secret|api[-_]?key|apikey|access[-_]?key|credential)"?\s*[:=]\s*(["'])/gi;
    for (const match of line.matchAll(assignment)) {
      if (closingQuote(line.slice(match.index + match[0].length), match[1]) < 0) {
        quote = match[1];
        line = line.slice(0, match.index) + '[REDACTED]';
        break;
      }
    }
    for (const fragment of fragments) line = line.split(fragment).join('[REDACTED]');
    return redact(line, {});
  };
  stream.setEncoding('utf8');
  for await (const chunk of stream) {
    if (suppressed) continue;
    const lines = (pending + chunk).split('\n');
    pending = lines.pop();
    for (const line of lines) {
      if (Buffer.byteLength(line) > 64 * 1024) {
        suppressed = true;
        yield 'diagnostic stream omitted after an oversized line';
        break;
      }
      yield sanitize(line);
    }
    // Do not expose later fragments of an unbounded credential or private-key line.
    if (!suppressed && Buffer.byteLength(pending) > 64 * 1024) {
      suppressed = true;
      yield 'diagnostic stream omitted after an oversized line';
    }
    if (suppressed) pending = '';
  }
  if (pending && !suppressed) yield sanitize(pending);
}
