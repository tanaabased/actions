const [url = ''] = process.argv.slice(2);

if (!url) {
  process.stderr.write('gateway health URL is required\n');
  process.exit(2);
}

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`unexpected response status: ${response.status}`);
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`gateway health check failed: ${detail}\n`);
  process.exit(1);
}
