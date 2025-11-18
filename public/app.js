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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      problem: el('problem').value,
      solution: el('solution').value,
      audience: el('audience').value,
      alternatives: el('alternatives').value,
      technology: el('technology').value
    };
    const canvasOut = el('canvas-output');
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
