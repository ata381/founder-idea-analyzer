const fetch = global.fetch || require('node-fetch');

const DEFAULT_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function queryOllama(prompt, opts = {}) {
  const host = opts.host || DEFAULT_HOST;
  const model = opts.model || DEFAULT_MODEL;

  const url = `${host.replace(/\/$/, '')}/api/generate`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama request failed (${res.status}): ${text}`);
    }

    const json = await res.json().catch(() => null);

    // Try a few common shapes for returned text
    if (!json) return null;
    if (json.response && typeof json.response === 'string') {
      return json.response;
    }
    if (json.output && Array.isArray(json.output) && json.output.length > 0) {
      return joinOutput(json.output);
    }
    if (json.results && Array.isArray(json.results) && json.results.length > 0) {
      return joinOutput(json.results.map(r => r.content || r.text || r.output).flat());
    }
    if (json.result && typeof json.result === 'string') return json.result;
    // fallback: try stringify
    return JSON.stringify(json);
  } catch (err) {
    throw err;
  }
}

function joinOutput(out) {
  if (!out) return null;
  if (Array.isArray(out)) return out.map(o => (typeof o === 'object' ? (o.content || o.text || JSON.stringify(o)) : String(o))).join('\n');
  return String(out);
}

module.exports = { queryOllama };
