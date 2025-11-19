async function postIdea(data) {
  const res = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

function el(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', () => {
  const form = el('idea-form');
  const output = el('insight-output');
  const canvasOut = el('canvas-output');
  const saveRevisionBtn = el('save-revision');
  const compareBtn = el('compare-versions');
  const populateDemoBtn = el('populate-demo');
  const comparisonOutput = el('comparison-output');
  const awarenessDeltaText = el('awareness-delta-text');
  const blindSpotsList = el('blind-spots-list');
  const weeklySummaryText = el('weekly-summary-text');
  const demoNote = el('demo-note');
  const prevBtn = el('prev-demo');
  const nextBtn = el('next-demo');
  let demoList = [];
  let demoIndex = 0;
  let currentIdeaId = null;

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

    // weekly summary: quick heuristics
    const strong = keys.filter((k,i)=>vals[i] >= 65).map(k=>labels[k]);
    const weak = keys.filter((k,i)=>vals[i] < 40).map(k=>labels[k]);
    let summary = '';
    if (strong.length) summary += `Strengths: ${strong.join(', ')}. `;
    if (weak.length) summary += `Needs attention: ${weak.join(', ')}. `;
    if (!summary) summary = 'Balanced profile — continue iterating to validate hypotheses.';
    if (weeklySummaryText) weeklySummaryText.textContent = summary;
  }

  function renderDemo(idx) {
    if (!Array.isArray(demoList) || demoList.length === 0) return;
    demoIndex = (idx + demoList.length) % demoList.length;
    const demo = demoList[demoIndex];
    renderInsights(demo.insights, output);
    if (window.renderRadar) renderRadar(demo.insights);
    if (window.renderLeanCanvasGrid && demo.insights && demo.insights.leanCanvas) {
      renderLeanCanvasGrid(demo.insights.leanCanvas);
    }
    // Update mentor dashboard from this single demo snapshot
    updateMentorFromInsights(demo.insights);
    demoNote.textContent = `Demo ${demoIndex + 1} of ${demoList.length} — use Prev/Next to cycle.`;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => renderDemo(demoIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => renderDemo(demoIndex + 1));

  // Load demo result on page load
  (async function loadDemo(){
    try {
      const r = await fetch('/api/ideas/demo/list');
      if (!r.ok) { demoNote.textContent = 'Demo unavailable.'; return; }
      const list = await r.json();
      if (Array.isArray(list) && list.length) {
        demoList = list;
        // If any sample had an LLM warning, surface it to the demo note
        const warnings = [];
        demoList.forEach((d) => {
          if (d && d.insights && d.insights.llmWarning) warnings.push(d.insights.llmWarning);
          if (d && d.insights && d.insights.leanCanvas && d.insights.leanCanvas.llmWarning) warnings.push(d.insights.leanCanvas.llmWarning);
        });
        if (warnings.length) {
          demoNote.textContent = `LLM warning: ${warnings[0]}`;
        }
        renderDemo(0);
      } else {
        demoNote.textContent = 'No demo samples available.';
      }
    } catch (err) {
      demoNote.textContent = 'Demo load failed (server may be offline).';
    }
  })();
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
    canvasOut.textContent = '';
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
      } else if (json.insights && json.insights.leanCanvas) {
        canvasOut.textContent = Object.entries(json.insights.leanCanvas).map(([k,v]) => `${k}: ${v}`).join('\n\n');
      } else {
        canvasOut.textContent = 'No canvas returned.';
      }
      // update Mentor Dashboard from the returned insights
      updateMentorFromInsights(json.insights);
      // surface any LLM warning from the insights or lean canvas
      if (json && json.insights) {
        const w = json.insights.llmWarning || (json.insights.leanCanvas && json.insights.leanCanvas.llmWarning);
        if (w && demoNote) demoNote.textContent = `LLM warning: ${w}`;
      }
    } catch (err) {
      output.textContent = 'Error: ' + err.message;
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
    comparisonOutput.textContent = 'Computing comparison…';
    try {
      const r = await fetch(`/api/ideas/${currentIdeaId}/compare`);
      if (!r.ok) { comparisonOutput.textContent = 'Comparison failed'; return; }
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
      comparisonOutput.innerHTML = html;

      // awareness delta: show average change magnitude
      const keys = Object.keys(deltas);
      const avgDelta = Math.round(keys.reduce((s,k)=>s+Math.abs(deltas[k].delta),0)/Math.max(1,keys.length));
      awarenessDeltaText.textContent = (avgDelta >= 0) ? `${avgDelta} pts (avg change)` : '0';

      // blind spots: list metrics below 40 in latest
      const latest = payload.latest || {};
      const blind = [];
      ['problemValidationScore','marketMaturity','competitionDensity','differentiationPotential','technicalFeasibility','riskAndUncertainty'].forEach(k=>{
        if ((latest[k]||0) < 40) blind.push(labels[k] || k);
      });
      blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';

      // weekly summary: simple textual summary
      weeklySummaryText.textContent = payload.explanation;
    } catch (err) {
      comparisonOutput.textContent = 'Error: ' + err.message;
    }
  }

  if (compareBtn) compareBtn.addEventListener('click', runCompare);

  if (populateDemoBtn) populateDemoBtn.addEventListener('click', async () => {
    try {
      comparisonOutput.textContent = 'Populating demo revisions…';
      const r = await fetch('/api/ideas/demo/populate', { method: 'POST' });
      if (!r.ok) { comparisonOutput.textContent = 'Demo populate failed'; return; }
      const j = await r.json();
      if (j && j.id) {
        currentIdeaId = j.id;
        if (j.compare) {
          // render the provided compare payload immediately
          const payload = j.compare;
          // reuse runCompare's rendering logic by creating a small helper
          // We'll inline similar rendering here to avoid async fetch
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
          comparisonOutput.innerHTML = html;
          // update other mentor cards
          const keys = Object.keys(deltas);
          const avgDelta = Math.round(keys.reduce((s,k)=>s+Math.abs(deltas[k].delta),0)/Math.max(1,keys.length));
          awarenessDeltaText.textContent = (avgDelta >= 0) ? `${avgDelta} pts (avg change)` : '0';
          const latest = payload.latest || {};
          const blind = [];
          ['problemValidationScore','marketMaturity','competitionDensity','differentiationPotential','technicalFeasibility','riskAndUncertainty'].forEach(k=>{
            if ((latest[k]||0) < 40) blind.push(labels[k] || k);
          });
          blindSpotsList.textContent = blind.length ? blind.join(', ') : 'None detected';
          weeklySummaryText.textContent = payload.explanation;
        } else {
          comparisonOutput.textContent = 'Demo created — running comparison…';
          await runCompare();
        }
      } else {
        comparisonOutput.textContent = 'Demo populate did not return an id';
      }
    } catch (err) {
      comparisonOutput.textContent = 'Error populating demo: ' + err.message;
      console.error('Demo populate error', err);
    }
  });
});

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nl2br(s) {
  return escapeHtml(s).replace(/\n/g, '<br>');
}

function renderInsights(insights, container) {
  if (!insights) { container.innerHTML = '<div>No insights</div>'; return; }
  const scores = [
    ['Problem validation', insights.problemValidationScore],
    ['Market maturity', insights.marketMaturity],
    ['Competition density', insights.competitionDensity],
    ['Differentiation', insights.differentiationPotential],
    ['Technical feasibility', insights.technicalFeasibility],
    ['Risk / Uncertainty', insights.riskAndUncertainty]
  ];

  const lc = insights.leanCanvas || {};
  const suggested = lc.SuggestedSolution || null;
  const solution = lc.Solution || null;

  let html = '';
  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  scores.forEach(([label, val]) => {
    const v = (typeof val === 'number') ? val : 0;
    html += `<div style="display:flex;align-items:center;gap:8px"><div style="width:160px;color:#cbd5e1;font-size:0.9rem">${label}</div><div style="flex:1;background:#071028;border-radius:6px;height:12px;overflow:hidden"><div style="height:100%;width:${v}%;background:linear-gradient(90deg,#6366f1,#06b6d4);"></div></div><div style="width:40px;text-align:right;color:#93c5fd;font-size:0.9rem">${v}</div></div>`;
  });

  if (suggested && suggested === solution) {
    html += `<div style="margin-top:8px;color:#e6eef8"><strong>Suggested solution</strong><div style="margin-top:6px;color:#cbd5e1">${nl2br(suggested)}</div></div>`;
  } else if (solution && suggested) {
    html += `<div style="margin-top:8px;color:#e6eef8"><strong>Provided solution</strong><div style="margin-top:6px;color:#cbd5e1">${nl2br(solution)}</div></div>`;
    html += `<div style="margin-top:8px;color:#e6eef8"><strong>Suggested solution</strong><div style="margin-top:6px;color:#cbd5e1">${nl2br(suggested)}</div></div>`;
  } else if (solution) {
    html += `<div style="margin-top:8px;color:#e6eef8"><strong>Solution</strong><div style="margin-top:6px;color:#cbd5e1">${nl2br(solution)}</div></div>`;
  }

  if (lc.UniqueValueProposition) {
    html += `<div style="margin-top:8px;color:#e6eef8"><strong>Unique value proposition</strong><div style="margin-top:6px;color:#cbd5e1">${nl2br(lc.UniqueValueProposition)}</div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

