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
  return {
    Problem: problem || '—',
    Solution: solution || '—',
    UniqueValueProposition: solution ? solution.split('.').slice(0,1)[0] : '—',
    CustomerSegments: audience || '—',
    Channels: 'Website, Social, Direct outreach',
    RevenueModel: 'Subscription / One-time / Freemium — choose suitable model',
    CostStructure: 'Dev, Hosting, Marketing',
    KeyMetrics: 'Activation, Retention, CAC, LTV',
    Advantage: alternatives ? `Compared to: ${alternatives}` : '—'
  };
}

module.exports = {
  generateScores,
  draftLeanCanvas
};
