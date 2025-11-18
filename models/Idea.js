const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  problemValidationScore: Number,
  marketMaturity: Number,
  competitionDensity: Number,
  differentiationPotential: Number,
  technicalFeasibility: Number,
  riskAndUncertainty: Number,
  leanCanvas: Object
}, { _id: false });

const IdeaSchema = new mongoose.Schema({
  problem: { type: String },
  solution: { type: String },
  audience: { type: String },
  alternatives: { type: String },
  technology: { type: String },
  createdAt: { type: Date, default: Date.now },
  insights: { type: InsightSchema }
});

module.exports = mongoose.model('Idea', IdeaSchema);
