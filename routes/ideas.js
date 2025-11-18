const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const { generateScores, draftLeanCanvas } = require('../lib/insightEngine');

// POST /api/ideas
router.post('/', async (req, res) => {
  try {
    const { problem, solution, audience, alternatives, technology } = req.body;
    const insights = generateScores({ problem, solution, audience, alternatives, technology });
    const leanCanvas = draftLeanCanvas({ problem, solution, audience, alternatives, technology });
    const idea = new Idea({ problem, solution, audience, alternatives, technology, insights: { ...insights, leanCanvas } });
    try {
      const saved = await idea.save();
      return res.status(201).json(saved);
    } catch (saveErr) {
      // If DB isn't available (e.g., during local demo without Mongo), return the generated result anyway
      console.error('DB save failed, returning fallback response', saveErr.message || saveErr);
      const fallback = {
        problem,
        solution,
        audience,
        alternatives,
        technology,
        createdAt: new Date(),
        insights: { ...insights, leanCanvas },
        _id: null,
        saved: false
      };
      return res.status(201).json(fallback);
    }
  } catch (err) {
    console.error('Error saving idea', err);
    res.status(500).json({ error: 'Unable to process idea' });
  }
});

// GET /api/ideas/:id
router.get('/:id', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id).lean();
    if (!idea) return res.status(404).json({ error: 'Not found' });
    res.json(idea);
  } catch (err) {
    console.error('Error fetching idea', err);
    res.status(500).json({ error: 'Unable to fetch idea' });
  }
});

module.exports = router;
