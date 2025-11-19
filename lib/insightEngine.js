const simpleTokenizer = (text) => (text || '').toLowerCase().split(/\W+/).filter(Boolean);

function scorePresence(text, keywords) {
  const tokens = simpleTokenizer(text);
  const set = new Set(tokens);
  let hits = 0;
  for (const k of keywords) if (set.has(k)) hits++;
  return Math.min(100, Math.round((hits / Math.max(1, keywords.length)) * 100));
}

function lengthScore(text, ideal = 50) {
  const len = (text || '').length;
  const score = Math.max(0, 100 - Math.abs(ideal - len));
  return Math.min(100, Math.round(score));
}

function normalize(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const { queryOllama } = require('./ollamaClient');

function generateScores({ problem, solution, audience, alternatives, technology }) {
  // Heuristic rules — simple but deterministic
  const problemClarity = Math.max(
    scorePresence(problem, ['problem', 'need', 'pain', 'issue', 'challenge']),
    lengthScore(problem, 80)
  );

  const marketMaturity = Math.max(
    scorePresence(alternatives, ['competitor', 'alternativ', 'incumbent', 'existing']),
    lengthScore(alternatives, 40)
  );

  const competitionDensity = normalize(100 - marketMaturity); // inverse heuristic

  const differentiation = Math.max(
    scorePresence(solution, ['unique', 'different', 'novel', 'patent', 'proprietary']),
    lengthScore(solution, 60)
  );

  const technicalFeasibility = Math.max(
    scorePresence(technology, ['prototype', 'api', 'openai', 'ml', 'ai', 'framework', 'node', 'react']),
    lengthScore(technology, 40)
  );

  const risk = normalize(100 - ((problemClarity + technicalFeasibility + differentiation) / 3));

  return {
    problemValidationScore: normalize(problemClarity),
    marketMaturity: normalize(marketMaturity),
    competitionDensity: normalize(competitionDensity),
    differentiationPotential: normalize(differentiation),
    technicalFeasibility: normalize(technicalFeasibility),
    riskAndUncertainty: normalize(risk)
  };
}

function draftLeanCanvas({ problem, solution, audience, alternatives, technology }) {
  // If the founder didn't provide a solution, draft a simple suggested solution
  const suggestedSolution = (!solution || solution.trim() === '')
    ? `A product that addresses "${(problem || '').replace(/\n/g, ' ')}" for ${audience || 'target customers'} by offering a focused, easy-to-adopt service that reduces the stated pain.`
    : null;

  const finalSolution = solution && solution.trim() !== '' ? solution : suggestedSolution;

  return {
    Problem: problem || '—',
    Solution: finalSolution || '—',
    SuggestedSolution: suggestedSolution || null,
    UniqueValueProposition: finalSolution ? finalSolution.split('.').slice(0,1)[0] : '—',
    CustomerSegments: audience || '—',
    Channels: 'Website, Social, Direct outreach',
    RevenueModel: 'Subscription / One-time / Freemium — choose suitable model',
    CostStructure: 'Dev, Hosting, Marketing',
    KeyMetrics: 'Activation, Retention, CAC, LTV',
    Advantage: alternatives ? `Compared to: ${alternatives}` : '—'
  };
}

// Async LLM-backed generator (optional)
async function generateScoresLLM(inputs) {
  if (!process.env.LLM_PROVIDER || process.env.LLM_PROVIDER.toLowerCase() !== 'ollama') {
    return generateScores(inputs);
  }

  const prompt = `You are an assistant that produces a numerical assessment (0-100) for a startup idea.\nInput JSON: ${JSON.stringify(inputs)}\n\nRespond with valid JSON object with keys: problemValidationScore, marketMaturity, competitionDensity, differentiationPotential, technicalFeasibility, riskAndUncertainty (values 0-100). Output only JSON.`;

  try {
    const text = await queryOllama(prompt);
    if (!text) return generateScores(inputs);
    const parsed = JSON.parse(text.trim());
    // normalize fields
    return {
      problemValidationScore: normalize(parsed.problemValidationScore || parsed.problemValidation || 0),
      marketMaturity: normalize(parsed.marketMaturity || 0),
      competitionDensity: normalize(parsed.competitionDensity || parsed.competition || 0),
      differentiationPotential: normalize(parsed.differentiationPotential || parsed.differentiation || 0),
      technicalFeasibility: normalize(parsed.technicalFeasibility || parsed.techFeasibility || 0),
      riskAndUncertainty: normalize(parsed.riskAndUncertainty || parsed.risk || 0)
    };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('LLM scoring failed, falling back to heuristics', msg);
    const fallback = generateScores(inputs);
    // attach a non-breaking warning so callers / UI can surface it
    fallback.llmWarning = `LLM scoring failed: ${msg}`;
    return fallback;
  }
}

async function draftLeanCanvasLLM(inputs) {
  if (!process.env.LLM_PROVIDER || process.env.LLM_PROVIDER.toLowerCase() !== 'ollama') {
    return draftLeanCanvas(inputs);
  }

  const prompt = `You are an assistant that drafts a lean canvas for a startup idea.\nInput JSON: ${JSON.stringify(inputs)}\n\nRespond with valid JSON object representing a lean canvas with keys: Problem, Solution, SuggestedSolution, UniqueValueProposition, CustomerSegments, Channels, RevenueModel, CostStructure, KeyMetrics, Advantage. Output only JSON.`;

  try {
    const text = await queryOllama(prompt);
    if (!text) return draftLeanCanvas(inputs);
    const parsed = JSON.parse(text.trim());
    return parsed;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('LLM lean canvas failed, falling back to heuristics', msg);
    const fallback = draftLeanCanvas(inputs);
    // include warning on the returned canvas so UI can show it
    fallback.llmWarning = `LLM lean canvas failed: ${msg}`;
    return fallback;
  }
}

module.exports = {
  generateScores,
  draftLeanCanvas,
  generateScoresLLM,
  draftLeanCanvasLLM
};
