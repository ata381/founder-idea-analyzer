const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const insightEngine = require('../lib/insightEngine');
const { computeDeltas, explainDeltas } = require('../lib/versionUtils');

// Simple in-memory fallback store when MongoDB isn't available (development/demo)
const inMemory = require('../lib/inMemoryStore');

function makeId() { return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }

// POST /api/ideas
// Create a new idea (first revision)
router.post('/', async (req, res) => {
  try {
    const { problem, solution, audience, alternatives, technology } = req.body;
    const inputs = { problem, solution, audience, alternatives, technology };
    let insights, leanCanvas;
    if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
      insights = await insightEngine.generateScoresLLM(inputs);
      leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
    } else {
      insights = insightEngine.generateScores(inputs);
      leanCanvas = insightEngine.draftLeanCanvas(inputs);
    }

    const idea = new Idea({
      problem,
      solution,
      audience,
      alternatives,
      technology,
      versions: [{ inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas } }]
    });

    try {
      const saved = await idea.save();
      return res.status(201).json(saved);
    } catch (saveErr) {
      console.error('DB save failed, falling back to in-memory store', saveErr.message || saveErr);
      const id = makeId();
      const stored = {
        _id: id,
        problem,
        solution,
        audience,
        alternatives,
        technology,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [{ inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas }, createdAt: new Date() }],
        saved: false
      };
      inMemory.ideas[id] = stored;
      return res.status(201).json(stored);
    }
  } catch (err) {
    console.error('Error saving idea', err);
    res.status(500).json({ error: 'Unable to process idea' });
  }
});

// GET /api/ideas/:id
router.get('/:id', async (req, res) => {
  try {
    // Try DB first, then in-memory fallback
    let idea = null;
    try { idea = await Idea.findById(req.params.id).lean(); } catch (e) { idea = null; }
    if (!idea) {
      const mem = inMemory.ideas[req.params.id];
      if (!mem) return res.status(404).json({ error: 'Not found' });
      return res.json(mem);
    }
    res.json(idea);
  } catch (err) {
    console.error('Error fetching idea', err);
    res.status(500).json({ error: 'Unable to fetch idea' });
  }
});

// POST /api/ideas/:id/versions  -> add a new revision/version
router.post('/:id/versions', async (req, res) => {
  try {
    let idea = null;
    try { idea = await Idea.findById(req.params.id); } catch (e) { idea = null; }
    if (!idea) {
      // fallback to in-memory idea
      const mem = inMemory.ideas[req.params.id];
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const { problem, solution, audience, alternatives, technology } = req.body;
      const inputs = { problem, solution, audience, alternatives, technology };
      let insights, leanCanvas;
      if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
        insights = await insightEngine.generateScoresLLM(inputs);
        leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
      } else {
        insights = insightEngine.generateScores(inputs);
        leanCanvas = insightEngine.draftLeanCanvas(inputs);
      }
      const version = { inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas }, createdAt: new Date() };
      mem.versions.push(version);
      mem.updatedAt = new Date();
      inMemory.ideas[req.params.id] = mem;
      return res.status(201).json({ ok: true, version });
    }
    const { problem, solution, audience, alternatives, technology } = req.body;
    const inputs = { problem, solution, audience, alternatives, technology };
    let insights, leanCanvas;
    if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
      insights = await insightEngine.generateScoresLLM(inputs);
      leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
    } else {
      insights = insightEngine.generateScores(inputs);
      leanCanvas = insightEngine.draftLeanCanvas(inputs);
    }
    const version = { inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas }, createdAt: new Date() };
    idea.versions.push(version);
    idea.problem = problem; idea.solution = solution; idea.audience = audience; idea.alternatives = alternatives; idea.technology = technology;
    idea.updatedAt = new Date();
    await idea.save();
    return res.status(201).json({ ok: true, version });
  } catch (err) {
    console.error('Error adding version', err);
    res.status(500).json({ error: 'Unable to add version' });
  }
});

// GET /api/ideas/:id/versions -> list versions
router.get('/:id/versions', async (req, res) => {
  try {
    let idea = null;
    try { idea = await Idea.findById(req.params.id).lean(); } catch (e) { idea = null; }
    if (!idea) {
      const mem = inMemory.ideas[req.params.id];
      if (!mem) return res.status(404).json({ error: 'Not found' });
      return res.json({ versions: mem.versions || [] });
    }
    res.json({ versions: idea.versions || [] });
  } catch (err) {
    console.error('Error fetching versions', err);
    res.status(500).json({ error: 'Unable to fetch versions' });
  }
});

// GET /api/ideas/:id/compare -> compare first vs latest and return deltas + explanation
router.get('/:id/compare', async (req, res) => {
  try {
    let idea = null;
    try { idea = await Idea.findById(req.params.id).lean(); } catch (e) { idea = null; }
    let versions = [];
    if (!idea) {
      const mem = inMemory.ideas[req.params.id];
      if (!mem) return res.status(404).json({ error: 'Not found' });
      versions = mem.versions || [];
    } else {
      versions = idea.versions || [];
    }
    if (versions.length === 0) return res.status(400).json({ error: 'No versions to compare' });
    const first = versions[0].insights || {};
    const latest = versions[versions.length - 1].insights || {};
    const deltas = computeDeltas(first, latest);
    const firstInputs = (versions[0] && versions[0].inputs) ? versions[0].inputs : {};
    const latestInputs = (versions[versions.length - 1] && versions[versions.length - 1].inputs) ? versions[versions.length - 1].inputs : {};
    const explanation = await explainDeltas(deltas, firstInputs, latestInputs);
    return res.json({ deltas, explanation, first, latest });
  } catch (err) {
    console.error('Error comparing versions', err);
    res.status(500).json({ error: 'Unable to compare versions' });
  }
});

// GET /api/ideas/demo
router.get('/demo/list', async (req, res) => {
  try {
    const samples = [
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

    const useLLM = process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama';

    if (useLLM) {
      // Use LLM-backed generation for each sample, but fall back gracefully to heuristics on errors
      const results = await Promise.all(samples.map(async (s) => {
        try {
          const insights = await insightEngine.generateScoresLLM(s);
          const leanCanvas = await insightEngine.draftLeanCanvasLLM(s);
          return { ...s, createdAt: new Date(), insights: { ...insights, leanCanvas }, _id: null, saved: false };
        } catch (e) {
          // LLM failed for this sample — fallback to deterministic heuristics
          console.error('LLM scoring failed for demo sample, falling back:', e && e.message ? e.message : e);
          const insights = insightEngine.generateScores(s);
          const leanCanvas = insightEngine.draftLeanCanvas(s);
          return { ...s, createdAt: new Date(), insights: { ...insights, leanCanvas }, _id: null, saved: false };
        }
      }));
      return res.json(results);
    }

    // Default deterministic path
    const results = samples.map((s) => {
      const insights = insightEngine.generateScores(s);
      const leanCanvas = insightEngine.draftLeanCanvas(s);
      return { ...s, createdAt: new Date(), insights: { ...insights, leanCanvas }, _id: null, saved: false };
    });
    res.json(results);
  } catch (err) {
    console.error('Error generating demo list', err);
    res.status(500).json({ error: 'Unable to generate demo list' });
  }
});

// POST /api/ideas/demo/populate -> create one idea + several revisions for demo
// Guarded by `DEMO_POPULATE_ALLOWED=true` to avoid accidental population on start
router.post('/demo/populate', async (req, res) => {
  if (!process.env.DEMO_POPULATE_ALLOWED || process.env.DEMO_POPULATE_ALLOWED !== 'true') {
    return res.status(403).json({ error: 'Demo populate disabled. Use scripts/seed_from_file.js to seed demo data.' });
  }
  try {
    // base idea
    const base = {
      problem: 'Users abandon onboarding due to complexity',
      solution: 'A lightweight guided onboarding flow',
      audience: 'SaaS product teams',
      alternatives: 'manual onboarding, help docs',
      technology: 'web, analytics'
    };
    let insights, leanCanvas;
    if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
      insights = await insightEngine.generateScoresLLM(base);
      leanCanvas = await insightEngine.draftLeanCanvasLLM(base);
    } else {
      insights = insightEngine.generateScores(base);
      leanCanvas = insightEngine.draftLeanCanvas(base);
    }
    const idea = new Idea({
      problem: base.problem,
      solution: base.solution,
      audience: base.audience,
      alternatives: base.alternatives,
      technology: base.technology,
      versions: [{ inputs: base, insights: { ...insights, leanCanvas } }]
    });

    try {
      const saved = await idea.save();
      // create a few programmatic revisions (simulate founder iterations)
      const revs = [
        { solution: 'Add step-by-step tooltip tour', technology: 'web, analytics, guided-tour' },
        { solution: 'Integrate with single-sign-on and smart defaults', technology: 'web, sso, server' },
        { solution: 'A/B test variants and auto-optimize flow', technology: 'web, analytics, ml' }
      ];
      for (const r of revs) {
        const inputs = { problem: base.problem, solution: r.solution, audience: base.audience, alternatives: base.alternatives, technology: r.technology };
        let ins, lc;
        if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
          ins = await insightEngine.generateScoresLLM(inputs);
          lc = await insightEngine.draftLeanCanvasLLM(inputs);
        } else {
          ins = insightEngine.generateScores(inputs);
          lc = insightEngine.draftLeanCanvas(inputs);
        }
        saved.versions.push({ inputs, insights: { ...ins, leanCanvas: lc }, createdAt: new Date() });
      }
      await saved.save();
      // compute compare payload for immediate client consumption
      try {
        const versions = saved.versions || [];
        const first = versions[0] && versions[0].insights ? versions[0].insights : {};
        const latest = versions[versions.length - 1] && versions[versions.length - 1].insights ? versions[versions.length - 1].insights : {};
        const deltas = computeDeltas(first, latest);
        const firstInputs = (versions[0] && versions[0].inputs) ? versions[0].inputs : {};
        const latestInputs = (versions[versions.length - 1] && versions[versions.length - 1].inputs) ? versions[versions.length - 1].inputs : {};
        const explanation = await explainDeltas(deltas, firstInputs, latestInputs);
        return res.json({ ok: true, id: saved._id, compare: { deltas, explanation, first, latest } });
      } catch (err) {
        return res.json({ ok: true, id: saved._id });
      }
    } catch (err) {
      // fallback to in-memory creation
      const id = makeId();
      const stored = {
        _id: id,
        problem: base.problem,
        solution: base.solution,
        audience: base.audience,
        alternatives: base.alternatives,
        technology: base.technology,
        createdAt: new Date(),
        updatedAt: new Date(),
        versions: [{ inputs: base, insights: { ...insights, leanCanvas }, createdAt: new Date() }]
      };
      const revs = [
        { solution: 'Add step-by-step tooltip tour', technology: 'web, analytics, guided-tour' },
        { solution: 'Integrate with single-sign-on and smart defaults', technology: 'web, sso, server' },
        { solution: 'A/B test variants and auto-optimize flow', technology: 'web, analytics, ml' }
      ];
      for (const r of revs) {
        const inputs = { problem: base.problem, solution: r.solution, audience: base.audience, alternatives: base.alternatives, technology: r.technology };
        let ins, lc;
        if (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama') {
          ins = await insightEngine.generateScoresLLM(inputs);
          lc = await insightEngine.draftLeanCanvasLLM(inputs);
        } else {
          ins = insightEngine.generateScores(inputs);
          lc = insightEngine.draftLeanCanvas(inputs);
        }
        stored.versions.push({ inputs, insights: { ...ins, leanCanvas: lc }, createdAt: new Date() });
      }
      inMemory.ideas[id] = stored;
      try {
        const versions = stored.versions || [];
        const first = versions[0] && versions[0].insights ? versions[0].insights : {};
        const latest = versions[versions.length - 1] && versions[versions.length - 1].insights ? versions[versions.length - 1].insights : {};
        const deltas = computeDeltas(first, latest);
        const firstInputs = (versions[0] && versions[0].inputs) ? versions[0].inputs : {};
        const latestInputs = (versions[versions.length - 1] && versions[versions.length - 1].inputs) ? versions[versions.length - 1].inputs : {};
        const explanation = await explainDeltas(deltas, firstInputs, latestInputs);
        return res.json({ ok: true, id, compare: { deltas, explanation, first, latest } });
      } catch (err) {
        return res.json({ ok: true, id });
      }
    }
  } catch (err) {
    console.error('Error populating demo', err);
    res.status(500).json({ error: 'Unable to populate demo' });
  }
});

module.exports = router;
