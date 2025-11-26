// Minimal Chart.js wrapper. Expects Chart.js to be available globally.
let _radarChart = null;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function hexToRgba(hex, alpha) {
  let r = 0, g = 0, b = 0;
  // Handle hex like #abc or #aabbcc
  if (hex.startsWith('#')) hex = hex.slice(1);
  
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  
  // Fetch theme colors dynamically
  const textColor = getThemeColor('--ios-text');
  const mutedColor = getThemeColor('--ios-text-muted');
  const accentColor = getThemeColor('--ios-blue');
  const surfaceColor = getThemeColor('--ios-surface');
  const gridColor = hexToRgba(textColor, 0.06);

  // If chart exists just update the data for smooth live updates
  if (_radarChart) {
    _radarChart.data.labels = labels;
    _radarChart.data.datasets[0].data = values;
    
    // Update colors in case theme changed
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 300);
    gradient.addColorStop(0, hexToRgba(accentColor, 0.28));
    gradient.addColorStop(1, hexToRgba(accentColor, 0.08));
    
    _radarChart.data.datasets[0].backgroundColor = gradient;
    _radarChart.data.datasets[0].borderColor = accentColor;
    _radarChart.data.datasets[0].pointBorderColor = accentColor;
    _radarChart.data.datasets[0].pointBackgroundColor = surfaceColor;
    
    _radarChart.options.scales.r.ticks.color = mutedColor;
    _radarChart.options.scales.r.pointLabels.color = textColor;
    _radarChart.options.scales.r.grid.color = gridColor;
    _radarChart.options.scales.r.angleLines.color = gridColor;
    
    _radarChart.update();
    return;
  }

  // Create a subtle gradient fill for the dataset
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 300);
  gradient.addColorStop(0, hexToRgba(accentColor, 0.28));
  gradient.addColorStop(1, hexToRgba(accentColor, 0.08));
  
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
          ctx.fillStyle = textColor; // Use theme text color
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
        borderColor: accentColor,
        borderWidth: 3,
        tension: 0.35,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: surfaceColor,
        pointBorderColor: accentColor,
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
            color: mutedColor,
            backdropColor: 'transparent'
          },
          pointLabels: {
            color: textColor,
            font: {size: 13}
          },
          grid: {
            color: gridColor
          },
          angleLines: {
            color: gridColor
          }
        }
      },
      plugins: {
        legend: {display: false},
        tooltip: {
          enabled: true,
          backgroundColor: textColor, // Dark tooltip for contrast
          titleColor: surfaceColor,
          bodyColor: surfaceColor,
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
    'Problem',
    'Solution',
    'SuggestedSolution',
    'UniqueValueProposition',
    'CustomerSegments',
    'Channels',
    'RevenueModel',
    'CostStructure',
    'KeyMetrics',
    'Advantage'
  ];
  const iconMap = {
    Problem: '⚠️',
    Solution: '🧠',
    SuggestedSolution: '✨',
    UniqueValueProposition: '💎',
    CustomerSegments: '👥',
    Channels: '📣',
    RevenueModel: '💰',
    CostStructure: '📉',
    KeyMetrics: '📊',
    Advantage: '🚀'
  };

  const toneMap = {
    Problem: 'warning',
    Solution: 'primary',
    SuggestedSolution: 'accent',
    UniqueValueProposition: 'highlight',
    CustomerSegments: 'info',
    Channels: 'info',
    RevenueModel: 'success',
    CostStructure: 'danger',
    KeyMetrics: 'primary',
    Advantage: 'accent'
  };

  order.forEach((key) => {
    const box = document.createElement('div');
    const tone = toneMap[key] || 'primary';
    box.className = `lean-canvas-card lean-canvas-card--${tone}`;
    const title = key === 'SuggestedSolution'
      ? 'Suggested solution'
      : key.replace(/([A-Z])/g, ' $1').trim();
    const icon = iconMap[key] || '🧩';
    box.innerHTML = `
      <div class="lean-card__icon" aria-hidden="true">${icon}</div>
      <div class="lean-card__body">
        <p class="lean-card__title">${escapeHtml(title)}</p>
        <p class="lean-card__value">${formatCanvasValue(lc && lc[key])}</p>
      </div>
    `;
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
