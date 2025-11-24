const { queryOllama } = require('./ollamaClient');

function computeDeltas(firstInsights, latestInsights) {
  const keys = [
    'problemValidationScore',
    'marketMaturity',
    'competitionDensity',
    'differentiationPotential',
    'technicalFeasibility',
    'riskAndUncertainty'
  ];
  const deltas = {};
  keys.forEach(k => {
    const a = firstInsights && typeof firstInsights[k] === 'number' ? firstInsights[k] : 0;
    const b = latestInsights && typeof latestInsights[k] === 'number' ? latestInsights[k] : 0;
    deltas[k] = { from: a, to: b, delta: Math.round(b - a) };
  });
  return deltas;
}

async function explainDeltas(deltas, firstVersion = {}, latestVersion = {}) {
  if (!process.env.LLM_PROVIDER || process.env.LLM_PROVIDER.toLowerCase() !== 'ollama') {
    throw new Error('LLM_PROVIDER must be set to "ollama" to generate delta explanations.');
  }

  const prompt = `You are a concise mentor for startup founders.\n\nFIRST VERSION:\n${JSON.stringify(firstVersion, null, 2)}\n\nLATEST VERSION:\n${JSON.stringify(latestVersion, null, 2)}\n\nDELTAS:\n${JSON.stringify(deltas, null, 2)}\n\nProvide a short, clear explanation of the deltas and 2-3 actionable suggestions for the founder. Keep the response under 200 words.`;
  const resp = await queryOllama(prompt);
  if (resp && typeof resp === 'string' && resp.trim().length > 0) {
    return resp.trim();
  }
  throw new Error('Ollama returned an empty response while generating delta explanations.');
}

module.exports = { computeDeltas, explainDeltas };
