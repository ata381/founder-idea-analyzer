const express = require('express');
const router = express.Router();

// POST /api/admin/clear-ideas
// Guarded by ADMIN_SECRET (must be provided in header x-admin-secret)
router.post('/clear-ideas', async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
  if (!process.env.ADMIN_SECRET || !secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = { dbDeleted: null, memCleared: 0 };

  // Try to delete from MongoDB if possible
  try {
    const mongoose = require('mongoose');
    const Idea = require('../models/Idea');
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const r = await Idea.deleteMany({});
      result.dbDeleted = r.deletedCount || 0;
    } else {
      result.dbDeleted = 'mongo-not-connected';
    }
  } catch (err) {
    result.dbDeleted = 'error';
    result.dbError = err && err.message ? err.message : String(err);
  }

  // Clear in-memory store
  try {
    const inMemory = require('../lib/inMemoryStore');
    result.memCleared = Object.keys(inMemory.ideas || {}).length;
    inMemory.ideas = {};
  } catch (err) {
    result.memCleared = 'error';
    result.memError = err && err.message ? err.message : String(err);
  }

  return res.json({ ok: true, result });
});

module.exports = router;
