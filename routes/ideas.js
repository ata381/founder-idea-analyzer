const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const insightEngine = require('../lib/insightEngine');
const { computeDeltas, explainDeltas } = require('../lib/versionUtils');
const inMemory = require('../lib/inMemoryStore');

const IDEA_FIELDS = ['problem', 'solution', 'audience', 'alternatives', 'technology'];

function createMemoryId() {
  return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function attachLatestInsights(doc) {
  if (!doc) return null;
  const base = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const versions = base.versions || [];
  const latest = versions.length ? versions[versions.length - 1] : null;
  if (latest && latest.insights) {
    base.insights = latest.insights;
  }
  return base;
}

function isOllamaProvider() {
  return process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'ollama';
}

function ensureLlmConfigured(res) {
  if (isOllamaProvider()) return true;
  res.status(503).json({ error: 'LLM_PROVIDER must be set to "ollama". The heuristic insight generator has been removed.' });
  return false;
}

function extractIdeaInputs(source = {}) {
  return IDEA_FIELDS.reduce((acc, field) => {
    const value = source[field];
    acc[field] = typeof value === 'string' ? value : (value ?? '');
    return acc;
  }, {});
}

async function generateInsightBundle(inputs) {
  const scores = await insightEngine.generateScoresLLM(inputs);
  const leanCanvas = await insightEngine.draftLeanCanvasLLM(inputs);
  return { ...scores, leanCanvas };
}

function buildVersion(inputs, insights) {
  return {
    inputs,
    insights,
    createdAt: new Date()
  };
}

async function findIdeaById(id, { lean = false } = {}) {
  try {
    return lean ? await Idea.findById(id).lean() : await Idea.findById(id);
  } catch (err) {
    return null;
  }
}

function getMemoryIdea(id) {
  return inMemory.ideas[id] || null;
}

function saveIdeaToMemory(inputs, version) {
  const now = new Date();
  const stored = {
    _id: createMemoryId(),
    ...inputs,
    createdAt: now,
    updatedAt: now,
    versions: [version],
    saved: false
  };
  inMemory.ideas[stored._id] = stored;
  return stored;
}

async function persistNewIdea(inputs, version) {
  const idea = new Idea({ ...inputs, versions: [version] });
  try {
    const saved = await idea.save();
    return attachLatestInsights(saved);
  } catch (err) {
    console.error('DB save failed, falling back to in-memory store', err.message || err);
    const stored = saveIdeaToMemory(inputs, version);
    return attachLatestInsights(stored);
  }
}

async function appendVersionToDocument(doc, inputs, version) {
  doc.versions.push(version);
  IDEA_FIELDS.forEach(field => {
    doc[field] = inputs[field];
  });
  doc.updatedAt = new Date();
  await doc.save();
}

function appendVersionToMemory(mem, inputs, version) {
  mem.versions.push(version);
  IDEA_FIELDS.forEach(field => {
    mem[field] = inputs[field];
  });
  mem.updatedAt = new Date();
  return mem;
}

async function resolveVersions(id) {
  const idea = await findIdeaById(id, { lean: true });
  if (idea) return idea.versions || [];
  const mem = getMemoryIdea(id);
  return mem ? mem.versions || [] : null;
}

// POST /api/ideas -> create a new idea (first revision)
router.post('/', async (req, res) => {
  try {
    if (!ensureLlmConfigured(res)) return;
    const inputs = extractIdeaInputs(req.body);
    const insights = await generateInsightBundle(inputs);
    const version = buildVersion(inputs, insights);
    const payload = await persistNewIdea(inputs, version);
    return res.status(201).json(payload);
  } catch (err) {
    console.error('Error saving idea', err);
    res.status(500).json({ error: 'Unable to process idea', detail: err && err.message ? err.message : String(err) });
  }
});

// GET /api/ideas/:id -> fetch latest idea snapshot
router.get('/:id', async (req, res) => {
  try {
    const idea = await findIdeaById(req.params.id, { lean: true });
    if (idea) return res.json(attachLatestInsights(idea));
    const mem = getMemoryIdea(req.params.id);
    if (mem) return res.json(attachLatestInsights(mem));
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Error fetching idea', err);
    res.status(500).json({ error: 'Unable to fetch idea' });
  }
});

// POST /api/ideas/:id/versions -> add a new revision/version
router.post('/:id/versions', async (req, res) => {
  try {
    if (!ensureLlmConfigured(res)) return;
    const inputs = extractIdeaInputs(req.body);
    const insights = await generateInsightBundle(inputs);
    const version = buildVersion(inputs, insights);

    const idea = await findIdeaById(req.params.id);
    if (idea) {
      await appendVersionToDocument(idea, inputs, version);
      return res.status(201).json({ ok: true, version });
    }

    const mem = getMemoryIdea(req.params.id);
    if (!mem) return res.status(404).json({ error: 'Not found' });
    appendVersionToMemory(mem, inputs, version);
    inMemory.ideas[req.params.id] = mem;
    return res.status(201).json({ ok: true, version });
  } catch (err) {
    console.error('Error adding version', err);
    res.status(500).json({ error: 'Unable to add version', detail: err && err.message ? err.message : String(err) });
  }
});

// GET /api/ideas/:id/versions -> list versions
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await resolveVersions(req.params.id);
    if (!versions) return res.status(404).json({ error: 'Not found' });
    res.json({ versions });
  } catch (err) {
    console.error('Error fetching versions', err);
    res.status(500).json({ error: 'Unable to fetch versions' });
  }
});

// GET /api/ideas/:id/compare -> compare first vs latest
router.get('/:id/compare', async (req, res) => {
  try {
    const versions = await resolveVersions(req.params.id);
    if (!versions) return res.status(404).json({ error: 'Not found' });
    if (!versions.length) return res.status(400).json({ error: 'No versions to compare' });

    const firstVersion = versions[0];
    const latestVersion = versions[versions.length - 1];
    const deltas = computeDeltas(firstVersion.insights || {}, latestVersion.insights || {});
    const explanation = await explainDeltas(deltas, firstVersion.inputs || {}, latestVersion.inputs || {});
    return res.json({ deltas, explanation, first: firstVersion.insights || {}, latest: latestVersion.insights || {} });
  } catch (err) {
    console.error('Error comparing versions', err);
    res.status(500).json({ error: 'Unable to compare versions' });
  }
});

module.exports = router;
