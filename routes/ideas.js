const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const insightEngine = require('../lib/insightEngine');
const { computeDeltas, explainDeltas } = require('../lib/versionUtils');

// Simple in-memory fallback store when MongoDB isn't available (development/demo)
const inMemory = require('../lib/inMemoryStore');

function makeId() { return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }

function withLatestInsights(doc) {
  if (!doc) return null;
  const base = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const versions = base.versions || [];
  const latest = versions.length ? versions[versions.length - 1] : null;
  if (latest && latest.insights) {
    base.insights = latest.insights;
  }
  return base;
}

function isLlmEnabled() {
  return process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama';
}

function requireLlm(res) {
  if (isLlmEnabled()) return true;
  res.status(503).json({ error: 'LLM_PROVIDER must be set to "ollama". The heuristic insight generator has been removed.' });
  return false;
}

// POST /api/ideas
// Create a new idea (first revision)
router.post('/', async (req, res) => {
  try {
    if (!requireLlm(res)) return;
    const { problem, solution, audience, alternatives, technology } = req.body;
    const inputs = { problem, solution, audience, alternatives, technology };
    const insights = await insightEngine.generateScoresLLM(inputs);
    const leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
    const latestInsights = { ...insights, leanCanvas };
    const idea = new Idea({
      problem,
      solution,
      audience,
      alternatives,
      technology,
      versions: [{
        inputs: { problem, solution, audience, alternatives, technology },
        insights: latestInsights
      }]
    });

    try {
      const saved = await idea.save();
      const payload = withLatestInsights(saved);
      return res.status(201).json(payload);
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
        versions: [{
          inputs: { problem, solution, audience, alternatives, technology },
          insights: latestInsights,
          createdAt: new Date()
        }],
        saved: false
      };
      inMemory.ideas[id] = stored;
      return res.status(201).json({ ...stored, insights: latestInsights });
    }
  } catch (err) {
    console.error('Error saving idea', err);
    res.status(500).json({ error: 'Unable to process idea', detail: err && err.message ? err.message : String(err) });
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
      return res.json(withLatestInsights(mem));
    }
    res.json(withLatestInsights(idea));
  } catch (err) {
    console.error('Error fetching idea', err);
    res.status(500).json({ error: 'Unable to fetch idea' });
  }
});

// POST /api/ideas/:id/versions  -> add a new revision/version
router.post('/:id/versions', async (req, res) => {
  try {
    if (!requireLlm(res)) return;
    let idea = null;
    try { idea = await Idea.findById(req.params.id); } catch (e) { idea = null; }
    if (!idea) {
      // fallback to in-memory idea
      const mem = inMemory.ideas[req.params.id];
      if (!mem) return res.status(404).json({ error: 'Not found' });
      const { problem, solution, audience, alternatives, technology } = req.body;
      const inputs = { problem, solution, audience, alternatives, technology };
      const insights = await insightEngine.generateScoresLLM(inputs);
      const leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
      const version = { inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas }, createdAt: new Date() };
      mem.versions.push(version);
      mem.updatedAt = new Date();
      inMemory.ideas[req.params.id] = mem;
      return res.status(201).json({ ok: true, version });
    }
    const { problem, solution, audience, alternatives, technology } = req.body;
    const inputs = { problem, solution, audience, alternatives, technology };
    const insights = await insightEngine.generateScoresLLM(inputs);
    const leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
    const version = { inputs: { problem, solution, audience, alternatives, technology }, insights: { ...insights, leanCanvas }, createdAt: new Date() };
    idea.versions.push(version);
    idea.problem = problem; idea.solution = solution; idea.audience = audience; idea.alternatives = alternatives; idea.technology = technology;
    idea.updatedAt = new Date();
    await idea.save();
    return res.status(201).json({ ok: true, version });
  } catch (err) {
    console.error('Error adding version', err);
    res.status(500).json({ error: 'Unable to add version', detail: err && err.message ? err.message : String(err) });
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

module.exports = router;
