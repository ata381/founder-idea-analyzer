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
      // show the lean canvas (prettified)
      if (json.insights && json.insights.leanCanvas) {
        const lc = json.insights.leanCanvas;
        canvasOut.textContent = Object.entries(lc).map(([k,v]) => `${k}: ${v}`).join('\n\n');
      } else {
        canvasOut.textContent = 'No canvas returned.';
      }
    } catch (err) {
      output.textContent = 'Error: ' + err.message;
    }
  });
});
