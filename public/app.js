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
  let currentIdeaId = null;

  function setStatus(message, tone = 'muted') {
    if (!statusBanner) return;
    statusBanner.textContent = message;
    statusBanner.dataset.tone = tone;
  }

  setStatus('Ready for your idea.');

  function updateMentorFromInsights(insights) {
    if (!insights) {
      if (awarenessDeltaText) awarenessDeltaText.textContent = '—';
      if (blindSpotsList) blindSpotsList.textContent = '—';
      if (weeklySummaryText) weeklySummaryText.textContent = '—';
      return;
    }
    const keys = ['problemValidationScore','marketMaturity','competitionDensity','differentiationPotential','technicalFeasibility','riskAndUncertainty'];
    const labels = {
      problemValidationScore: 'Problem validation',
      marketMaturity: 'Market maturity',
      competitionDensity: 'Competition density',
      differentiationPotential: 'Differentiation',
      technicalFeasibility: 'Technical feasibility',
      riskAndUncertainty: 'Risk / Uncertainty'
    };
    // awareness delta: average distance from neutral (50)
    const vals = keys.map(k => (typeof insights[k] === 'number') ? insights[k] : 0);
    const avg = Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
    const awarenessDelta = avg - 50; // positive means more aware/validated
    if (awarenessDeltaText) awarenessDeltaText.textContent = `${awarenessDelta >= 0 ? '+' : ''}${awarenessDelta} pts (avg ${avg})`;

    // blind spots: metrics below 40
    const blind = keys.filter((k,i)=>vals[i] < 40).map(k=>labels[k]);
    if (blindSpotsList) blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';

    // weekly summary: quick qualitative summary
    const strong = keys.filter((k,i)=>vals[i] >= 65).map(k=>labels[k]);
    const weak = keys.filter((k,i)=>vals[i] < 40).map(k=>labels[k]);
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
    output.textContent = 'Analyzing…';
    setStatus('Analyzing idea…');
    if (canvasGrid) canvasGrid.innerHTML = '';
    try {
      const json = await postIdea(data);
      // show the insights
      renderInsights(json.insights, output);
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
          canvasGrid.innerHTML = `<pre style="white-space:pre-wrap;font-size:0.9rem;color:#cbd5e1;background:#030712;border-radius:8px;padding:12px;margin:0">${escapeHtml(JSON.stringify(json.insights.leanCanvas, null, 2))}</pre>`;
        } else {
          canvasGrid.innerHTML = '<div style="color:#94a3b8">No canvas returned.</div>';
        }
      }
      // update Mentor Dashboard from the returned insights
      updateMentorFromInsights(json.insights);
      // surface any LLM warning from the insights or lean canvas
      let tone = 'success';
      let message = 'Analysis complete. Save a revision to track improvements.';
      if (json && json.insights) {
        const w = json.insights.llmWarning || (json.insights.leanCanvas && json.insights.leanCanvas.llmWarning);
        if (w) {
          tone = 'warning';
          message = `LLM warning: ${w}`;
        }
      }
      setStatus(message, tone);
    } catch (err) {
      output.textContent = 'Error: ' + err.message;
      setStatus(`Analysis failed: ${err.message}`, 'error');
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
      const order = ['problemValidationScore','marketMaturity','competitionDensity','differentiationPotential','technicalFeasibility','riskAndUncertainty'];
      const labels = {
        problemValidationScore: 'Problem validation',
        marketMaturity: 'Market maturity',
        competitionDensity: 'Competition density',
        differentiationPotential: 'Differentiation',
        technicalFeasibility: 'Technical feasibility',
        riskAndUncertainty: 'Risk / Uncertainty'
      };

      let html = '<div style="display:flex;flex-direction:column;gap:8px">';
      html += `<div style="color:#cbd5e1">${payload.explanation}</div>`;
      html += '<div style="overflow:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-family:system-ui"><thead><tr style="text-align:left;color:#9ca3af"><th style="padding:6px 8px">Metric</th><th style="padding:6px 8px">From</th><th style="padding:6px 8px">To</th><th style="padding:6px 8px">Δ</th></tr></thead><tbody>';

      order.forEach(k => {
        const d = deltas[k] || { from: 0, to: 0, delta: 0 };
        const delta = d.delta || 0;
        const arrow = delta > 0 ? '▲' : (delta < 0 ? '▼' : '');
        const color = delta > 0 ? '#86efac' : (delta < 0 ? '#fca5a5' : '#cbd5e1');
        html += `<tr><td style="padding:6px 8px;color:#e6eef8">${labels[k]}</td><td style="padding:6px 8px;color:#9ca3af">${d.from}</td><td style="padding:6px 8px;color:#9ca3af">${d.to}</td><td style="padding:6px 8px;color:${color};font-weight:600">${arrow} ${delta}</td></tr>`;
      });

      html += '</tbody></table></div></div>';
      if (comparisonOutput) comparisonOutput.innerHTML = html;

      // awareness delta: show average change magnitude
      const keys = Object.keys(deltas);
      const avgDelta = Math.round(keys.reduce((s,k)=>s+Math.abs(deltas[k].delta),0)/Math.max(1,keys.length));
      if (awarenessDeltaText) awarenessDeltaText.textContent = (avgDelta >= 0) ? `${avgDelta} pts (avg change)` : '0';

      // blind spots: list metrics below 40 in latest
      const latest = payload.latest || {};
      const blind = [];
      ['problemValidationScore','marketMaturity','competitionDensity','differentiationPotential','technicalFeasibility','riskAndUncertainty'].forEach(k=>{
        if ((latest[k]||0) < 40) blind.push(labels[k] || k);
      });
      if (blindSpotsList) blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';

      // weekly summary: simple textual summary
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

  const scores = [
    { key: 'problemValidationScore', label: 'Problem validation' },
    { key: 'marketMaturity', label: 'Market maturity' },
    { key: 'competitionDensity', label: 'Competition density' },
    { key: 'differentiationPotential', label: 'Differentiation' },
    { key: 'technicalFeasibility', label: 'Technical feasibility' },
    { key: 'riskAndUncertainty', label: 'Risk / Uncertainty' }
  ];

  container.innerHTML = scores.map(({ key, label }) => {
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

