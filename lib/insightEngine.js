const { queryOllama } = require('./ollamaClient');

function clampScore(value) {
  const number = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function ensureOllamaEnabled() {
  if (!process.env.LLM_PROVIDER || process.env.LLM_PROVIDER.toLowerCase() !== 'ollama') {
    throw new Error('LLM_PROVIDER must be set to "ollama" now that heuristic scoring has been removed.');
  }
}

function parseJsonResponse(raw, context) {
  if (!raw) {
    throw new Error(`Ollama returned an empty response while generating ${context}.`);
  }

  let cleaned = raw.trim();

  // Strip markdown fences like ```json ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // If extra text surrounds the JSON, grab the first {...} block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Unable to parse Ollama response for ${context}: ${err && err.message ? err.message : err}`);
  }
}

async function generateScoresLLM(inputs = {}) {
  ensureOllamaEnabled();

  const prompt = `You are an assistant that produces a numerical assessment (0-100) for a startup idea.\nInput JSON: ${JSON.stringify(inputs)}\n\nRespond with valid JSON only (max 120 characters) using the keys: problemValidationScore, marketMaturity, competitionDensity, differentiationPotential, technicalFeasibility, riskAndUncertainty (values 0-100). Do not add explanations or extra text.`;

  const text = await queryOllama(prompt);
  const parsed = parseJsonResponse(text, 'insight scores');

  return {
    problemValidationScore: clampScore(parsed.problemValidationScore || parsed.problemValidation || 0),
    marketMaturity: clampScore(parsed.marketMaturity || 0),
    competitionDensity: clampScore(parsed.competitionDensity || parsed.competition || 0),
    differentiationPotential: clampScore(parsed.differentiationPotential || parsed.differentiation || 0),
    technicalFeasibility: clampScore(parsed.technicalFeasibility || parsed.techFeasibility || 0),
    riskAndUncertainty: clampScore(parsed.riskAndUncertainty || parsed.risk || 0)
  };
}

async function draftLeanCanvasLLM(inputs = {}) {
  ensureOllamaEnabled();

  const hasFounderSolution = inputs && typeof inputs.solution === 'string' && inputs.solution.trim().length > 0;

  const critiqueInstruction = hasFounderSolution
    ? 'If a founder-proposed solution is present, you must critically evaluate it. In "Solution", neutrally restate the founder\'s idea. In "SuggestedSolution", be brutally honest: highlight weaknesses, risks, and propose a stronger or more viable direction if needed. Avoid flattery and focus on viability.'
    : 'If no founder-proposed solution is present, use "SuggestedSolution" to propose a concrete, high-leverage solution based on the problem, audience, and context.';

  const prompt = `You are an assistant that drafts a lean canvas for a startup idea.\nInput JSON: ${JSON.stringify(inputs)}\n\n${critiqueInstruction}\n\nRespond with JSON only. Include keys: Problem, Solution, SuggestedSolution, UniqueValueProposition, CustomerSegments, Channels, RevenueModel, CostStructure, KeyMetrics, Advantage. Keep each field under 40 words.`;

  const text = await queryOllama(prompt);
  return parseJsonResponse(text, 'lean canvas');
}

module.exports = {
  generateScoresLLM,
  draftLeanCanvasLLM
};
