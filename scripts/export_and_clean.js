require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const Idea = require('../models/Idea');
let queryOllama = null;
try {
  queryOllama = require('../lib/ollamaClient').queryOllama;
} catch (e) {
  // no-op if ollama client not available
}

async function main() {
  await connectDB();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname);
  const exportPath = path.join(outDir, `exported_ideas_${timestamp}.json`);

  console.log('Fetching ideas from MongoDB...');
  let ideas = [];
  try {
    ideas = await Idea.find({}).lean().exec();
  } catch (err) {
    console.error('Error fetching ideas:', err.message || err);
    process.exit(1);
  }

  fs.writeFileSync(exportPath, JSON.stringify(ideas, null, 2), 'utf8');
  console.log(`Exported ${ideas.length} ideas to ${exportPath}`);

  // Optionally feed to Ollama
  const feedOllama = process.argv.includes('--feed-ollama');
  const deleteAfter = process.argv.includes('--delete');

  if (feedOllama) {
    if (!queryOllama) {
      console.error('Ollama client not available (lib/ollamaClient.js missing). Skipping feed.');
    } else {
      console.log('Feeding exported ideas to Ollama...');
      const responses = [];
      for (const idea of ideas) {
        const prompt = `Analyze this idea and produce a short summary and suggested lean-canvas JSON.\n\nIDEA:\n${JSON.stringify(idea, null, 2)}`;
        try {
          const out = await queryOllama(prompt);
          responses.push({ id: idea._id, out });
          console.log(`Processed idea ${idea._id}`);
        } catch (err) {
          console.error('Ollama call failed for', idea._id, err && err.message ? err.message : err);
          responses.push({ id: idea._id, out: null, error: String(err) });
        }
      }
      const respPath = path.join(outDir, `exported_ideas_ollama_${timestamp}.json`);
      fs.writeFileSync(respPath, JSON.stringify(responses, null, 2), 'utf8');
      console.log(`Saved Ollama responses to ${respPath}`);
    }
  }

  if (deleteAfter) {
    try {
      const res = await Idea.deleteMany({});
      console.log(`Deleted ${res.deletedCount || 'unknown'} ideas from DB.`);
    } catch (err) {
      console.error('Failed to delete ideas:', err && err.message ? err.message : err);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
