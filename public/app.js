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
        output.textContent = JSON.stringify(demo.insights, null, 2);
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
      output.textContent = JSON.stringify(json.insights, null, 2);
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
