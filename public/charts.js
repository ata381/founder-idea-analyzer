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
  // If chart exists just update the data for smooth live updates
  if (_radarChart) {
    _radarChart.data.labels = labels;
    _radarChart.data.datasets[0].data = values;
    _radarChart.update();
    return;
  }

  // Create a subtle gradient fill for the dataset
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 300);
  gradient.addColorStop(0, 'rgba(99,102,241,0.28)');
  gradient.addColorStop(1, 'rgba(99,102,241,0.08)');
  // Plugin to draw numeric labels near each data point (no external deps)
  const valueLabelPlugin = {
    id: 'valueLabelPlugin',
    afterDatasetsDraw(chart, args, options) {
      const {ctx} = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((element, index) => {
          const value = dataset.data[index];
          const position = element.getCenterPoint ? element.getCenterPoint() : {x: element.x, y: element.y};
          ctx.save();
          ctx.fillStyle = 'rgba(230,238,248,0.95)';
          ctx.font = '600 12px system-ui,Segoe UI,Roboto,Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(value), position.x, position.y - 10);
          ctx.restore();
        });
      });
    }
  };
  Chart.register(valueLabelPlugin);

  _radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Insight Scores',
        data: values,
        fill: true,
        backgroundColor: gradient,
        borderColor: 'rgba(99,102,241,0.95)',
        borderWidth: 3,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: 'rgba(99,102,241,0.95)',
        pointBorderWidth: 2,
        pointStyle: 'circle'
      }]
    },
    options: {
      maintainAspectRatio: false,
      elements: {
        line: {borderJoinStyle: 'round'}
      },
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            stepSize: 20,
            color: '#9ca3af',
            backdropColor: 'transparent'
          },
          pointLabels: {
            color: '#cbd5e1',
            font: {size: 13}
          },
          grid: {
            color: 'rgba(255,255,255,0.03)'
          },
          angleLines: {
            color: 'rgba(255,255,255,0.04)'
          }
        }
      },
      plugins: {
        legend: {display: false},
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(2,6,23,0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const v = context.formattedValue || context.raw;
              return (label ? label + ': ' : '') + v + ' / 100';
            }
          }
        }
      }
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
    box.innerHTML = `<strong>${key.replace(/([A-Z])/g, ' $1').trim()}</strong><div style="margin-top:6px;font-size:0.95rem;color:#cbd5e1">${formatCanvasValue(lc && lc[key])}</div>`;
    grid.appendChild(box);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function formatCanvasValue(value) {
  if (value == null) return '—';
  if (Array.isArray(value)) {
    return value.map((item) => formatCanvasValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '—';
    return entries.map(([k, v]) => `${escapeHtml(k)}: ${formatCanvasValue(v)}`).join('<br>');
  }
  return escapeHtml(String(value));
}

window.renderRadar = renderRadar;
window.renderLeanCanvasGrid = renderLeanCanvasGrid;
