const METRIC_KEYS = [
  'problemValidationScore',
  'marketMaturity',
  'competitionDensity',
  'differentiationPotential',
  'technicalFeasibility',
  'riskAndUncertainty'
];

const METRIC_LABELS = {
  problemValidationScore: 'Problem validation',
  marketMaturity: 'Market maturity',
  competitionDensity: 'Competition density',
  differentiationPotential: 'Differentiation',
  technicalFeasibility: 'Technical feasibility',
  riskAndUncertainty: 'Risk / Uncertainty'
};

const SCORE_CARD_META = METRIC_KEYS.map((key) => ({ key, label: METRIC_LABELS[key] }));

async function postIdea(data) {
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }
  if (!res.ok) {
    const msg = (body && body.error) ? body.error : res.statusText || 'Failed to analyze idea';
    throw new Error(msg);
  }
  return body;
}

function el(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', () => {
  const form = el('idea-form');
  const output = el('insight-output');
  const canvasGrid = el('canvas-grid');
  const saveRevisionBtn = el('save-revision');
  const compareBtn = el('compare-versions');
  const comparisonOutput = el('comparison-output');
  const awarenessDeltaText = el('awareness-delta-text');
  const blindSpotsList = el('blind-spots-list');
  const weeklySummaryText = el('weekly-summary-text');
  const statusBanner = el('status-banner');
  const statusText = el('status-text');
  
  const solutionSummary = el('solution-summary');
  const solutionSummaryLabel = el('solution-summary-label');
  const solutionSummaryBadge = el('solution-summary-badge');
  const solutionSummaryText = el('solution-summary-text');
  let currentIdeaId = null;

  function setStatus(message, tone = 'muted') {
    if (!statusBanner || !statusText) return;
    statusText.textContent = message;
    statusBanner.dataset.tone = tone;
  }

  function setOnlineStatus(isOnline) {
    if (!statusBanner || !statusText) return;
    if (isOnline) {
      statusText.textContent = 'System Online';
      statusBanner.dataset.tone = 'success';
    } else {
      statusText.textContent = 'System Offline';
      statusBanner.dataset.tone = 'error';
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch('/health');
      setOnlineStatus(res.ok);
    } catch (_) {
      setOnlineStatus(false);
    }
  }

  // Initial check
  checkHealth();

  function setAwarenessProgress(value) {
    // This function can be expanded to animate a progress ring or bar
    // For now, it ensures the text is updated with visual cues
    if (!awarenessDeltaText) return;
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        awarenessDeltaText.textContent = value;
        return;
    }
    const sign = num > 0 ? '+' : '';
    awarenessDeltaText.textContent = `${sign}${num} pts`;
    awarenessDeltaText.style.color = num > 0 ? '#86efac' : (num < 0 ? '#fca5a5' : 'inherit');
  }

  function updateMentorFromInsights(insights) {
    if (!insights) {
      setAwarenessProgress('—');
      if (blindSpotsList) blindSpotsList.textContent = '—';
      if (weeklySummaryText) weeklySummaryText.textContent = 'No analysis run yet.';
      return;
    }
    let sum = 0;
    const blind = [];
    const strong = [];
    const weak = [];

    METRIC_KEYS.forEach((key) => {
      const value = typeof insights[key] === 'number' ? insights[key] : 0;
      sum += value;
      if (value < 40) {
        blind.push(METRIC_LABELS[key]);
        weak.push(METRIC_LABELS[key]);
      } else if (value >= 65) {
        strong.push(METRIC_LABELS[key]);
      }
    });

    const awarenessDelta = Math.round(sum / METRIC_KEYS.length) - 50;
    setAwarenessProgress(awarenessDelta);

    if (blindSpotsList) blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';

    let summary = '';
    if (strong.length) summary += `Strengths: ${strong.join(', ')}. `;
    if (weak.length) summary += `Needs attention: ${weak.join(', ')}. `;
    if (!summary) summary = 'Balanced profile — continue iterating to validate hypotheses.';
    if (weeklySummaryText) weeklySummaryText.textContent = summary;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      problem: el('problem').value,
      solution: el('solution').value,
      audience: el('audience').value,
      alternatives: el('alternatives').value,
      technology: el('technology').value
    };
    output.innerHTML = '<p class="placeholder-text">Analyzing your idea...</p>';
    setStatus('Analyzing...', 'muted');
    
    if (solutionSummary) solutionSummary.style.display = 'none';
    if (canvasGrid) canvasGrid.innerHTML = '';
    
    try {
      const json = await postIdea(data);
      // show the insights
      renderInsights(json.insights, output);
      
      // update compact solution summary near the form
      if (solutionSummary && json && json.insights && json.insights.leanCanvas) {
        const lc = json.insights.leanCanvas;
        const userProvidedSolution = (data.solution || '').trim().length > 0;
        const provided = lc.Solution || null;
        const suggested = lc.SuggestedSolution || null;
        const body = suggested || provided || null;

        if (body) {
          solutionSummary.style.display = 'block';
          if (userProvidedSolution && suggested) {
            solutionSummaryLabel.textContent = 'Mentor Critique';
            solutionSummaryBadge.textContent = 'Critique';
          } else if (!userProvidedSolution && suggested) {
            solutionSummaryLabel.textContent = 'Suggested Solution';
            solutionSummaryBadge.textContent = 'AI Generated';
          } else {
            solutionSummaryLabel.textContent = 'Solution';
            solutionSummaryBadge.textContent = 'Restated';
          }
          solutionSummaryText.innerHTML = formatInsightValue(body);
        } else {
          solutionSummary.style.display = 'none';
        }
      }
      
      // store current idea id (if saved)
      if (json && json._id) currentIdeaId = json._id;
      
      // render radar chart (if Chart.js available)
      if (window.renderRadar && json.insights) {
        renderRadar(json.insights);
      }
      
      // render the lean canvas grid
      if (window.renderLeanCanvasGrid && json.insights && json.insights.leanCanvas) {
        renderLeanCanvasGrid(json.insights.leanCanvas);
      } else if (canvasGrid) {
        if (json.insights && json.insights.leanCanvas) {
          canvasGrid.innerHTML = `<pre style="white-space:pre-wrap;font-size:0.9rem;color:#cbd5e1;background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;margin:0">${escapeHtml(JSON.stringify(json.insights.leanCanvas, null, 2))}</pre>`;
        } else {
          canvasGrid.innerHTML = '<div style="color:#94a3b8">No canvas returned.</div>';
        }
      }
      
      // update Mentor Dashboard from the returned insights
      updateMentorFromInsights(json.insights);
      
      // surface any LLM warning from the insights or lean canvas
      let tone = 'success';
      let message = 'Analysis complete.';
      if (json && json.insights) {
        const w = json.insights.llmWarning || (json.insights.leanCanvas && json.insights.leanCanvas.llmWarning);
        if (w) {
          tone = 'warning';
          message = `Warning: ${w}`;
        }
      }
      setStatus(message, tone);
    } catch (err) {
      output.textContent = 'Error: ' + err.message;
      setStatus(`Error: ${err.message}`, 'error');
    }
  });

  // Save a new revision (append version)
  if (saveRevisionBtn) saveRevisionBtn.addEventListener('click', async () => {
    if (!currentIdeaId) { alert('No saved idea to add a revision to. First create/save an idea.'); return; }
    const data = {
      problem: el('problem').value,
      solution: el('solution').value,
      audience: el('audience').value,
      alternatives: el('alternatives').value,
      technology: el('technology').value
    };
    try {
      const res = await fetch(`/api/ideas/${currentIdeaId}/versions`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
      const j = await res.json();
      if (res.ok) {
        alert('Revision saved');
      } else {
        alert('Failed to save revision: ' + (j.error || res.statusText));
      }
    } catch (err) {
      alert('Error saving revision: ' + err.message);
    }
  });

  // Compare first vs latest (extracted function so other actions can call it)
  async function runCompare() {
    if (!currentIdeaId) { alert('No saved idea to compare.'); return; }
    if (comparisonOutput) comparisonOutput.textContent = 'Computing comparison…';
    try {
      const r = await fetch(`/api/ideas/${currentIdeaId}/compare`);
      if (!r.ok) { if (comparisonOutput) comparisonOutput.textContent = 'Comparison failed'; return; }
      const payload = await r.json();
      // build detailed comparison UI
      const deltas = payload.deltas || {};

      let html = '<div style="display:flex;flex-direction:column;gap:8px">';
      html += `<div style="color:#cbd5e1;font-size:0.9rem">${payload.explanation}</div>`;
      html += '<div style="overflow:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:0.9rem"><thead><tr style="text-align:left;color:#9ca3af"><th style="padding:6px 8px">Metric</th><th style="padding:6px 8px">From</th><th style="padding:6px 8px">To</th><th style="padding:6px 8px">Δ</th></tr></thead><tbody>';

      const latest = payload.latest || {};
      let totalDeltaMagnitude = 0;
      const blind = [];

      METRIC_KEYS.forEach((key) => {
        const deltaEntry = deltas[key] || { from: 0, to: 0, delta: 0 };
        const deltaValue = deltaEntry.delta || 0;
        totalDeltaMagnitude += Math.abs(deltaValue);

        const arrow = deltaValue > 0 ? '▲' : (deltaValue < 0 ? '▼' : '');
        const color = deltaValue > 0 ? '#86efac' : (deltaValue < 0 ? '#fca5a5' : '#cbd5e1');
        html += `<tr><td style="padding:6px 8px;color:#e6eef8">${METRIC_LABELS[key]}</td><td style="padding:6px 8px;color:#9ca3af">${deltaEntry.from}</td><td style="padding:6px 8px;color:#9ca3af">${deltaEntry.to}</td><td style="padding:6px 8px;color:${color};font-weight:600">${arrow} ${deltaValue}</td></tr>`;

        const latestValue = typeof latest[key] === 'number' ? latest[key] : 0;
        if (latestValue < 40) blind.push(METRIC_LABELS[key]);
      });

      html += '</tbody></table></div></div>';
      if (comparisonOutput) comparisonOutput.innerHTML = html;

      const avgDelta = Math.round(totalDeltaMagnitude / Math.max(1, METRIC_KEYS.length));
      setAwarenessProgress(avgDelta);

      if (blindSpotsList) blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';

      if (weeklySummaryText) weeklySummaryText.textContent = payload.explanation;
    } catch (err) {
      if (comparisonOutput) comparisonOutput.textContent = 'Error: ' + err.message;
    }
  }

  if (compareBtn) compareBtn.addEventListener('click', runCompare);
});

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nl2br(s) {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

function formatInsightValue(value) {
  if (value == null) return '—';
  if (Array.isArray(value)) {
    return value.map((item) => formatInsightValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '—';
    return entries.map(([key, val]) => `${escapeHtml(key)}: ${formatInsightValue(val)}`).join('<br>');
  }
  return escapeHtml(String(value));
}

function renderScoreCards(insights) {
  const container = document.getElementById('insight-score-cards');
  if (!container) return;

  if (!insights) {
    container.innerHTML = '<div class="insight-score-card"><div class="insight-score-card__label">Insights</div><div class="insight-score-card__value">—</div></div>';
    return;
  }

  container.innerHTML = SCORE_CARD_META.map(({ key, label }) => {
    const value = (typeof insights[key] === 'number') ? insights[key] : 0;
    return `
      <div class="insight-score-card">
        <div class="insight-score-card__label">${label}</div>
        <div class="insight-score-card__value"><span>${value}</span><span style="font-size:0.85rem;color:#94a3b8">/ 100</span></div>
        <div class="insight-score-card__bar"><div class="insight-score-card__bar-fill" style="width:${value}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderInsights(insights, container) {
  renderScoreCards(insights);
  if (!insights) {
    container.innerHTML = '<div>No insights</div>';
    return;
  }

  const lc = insights.leanCanvas || {};
  const sections = [];

  if (insights.overallSummary) {
    sections.push(`<p>${formatInsightValue(insights.overallSummary)}</p>`);
  }

  const pushSection = (title, body) => {
    if (!body) return;
    sections.push(`<h4>${escapeHtml(title)}</h4><p>${formatInsightValue(body)}</p>`);
  };

  if (lc.Solution && lc.SuggestedSolution && lc.Solution !== lc.SuggestedSolution) {
    pushSection('Provided solution', lc.Solution);
    pushSection('Suggested solution', lc.SuggestedSolution);
  } else if (lc.Solution || lc.SuggestedSolution) {
    pushSection('Solution', lc.Solution || lc.SuggestedSolution);
  }

  pushSection('Unique value proposition', lc.UniqueValueProposition);
  pushSection('Customer segments', lc.CustomerSegments);
  pushSection('Channels', lc.Channels);
  pushSection('Revenue model', lc.RevenueModel);
  pushSection('Key metrics', lc.KeyMetrics);
  pushSection('Advantage', lc.Advantage);

  if (!sections.length) {
    container.innerHTML = '<div>No narrative insights generated.</div>';
    return;
  }

  container.innerHTML = sections.join('');
}

