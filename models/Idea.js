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

const VersionSchema = new mongoose.Schema({
  inputs: {
    problem: String,
    solution: String,
    audience: String,
    alternatives: String,
    technology: String
  },
  insights: InsightSchema,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const IdeaSchema = new mongoose.Schema({
  // convenience top-level fields (latest snapshot)
  problem: { type: String },
  solution: { type: String },
  audience: { type: String },
  alternatives: { type: String },
  technology: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  versions: { type: [VersionSchema], default: [] }
});

module.exports = mongoose.model('Idea', IdeaSchema);
