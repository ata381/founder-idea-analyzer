const { queryOllama } = require('./ollamaClient');

const SCORE_KEYS = [
  'problemValidationScore',
  'marketMaturity',
  'competitionDensity',
  'differentiationPotential',
  'technicalFeasibility',
  'riskAndUncertainty'
];

function computeDeltas(firstInsights, latestInsights) {
  return SCORE_KEYS.reduce((acc, key) => {
    const fromValue = typeof firstInsights?.[key] === 'number' ? firstInsights[key] : 0;
    const toValue = typeof latestInsights?.[key] === 'number' ? latestInsights[key] : 0;
    acc[key] = { from: fromValue, to: toValue, delta: Math.round(toValue - fromValue) };
    return acc;
  }, {});
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
