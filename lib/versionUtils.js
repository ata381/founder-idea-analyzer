const { generateScores } = require('./insightEngine');

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

function explainDeltas(deltas) {
  const lines = [];
  const order = [
    'problemValidationScore',
    'marketMaturity',
    'competitionDensity',
    'differentiationPotential',
    'technicalFeasibility',
    'riskAndUncertainty'
  ];
  const labels = {
    problemValidationScore: 'Problem validation',
    marketMaturity: 'Market maturity',
    competitionDensity: 'Competition density',
    differentiationPotential: 'Differentiation',
    technicalFeasibility: 'Technical feasibility',
    riskAndUncertainty: 'Risk / Uncertainty'
  };

  order.forEach(k => {
    const d = deltas[k];
    if (!d) return;
    if (d.delta === 0) return; // skip unchanged
    if (d.delta > 0) {
      lines.push(`${labels[k]} improved by ${d.delta} points (from ${d.from} to ${d.to}).`);
    } else {
      lines.push(`${labels[k]} decreased by ${Math.abs(d.delta)} points (from ${d.from} to ${d.to}).`);
    }
  });

  if (lines.length === 0) return 'No measurable changes between revisions.';

  // Provide a concise mentor recommendation based on largest changes
  const sorted = Object.entries(deltas).sort((a,b)=>Math.abs(b[1].delta)-Math.abs(a[1].delta));
  const [topKey, top] = sorted[0];
  const topLabel = labels[topKey] || topKey;
  const advice = top.delta > 0
    ? `Good progress on ${topLabel}. Consider doubling down on what caused this improvement.`
    : `Attention: ${topLabel} saw the largest drop. Re-check the proposed changes for clarity or feasibility.`;

  return lines.join(' ') + ' ' + advice;
}

module.exports = { computeDeltas, explainDeltas };
