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
  const demoNote = document.createElement('div');
  demoNote.style.color = '#9ca3af';
  demoNote.style.fontSize = '0.9rem';
  demoNote.style.marginBottom = '8px';
  demoNote.textContent = 'Loading demo result...';
  form.parentNode.insertBefore(demoNote, form);

  // Load demo result on page load
  (async function loadDemo(){
    try {
      const r = await fetch('/api/ideas/demo/list');
      if (!r.ok) { demoNote.textContent = 'Demo unavailable.'; return; }
      const list = await r.json();
      if (Array.isArray(list) && list.length) {
        const demo = list[0];
        renderInsights(demo.insights, output);
        if (window.renderRadar) renderRadar(demo.insights);
        if (window.renderLeanCanvasGrid && demo.insights && demo.insights.leanCanvas) {
          renderLeanCanvasGrid(demo.insights.leanCanvas);
        }
        demoNote.textContent = 'Demo result loaded. Use the form to analyze your idea.';
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
    } catch (err) {
      output.textContent = 'Error: ' + err.message;
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

