const ideas = [
  {
    problem: 'Users waste time finding the right template for contracts',
    solution: '',
    audience: 'freelancers',
    alternatives: 'generic templates, lawyers',
    technology: 'webapp, node'
  },
  {
    problem: 'Small retailers struggle to manage inventory across channels',
    solution: '',
    audience: 'small retailers',
    alternatives: 'excel, pos systems',
    technology: 'webapp, integrations'
  },
  {
    problem: 'Remote teams have trouble running async retrospectives',
    solution: '',
    audience: 'remote engineering teams',
    alternatives: 'zoom, miro',
    technology: 'saas, node, react'
  }
];

(async () => {
  for (const idea of ideas) {
    try {
      const res = await fetch('http://localhost:4000/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idea)
      });
      const json = await res.json();
      console.log('--- RESPONSE START ---');
      console.log(JSON.stringify(json, null, 2));
      console.log('--- RESPONSE END ---\n');
    } catch (err) {
      console.error('Request failed', err);
    }
  }
})();
