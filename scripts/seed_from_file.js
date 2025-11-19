const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const file = path.join(__dirname, 'demo_samples.json');
  if (!fs.existsSync(file)) {
    console.error('Samples file not found:', file);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const items = JSON.parse(raw);

  const baseUrl = process.env.SERVER_URL || 'http://localhost:4000';
  console.log('Seeding', items.length, 'items to', baseUrl + '/api/ideas');

  for (const [i, it] of items.entries()) {
    try {
      const res = await fetch(baseUrl + '/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(it),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        console.error(`Failed to POST item ${i}`, res.status, txt);
      } else {
        const json = await res.json().catch(()=>null);
        console.log(`Seeded item ${i}:`, json && json._id ? json._id : (json && json.ok) ? 'ok' : 'posted');
      }
    } catch (err) {
      console.error('Error posting item', i, err && err.message ? err.message : err);
    }
    // small delay to avoid spamming and give LLM time
    await sleep(600);
  }

  console.log('Seeding complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
