// Minimal Chart.js wrapper. Expects Chart.js to be available globally.
let _radarChart = null;

function renderRadar(insights) {
  const labels = [
    'Problem Validation',
    'Market Maturity',
    'Competition Density',
    'Differentiation',
    'Technical Feasibility',
    'Risk'
  ];

  const values = [
    insights.problemValidationScore || 0,
    insights.marketMaturity || 0,
    insights.competitionDensity || 0,
    insights.differentiationPotential || 0,
    insights.technicalFeasibility || 0,
    insights.riskAndUncertainty || 0
  ];

  const ctx = document.getElementById('radar-chart').getContext('2d');

  if (_radarChart) {
    _radarChart.data.labels = labels;
    _radarChart.data.datasets[0].data = values;
    _radarChart.update();
    return;
  }

  _radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Insight Scores',
        data: values,
        backgroundColor: 'rgba(99,102,241,0.18)',
        borderColor: 'rgba(99,102,241,0.9)',
        pointBackgroundColor: 'rgba(99,102,241,0.9)'
      }]
    },
    options: {
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {stepSize: 20}
        }
      },
      plugins: {legend: {display: false}}
    }
  });
}

function renderLeanCanvasGrid(lc) {
  const grid = document.getElementById('canvas-grid');
  grid.innerHTML = '';
  const order = [
    'Problem', 'Solution', 'UniqueValueProposition',
    'CustomerSegments', 'Channels', 'RevenueModel',
    'CostStructure', 'KeyMetrics', 'Advantage'
  ];

  order.forEach((key) => {
    const box = document.createElement('div');
    box.style.background = '#071028';
    box.style.border = '1px solid #112';
    box.style.padding = '10px';
    box.style.borderRadius = '8px';
    box.style.minHeight = '80px';
    box.innerHTML = `<strong>${key.replace(/([A-Z])/g, ' $1').trim()}</strong><div style="margin-top:6px;font-size:0.95rem;color:#cbd5e1">${(lc && lc[key]) ? escapeHtml(String(lc[key])) : '—'}</div>`;
    grid.appendChild(box);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

window.renderRadar = renderRadar;
window.renderLeanCanvasGrid = renderLeanCanvasGrid;
